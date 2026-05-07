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

// Backup completo en JSON
app.get('/backup', (req, res) => {
  const tablas = ['alumnos', 'equipos', 'prestamos', 'devoluciones'];
  const datos = {};
  let pendientes = tablas.length;
  tablas.forEach(tabla => {
    db.query('SELECT * FROM ' + tabla, (err, r) => {
      datos[tabla] = err ? [] : r;
      pendientes--;
      if (pendientes === 0) {
        const fecha = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Disposition', 'attachment; filename=backup_smartloan_' + fecha + '.json');
        res.setHeader('Content-Type', 'application/json');
        res.json({ fecha_backup: new Date().toISOString(), sistema: 'SmartLoan IT', datos });
      }
    });
  });
});

// Exportar prestamos CSV
app.get('/exportar/prestamos', (req, res) => {
  db.query(`
    SELECT p.id_prestamo, a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso, e.nombre AS equipo, e.tipo, e.marca,
      p.fecha_prestamo, p.fecha_devolucion_estimada, p.estado_inicial_equipo,
      p.accesorios, p.motivo, p.observaciones, p.estado,
      enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
    FROM prestamos p
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    ORDER BY p.fecha_prestamo DESC
  `, (err, rows) => {
    if (err) return res.status(500).json(err);
    const headers = ['ID','Cod. Alumno','Nombre','Apellido','Carrera','Curso','Equipo','Tipo','Marca','Fecha Prestamo','Fecha Dev. Estimada','Estado Inicial','Accesorios','Motivo','Observaciones','Estado','Encargado','Apellido Enc.'];
    const csv = [headers.join(',')].concat(rows.map(r =>
      Object.values(r).map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')
    )).join('\n');
    const fecha = new Date().toISOString().slice(0,10);
    res.setHeader('Content-Disposition', 'attachment; filename=prestamos_' + fecha + '.csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv);
  });
});

// Exportar devoluciones CSV
app.get('/exportar/devoluciones', (req, res) => {
  db.query(`
    SELECT d.id_devolucion, d.id_prestamo, a.codigo_alumno,
      a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      e.nombre AS equipo, e.tipo, e.marca,
      d.fecha_devolucion, d.estado_equipo, d.tiene_dano,
      d.tipo_dano, d.monto_dano, d.dias_retraso, d.monto_multa, d.total_cobro, d.observacion
    FROM devoluciones d
    JOIN prestamos p ON d.id_prestamo = p.id_prestamo
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    JOIN equipos e ON p.id_equipo = e.id_equipo
    ORDER BY d.fecha_devolucion DESC
  `, (err, rows) => {
    if (err) return res.status(500).json(err);
    const headers = ['ID Dev','ID Pres','Cod. Alumno','Nombre','Apellido','Equipo','Tipo','Marca','Fecha Devolucion','Estado','Tiene Dano','Tipo Dano','Monto Dano','Dias Retraso','Multa','Total Cobro','Observacion'];
    const csv = [headers.join(',')].concat(rows.map(r =>
      Object.values(r).map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')
    )).join('\n');
    const fecha = new Date().toISOString().slice(0,10);
    res.setHeader('Content-Disposition', 'attachment; filename=devoluciones_' + fecha + '.csv');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send('\uFEFF' + csv);
  });
});

app.listen(3000, () => console.log('SmartLoan IT corriendo en http://localhost:3000'));