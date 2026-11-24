/**
 * Middleware final de errores: registra el detalle interno y responde al cliente.
 * Los errores 5xx devuelven un mensaje genérico para no filtrar rutas, SQL ni stack;
 * los 4xx pueden exponer err.mensaje porque describen un problema de la solicitud.
 * @param {Error} err Error recibido por next(err).
 * @param {object} req Request de Express.
 * @param {object} res Response de Express.
 * @param {Function} _next Requerido por Express aunque no se use.
 */
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  console.error('Error:', err.stack || err.message || err);
  const mensaje = status >= 500
    ? 'Error interno del servidor'
    : (err.mensaje || 'Solicitud inválida');
  res.status(status).json({ mensaje });
}

module.exports = errorHandler;
