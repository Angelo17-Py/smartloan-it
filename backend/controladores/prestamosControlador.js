// Controlador de préstamos: alta con validaciones, alertas, consulta y anulación.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');
const httpError = require('../utils/httpError');
const { withTransaction } = require('../utils/transaccion');

// Formatea fechas a string MySQL (YYYY-MM-DD HH:MM:SS) en zona horaria de Paraguay.
const fmt = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 19);
  const str = new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' });
  return str.replace('T', ' ').slice(0, 19);
};

// Versión vigente del contrato que el alumno acepta al registrar el préstamo.
const CONTRATO_VERSION = '1.0';

/**
 * Crea un préstamo tras validar fechas, contrato, estado inicial y disponibilidad.
 * @param {import('express').Request} req Body con alumno, equipo, fechas y estado inicial.
 * @param {import('express').Response} res Código/id generados o error de validación.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  const { id_alumno, id_equipo, fecha_prestamo, fecha_devolucion_estimada,
          estado_inicial_equipo, accesorios, motivo, observaciones, acepto_contrato } = req.body;
  const estadoIniMap = { 1: 'Excelente', 2: 'Bueno' };
  const estadoIni = estadoIniMap[estado_inicial_equipo];
  if (!estadoIni) return res.status(400).json({ mensaje: 'Estado inicial inválido' });
  if (!id_alumno || !id_equipo || !fecha_devolucion_estimada) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }
  if (!acepto_contrato) {
    return res.status(400).json({ mensaje: 'El alumno debe aceptar el contrato' });
  }

  const ahora = new Date();
  const ahoraStr = fmt(ahora);
  let fechaPrestamoStr = ahoraStr;
  if (fecha_prestamo) {
    if (isNaN(new Date(fecha_prestamo).getTime())) {
      return res.status(400).json({ mensaje: 'Fecha de préstamo inválida' });
    }
    fechaPrestamoStr = fmt(fecha_prestamo);
    if (fechaPrestamoStr > ahoraStr) {
      return res.status(400).json({ mensaje: 'La fecha del préstamo no puede ser futura' });
    }
  }
  const devEst = new Date(fecha_devolucion_estimada);
  const devStr = fmt(fecha_devolucion_estimada);
  if (isNaN(devEst.getTime()) || !devStr) {
    return res.status(400).json({ mensaje: 'Fecha de devolución inválida' });
  }
  if (devStr <= fechaPrestamoStr || devStr <= ahoraStr) {
    return res.status(400).json({ mensaje: 'La fecha de devolución debe ser posterior a la fecha actual y a la del préstamo' });
  }

  const conn = await db;
  // Se congela la multa vigente para que las devoluciones conserven el cálculo histórico.
  const [cfg] = await conn.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
  let multaBase = cfg.length ? parseFloat(cfg[0].valor) : 10000;
  if (multaBase == null || isNaN(multaBase) || multaBase < 0) multaBase = 10000;

  const [maxRow] = await conn.query('SELECT MAX(CAST(SUBSTRING(codigo_prestamo, 5) AS UNSIGNED)) AS max_num FROM prestamos FOR UPDATE');
  const maxNum = maxRow[0].max_num || 0;
  const codigoPrestamo = 'PRE-' + String(maxNum + 1).padStart(3, '0');
  const [result] = await conn.query(
    `INSERT INTO prestamos (codigo_prestamo,id_alumno,id_equipo,id_encargado,fecha_prestamo,fecha_devolucion_estimada,
     estado_inicial_equipo,accesorios,motivo,observaciones,acepto_contrato,multa_base,contrato_version,fecha_aceptacion)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [codigoPrestamo, id_alumno, id_equipo, req.encargado.id, fechaPrestamoStr, devStr,
     estadoIni, s(accesorios, 300), s(motivo, 300), s(observaciones, 300), 1, multaBase,
     CONTRATO_VERSION, ahoraStr]
  );
  auditoria.registrar(req, {
    accion: 'CREAR',
    entidad: 'prestamo',
    id_entidad: codigoPrestamo,
    detalle: `Equipo #${id_equipo} prestado al alumno #${id_alumno} · vence ${devStr}`
  });
  res.json({
    mensaje: 'Préstamo registrado correctamente',
    codigo_prestamo: codigoPrestamo,
    id_prestamo: result.insertId,
    fecha_prestamo: fechaPrestamoStr,
    fecha_aceptacion: ahoraStr,
    multa_base: multaBase
  });
};

/**
 * Lista préstamos con datos del alumno, equipo y encargado.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de préstamos.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  const conn = await db;
  const incluirAnulados = req.query.incluir_anulados === '1';
  const [rows] = await conn.query(`
    SELECT p.*, e.nombre AS equipo, e.tipo, e.marca, e.estado AS estado_equipo,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso, a.turno,
      d.id_devolucion, d.codigo_devolucion, d.fecha_devolucion,
      enc.codigo AS codigo_encargado, enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo AND d.anulado = 0
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    ${incluirAnulados ? '' : 'WHERE p.anulado = 0'}
    ORDER BY p.fecha_prestamo DESC
  `);
  res.json(rows);
};

/**
 * Lista préstamos activos vencidos o por vencer en 48 horas.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Objeto { alertas, total, vencidos }.
 * @returns {Promise<void>}
 */
exports.alertas = async (req, res) => {
  const conn = await db;
  const ahoraStr = fmt(new Date());
  const umbralStr = fmt(new Date(Date.now() + 48 * 60 * 60 * 1000));
  const [rows] = await conn.query(`
    SELECT p.id_prestamo, p.codigo_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      e.nombre AS equipo, e.tipo,
      TIMESTAMPDIFF(MINUTE, ?, p.fecha_devolucion_estimada) AS minutos_restantes
    FROM prestamos p
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    JOIN equipos e ON p.id_equipo = e.id_equipo
    WHERE p.estado = 'ACTIVO' AND p.anulado = 0 AND p.fecha_devolucion_estimada <= ?
    ORDER BY p.fecha_devolucion_estimada ASC
  `, [ahoraStr, umbralStr]);
  res.json({
    alertas: rows,
    total: rows.length,
    vencidos: rows.filter(r => Number(r.minutos_restantes) < 0).length
  });
};

/**
 * Anula lógicamente un préstamo, conservando el registro.
 * @param {import('express').Request} req Body: motivo; parámetro :id del préstamo.
 * @param {import('express').Response} res Confirmación o error de regla de negocio.
 * @returns {Promise<void>}
 */
exports.anular = async (req, res) => {
  const id = req.params.id;
  const motivo = s(req.body && req.body.motivo, 300);
  if (motivo.length < 5) {
    return res.status(400).json({ mensaje: 'Indicá un motivo de al menos 5 caracteres' });
  }

  const prestamo = await withTransaction(async (conn) => {
    const [prestamos] = await conn.query(
      `SELECT p.id_equipo, p.codigo_prestamo, p.anulado,
         a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
         e.nombre AS equipo
       FROM prestamos p
       JOIN alumnos a ON p.id_alumno = a.id_alumno
       JOIN equipos e ON p.id_equipo = e.id_equipo
       WHERE p.id_prestamo = ? FOR UPDATE`, [id]
    );
    if (prestamos.length === 0) throw httpError(404, 'Préstamo no encontrado');
    const p = prestamos[0];
    if (Number(p.anulado) === 1) throw httpError(400, 'El préstamo ya está anulado');

    const [devoluciones] = await conn.query(
      'SELECT id_devolucion FROM devoluciones WHERE id_prestamo = ? AND anulado = 0 LIMIT 1 FOR UPDATE',
      [id]
    );
    if (devoluciones.length > 0) {
      throw httpError(400, 'No se puede anular un préstamo con devolución registrada. Anulá primero la devolución.');
    }

    await conn.query(
      'UPDATE prestamos SET anulado = 1, motivo_anulacion = ?, fecha_anulacion = ? WHERE id_prestamo = ?',
      [motivo, fmt(new Date()), id]
    );
    const [activos] = await conn.query(
      'SELECT COUNT(*) AS c FROM prestamos WHERE id_equipo = ? AND estado = "ACTIVO" AND anulado = 0 AND id_prestamo != ?',
      [p.id_equipo, id]
    );
    if (Number(activos[0].c) === 0) {
      await conn.query("UPDATE equipos SET estado = 'Disponible' WHERE id_equipo = ?", [p.id_equipo]);
    }
    return p;
  });

  auditoria.registrar(req, {
    accion: 'ANULAR',
    entidad: 'prestamo',
    id_entidad: prestamo.codigo_prestamo || id,
    detalle: `Motivo: ${motivo} · ${prestamo.equipo} → ${prestamo.alumno_nombre} ${prestamo.alumno_apellido}`
  });
  res.json({ mensaje: 'Préstamo anulado correctamente' });
};

/**
 * Busca un préstamo ACTIVO por ID para mostrar el comprobante.
 * @param {import('express').Request} req Parámetro :id del préstamo.
 * @param {import('express').Response} res Préstamo encontrado o 404.
 * @returns {Promise<void>}
 */
exports.buscar = async (req, res) => {
  const conn = await db;
  const [rows] = await conn.query(`
    SELECT p.*, e.nombre AS equipo, e.tipo, e.marca,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso, a.turno,
      enc.codigo AS codigo_encargado, enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    WHERE p.id_prestamo = ? AND p.estado = 'ACTIVO' AND p.anulado = 0
  `, [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ mensaje: 'Préstamo no encontrado, ya devuelto o anulado' });
  }
  res.json(rows[0]);
};
