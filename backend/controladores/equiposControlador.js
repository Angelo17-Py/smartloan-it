// Controlador de equipos: inventario, disponibilidad, estado e historial.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');

/**
 * Lista todos los equipos ordenados por ID.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de equipos o error 500.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query('SELECT * FROM equipos ORDER BY id_equipo');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Lista solo los equipos con estado Disponible, aptos para un nuevo préstamo.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de equipos disponibles o error 500.
 * @returns {Promise<void>}
 */
exports.disponibles = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query("SELECT * FROM equipos WHERE estado = 'Disponible' ORDER BY id_equipo");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * Crea un equipo nuevo. El estado inicial lo asigna la base como Disponible;
 * el cliente solo envía datos descriptivos.
 * @param {import('express').Request} req Body: nombre, tipo, marca, descripcion.
 * @param {import('express').Response} res Confirmación o error 400/500.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  try {
    const { nombre, tipo, marca, descripcion } = req.body;
    if (!nombre || !tipo || !marca || !descripcion) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    const [result] = await conn.query('INSERT INTO equipos (nombre,tipo,marca,descripcion) VALUES (?,?,?,?)',
      [s(nombre, 100), s(tipo, 50), s(marca, 50), s(descripcion, 200)]
    );
    auditoria.registrar(req, {
      accion: 'CREAR',
      entidad: 'equipo',
      id_entidad: result.insertId,
      detalle: `${nombre} · ${tipo} · ${marca}`
    });
    res.json({ mensaje: 'Equipo creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Elimina un equipo solo si nunca tuvo préstamos, para no romper el historial.
 * La verificación y el borrado se ejecutan en una transacción.
 * @param {import('express').Request} req Parámetro :id del equipo.
 * @param {import('express').Response} res Confirmación o error 400/500.
 * @returns {Promise<void>}
 */
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // El historial de préstamos/devoluciones no debe perderse al eliminar un equipo.
      // FOR UPDATE bloquea las filas de préstamos del equipo durante la verificación.
      const [historial] = await tx.query(
        'SELECT COUNT(*) AS total FROM prestamos WHERE id_equipo = ? FOR UPDATE', [id]
      );
      if (Number(historial[0].total) > 0) {
        await tx.rollback();
        return res.status(400).json({ mensaje: 'No se puede eliminar: el equipo tiene historial de préstamos.' });
      }
      await tx.query('DELETE FROM equipos WHERE id_equipo = ?', [id]);
      await tx.commit();
      auditoria.registrar(req, {
        accion: 'ELIMINAR',
        entidad: 'equipo',
        id_entidad: id,
        detalle: 'Equipo sin historial de préstamos eliminado'
      });
      res.json({ mensaje: 'Equipo eliminado correctamente' });
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

/**
 * Cambia manualmente el estado de un equipo.
 * Solo admite Disponible <-> En mantenimiento; Prestado lo gestionan los préstamos.
 * @param {import('express').Request} req Body: estado numérico; parámetro :id.
 * @param {import('express').Response} res Confirmación o error 400/404/500.
 * @returns {Promise<void>}
 */
exports.cambiarEstado = async (req, res) => {
  try {
    // El formulario envía códigos numéricos; se traducen a los valores del ENUM.
    const estadoMap = {1:'Disponible', 2:'Prestado', 3:'En mantenimiento'};
    const estado = estadoMap[req.body.estado];
    if (!estado) {
      return res.status(400).json({ mensaje: 'Estado inválido' });
    }
    const conn = await db;
    const [equipos] = await conn.query('SELECT nombre, estado FROM equipos WHERE id_equipo=?', [req.params.id]);
    if (equipos.length === 0) {
      return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    }
    const actual = equipos[0].estado;
    const nombreEquipo = equipos[0].nombre;
    // Solo se permite cambiar manualmente entre Disponible y En mantenimiento
    const permitidas = {
      'Disponible':       ['En mantenimiento'],
      'En mantenimiento': ['Disponible'],
      'Prestado':         []
    };
    if (!permitidas[actual] || !permitidas[actual].includes(estado)) {
      return res.status(400).json({ mensaje: `Transición no permitida: ${actual} -> ${estado}. Los cambios de estado manuales solo pueden ser Disponible <-> En mantenimiento.` });
    }
    await conn.query('UPDATE equipos SET estado=? WHERE id_equipo=?', [estado, req.params.id]);
    auditoria.registrar(req, {
      accion: 'ESTADO',
      entidad: 'equipo',
      id_entidad: req.params.id,
      detalle: `${nombreEquipo}: ${actual} → ${estado}`
    });
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Devuelve el historial de préstamos de un equipo con los datos del alumno.
 * @param {import('express').Request} req Parámetro :id del equipo.
 * @param {import('express').Response} res Arreglo de préstamos o error 500.
 * @returns {Promise<void>}
 */
exports.historial = async (req, res) => {
  try {
    const conn = await db;
    // LEFT JOIN: los préstamos activos todavía no tienen devolución registrada.
    const [rows] = await conn.query(`
      SELECT p.id_prestamo, p.fecha_prestamo, p.fecha_devolucion_estimada,
        p.estado AS estado_prestamo, p.estado_inicial_equipo, p.motivo, p.accesorios,
        a.codigo_alumno, a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
        a.carrera, a.curso, a.turno,
        d.fecha_devolucion, d.estado_equipo AS estado_devolucion,
        d.dias_retraso, d.monto_multa, d.monto_dano, d.total_cobro, d.tiene_dano, d.tipo_dano
      FROM prestamos p
      JOIN alumnos a ON p.id_alumno = a.id_alumno
      LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo
      WHERE p.id_equipo = ?
      ORDER BY p.fecha_prestamo DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Actualiza los datos descriptivos de un equipo y audita los cambios.
 * El estado no se modifica por esta vía.
 * @param {import('express').Request} req Body con los datos; parámetro :id del equipo.
 * @param {import('express').Response} res Confirmación, 404 si no existe, 400/500.
 * @returns {Promise<void>}
 */
exports.editar = async (req, res) => {
  try {
    const { nombre, tipo, marca, descripcion } = req.body;
    if (!nombre || !tipo || !marca || !descripcion) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    // Se lee el estado previo para verificar existencia y calcular el diff de auditoría.
    const [prevRows] = await conn.query(
      'SELECT nombre, tipo, marca, descripcion FROM equipos WHERE id_equipo = ?', [req.params.id]
    );
    if (prevRows.length === 0) {
      return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    }
    const nuevo = {
      nombre: s(nombre, 100),
      tipo: s(tipo, 50),
      marca: s(marca, 50),
      descripcion: s(descripcion, 200)
    };
    await conn.query(
      'UPDATE equipos SET nombre=?, tipo=?, marca=?, descripcion=? WHERE id_equipo=?',
      [nuevo.nombre, nuevo.tipo, nuevo.marca, nuevo.descripcion, req.params.id]
    );
    const prev = prevRows[0];
    const cambios = [];
    [['Nombre', 'nombre'], ['Tipo', 'tipo'], ['Marca', 'marca'], ['Descripción', 'descripcion']].forEach(function (par) {
      if (String(prev[par[1]] || '') !== String(nuevo[par[1]] || '')) {
        cambios.push(par[0] + ': "' + (prev[par[1]] || '—') + '" → "' + (nuevo[par[1]] || '—') + '"');
      }
    });
    auditoria.registrar(req, {
      accion: 'EDITAR',
      entidad: 'equipo',
      id_entidad: req.params.id,
      detalle: cambios.length ? cambios.join(' · ') : 'Sin cambios'
    });
    res.json({ mensaje: 'Equipo actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
