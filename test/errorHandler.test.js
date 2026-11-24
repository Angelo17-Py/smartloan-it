// Verifica que el manejador global no filtre detalles internos en errores 500
// y que conserve los mensajes controlados de los errores 4xx.
const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../backend/middleware/errorHandler');

// Doble mínimo de respuesta Express para capturar el código y el cuerpo enviados.
function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; }
  };
}

// El mensaje original (posible SQL o ruta interna) no debe llegar al cliente.
// console.error se silencia para mantener limpia la salida de la prueba.
test('oculta el mensaje interno en errores 500', () => {
  const res = respuesta();
  const originalError = console.error;
  console.error = function () {};
  try {
    const err = new Error('SELECT * FROM tabla_secreta falló');
    err.statusCode = 500;
    errorHandler(err, {}, res, function () {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.mensaje, 'Error interno del servidor');
});

// Los errores de validación (4xx) usan err.mensaje como texto público seguro.
test('conserva mensajes controlados en errores 4xx', () => {
  const res = respuesta();
  const originalError = console.error;
  console.error = function () {};
  try {
    const err = new Error('detalle interno');
    err.statusCode = 400;
    err.mensaje = 'Solicitud inválida';
    errorHandler(err, {}, res, function () {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.mensaje, 'Solicitud inválida');
});

// Los errores conocidos de MySQL se traducen a respuestas públicas controladas.
test('mapea códigos duplicados de MySQL a 409', () => {
  const res = respuesta();
  const err = new Error('Duplicate entry');
  err.code = 'ER_DUP_ENTRY';
  errorHandler(err, {}, res, function () {});
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.mensaje, 'El código ya está registrado');
});

test('usa el mensaje del trigger en errores 400', () => {
  const res = respuesta();
  const err = new Error('Trigger error');
  err.code = 'ER_SIGNAL_EXCEPTION';
  err.sqlMessage = 'El equipo no está disponible para préstamo';
  errorHandler(err, {}, res, function () {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.mensaje, 'El equipo no está disponible para préstamo');
});
