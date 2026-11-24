// Mensajes públicos para errores conocidos de MySQL, sin exponer SQL interno.
const MENSAJES_MYSQL = {
  ER_DUP_ENTRY: [409, 'El código ya está registrado'],
  ER_SIGNAL_EXCEPTION: [400, 'Operación no permitida'],
  ER_NO_REFERENCED_ROW_2: [400, 'La operación hace referencia a un registro inexistente'],
  ER_ROW_IS_REFERENCED_2: [400, 'La operación afecta registros relacionados y no se puede completar'],
  ER_DATA_TOO_LONG: [400, 'Datos inválidos'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'Datos inválidos'],
  ER_BAD_NULL_ERROR: [400, 'Datos incompletos']
};

/**
 * Middleware final de errores: registra el detalle interno y responde al cliente.
 * Los errores 5xx devuelven un mensaje genérico para no filtrar rutas, SQL ni stack;
 * los 4xx pueden exponer err.mensaje porque describen un problema de la solicitud.
 * @param {Error} err Error recibido por next(err).
 * @param {object} req Request de Express.
 * @param {object} res Response de Express.
 * @param {Function} next Siguiente middleware, requerido por Express.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status;
  let mensaje = err.mensaje;
  const mysql = MENSAJES_MYSQL[err.code];
  if (!status && mysql) {
    status = mysql[0];
    mensaje = mysql[0] === 400 && err.code === 'ER_SIGNAL_EXCEPTION'
      ? (err.sqlMessage || mysql[1])
      : mysql[1];
  }
  if (!status) status = 500;

  if (status >= 500) {
    console.error('Error:', err.stack || err.message || err);
    mensaje = 'Error interno del servidor';
  }

  res.status(status).json({ mensaje: mensaje || 'Solicitud inválida' });
}

module.exports = errorHandler;
