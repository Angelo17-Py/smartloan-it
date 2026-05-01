const db = require('../db');

const fmtMySQL = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ');

exports.crear = (req, res) => {
  const { id_alumno, id_equipo, id_encargado, fecha_devolucion_estimada,
          estado_inicial_equipo, accesorios, motivo, observaciones, acepto_contrato } = req.body;

  if (!id_alumno || !id_equipo || !id_encargado || !fecha_devolucion_estimada)
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  if (!acepto_contrato)
    return res.status(400).json({ mensaje: 'El alumno debe aceptar el contrato de uso' });

  const fecha   = fmtMySQL(new Date());
  const fechaDev = fmtMySQL(fecha_devolucion_estimada);

  db.query(
    `INSERT INTO prestamos
     (id_alumno, id_equipo, id_encargado, fecha_prestamo, fecha_devolucion_estimada,
      estado_inicial_equipo, accesorios, motivo, observaciones, acepto_contrato)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id_alumno, id_equipo, id_encargado, fecha, fechaDev,
     estado_inicial_equipo || 'Excelente', accesorios || '', motivo || '', observaciones || '',
     acepto_contrato ? 1 : 0],
    (err) => {
      if (err) {
        if (err.sqlMessage && err.sqlMessage.includes('disponible'))
          return res.status(400).json({ mensaje: 'El equipo no está disponible' });
        return res.status(500).json(err);
      }
      res.json({ mensaje: 'Préstamo registrado correctamente' });
    }
  );
};

exports.listar = (req, res) => {
  db.query(`
    SELECT p.*,
      e.nombre AS equipo, e.tipo, e.marca, e.estado AS estado_equipo,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso,
      enc.codigo AS codigo_encargado,
      enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
    FROM prestamos p
    JOIN equipos e      ON p.id_equipo    = e.id_equipo
    JOIN alumnos a      ON p.id_alumno    = a.id_alumno
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    ORDER BY p.fecha_prestamo DESC
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.buscar = (req, res) => {
  db.query(`
    SELECT p.*,
      e.nombre AS equipo, e.tipo, e.marca,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso, a.cedula
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    WHERE p.id_prestamo = ? AND p.estado = 'ACTIVO'
  `, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ mensaje: 'Préstamo no encontrado o ya devuelto' });
    res.json(result[0]);
  });
};