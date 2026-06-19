// Middleware global de errores: captura cualquier error no manejado y devuelve una respuesta JSON limpia
function errorHandler(err, req, res, _next) {
  console.error('Error:', err.stack || err.message || err);
  res.status(err.statusCode || err.status || 500).json({
    mensaje: err.mensaje || err.message || 'Error interno del servidor'
  });
}

module.exports = errorHandler;
