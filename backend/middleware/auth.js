// Autenticación mediante JSON Web Tokens (JWT)
// Se encarga de generar tokens al iniciar sesión y verificarlos en rutas protegidas
const jwt = require('jsonwebtoken');

// La clave JWT debe existir y tener longitud suficiente para firmar tokens seguros
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32 || SECRET === 'coloca_un_secret_unico_aqui') {
  console.error('JWT_SECRET inválido o demasiado corto. Definí un secreto único de al menos 32 caracteres en .env.');
  process.exit(1);
}

// Genera un token JWT con los datos del encargado (id, código y rol)
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_encargado, codigo: usuario.codigo, rol: usuario.rol || 'lectura' },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' } // El token expira en 12 horas por defecto
  );
}

function leerCookie(req, nombre) {
  const raw = req.headers.cookie || '';
  const partes = raw.split(';');
  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i].trim();
    if (parte.indexOf(nombre + '=') === 0) {
      return decodeURIComponent(parte.slice(nombre.length + 1));
    }
  }
  return null;
}

// Middleware que verifica que el token sea válido antes de dejar pasar la solicitud
function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  const token = (header && header.startsWith('Bearer '))
    ? header.split(' ')[1]
    : leerCookie(req, 'sl_token');
  if (!token) {
    return res.status(401).json({ mensaje: 'Token requerido' });
  }
  try {
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
