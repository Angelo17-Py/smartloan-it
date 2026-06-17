const API = window.location.origin;

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  let res;
  try {
    res = await fetch(API + url, options);
  } catch (e) {
    throw new Error('Error de conexión con el servidor');
  }
  if (res.status === 401) {
    localStorage.removeItem('encargado');
    localStorage.removeItem('token');
    window.location.href = '/';
  }
  return res;
}
