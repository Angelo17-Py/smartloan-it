const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-inseguro';

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_encargado, codigo: usuario.codigo },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token requerido' });
  }
  try {
    const token = header.split(' ')[1];
    req.encargado = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

module.exports = { generarToken, verificarToken };
