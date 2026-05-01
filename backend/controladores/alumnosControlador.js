const db = require('../db');

// LISTAR alumnos activos
exports.listar = (req, res) => {
  db.query(
    'SELECT * FROM alumnos WHERE estado = 1 ORDER BY codigo_alumno',
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
};

// CREAR alumno con código automático ALU001
exports.crear = (req, res) => {
  const { nombre, apellido, carrera, curso, cedula } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Nombre y apellido requeridos' });

  db.query('SELECT codigo_alumno FROM alumnos ORDER BY id_alumno DESC LIMIT 1', (err, result) => {
    if (err) return res.status(500).json(err);
    let siguiente = 1;
    if (result.length > 0) {
      const num = parseInt(result[0].codigo_alumno.replace('ALU', ''));
      siguiente = num + 1;
    }
    const codigo_alumno = 'ALU' + String(siguiente).padStart(3, '0');

    db.query(
      'INSERT INTO alumnos (codigo_alumno, nombre, apellido, carrera, curso, cedula) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo_alumno, nombre, apellido, carrera || '', curso || '', cedula || ''],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje: 'Alumno registrado', codigo_alumno });
      }
    );
  });
};

// ELIMINAR alumno (desactivar)
exports.eliminar = (req, res) => {
  db.query('UPDATE alumnos SET estado = 0 WHERE id_alumno = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ mensaje: 'Alumno eliminado' });
  });
};

// BUSCAR alumno por código o nombre
exports.buscar = (req, res) => {
  const q = `%${req.query.q}%`;
  db.query(
    `SELECT * FROM alumnos WHERE estado = 1 AND
     (codigo_alumno LIKE ? OR nombre LIKE ? OR apellido LIKE ? OR cedula LIKE ?)`,
    [q, q, q, q],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
};

// HISTORIAL de préstamos de un alumno
exports.historial = (req, res) => {
  db.query(`
    SELECT
      p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
      p.estado AS estado_prestamo, p.estado_inicial_equipo,
      p.motivo, p.accesorios,
      e.nombre AS equipo, e.tipo, e.marca,
      enc.nombre AS encargado_nombre, enc.apellido AS encargado_apellido,
      d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
      d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro,
      d.tiene_dano, d.tipo_dano
    FROM prestamos p
    JOIN equipos e ON p.id_equipo = e.id_equipo
    JOIN encargados enc ON p.id_encargado = enc.id_encargado
    LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
    WHERE p.id_alumno = ?
    ORDER BY p.fecha_prestamo DESC
  `, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
