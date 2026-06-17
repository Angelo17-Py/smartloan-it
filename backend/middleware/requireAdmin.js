function requireAdmin(req, res, next) {
  if (!req.encargado || req.encargado.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
}

module.exports = requireAdmin;
