const { opcionesCookieToken } = require('./cookies');

/**
 * Crea el manejador de cierre de sesión con la conexión inyectable, lo que facilita las pruebas.
 * Incrementa token_version para revocar todos los tokens ya emitidos al usuario:
 * aunque alguien conserve una copia del token, deja de ser válido.
 * @param {Function} obtenerConexion Devuelve una conexión de MySQL.
 * @returns {Function} Handler asíncrono (req, res).
 */
function crearLogout(obtenerConexion) {
  return async function logout(req, res) {
    try {
      const conn = await obtenerConexion();
      const [result] = await conn.query(
        'UPDATE encargados SET token_version = token_version + 1 WHERE id_encargado = ?',
        [req.encargado.id]
      );
      // Si el usuario ya no existe, se limpia la cookie sin reportar un logout exitoso.
      if (Number(result.affectedRows) !== 1) {
        res.clearCookie('sl_token', opcionesCookieToken());
        return res.status(401).json({ mensaje: 'Sesión no válida' });
      }
      res.clearCookie('sl_token', opcionesCookieToken());
      res.json({ mensaje: 'Sesión cerrada' });
    } catch (err) {
      console.error('Error al cerrar sesión:', err.message);
      // Se elimina la cookie incluso si la BD falla, pero no se responde como éxito:
      // así el cliente no queda con una sesión que parece válida.
      res.clearCookie('sl_token', opcionesCookieToken());
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  };
}

module.exports = { crearLogout };
