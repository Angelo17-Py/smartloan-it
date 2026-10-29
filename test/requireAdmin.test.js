const test = require('node:test');
const assert = require('node:assert/strict');
const requireAdmin = require('../backend/middleware/requireAdmin');

function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; }
  };
}

test('permite el paso a un administrador', () => {
  let siguiente = false;
  requireAdmin({ encargado: { rol: 'admin' } }, respuesta(), () => { siguiente = true; });
  assert.equal(siguiente, true);
});

test('rechaza a un operador con 403', () => {
  const res = respuesta();
  let siguiente = false;
  requireAdmin({ encargado: { rol: 'lectura' } }, res, () => { siguiente = true; });
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.mensaje, /administrador/i);
});

test('rechaza una solicitud sin encargado autenticado', () => {
  const res = respuesta();
  let siguiente = false;
  requireAdmin({}, res, () => { siguiente = true; });
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 403);
});
