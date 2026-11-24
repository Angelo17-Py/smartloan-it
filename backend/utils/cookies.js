/**
 * Opciones de la cookie de sesión, compartidas entre login y logout.
 * httpOnly impide leerla desde JavaScript (mitiga XSS), secure exige HTTPS
 * en producción, sameSite strict frena CSRF y path / la habilita en todo el sitio.
 * clearCookie debe usar las mismas opciones para eliminar exactamente esa cookie.
 * @returns {object} Opciones compatibles con res.cookie/clearCookie.
 */
function opcionesCookieToken() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
}

module.exports = { opcionesCookieToken };
