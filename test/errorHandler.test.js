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
