/**
 * Restringe el acceso a usuarios con rol `admin`.
 * Debe montarse después de verificarToken, que es quien carga req.encargado
 * con el rol vigente leído de la base de datos.
 * @param {object} req Request de Express.
 * @param {object} res Response de Express.
 * @param {Function} next Continuación del pipeline.
 * @returns {object|void} Respuesta 403 si no es administrador.
 */
function requireAdmin(req, res, next) {
  if (!req.encargado || req.encargado.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
}

module.exports = requireAdmin;
