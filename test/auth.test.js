process.env.JWT_SECRET = 'smartloan-test-secret-with-32-plus-characters';
process.env.JWT_EXPIRES_IN = '1h';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { generarToken, crearVerificador } = require('../backend/middleware/auth');
const requireAdmin = require('../backend/middleware/requireAdmin');

function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; }
  };
}

function usuario(extra) {
  return Object.assign({
    id_encargado: 7,
    codigo: '1001',
    rol: 'admin',
    estado: 1,
    token_version: 0
  }, extra || {});
}

async function ejecutarVerificador(req, buscarUsuario) {
  const res = respuesta();
  let siguiente = false;
  await crearVerificador(buscarUsuario)(req, res, () => { siguiente = true; });
  return { res, siguiente };
}

test('genera y valida un token con id, código y versión', async () => {
  const token = generarToken(usuario());
  const req = { headers: { authorization: 'Bearer ' + token } };
  const { siguiente } = await ejecutarVerificador(req, async () => usuario());
  assert.equal(siguiente, true);
  assert.equal(req.encargado.id, 7);
  assert.equal(req.encargado.codigo, '1001');
  assert.equal(req.encargado.rol, 'admin');
});

test('acepta el token desde la cookie httpOnly', async () => {
  const token = generarToken(usuario({ id_encargado: 8, codigo: '1002' }));
  const req = { headers: { cookie: 'tema=oscuro; sl_token=' + token } };
  const { siguiente } = await ejecutarVerificador(req, async () => usuario({ id_encargado: 8, codigo: '1002' }));
  assert.equal(siguiente, true);
  assert.equal(req.encargado.codigo, '1002');
});

test('acepta tokens anteriores sin versión cuando la versión actual es 0', async () => {
  const token = jwt.sign({ id: 7, codigo: '1001', rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: 'Bearer ' + token } };
  const { siguiente } = await ejecutarVerificador(req, async () => usuario());
  assert.equal(siguiente, true);
});

test('rechaza una solicitud sin token', async () => {
  const { res, siguiente } = await ejecutarVerificador({ headers: {} }, async () => usuario());
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.mensaje, 'Token requerido');
});

test('rechaza un token inválido', async () => {
  const { res, siguiente } = await ejecutarVerificador(
    { headers: { authorization: 'Bearer token-invalido' } },
    async () => usuario()
  );
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});

test('rechaza un token expirado', async () => {
  const token = jwt.sign(
    { id: 7, codigo: '1001', rol: 'admin', v: 0, exp: Math.floor(Date.now() / 1000) - 60 },
    process.env.JWT_SECRET
  );
  const { res, siguiente } = await ejecutarVerificador(
    { headers: { authorization: 'Bearer ' + token } },
    async () => usuario()
  );
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});

test('rechaza un token con la firma manipulada', async () => {
  const token = generarToken(usuario());
  const manipulado = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
  const { res, siguiente } = await ejecutarVerificador(
    { headers: { authorization: 'Bearer ' + manipulado } },
    async () => usuario()
  );
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});

test('rechaza a un usuario desactivado aunque su token siga vigente', async () => {
  const token = generarToken(usuario());
  const { res, siguiente } = await ejecutarVerificador(
    { headers: { authorization: 'Bearer ' + token } },
    async () => usuario({ estado: 0 })
  );
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});

test('rechaza a un usuario inexistente o eliminado', async () => {
  const token = generarToken(usuario());
  const { res, siguiente } = await ejecutarVerificador(
    { headers: { authorization: 'Bearer ' + token } },
    async () => null
  );
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});

test('no concede acceso si falla la consulta del usuario', async () => {
  const token = generarToken(usuario());
  const originalError = console.error;
  console.error = function () {};
  try {
    const { res, siguiente } = await ejecutarVerificador(
      { headers: { authorization: 'Bearer ' + token } },
      async () => { throw new Error('BD no disponible'); }
    );
    assert.equal(siguiente, false);
    assert.equal(res.statusCode, 500);
  } finally {
    console.error = originalError;
  }
});

test('un cambio de contraseña o de versión invalida el token anterior', async () => {
  const token = generarToken(usuario({ token_version: 0 }));
  const { res, siguiente } = await ejecutarVerificador(
    { headers: { authorization: 'Bearer ' + token } },
    async () => usuario({ token_version: 1 })
  );
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
});

test('un administrador degradado usa el rol actual y pierde privilegios', async () => {
  const token = generarToken(usuario({ rol: 'admin' }));
  const req = { headers: { authorization: 'Bearer ' + token } };
  const { siguiente } = await ejecutarVerificador(req, async () => usuario({ rol: 'lectura' }));
  assert.equal(siguiente, true);
  assert.equal(req.encargado.rol, 'lectura');

  let siguienteAdmin = false;
  const res = respuesta();
  requireAdmin(req, res, () => { siguienteAdmin = true; });
  assert.equal(siguienteAdmin, false);
  assert.equal(res.statusCode, 403);
});
