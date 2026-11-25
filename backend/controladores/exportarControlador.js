// Exportación de préstamos y devoluciones a Excel.
const db = require('../db');
const auditoria = require('../utils/auditoria');
const { buildWorkbook } = require('../utils/reporteExcel');

/**
 * Genera y envía el libro Excel con préstamos y devoluciones vigentes.
 * @param {import('express').Request} req Petición autenticada.
 * @param {import('express').Response} res Respuesta HTTP con el archivo.
 * @returns {Promise<void>}
 */
module.exports = async function exportarExcel(req, res) {
  try {
    const conn = await db;
    // Trae todos los préstamos con sus datos relacionados. El LEFT JOIN conserva
    // los préstamos aún no devueltos, que quedan con las columnas de devolución en NULL.
    const [rows] = await conn.query(`
      SELECT
        p.id_prestamo,
        p.codigo_prestamo,
        p.multa_base,
        a.codigo_alumno,
        a.nombre AS alumno_nombre,
        a.apellido AS alumno_apellido,
        a.carrera,
        a.curso,
        a.turno,
        e.nombre AS equipo,
        e.tipo,
        e.marca,
        p.fecha_prestamo,
        p.fecha_devolucion_estimada,
        p.estado_inicial_equipo,
        p.accesorios,
        p.motivo,
        p.observaciones,
        p.estado AS estado_prestamo,
        enc.nombre AS encargado_nombre,
        enc.apellido AS encargado_apellido,
        d.id_devolucion,
        d.fecha_devolucion,
        d.estado_equipo AS estado_devolucion,
        d.tiene_dano,
        d.tipo_dano,
        d.monto_dano,
        d.monto_accesorios,
        d.dias_retraso,
        d.monto_multa,
        d.total_cobro,
        d.accesorios_devueltos,
        d.accesorios_faltantes,
        d.estado_pago,
        d.monto_pagado,
        d.metodo_pago,
        d.observacion AS observacion_devolucion
      FROM prestamos p
      JOIN alumnos a    ON p.id_alumno    = a.id_alumno
      JOIN equipos e    ON p.id_equipo    = e.id_equipo
      JOIN encargados enc ON p.id_encargado = enc.id_encargado
      LEFT JOIN devoluciones d ON p.id_prestamo = d.id_prestamo AND d.anulado = 0
      WHERE p.anulado = 0
      ORDER BY p.fecha_prestamo DESC
    `);

    // Nombre del encargado que genera el reporte (req.encargado solo trae id y rol).
    let generadoPor = req.encargado && req.encargado.codigo ? req.encargado.codigo : 'Sistema';
    if (req.encargado && req.encargado.id) {
      const [encRows] = await conn.query(
        'SELECT nombre, apellido FROM encargados WHERE id_encargado = ? LIMIT 1',
        [req.encargado.id]
      );
      if (encRows.length) {
        generadoPor = `${encRows[0].nombre} ${encRows[0].apellido}`.trim() +
          (req.encargado.codigo ? ` (${req.encargado.codigo})` : '');
      }
    }

    const generadoComoFecha = new Date();
    const meta = {
      generadoEn: fechaHoraLocal(generadoComoFecha),
      generadoComoFecha,
      generadoPor
    };

    const wb = buildWorkbook(rows, meta);

    // Totales expuestos como cabeceras para que el cliente muestre el resumen de la exportación.
    const loanCount = rows.length;
    const returnCount = rows.filter((r) => r.id_devolucion).length;
    const studentSet = new Set(rows.map((r) => r.codigo_alumno));
    const studentCount = studentSet.size;

    res.setHeader('X-Export-Loans', loanCount);
    res.setHeader('X-Export-Returns', returnCount);
    res.setHeader('X-Export-Students', studentCount);

    const fecha = generadoComoFecha.toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', 'attachment; filename=SmartLoanIT_Reporte_' + fecha + '.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await wb.xlsx.write(res);

    auditoria.registrar(req, {
      accion: 'EXPORTAR',
      entidad: 'sistema',
      id_entidad: null,
      detalle: `Exportación Excel: ${loanCount} préstamos, ${returnCount} devoluciones, ${studentCount} alumnos`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Mismo formato local que usa el reporte, reutilizado para los metadatos.
function fechaHoraLocal(fecha) {
  const d = fecha || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
