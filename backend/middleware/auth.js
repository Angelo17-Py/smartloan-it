const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('ADVERTENCIA: JWT_SECRET no está definido. Define JWT_SECRET en .env para producción.');
  process.exit(1);
}
const SECRET = process.env.JWT_SECRET;

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_encargado, codigo: usuario.codigo, rol: usuario.rol || 'lectura' },
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
    const decoded = jwt.verify(token, SECRET);
    if (!decoded.id || !decoded.codigo) {
      return res.status(401).json({ mensaje: 'Token inválido: payload corrupto' });
    }
    req.encargado = decoded;
    next();
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

module.exports = { generarToken, verificarToken };
