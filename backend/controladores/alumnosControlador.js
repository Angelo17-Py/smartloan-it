const db = require('../db');

exports.listar = (req, res) => {
  db.query('SELECT * FROM alumnos WHERE estado=1 ORDER BY codigo_alumno', (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
};

exports.crear = (req, res) => {
  const { nombre, apellido, carrera, curso } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Nombre y apellido requeridos' });

  db.query('SELECT MAX(CAST(SUBSTRING(codigo_alumno, 4) AS UNSIGNED)) AS max_num FROM alumnos', (err, result) => {
    if (err) return res.status(500).json(err);
    const maxNum = result[0].max_num || 0;
    const codigo_alumno = 'ALU' + String(maxNum + 1).padStart(3, '0');

    db.query(
      'INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso) VALUES (?,?,?,?,?)',
      [codigo_alumno, nombre, apellido, carrera||'', curso||''],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: 'Alumno registrado', codigo_alumno });
      }
    );
  });
};

exports.eliminar = (req, res) => {
  const id = req.params.id;

  // Borrado en cascada: devoluciones → prestamos → alumno
  db.query(`
    DELETE dv FROM devoluciones dv
    JOIN prestamos p ON dv.id_prestamo = p.id_prestamo
    WHERE p.id_alumno = ?
  `, [id], (err) => {
    if (err) return res.status(500).json(err);

    db.query('DELETE FROM prestamos WHERE id_alumno = ?', [id], (err) => {
      if (err) return res.status(500).json(err);

      db.query('DELETE FROM alumnos WHERE id_alumno = ?', [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: 'Alumno eliminado correctamente' });
      });
    });
  });
};

exports.historial = (req, res) => {
  db.query(`
    SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
      p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
      e.nombre AS equipo, e.tipo, e.marca,
      enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido,
      d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
      d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
    WHERE p.id_alumno = ?
    ORDER BY p.fecha_prestamo DESC
  `, [req.params.id], (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
};