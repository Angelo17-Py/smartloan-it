// Punto de entrada del servidor Express de SmartLoan IT
console.log('Iniciando SmartLoan IT...');
// Carga .env antes de importar módulos que leen variables de entorno al inicializarse.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');
const ExcelJS = require('exceljs');
const errorHandler = require('./middleware/errorHandler');
const { verificarToken } = require('./middleware/auth');
const initDatabase = require('./initDb');

// Atrapa promesas no manejadas para que no tumben el servidor
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 1002;

// Oculta la cabecera X-Powered-By para no revelar el framework usado.
app.disable('x-powered-by');
// Necesario si la app corre detrás de un proxy (Railway, Nginx, etc.);
// sin esto req.ip sería la IP del proxy y el rate limiting no distinguiría clientes.
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

// CORS cerrado por defecto: mismo origen. Configurar CORS_ORIGIN para frontends externos.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(function(origin) { return origin.trim(); })
  .filter(Boolean);

// Cabeceras de seguridad globales: mitigan sniffing de tipo MIME, clickjacking,
// fuga de referrer y acceso a cámara, micrófono o ubicación.
app.use(function(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors({
  origin: function(origin, callback) {
    // Sin Origin: navegación normal o petición del mismo servidor
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
// Limita el tamaño del body JSON para evitar consumos de memoria por cargas enormes.
app.use(express.json({ limit: '100kb' }));

// Sirve el frontend desde ../frontend; si el archivo no existe, la petición continúa
// hacia las rutas de la API montadas más abajo.
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta raíz redirige al login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Endpoint de salud para monitoreo
app.get('/health', (req, res) => {
  res.json({ estado: 'ok', servicio: 'SmartLoan IT', timestamp: new Date().toISOString() });
});

// Montaje de las rutas de la API
app.use('/encargados',   require('./rutas/encargados'));
app.use('/alumnos',      require('./rutas/alumnos'));
app.use('/equipos',      require('./rutas/equipos'));
app.use('/prestamos',    require('./rutas/prestamos'));
app.use('/devoluciones', require('./rutas/devoluciones'));
app.use('/configuracion', require('./rutas/configuracion'));
app.use('/auditoria',    require('./rutas/auditoria'));

/**
 * Exporta préstamos y devoluciones a un libro Excel.
 * Requiere sesión válida y escribe el archivo en streaming sobre la respuesta
 * para no duplicar en memoria el libro completo.
 */
app.get('/exportar', verificarToken, async (req, res) => {
  try {
    const conn = await db;
    // Trae todos los préstamos con sus datos relacionados. El LEFT JOIN conserva
    // los préstamos aún no devueltos, que quedan con las columnas de devolución en NULL.
    const [rows] = await conn.query(`
      SELECT
        p.id_prestamo,
        a.codigo_alumno,
        a.nombre AS alumno_nombre,
        a.apellido AS alumno_apellido,
        a.carrera,
        a.curso,
        a.turno,
        e.nombre AS equipo,
        e.tipo,
        e.marca,
        p.fecha_prestamo,
        p.fecha_devolucion_estimada,
        p.estado_inicial_equipo,
        p.accesorios,
        p.motivo,
        p.observaciones,
        p.estado AS estado_prestamo,
        enc.nombre AS encargado_nombre,
        enc.apellido AS encargado_apellido,
        d.id_devolucion,
        d.fecha_devolucion,
        d.estado_equipo AS estado_devolucion,
        d.tiene_dano,
        d.tipo_dano,
        d.monto_dano,
        d.dias_retraso,
        d.monto_multa,
        d.total_cobro,
        d.observacion AS observacion_devolucion
      FROM prestamos p
      JOIN alumnos a    ON p.id_alumno    = a.id_alumno
      JOIN equipos e    ON p.id_equipo    = e.id_equipo
      JOIN encargados enc ON p.id_encargado = enc.id_encargado
      LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
      ORDER BY p.fecha_prestamo DESC
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SmartLoan IT';
    wb.created = new Date();

    // Formatea fechas al estilo paraguayo (dd/mm/aaaa)
    const fmtFecha = function(v) {
      if (!v) return '';
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = d.getFullYear();
      return dia + '/' + mes + '/' + anio;
    };

    // Formatea montos en guaraníes
    const fmtMoneda = function(v) {
      if (v === null || v === undefined) return '';
      const num = Number(v);
      if (isNaN(num) || num === 0) return 'Gs. 0';
      return 'Gs. ' + num.toLocaleString('es-PY');
    };

    /**
     * Construye una hoja con encabezados estilizados, filas alternadas y filtro.
     * @param {object} ws Hoja de ExcelJS ya creada.
     * @param {Array} columns Definición de anchos de columna.
     * @param {string[]} headers Textos de la fila de encabezado.
     * @param {Array} data Filas de origen.
     * @param {Function} fmtRow Convierte una fila en celdas con valor y estilo.
     */
    function buildSheet(ws, columns, headers, data, fmtRow) {
      ws.columns = columns;
      const hr = ws.getRow(1);
      hr.height = 30;
      headers.forEach(function(h, i) {
        const cell = hr.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FF475569' } },
          left:   { style: 'thin', color: { argb: 'FF475569' } },
          bottom: { style: 'thin', color: { argb: 'FF475569' } },
          right:  { style: 'thin', color: { argb: 'FF475569' } }
        };
      });

      data.forEach(function(rowData, ri) {
        const row = ws.addRow();
        const result = fmtRow(rowData, ri);
        result.forEach(function(v, ci) {
          const cell = row.getCell(ci + 1);
          cell.value = v.value;
          cell.font = { name: 'Calibri', size: 10, ...(v.bold ? { bold: true } : {}), ...(v.fontColor ? { color: { argb: v.fontColor } } : {}) };
          cell.alignment = {
            horizontal: v.align || 'left',
            vertical: 'middle'
          };
          cell.border = {
            top:    { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left:   { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right:  { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          const bg = v.bgColor || (ri % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC');
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        });
        row.height = 20;
      });

      // Filtro automático y congelar la primera fila (encabezados)
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }

    // Hoja 1: todos los préstamos con su estado y datos relacionados.
    const ws1 = wb.addWorksheet('Prestamos');
    buildSheet(ws1,
      [
        { w: 12 }, { w: 14 }, { w: 18 }, { w: 18 }, { w: 26 }, { w: 12 }, { w: 12 },
        { w: 24 }, { w: 14 }, { w: 16 },
        { w: 16 }, { w: 16 },
        { w: 16 }, { w: 22 }, { w: 30 }, { w: 26 }, { w: 16 }, { w: 20 }
      ],
      ['# Prestamo','Codigo','Nombre','Apellido','Bachillerato','Curso','Turno','Equipo','Tipo','Marca','Fecha Prestamo','Dev. Estimada','Estado Inicial','Accesorios','Motivo','Observaciones','Estado','Encargado'],
      rows,
      function(r, ri) {
        const ret = parseInt(r.dias_retraso) > 0;
        const dev = r.estado_prestamo === 'DEVUELTO';
        let bg = ri % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
        // Colores de fila según estado: rojo si retraso, verde si devuelto
        if (ret) bg = 'FFFEF2F2';
        else if (dev) bg = 'FFF0FDF4';

        let estFont = null;
        if (dev) estFont = 'FF16A34A';
        else if (ret) estFont = 'FFDC2626';
        else estFont = 'FFD97706';

        return [
          { value: ri + 1, align: 'right', bold: ret, fontColor: ret ? 'FFDC2626' : null, bgColor: bg },
          { value: r.codigo_alumno, bgColor: bg },
          { value: r.alumno_nombre, bgColor: bg },
          { value: r.alumno_apellido, bgColor: bg },
          { value: r.carrera, bgColor: bg },
          { value: r.curso, bgColor: bg },
          { value: r.turno, bgColor: bg },
          { value: r.equipo, bgColor: bg },
          { value: r.tipo, bgColor: bg },
          { value: r.marca, bgColor: bg },
          { value: fmtFecha(r.fecha_prestamo), bgColor: bg },
          { value: fmtFecha(r.fecha_devolucion_estimada), bgColor: bg },
          { value: r.estado_inicial_equipo, bgColor: bg },
          { value: r.accesorios, bgColor: bg },
          { value: r.motivo, bgColor: bg },
          { value: r.observaciones, bgColor: bg },
          { value: r.estado_prestamo, bold: true, fontColor: estFont, bgColor: bg },
          { value: (r.encargado_nombre || '') + ' ' + (r.encargado_apellido || ''), bgColor: bg }
        ];
      }
    );

    // Hoja 2: solo las filas que ya tienen una devolución registrada.
    const devRows = rows.filter(function(r) { return r.id_devolucion; });
    const ws2 = wb.addWorksheet('Devoluciones');
    buildSheet(ws2,
      [
        { w: 12 }, { w: 14 }, { w: 18 }, { w: 18 }, { w: 24 },
        { w: 14 }, { w: 16 }, { w: 16 },
        { w: 12 }, { w: 20 }, { w: 16 },
        { w: 14 }, { w: 16 }, { w: 16 }, { w: 26 }
      ],
      ['# Prestamo','Codigo','Nombre','Apellido','Equipo','# Devolucion','Fecha Devolucion','Estado','Daño','Tipo Daño','Monto Daño','Dias Retraso','Multa','Total Cobro','Observaciones'],
      devRows,
      function(r, ri) {
        const ret = parseInt(r.dias_retraso) > 0;
        const bg = ret ? 'FFFEF2F2' : (ri % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC');

        return [
          { value: r.id_prestamo, align: 'right', bold: ret, fontColor: ret ? 'FFDC2626' : null, bgColor: bg },
          { value: r.codigo_alumno, bgColor: bg },
          { value: r.alumno_nombre, bgColor: bg },
          { value: r.alumno_apellido, bgColor: bg },
          { value: r.equipo, bgColor: bg },
          { value: ri + 1, align: 'right', bgColor: bg },
          { value: fmtFecha(r.fecha_devolucion), bgColor: bg },
          { value: r.estado_devolucion, bgColor: bg },
          { value: r.tiene_dano ? 'Si' : 'No', bgColor: bg },
          { value: r.tipo_dano, bgColor: bg },
          { value: fmtMoneda(r.monto_dano), align: 'right', bgColor: bg },
          { value: r.dias_retraso, align: 'right', fontColor: ret ? 'FFDC2626' : null, bold: ret, bgColor: bg },
          { value: fmtMoneda(r.monto_multa), align: 'right', bgColor: bg },
          { value: fmtMoneda(r.total_cobro), align: 'right', bold: true, fontColor: 'FFD97706', bgColor: bg },
          { value: r.observacion_devolucion, bgColor: bg }
        ];
      }
    );

    // Totales expuestos como cabeceras para que el cliente muestre el resumen de la exportación.
    const loanCount = rows.length;
    const returnCount = devRows.length;
    const studentSet = new Set(rows.map(function(r) { return r.codigo_alumno; }));
    const studentCount = studentSet.size;

    res.setHeader('X-Export-Loans', loanCount);
    res.setHeader('X-Export-Returns', returnCount);
    res.setHeader('X-Export-Students', studentCount);

    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', 'attachment; filename=smartloan_exportacion_' + fecha + '.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await wb.xlsx.write(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

// Ruta comodín para endpoints inexistentes: responde JSON antes del manejador de errores.
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// El manejador de errores se registra al final para recibir los next(err) de todo lo anterior.
app.use(errorHandler);

/**
 * Inicializa el esquema de la base de datos y luego pone el servidor a escuchar.
 * Si la inicialización falla se aborta el arranque para no operar con el esquema incompleto.
 */
async function start() {
  try {
    await initDatabase();
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error al inicializar BD:', err.message);
    process.exit(1);
  }
  const server = app.listen(PORT, () => {
    console.log(`SmartLoan IT corriendo en puerto ${PORT}`);
  });

  // Cierre graceful: deja de aceptar conexiones, cierra el pool de MySQL y termina.
  function shutdown(signal) {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(() => {
      console.log('Servidor HTTP cerrado.');
      db.end().then(() => {
        console.log('Pool de MySQL cerrado.');
        process.exit(0);
      }).catch((err) => {
        console.error('Error al cerrar MySQL:', err.message);
        process.exit(1);
      });
    });
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}
start();
