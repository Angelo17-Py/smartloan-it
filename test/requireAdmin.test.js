// Pruebas del middleware de autorización por rol: solo "admin" puede continuar.
const test = require('node:test');
const assert = require('node:assert/strict');
const requireAdmin = require('../backend/middleware/requireAdmin');

// Doble mínimo de respuesta Express para verificar el rechazo.
function respuesta() {
  return {
    statusCode: 200,
    body: null,
    status(codigo) { this.statusCode = codigo; return this; },
    json(data) { this.body = data; return this; }
  };
}

// El rol admin debe delegar en el siguiente middleware o controlador.
test('permite el paso a un administrador', () => {
  let siguiente = false;
  requireAdmin({ encargado: { rol: 'admin' } }, respuesta(), () => { siguiente = true; });
  assert.equal(siguiente, true);
});

// Un usuario de solo lectura recibe 403 y no ejecuta la ruta.
test('rechaza a un operador con 403', () => {
  const res = respuesta();
  let siguiente = false;
  requireAdmin({ encargado: { rol: 'lectura' } }, res, () => { siguiente = true; });
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.mensaje, /administrador/i);
});

// Sin encargado autenticado tampoco debe haber acceso: falla de forma segura.
test('rechaza una solicitud sin encargado autenticado', () => {
  const res = respuesta();
  let siguiente = false;
  requireAdmin({}, res, () => { siguiente = true; });
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 403);
});
