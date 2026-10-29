const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');

// Lista todos los alumnos activos, ordenados por código
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query('SELECT * FROM alumnos WHERE estado=1 ORDER BY codigo_alumno');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// Lista alumnos que NO tienen un préstamo activo (para poder asignarles uno nuevo)
exports.disponibles = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT * FROM alumnos
      WHERE estado = 1
      AND id_alumno NOT IN (
        SELECT id_alumno FROM prestamos WHERE estado = 'ACTIVO'
      )
      ORDER BY codigo_alumno
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// Crea un alumno generando un código correlativo (ALU001, ALU002…)
exports.crear = async (req, res) => {
  const { nombre, apellido, carrera, curso, turno } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Nombre y apellido requeridos' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Buscamos el número más alto existente para generar el siguiente código
    const [maxRow] = await conn.query('SELECT MAX(CAST(SUBSTRING(codigo_alumno, 4) AS UNSIGNED)) AS max_num FROM alumnos FOR UPDATE');
    const maxNum = maxRow[0].max_num || 0;
    const codigo_alumno = 'ALU' + String(maxNum + 1).padStart(3, '0');
    await conn.query(
      'INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso,turno) VALUES (?,?,?,?,?,?)',
      [codigo_alumno, s(nombre, 100), s(apellido, 100), s(carrera, 150), s(curso, 50), s(turno || 'Mañana', 20)]
    );
    await conn.commit();
    auditoria.registrar(req, {
      accion: 'CREAR',
      entidad: 'alumno',
      id_entidad: codigo_alumno,
      detalle: `${nombre} ${apellido} · ${turno || 'Mañana'}`
    });
    res.json({ mensaje: 'Alumno registrado', codigo_alumno });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

// Desactiva un alumno sin borrar su historial de préstamos y devoluciones
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // No se puede desactivar si todavía tiene un préstamo activo
      const [prestamosActivos] = await tx.query(
        'SELECT id_prestamo FROM prestamos WHERE id_alumno = ? AND estado = "ACTIVO" LIMIT 1 FOR UPDATE', [id]
      );
      if (prestamosActivos.length > 0) {
        await tx.rollback();
        return res.status(400).json({ mensaje: 'No se puede desactivar: el alumno tiene un préstamo activo' });
      }
      await tx.query('UPDATE alumnos SET estado = 0 WHERE id_alumno = ?', [id]);
      await tx.commit();
      auditoria.registrar(req, {
        accion: 'DESACTIVAR',
        entidad: 'alumno',
        id_entidad: id,
        detalle: 'Alumno desactivado (historial conservado)'
      });
      res.json({ mensaje: 'Alumno desactivado correctamente. Su historial se conserva.' });
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

// Obtiene el historial completo de préstamos de un alumno
exports.historial = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
        p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
        e.nombre AS equipo, e.tipo, e.marca,
        enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido,
        d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
        d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
      FROM prestamos p
      JOIN equipos e ON p.id_equipo = e.id_equipo
      JOIN encargados enc ON p.id_encargado = enc.id_encargado
      LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
      WHERE p.id_alumno = ?
      ORDER BY p.fecha_prestamo DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

// Actualiza los datos de un alumno existente
exports.editar = async (req, res) => {
  try {
    const { nombre, apellido, carrera, curso, turno } = req.body;
    if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    await conn.query(
      'UPDATE alumnos SET nombre=?, apellido=?, carrera=?, curso=?, turno=? WHERE id_alumno=?',
      [s(nombre, 100), s(apellido, 100), s(carrera, 150), s(curso, 50), s(turno || 'Mañana', 20), req.params.id]
    );
    auditoria.registrar(req, {
      accion: 'EDITAR',
      entidad: 'alumno',
      id_entidad: req.params.id,
      detalle: `${nombre} ${apellido} · ${curso || '—'} · ${turno || 'Mañana'}`
    });
    res.json({ mensaje: 'Alumno actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
