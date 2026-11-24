// Controlador de alumnos: listado, alta con código correlativo, baja lógica e historial.
const db = require('../db');
const { s } = require('../utils/sanitize');
const auditoria = require('../utils/auditoria');

/**
 * Lista los alumnos activos ordenados por código.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de alumnos o error 500.
 * @returns {Promise<void>}
 */
exports.listar = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query('SELECT * FROM alumnos WHERE estado=1 ORDER BY codigo_alumno');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Lista los alumnos activos que no tienen un préstamo ACTIVO, para asignarles uno nuevo.
 * Excluye con una subconsulta a quienes ya tienen un equipo sin devolver.
 * @param {import('express').Request} req Petición HTTP autenticada.
 * @param {import('express').Response} res Arreglo de alumnos disponibles o error 500.
 * @returns {Promise<void>}
 */
exports.disponibles = async (req, res) => {
  try {
    const conn = await db;
    const [rows] = await conn.query(`
      SELECT * FROM alumnos
      WHERE estado = 1
      AND id_alumno NOT IN (
        SELECT id_alumno FROM prestamos WHERE estado = 'ACTIVO'
      )
      ORDER BY codigo_alumno
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Crea un alumno generando un código correlativo (ALU001, ALU002...).
 * Valida los campos obligatorios y sanitiza los datos antes de insertar.
 * @param {import('express').Request} req Body: nombre, apellido, carrera, curso, turno.
 * @param {import('express').Response} res Código generado o error de validación/500.
 * @returns {Promise<void>}
 */
exports.crear = async (req, res) => {
  const { nombre, apellido, carrera, curso, turno } = req.body;
  if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Nombre y apellido requeridos' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Se calcula el siguiente correlativo dentro de la transacción; FOR UPDATE
    // busca evitar que dos altas simultáneas generen el mismo código.
    const [maxRow] = await conn.query('SELECT MAX(CAST(SUBSTRING(codigo_alumno, 4) AS UNSIGNED)) AS max_num FROM alumnos FOR UPDATE');
    const maxNum = maxRow[0].max_num || 0;
    const codigo_alumno = 'ALU' + String(maxNum + 1).padStart(3, '0');
    // s() recorta espacios y limita la longitud de cada campo de texto.
    await conn.query(
      'INSERT INTO alumnos (codigo_alumno,nombre,apellido,carrera,curso,turno) VALUES (?,?,?,?,?,?)',
      [codigo_alumno, s(nombre, 100), s(apellido, 100), s(carrera, 150), s(curso, 50), s(turno || 'Mañana', 20)]
    );
    await conn.commit();
    // La auditoría se registra después del commit y no bloquea la respuesta.
    auditoria.registrar(req, {
      accion: 'CREAR',
      entidad: 'alumno',
      id_entidad: codigo_alumno,
      detalle: `${nombre} ${apellido} · ${turno || 'Mañana'}`
    });
    res.json({ mensaje: 'Alumno registrado', codigo_alumno });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
};

/**
 * Desactiva lógicamente un alumno (estado = 0) sin borrar su historial.
 * Regla de negocio: no permite la baja si el alumno tiene un préstamo activo.
 * @param {import('express').Request} req Parámetro :id del alumno.
 * @param {import('express').Response} res Confirmación o error 400/500.
 * @returns {Promise<void>}
 */
exports.eliminar = async (req, res) => {
  try {
    const id = req.params.id;
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      // Regla de negocio: no se desactiva un alumno con equipos sin devolver.
      // FOR UPDATE mantiene la fila bloqueada hasta confirmar o revertir.
      const [prestamosActivos] = await tx.query(
        'SELECT id_prestamo FROM prestamos WHERE id_alumno = ? AND estado = "ACTIVO" LIMIT 1 FOR UPDATE', [id]
      );
      if (prestamosActivos.length > 0) {
        await tx.rollback();
        return res.status(400).json({ mensaje: 'No se puede desactivar: el alumno tiene un préstamo activo' });
      }
      await tx.query('UPDATE alumnos SET estado = 0 WHERE id_alumno = ?', [id]);
      await tx.commit();
      auditoria.registrar(req, {
        accion: 'DESACTIVAR',
        entidad: 'alumno',
        id_entidad: id,
        detalle: 'Alumno desactivado (historial conservado)'
      });
      res.json({ mensaje: 'Alumno desactivado correctamente. Su historial se conserva.' });
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
 * Obtiene el historial de préstamos de un alumno, con sus devoluciones si existen.
 * @param {import('express').Request} req Parámetro :id del alumno.
 * @param {import('express').Response} res Arreglo de préstamos ordenado por fecha descendente.
 * @returns {Promise<void>}
 */
exports.historial = async (req, res) => {
  try {
    const conn = await db;
    // LEFT JOIN: los préstamos activos aún no tienen devolución y deben aparecer igual.
    const [rows] = await conn.query(`
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
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

/**
 * Actualiza los datos de un alumno existente y audita los campos modificados.
 * @param {import('express').Request} req Body con los datos; parámetro :id del alumno.
 * @param {import('express').Response} res Confirmación, 404 si no existe, 400/500.
 * @returns {Promise<void>}
 */
exports.editar = async (req, res) => {
  try {
    const { nombre, apellido, carrera, curso, turno } = req.body;
    if (!nombre || !apellido) return res.status(400).json({ mensaje: 'Datos incompletos' });
    const conn = await db;
    // Se lee el estado previo para verificar existencia y calcular el diff de auditoría.
    const [prevRows] = await conn.query(
      'SELECT nombre, apellido, carrera, curso, turno FROM alumnos WHERE id_alumno = ?', [req.params.id]
    );
    if (prevRows.length === 0) {
      return res.status(404).json({ mensaje: 'Alumno no encontrado' });
    }
    const nuevo = {
      nombre: s(nombre, 100),
      apellido: s(apellido, 100),
      carrera: s(carrera, 150),
      curso: s(curso, 50),
      turno: s(turno || 'Mañana', 20)
    };
    await conn.query(
      'UPDATE alumnos SET nombre=?, apellido=?, carrera=?, curso=?, turno=? WHERE id_alumno=?',
      [nuevo.nombre, nuevo.apellido, nuevo.carrera, nuevo.curso, nuevo.turno, req.params.id]
    );
    const prev = prevRows[0];
    const cambios = [];
    [['Nombre', 'nombre'], ['Apellido', 'apellido'], ['Bachillerato', 'carrera'], ['Curso', 'curso'], ['Turno', 'turno']].forEach(function (par) {
      if (String(prev[par[1]] || '') !== String(nuevo[par[1]] || '')) {
        cambios.push(par[0] + ': "' + (prev[par[1]] || '—') + '" → "' + (nuevo[par[1]] || '—') + '"');
      }
    });
    auditoria.registrar(req, {
      accion: 'EDITAR',
      entidad: 'alumno',
      id_entidad: req.params.id,
      detalle: cambios.length ? cambios.join(' · ') : 'Sin cambios'
    });
    res.json({ mensaje: 'Alumno actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};
