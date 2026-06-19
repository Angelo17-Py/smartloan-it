/* ============================================
   SmartLoan IT — Shared Utilities
   ============================================ */

function st(msg, t) {
  t = t || 't-ok';
  var e = document.getElementById('toast');
  if (!e) {
    e = document.createElement('div');
    e.id = 'toast';
    e.className = 'toast';
    e.setAttribute('role', 'alert');
    document.body.appendChild(e);
  }
  e.textContent = msg;
  e.className = 'toast show ' + t;
  e.classList.remove('t-ok', 't-err', 't-warn');
  e.classList.add(t);
  clearTimeout(e._t);
  e._t = setTimeout(function () { e.className = 'toast'; }, 3200);
}

function clearF(f) {
  var el = document.getElementById(f);
  if (el) el.classList.remove('err');
  var fer = document.getElementById('ferr-' + f);
  if (fer) fer.classList.remove('show');
}

function clearFE(f, prefix) {
  prefix = prefix || '';
  var el = document.getElementById(prefix + f);
  if (el) el.classList.remove('err');
  var fer = document.getElementById('ferr-' + prefix + f);
  if (fer) fer.classList.remove('show');
}

function ff(d) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function fn(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('es-PY');
}

function showError(container, opts) {
  opts = opts || {};
  var msg = opts.message || 'Ocurri\u00f3 un error al cargar los datos.';
  var retry = opts.retry || null;

  var el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  el._orig = el.innerHTML;

  var html = '<div class="empty-state">' +
    '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
    '<h3 style="color:var(--danger)">Error</h3><p>' + msg + '</p>';
  if (retry) {
    html += '<button class="btn btn-danger" onclick="' + retry + '">Reintentar</button>';
  }
  html += '</div>';
  el.innerHTML = html;
}

function initTheme() {
  var saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else if (saved === 'dark') {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  } else if (window.matchMedia('(prefers-color-scheme:light)').matches) {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle('light');
  if (document.documentElement.classList.contains('light')) {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
  localStorage.setItem('theme', document.documentElement.classList.contains('light') ? 'light' : 'dark');
}

function esAdmin() {
  return localStorage.getItem('rol') === 'admin';
}

async function safeJson(r) {
  if (r.status === 204) return {};
  if (!r) return {};
  try {
    return await r.json();
  } catch (e) {
    console.warn('safeJson: error parseando respuesta JSON', e);
    return {};
  }
}

function normalizeText(s) {
  if (!s) return '';
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function esc(t) {
  return String(t).replace(/[&<>"']/g, function (m) {
    return m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '"' ? '&quot;' : '&#39;';
  });
}

function fadeOutNavigate(url) {
  if (!url || url === window.location.pathname) return;
  document.body.classList.add('page-exit');
  setTimeout(function () {
    document.body.classList.remove('page-exit');
    window.location.href = url;
  }, 300);
}

function logout() {
  showConfirm('Cerrar sesi\u00f3n del sistema?', function () {
    localStorage.removeItem('encargado');
    localStorage.removeItem('token');
    window.location.href = '/';
  });
}

/* Confirm modal (replaces native confirm()) */
function showConfirm(msg, onConfirm) {
  var overlay = document.getElementById('confirm-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirm-modal';
    overlay.className = 'confirm-overlay';
    overlay.innerHTML =
      '<div class="confirm-box">' +
      '<div class="cb-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>' +
      '<h3>Confirmar acci\u00f3n</h3>' +
      '<p id="confirm-msg"></p>' +
      '<div class="cb-btns">' +
      '<button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>' +
      '<button class="btn btn-primary" id="confirm-ok">Confirmar</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeConfirm(); });
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  }
  document.getElementById('confirm-msg').textContent = msg;
  overlay.classList.add('show');
  var okBtn = document.getElementById('confirm-ok');
  okBtn.onclick = function () {
    closeConfirm();
    if (typeof onConfirm === 'function') onConfirm();
  };
  okBtn.focus();

  function keyHandler(e) {
    if (e.key === 'Escape') { closeConfirm(); document.removeEventListener('keydown', keyHandler); }
  }
  document.addEventListener('keydown', keyHandler);
  var origClose = overlay._closeHandler;
  if (origClose) overlay.removeEventListener('click', origClose);
  overlay._closeHandler = function (e) { if (e.target === overlay) { closeConfirm(); document.removeEventListener('keydown', keyHandler); } };
  overlay.addEventListener('click', overlay._closeHandler);
}

function closeConfirm() {
  var overlay = document.getElementById('confirm-modal');
  if (overlay) overlay.classList.remove('show');
}

/* Restore body styles on bfcache restore (fix back/forward navigation) */
window.addEventListener('pageshow', function() {
  document.body.style.opacity = '';
  document.body.style.transform = '';
  document.body.style.transition = '';
});

/* Spotlight search system */
function initSpotlight(pages) {
  pages = pages || [];
  var overlay = document.createElement('div');
  overlay.className = 'spotlight-overlay';
  overlay.id = 'spotlight';
  overlay.innerHTML =
    '<div class="spotlight">' +
    '<input class="spotlight-input" id="sp-input" type="text" placeholder="Buscar alumnos, equipos, prestamos\u2026" autocomplete="off" spellcheck="false">' +
    '<div class="spotlight-results" id="sp-results"><div class="spotlight-empty">Escribe para buscar\u2026</div></div>' +
    '<div class="spotlight-shortcuts"><kbd>\u2191</kbd><kbd>\u2193</kbd> navegar <kbd>\u23CE</kbd> abrir <kbd>Esc</kbd> cerrar</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var input = document.getElementById('sp-input');
  var results = document.getElementById('sp-results');
  var idx = -1;

  window.closeSpotlight = function() {
    overlay.classList.remove('show');
    overlay.style.pointerEvents = 'none';
    input.blur();
  };

  function openSpotlight() {
    overlay.classList.add('show');
    overlay.style.pointerEvents = 'all';
    input.value = '';
    results.innerHTML = '<div class="spotlight-empty">Escribe para buscar\u2026</div>';
    idx = -1;
    setTimeout(function () { input.focus(); }, 100);
  }

  function navigate(dir) {
    var items = results.querySelectorAll('.spotlight-item');
    if (!items.length) return;
    if (idx >= 0) items[idx].classList.remove('active');
    idx = (idx + dir + items.length) % items.length;
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  function selectActive() {
    var items = results.querySelectorAll('.spotlight-item');
    if (idx >= 0 && items[idx]) items[idx].click();
  }

  var spotlightCache = { alumnos: null, equipos: null };

  async function search(q) {
    q = q.trim();
    if (!q) { results.innerHTML = '<div class="spotlight-empty">Escribe para buscar\u2026</div>'; return; }
    idx = -1;
    var nq = normalizeText(q);
    var allPages = pages.slice();
    if (nq.length >= 2) {
      if (!spotlightCache.alumnos) {
        try { var r1 = await apiFetch('/alumnos'); if (r1.ok) spotlightCache.alumnos = await r1.json(); } catch (e) {}
      }
      if (!spotlightCache.equipos) {
        try { var r2 = await apiFetch('/equipos'); if (r2.ok) spotlightCache.equipos = await r2.json(); } catch (e) {}
      }
      if (spotlightCache.alumnos) {
        spotlightCache.alumnos.forEach(function (a) {
          var name = normalizeText(a.nombre + ' ' + a.apellido);
          var code = normalizeText(a.codigo_alumno || '');
          if (name.includes(nq) || code.includes(nq)) {
            allPages.push({ label: a.codigo_alumno + ' \u2014 ' + a.nombre + ' ' + a.apellido, sub: a.carrera || 'Alumno', url: '/alumnos/alumnos.html' });
          }
        });
      }
      if (spotlightCache.equipos) {
        spotlightCache.equipos.forEach(function (e) {
          var name = normalizeText(e.nombre + ' ' + e.marca);
          if (name.includes(nq)) {
            allPages.push({ label: e.nombre, sub: e.tipo + ' \u2022 ' + e.marca, url: '/equipos/equipos.html' });
          }
        });
      }
    }
    var filtered = allPages.filter(function (p) {
      return normalizeText(p.label + ' ' + p.sub).includes(nq);
    });
    if (!filtered.length) {
      results.innerHTML = '<div class="spotlight-empty">Sin resultados para \u201c' + q + '\u201d</div>';
      return;
    }
    results.innerHTML = filtered.map(function (p, i) {
      var icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
      return '<div class="spotlight-item" data-index="' + i + '" onclick="window.location.href=\'' + p.url + '\';closeSpotlight()">' +
        '<div class="si-icon">' + icon + '</div>' +
        '<div class="si-info"><div class="si-title">' + p.label + '</div><div class="si-sub">' + p.sub + '</div></div>' +
        '</div>';
    }).join('');
  }

  var debounceTimer;
  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { search(input.value); }, 300);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSpotlight();
    else if (e.key === 'ArrowDown') { e.preventDefault(); navigate(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); selectActive(); }
  });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSpotlight(); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && e.target === document.body)) {
      e.preventDefault(); openSpotlight();
    }
  });
}

/* Smooth fade-out on navigation */
document.addEventListener('click', function (e) {
  var el = e.target.closest('a[href]');
  if (!el || !el.href) return;
  if (el.host !== window.location.host) return;
  if (el.target === '_blank') return;
  if (el.getAttribute('href') === '#' || el.getAttribute('href') === '') return;
  if (el.hasAttribute('download')) return;
  if (e.ctrlKey || e.metaKey || e.shiftKey) return;
  var samePage = el.pathname === window.location.pathname;
  if (samePage) return;
  e.preventDefault();
  fadeOutNavigate(el.href);
});
