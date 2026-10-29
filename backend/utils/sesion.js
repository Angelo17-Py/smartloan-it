const { opcionesCookieToken } = require('./cookies');

// Crea el manejador de logout con una función de conexión inyectable
function crearLogout(obtenerConexion) {
  return async function logout(req, res) {
    try {
      const conn = await obtenerConexion();
      const [result] = await conn.query(
        'UPDATE encargados SET token_version = token_version + 1 WHERE id_encargado = ?',
        [req.encargado.id]
      );
      if (Number(result.affectedRows) !== 1) {
        res.clearCookie('sl_token', opcionesCookieToken());
        return res.status(401).json({ mensaje: 'Sesión no válida' });
      }
      res.clearCookie('sl_token', opcionesCookieToken());
      res.json({ mensaje: 'Sesión cerrada' });
    } catch (err) {
      console.error('Error al cerrar sesión:', err.message);
      // Se elimina la cookie incluso si la BD falla, pero no se responde como éxito
      res.clearCookie('sl_token', opcionesCookieToken());
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  };
}

module.exports = { crearLogout };
