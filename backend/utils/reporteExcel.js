// Generación del libro Excel de reportes de SmartLoanIT.
const ExcelJS = require('exceljs');

// Paleta institucional compartida con los comprobantes y el panel.
const COL = {
  ink: 'FF241D0B',
  inkSoft: 'FF312A1C',
  gold: 'FFC8A24B',
  paper: 'FFF7F1E4',
  cream: 'FFFAF7F0',
  line: 'FFE6DFCF',
  muted: 'FF6F6552',
  white: 'FFFFFFFF',
  green: 'FF2F6B45',
  greenBg: 'FFEAF4EE',
  red: 'FFB03A2E',
  redBg: 'FFFBEBE8',
  amber: 'FF9A6A10',
  amberBg: 'FFFBF3E1',
  goldBg: 'FFF7EFD9'
};
const FONT = 'Calibri';
const MONEY_FMT = '"Gs. "#,##0';
const DATETIME_FMT = 'dd/mm/yyyy hh:mm';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Convierte un DATETIME de la base a una fecha "de pared" en UTC.
 * ExcelJS serializa las fechas con getTime(); construirla en UTC evita que la
 * zona horaria del servidor desplace las horas que se ven en el libro.
 * @param {string|Date|null} valor Fecha de MySQL (dateStrings) o Date.
 * @returns {Date|null}
 */
function parseFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return new Date(Date.UTC(
      valor.getFullYear(), valor.getMonth(), valor.getDate(),
      valor.getHours(), valor.getMinutes(), valor.getSeconds()
    ));
  }
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(Date.UTC(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)
    ));
  }
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : parseFecha(d);
}

// Fecha y hora local del servidor, con el mismo formato que usa el sistema.
function fechaHoraLocal(fecha) {
  const d = fecha || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Reloj "de pared" comparable con las fechas parseadas.
function ahoraDePared() {
  const d = new Date();
  return new Date(Date.UTC(
    d.getFullYear(), d.getMonth(), d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds()
  ));
}

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Encabezado común de cada hoja: marca, subtítulo, metadatos y barra de sección.
 * @param {ExcelJS.Worksheet} ws Hoja a completar.
 * @param {number} lastCol Última columna del reporte.
 * @param {object} opts Subtítulo, meta y texto de la sección.
 */
function addReportHeader(ws, lastCol, opts) {
  ws.mergeCells(1, 1, 1, lastCol);
  const brand = ws.getCell(1, 1);
  brand.value = 'SmartLoanIT';
  brand.font = { name: FONT, size: 20, bold: true, color: { argb: COL.white } };
  brand.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.ink } };
  brand.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 38;

  ws.mergeCells(2, 1, 2, lastCol);
  const subtitle = ws.getCell(2, 1);
  subtitle.value = opts.subtitle;
  subtitle.font = { name: FONT, size: 10.5, bold: true, color: { argb: COL.gold } };
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.ink } };
  subtitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 20;

  ws.mergeCells(3, 1, 3, lastCol);
  const meta = ws.getCell(3, 1);
  meta.value = opts.meta;
  meta.font = { name: FONT, size: 9, color: { argb: COL.muted } };
  meta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.paper } };
  meta.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  meta.border = { bottom: { style: 'medium', color: { argb: COL.gold } } };
  ws.getRow(3).height = 22;

  ws.mergeCells(4, 1, 4, lastCol);
  const section = ws.getCell(4, 1);
  section.value = opts.section;
  section.font = { name: FONT, size: 10, bold: true, color: { argb: COL.white } };
  section.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.inkSoft } };
  section.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  section.border = { left: { style: 'thick', color: { argb: COL.gold } } };
  ws.getRow(4).height = 22;
}

/**
 * Aplica el estilo del encabezado de una tabla.
 * @param {ExcelJS.Worksheet} ws Hoja destino.
 * @param {number} rowNumber Fila del encabezado.
 * @param {string[]} headers Textos de las columnas.
 */
function addTableHeader(ws, rowNumber, headers) {
  headers.forEach((header, i) => {
    const cell = ws.getCell(rowNumber, i + 1);
    cell.value = header;
    cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: COL.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.ink } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: COL.gold } } };
  });
  ws.getRow(rowNumber).height = 32;
}

/**
 * Escribe las filas de datos con bandas suaves y bordes horizontales.
 * @param {ExcelJS.Worksheet} ws Hoja destino.
 * @param {number} startRow Primera fila de datos.
 * @param {Array<Array<object>>} filas Celdas con valor y estilo.
 * @returns {number} Última fila escrita.
 */
function addTableRows(ws, startRow, filas) {
  filas.forEach((valores, idx) => {
    const row = ws.getRow(startRow + idx);
    const bg = idx % 2 === 0 ? COL.white : COL.cream;
    valores.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v.value === undefined ? null : v.value;
      cell.font = {
        name: FONT,
        size: 9.5,
        bold: !!v.bold,
        color: { argb: v.color || COL.ink }
      };
      cell.alignment = {
        horizontal: v.align || 'left',
        vertical: 'middle',
        wrapText: !!v.wrap
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: v.fill || bg } };
      cell.border = { bottom: { style: 'hair', color: { argb: COL.line } } };
      if (v.numFmt) cell.numFmt = v.numFmt;
    });
  });
  return startRow + filas.length - 1;
}

// Escribe una fila de totales con fórmulas y bordes dorados.
function addTotalsRow(ws, rowNumber, firstCol, lastCol, label, moneyCols, sums) {
  ws.getRow(rowNumber).height = 24;
  if (lastCol > firstCol) ws.mergeCells(rowNumber, firstCol, rowNumber, lastCol);

  const labelCell = ws.getCell(rowNumber, firstCol);
  labelCell.value = label;
  labelCell.font = { name: FONT, size: 10, bold: true, color: { argb: COL.ink } };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.goldBg } };
  labelCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };

  moneyCols.forEach((col, i) => {
    const cell = ws.getCell(rowNumber, col);
    const letra = cell.address.replace(/\d+/g, '');
    const formula = `SUM(${letra}${sums.start}:${letra}${sums.end})`;
    cell.value = { formula, result: sums.values[i] };
    cell.numFmt = MONEY_FMT;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COL.ink } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.goldBg } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: COL.gold } } };
  });
}

/**
 * Tarjeta de indicador: etiqueta y valor sobre dos columnas.
 * @param {ExcelJS.Worksheet} ws Hoja destino.
 * @param {number} row Fila de la etiqueta; el valor va en row + 1.
 * @param {number} col Primera columna de la tarjeta.
 * @param {string} label Texto de la etiqueta.
 * @param {number} value Valor numérico.
 * @param {object} opts Formato y color de acento.
 */
function addKpiCard(ws, row, col, label, value, opts) {
  const labelRow = row;
  const valueRow = row + 1;
  ws.mergeCells(labelRow, col, labelRow, col + 1);
  ws.mergeCells(valueRow, col, valueRow, col + 1);

  const labelCell = ws.getCell(labelRow, col);
  labelCell.value = label;
  labelCell.font = { name: FONT, size: 8.5, bold: true, color: { argb: COL.muted } };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.white } };
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const valueCell = ws.getCell(valueRow, col);
  valueCell.value = value;
  valueCell.numFmt = opts.money ? MONEY_FMT : '#,##0';
  valueCell.font = { name: FONT, size: 17, bold: true, color: { argb: opts.color || COL.ink } };
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.white } };
  valueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

  const border = {
    top: { style: 'medium', color: { argb: opts.accent || COL.gold } },
    left: { style: 'thin', color: { argb: COL.line } },
    bottom: { style: 'thin', color: { argb: COL.line } },
    right: { style: 'thin', color: { argb: COL.line } }
  };
  labelCell.border = border;
  valueCell.border = border;

  ws.getRow(labelRow).height = Math.max(ws.getRow(labelRow).height || 0, 18);
  ws.getRow(valueRow).height = 30;
}

// Barra de sección para los bloques internos del resumen.
function addSectionBar(ws, row, firstCol, lastCol, text) {
  ws.mergeCells(row, firstCol, row, lastCol);
  const cell = ws.getCell(row, firstCol);
  cell.value = text;
  cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: COL.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.inkSoft } };
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  cell.border = { left: { style: 'thick', color: { argb: COL.gold } } };
  ws.getRow(row).height = 22;
}

// Fila etiqueta/valor de un bloque del resumen.
function addSummaryRow(ws, row, labelCol, labelEndCol, valueCol, label, value, opts) {
  const o = opts || {};
  ws.mergeCells(row, labelCol, row, labelEndCol);
  const labelCell = ws.getCell(row, labelCol);
  labelCell.value = label;
  labelCell.font = { name: FONT, size: 9.5, bold: !!o.bold, color: { argb: COL.ink } };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill || COL.white } };
  labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  labelCell.border = { bottom: { style: 'hair', color: { argb: COL.line } } };

  const valueCell = ws.getCell(row, valueCol);
  valueCell.value = value;
  valueCell.numFmt = o.money ? MONEY_FMT : '#,##0';
  valueCell.font = { name: FONT, size: 9.5, bold: !!o.bold, color: { argb: o.color || COL.ink } };
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill || COL.white } };
  valueCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  valueCell.border = { bottom: { style: 'hair', color: { argb: COL.line } } };
  ws.getRow(row).height = 20;
}

// Hoja 1: resumen ejecutivo con indicadores y totales de cobro.
function buildSummarySheet(wb, loans, returns, meta) {
  const ws = wb.addWorksheet('Resumen');
  ws.properties.tabColor = { argb: COL.gold };
  ws.columns = Array.from({ length: 8 }, () => ({ width: 15 }));

  addReportHeader(ws, 8, {
    subtitle: 'Reporte general de préstamos de equipos',
    meta: `Generado el ${meta.generadoEn} · Por ${meta.generadoPor}`,
    section: 'INDICADORES GENERALES'
  });

  const activos = loans.filter((l) => !l.devuelto).length;
  const atrasados = loans.filter((l) => !l.devuelto && l.dias > 0).length;
  const devueltos = returns.length;
  const alumnos = new Set(loans.map((l) => l.codigo_alumno)).size;

  const multasRegistradas = returns.reduce((a, r) => a + numero(r.monto_multa), 0);
  const danos = returns.reduce((a, r) => a + numero(r.monto_dano), 0);
  const accesorios = returns.reduce((a, r) => a + numero(r.monto_accesorios), 0);
  const cobrado = returns.reduce((a, r) => a + numero(r.total_cobro), 0);
  const pagado = returns.reduce((a, r) => a + numero(r.monto_pagado), 0);
  const saldo = returns.reduce((a, r) => {
    if (r.estado_pago === 'Condonado') return a;
    return a + Math.max(numero(r.total_cobro) - numero(r.monto_pagado), 0);
  }, 0);

  addKpiCard(ws, 5, 1, 'PRÉSTAMOS TOTALES', loans.length, {});
  addKpiCard(ws, 5, 3, 'ACTIVOS', activos, {});
  addKpiCard(ws, 5, 5, 'ATRASADOS', atrasados, {
    accent: atrasados > 0 ? COL.red : COL.gold,
    color: atrasados > 0 ? COL.red : COL.ink
  });
  addKpiCard(ws, 5, 7, 'DEVUELTOS', devueltos, { accent: COL.green });

  addKpiCard(ws, 8, 1, 'DEVOLUCIONES REGISTRADAS', returns.length, {});
  addKpiCard(ws, 8, 3, 'ALUMNOS ALCANZADOS', alumnos, {});
  addKpiCard(ws, 8, 5, 'TOTAL APLICADO', cobrado, { money: true });
  addKpiCard(ws, 8, 7, 'SALDO PENDIENTE', saldo, {
    money: true,
    accent: saldo > 0 ? COL.amber : COL.green,
    color: saldo > 0 ? COL.amber : COL.green
  });

  ws.getRow(7).height = 6;
  ws.getRow(10).height = 10;

  addSectionBar(ws, 11, 1, 4, 'LIQUIDACIONES REGISTRADAS (Gs.)');
  addSectionBar(ws, 11, 6, 8, 'SITUACIÓN DE PRÉSTAMOS');

  const headers = [
    [1, 3, 'Concepto'], [4, 4, 'Monto'],
    [6, 7, 'Estado'], [8, 8, 'Cantidad']
  ];
  headers.forEach(([c1, c2, text]) => {
    ws.mergeCells(12, c1, 12, c2);
    const cell = ws.getCell(12, c1);
    cell.value = text;
    cell.font = { name: FONT, size: 8.5, bold: true, color: { argb: COL.muted } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.paper } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    cell.border = { bottom: { style: 'thin', color: { argb: COL.line } } };
  });
  ws.getRow(12).height = 20;

  addSummaryRow(ws, 13, 1, 3, 4, 'Multas por retraso', multasRegistradas, { money: true });
  addSummaryRow(ws, 14, 1, 3, 4, 'Daños', danos, { money: true });
  addSummaryRow(ws, 15, 1, 3, 4, 'Accesorios faltantes', accesorios, { money: true });
  addSummaryRow(ws, 16, 1, 3, 4, 'Total aplicado', cobrado, {
    money: true, bold: true, fill: COL.goldBg
  });
  addSummaryRow(ws, 17, 1, 3, 4, 'Total pagado', pagado, { money: true });
  addSummaryRow(ws, 18, 1, 3, 4, 'Saldo pendiente', saldo, {
    money: true, bold: true, color: saldo > 0 ? COL.red : COL.green
  });

  addSummaryRow(ws, 13, 6, 7, 8, 'Activos en plazo', loans.filter((l) => !l.devuelto && l.dias === 0).length, {});
  addSummaryRow(ws, 14, 6, 7, 8, 'Atrasados', atrasados, { color: atrasados > 0 ? COL.red : COL.ink });
  addSummaryRow(ws, 15, 6, 7, 8, 'Devueltos en plazo', returns.filter((r) => r.dias === 0).length, {});
  addSummaryRow(ws, 16, 6, 7, 8, 'Devueltos con retraso', returns.filter((r) => r.dias > 0).length, { color: COL.amber });

  ws.mergeCells(20, 1, 20, 8);
  const nota = ws.getCell(20, 1);
  nota.value = 'Documento generado automáticamente por SmartLoanIT. Los importes se expresan en guaraníes (Gs.).';
  nota.font = { name: FONT, size: 8, italic: true, color: { argb: COL.muted } };
  nota.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  nota.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.white } };

  ws.pageSetup = {
    orientation: 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
  };
  ws.headerFooter.oddFooter = '&LSmartLoanIT&CPágina &P de &N&RDatos al día';
}

// Hoja 2: detalle de todos los préstamos vigentes y su situación actual.
function buildLoansSheet(wb, loans, meta) {
  const ws = wb.addWorksheet('Préstamos');
  ws.properties.tabColor = { argb: COL.ink };
  ws.columns = [
    { width: 12 }, { width: 11 }, { width: 14 }, { width: 28 }, { width: 30 },
    { width: 9 }, { width: 9 }, { width: 26 }, { width: 10 }, { width: 10 },
    { width: 17 }, { width: 17 }, { width: 10 }, { width: 14 }, { width: 12 },
    { width: 17 }, { width: 22 }, { width: 24 }, { width: 20 }, { width: 30 }
  ];

  addReportHeader(ws, 20, {
    subtitle: 'Detalle de préstamos de equipos',
    meta: `Generado el ${meta.generadoEn} · Por ${meta.generadoPor} · ${loans.length} registro(s)`,
    section: 'DETALLE DE PRÉSTAMOS'
  });

  const headers = [
    'Préstamo', 'Estado', 'Código alumno', 'Alumno', 'Bachillerato', 'Curso', 'Turno',
    'Equipo', 'Tipo', 'Marca', 'Fecha préstamo', 'Devolución estimada', 'Días de retraso',
    'Multa', 'Estado inicial', 'Fecha devolución', 'Accesorios', 'Motivo',
    'Registrado por', 'Observaciones'
  ];
  addTableHeader(ws, 5, headers);

  const estadoEstilo = {
    Activo: { fill: COL.amberBg, color: COL.amber },
    Atrasado: { fill: COL.redBg, color: COL.red },
    Devuelto: { fill: COL.greenBg, color: COL.green }
  };

  if (!loans.length) {
    ws.mergeCells(6, 1, 6, 20);
    const vacio = ws.getCell(6, 1);
    vacio.value = 'No hay préstamos registrados para exportar.';
    vacio.font = { name: FONT, size: 10, italic: true, color: { argb: COL.muted } };
    vacio.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    vacio.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.paper } };
  } else {
    const filas = loans.map((r) => {
      const estilo = estadoEstilo[r.estado] || estadoEstilo.Activo;
      return [
        { value: r.codigo_prestamo || ('PRE-' + String(r.id_prestamo).padStart(3, '0')) },
        { value: r.estado, bold: true, color: estilo.color, fill: estilo.fill },
        { value: r.codigo_alumno },
        { value: `${r.alumno_nombre || ''} ${r.alumno_apellido || ''}`.trim(), wrap: true },
        { value: r.carrera, wrap: true },
        { value: r.curso },
        { value: r.turno },
        { value: r.equipo, wrap: true },
        { value: r.tipo },
        { value: r.marca },
        { value: parseFecha(r.fecha_prestamo), numFmt: DATETIME_FMT, align: 'center' },
        { value: parseFecha(r.fecha_devolucion_estimada), numFmt: DATETIME_FMT, align: 'center' },
        { value: r.dias, align: 'center', bold: r.dias > 0, color: r.dias > 0 ? COL.red : COL.ink },
        { value: r.multa, numFmt: MONEY_FMT, align: 'right' },
        { value: r.estado_inicial_equipo },
        { value: parseFecha(r.fecha_devolucion), numFmt: DATETIME_FMT, align: 'center' },
        { value: r.accesorios, wrap: true },
        { value: r.motivo, wrap: true },
        { value: `${r.encargado_nombre || ''} ${r.encargado_apellido || ''}`.trim(), wrap: true },
        { value: r.observaciones, wrap: true }
      ];
    });
    const last = addTableRows(ws, 6, filas);
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: last, column: 20 } };
  }

  ws.views = [{ state: 'frozen', ySplit: 5 }];
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '5:5',
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.3, footer: 0.3 }
  };
  ws.headerFooter.oddFooter = '&LSmartLoanIT&CPágina &P de &N&RMultas de préstamos activos estimadas al ' + fechaHoraLocal(meta.generadoComoFecha);
}

// Hoja 3: devoluciones con sus cobros, pagos y saldos.
function buildReturnsSheet(wb, returns, meta) {
  const ws = wb.addWorksheet('Devoluciones');
  ws.properties.tabColor = { argb: COL.green };
  ws.columns = [
    { width: 11 }, { width: 12 }, { width: 14 }, { width: 28 }, { width: 26 },
    { width: 17 }, { width: 12 }, { width: 8 }, { width: 26 }, { width: 24 },
    { width: 24 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 15 },
    { width: 15 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 30 }
  ];

  addReportHeader(ws, 21, {
    subtitle: 'Detalle de devoluciones y cobros',
    meta: `Generado el ${meta.generadoEn} · Por ${meta.generadoPor} · ${returns.length} registro(s)`,
    section: 'DEVOLUCIONES REGISTRADAS'
  });

  const headers = [
    'Devolución', 'Préstamo', 'Código alumno', 'Alumno', 'Equipo', 'Fecha devolución',
    'Estado equipo', 'Daño', 'Tipo de daño', 'Accesorios devueltos', 'Accesorios faltantes',
    'Días de retraso', 'Multa', 'Monto daño', 'Monto accesorios', 'Total aplicado',
    'Monto pagado', 'Saldo pendiente', 'Estado de pago', 'Método de pago', 'Observaciones'
  ];
  addTableHeader(ws, 5, headers);

  const pagoEstilo = {
    Pagado: COL.green,
    Pendiente: COL.red,
    Parcial: COL.amber,
    Condonado: COL.muted
  };

  if (!returns.length) {
    ws.mergeCells(6, 1, 6, 21);
    const vacio = ws.getCell(6, 1);
    vacio.value = 'No hay devoluciones registradas para exportar.';
    vacio.font = { name: FONT, size: 10, italic: true, color: { argb: COL.muted } };
    vacio.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    vacio.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.paper } };
  } else {
    const filas = returns.map((r) => {
      const total = numero(r.total_cobro);
      const pagado = numero(r.monto_pagado);
      const saldo = r.estado_pago === 'Condonado' ? 0 : Math.max(total - pagado, 0);
      return [
        { value: r.codigo_devolucion || ('REC-' + String(r.id_devolucion).padStart(3, '0')), align: 'center' },
        { value: r.codigo_prestamo || ('PRE-' + String(r.id_prestamo).padStart(3, '0')) },
        { value: r.codigo_alumno },
        { value: `${r.alumno_nombre || ''} ${r.alumno_apellido || ''}`.trim(), wrap: true },
        { value: r.equipo, wrap: true },
        { value: parseFecha(r.fecha_devolucion), numFmt: DATETIME_FMT, align: 'center' },
        { value: r.estado_devolucion },
        { value: r.tiene_dano ? 'Sí' : 'No', align: 'center', bold: !!r.tiene_dano, color: r.tiene_dano ? COL.red : COL.ink },
        { value: r.tipo_dano, wrap: true },
        { value: r.accesorios_devueltos, wrap: true },
        { value: r.accesorios_faltantes, wrap: true },
        { value: r.dias, align: 'center', bold: r.dias > 0, color: r.dias > 0 ? COL.red : COL.ink },
        { value: numero(r.monto_multa), numFmt: MONEY_FMT, align: 'right' },
        { value: numero(r.monto_dano), numFmt: MONEY_FMT, align: 'right' },
        { value: numero(r.monto_accesorios), numFmt: MONEY_FMT, align: 'right' },
        { value: total, numFmt: MONEY_FMT, align: 'right', bold: true },
        { value: pagado, numFmt: MONEY_FMT, align: 'right' },
        { value: saldo, numFmt: MONEY_FMT, align: 'right', bold: saldo > 0, color: saldo > 0 ? COL.red : COL.green },
        { value: total === 0 ? 'Sin cobro' : r.estado_pago, bold: true, color: pagoEstilo[r.estado_pago] || COL.ink },
        { value: r.metodo_pago },
        { value: r.observacion_devolucion, wrap: true }
      ];
    });
    const last = addTableRows(ws, 6, filas);
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: last, column: 21 } };

    const sums = [13, 14, 15, 16, 17, 18].map((col) =>
      returns.reduce((a, r) => {
        if (col === 13) return a + numero(r.monto_multa);
        if (col === 14) return a + numero(r.monto_dano);
        if (col === 15) return a + numero(r.monto_accesorios);
        if (col === 16) return a + numero(r.total_cobro);
        if (col === 17) return a + numero(r.monto_pagado);
        return a + (r.estado_pago === 'Condonado' ? 0 : Math.max(numero(r.total_cobro) - numero(r.monto_pagado), 0));
      }, 0)
    );
    addTotalsRow(ws, last + 2, 1, 12, 'TOTALES', [13, 14, 15, 16, 17, 18], {
      start: 6,
      end: last,
      values: sums
    });
  }

  ws.views = [{ state: 'frozen', ySplit: 5 }];
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '5:5',
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.3, footer: 0.3 }
  };
  ws.headerFooter.oddFooter = '&LSmartLoanIT&CPágina &P de &N&RDevoluciones vigentes (no anuladas)';
}

/**
 * Construye el libro completo a partir de las filas de la consulta.
 * @param {Array<object>} rows Filas de préstamos con su devolución.
 * @param {object} meta Datos de generación (texto y fecha).
 * @returns {ExcelJS.Workbook}
 */
function buildWorkbook(rows, meta) {
  const ahora = ahoraDePared();
  const loans = rows.map((r) => {
    const devuelto = !!r.id_devolucion;
    const vencimiento = parseFecha(r.fecha_devolucion_estimada);
    const dias = devuelto
      ? Math.max(0, numero(r.dias_retraso))
      : (vencimiento && ahora > vencimiento ? Math.max(1, Math.ceil((ahora - vencimiento) / DAY_MS)) : 0);
    const multa = devuelto ? numero(r.monto_multa) : dias * numero(r.multa_base);

    return {
      ...r,
      devuelto,
      dias,
      multa,
      estado: devuelto ? 'Devuelto' : (dias > 0 ? 'Atrasado' : 'Activo')
    };
  });
  const returns = loans.filter((l) => l.devuelto);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SmartLoanIT';
  wb.lastModifiedBy = 'SmartLoanIT';
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = 'Reporte general de préstamos';
  wb.subject = 'Préstamos y devoluciones de equipos';
  wb.company = 'SmartLoanIT';
  wb.calcProperties.fullCalcOnLoad = true;

  buildSummarySheet(wb, loans, returns, meta);
  buildLoansSheet(wb, loans, meta);
  buildReturnsSheet(wb, returns, meta);

  return wb;
}

module.exports = { buildWorkbook };
