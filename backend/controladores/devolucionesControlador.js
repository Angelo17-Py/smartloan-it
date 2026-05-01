const db = require('../db');

const MULTA_POR_DIA = 10000;

exports.crear = (req, res) => {
  const { id_prestamo, estado_equipo, tiene_dano, tipo_dano,
          observacion_dano, monto_dano, observacion } = req.body;

  if (!id_prestamo || !estado_equipo)
    return res.status(400).json({ mensaje: 'Datos incompletos' });

  db.query('SELECT * FROM prestamos WHERE id_prestamo = ? AND estado = "ACTIVO"',
    [id_prestamo], (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.status(404).json({ mensaje: 'Préstamo no encontrado o ya devuelto' });

      const prestamo = result[0];
      const ahora = new Date();
      const vencimiento = new Date(prestamo.fecha_devolucion_estimada);

      let diasRetraso = 0, montoMulta = 0;
      if (ahora > vencimiento) {
        diasRetraso = Math.ceil((ahora - vencimiento) / (1000 * 60 * 60 * 24));
        montoMulta  = diasRetraso * MULTA_POR_DIA;
      }

      const danoFinal      = tiene_dano ? 1 : 0;
      const montoDanoFinal = tiene_dano ? (parseFloat(monto_dano) || 0) : 0;
      const totalCobro     = montoMulta + montoDanoFinal;

      db.query(
        `INSERT INTO devoluciones
         (id_prestamo, fecha_devolucion, estado_equipo, tiene_dano,
          tipo_dano, observacion_dano, monto_dano,
          dias_retraso, monto_multa, total_cobro, observacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_prestamo, ahora, estado_equipo, danoFinal,
         tipo_dano || null, observacion_dano || null, montoDanoFinal,
         diasRetraso, montoMulta, totalCobro, observacion || null],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({
            mensaje: 'Devolución registrada correctamente',
            dias_retraso: diasRetraso,
            monto_multa:  montoMulta,
            monto_dano:   montoDanoFinal,
            total_cobro:  totalCobro
          });
        }
      );
    }
  );
};

exports.listar = (req, res) => {
  db.query(`
    SELECT d.*,
      p.fecha_prestamo, p.fecha_devolucion_estimada,
      e.nombre AS equipo, e.tipo, e.marca,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso
    FROM devoluciones d
    JOIN prestamos p    ON d.id_prestamo = p.id_prestamo
    JOIN equipos e      ON p.id_equipo   = e.id_equipo
    JOIN alumnos a      ON p.id_alumno   = a.id_alumno
    ORDER BY d.fecha_devolucion DESC
  `, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
