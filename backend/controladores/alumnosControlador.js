// Controlador de alumnos: listado, alta con código correlativo, baja lógica e historial.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');
const httpError = require('../utils/httpError');
const { withTransaction } = require('../utils/transaccion');

/**
 * Lista los alumnos activos ordenados por código.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de alumnos.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query('SELECT * FROM alumnos WHERE estado=1 ORDER BY codigo_alumno');
  res.json(rows);
};

/**
 * Lista los alumnos activos que no tienen un préstamo ACTIVO.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de alumnos disponibles.
 * @returns {Promise<void>}
 */
exports.disponibles = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query(`
    SELECT * FROM alumnos
    WHERE estado = 1
    AND id_alumno NOT IN (
      SELECT id_alumno FROM prestamos WHERE estado = 'ACTIVO' AND anulado = 0
    )
    ORDER BY codigo_alumno
  `);
  res.json(rows);
};

/**
 * Crea un alumno generando un código correlativo (ALU001, ALU002...).
 * @param {import('express').Request} req Body: nombre, apellido, carrera, curso, turno.
 * @param {import('express').Response} res Código generado o error de validación.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  const { nombre, apellido, carrera, curso, turno } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Nombre y apellido requeridos' });

  const codigo_alumno = await withTransaction(async (conn) => {
    // El correlativo se calcula bloqueando la tabla para evitar códigos duplicados.
    const [maxRow] = await conn.query('SELECT MAX(CAST(SUBSTRING(codigo_alumno, 4) AS UNSIGNED)) AS max_num FROM alumnos FOR UPDATE');
    const maxNum = maxRow[0].max_num || 0;
    const codigo = 'ALU' + String(maxNum + 1).padStart(3, '0');
    await conn.query(
      'INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso,turno) VALUES (?,?,?,?,?,?)',
      [codigo, s(nombre, 100), s(apellido, 100), s(carrera, 150), s(curso, 50), s(turno || 'Mañana', 20)]
    );
    return codigo;
  });

  auditoria.registrar(req, {
    accion: 'CREAR',
    entidad: 'alumno',
    id_entidad: codigo_alumno,
    detalle: `${nombre} ${apellido} · ${turno || 'Mañana'}`
  });
  res.json({ mensaje: 'Alumno registrado', codigo_alumno });
};

/**
 * Desactiva lógicamente un alumno (estado = 0) sin borrar su historial.
 * @param {import('express').Request} req Parámetro :id del alumno.
 * @param {import('express').Response} res Confirmación o error de regla de negocio.
 * @returns {Promise<void>}
 */
exports.eliminar = async (req, res) => {
  const id = req.params.id;
  await withTransaction(async (conn) => {
    const [prestamosActivos] = await conn.query(
      'SELECT id_prestamo FROM prestamos WHERE id_alumno = ? AND estado = "ACTIVO" AND anulado = 0 LIMIT 1 FOR UPDATE',
      [id]
    );
    if (prestamosActivos.length > 0) {
      throw httpError(400, 'No se puede desactivar: el alumno tiene un préstamo activo');
    }
    await conn.query('UPDATE alumnos SET estado = 0 WHERE id_alumno = ?', [id]);
  });

  auditoria.registrar(req, {
    accion: 'DESACTIVAR',
    entidad: 'alumno',
    id_entidad: id,
    detalle: 'Alumno desactivado (historial conservado)'
  });
  res.json({ mensaje: 'Alumno desactivado correctamente. Su historial se conserva.' });
};

/**
 * Obtiene el historial de préstamos de un alumno, con sus devoluciones si existen.
 * @param {import('express').Request} req Parámetro :id del alumno.
 * @param {import('express').Response} res Arreglo de préstamos.
 * @returns {Promise<void>}
 */
exports.historial = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query(`
    SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
      p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
      p.anulado, p.motivo_anulacion, p.fecha_anulacion,
      e.nombre AS equipo, e.tipo, e.marca,
      enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido,
      d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
      d.anulado AS devolucion_anulada, d.motivo_anulacion AS devolucion_motivo_anulacion,
      d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo AND d.anulado = 0
    WHERE p.id_alumno = ?
    ORDER BY p.fecha_prestamo DESC
  `, [req.params.id]);
  res.json(rows);
};

/**
 * Actualiza los datos de un alumno existente y audita los campos modificados.
 * @param {import('express').Request} req Body con los datos; parámetro :id.
 * @param {import('express').Response} res Confirmación o 404.
 * @returns {Promise<void>}
 */
exports.editar = async (req, res) => {
  const { nombre, apellido, carrera, curso, turno } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Datos incompletos' });

  const conn = await db;
  const [prevRows] = await conn.query(
    'SELECT nombre, apellido, carrera, curso, turno FROM alumnos WHERE id_alumno = ?', [req.params.id]
  );
  if (prevRows.length === 0) {
    return res.status(404).json({ mensaje: 'Alumno no encontrado' });
  }

  const nuevo = {
    nombre: s(nombre, 100),
    apellido: s(apellido, 100),
    carrera: s(carrera, 150),
    curso: s(curso, 50),
    turno: s(turno || 'Mañana', 20)
  };
  await conn.query(
    'UPDATE alumnos SET nombre=?, apellido=?, carrera=?, curso=?, turno=? WHERE id_alumno=?',
    [nuevo.nombre, nuevo.apellido, nuevo.carrera, nuevo.curso, nuevo.turno, req.params.id]
  );

  const prev = prevRows[0];
  const cambios = [];
  [['Nombre', 'nombre'], ['Apellido', 'apellido'], ['Bachillerato', 'carrera'], ['Curso', 'curso'], ['Turno', 'turno']].forEach(function (par) {
    if (String(prev[par[1]] || '') !== String(nuevo[par[1]] || '')) {
      cambios.push(par[0] + ': "' + (prev[par[1]] || '—') + '" → "' + (nuevo[par[1]] || '—') + '"');
    }
  });
  auditoria.registrar(req, {
    accion: 'EDITAR',
    entidad: 'alumno',
    id_entidad: req.params.id,
    detalle: cambios.length ? cambios.join(' · ') : 'Sin cambios'
  });
  res.json({ mensaje: 'Alumno actualizado' });
};
