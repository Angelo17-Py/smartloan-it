const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query('SELECT * FROM equipos ORDER BY id_equipo');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, tipo, marca, descripcion } = req.body;
    if (!nombre || !tipo || !marca || !descripcion) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    await conn.query('INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES (?,?,?,?)',
      [nombre, tipo, marca, descripcion]
    );
    res.json({ mensaje: 'Equipo creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await db;
    const [prestamosActivos] = await conn.query(
      'SELECT id_prestamo FROM prestamos WHERE id_equipo = ? AND estado = "ACTIVO" LIMIT 1', [id]
    );
    if (prestamosActivos.length > 0) {
      return res.status(400).json({ mensaje: 'No se puede eliminar: el equipo tiene un préstamo activo' });
    }
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      await tx.query('DELETE dv FROM devoluciones dv JOIN prestamos p ON dv.id_prestamo = p.id_prestamo WHERE p.id_equipo = ?', [id]);
      await tx.query('DELETE FROM prestamos WHERE id_equipo = ?', [id]);
      await tx.query('DELETE FROM equipos WHERE id_equipo = ?', [id]);
      await tx.commit();
      res.json({ mensaje: 'Equipo eliminado correctamente' });
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

exports.cambiarEstado = async (req, res) => {
  try {
    const estadoMap = {1:'Disponible', 2:'Prestado', 3:'En mantenimiento'};
    const estado = estadoMap[req.body.estado];
    if (!estado) {
      return res.status(400).json({ mensaje: 'Estado inválido' });
    }
    const conn = await db;
    await conn.query('UPDATE equipos SET estado=? WHERE id_equipo=?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

exports.historial = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
        p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
        a.carrera, a.curso,
        d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
        d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
      FROM prestamos p
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
      WHERE p.id_equipo = ?
      ORDER BY p.fecha_prestamo DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

exports.editar = async (req, res) => {
  try {
    const { nombre, tipo, marca, descripcion } = req.body;
    if (!nombre || !tipo || !marca || !descripcion) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    await conn.query(
      'UPDATE equipos SET nombre=?, tipo=?, marca=?, descripcion=? WHERE id_equipo=?',
      [nombre, tipo, marca, descripcion, req.params.id]
    );
    res.json({ mensaje: 'Equipo actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
