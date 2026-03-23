const db = require('../db');

exports.crear = (req, res) => {
  const { id_usuario, id_equipo, fecha_devolucion_estimada } = req.body;

  const fecha = new Date();

  db.query(
    `INSERT INTO prestamos 
     (id_usuario, id_equipo, fecha_prestamo, fecha_devolucion_estimada)
     VALUES (?, ?, ?, ?)`,
    [id_usuario, id_equipo, fecha, fecha_devolucion_estimada],
    (err) => {

      if (err) {
        if (err.sqlMessage.includes('prestado')) {
          return res.status(400).json({ mensaje: 'Equipo ya prestado' });
        }
        return res.status(500).json(err);
      }

      res.json({ mensaje: 'Préstamo registrado' });
    }
  );
};

exports.listar = (req, res) => {
  db.query(`
    SELECT p.*, e.nombre AS equipo
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};