const test = require('node:test');
const assert = require('node:assert/strict');
const { crearLogout } = require('../backend/utils/sesion');
const { opcionesCookieToken } = require('../backend/utils/cookies');

function respuesta() {
  return {
    statusCode: 200,
    body: null,
    cookiesLimpiadas: [],
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; },
    cookie() {},
    clearCookie(nombre, opciones) { this.cookiesLimpiadas.push({ nombre, opciones }); }
  };
}

function peticion() {
  return { encargado: { id: 7, codigo: '1001', rol: 'admin' } };
}

test('logout exitoso incrementa la versión y borra la cookie', async () => {
  let consulta = null;
  const conn = {
    query: async (sql, params) => {
      consulta = { sql, params };
      return [{ affectedRows: 1 }];
    }
  };
  const res = respuesta();
  await crearLogout(async () => conn)(peticion(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mensaje, 'Sesión cerrada');
  assert.match(consulta.sql, /token_version = token_version \+ 1/);
  assert.deepEqual(consulta.params, [7]);
  assert.equal(res.cookiesLimpiadas.length, 1);
  assert.equal(res.cookiesLimpiadas[0].nombre, 'sl_token');
});

test('si la base de datos falla no responde como logout exitoso', async () => {
  const conn = { query: async () => { throw new Error('BD no disponible'); } };
  const res = respuesta();
  const originalError = console.error;
  console.error = function () {};
  try {
    await crearLogout(async () => conn)(peticion(), res);
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.notEqual(res.body.mensaje, 'Sesión cerrada');
  assert.equal(res.cookiesLimpiadas.length, 1);
});

test('si el usuario no existe no responde como logout exitoso', async () => {
  const conn = { query: async () => [{ affectedRows: 0 }] };
  const res = respuesta();
  await crearLogout(async () => conn)(peticion(), res);
  assert.equal(res.statusCode, 401);
  assert.notEqual(res.body.mensaje, 'Sesión cerrada');
  assert.equal(res.cookiesLimpiadas.length, 1);
});

test('las opciones de cookie son seguras en producción', () => {
  const anterior = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const opciones = opcionesCookieToken();
    assert.equal(opciones.httpOnly, true);
    assert.equal(opciones.secure, true);
    assert.equal(opciones.sameSite, 'strict');
    assert.equal(opciones.path, '/');
  } finally {
    if (anterior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = anterior;
  }
});
