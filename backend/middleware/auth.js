// Autenticación mediante JSON Web Tokens (JWT)
// Se encarga de generar tokens al iniciar sesión y verificarlos en rutas protegidas
const jwt = require('jsonwebtoken');

// Si no hay clave secreta en las variables de entorno, no podemos arrancar
if (!process.env.JWT_SECRET) {
  console.error('ADVERTENCIA: JWT_SECRET no está definido. Define JWT_SECRET en .env para producción.');
  process.exit(1);
}
const SECRET = process.env.JWT_SECRET;

// Genera un token JWT con los datos del encargado (id, código y rol)
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_encargado, codigo: usuario.codigo, rol: usuario.rol || 'lectura' },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' } // El token expira en 12 horas por defecto
  );
}

// Middleware que verifica que el token sea válido antes de dejar pasar la solicitud
function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token requerido' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    // Validación extra: el payload debe tener id y código
    if (!decoded.id || !decoded.codigo) {
      return res.status(401).json({ mensaje: 'Token inválido: payload corrupto' });
    }
    // Guardamos los datos del encargado en la solicitud para usarlos después
    req.encargado = decoded;
    next();
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

module.exports = { generarToken, verificarToken };
