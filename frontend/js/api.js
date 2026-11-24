// URL base de la API: mismo origen que sirve el frontend, sin configuración extra.
const API = window.location.origin;

/**
 * Realiza una petición al backend con timeout y manejo centralizado de sesión.
 * La cookie httpOnly viaja sola, por lo que nunca se manipula el token en JS.
 * Ante un 401 limpia el estado local y redirige al login salvo que la llamada
 * sea de fondo (skipAuthRedirect), para no interrumpir al usuario.
 *
 * @param {string} url Ruta relativa del endpoint (ej. "/alumnos").
 * @param {RequestInit} [options] Opciones de fetch; se le agrega la señal de aborto.
 * @returns {Promise<Response>} Respuesta cruda para que el llamador decida cómo leerla.
 * @throws {Error} Si hay timeout o fallo de red, con mensaje apto para mostrar.
 */
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

/**
 * Variante silenciosa de apiFetch para sondeos en segundo plano.
 * Devuelve null si no hay sesión o hay error de red, de modo que el llamador
 * pueda ignorar el fallo sin disparar redirecciones ni mensajes.
 *
 * @param {string} url Ruta relativa del endpoint.
 * @param {RequestInit} [options] Opciones de fetch.
 * @returns {Promise<Response|null>} Respuesta, o null si no fue posible obtenerla.
 */
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
