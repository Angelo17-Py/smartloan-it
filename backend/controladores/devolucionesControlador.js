const db = require('../db');

// Registra una nueva devolución: calcula días de retraso, multas y total a cobrar
exports.crear = async (req, res) => {
  try {
    const { id_prestamo, estado_equipo, tiene_dano, tipo_dano,
            observacion_dano, monto_dano, observacion } = req.body;
    // Mapeo de estados numéricos del formulario a texto
    const estadoEqMap = {1:'Excelente', 2:'Bueno', 3:'Dañado'};
    const estadoEq = estadoEqMap[estado_equipo];
    if (!id_prestamo || !estadoEq) {
      return res.status(400).json({ mensaje: 'Datos incompletos o estado inválido' });
    }
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // Bloqueamos el préstamo para evitar devoluciones duplicadas
      const [prestamos] = await tx.query(
        'SELECT * FROM prestamos WHERE id_prestamo=? AND estado="ACTIVO" FOR UPDATE', [id_prestamo]
      );
      if (prestamos.length === 0) {
        await tx.rollback();
        return res.status(404).json({ mensaje: 'Préstamo no encontrado o ya devuelto' });
      }

      // Calculamos la multa: primero usamos la del préstamo, sino la de configuración
      let MULTA = prestamos[0].multa_base != null ? parseFloat(prestamos[0].multa_base) : null;
      if (MULTA == null || isNaN(MULTA)) {
        const [cfg] = await tx.query("SELECT valor FROM configuracion WHERE clave='multa_por_dia'");
        MULTA = cfg.length ? parseFloat(cfg[0].valor) : 10000;
        if (MULTA == null || isNaN(MULTA) || MULTA < 0) MULTA = 10000;
      }
      const ahora = new Date();
      const venc = new Date(prestamos[0].fecha_devolucion_estimada);
      // Días de retraso (si corresponde)
      const dias = ahora > venc ? Math.ceil((ahora - venc) / (1000 * 60 * 60 * 24)) : 0;
      const multa = dias * MULTA;
      const dano = tiene_dano ? (parseFloat(monto_dano) || 0) : 0;
      const total = multa + dano;
      const fmt = (d) => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Asuncion' }).replace('T', ' ').slice(0, 19);

      await tx.query(
        `INSERT INTO devoluciones (id_prestamo,id_encargado,fecha_devolucion,estado_equipo,tiene_dano,
         tipo_dano,observacion_dano,monto_dano,dias_retraso,monto_multa,total_cobro,observacion)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id_prestamo, req.encargado.id || null, fmt(ahora), estadoEq, tiene_dano ? 1 : 0,
         tipo_dano || null, observacion_dano || null, dano, dias, multa, total, observacion || null]
      );
      await tx.commit();
      res.json({ mensaje: 'Devolucion registrada', dias_retraso: dias, monto_multa: multa, monto_dano: dano, total_cobro: total, fecha_devolucion: fmt(ahora) });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    } finally {
      tx.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Elimina una devolución y reactiva el préstamo como ACTIVO
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const conn = await db;
    const [devoluciones] = await conn.query(
      'SELECT id_prestamo FROM devoluciones WHERE id_devolucion = ?', [id]
    );
    if (devoluciones.length === 0) {
      return res.status(404).json({ mensaje: 'Devolución no encontrada' });
    }
    const idPrestamo = devoluciones[0].id_prestamo;
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      const [eq] = await tx.query(
        'SELECT p.id_equipo FROM prestamos p WHERE p.id_prestamo = ?', [idPrestamo]
      );
      await tx.query('DELETE FROM devoluciones WHERE id_devolucion = ?', [id]);
      await tx.query("UPDATE prestamos SET estado = 'ACTIVO' WHERE id_prestamo = ?", [idPrestamo]);
      // Si el equipo no tiene otros préstamos activos, lo devolvemos a Disponible
      if (eq.length > 0) {
        const [activos] = await tx.query(
          'SELECT COUNT(*) AS c FROM prestamos WHERE id_equipo = ? AND estado = "ACTIVO" AND id_prestamo != ?',
          [eq[0].id_equipo, idPrestamo]
        );
        if (activos[0].c === 0) {
          await tx.query("UPDATE equipos SET estado = 'Disponible' WHERE id_equipo = ?", [eq[0].id_equipo]);
        }
      }
      await tx.commit();
      res.json({ mensaje: 'Devolución eliminada correctamente. Préstamo reactivado.' });
    } catch (txErr) {
      await tx.rollback();
      throw txErr;
    } finally {
      tx.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Lista todas las devoluciones con datos del préstamo, alumno, equipo y encargados
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT d.*, p.fecha_prestamo, p.fecha_devolucion_estimada,
        e.nombre AS equipo, e.tipo, e.marca,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.carrera, a.curso,
        enc_p.nombre AS enc_prestamo_nombre, enc_p.apellido AS enc_prestamo_apellido,
        enc_d.nombre AS enc_devolucion_nombre, enc_d.apellido AS enc_devolucion_apellido
      FROM devoluciones d
      JOIN prestamos p ON d.id_prestamo = p.id_prestamo
      JOIN equipos e   ON p.id_equipo   = e.id_equipo
      JOIN alumnos a   ON p.id_alumno   = a.id_alumno
      LEFT JOIN encargados enc_p ON p.id_encargado = enc_p.id_encargado
      LEFT JOIN encargados enc_d ON d.id_encargado = enc_d.id_encargado
      ORDER BY d.fecha_devolucion DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
