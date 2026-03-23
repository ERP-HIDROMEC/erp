// ============================================================
// ERP HIDROMEC — Componente de Sidebar  v1.0
// erp-sidebar.js
//
// Incluir en TODOS los HTML después de erp-utils.js:
//   <script src="erp-sidebar.js"></script>
//
// En el <body> de cada HTML, reemplazar el bloque <nav class="sidebar">
// completo y el <div class="overlay"> por estas dos líneas:
//
//   <div id="overlay" class="overlay" onclick="ERP.closeSidebar()"></div>
//   <div id="sidebar-root"></div>
//
// Luego, en el script de init() de cada página, llamar:
//
//   await ERP.initLayout('facturas');   ← nombre del módulo activo
//
// ¡Y listo! El sidebar se genera, filtra por permisos y
// marca el ítem activo automáticamente.
// ============================================================

var ERP = ERP || {};

// ── Definición única del menú ────────────────────────────────
// Un solo lugar para agregar/quitar/renombrar ítems.
// 'modulo' debe coincidir con los valores en PERMISOS de erp-utils.js

ERP._MENU = [
  {
    seccion: 'Home',
    data: 'dashboard',
    items: [
      { modulo: 'dashboard', label: 'Dashboard', href: 'index.html', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>' },
    ],
  },
  {
    seccion: 'Operaciones',
    data: 'proyectos,contratos,remitos,presupuestos',
    items: [
      { modulo: 'proyectos',    label: 'Proyectos',       href: 'proyectos.html',    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>' },
      { modulo: 'contratos',    label: 'Contratos',       href: 'contratos.html',    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
      { modulo: 'remitos',      label: 'Remitos',         href: 'remitos.html',      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>' },
      { modulo: 'presupuestos', label: 'Presupuestos',    href: 'presupuestos.html', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>' },
      { modulo: 'proyectos',    label: 'Horas trabajadas',href: 'proyectos.html#horas', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
    ],
  },
  {
    seccion: 'Gestión',
    data: 'facturas,compras,impuestos,caja,clientes',
    items: [
      { modulo: 'facturas',  label: 'Facturación', href: 'facturas.html',  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>' },
      { modulo: 'compras',   label: 'Compras',     href: 'compras.html',   icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>' },
      { modulo: 'impuestos', label: 'Impuestos',   href: 'impuestos.html', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>' },
      { modulo: 'clientes',  label: 'Clientes',    href: 'clientes.html',  icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V19a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>' },
    ],
  },
  {
    seccion: 'Finanzas',
    data: 'caja',
    items: [
      { modulo: 'caja', label: 'Caja y bancos', href: 'caja.html', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
    ],
  },
  {
    seccion: 'RRHH',
    data: 'empleados,syh',
    items: [
      { modulo: 'empleados', label: 'Empleados',      href: 'empleados.html', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>' },
      { modulo: 'syh',       label: 'Seg. e Higiene', href: 'syh.html',       icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>' },
    ],
  },
];

// ── SVG helper ───────────────────────────────────────────────
function _svg(inner) {
  return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">${inner}</svg>`;
}

// ── Generar HTML del sidebar ─────────────────────────────────
function _renderSidebar(moduloActivo, usuario) {
  const rol        = usuario.rol || '';
  const permitidos = PERMISOS[rol] || [];
  const todoAcceso = permitidos.includes('*');

  // Nombre de usuario formateado
  const nombreDisplay = usuario.nombre || usuario.email || '';
  const rolDisplay    = rol.replace(/_/g, ' ');

  let html = `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <h1>Hidromec ERP</h1>
        <span>v1.0 — 2026</span>
      </div>`;

  // Buscador global (lo inserta erp-utils.js via initBuscadorGlobal,
  // pero necesitamos el placeholder para que lo encuentre)
  html += `<div id="_search-slot"></div>`;

  // Secciones y ítems
  ERP._MENU.forEach(seccion => {
    // Ver si la sección tiene al menos un ítem visible
    const itemsVisibles = seccion.items.filter(item => {
      const base = item.modulo;
      return todoAcceso || permitidos.includes(base);
    });
    if (!itemsVisibles.length) return;

    html += `<div class="nav-section" data-seccion="${seccion.data}">${seccion.seccion}</div>`;

    seccion.items.forEach(item => {
      const base    = item.modulo;
      const visible = todoAcceso || permitidos.includes(base);
      if (!visible) return;

      // Determinar activo: coincide el href con la página actual
      const esActivo = item.href === moduloActivo + '.html'
        || (moduloActivo === 'dashboard' && item.href === 'index.html')
        || item.href === window.location.pathname.split('/').pop();

      html += `
        <a class="nav-item${esActivo ? ' active' : ''}"
           data-modulo="${base}"
           href="${item.href}">
          ${_svg(item.icon)}
          ${item.label}
        </a>`;
    });
  });

  // Footer: info usuario + logout
  html += `
      <div class="nav-bottom">
        ${nombreDisplay ? `
        <div class="nav-user">
          <div class="nav-user-name">${nombreDisplay}</div>
          <div class="nav-user-role">${rolDisplay}</div>
        </div>` : ''}
        <button class="btn-logout" onclick="ERP.logout()">Cerrar sesión</button>
      </div>
    </nav>`;

  return html;
}

// ── Mobile: toggle / close ───────────────────────────────────
ERP.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
};
ERP.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
};

// ── Logout ───────────────────────────────────────────────────
ERP.logout = async function() {
  await db.auth.signOut();
  window.location.href = 'login.html';
};

// ── initLayout ───────────────────────────────────────────────
// Función principal — llamar desde init() de cada página.
//
//   await ERP.initLayout('facturas');
//
// Hace:
//   1. Verifica sesión y permisos del módulo
//   2. Renderiza el sidebar
//   3. Inicia buscador global (erp-utils)
//   4. Inicia timer de inactividad (erp-utils)
//
// Retorna el objeto usuario o null si sin acceso.

ERP.initLayout = async function(moduloActivo) {
  // 1. Verificar acceso
  const acceso = await verificarAcceso(moduloActivo);
  if (!acceso) return null;

  const usuario = await getUsuario();

  // 2. Renderizar sidebar en el root
  const root = document.getElementById('sidebar-root');
  if (root) {
    root.outerHTML = _renderSidebar(moduloActivo, usuario);
  }

  // 3. Reubicar el buscador global dentro del sidebar
  //    (erp-utils.js lo busca por .nav-section — ya existe en el sidebar generado)
  initBuscadorGlobal();

  // 4. Timer de inactividad
  initInactividad();

  return usuario;
};

// ── Botón hamburger para mobile ──────────────────────────────
// Uso en HTML: <button onclick="ERP.toggleSidebar()">☰</button>
// Ya incluido en el mobile-header que cada página puede tener.
