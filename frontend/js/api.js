// URL base de la API (mismo origen del frontend)
const API = window.location.origin;

// Función principal para hacer peticiones al backend con autenticación y timeout
async function apiFetch(url, options = {}) {
  if (!options.headers) options.headers = {};
  // La autenticación viaja en una cookie httpOnly; no se expone el token a JS.
  // Timeout de 15 segundos para evitar peticiones colgadas
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 15000);
  options.signal = controller.signal;
  let res;
  try {
    res = await fetch(API + url, options);
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Intenta de nuevo.');
    }
    throw new Error('Error de conexión con el servidor');
  }
  clearTimeout(timeout);
  // Si el token expiró, redirigimos al login (excepto en llamadas de fondo)
  if (res.status === 401 && !options.skipAuthRedirect) {
    localStorage.removeItem('encargado');
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    window.location.href = '/';
  }
  return res;
}

// Versión silenciosa de apiFetch para usarse en segundo plano sin redirigir al login
async function apiFetchBackground(url, options = {}) {
  options.skipAuthRedirect = true;
  try {
    const res = await apiFetch(url, options);
    if (res.status === 401) return null;
    return res;
  } catch {
    return null;
  }
}
