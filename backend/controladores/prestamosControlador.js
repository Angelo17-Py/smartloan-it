// Controlador de préstamos: alta con validaciones, alertas, consulta y anulación.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');

// Formatea fechas a string MySQL (YYYY-MM-DD HH:MM:SS) en zona horaria de Paraguay.
// El formato es ordenable lexicográficamente, lo que permite comparar fechas como texto.
const fmt = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.replace('T', ' ').slice(0, 19);
  const str = new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' });
  return str.replace('T', ' ').slice(0, 19);
};

/**
 * Crea un préstamo tras validar fechas, contrato, estado inicial y disponibilidad.
 * Guarda una copia de la multa vigente (multa_base) para calcular devoluciones futuras.
 * @param {import('express').Request} req Body con alumno, equipo, fechas y estado inicial.
 * @param {import('express').Response} res Código/id generados o error 400/500.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  try {
    const { id_alumno, id_equipo, fecha_prestamo, fecha_devolucion_estimada,
            estado_inicial_equipo, accesorios, motivo, observaciones, acepto_contrato } = req.body;
    // El formulario envía códigos numéricos que se traducen al estado real del equipo.
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
    // Desde aquí las fechas se manejan como string MySQL, comparables lexicográficamente.
    const ahora = new Date();
    const ahoraStr = fmt(ahora);
    // Fecha y hora en que se realizó el préstamo (por defecto, el momento actual)
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
    // La fecha de devolución debe ser futura y posterior a la fecha del préstamo
    if (isNaN(devEst.getTime()) || !devStr) {
      return res.status(400).json({ mensaje: 'Fecha de devolución inválida' });
    }
    if (devStr <= fechaPrestamoStr || devStr <= ahoraStr) {
      return res.status(400).json({ mensaje: 'La fecha de devolución debe ser posterior a la fecha actual y a la del préstamo' });
    }
    const conn = await db;
    // Se congela la multa por día vigente; las devoluciones usan este valor
    // aunque la configuración cambie después.
    const [cfg] = await conn.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
    let multaBase = cfg.length ? parseFloat(cfg[0].valor) : 10000;
    if (multaBase == null || isNaN(multaBase) || multaBase < 0) multaBase = 10000;
    // Generamos código correlativo (PRE-001, PRE-002...)
    // Nota: esta consulta corre fuera de una transacción, así que FOR UPDATE
    // no garantiza por sí solo la unicidad ante altas concurrentes.
    const [maxRow] = await conn.query('SELECT MAX(CAST(SUBSTRING(codigo_prestamo, 5) AS UNSIGNED)) AS max_num FROM prestamos FOR UPDATE');
    const maxNum = maxRow[0].max_num || 0;
    const codigoPrestamo = 'PRE-' + String(maxNum + 1).padStart(3, '0');
    const [result] = await conn.query(
      `INSERT INTO prestamos (codigo_prestamo,id_alumno,id_equipo,id_encargado,fecha_prestamo,fecha_devolucion_estimada,
       estado_inicial_equipo,accesorios,motivo,observaciones,acepto_contrato,multa_base)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [codigoPrestamo, id_alumno, id_equipo, req.encargado.id, fechaPrestamoStr, fmt(fecha_devolucion_estimada),
       estadoIni, s(accesorios, 300), s(motivo, 300), s(observaciones, 300), 1, multaBase]
    );
    auditoria.registrar(req, {
      accion: 'CREAR',
      entidad: 'prestamo',
      id_entidad: codigoPrestamo,
      detalle: `Equipo #${id_equipo} prestado al alumno #${id_alumno} · vence ${fmt(fecha_devolucion_estimada)}`
    });
    res.json({ mensaje: 'Préstamo registrado correctamente', codigo_prestamo: codigoPrestamo, id_prestamo: result.insertId, fecha_prestamo: fechaPrestamoStr, multa_base: multaBase });
  } catch (err) {
    // Error lanzado por el trigger validar_prestamo si el equipo no está disponible
    if (err.code === 'ER_SIGNAL_EXCEPTION') {
      return res.status(400).json({ mensaje: 'El equipo no está disponible para préstamo' });
    }
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Lista todos los préstamos con datos del alumno, equipo y encargado.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de préstamos o error 500.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT p.*, e.nombre AS equipo, e.tipo, e.marca, e.estado AS estado_equipo,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso, a.turno,
        d.id_devolucion, d.fecha_devolucion,
        enc.codigo AS codigo_encargado, enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido
      FROM prestamos p
      JOIN equipos e ON p.id_equipo = e.id_equipo
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
      JOIN encargados enc ON p.id_encargado = enc.id_encargado
      ORDER BY p.fecha_prestamo DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Lista préstamos activos vencidos o que vencen dentro de las próximas 48 horas.
 * Devuelve también el total y la cantidad de vencidos para el panel de alertas.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Objeto { alertas, total, vencidos } o error 500.
 * @returns {Promise<void>}
 */
exports.alertas = async (req, res) => {
  try {
    const conn = await db;
    const ahoraStr = fmt(new Date());
    // Ventana de aviso: 48 horas desde ahora.
    const umbralStr = fmt(new Date(Date.now() + 48 * 60 * 60 * 1000));
    // minutos_restantes negativo indica que el préstamo ya está vencido.
    const [rows] = await conn.query(`
      SELECT p.id_prestamo, p.codigo_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
        e.nombre AS equipo, e.tipo,
        TIMESTAMPDIFF(MINUTE, ?, p.fecha_devolucion_estimada) AS minutos_restantes
      FROM prestamos p
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      JOIN equipos e ON p.id_equipo = e.id_equipo
      WHERE p.estado = 'ACTIVO' AND p.fecha_devolucion_estimada <= ?
      ORDER BY p.fecha_devolucion_estimada ASC
    `, [ahoraStr, umbralStr]);
    res.json({
      alertas: rows,
      total: rows.length,
      vencidos: rows.filter(r => Number(r.minutos_restantes) < 0).length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Elimina un préstamo y su devolución asociada, liberando el equipo si
 * no tiene otros préstamos activos. Todo ocurre en una transacción.
 * @param {import('express').Request} req Parámetro :id del préstamo.
 * @param {import('express').Response} res Confirmación o error 404/500.
 * @returns {Promise<void>}
 */
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await db;
    const [prestamos] = await conn.query(
      `SELECT p.id_equipo, p.codigo_prestamo, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
         e.nombre AS equipo
       FROM prestamos p
       JOIN alumnos a ON p.id_alumno = a.id_alumno
       JOIN equipos e ON p.id_equipo = e.id_equipo
       WHERE p.id_prestamo = ?`, [id]
    );
    if (prestamos.length === 0) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // Borrado en cascada manual: primero la devolución por la clave foránea.
      await tx.query('DELETE FROM devoluciones WHERE id_prestamo = ?', [id]);
      await tx.query('DELETE FROM prestamos WHERE id_prestamo = ?', [id]);
      // Si el equipo no tiene otros préstamos activos, lo devolvemos a Disponible
      const idEquipo = prestamos[0].id_equipo;
      const [activos] = await tx.query(
        'SELECT COUNT(*) AS c FROM prestamos WHERE id_equipo = ? AND estado = "ACTIVO" AND id_prestamo != ?',
        [idEquipo, id]
      );
      if (activos[0].c === 0) {
        await tx.query("UPDATE equipos SET estado = 'Disponible' WHERE id_equipo = ?", [idEquipo]);
      }
      await tx.commit();
      const p = prestamos[0];
      auditoria.registrar(req, {
        accion: 'ELIMINAR',
        entidad: 'prestamo',
        id_entidad: p.codigo_prestamo || id,
        detalle: `${p.equipo} → ${p.alumno_nombre} ${p.alumno_apellido} · devolución asociada eliminada`
      });
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

/**
 * Busca un préstamo ACTIVO por ID para mostrar el comprobante.
 * @param {import('express').Request} req Parámetro :id del préstamo.
 * @param {import('express').Response} res Préstamo encontrado o 404/500.
 * @returns {Promise<void>}
 */
exports.buscar = async (req, res) => {
  try {
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
