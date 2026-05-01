const db = require('../db');

exports.listar = (req, res) => {
  db.query('SELECT * FROM equipos ORDER BY id_equipo', (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
};

exports.crear = (req, res) => {
  const { nombre, tipo, marca, descripcion } = req.body;
  if (!nombre || !tipo || !marca) return res.status(400).json({ mensaje: 'Datos incompletos' });
  db.query('INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES (?,?,?,?)',
    [nombre, tipo, marca, descripcion||''], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ mensaje: 'Equipo creado' });
    });
};

exports.eliminar = (req, res) => {
  const id = req.params.id;

  // Eliminar en cascada: devoluciones → prestamos → equipo
  db.query(`
    DELETE dv FROM devoluciones dv
    JOIN prestamos p ON dv.id_prestamo = p.id_prestamo
    WHERE p.id_equipo = ?
  `, [id], (err) => {
    if (err) return res.status(500).json(err);

    db.query('DELETE FROM prestamos WHERE id_equipo = ?', [id], (err) => {
      if (err) return res.status(500).json(err);

      db.query('DELETE FROM equipos WHERE id_equipo = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: 'Equipo eliminado correctamente' });
      });
    });
  });
};

exports.cambiarEstado = (req, res) => {
  const { estado } = req.body;
  if (!['Disponible','Prestado','En mantenimiento'].includes(estado))
    return res.status(400).json({ mensaje: 'Estado inválido' });
  db.query('UPDATE equipos SET estado=? WHERE id_equipo=?', [estado, req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: 'Estado actualizado' });
  });
};

exports.historial = (req, res) => {
  db.query(`
    SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
      p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
      a.carrera, a.curso,
      d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
      d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
    FROM prestamos p
    JOIN alumnos a ON p.id_alumno = a.id_alumno
    LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
    WHERE p.id_equipo = ?
    ORDER BY p.fecha_prestamo DESC
  `, [req.params.id], (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
};