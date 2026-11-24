// Arranque temprano del dashboard: scroll, recarga y modo lectura.
// Detecta recargas para que el panel restaure la posición de scroll manualmente.
    (function(){
        try{
            var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
            var reload = nav ? nav.type === 'reload' : !!(performance.navigation && performance.navigation.type === 1);
            if(reload && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
        }catch(e){}
    })();

// Aplica el modo de solo lectura antes de pintar la página según el rol guardado.
    (function(){
        try{
            var e = JSON.parse(localStorage.getItem('encargado') || '{}');
            var r = e.rol || localStorage.getItem('rol') || 'lectura';
            if(r !== 'admin') document.documentElement.classList.add('role-lectura');
        }catch(err){}
    })();
