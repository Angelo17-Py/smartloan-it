const db = require('../db');
const { s } = require('../utils/sanitize');

const fmt = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 19);
  const str = new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' });
  return str.replace('T', ' ').slice(0, 19);
};

exports.crear = async (req, res) => {
  try {
    const { id_alumno, id_equipo, fecha_devolucion_estimada,
            estado_inicial_equipo, accesorios, motivo, observaciones, acepto_contrato } = req.body;
    const estadoIniMap = {1:'Excelente', 2:'Bueno', 3:'Dañado'};
    const estadoIni = estadoIniMap[estado_inicial_equipo];
    if (!estadoIni) {
      return res.status(400).json({ mensaje: 'Estado inicial inválido' });
    }
    if (!id_alumno || !id_equipo || !fecha_devolucion_estimada) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }
    if (!acepto_contrato) {
      return res.status(400).json({ mensaje: 'El alumno debe aceptar el contrato' });
    }
    const ahora = new Date();
    const devEst = new Date(fecha_devolucion_estimada);
    if (isNaN(devEst.getTime()) || devEst <= ahora) {
      return res.status(400).json({ mensaje: 'La fecha de devolución debe ser posterior a la fecha actual' });
    }
    const conn = await db;
    const [cfg] = await conn.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
    let multaBase = cfg.length ? parseFloat(cfg[0].valor) : 10000;
    if (multaBase == null || isNaN(multaBase) || multaBase < 0) multaBase = 10000;
    const [result] = await conn.query(
      `INSERT INTO prestamos (id_alumno,id_equipo,id_encargado,fecha_prestamo,fecha_devolucion_estimada,
       estado_inicial_equipo,accesorios,motivo,observaciones,acepto_contrato,multa_base)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id_alumno, id_equipo, req.encargado.id, fmt(new Date()), fmt(fecha_devolucion_estimada),
       estadoIni, s(accesorios, 300), s(motivo, 300), s(observaciones, 300), 1, multaBase]
    );
    res.json({ mensaje: 'Préstamo registrado correctamente', id_prestamo: result.insertId, fecha_prestamo: fmt(new Date()) });
  } catch (err) {
    if (err.code === 'ER_SIGNAL_EXCEPTION') {
      return res.status(400).json({ mensaje: 'El equipo no está disponible para préstamo' });
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

exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await db;
    const [prestamos] = await conn.query('SELECT id_equipo FROM prestamos WHERE id_prestamo = ?', [id]);
    if (prestamos.length === 0) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      await tx.query('DELETE FROM devoluciones WHERE id_prestamo = ?', [id]);
      await tx.query('DELETE FROM prestamos WHERE id_prestamo = ?', [id]);
      const idEquipo = prestamos[0].id_equipo;
      const [activos] = await tx.query(
        'SELECT COUNT(*) AS c FROM prestamos WHERE id_equipo = ? AND estado = "ACTIVO" AND id_prestamo != ?',
        [idEquipo, id]
      );
      if (activos[0].c === 0) {
        await tx.query("UPDATE equipos SET estado = 'Disponible' WHERE id_equipo = ?", [idEquipo]);
      }
      await tx.commit();
      res.json({ mensaje: 'Préstamo eliminado correctamente' });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    } finally {
      tx.release();
    }
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
        a.carrera, a.curso, a.cedula,
        enc.codigo AS codigo_encargado, enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
      FROM prestamos p
      JOIN equipos e ON p.id_equipo = e.id_equipo
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      JOIN encargados enc ON p.id_encargado = enc.id_encargado
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
