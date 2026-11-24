// Ejecuta una operación dentro de una transacción y garantiza rollback y liberación.
const db = require('../db');

/**
 * Abre una conexión, ejecuta el callback dentro de una transacción y confirma.
 * Si el callback lanza un error, revierte y lo propaga al manejador global.
 * @param {Function} fn Callback que recibe la conexión transaccional.
 * @returns {Promise<*>} Resultado devuelto por el callback.
 */
async function withTransaction(fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    try { await conn.rollback(); } catch (rollbackErr) { /* la transacción ya pudo haberse cerrado */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { withTransaction };
