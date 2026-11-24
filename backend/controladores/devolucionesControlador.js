// Controlador de devoluciones: cálculo de multas por retraso y daños, y reversión.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');

// Formatea fechas a string MySQL (YYYY-MM-DD HH:MM:SS) en zona horaria de Paraguay.
const fmt = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' }).replace('T', ' ').slice(0, 19);

/**
 * Registra la devolución de un préstamo activo.
 * Calcula días de retraso, multa y daño, y deja que los triggers actualicen
 * el estado del préstamo y del equipo.
 * @param {import('express').Request} req Body: id_prestamo, estado_equipo, daño y observaciones.
 * @param {import('express').Response} res Totales calculados o error 400/404/500.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  try {
    const { id_prestamo, estado_equipo, tiene_dano, tipo_dano,
            observacion_dano, monto_dano, observacion } = req.body;
    // Mapeo de estados numéricos del formulario a texto
    const estadoEqMap = {1:'Excelente', 2:'Bueno', 3:'Dañado'};
    const estadoEq = estadoEqMap[estado_equipo];
    if (!id_prestamo || !estadoEq) {
      return res.status(400).json({ mensaje: 'Datos incompletos o estado inválido' });
    }
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // Bloqueamos el préstamo para evitar devoluciones duplicadas
      const [prestamos] = await tx.query(
        'SELECT * FROM prestamos WHERE id_prestamo=? AND estado="ACTIVO" AND anulado=0 FOR UPDATE', [id_prestamo]
      );
      if (prestamos.length === 0) {
        await tx.rollback();
        return res.status(404).json({ mensaje: 'Préstamo no encontrado o ya devuelto' });
      }

      // Se usa la multa fijada al crear el préstamo para no alterar cálculos
      // históricos si luego cambia la configuración; si falta, se usa la actual.
      let MULTA = prestamos[0].multa_base != null ? parseFloat(prestamos[0].multa_base) : null;
      if (MULTA == null || isNaN(MULTA)) {
        const [cfg] = await tx.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
        MULTA = cfg.length ? parseFloat(cfg[0].valor) : 10000;
        if (MULTA == null || isNaN(MULTA) || MULTA < 0) MULTA = 10000;
      }
      const ahora = new Date();
      const venc = new Date(prestamos[0].fecha_devolucion_estimada);
      // Días de retraso (si corresponde)
      const dias = ahora > venc ? Math.ceil((ahora - venc) / (1000 * 60 * 60 * 24)) : 0;
      const multa = dias * MULTA;
      const dano = tiene_dano ? (parseFloat(monto_dano) || 0) : 0;
      const total = multa + dano;
      // El trigger actualizar_estado_devolucion marca el préstamo como DEVUELTO
      // y deja el equipo Disponible o En mantenimiento según tenga_dano.
      const [result] = await tx.query(
        `INSERT INTO devoluciones (id_prestamo,id_encargado,fecha_devolucion,estado_equipo,tiene_dano,
         tipo_dano,observacion_dano,monto_dano,dias_retraso,monto_multa,total_cobro,observacion)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id_prestamo, req.encargado.id || null, fmt(ahora), estadoEq, tiene_dano ? 1 : 0,
         tipo_dano || null, observacion_dano || null, dano, dias, multa, total, observacion || null]
      );
      await tx.commit();
      auditoria.registrar(req, {
        accion: 'CREAR',
        entidad: 'devolucion',
        id_entidad: result.insertId,
        detalle: `Préstamo #${id_prestamo} · ${dias} día(s) de retraso · multa Gs. ${multa} · daño Gs. ${dano}`
      });
      res.json({ mensaje: 'Devolucion registrada', id_devolucion: result.insertId, dias_retraso: dias, monto_multa: multa, monto_dano: dano, total_cobro: total, fecha_devolucion: fmt(ahora) });
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
 * Anula lógicamente una devolución y revierte sus efectos: el préstamo vuelve
 * a ACTIVO y el equipo vuelve a figurar como prestado.
 * El registro se conserva para mantener la trazabilidad.
 * @param {import('express').Request} req Body: motivo; parámetro :id de la devolución.
 * @param {import('express').Response} res Confirmación o error 400/404/500.
 * @returns {Promise<void>}
 */
exports.anular = async (req, res) => {
  const id = req.params.id;
  const motivo = s(req.body && req.body.motivo, 300);
  if (motivo.length < 5) {
    return res.status(400).json({ mensaje: 'Indicá un motivo de al menos 5 caracteres' });
  }
  const tx = await db.getConnection();
  try {
    await tx.beginTransaction();
    const [devoluciones] = await tx.query(
      `SELECT d.id_prestamo, d.anulado, p.codigo_prestamo, p.id_equipo, p.anulado AS prestamo_anulado
       FROM devoluciones d
       JOIN prestamos p ON d.id_prestamo = p.id_prestamo
       WHERE d.id_devolucion = ? FOR UPDATE`, [id]
    );
    if (devoluciones.length === 0) {
      await tx.rollback();
      return res.status(404).json({ mensaje: 'Devolución no encontrada' });
    }
    const d = devoluciones[0];
    if (Number(d.anulado) === 1) {
      await tx.rollback();
      return res.status(400).json({ mensaje: 'La devolución ya está anulada' });
    }
    if (Number(d.prestamo_anulado) === 1) {
      await tx.rollback();
      return res.status(400).json({ mensaje: 'El préstamo asociado está anulado' });
    }
    await tx.query(
      'UPDATE devoluciones SET anulado = 1, motivo_anulacion = ?, fecha_anulacion = ? WHERE id_devolucion = ?',
      [motivo, fmt(new Date()), id]
    );
    // El préstamo vuelve a estar activo, por lo que el equipo vuelve a figurar prestado.
    await tx.query("UPDATE prestamos SET estado = 'ACTIVO' WHERE id_prestamo = ?", [d.id_prestamo]);
    await tx.query("UPDATE equipos SET estado = 'Prestado' WHERE id_equipo = ?", [d.id_equipo]);
    await tx.commit();
    auditoria.registrar(req, {
      accion: 'ANULAR',
      entidad: 'devolucion',
      id_entidad: id,
      detalle: `Motivo: ${motivo} · Devolución anulada · préstamo ${d.codigo_prestamo || '#' + d.id_prestamo} reactivado`
    });
    res.json({ mensaje: 'Devolución anulada correctamente. Préstamo reactivado.' });
  } catch (err) {
    try { await tx.rollback(); } catch (rollbackErr) { /* la transacción ya pudo haberse cerrado */ }
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    tx.release();
  }
};

/**
 * Lista todas las devoluciones con datos del préstamo, alumno, equipo y encargados.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de devoluciones o error 500.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    // El historial pide incluir_anulados=1; el resto del sistema solo ve las vigentes.
    const incluirAnulados = req.query.incluir_anulados === '1';
    // Se aliasean los dos encargados: quien prestó y quien recibió la devolución.
    const [rows] = await conn.query(`
      SELECT d.*, p.fecha_prestamo, p.fecha_devolucion_estimada, p.codigo_prestamo,
        e.nombre AS equipo, e.tipo, e.marca,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso, a.turno,
        enc_p.nombre AS enc_prestamo_nombre, enc_p.apellido AS enc_prestamo_apellido,
        enc_d.nombre AS enc_devolucion_nombre, enc_d.apellido AS enc_devolucion_apellido
      FROM devoluciones d
      JOIN prestamos p ON d.id_prestamo = p.id_prestamo
      JOIN equipos e   ON p.id_equipo   = e.id_equipo
      JOIN alumnos a   ON p.id_alumno   = a.id_alumno
      LEFT JOIN encargados enc_p ON p.id_encargado = enc_p.id_encargado
      LEFT JOIN encargados enc_d ON d.id_encargado = enc_d.id_encargado
      ${incluirAnulados ? '' : 'WHERE d.anulado = 0'}
      ORDER BY d.fecha_devolucion DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
