const db = require('../db');
const MULTA = 10000;

exports.crear = (req, res) => {
  const { id_prestamo, estado_equipo, tiene_dano, tipo_dano,
          observacion_dano, monto_dano, observacion } = req.body;
  if (!id_prestamo || !estado_equipo) return res.status(400).json({ mensaje: 'Datos incompletos' });

  db.query('SELECT * FROM prestamos WHERE id_prestamo=? AND estado="ACTIVO"', [id_prestamo], (err, r) => {
    if (err) return res.status(500).json(err);
    if (r.length === 0) return res.status(404).json({ mensaje: 'Préstamo no encontrado o ya devuelto' });

    const ahora = new Date();
    const venc  = new Date(r[0].fecha_devolucion_estimada);
    const dias  = ahora > venc ? Math.ceil((ahora - venc) / (1000*60*60*24)) : 0;
    const multa = dias * MULTA;
    const dano  = tiene_dano ? (parseFloat(monto_dano)||0) : 0;
    const total = multa + dano;
    const fmt   = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' }).replace('T',' ').slice(0,19);

    db.query(
      `INSERT INTO devoluciones (id_prestamo,fecha_devolucion,estado_equipo,tiene_dano,
       tipo_dano,observacion_dano,monto_dano,dias_retraso,monto_multa,total_cobro,observacion)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id_prestamo, fmt(ahora), estado_equipo, tiene_dano?1:0,
       tipo_dano||null, observacion_dano||null, dano, dias, multa, total, observacion||null],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ mensaje:'Devolución registrada', dias_retraso:dias, monto_multa:multa, monto_dano:dano, total_cobro:total });
      }
    );
  });
};

exports.listar = (req, res) => {
  db.query(`
    SELECT d.*, p.fecha_prestamo, p.fecha_devolucion_estimada,
      e.nombre AS equipo, e.tipo, e.marca,
      a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso
    FROM devoluciones d
    JOIN prestamos p ON d.id_prestamo = p.id_prestamo
    JOIN equipos e   ON p.id_equipo   = e.id_equipo
    JOIN alumnos a   ON p.id_alumno   = a.id_alumno
    ORDER BY d.fecha_devolucion DESC
  `, (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
};