/**
 * Normaliza un valor para almacenarlo: recorta espacios y limita la longitud.
 * No escapa HTML ni SQL; las consultas deben seguir usando parámetros (?).
 * @param {*} v Valor original.
 * @param {number} n Longitud máxima permitida.
 * @returns {string} Texto limpio, o cadena vacía si no hay valor.
 */
const s = (v, n) => v ? String(v).trim().slice(0, n) : '';

module.exports = { s };
