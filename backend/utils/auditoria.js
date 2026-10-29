const db = require('../db');
const { s } = require('./sanitize');

// Registra una acción en la auditoría sin bloquear la operación principal
function registrar(req, datos) {
  try {
    const enc = (req && req.encargado) || {};
    const accion = s(datos.accion, 20) || 'ACCION';
    const entidad = s(datos.entidad, 30) || 'sistema';
    const idEntidad = datos.id_entidad !== undefined && datos.id_entidad !== null
      ? s(String(datos.id_entidad), 40)
      : null;
    const detalle = s(datos.detalle, 500) || null;
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
