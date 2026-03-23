const db = require('../db');

exports.listar = (req, res) => {
  db.query('SELECT * FROM equipos', (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.crear = (req, res) => {
  const { nombre, tipo, marca } = req.body;

  db.query(
    'INSERT INTO equipos (nombre, tipo, marca) VALUES (?, ?, ?)',
    [nombre, tipo, marca],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ mensaje: 'Equipo creado' });
    }
  );
};

exports.eliminar = (req, res) => {
  db.query('DELETE FROM equipos WHERE id_equipo = ?', [req.params.id], err => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: 'Eliminado' });
  });
};