const db = require('../db');
const { s } = require('./sanitize');

/**
 * Registra una acción en la auditoría sin bloquear la operación principal.
 * El INSERT se lanza en segundo plano; si falla, solo se informa por consola
 * para que un problema de auditoría no haga fallar el flujo de negocio.
 * @param {object} req Request de Express; aporta el encargado y la IP.
 * @param {object} datos Acción a registrar: accion, entidad, id_entidad y detalle.
 * @returns {void}
 */
function registrar(req, datos) {
  try {
    const enc = (req && req.encargado) || {};
    // Se recortan los campos a la longitud de sus columnas para evitar errores de INSERT.
    const accion = s(datos.accion, 20) || 'ACCION';
    const entidad = s(datos.entidad, 30) || 'sistema';
    const idEntidad = datos.id_entidad !== undefined && datos.id_entidad !== null
      ? s(String(datos.id_entidad), 40)
      : null;
    const detalle = s(datos.detalle, 500) || null;
    // Respaldo para proxies que no configuran trust proxy; la columna admite IPv6 (45 caracteres).
    const ip = s((req && (req.ip || (req.headers && req.headers['x-forwarded-for']))) || '', 45) || null;
    db.query(
      `INSERT INTO auditoria (id_encargado, codigo_encargado, accion, entidad, id_entidad, detalle, ip)
       VALUES (?,?,?,?,?,?,?)`,
      [enc.id || null, enc.codigo || null, accion, entidad, idEntidad, detalle, ip]
    ).catch(function (err) {
      console.error('No se pudo registrar la auditoria:', err.message);
    });
  } catch (err) {
    console.error('No se pudo registrar la auditoria:', err.message);
  }
}

module.exports = { registrar };
