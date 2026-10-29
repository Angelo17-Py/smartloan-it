// Opciones compartidas de la cookie de sesión
function opcionesCookieToken() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
}

module.exports = { opcionesCookieToken };
