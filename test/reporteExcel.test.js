// Pruebas del libro Excel generado para la exportación de reportes.
const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { buildWorkbook } = require('../backend/utils/reporteExcel');

// Filas mínimas que imitan la consulta del controlador de exportación.
const base = {
  multa_base: 10000, carrera: 'Bachillerato Técnico en Informática', curso: '3° año', turno: 'Mañana',
  tipo: 'Laptop', marca: 'Dell', accesorios: 'Cargador', observaciones: null,
  encargado_nombre: 'Angelo', encargado_apellido: 'Caballero',
  tiene_dano: 0, tipo_dano: null, monto_dano: 0, monto_accesorios: 0,
  accesorios_devueltos: null, accesorios_faltantes: null, estado_pago: null,
  monto_pagado: 0, metodo_pago: null, observacion_devolucion: null
};

function filas() {
  return [
    {
      ...base, id_prestamo: 1, codigo_prestamo: 'PRE-001', codigo_alumno: 'ALU001',
      alumno_nombre: 'María', alumno_apellido: 'González', equipo: 'Aspire 3',
      fecha_prestamo: '2026-11-25 11:33:00', fecha_devolucion_estimada: '2026-11-27 11:33:00',
      estado_inicial_equipo: 'Excelente', estado_prestamo: 'ACTIVO',
      id_devolucion: null, fecha_devolucion: null, estado_devolucion: null,
      dias_retraso: null, monto_multa: null, total_cobro: null
    },
    {
      ...base, id_prestamo: 2, codigo_prestamo: 'PRE-002', codigo_alumno: 'ALU002',
      alumno_nombre: 'Carlos', alumno_apellido: 'Mendoza', equipo: 'MacBook Pro 14',
      fecha_prestamo: '2026-11-15 10:00:00', fecha_devolucion_estimada: '2026-11-16 10:00:00',
      estado_inicial_equipo: 'Bueno', estado_prestamo: 'DEVUELTO', id_devolucion: 7,
      fecha_devolucion: '2026-11-19 15:20:00', estado_devolucion: 'Bueno',
      dias_retraso: 3, monto_multa: 30000, total_cobro: 95000, tiene_dano: 1,
      tipo_dano: 'Rayón en la tapa', monto_dano: 50000, monto_accesorios: 15000,
      accesorios_devueltos: 'Cargador', accesorios_faltantes: 'Mouse',
      estado_pago: 'Parcial', monto_pagado: 40000, metodo_pago: 'Efectivo',
      observacion_devolucion: 'Con desgaste normal.'
    }
  ];
}

function libro() {
  return buildWorkbook(filas(), {
    generadoEn: '25/11/2026 12:00',
    generadoComoFecha: new Date(2026, 10, 25, 12, 0, 0),
    generadoPor: 'Angelo Caballero (1001)'
  });
}

test('genera las hojas del reporte con sus encabezados y filtros', () => {
  const wb = libro();
  assert.deepEqual(wb.worksheets.map((ws) => ws.name), ['Resumen', 'Préstamos', 'Devoluciones']);
  const prestamos = wb.getWorksheet('Préstamos');
  assert.equal(prestamos.getCell('A5').value, 'Préstamo');
  assert.ok(prestamos.autoFilter);
  const devoluciones = wb.getWorksheet('Devoluciones');
  assert.equal(devoluciones.getCell('P5').value, 'Total cobrado');
  assert.ok(devoluciones.autoFilter);
});

test('conserva tipos reales de fecha y moneda para que Excel pueda operar', () => {
  const wb = libro();
  const prestamos = wb.getWorksheet('Préstamos');
  const fecha = prestamos.getCell('K6');
  assert.ok(fecha.value instanceof Date);
  assert.equal(fecha.value.toISOString().slice(0, 16), '2026-11-25T11:33');
  assert.equal(fecha.numFmt, 'dd/mm/yyyy hh:mm');
  const multa = prestamos.getCell('N6');
  assert.equal(typeof multa.value, 'number');
  assert.equal(multa.numFmt, '"Gs. "#,##0');
});

test('calcula estados y totales del resumen y las devoluciones', () => {
  const wb = libro();
  const resumen = wb.getWorksheet('Resumen');
  assert.equal(resumen.getCell('A6').value, 2);
  assert.equal(resumen.getCell('G6').value, 1);
  const devoluciones = wb.getWorksheet('Devoluciones');
  assert.equal(devoluciones.getCell('R6').value, 55000);
  const totales = devoluciones.getCell('P8').value;
  assert.equal(totales.result, 95000);
  assert.match(totales.formula, /^SUM\(P6:P6\)$/);
});
