// Controlador de encargados: autenticación, sesión y administración de usuarios.
const db = require('../db');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../middleware/auth');
const { s } = require('../utils/sanitize');
const { opcionesCookieToken } = require('../utils/cookies');
const { crearLogout } = require('../utils/sesion');
const auditoria = require('../utils/auditoria');

/**
 * Inicia sesión verificando código y contraseña, y devuelve un JWT.
 * Soporta contraseñas bcrypt y migra a hash las antiguas en texto plano.
 * @param {import('express').Request} req Body: codigo, password.
 * @param {import('express').Response} res Token y datos del usuario; 400/401/500.
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
  try {
    const { codigo, password } = req.body;
    if (!codigo || !password) {
      return res.status(400).json({ mensaje: 'Código y contraseña requeridos' });
    }
    const conn = await db;
    const [rows] = await conn.query(
      'SELECT * FROM encargados WHERE codigo = ? AND estado = 1',
      [codigo.trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ mensaje: 'Código o contraseña incorrectos' });
    }
    const encargado = rows[0];
    let passwordValida = false;
    // Si la contraseña está hasheada con bcrypt, comparamos con bcrypt
    if (encargado.password && encargado.password.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, encargado.password);
    } else {
      // Si todavía está en texto plano, comparamos directamente y la hasheamos
      passwordValida = (password === encargado.password);
      if (passwordValida) {
        const hash = await bcrypt.hash(encargado.password, 10);
        await conn.query('UPDATE encargados SET password = ? WHERE id_encargado = ?', [hash, encargado.id_encargado]);
      }
    }
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Código o contraseña incorrectos' });
    }
    const token = generarToken(encargado);
    // La respuesta incluye el token de sesión: no debe almacenarse en caché.
    res.set('Cache-Control', 'no-store');
    // Cookie httpOnly de 12 horas (vigencia por defecto del JWT).
    res.cookie('sl_token', token, Object.assign({}, opcionesCookieToken(), {
      maxAge: 12 * 60 * 60 * 1000
    }));
    req.encargado = { id: encargado.id_encargado, codigo: encargado.codigo };
    // Se audita el acceso sin registrar la contraseña.
    auditoria.registrar(req, {
      accion: 'LOGIN',
      entidad: 'sesion',
      id_entidad: encargado.codigo,
      detalle: `${encargado.nombre} ${encargado.apellido} (${encargado.rol || 'admin'})`
    });
    // Se excluyen password y token_version de la respuesta.
    const { password: _, token_version: __, ...datos } = encargado;
    res.json({ token, usuario: datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Cierra la sesión actual e invalida todos los tokens emitidos al usuario,
 * incrementando su token_version. Reutiliza la fábrica crearLogout.
 * @type {import('express').RequestHandler}
 */
exports.logout = crearLogout(async function () { return db; });

/**
 * Lista todos los encargados, activos e inactivos, sin exponer la contraseña.
 * @param {import('express').Request} req Petición HTTP autenticada como admin.
 * @param {import('express').Response} res Arreglo de usuarios o error 500.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(
      `SELECT id_encargado, codigo, nombre, apellido, cargo, rol, estado, fecha_registro
       FROM encargados
       ORDER BY estado DESC, codigo`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Crea un usuario del sistema con contraseña hasheada.
 * Valida el formato del código y la longitud mínima de la contraseña.
 * @param {import('express').Request} req Body: codigo, nombre, apellido, cargo, rol, password.
 * @param {import('express').Response} res Usuario creado o error 400/409/500.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  try {
    const codigo = s(req.body.codigo, 10);
    const nombre = s(req.body.nombre, 100);
    const apellido = s(req.body.apellido, 100);
    const cargo = s(req.body.cargo, 100) || 'Encargado de Recursos Tecnológicos';
    // Solo se aceptan los dos roles definidos; cualquier otro valor cae en lectura.
    const rol = req.body.rol === 'admin' ? 'admin' : 'lectura';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!codigo || !nombre || !apellido || !password) {
      return res.status(400).json({ mensaje: 'Código, nombre, apellido y contraseña son obligatorios' });
    }
    if (!/^[A-Za-z0-9_-]{1,10}$/.test(codigo)) {
      return res.status(400).json({ mensaje: 'El código debe tener hasta 10 caracteres (letras, números, guion o guion bajo)' });
    }
    if (password.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    // El hash con costo 10 evita guardar la contraseña en texto plano.
    const hash = await bcrypt.hash(password, 10);
    const conn = await db;
    const [result] = await conn.query(
      'INSERT INTO encargados (codigo, password, nombre, apellido, cargo, rol) VALUES (?,?,?,?,?,?)',
      [codigo, hash, nombre, apellido, cargo, rol]
    );
    auditoria.registrar(req, {
      accion: 'CREAR',
      entidad: 'usuario',
      id_entidad: codigo,
      detalle: `${nombre} ${apellido} · ${rol === 'admin' ? 'Administrador' : 'Operador'}`
    });
    res.json({ mensaje: 'Usuario creado correctamente', id_encargado: result.insertId, codigo });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'El código ya está registrado' });
    }
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Actualiza datos, rol y, opcionalmente, la contraseña de un usuario.
 * Protege la regla de negocio de mantener al menos un administrador activo.
 * @param {import('express').Request} req Body con los datos; parámetro :id del usuario.
 * @param {import('express').Response} res Confirmación o error 400/404/409/500.
 * @returns {Promise<void>}
 */
exports.editar = async (req, res) => {
  try {
    const id = req.params.id;
    const nombre = s(req.body.nombre, 100);
    const apellido = s(req.body.apellido, 100);
    const cargo = s(req.body.cargo, 100) || 'Encargado de Recursos Tecnológicos';
    const rol = req.body.rol === 'admin' ? 'admin' : 'lectura';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!nombre || !apellido) {
      return res.status(400).json({ mensaje: 'Nombre y apellido son obligatorios' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const conn = await db;
    const [rows] = await conn.query(
      'SELECT id_encargado, codigo, nombre, apellido, cargo, rol, estado FROM encargados WHERE id_encargado = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    const actual = rows[0];
    // No permitir quedarse sin ningún administrador activo
    if (actual.rol === 'admin' && rol !== 'admin') {
      const [admins] = await conn.query(
        "SELECT COUNT(*) AS c FROM encargados WHERE rol = 'admin' AND estado = 1 AND id_encargado <> ?", [id]
      );
      if (Number(admins[0].c) === 0) {
        return res.status(400).json({ mensaje: 'Debe existir al menos un administrador activo' });
      }
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await conn.query(
        'UPDATE encargados SET nombre=?, apellido=?, cargo=?, rol=?, password=? WHERE id_encargado=?',
        [nombre, apellido, cargo, rol, hash, id]
      );
    } else {
      await conn.query(
        'UPDATE encargados SET nombre=?, apellido=?, cargo=?, rol=? WHERE id_encargado=?',
        [nombre, apellido, cargo, rol, id]
      );
    }
    // Invalidar sesiones anteriores cuando cambia la contraseña o el rol:
    // el próximo request del usuario fallará la comparación de token_version.
    if (password || actual.rol !== rol) {
      await conn.query('UPDATE encargados SET token_version = token_version + 1 WHERE id_encargado = ?', [id]);
    }
    const rolAnterior = actual.rol === 'admin' ? 'Administrador' : 'Operador';
    const rolNuevo = rol === 'admin' ? 'Administrador' : 'Operador';
    const cambios = [];
    [['Nombre', 'nombre', nombre], ['Apellido', 'apellido', apellido], ['Cargo', 'cargo', cargo]].forEach(function (par) {
      if (String(actual[par[1]] || '') !== String(par[2] || '')) {
        cambios.push(par[0] + ': "' + (actual[par[1]] || '—') + '" → "' + par[2] + '"');
      }
    });
    if (actual.rol !== rol) cambios.push('Rol: "' + rolAnterior + '" → "' + rolNuevo + '"');
    if (password) cambios.push('Contraseña actualizada');
    auditoria.registrar(req, {
      accion: 'EDITAR',
      entidad: 'usuario',
      id_entidad: actual.codigo,
      detalle: cambios.length ? cambios.join(' · ') : 'Sin cambios'
    });
    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'El código ya está registrado' });
    }
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Activa o desactiva un usuario.
 * Impide desactivar la propia cuenta o al último administrador activo,
 * y revoca sus sesiones incrementando token_version.
 * @param {import('express').Request} req Body: activo (boolean); parámetro :id.
 * @param {import('express').Response} res Confirmación o error 400/404/500.
 * @returns {Promise<void>}
 */
exports.cambiarEstado = async (req, res) => {
  try {
    const id = req.params.id;
    if (typeof req.body.activo !== 'boolean') {
      return res.status(400).json({ mensaje: 'Estado inválido' });
    }
    const activo = req.body.activo;
    if (String(id) === String(req.encargado.id) && !activo) {
      return res.status(400).json({ mensaje: 'No puedes desactivar tu propia cuenta' });
    }
    const conn = await db;
    const [rows] = await conn.query('SELECT codigo, rol, estado FROM encargados WHERE id_encargado = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    if (!activo && rows[0].rol === 'admin') {
      const [admins] = await conn.query(
        "SELECT COUNT(*) AS c FROM encargados WHERE rol = 'admin' AND estado = 1 AND id_encargado <> ?", [id]
      );
      if (Number(admins[0].c) === 0) {
        return res.status(400).json({ mensaje: 'Debe existir al menos un administrador activo' });
      }
    }
    // El incremento de token_version revoca cualquier sesión abierta del usuario.
    await conn.query(
      'UPDATE encargados SET estado = ?, token_version = token_version + 1 WHERE id_encargado = ?',
      [activo ? 1 : 0, id]
    );
    auditoria.registrar(req, {
      accion: activo ? 'ACTIVAR' : 'DESACTIVAR',
      entidad: 'usuario',
      id_entidad: rows[0].codigo,
      detalle: activo ? 'Usuario activado' : 'Usuario desactivado'
    });
    res.json({ mensaje: activo ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
