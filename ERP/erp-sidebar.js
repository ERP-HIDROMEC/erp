// ============================================================
// ERP HIDROMEC — Componente de Sidebar  v1.2
// erp-sidebar.js
//
// Incluir en TODOS los HTML después de erp-utils.js:
//   <script src="erp-sidebar.js"></script>
//
// En el <body> de cada HTML:
//   <div id="overlay" class="overlay" onclick="ERP.closeSidebar()"></div>
//   <div id="sidebar-root"></div>
//
// En init() de cada página:
//   await ERP.initLayout('facturas');
//
// CAMBIOS v1.2:
//   - Agrega módulo 'informes' (Informes de obra) en Operaciones
// CAMBIOS v1.1:
//   - Sobreescribe initSidebar/initBuscadorGlobal/initInactividad de erp-utils
//     para evitar que corran antes de que el sidebar esté en el DOM
//   - Buscador global integrado directamente (no depende de erp-utils)
//   - Timer de inactividad iniciado desde initLayout()
// ============================================================

var ERP = ERP || {};

// ── Neutralizar auto-init de erp-utils.js ───────────────────
// erp-utils llama estas tres funciones en DOMContentLoaded.
// En ese momento sidebar-root está vacío, así que las sobreescribimos
// con no-ops. Las versiones reales se llaman desde ERP.initLayout().
function initSidebar()        {}
function initInactividad()    {}
function initBuscadorGlobal() {}

// ── Definición del menú (única fuente de verdad) ─────────────
ERP._MENU = [
  {
    seccion: 'Home', data: 'dashboard',
    items: [
      { modulo: 'dashboard', label: 'Dashboard', href: 'index.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>' },
    ],
  },
  {
    seccion: 'Operaciones', data: 'proyectos,contratos,remitos,presupuestos,informes',
    items: [
      { modulo: 'proyectos',    label: 'Proyectos',        href: 'proyectos.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>' },
      { modulo: 'contratos',    label: 'Contratos',        href: 'contratos.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
      { modulo: 'remitos',      label: 'Remitos',          href: 'remitos.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
      { modulo: 'presupuestos', label: 'Presupuestos',     href: 'presupuestos.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>' },
      { modulo: 'proyectos',    label: 'Horas trabajadas', href: 'proyectos.html#horas',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
      { modulo: 'informes',     label: 'Informes de obra', href: 'informes.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
    ],
  },
  {
    seccion: 'Gestión', data: 'facturas,compras,impuestos,caja,clientes',
    items: [
      { modulo: 'facturas',  label: 'Facturación', href: 'facturas.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>' },
      { modulo: 'compras',   label: 'Compras',     href: 'compras.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>' },
      { modulo: 'impuestos', label: 'Impuestos',   href: 'impuestos.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>' },
      { modulo: 'clientes',  label: 'Clientes',    href: 'clientes.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V19a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>' },
    ],
  },
  {
    seccion: 'Finanzas', data: 'caja,historial-op',
    items: [
      { modulo: 'caja', label: 'Caja y bancos', href: 'caja.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
      { modulo: 'historial-op', label: 'Órdenes de Pago', href: 'historial-op.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
    ],
  },
  {
    seccion: 'RRHH', data: 'empleados,syh',
    items: [
      { modulo: 'empleados', label: 'Empleados',      href: 'empleados.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>' },
      { modulo: 'syh',       label: 'Seg. e Higiene', href: 'syh.html',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>' },
    ],
  },
];

// ── Helper SVG ───────────────────────────────────────────────
function _erpSvg(inner) {
  return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">' + inner + '</svg>';
}

// ── Render del sidebar ───────────────────────────────────────
function _erpRenderSidebar(moduloActivo, usuario) {
  var rol        = usuario.rol || '';
  var permitidos = (typeof PERMISOS !== 'undefined' ? PERMISOS[rol] : null) || [];
  var todoAcceso = permitidos.indexOf('*') !== -1;
  var pagina     = (window.location.pathname.split('/').pop() || 'index.html').split('#')[0];

  var nombre = usuario.nombre || usuario.email || '';
  var rolLabel = rol.replace(/_/g, ' ');

  var html = '<nav class="sidebar" id="sidebar">';
  html += '<div class="sidebar-logo"><h1>Hidromec ERP</h1><span>v1.0 \u2014 2026</span></div>';

  // Slot del buscador — se rellena en _erpInitBuscador()
  html += '<div id="_search-slot"></div>';

  ERP._MENU.forEach(function(grupo) {
    var hayVisibles = grupo.items.some(function(item) {
      return todoAcceso || permitidos.indexOf(item.modulo) !== -1;
    });
    if (!hayVisibles) return;

    html += '<div class="nav-section" data-seccion="' + grupo.data + '">' + grupo.seccion + '</div>';

    grupo.items.forEach(function(item) {
      if (!todoAcceso && permitidos.indexOf(item.modulo) === -1) return;

      var hrefBase = item.href.split('#')[0];
      var esActivo = (hrefBase === pagina) ||
                     (moduloActivo === 'dashboard' && hrefBase === 'index.html' && pagina === 'index.html');

      html += '<a class="nav-item' + (esActivo ? ' active' : '') + '" data-modulo="' + item.modulo + '" href="' + item.href + '">';
      html += _erpSvg(item.icon);
      html += item.label + '</a>';
    });
  });

  html += '<div class="nav-bottom">';
  if (nombre) {
    html += '<div class="nav-user"><div class="nav-user-name">' + nombre + '</div><div class="nav-user-role">' + rolLabel + '</div></div>';
  }
  html += '<button class="btn-logout" onclick="ERP.logout()">Cerrar sesi\u00f3n</button>';
  html += '</div></nav>';

  return html;
}

// ── Buscador global (integrado aquí, no en erp-utils) ────────
var _erpSearchTimer = null;

function _erpInitBuscador() {
  var slot = document.getElementById('_search-slot');
  if (!slot) return;

  slot.innerHTML = '<div style="padding:8px 12px;position:relative">' +
    '<input id="g-search" type="text" placeholder="Buscar..." autocomplete="off"' +
    ' style="width:100%;padding:7px 10px 7px 30px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:\'DM Sans\',sans-serif;outline:none"' +
    ' oninput="_erpDebounceBusqueda(this.value)">' +
    '<svg style="position:absolute;left:20px;top:50%;transform:translateY(-50%);color:var(--muted)" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>' +
    '<div id="g-search-results" style="display:none;position:absolute;left:12px;right:12px;top:calc(100% - 4px);background:var(--bg2);border:1px solid var(--border);border-radius:8px;z-index:1000;box-shadow:0 8px 24px rgba(0,0,0,0.4);max-height:300px;overflow-y:auto"></div>' +
    '</div>';

  document.addEventListener('click', function(e) {
    var res = document.getElementById('g-search-results');
    if (res && !e.target.closest('#g-search') && !e.target.closest('#g-search-results')) {
      res.style.display = 'none';
    }
  });
}

function _erpDebounceBusqueda(val) {
  clearTimeout(_erpSearchTimer);
  var res = document.getElementById('g-search-results');
  if (!res) return;
  if (val.length < 2) { res.style.display = 'none'; return; }
  _erpSearchTimer = setTimeout(async function() {
    var resultados = await busquedaGlobal(val);
    if (!resultados.length) {
      res.innerHTML = '<div style="padding:12px 16px;font-size:13px;color:var(--muted)">Sin resultados</div>';
    } else {
      res.innerHTML = resultados.map(function(r) {
        return '<a href="' + r.link + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;text-decoration:none;border-bottom:1px solid var(--border);transition:background 0.1s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'">' +
          '<span style="font-size:16px">' + r.icon + '</span>' +
          '<div><div style="font-size:12px;color:var(--muted)">' + r.tipo + '</div>' +
          '<div style="font-size:13px;color:var(--text)">' + r.label + '</div>' +
          (r.sub ? '<div style="font-size:11px;color:var(--muted)">' + r.sub + '</div>' : '') +
          '</div></a>';
      }).join('');
    }
    res.style.display = 'block';
  }, 300);
}

// Exponer para que el input oninput pueda llamarla globalmente
window._erpDebounceBusqueda = _erpDebounceBusqueda;

// ── Timer de inactividad (versión local) ─────────────────────
function _erpInitInactividad() {
  if (window.location.pathname.includes('login')) return;
  ['mousemove','keydown','click','scroll','touchstart'].forEach(function(ev) {
    document.addEventListener(ev, resetearTimerInactividad, { passive: true });
  });
  resetearTimerInactividad();
}

// ── Mobile ───────────────────────────────────────────────────
ERP.toggleSidebar = function() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('overlay');
  if (s) s.classList.toggle('open');
  if (o) o.classList.toggle('show');
};

ERP.closeSidebar = function() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('overlay');
  if (s) s.classList.remove('open');
  if (o) o.classList.remove('show');
};

// ── Logout ───────────────────────────────────────────────────
ERP.logout = async function() {
  await db.auth.signOut();
  window.location.href = 'login.html';
};

// ── initLayout — punto de entrada principal ──────────────────
ERP.initLayout = async function(moduloActivo) {
  // 1. Verificar sesión y permisos
  var acceso = await verificarAcceso(moduloActivo);
  if (!acceso) return null;

  var usuario = await getUsuario();
  if (!usuario) return null;

  // 2. Renderizar sidebar (reemplaza div#sidebar-root con <nav id="sidebar">)
  var root = document.getElementById('sidebar-root');
  if (root) {
    root.outerHTML = _erpRenderSidebar(moduloActivo, usuario);
  }

  // 3. Insertar buscador dentro del sidebar ya renderizado
  _erpInitBuscador();

  // 4. Timer de inactividad
  _erpInitInactividad();

  return usuario;
};
