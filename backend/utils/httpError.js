/**
 * Crea un error con código HTTP y mensaje público controlado.
 * El manejador global usa estas propiedades para responder sin filtrar detalles internos.
 * @param {number} statusCode Código HTTP de la respuesta.
 * @param {string} mensaje Texto seguro para el cliente.
 * @returns {Error}
 */
function httpError(statusCode, mensaje) {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  err.mensaje = mensaje;
  return err;
}

module.exports = httpError;
