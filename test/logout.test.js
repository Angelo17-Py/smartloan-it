// Pruebas del cierre de sesión: revocación del token en BD, borrado de cookie
// y atributos de seguridad de la cookie en producción.
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearLogout } = require('../backend/utils/sesion');
const { opcionesCookieToken } = require('../backend/utils/cookies');

// Doble de respuesta que además registra las cookies eliminadas.
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

// Petición ya autenticada por el middleware, como llega al controlador real.
function peticion() {
  return { encargado: { id: 7, codigo: '1001', rol: 'admin' } };
}

// Un logout válido debe incrementar token_version (revoca el token) y limpiar la cookie.
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

// Si la BD falla, la cookie igual se elimina para no dejar una sesión colgada,
// pero la respuesta no debe simular un logout exitoso.
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

// affectedRows = 0 indica que el usuario ya no existe; se responde 401 tras limpiar la cookie.
test('si el usuario no existe no responde como logout exitoso', async () => {
  const conn = { query: async () => [{ affectedRows: 0 }] };
  const res = respuesta();
  await crearLogout(async () => conn)(peticion(), res);
  assert.equal(res.statusCode, 401);
  assert.notEqual(res.body.mensaje, 'Sesión cerrada');
  assert.equal(res.cookiesLimpiadas.length, 1);
});

// En producción la cookie debe ser httpOnly, Secure, SameSite=Strict y de todo el sitio.
// Se restaura NODE_ENV al final para no afectar otras pruebas.
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
