const API = window.location.origin;

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
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
  if (res.status === 401 && !options.skipAuthRedirect) {
    localStorage.removeItem('encargado');
    localStorage.removeItem('token');
    window.location.href = '/';
  }
  return res;
}

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
