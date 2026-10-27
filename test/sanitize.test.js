const test = require('node:test');
const assert = require('node:assert/strict');
const { s } = require('../backend/utils/sanitize');

test('recorta espacios y limita la longitud', () => {
  assert.equal(s('  SmartLoan IT  ', 20), 'SmartLoan IT');
  assert.equal(s('abcdef', 3), 'abc');
});

test('devuelve cadena vacía para valores nulos o falsy', () => {
  assert.equal(s(null, 10), '');
  assert.equal(s(undefined, 10), '');
  assert.equal(s('', 10), '');
});
