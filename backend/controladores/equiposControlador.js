// Controlador de equipos: inventario, disponibilidad, estado e historial.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');
const { describirCambios } = require('../utils/diffCampos');
const httpError = require('../utils/httpError');
const { withTransaction } = require('../utils/transaccion');

/**
 * Lista todos los equipos ordenados por ID.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de equipos.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query('SELECT * FROM equipos ORDER BY id_equipo');
  res.json(rows);
};

/**
 * Lista solo los equipos con estado Disponible.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de equipos disponibles.
 * @returns {Promise<void>}
 */
exports.disponibles = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query("SELECT * FROM equipos WHERE estado = 'Disponible' ORDER BY id_equipo");
  res.json(rows);
};

/**
 * Crea un equipo nuevo con estado inicial Disponible.
 * @param {import('express').Request} req Body: nombre, tipo, marca, descripcion.
 * @param {import('express').Response} res Confirmación o error de validación.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  const { nombre, tipo, marca, descripcion } = req.body;
  if (!nombre || !tipo || !marca || !descripcion) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }
  const conn = await db;
  const [result] = await conn.query(
    'INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES (?,?,?,?)',
    [s(nombre, 100), s(tipo, 50), s(marca, 50), s(descripcion, 200)]
  );
  auditoria.registrar(req, {
    accion: 'CREAR',
    entidad: 'equipo',
    id_entidad: result.insertId,
    detalle: `${nombre} · ${tipo} · ${marca}`
  });
  res.json({ mensaje: 'Equipo creado' });
};

/**
 * Elimina un equipo solo si nunca tuvo préstamos.
 * @param {import('express').Request} req Parámetro :id del equipo.
 * @param {import('express').Response} res Confirmación o error de regla de negocio.
 * @returns {Promise<void>}
 */
exports.eliminar = async (req, res) => {
  const id = req.params.id;
  await withTransaction(async (conn) => {
    const [historial] = await conn.query(
      'SELECT COUNT(*) AS total FROM prestamos WHERE id_equipo = ? FOR UPDATE', [id]
    );
    if (Number(historial[0].total) > 0) {
      throw httpError(400, 'No se puede eliminar: el equipo tiene historial de préstamos.');
    }
    await conn.query('DELETE FROM equipos WHERE id_equipo = ?', [id]);
  });

  auditoria.registrar(req, {
    accion: 'ELIMINAR',
    entidad: 'equipo',
    id_entidad: id,
    detalle: 'Equipo sin historial de préstamos eliminado'
  });
  res.json({ mensaje: 'Equipo eliminado correctamente' });
};

/**
 * Cambia manualmente el estado de un equipo entre Disponible y En mantenimiento.
 * @param {import('express').Request} req Body: estado numérico; parámetro :id.
 * @param {import('express').Response} res Confirmación o error de validación.
 * @returns {Promise<void>}
 */
exports.cambiarEstado = async (req, res) => {
  const estadoMap = { 1: 'Disponible', 2: 'Prestado', 3: 'En mantenimiento' };
  const estado = estadoMap[req.body.estado];
  if (!estado) return res.status(400).json({ mensaje: 'Estado inválido' });

  const conn = await db;
  const [equipos] = await conn.query('SELECT nombre, estado FROM equipos WHERE id_equipo=?', [req.params.id]);
  if (equipos.length === 0) {
    return res.status(404).json({ mensaje: 'Equipo no encontrado' });
  }

  const actual = equipos[0].estado;
  const permitidas = {
    'Disponible': ['En mantenimiento'],
    'En mantenimiento': ['Disponible'],
    'Prestado': []
  };
  if (!permitidas[actual] || !permitidas[actual].includes(estado)) {
    return res.status(400).json({ mensaje: `Transición no permitida: ${actual} -> ${estado}. Los cambios de estado manuales solo pueden ser Disponible <-> En mantenimiento.` });
  }

  await conn.query('UPDATE equipos SET estado=? WHERE id_equipo=?', [estado, req.params.id]);
  auditoria.registrar(req, {
    accion: 'ESTADO',
    entidad: 'equipo',
    id_entidad: req.params.id,
    detalle: `${equipos[0].nombre}: ${actual} → ${estado}`
  });
  res.json({ mensaje: 'Estado actualizado' });
};

/**
 * Devuelve el historial de préstamos de un equipo.
 * @param {import('express').Request} req Parámetro :id del equipo.
 * @param {import('express').Response} res Arreglo de préstamos.
 * @returns {Promise<void>}
 */
exports.historial = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query(`
    SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
      p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
      p.anulado, p.motivo_anulacion, p.fecha_anulacion,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso, a.turno,
      d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
      d.anulado AS devolucion_anulada, d.motivo_anulacion AS devolucion_motivo_anulacion,
      d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
    FROM prestamos p
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo AND d.anulado = 0
    WHERE p.id_equipo = ?
    ORDER BY p.fecha_prestamo DESC
  `, [req.params.id]);
  res.json(rows);
};

/**
 * Actualiza los datos descriptivos de un equipo y audita los cambios.
 * @param {import('express').Request} req Body con los datos; parámetro :id.
 * @param {import('express').Response} res Confirmación o 404.
 * @returns {Promise<void>}
 */
exports.editar = async (req, res) => {
  const { nombre, tipo, marca, descripcion } = req.body;
  if (!nombre || !tipo || !marca || !descripcion) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const conn = await db;
  const [prevRows] = await conn.query(
    'SELECT nombre, tipo, marca, descripcion FROM equipos WHERE id_equipo = ?', [req.params.id]
  );
  if (prevRows.length === 0) {
    return res.status(404).json({ mensaje: 'Equipo no encontrado' });
  }

  const nuevo = {
    nombre: s(nombre, 100),
    tipo: s(tipo, 50),
    marca: s(marca, 50),
    descripcion: s(descripcion, 200)
  };
  await conn.query(
    'UPDATE equipos SET nombre=?, tipo=?, marca=?, descripcion=? WHERE id_equipo=?',
    [nuevo.nombre, nuevo.tipo, nuevo.marca, nuevo.descripcion, req.params.id]
  );

  const detalle = describirCambios(prevRows[0], nuevo, [
    ['Nombre', 'nombre'],
    ['Tipo', 'tipo'],
    ['Marca', 'marca'],
    ['Descripción', 'descripcion']
  ]) || 'Sin cambios';
  auditoria.registrar(req, {
    accion: 'EDITAR',
    entidad: 'equipo',
    id_entidad: req.params.id,
    detalle
  });
  res.json({ mensaje: 'Equipo actualizado' });
};
