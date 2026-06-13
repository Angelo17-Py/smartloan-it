const db = require('../db');

const fmt = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 19);
  const str = new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' });
  return str.replace('T', ' ').slice(0, 19);
};

exports.crear = async (req, res) => {
  try {
    const { id_alumno, id_equipo, id_encargado, fecha_devolucion_estimada,
            estado_inicial_equipo, accesorios, motivo, observaciones, acepto_contrato } = req.body;
    if (!id_alumno || !id_equipo || !id_encargado || !fecha_devolucion_estimada) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }
    if (!acepto_contrato) {
      return res.status(400).json({ mensaje: 'El alumno debe aceptar el contrato' });
    }
    const conn = await db;
    await conn.query(
      `INSERT INTO prestamos (id_alumno,id_equipo,id_encargado,fecha_prestamo,fecha_devolucion_estimada,
       estado_inicial_equipo,accesorios,motivo,observaciones,acepto_contrato)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id_alumno, id_equipo, id_encargado, fmt(new Date()), fmt(fecha_devolucion_estimada),
       estado_inicial_equipo || 'Excelente', accesorios || '', motivo || '', observaciones || '', 1]
    );
    res.json({ mensaje: 'Préstamo registrado correctamente' });
  } catch (err) {
    if (err.sqlMessage && err.sqlMessage.toLowerCase().includes('disponible')) {
      return res.status(400).json({ mensaje: 'El equipo no está disponible' });
    }
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT p.*, e.nombre AS equipo, e.tipo, e.marca, e.estado AS estado_equipo,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso,
        enc.codigo AS codigo_encargado, enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
      FROM prestamos p
      JOIN equipos e ON p.id_equipo = e.id_equipo
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      JOIN encargados enc ON p.id_encargado = enc.id_encargado
      ORDER BY p.fecha_prestamo DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

exports.buscar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT p.*, e.nombre AS equipo, e.tipo, e.marca,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
        a.carrera, a.curso, a.cedula
      FROM prestamos p
      JOIN equipos e ON p.id_equipo = e.id_equipo
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      WHERE p.id_prestamo = ? AND p.estado = 'ACTIVO'
    `, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado o ya devuelto' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
