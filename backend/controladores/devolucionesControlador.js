// Controlador de devoluciones: cálculo de multas por retraso y daños, y anulación.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');
const httpError = require('../utils/httpError');
const { withTransaction } = require('../utils/transaccion');

// Formatea fechas a string MySQL (YYYY-MM-DD HH:MM:SS) en zona horaria de Paraguay.
const fmt = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' }).replace('T', ' ').slice(0, 19);

// Estados y métodos admitidos para el cobro de la devolución.
const ESTADOS_PAGO = ['Pendiente', 'Pagado', 'Parcial', 'Condonado'];
const METODOS_PAGO = ['Efectivo', 'Transferencia'];

// Convierte un monto a número positivo con dos decimales; valores inválidos dan 0.
const montoValido = (v) => {
  if (typeof v === 'string') v = v.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

/**
 * Registra la devolución de un préstamo activo y calcula retraso y daños.
 * @param {import('express').Request} req Body: id_prestamo, estado_equipo, daño y observaciones.
 * @param {import('express').Response} res Totales calculados o error de validación.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  const { id_prestamo, estado_equipo, tiene_dano, tipo_dano,
          observacion_dano, monto_dano, observacion,
          accesorios, monto_accesorios, danos, pago } = req.body;
  const estadoEqMap = { 1: 'Excelente', 2: 'Bueno', 3: 'Dañado' };
  const estadoEq = estadoEqMap[estado_equipo];
  if (!id_prestamo || !estadoEq) {
    return res.status(400).json({ mensaje: 'Datos incompletos o estado inválido' });
  }

  // Acepta el arreglo nuevo de daños o los campos simples de versiones anteriores.
  const listaDanos = [];
  if (Array.isArray(danos) && danos.length) {
    for (const d of danos.slice(0, 10)) {
      const tipoD = s(d && d.tipo, 200);
      const descD = s(d && d.descripcion, 300);
      const montoD = montoValido(d && d.monto);
      if (!tipoD && !descD && !montoD) continue;
      if (!tipoD || !descD) return res.status(400).json({ mensaje: 'Completá el tipo y la descripción de cada daño' });
      listaDanos.push({ tipo: tipoD, descripcion: descD, monto: montoD });
    }
  } else if (tiene_dano) {
    const tipoD = s(tipo_dano, 200);
    const descD = s(observacion_dano, 300);
    if (!tipoD || !descD) return res.status(400).json({ mensaje: 'Completá el tipo y la descripción del daño' });
    listaDanos.push({ tipo: tipoD, descripcion: descD, monto: montoValido(monto_dano) });
  }

  // Normaliza accesorios devueltos y faltantes enviados por el formulario.
  const accDevueltos = [], accFaltantes = [];
  if (Array.isArray(accesorios)) {
    accesorios.slice(0, 20).forEach((a) => {
      const nombre = s(a && a.nombre, 100);
      if (!nombre) return;
      if (a.devuelto) accDevueltos.push(nombre);
      else accFaltantes.push(nombre);
    });
  }

  const resultado = await withTransaction(async (tx) => {
    const [prestamos] = await tx.query(
      'SELECT * FROM prestamos WHERE id_prestamo=? AND estado="ACTIVO" AND anulado=0 FOR UPDATE',
      [id_prestamo]
    );
    if (prestamos.length === 0) {
      throw httpError(404, 'Préstamo no encontrado o ya devuelto');
    }

    // Se usa la multa fijada al crear el préstamo para conservar el cálculo histórico.
    let multaBase = prestamos[0].multa_base != null ? parseFloat(prestamos[0].multa_base) : null;
    if (multaBase == null || isNaN(multaBase)) {
      const [cfg] = await tx.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
      multaBase = cfg.length ? parseFloat(cfg[0].valor) : 10000;
      if (multaBase == null || isNaN(multaBase) || multaBase < 0) multaBase = 10000;
    }

    const ahora = new Date();
    const venc = new Date(prestamos[0].fecha_devolucion_estimada);
    const dias = ahora > venc ? Math.ceil((ahora - venc) / (1000 * 60 * 60 * 24)) : 0;
    const multa = dias * multaBase;
    const totalDanos = listaDanos.reduce((acc, d) => acc + d.monto, 0);
    const montoAcc = montoValido(monto_accesorios);
    const total = multa + totalDanos + montoAcc;
    const fecha = fmt(ahora);

    // Folio de devolución consecutivo, independiente del folio del préstamo.
    const [maxDev] = await tx.query(
      'SELECT MAX(CAST(SUBSTRING(codigo_devolucion, 5) AS UNSIGNED)) AS max_num FROM devoluciones FOR UPDATE'
    );
    const codigoDevolucion = 'REC-' + String((maxDev[0].max_num || 0) + 1).padStart(3, '0');

    // Valida el estado de pago y completa los datos del cobro.
    const pagoReq = pago || {};
    let estadoPago = pagoReq.estado ? String(pagoReq.estado) : 'Pendiente';
    if (!ESTADOS_PAGO.includes(estadoPago)) throw httpError(400, 'Estado de pago inválido');
    if (total === 0) estadoPago = 'Pagado';

    let montoPagado = 0, metodoPago = null, fechaPago = null, motivoCondonacion = null;
    if (estadoPago === 'Pagado') {
      montoPagado = total;
      if (total > 0) {
        metodoPago = s(pagoReq.metodo, 30);
        if (!METODOS_PAGO.includes(metodoPago)) throw httpError(400, 'Seleccioná un método de pago válido');
        fechaPago = fecha;
      }
    } else if (estadoPago === 'Parcial') {
      montoPagado = montoValido(pagoReq.monto);
      if (montoPagado <= 0 || montoPagado >= total) {
        throw httpError(400, 'El monto parcial debe ser mayor a 0 y menor al total');
      }
      metodoPago = s(pagoReq.metodo, 30);
      if (!METODOS_PAGO.includes(metodoPago)) throw httpError(400, 'Seleccioná un método de pago válido');
      fechaPago = fecha;
    } else if (estadoPago === 'Condonado') {
      if (!req.encargado || req.encargado.rol !== 'admin') {
        throw httpError(403, 'Solo un administrador puede condonar el cobro');
      }
      motivoCondonacion = s(pagoReq.motivo, 300);
      if (motivoCondonacion.length < 5) throw httpError(400, 'Indicá el motivo de la condonación');
    }

    const tipoResumen = listaDanos.length > 1 ? 'Múltiples' : (listaDanos[0] ? listaDanos[0].tipo : null);
    const obsResumen = listaDanos.length ? s(listaDanos.map((d) => d.descripcion).join(' | '), 300) : null;
    const tieneDano = listaDanos.length > 0;

    const [result] = await tx.query(
      `INSERT INTO devoluciones (codigo_devolucion,id_prestamo,id_encargado,fecha_devolucion,estado_equipo,tiene_dano,
       tipo_dano,observacion_dano,monto_dano,dias_retraso,monto_multa,total_cobro,observacion,
       accesorios_devueltos,accesorios_faltantes,monto_accesorios,danos_detalle,
       estado_pago,monto_pagado,metodo_pago,fecha_pago,motivo_condonacion)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [codigoDevolucion, id_prestamo, req.encargado.id || null, fecha, estadoEq, tieneDano ? 1 : 0,
       tipoResumen, obsResumen, totalDanos, dias, multa, total, s(observacion, 300) || null,
       s(accDevueltos.join(', '), 300) || null, s(accFaltantes.join(', '), 300) || null, montoAcc,
       listaDanos.length ? JSON.stringify(listaDanos) : null,
       estadoPago, montoPagado, metodoPago, fechaPago, motivoCondonacion]
    );

    return {
      id: result.insertId, codigo: codigoDevolucion,
      dias, multa, dano: totalDanos, accesorios: montoAcc, total, fecha,
      estadoPago, montoPagado, metodoPago, motivoCondonacion,
      accDevueltos, accFaltantes, listaDanos
    };
  });

  auditoria.registrar(req, {
    accion: 'CREAR',
    entidad: 'devolucion',
    id_entidad: resultado.id,
    detalle: `Devolución ${resultado.codigo} · Préstamo #${id_prestamo} · ${resultado.dias} día(s) de retraso · multa Gs. ${resultado.multa} · daños Gs. ${resultado.dano} · accesorios Gs. ${resultado.accesorios} · total Gs. ${resultado.total} · pago ${resultado.estadoPago}`
  });
  res.json({
    mensaje: 'Devolucion registrada',
    id_devolucion: resultado.id,
    codigo_devolucion: resultado.codigo,
    dias_retraso: resultado.dias,
    monto_multa: resultado.multa,
    monto_dano: resultado.dano,
    monto_accesorios: resultado.accesorios,
    total_cobro: resultado.total,
    fecha_devolucion: resultado.fecha,
    estado_pago: resultado.estadoPago,
    monto_pagado: resultado.montoPagado,
    metodo_pago: resultado.metodoPago,
    motivo_condonacion: resultado.motivoCondonacion,
    accesorios_devueltos: resultado.accDevueltos,
    accesorios_faltantes: resultado.accFaltantes,
    danos: resultado.listaDanos
  });
};

/**
 * Anula lógicamente una devolución y reactiva el préstamo asociado.
 * @param {import('express').Request} req Body: motivo; parámetro :id de la devolución.
 * @param {import('express').Response} res Confirmación o error de regla de negocio.
 * @returns {Promise<void>}
 */
exports.anular = async (req, res) => {
  const id = req.params.id;
  const motivo = s(req.body && req.body.motivo, 300);
  if (motivo.length < 5) {
    return res.status(400).json({ mensaje: 'Indicá un motivo de al menos 5 caracteres' });
  }

  const devolucion = await withTransaction(async (tx) => {
    const [devoluciones] = await tx.query(
      `SELECT d.id_prestamo, d.anulado, p.codigo_prestamo, p.id_equipo, p.anulado AS prestamo_anulado
       FROM devoluciones d
       JOIN prestamos p ON d.id_prestamo = p.id_prestamo
       WHERE d.id_devolucion = ? FOR UPDATE`, [id]
    );
    if (devoluciones.length === 0) throw httpError(404, 'Devolución no encontrada');
    const d = devoluciones[0];
    if (Number(d.anulado) === 1) throw httpError(400, 'La devolución ya está anulada');
    if (Number(d.prestamo_anulado) === 1) throw httpError(400, 'El préstamo asociado está anulado');

    await tx.query(
      'UPDATE devoluciones SET anulado = 1, motivo_anulacion = ?, fecha_anulacion = ? WHERE id_devolucion = ?',
      [motivo, fmt(new Date()), id]
    );
    // El préstamo vuelve a estar activo y el equipo vuelve a figurar prestado.
    await tx.query("UPDATE prestamos SET estado = 'ACTIVO' WHERE id_prestamo = ?", [d.id_prestamo]);
    await tx.query("UPDATE equipos SET estado = 'Prestado' WHERE id_equipo = ?", [d.id_equipo]);
    return d;
  });

  auditoria.registrar(req, {
    accion: 'ANULAR',
    entidad: 'devolucion',
    id_entidad: id,
    detalle: `Motivo: ${motivo} · Devolución anulada · préstamo ${devolucion.codigo_prestamo || '#' + devolucion.id_prestamo} reactivado`
  });
  res.json({ mensaje: 'Devolución anulada correctamente. Préstamo reactivado.' });
};

/**
 * Lista devoluciones con datos del préstamo, alumno, equipo y encargados.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de devoluciones.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  const conn = await db;
  const incluirAnulados = req.query.incluir_anulados === '1';
  const [rows] = await conn.query(`
    SELECT d.*, p.fecha_prestamo, p.fecha_devolucion_estimada, p.codigo_prestamo, p.accesorios AS accesorios_prestamo, p.multa_base,
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
};
