const db = require('../db');

exports.crear = (req, res) => {
  const { id_prestamo, estado_equipo } = req.body;

  const fecha = new Date();

  db.query(
    `INSERT INTO devoluciones 
     (id_prestamo, fecha_devolucion, estado_equipo)
     VALUES (?, ?, ?)`,
    [id_prestamo, fecha, estado_equipo],
    err => {
      if (err) return res.status(500).json(err);

      res.json({ mensaje: 'Devolución registrada' });
    }
  );
};