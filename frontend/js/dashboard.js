// Exige una sesión activa; de lo contrario vuelve al login.
var enc = JSON.parse(localStorage.getItem('encargado') || '{}');
if(!enc.nombre) window.location.href = '/';

// Instancia única de Chart.js para poder actualizarla o destruirla.
var donutChartInstance = null;

/** Abre y cierra el menú lateral en pantallas pequeñas. */
function toggleSidebar(){
    var open = document.body.classList.toggle('sidebar-open');
    var btn = document.getElementById('menuBtn');
    if(btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
/** Cierra el menú lateral y restablece su estado accesible. */
function closeSidebar(){
    document.body.classList.remove('sidebar-open');
    var btn = document.getElementById('menuBtn');
    if(btn) btn.setAttribute('aria-expanded', 'false');
}
/** Muestra u oculta el editor de la multa diaria. */
function toggleConfig(){
    var section = document.getElementById('cfgInputSection');
    var btn = document.getElementById('cfgToggle');
    if(!section || !btn) return;
    var open = section.hasAttribute('hidden');
    if(open) section.removeAttribute('hidden'); else section.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open){ var input = document.getElementById('multa-input'); if(input) input.focus(); }
}

// Gráfico de dona: colores, leyenda y renderizado con Chart.js.
/** Lee una variable CSS para que el gráfico respete el tema activo. */
function cssVar(name, fallback){
    var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback || '';
}

/** Actualiza cifras, porcentajes y etiqueta accesible de la leyenda. */
function actualizarLeyendaDonut(disponibles, prestados, mant, total){
    var pct = function(v){ return total ? Math.round((v / total) * 100) + '%' : '0%'; };
    var values = [
        ['donutDisponible', disponibles], ['donutDisponiblePct', pct(disponibles)],
        ['donutPrestado', prestados], ['donutPrestadoPct', pct(prestados)],
        ['donutMantenimiento', mant], ['donutMantenimientoPct', pct(mant)],
        ['donutTotal', total]
    ];
    values.forEach(function(pair){
        var el = document.getElementById(pair[0]);
        if(el) el.textContent = pair[1];
    });
    var canvas = document.getElementById('donutChart');
    if(canvas) canvas.setAttribute('aria-label', 'Distribución de equipos: ' + disponibles + ' disponibles, ' + prestados + ' prestados y ' + mant + ' en mantenimiento.');
}

/** Crea el gráfico de dona y desactiva la animación si el usuario la reduce. */
function crearDonut(labels, data, colors) {
    var canvas = document.getElementById('donutChart');
    if(!canvas) return;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = canvas.getContext('2d');
    if (donutChartInstance) donutChartInstance.destroy();
    var empty = document.getElementById('donutEmpty'); if(empty) empty.style.display = 'none';
    var figure = document.querySelector('.donut-figure'); if(figure) figure.style.display = 'block';
    var legend = document.getElementById('donutLegend'); if(legend) legend.style.display = 'grid';
    canvas.style.display = 'block';
    var tag = document.getElementById('donutTag'); if(tag) tag.textContent = 'Estado actual';
    actualizarLeyendaDonut(data[0] || 0, data[1] || 0, data[2] || 0, data.reduce(function(a, b){ return a + b; }, 0));
    donutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 6,
                spacing: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            cutout: '74%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: cssVar('--card', '#231f15'),
                    titleColor: cssVar('--text', '#ede6d3'),
                    bodyColor: cssVar('--text-secondary', '#c9c1aa'),
                    borderColor: cssVar('--border', 'rgba(237,230,211,.1)'),
                    borderWidth: 1,
                    titleFont: { size: 12, weight: '600', family: 'Instrument Sans, sans-serif' },
                    bodyFont: { size: 11, family: 'Instrument Sans, sans-serif' },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(ctx){ return ' ' + ctx.label + ': ' + ctx.parsed + ' equipos'; }
                    }
                }
            },
            animation: {
                animateRotate: !reduceMotion,
                duration: reduceMotion ? 0 : 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

/** Sustituye el gráfico por el estado vacío cuando no hay equipos. */
function mostrarDonutVacio(){
    var canvas = document.getElementById('donutChart'); if(canvas) canvas.style.display = 'none';
    var empty = document.getElementById('donutEmpty'); if(empty) empty.style.display = 'flex';
    var figure = document.querySelector('.donut-figure'); if(figure) figure.style.display = 'none';
    var legend = document.getElementById('donutLegend'); if(legend) legend.style.display = 'none';
    var tag = document.getElementById('donutTag'); if(tag) tag.textContent = 'Sin equipos';
    actualizarLeyendaDonut(0, 0, 0, 0);
}

// Carga de datos y estado del panel.
// Última información válida recibida del servidor.
var cacheData = { equipos: [], prestamos: [], alumnos: [] };

/** Muestra u oculta el aviso de error de carga. */
function mostrarErrorDatos(mensaje){
    var el = document.getElementById('dataError');
    if(!el) return;
    if(mensaje){
        var txt = document.getElementById('dataErrorText');
        if(txt) txt.textContent = mensaje;
        el.hidden = false;
    } else {
        el.hidden = true;
    }
}

/** Carga equipos, préstamos y alumnos en paralelo y refresca la interfaz. */
async function cargarTodo(){
    var [er, pr, ar] = await Promise.all([
        apiFetchBackground('/equipos'),
        apiFetchBackground('/prestamos'),
        apiFetchBackground('/alumnos')
    ]);
    // Si falla una fuente se conserva su última versión en caché.
    var fallos = (er ? 0 : 1) + (pr ? 0 : 1) + (ar ? 0 : 1);
    if(fallos === 3){
        mostrarErrorDatos('No se pudieron cargar los datos. Revisá la conexión.');
        return;
    }
    mostrarErrorDatos(fallos ? 'Algunos datos no se pudieron actualizar. Se muestra la última información disponible.' : '');
    if(er) cacheData.equipos = await safeJson(er);
    if(pr) cacheData.prestamos = await safeJson(pr);
    if(ar) cacheData.alumnos = await safeJson(ar);
    actualizarUI();
}

/** Recalcula indicadores, gráfico y actividad a partir de los datos en caché. */
function actualizarUI(){
    var eq = cacheData.equipos;
    var pr = cacheData.prestamos;
    var al = cacheData.alumnos;
    var total = eq.length;
    // Conteos por estado del equipo y préstamos vigentes.
    var prestados = eq.filter(function(e){ return e.estado === 'Prestado'; }).length;
    var disponibles = eq.filter(function(e){ return e.estado === 'Disponible'; }).length;
    var mant = eq.filter(function(e){ return e.estado === 'En mantenimiento'; }).length;
    var activos = pr.filter(function(p){ return p.estado === 'ACTIVO'; }).length;

    animarNumero('h-prestamos', activos);
    animarNumero('h-equipos', disponibles);
    animarNumero('h-equipos-totales', total);
    animarNumero('h-alumnos', al.length);
    animarNumero('h-mantenimiento', mant);

    var note = document.getElementById('h-prestamos-note');
    if(note){
        note.textContent = activos === 0
            ? 'Sin equipos prestados'
            : (activos === 1 ? '1 equipo prestado' : activos + ' equipos prestados');
    }
    var pctEl = document.getElementById('h-equipos-pct');
    if(pctEl) pctEl.textContent = (total ? Math.round((disponibles / total) * 100) : 0) + '% del inventario';
    var mantNote = document.getElementById('h-mantenimiento-note');
    if(mantNote) mantNote.textContent = mant === 0 ? 'Sin equipos reportados' : (mant === 1 ? 'Equipo en revisión' : 'Equipos en revisión');

    var bp = document.getElementById('badge-prestamos'); if(bp) bp.textContent = activos;

    var colors = [cssVar('--dash-green', '#55b88a'), cssVar('--dash-amber', '#d6a84b'), cssVar('--dash-coral', '#e06b5f')];
    if(total > 0){
        var empty = document.getElementById('donutEmpty'); if(empty) empty.style.display = 'none';
        var figure = document.querySelector('.donut-figure'); if(figure) figure.style.display = 'block';
        var legend = document.getElementById('donutLegend'); if(legend) legend.style.display = 'grid';
        var canvas = document.getElementById('donutChart'); if(canvas) canvas.style.display = 'block';
        var tag = document.getElementById('donutTag'); if(tag) tag.textContent = 'Estado actual';
        if(donutChartInstance){
            donutChartInstance.data.labels = ['Disponibles', 'Prestados', 'Mantenimiento'];
            donutChartInstance.data.datasets[0].data = [disponibles, prestados, mant];
            donutChartInstance.data.datasets[0].backgroundColor = colors;
            donutChartInstance.update();
            actualizarLeyendaDonut(disponibles, prestados, mant, total);
        } else {
            crearDonut(['Disponibles', 'Prestados', 'Mantenimiento'], [disponibles, prestados, mant], colors);
        }
    } else { mostrarDonutVacio(); }

    renderActivityFeed(pr, eq);

    var lu = document.getElementById('lastUpdated');
    if(lu) lu.textContent = 'Última actualización: ' + new Date().toLocaleTimeString('es-PY', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

    settleDashboardScroll();
}

/** Anima un contador desde su valor actual hasta el objetivo. */
function animarNumero(id, target) {
    var el = document.getElementById(id);
    if(!el) return;
    var current = parseInt(el.textContent.replace(/\D/g,'')) || 0;
    if (current === target) { el.textContent = target; return; }
    var duration = 800, start = performance.now();
    function step(now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = Math.round(current + (target - current) * eased);
        el.textContent = val;
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// Actividad reciente: préstamos, devoluciones y altas de equipos.
/** Devuelve la hora en formato local o un guion si la fecha no es válida. */
function formatHora(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Elige un icono representativo según el tipo de equipo. */
function equipmentIcon(tipo) {
    var t = (tipo || '').toLowerCase();
    if (t.indexOf('laptop') >= 0 || t.indexOf('notebook') >= 0) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="12" rx="2"/><path stroke-linecap="round" d="M2 20h20"/></svg>';
    }
    if (t.indexOf('dock') >= 0 || t.indexOf('accesorio') >= 0) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7l8-4 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="3" width="20" height="14" rx="2"/><path stroke-linecap="round" d="M8 21h8M12 17v4"/></svg>';
}

/** Combina préstamos, devoluciones y altas para mostrar los últimos 5 movimientos. */
function renderActivityFeed(prestamos, equipos) {
    var wrapper = document.getElementById('stream-wrapper');
    if (!wrapper) return;
    var events = [];
    (prestamos || []).forEach(function(p) {
        var isReturned = p.estado === 'DEVUELTO';
        var isLate = p.estado === 'ACTIVO' && p.fecha_devolucion_estimada && new Date(p.fecha_devolucion_estimada) < new Date();
        var alumno = ((p.alumno_nombre || '') + ' ' + (p.alumno_apellido || '')).trim();
        events.push({
            date: isReturned ? (p.fecha_devolucion || p.fecha_prestamo) : p.fecha_prestamo,
            equipo: p.equipo || 'Equipo #' + p.id_equipo,
            code: 'EQ-' + String(p.id_equipo || 0).padStart(3, '0'),
            tipo: p.tipo || '',
            alumno: alumno || '—',
            action: isReturned ? 'Devolución' : 'Préstamo',
            status: isReturned ? 'Devuelto' : (isLate ? 'Retrasado' : 'Activo'),
            statusCls: isReturned ? 's-returned' : (isLate ? 's-late' : 's-active')
        });
    });
    (equipos || []).forEach(function(e) {
        var status = e.estado === 'En mantenimiento' ? 'Mantenimiento' : (e.estado === 'Prestado' ? 'Prestado' : 'Disponible');
        events.push({
            date: e.fecha_registro,
            equipo: e.nombre || 'Equipo #' + e.id_equipo,
            code: 'EQ-' + String(e.id_equipo || 0).padStart(3, '0'),
            tipo: e.tipo || '',
            alumno: '—',
            action: 'Registro',
            status: status,
            statusCls: status === 'Mantenimiento' ? 's-late' : (status === 'Prestado' ? 's-active' : 's-returned')
        });
    });
    // Descarta fechas inválidas y ordena del movimiento más reciente al más antiguo.
    events = events.filter(function(e) { return e.date && !isNaN(new Date(e.date).getTime()); })
        .sort(function(a, b) { return new Date(b.date) - new Date(a.date); })
        .slice(0, 5);
    if (!events.length) {
        wrapper.innerHTML = '<div class="feed-empty">'
            + '<span class="feed-empty-icon" aria-hidden="true"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" focusable="false"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>'
            + '<strong class="feed-empty-title">Aún no hay movimientos</strong>'
            + '<span class="feed-empty-text">Los préstamos, devoluciones y registros del colegio van a aparecer acá.</span>'
            + '<a class="btn-sm" href="/prestamos/prestamos.html">Registrar préstamo</a>'
            + '</div>';
        return;
    }
    wrapper.innerHTML = events.map(function(e, i) {
        return '<div class="feed-item animate-fi-' + Math.min(i + 1, 10) + '">'
            + '<span class="feed-time">' + formatHora(e.date) + '</span>'
            + '<div class="feed-equipment"><span class="feed-eq-icon" aria-hidden="true">' + equipmentIcon(e.tipo) + '</span><span class="feed-eq-copy"><span class="feed-eq-name">' + esc(e.equipo) + '</span><span class="feed-eq-code">' + esc(e.code) + '</span></span></div>'
            + '<span class="feed-student">' + esc(e.alumno) + '</span>'
            + '<span class="feed-action">' + esc(e.action) + '</span>'
            + '<span class="feed-status ' + e.statusCls + '">' + esc(e.status) + '</span>'
            + '</div>';
    }).join('');
}

// Exportación a Excel y registro de la última exportación.
/** Descarga el libro Excel y guarda la fecha y los conteos en localStorage. */
async function exportarExcel(){
    var btn = document.getElementById('exportBtnGrid');
    var label = btn.querySelector('.qa-label');
    var origText = label.textContent;
    btn.style.pointerEvents = 'none'; btn.style.opacity = '0.6';
    label.textContent = 'Exportando...';
    try {
        var r = await apiFetch('/exportar');
        if(!r.ok){ st('Error al exportar', 't-err'); resetExportBtn(); return; }
        // Los conteos viajan en cabeceras para mostrarlos luego en el panel.
        var loanCount = r.headers.get('X-Export-Loans');
        var returnCount = r.headers.get('X-Export-Returns');
        var studentCount = r.headers.get('X-Export-Students');
        var blob = await r.blob();
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var hoy = (new Date()).toISOString().slice(0, 10);
        a.download = 'SmartLoanIT_Reporte_' + hoy + '.xlsx';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        var ahora = new Date();
        var exportMeta = { iso: ahora.toISOString(), prestamos: loanCount, devoluciones: returnCount, alumnos: studentCount };
        localStorage.setItem('ultimaExportacion', JSON.stringify(exportMeta));
        actualizarInfoExportacion();
        label.textContent = '¡Exportado!';
        st('Exportación completada');
        setTimeout(resetExportBtn, 2000);
    } catch(e){ st('Error de conexión', 't-err'); resetExportBtn(); }
    function resetExportBtn(){
        btn.style.pointerEvents = ''; btn.style.opacity = '';
        label.textContent = origText;
    }
}

/** Muestra el tiempo relativo y los conteos de la última exportación. */
function actualizarInfoExportacion(){
    var raw = localStorage.getItem('ultimaExportacion');
    if(!raw){
        var empty = document.getElementById('lastExport');
        if(empty && empty.textContent === '—') empty.textContent = 'Aún no exportaste';
        return;
    }
    try{
        var meta = JSON.parse(raw);
        var relTime = formatearTiempoRelativo(meta.iso);
        var le = document.getElementById('lastExport'); if(le) le.textContent = relTime;
        if(meta.prestamos){
            var el = document.getElementById('expLoans'); if(el) el.textContent = meta.prestamos;
            var er = document.getElementById('expReturns'); if(er) er.textContent = meta.devoluciones;
            var es = document.getElementById('expStudents'); if(es) es.textContent = meta.alumnos;
        }
    } catch(e){
        var le = document.getElementById('lastExport'); if(le) le.textContent = raw;
    }
}

/** Convierte una fecha ISO en texto relativo legible en español. */
function formatearTiempoRelativo(iso){
    var ahora = new Date(), fecha = new Date(iso), diffMs = ahora - fecha, diffMin = Math.floor(diffMs / 60000), diffHoras = Math.floor(diffMs / 3600000), diffDias = Math.floor(diffMs / 86400000);
    if(diffMin < 1) return 'hace unos segundos';
    if(diffMin < 60) return 'hace ' + diffMin + ' min';
    if(diffHoras < 24) return 'hace ' + diffHoras + ' h';
    if(diffDias === 1) return 'ayer';
    if(diffDias < 7) return 'hace ' + diffDias + ' días';
    return fecha.toLocaleDateString('es-PY',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// Reloj de la cabecera.
/** Pinta la fecha y la hora actuales en el encabezado. */
function actualizarReloj(){
    var ahora = new Date();
    var dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    var mesesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
    document.getElementById('hero-date').textContent = dias[ahora.getDay()] + ', ' + ahora.getDate() + ' de ' + meses[ahora.getMonth()];
    var h = String(ahora.getHours()).padStart(2,'0'), m = String(ahora.getMinutes()).padStart(2,'0');
    document.getElementById('hero-time').textContent = h + ':' + m + ' hs';
    var lbl = document.getElementById('live-time-lbl');
    if (lbl) lbl.textContent = dias[ahora.getDay()] + ', ' + ahora.getDate() + ' ' + mesesShort[ahora.getMonth()];
}
actualizarReloj();
setInterval(actualizarReloj, 60000);

// Actualización periódica de datos.
var refreshInterval;
/** Carga los datos de inmediato y programa la siguiente actualización. */
function startPolling(){
    if(refreshInterval) clearInterval(refreshInterval);
    cargarTodo();
    refreshInterval = setInterval(cargarTodo, 30000);
}
// Pausa el sondeo cuando la pestaña está oculta y lo reanuda al volver.
document.addEventListener('visibilitychange', function(){
    if(document.hidden && refreshInterval){
        clearInterval(refreshInterval);
        refreshInterval = null;
    } else if(!document.hidden) {
        startPolling();
    }
});
window.addEventListener('beforeunload', function(){ if(refreshInterval) clearInterval(refreshInterval); saveDashboardScroll(); });
window.addEventListener('pagehide', saveDashboardScroll);

window.addEventListener('scroll', function(){
    var st = document.getElementById('scrollTop');
    if(st) st.classList.toggle('show', window.scrollY > 400);
});

// Configuración de la multa por retraso.
/** Refleja en pantalla el monto vigente de la multa diaria. */
function actualizarDisplayMulta(valor){
    var v = document.getElementById('multaValor');
    var display = valor ? fn(parseInt(valor)) : '—';
    if (v) v.textContent = display;
}

/** Obtiene la multa diaria configurada y actualiza el formulario. */
async function cargarConfig(){
    try{
        var r = await apiFetch('/configuracion');
        if(!r.ok){ return; }
        var d = await safeJson(r);
        var multa = d.find(function(x){ return x.clave === 'multa_por_dia'; });
        if(multa){
            document.getElementById('multa-input').value = Number(multa.valor).toLocaleString('es-PY');
            actualizarDisplayMulta(multa.valor);
        }
    } catch(e){ /* ignore */ }
}

/** Formatea el monto ingresado con separadores de miles. */
function fmtMonto(el){
    var v = el.value.replace(/\./g,'').replace(/\D/g,'');
    el.value = v !== '' ? Number(v).toLocaleString('es-PY') : '';
}

/** Valida y guarda la nueva multa diaria en el servidor. */
async function guardarMulta(){
    var val = document.getElementById('multa-input').value.replace(/\./g,'').trim();
    if(!val || isNaN(val) || parseInt(val) < 0){ st('Ingresa un valor válido mayor o igual a 0','t-err'); return; }
    var btn = document.getElementById('btnCfg');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try{
        var r = await apiFetch('/configuracion/multa_por_dia', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({valor:val}) });
        if(r.ok){
            st('Multa actualizada correctamente'); btn.textContent = 'Guardado'; btn.classList.add('saved');
            actualizarDisplayMulta(val);
        } else { st('Error al guardar','t-err'); btn.textContent = 'Guardar'; }
    } catch(e){ st('Error de conexión','t-err'); btn.textContent = 'Guardar'; }
    setTimeout(function(){ btn.disabled = false; btn.textContent = 'Guardar'; btn.classList.remove('saved'); }, 2000);
}

// Restauración de la posición de scroll al recargar.
var DASH_SCROLL_KEY = 'smartloan.dashScroll';
var dashScrollState = null;

/** Guarda la posición vertical y si el usuario estaba al final de la página. */
function saveDashboardScroll(){
    try{
        var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        sessionStorage.setItem(DASH_SCROLL_KEY, JSON.stringify({
            y: Math.round(window.scrollY),
            atBottom: window.scrollY >= max - 2
        }));
    }catch(e){}
}

/** Recupera la posición solo si la navegación actual es una recarga. */
function readDashboardScroll(){
    try{
        var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        var reload = nav ? nav.type === 'reload' : !!(performance.navigation && performance.navigation.type === 1);
        if(!reload){ sessionStorage.removeItem(DASH_SCROLL_KEY); return null; }
        var raw = sessionStorage.getItem(DASH_SCROLL_KEY);
        if(!raw) return null;
        var state = JSON.parse(raw);
        if(!state || typeof state.y !== 'number') return null;
        return state;
    }catch(e){ return null; }
}

/** Aplica la posición guardada sin animación para evitar parpadeos. */
function applyDashboardScroll(){
    if(!dashScrollState) return;
    var root = document.documentElement;
    var max = Math.max(0, root.scrollHeight - window.innerHeight);
    var y = dashScrollState.atBottom ? max : Math.min(dashScrollState.y, max);
    var previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = previousBehavior;
}

/** Reintenta el ajuste tras cargar las fuentes y libera el estado temporal. */
function settleDashboardScroll(){
    if(!dashScrollState) return;
    applyDashboardScroll();
    var finish = function(){
        if(!dashScrollState) return;
        applyDashboardScroll();
        dashScrollState = null;
        try{ if('scrollRestoration' in history) history.scrollRestoration = 'auto'; }catch(e){}
    };
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(finish);
    else finish();
}

dashScrollState = readDashboardScroll();
if(dashScrollState){
    applyDashboardScroll();
    // Si el usuario intenta desplazarse, se cancela la restauración pendiente.
    ['wheel','touchmove'].forEach(function(evt){
        window.addEventListener(evt, function(){
            dashScrollState = null;
            try{ if('scrollRestoration' in history) history.scrollRestoration = 'auto'; }catch(e){}
        }, {passive:true, once:true});
    });
}

/** Abre el modal para cambiar la contraseña del usuario actual. */
function abrirCambioClave(){
    ['clave-actual','clave-nueva','clave-nueva2'].forEach(function(id){
        var el=document.getElementById(id);
        if(el){el.value='';el.classList.remove('err');}
    });
    ['ferr-clave-actual','ferr-clave-nueva','ferr-clave-nueva2'].forEach(function(id){
        var el=document.getElementById(id);
        if(el) el.classList.remove('show');
    });
    var modal=document.getElementById('mo-clave');
    if(modal) modal.classList.add('show');
    setTimeout(function(){var el=document.getElementById('clave-actual');if(el)el.focus();},100);
}

/** Cierra el modal de cambio de contraseña. */
function cerrarCambioClave(){
    var modal=document.getElementById('mo-clave');
    if(modal) modal.classList.remove('show');
}

/** Valida y guarda la nueva contraseña del usuario actual. */
async function guardarCambioClave(){
    var actual=document.getElementById('clave-actual');
    var nueva=document.getElementById('clave-nueva');
    var nueva2=document.getElementById('clave-nueva2');
    var ok=true;
    if(!actual.value){actual.classList.add('err');document.getElementById('ferr-clave-actual').classList.add('show');ok=false;}
    else{actual.classList.remove('err');document.getElementById('ferr-clave-actual').classList.remove('show');}
    if(nueva.value.length<6){nueva.classList.add('err');document.getElementById('ferr-clave-nueva').classList.add('show');ok=false;}
    else{nueva.classList.remove('err');document.getElementById('ferr-clave-nueva').classList.remove('show');}
    if(nueva.value!==nueva2.value){nueva2.classList.add('err');document.getElementById('ferr-clave-nueva2').classList.add('show');ok=false;}
    else{nueva2.classList.remove('err');document.getElementById('ferr-clave-nueva2').classList.remove('show');}
    if(!ok) return;

    var btn=document.getElementById('btnClave');
    btn.disabled=true;btn.textContent='Guardando...';
    try{
        var r=await apiFetch('/encargados/password',{
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({actual:actual.value,nueva:nueva.value})
        });
        var d=await safeJson(r);
        if(r.ok){
            st('Contraseña actualizada correctamente');
            cerrarCambioClave();
        }else{
            st(d.mensaje||'No se pudo cambiar la contraseña','t-err');
        }
    }catch(e){
        st('Error de conexión','t-err');
    }finally{
        btn.disabled=false;btn.textContent='Guardar contraseña';
    }
}

// Inicialización del panel.
window.onload = function(){
    var enc = JSON.parse(localStorage.getItem('encargado') || '{}');
    var rol = localStorage.getItem('rol');
    // Accesos rápidos usados por el buscador global.
    var paginasSpotlight = [
        {label:'Equipos',sub:'Gestión de activos tecnológicos',url:'/equipos/equipos.html'},
        {label:'Alumnos',sub:'Registro de alumnos',url:'/alumnos/alumnos.html'},
        {label:'Préstamos',sub:'Registrar nuevo préstamo',url:'/prestamos/prestamos.html'},
        {label:'Devoluciones',sub:'Recibir devolución',url:'/devoluciones/devoluciones.html'},
        {label:'Historial',sub:'Trazabilidad completa',url:'/historial/historial.html'}
    ];
    if(rol === 'admin') paginasSpotlight.push({label:'Usuarios',sub:'Administración de usuarios',url:'/usuarios/usuarios.html'});

    initPage({
        spotlight: paginasSpotlight,
        onReady: function(){
            // Pinta el nombre, el rol y el avatar del encargado conectado.
            if(enc.nombre){
                var inicial = enc.nombre[0].toUpperCase();
                var sa = document.getElementById('s-avatar'); if(sa) sa.textContent = inicial;

                var sn = document.getElementById('s-name'); if(sn) sn.textContent = enc.nombre + ' ' + (enc.apellido || '');
                var cargo = enc.cargo || 'Encargado';
                var srm = document.getElementById('s-role-main'); if(srm) srm.textContent = cargo;
                var srb = document.getElementById('s-role-badge');
                if(srb){
                    srb.hidden = false;
                    srb.textContent = rol === 'admin' ? 'Administrador' : 'Operador';
                    srb.classList.toggle('is-admin', rol === 'admin');
                }
                var wm = document.getElementById('welcome-msg'); if(wm) wm.textContent = enc.nombre || 'Bienvenido';
            }
            actualizarInfoExportacion();
            cargarConfig();
            startPolling();
            // Al cambiar de tema se recrea el gráfico para tomar los colores nuevos.
            var themeObserver = new MutationObserver(function(){
                if(donutChartInstance){ donutChartInstance.destroy(); donutChartInstance = null; }
                if(cacheData.equipos.length || cacheData.prestamos.length || cacheData.alumnos.length) actualizarUI();
            });
            themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        }
    });
};
