// Pruebas del saneador de cadenas usado en entradas de texto.
const test = require('node:test');
const assert = require('node:assert/strict');
const { s } = require('../backend/utils/sanitize');

// El límite de longitud protege el tamaño de los campos antes de llegar a la BD.
test('recorta espacios y limita la longitud', () => {
  assert.equal(s('  SmartLoanIT  ', 20), 'SmartLoanIT');
  assert.equal(s('abcdef', 3), 'abc');
});

// Valores ausentes se normalizan a "" para evitar "null"/"undefined" en la BD.
test('devuelve cadena vacía para valores nulos o falsy', () => {
  assert.equal(s(null, 10), '');
  assert.equal(s(undefined, 10), '');
  assert.equal(s('', 10), '');
});
