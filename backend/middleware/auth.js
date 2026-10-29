// Autenticación mediante JSON Web Tokens (JWT)
// Se encarga de generar tokens al iniciar sesión y verificarlos en rutas protegidas
const jwt = require('jsonwebtoken');

// La clave JWT debe existir y tener longitud suficiente para firmar tokens seguros
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32 || SECRET === 'coloca_un_secret_unico_aqui') {
  console.error('JWT_SECRET inválido o demasiado corto. Definí un secreto único de al menos 32 caracteres en .env.');
  process.exit(1);
}

// Genera un token JWT con la identidad y la versión de sesión del encargado
function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id_encargado,
      codigo: usuario.codigo,
      rol: usuario.rol || 'lectura',
      v: Number(usuario.token_version) || 0
    },
    SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
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

// Consulta el estado actual del usuario; se carga de forma diferida para no
// abrir conexiones a la base de datos en las pruebas unitarias.
async function buscarUsuarioActual(id) {
  const db = require('../db');
  const conn = await db;
  const [rows] = await conn.query(
    'SELECT id_encargado, codigo, rol, estado, token_version FROM encargados WHERE id_encargado = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

// Crea el middleware con una función de búsqueda inyectable (útil para pruebas)
function crearVerificador(buscarUsuario) {
  return async function verificarToken(req, res, next) {
    const header = req.headers.authorization;
    const token = (header && header.startsWith('Bearer '))
      ? header.split(' ')[1]
      : leerCookie(req, 'sl_token');
    if (!token) {
      return res.status(401).json({ mensaje: 'Token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }

    // Validación extra: el payload debe tener id y código
    if (!decoded.id || !decoded.codigo) {
      return res.status(401).json({ mensaje: 'Token inválido: payload corrupto' });
    }

    let usuario;
    try {
      usuario = await buscarUsuario(decoded.id);
    } catch (err) {
      console.error('Error al verificar el estado del usuario:', err);
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    if (!usuario || Number(usuario.estado) !== 1) {
      return res.status(401).json({ mensaje: 'Sesión no válida o usuario desactivado' });
    }

    const versionToken = Number(decoded.v || 0);
    const versionActual = Number(usuario.token_version || 0);
    if (versionToken !== versionActual) {
      return res.status(401).json({ mensaje: 'Sesión expirada. Inicia sesión nuevamente.' });
    }

    // Usamos siempre el rol actual de la base de datos, no el del token
    req.encargado = {
      id: usuario.id_encargado,
      codigo: usuario.codigo,
      rol: usuario.rol
    };
    next();
  };
}

const verificarToken = crearVerificador(buscarUsuarioActual);

module.exports = { generarToken, verificarToken, crearVerificador };
