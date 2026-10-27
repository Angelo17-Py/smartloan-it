process.env.JWT_SECRET = 'smartloan-test-secret-with-32-plus-characters';
process.env.JWT_EXPIRES_IN = '1h';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generarToken, verificarToken } = require('../backend/middleware/auth');

function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; }
  };
}

test('genera y valida un token con id y código', () => {
  const token = generarToken({ id_encargado: 7, codigo: '1001', rol: 'admin' });
  const req = { headers: { authorization: 'Bearer ' + token } };
  let siguiente = false;
  verificarToken(req, respuesta(), () => { siguiente = true; });
  assert.equal(siguiente, true);
  assert.equal(req.encargado.id, 7);
  assert.equal(req.encargado.codigo, '1001');
  assert.equal(req.encargado.rol, 'admin');
});

test('acepta el token desde la cookie httpOnly', () => {
  const token = generarToken({ id_encargado: 8, codigo: '1002', rol: 'admin' });
  const req = { headers: { cookie: 'tema=oscuro; sl_token=' + token } };
  let siguiente = false;
  verificarToken(req, respuesta(), () => { siguiente = true; });
  assert.equal(siguiente, true);
  assert.equal(req.encargado.codigo, '1002');
});

test('rechaza una solicitud sin token', () => {
  const res = respuesta();
  let siguiente = false;
  verificarToken({ headers: {} }, res, () => { siguiente = true; });
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.mensaje, 'Token requerido');
});

test('rechaza un token inválido', () => {
  const res = respuesta();
  let siguiente = false;
  verificarToken({ headers: { authorization: 'Bearer token-invalido' } }, res, () => { siguiente = true; });
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});
