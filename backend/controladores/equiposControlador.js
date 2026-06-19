const db = require('../db');
const { s } = require('../utils/sanitize');

// Lista todos los equipos, ordenados por ID
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

// Crea un nuevo equipo en la base de datos
exports.crear = async (req, res) => {
  try {
    const { nombre, tipo, marca, descripcion } = req.body;
    if (!nombre || !tipo || !marca || !descripcion) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    await conn.query('INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES (?,?,?,?)',
      [s(nombre, 100), s(tipo, 50), s(marca, 50), s(descripcion, 200)]
    );
    res.json({ mensaje: 'Equipo creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// Elimina un equipo y sus registros relacionados, si no tiene préstamos activos
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // Verificamos que no tenga préstamos activos antes de eliminar
      const [prestamosActivos] = await tx.query(
        'SELECT id_prestamo FROM prestamos WHERE id_equipo = ? AND estado = "ACTIVO" LIMIT 1 FOR UPDATE', [id]
      );
      if (prestamosActivos.length > 0) {
        await tx.rollback();
        return res.status(400).json({ mensaje: 'No se puede eliminar: el equipo tiene un préstamo activo' });
      }
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

// Cambia el estado manual de un equipo solo permite: Disponible ↔ En mantenimiento
exports.cambiarEstado = async (req, res) => {
  try {
    const estadoMap = {1:'Disponible', 2:'Prestado', 3:'En mantenimiento'};
    const estado = estadoMap[req.body.estado];
    if (!estado) {
      return res.status(400).json({ mensaje: 'Estado inválido' });
    }
    const conn = await db;
    const [equipos] = await conn.query('SELECT estado FROM equipos WHERE id_equipo=?', [req.params.id]);
    if (equipos.length === 0) {
      return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    }
    const actual = equipos[0].estado;
    // Solo se permite cambiar manualmente entre Disponible y En mantenimiento
    const permitidas = {
      'Disponible':       ['En mantenimiento'],
      'En mantenimiento': ['Disponible'],
      'Prestado':         []
    };
    if (!permitidas[actual] || !permitidas[actual].includes(estado)) {
      return res.status(400).json({ mensaje: `Transición no permitida: ${actual} -> ${estado}. Los cambios de estado manuales solo pueden ser Disponible <-> En mantenimiento.` });
    }
    await conn.query('UPDATE equipos SET estado=? WHERE id_equipo=?', [estado, req.params.id]);
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// Historial de préstamos de un equipo específico
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

// Actualiza los datos de un equipo existente
exports.editar = async (req, res) => {
  try {
    const { nombre, tipo, marca, descripcion } = req.body;
    if (!nombre || !tipo || !marca || !descripcion) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    await conn.query(
      'UPDATE equipos SET nombre=?, tipo=?, marca=?, descripcion=? WHERE id_equipo=?',
      [s(nombre, 100), s(tipo, 50), s(marca, 50), s(descripcion, 200), req.params.id]
    );
    res.json({ mensaje: 'Equipo actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
