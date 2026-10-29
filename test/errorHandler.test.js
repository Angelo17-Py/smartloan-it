const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../backend/middleware/errorHandler');

function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; }
  };
}

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
