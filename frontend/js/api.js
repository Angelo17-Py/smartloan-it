const API = window.location.origin;

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  const res = await fetch(API + url, options);
  if (res.status === 401) {
    localStorage.removeItem('encargado');
    localStorage.removeItem('token');
    window.location.href = '/';
  }
  return res;
}
