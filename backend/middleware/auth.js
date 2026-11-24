// Autenticación mediante JSON Web Tokens (JWT).
// Genera tokens al iniciar sesión y los valida en cada ruta protegida,
// comprobando además que el usuario siga activo y que la sesión no haya sido revocada.
const jwt = require('jsonwebtoken');

// La clave JWT debe existir y tener longitud suficiente para firmar tokens seguros
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32 || SECRET === 'coloca_un_secret_unico_aqui') {
  console.error('JWT_SECRET inválido o demasiado corto. Definí un secreto único de al menos 32 caracteres en .env.');
  process.exit(1);
}

/**
 * Firma un JWT con la identidad del encargado y la versión de sesión.
 * La versión (`v`) permite invalidar tokens ya emitidos cuando se incrementa
 * token_version en la base de datos (por ejemplo, al cerrar sesión).
 * @param {object} usuario Fila de encargados con id_encargado, codigo, rol y token_version.
 * @returns {string} Token firmado con HS256.
 */
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

/**
 * Lee una cookie de la cabecera Cookie sin depender de middleware adicional.
 * Se usa para aceptar el token guardado en la cookie httpOnly, que JavaScript
 * del navegador no puede leer.
 * @param {object} req Request de Express.
 * @param {string} nombre Nombre de la cookie buscada.
 * @returns {string|null} Valor decodificado o null si no existe.
 */
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

/**
 * Recupera el usuario actual desde MySQL.
 * La consulta se hace en cada petición protegida para detectar bajas, cambios de rol
 * y revocaciones de sesión sin esperar a que expire el token.
 * La conexión se carga de forma diferida para no abrirla en pruebas unitarias.
 * @param {number} id Identificador del encargado.
 * @returns {Promise<object|null>} Fila del encargado o null si no existe.
 */
async function buscarUsuarioActual(id) {
  const db = require('../db');
  const conn = await db;
  const [rows] = await conn.query(
    'SELECT id_encargado, codigo, rol, estado, token_version FROM encargados WHERE id_encargado = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Crea el middleware de verificación con una función de búsqueda inyectable,
 * lo que permite sustituir la base de datos en las pruebas.
 * Acepta el token en `Authorization: Bearer` o en la cookie `sl_token`.
 * @param {Function} buscarUsuario Función que recibe el id y devuelve el usuario actual.
 * @returns {Function} Middleware de Express.
 */
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

    // La versión del token debe coincidir con la de la BD; un logout la incrementa
    // y deja inválidos todos los tokens emitidos antes.
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
