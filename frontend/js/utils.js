/* ============================================
   SmartLoan IT — Utilidades compartidas
   Usadas en todas las páginas del frontend
   ============================================ */

// Muestra un toast (notificación flotante) con mensaje y tipo (t-ok, t-err, t-warn)
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

// Limpia el estado de error de un campo del formulario
function clearF(f) {
  var el = document.getElementById(f);
  if (el) el.classList.remove('err');
  var fer = document.getElementById('ferr-' + f);
  if (fer) fer.classList.remove('show');
}

// Limpia error de campos en modales (con prefijo tipo "edit-")
function clearFE(f, prefix) {
  prefix = prefix || '';
  var el = document.getElementById(prefix + f);
  if (el) el.classList.remove('err');
  var fer = document.getElementById('ferr-' + prefix + f);
  if (fer) fer.classList.remove('show');
}

// Formatea una fecha para mostrar en pantalla (dd/mm/aaaa hh:mm)
function ff(d) {
  if (!d) return '\u2014';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(d)) d = d.replace(' ', 'T');
  return new Date(d).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

// Formatea un número con separador de miles (estilo Paraguay)
function fn(n) {
  if (n == null || isNaN(n)) return '0';
  if (typeof n === 'string') n = parseFloat(n);
  return Number(n).toLocaleString('es-PY');
}

// Muestra un mensaje de error con opción de reintentar
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

// Inicializa el tema oscuro/claro según preferencia guardada o del sistema
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

// Alterna entre tema claro y oscuro manualmente
function toggleTheme() {
  document.documentElement.classList.toggle('light');
  if (document.documentElement.classList.contains('light')) {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
  localStorage.setItem('theme', document.documentElement.classList.contains('light') ? 'light' : 'dark');
}

// Verifica si el usuario autenticado tiene rol de administrador
function esAdmin() {
  return localStorage.getItem('rol') === 'admin';
}

// Parsea una respuesta HTTP a JSON, manejando errores silenciosamente
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

// Normaliza texto para búsqueda: quita acentos y pasa a minúsculas
function normalizeText(s) {
  if (!s) return '';
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Escapa caracteres HTML para evitar XSS
function esc(t) {
  return String(t).replace(/[&<>"']/g, function (m) {
    return m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m === '"' ? '&quot;' : '&#39;';
  });
}

/* Auto-resize textarea as user types */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// Transición suave al navegar entre páginas con fade-out
function fadeOutNavigate(url) {
  if (!url || url === window.location.pathname) return;
  document.body.classList.add('page-exit');
  setTimeout(function () {
    window.location.href = url;
  }, 300);
}

// Cierra la sesión del usuario actual
function logout() {
  showConfirm('Cerrar sesi\u00f3n del sistema?', function () {
    fetch('/encargados/logout', { method: 'POST' }).catch(function () {}).finally(function () {
      localStorage.removeItem('encargado');
      localStorage.removeItem('token');
      localStorage.removeItem('rol');
      window.location.href = '/';
    });
  });
}

/* Modal de confirmación personalizado (reemplaza al confirm() nativo) */
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

  // Cerrar con tecla Escape
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

/* Restaura estilos del body al volver con el botón atrás (bfcache) */
window.addEventListener('pageshow', function(e) {
  document.body.classList.remove('page-exit');
  document.body.style.opacity = '';
  document.body.style.transform = '';
  document.body.style.transition = '';
  // Si viene del bfcache (back/forward), re-dispara la animación de entrada
  if(e.persisted){
    document.body.classList.remove('page-loaded');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        document.body.classList.add('page-loaded');
      });
    });
  }
});

/* Sistema de búsqueda tipo Spotlight (similar a macOS) */
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

  // Navegación por resultados con flechas
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

  // Caché para no recargar alumnos y equipos en cada búsqueda
  var spotlightCache = { alumnos: null, equipos: null };

  async function search(q) {
    q = q.trim();
    if (!q) { results.innerHTML = '<div class="spotlight-empty">Escribe para buscar\u2026</div>'; return; }
    idx = -1;
    var nq = normalizeText(q);
    var allPages = pages.slice();
    // Si hay al menos 2 caracteres, buscamos en alumnos y equipos del backend
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
            allPages.push({ label: a.codigo_alumno + ' \u2014 ' + a.nombre + ' ' + a.apellido, sub: [a.carrera, a.curso, a.turno].filter(Boolean).join(' · ') || 'Alumno', url: '/alumnos/alumnos.html' });
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

  // Búsqueda con debounce para no saturar el backend
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
  // Atajo de teclado: Ctrl+K o Cmd+K para abrir spotlight
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && e.target === document.body)) {
      e.preventDefault(); openSpotlight();
    }
  });
}

/* Intercepta clicks en enlaces internos para hacer transición suave */
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

/* Inicializa animaciones de scroll reveal para elementos con clase .reveal */
function initScrollReveal(){
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function(el){ observer.observe(el); });
}

/* Inicia la animación de entrada de la página al cargar */
function initPageEntrance(){
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      document.body.classList.add('page-loaded');
    });
  });
}

/* ===== NOTIFICACIONES DE VENCIMIENTO ===== */
function initNotificaciones(){
  if(!localStorage.getItem('encargado')) return;
  if(!/\/home\/dashboard(\.html)?$/.test(window.location.pathname)) return;
  if(/\/login\//.test(window.location.pathname)) return;
  if(document.getElementById('notif-wrap')) return;
  var target=document.querySelector('.dash-header-right')||document.querySelector('.page-header');
  if(!target) return;

  var wrap=document.createElement('div');
  wrap.className='notif-wrap';
  wrap.id='notif-wrap';
  wrap.innerHTML=
    '<button type="button" class="notif-btn" id="notif-btn" aria-label="Notificaciones de vencimiento" aria-expanded="false" aria-controls="notif-panel">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>'+
      '<span class="notif-badge" id="notif-badge" hidden>0</span>'+
    '</button>';
  target.appendChild(wrap);

  // El panel se monta fuera del encabezado para que ningún contexto de apilamiento lo oculte
  var panel=document.createElement('div');
  panel.className='notif-panel';
  panel.id='notif-panel';
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','Notificaciones de vencimiento');
  panel.innerHTML=
    '<div class="notif-head"><div><h3>Vencimientos</h3><span id="notif-sub">Préstamos vencidos o por vencer</span></div></div>'+
    '<div class="notif-list" id="notif-list"><div class="notif-empty">Cargando…</div></div>'+
    '<div class="notif-foot"><a href="/devoluciones/devoluciones.html">Ir a devoluciones</a></div>';
  document.body.appendChild(panel);

  var btn=document.getElementById('notif-btn');
  var list=document.getElementById('notif-list');
  var badge=document.getElementById('notif-badge');
  var sub=document.getElementById('notif-sub');
  var alertas=[];
  var abierto=false;
  var READ_KEY='sl_notif_leidas';

  function posicionar(){
    if(window.innerWidth<=600){
      panel.style.top='';panel.style.right='';
      return;
    }
    var r=btn.getBoundingClientRect();
    panel.style.top=(r.bottom+10)+'px';
    panel.style.right=Math.max(12,window.innerWidth-r.right)+'px';
  }

  function firma(a){
    return a.id_prestamo+':'+(Number(a.minutos_restantes)<0?'v':'p')+':'+a.fecha_devolucion_estimada;
  }
  function leerLeidas(){
    try{ var v=JSON.parse(localStorage.getItem(READ_KEY)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; }
  }
  function guardarLeidas(v){
    try{ localStorage.setItem(READ_KEY,JSON.stringify(v.slice(-300))); }catch(e){}
  }
  function actualizarBadge(){
    var leidas=leerLeidas();
    var pendientes=alertas.filter(function(a){return leidas.indexOf(firma(a))===-1;}).length;
    if(pendientes>0){
      badge.hidden=false;
      badge.textContent=pendientes>9?'9+':String(pendientes);
    } else {
      badge.hidden=true;
    }
  }
  function marcarLeidas(){
    var leidas=leerLeidas();
    alertas.forEach(function(a){
      var f=firma(a);
      if(leidas.indexOf(f)===-1) leidas.push(f);
    });
    guardarLeidas(leidas);
    actualizarBadge();
  }
  function textoRestante(min){
    var abs=Math.abs(Math.round(min));
    var dias=Math.floor(abs/1440);
    var horas=Math.floor((abs%1440)/60);
    var mins=abs%60;
    if(dias>0) return dias+' d'+(horas?' '+horas+' h':'');
    if(horas>0) return horas+' h'+(mins?' '+mins+' min':'');
    return mins+' min';
  }
  function render(){
    var vencidos=alertas.filter(function(a){return Number(a.minutos_restantes)<0;}).length;
    var porVencer=alertas.length-vencidos;
    if(!alertas.length) sub.textContent='Sin vencimientos próximos';
    else if(vencidos && !porVencer) sub.textContent=vencidos+' vencido'+(vencidos!==1?'s':'');
    else if(vencidos) sub.textContent=vencidos+' vencido'+(vencidos!==1?'s':'')+' · '+porVencer+' por vencer';
    else sub.textContent=porVencer+' por vencer';
    if(!alertas.length){
      list.innerHTML='<div class="notif-empty">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>'+
        '<span>No hay préstamos vencidos ni por vencer en las próximas 48 horas.</span></div>';
      return;
    }
    var lateIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    var soonIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    list.innerHTML=alertas.map(function(a){
      var late=Number(a.minutos_restantes)<0;
      var txt=textoRestante(a.minutos_restantes);
      var due=late?'Vencido hace '+txt:'Vence en '+txt;
      return '<a class="notif-item '+(late?'late':'soon')+'" href="/devoluciones/devoluciones.html?prestamo='+encodeURIComponent(a.id_prestamo)+'">'+
        '<span class="ni-icon">'+(late?lateIcon:soonIcon)+'</span>'+
        '<span class="ni-body">'+
          '<span class="ni-title">'+esc(a.equipo)+(a.codigo_prestamo?' <span class="ni-code">'+esc(a.codigo_prestamo)+'</span>':'')+'</span>'+
          '<span class="ni-sub">'+esc(a.alumno_nombre)+' '+esc(a.alumno_apellido)+' · '+esc(a.codigo_alumno)+'</span>'+
          '<span class="ni-due">'+due+' · '+ff(a.fecha_devolucion_estimada)+'</span>'+
        '</span>'+
      '</a>';
    }).join('');
  }
  function toggle(open){
    abierto=(typeof open==='boolean')?open:!abierto;
    if(abierto) posicionar();
    panel.classList.toggle('show',abierto);
    btn.setAttribute('aria-expanded',String(abierto));
    if(abierto) marcarLeidas();
  }
  async function cargarAlertas(){
    try{
      var r=await apiFetch('/prestamos/alertas');
      if(!r.ok){ mostrarError(); return; }
      var d=await safeJson(r);
      alertas=Array.isArray(d.alertas)?d.alertas:[];
      render();
      if(abierto) marcarLeidas(); else actualizarBadge();
    }catch(e){ mostrarError(); }
  }
  function mostrarError(){
    list.innerHTML='<div class="notif-empty"><span>No se pudieron cargar las notificaciones.</span></div>';
  }

  btn.addEventListener('click',function(e){ e.stopPropagation(); toggle(); });
  document.addEventListener('click',function(e){ if(abierto && !wrap.contains(e.target) && !panel.contains(e.target)) toggle(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && abierto) toggle(false); });
  window.addEventListener('resize',function(){ if(abierto) posicionar(); });
  window.addEventListener('scroll',function(){ if(abierto) posicionar(); },{passive:true});

  cargarAlertas();
  setInterval(function(){ if(document.visibilityState==='visible') cargarAlertas(); },60000);
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') cargarAlertas(); });
}

/* Inicializa animaciones globales al cargar DOM */
document.addEventListener('DOMContentLoaded', function(){
  initPageEntrance();
  initScrollReveal();
  initNotificaciones();
});
