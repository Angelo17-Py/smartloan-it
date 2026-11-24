/**
 * Describe los campos que cambiaron entre dos objetos para la auditoría.
 * @param {object} anterior Datos previos.
 * @param {object} nuevo Datos nuevos.
 * @param {Array<[string, string]>} campos Pares [etiqueta, propiedad].
 * @returns {string} Detalle con formato "Campo: "antes" → "después"" o cadena vacía.
 */
function describirCambios(anterior, nuevo, campos) {
  return campos
    .filter(function (par) {
      return String(anterior[par[1]] || '') !== String(nuevo[par[1]] || '');
    })
    .map(function (par) {
      return par[0] + ': "' + (anterior[par[1]] || '—') + '" → "' + (nuevo[par[1]] || '—') + '"';
    })
    .join(' · ');
}

module.exports = { describirCambios };
