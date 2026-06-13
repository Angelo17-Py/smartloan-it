function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message || err);
  res.status(err.status || 500).json({
    mensaje: err.mensaje || err.message || 'Error interno del servidor'
  });
}

module.exports = errorHandler;
