const db = require('../db');

exports.crear = (req, res) => {
  const { nombre, apellido, cedula, rol } = req.body;

  db.query(
    'INSERT INTO usuarios (nombre, apellido, cedula, rol) VALUES (?, ?, ?, ?)',
    [nombre, apellido, cedula, rol],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ mensaje: 'Usuario creado' });
    }
  );
};

exports.listar = (req, res) => {
  db.query('SELECT * FROM usuarios', (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.login = (req, res) => {
  const { cedula } = req.body;

  db.query(
    'SELECT * FROM usuarios WHERE cedula = ?',
    [cedula],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      res.json(result[0]);
    }
  );
};