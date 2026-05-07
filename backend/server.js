const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.use('/encargados',   require('./rutas/encargados'));
app.use('/alumnos',      require('./rutas/alumnos'));
app.use('/equipos',      require('./rutas/equipos'));
app.use('/prestamos',    require('./rutas/prestamos'));
app.use('/devoluciones', require('./rutas/devoluciones'));

// Configuracion del sistema
app.get('/configuracion', (req, res) => {
  db.query('SELECT * FROM configuracion', (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
});

app.put('/configuracion/:clave', (req, res) => {
  const { valor } = req.body;
  if (!valor) return res.status(400).json({ mensaje: 'Valor requerido' });
  db.query('UPDATE configuracion SET valor=? WHERE clave=?', [valor, req.params.clave], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: 'Configuracion actualizada' });
  });
});

// Exportar TODO en un solo CSV: prestamos + devoluciones
app.get('/exportar', (req, res) => {
  db.query(`
    SELECT
      p.id_prestamo,
      a.codigo_alumno,
      a.nombre AS alumno_nombre,
      a.apellido AS alumno_apellido,
      a.carrera,
      a.curso,
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
  `, (err, rows) => {
    if (err) return res.status(500).json(err);
    const headers = [
      'ID Prestamo','Cod. Alumno','Nombre','Apellido','Carrera','Curso',
      'Equipo','Tipo','Marca','Fecha Prestamo','Fecha Dev. Estimada',
      'Estado Inicial','Accesorios','Motivo','Observaciones','Estado Prestamo',
      'Encargado','Apellido Enc.',
      'ID Devolucion','Fecha Devolucion','Estado Devolucion',
      'Tiene Dano','Tipo Dano','Monto Dano','Dias Retraso','Multa','Total Cobro','Obs. Devolucion'
    ];
    const csv = [headers.join(',')].concat(rows.map(r =>
      Object.values(r).map(v => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"').join(',')
    )).join('\n');
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', 'attachment; filename=smartloan_exportacion_' + fecha + '.csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv);
  });
});

app.listen(3000, () => console.log('SmartLoan IT corriendo en http://localhost:3000'));