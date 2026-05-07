/* Controlador para encargados login y listado */

const db = require('../db');

exports.login = (req, res) => {
  const { codigo, password } = req.body;
  if (!codigo || !password) return res.status(400).json({ mensaje: 'Código y contraseña requeridos' });
  db.query(
    'SELECT * FROM encargados WHERE codigo = ? AND password = ? AND estado = 1',
    [codigo.trim(), password],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(401).json({ mensaje: 'Código o contraseña incorrectos' });
      const { password: _, ...datos } = result[0];
      res.json(datos);
    }
  );
};

exports.listar = (req, res) => {
  db.query('SELECT id_encargado,codigo,nombre,apellido,cargo FROM encargados WHERE estado=1', (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
};
