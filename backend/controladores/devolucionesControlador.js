const db = require('../db');

exports.crear = async (req, res) => {
  try {
    const { id_prestamo, estado_equipo, tiene_dano, tipo_dano,
            observacion_dano, monto_dano, observacion } = req.body;
    const estadoEqMap = {1:'Excelente', 2:'Bueno', 3:'Dañado'};
    const estadoEq = estadoEqMap[estado_equipo];
    if (!id_prestamo || !estadoEq) {
      return res.status(400).json({ mensaje: 'Datos incompletos o estado inválido' });
    }
    const conn = await db;

    const [prestamos] = await conn.query(
      'SELECT * FROM prestamos WHERE id_prestamo=? AND estado="ACTIVO"', [id_prestamo]
    );
    if (prestamos.length === 0) {
      return res.status(404).json({ mensaje: 'Prestamo no encontrado o ya devuelto' });
    }

    let MULTA = prestamos[0].multa_base != null ? parseFloat(prestamos[0].multa_base) : null;
    if (MULTA == null || isNaN(MULTA)) {
      const [cfg] = await conn.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
      MULTA = !cfg.length ? 10000 : (parseFloat(cfg[0].valor) || 10000);
    }
    const ahora = new Date();
    const venc = new Date(prestamos[0].fecha_devolucion_estimada);
    const dias = ahora > venc ? Math.ceil((ahora - venc) / (1000 * 60 * 60 * 24)) : 0;
    const multa = dias * MULTA;
    const dano = tiene_dano ? (parseFloat(monto_dano) || 0) : 0;
    const total = multa + dano;
    const fmt = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' }).replace('T', ' ').slice(0, 19);

    await conn.query(
      `INSERT INTO devoluciones (id_prestamo,fecha_devolucion,estado_equipo,tiene_dano,
       tipo_dano,observacion_dano,monto_dano,dias_retraso,monto_multa,total_cobro,observacion)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id_prestamo, fmt(ahora), estadoEq, tiene_dano ? 1 : 0,
       tipo_dano || null, observacion_dano || null, dano, dias, multa, total, observacion || null]
    );
    res.json({ mensaje: 'Devolucion registrada', dias_retraso: dias, monto_multa: multa, monto_dano: dano, total_cobro: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT d.*, p.fecha_prestamo, p.fecha_devolucion_estimada,
        e.nombre AS equipo, e.tipo, e.marca,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso
      FROM devoluciones d
      JOIN prestamos p ON d.id_prestamo = p.id_prestamo
      JOIN equipos e   ON p.id_equipo   = e.id_equipo
      JOIN alumnos a   ON p.id_alumno   = a.id_alumno
      ORDER BY d.fecha_devolucion DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
