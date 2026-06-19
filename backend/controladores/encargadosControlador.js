const db = require('../db');
const bcrypt = require('bcryptjs');
const { generarToken } = require('../middleware/auth');

// Inicio de sesión: verifica código y contraseña, devuelve token JWT
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
    const { password: _, ...datos } = encargado;
    res.json({ token, usuario: datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Lista todos los encargados activos (sin contraseña)
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(
      'SELECT id_encargado,codigo,nombre,apellido,cargo FROM encargados WHERE estado=1'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
