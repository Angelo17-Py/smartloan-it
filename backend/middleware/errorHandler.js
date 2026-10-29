// Middleware global de errores: registra el detalle interno y devuelve un mensaje seguro
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  console.error('Error:', err.stack || err.message || err);
  const mensaje = status >= 500
    ? 'Error interno del servidor'
    : (err.mensaje || 'Solicitud inválida');
  res.status(status).json({ mensaje });
}

module.exports = errorHandler;
