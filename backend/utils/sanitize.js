// Función de sanitización: recorta y limpia strings para evitar datos muy largos o vacíos
// Recibe un valor y la longitud máxima, devuelve string vacío si no hay valor
const s = (v, n) => v ? String(v).trim().slice(0, n) : '';

module.exports = { s };
