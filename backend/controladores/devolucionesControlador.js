const db = require('../db');

exports.crear = (req, res) => {
  const { id_prestamo, estado_equipo } = req.body;
  const fecha = new Date();

  // 1. Registrar devolución
  db.query(
    `INSERT INTO devoluciones 
     (id_prestamo, fecha_devolucion, estado_equipo)
     VALUES (?, ?, ?)`,
    [id_prestamo, fecha, estado_equipo],
    (err) => {
      if (err) return res.status(500).json(err);

      // 2. Obtener id_equipo desde préstamo
      db.query(
        'SELECT id_equipo FROM prestamos WHERE id_prestamo = ?',
        [id_prestamo],
        (err, result) => {
          if (err) return res.status(500).json(err);
          if (result.length === 0) {
            return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
          }

          const id_equipo = result[0].id_equipo;

          // 3. Marcar equipo como disponible
          db.query(
            "UPDATE equipos SET estado = 'Disponible' WHERE id_equipo = ?",
            [id_equipo],
            (err) => {
              if (err) return res.status(500).json(err);

              res.json({ mensaje: 'Devolución registrada correctamente' });
            }
          );
        }
      );
    }
  );
};