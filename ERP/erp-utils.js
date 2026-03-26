// ============================================================
// ERP HIDROMEC — Módulo compartido de utilidades  v1.2
// Incluir en todos los HTML: <script src="erp-utils.js"></script>
//
// CAMBIOS v1.1 (Fase 1):
//   - var en lugar de const para re-declaración segura en bfcache
//   - const → var para globales que el browser puede re-evaluar
//   - toast() reemplaza todos los alert()
//   - confirmar() reemplaza todos los confirm() nativos
//   - manejarError() usa toast en lugar de alert()
//   - exportarExcel() usa toast en lugar de alert()
// ============================================================

// ── Conexión Supabase ─────────────────────────────────────────
// Nota: se usa `var` en lugar de `const` para que el browser
// pueda re-evaluar el script desde bfcache sin lanzar
// "Identifier already declared". Con `var` la re-declaración
// es silenciosa y segura.
var SUPA_URL = 'https://avgkhbqtanvfsqxncmzm.supabase.co';
var SUPA_KEY = 'sb_publishable_Q5W5JwdhUOWnOZv_QaGWQg_xHVhSEls';
var db = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── Formateo ──────────────────────────────────────────────────
var fmt  = v => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v||0);
var fmtF = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-AR') : '—';
var hoy  = () => new Date().toISOString().split('T')[0];

// ── Roles y permisos ──────────────────────────────────────────
//
// ROLES DEFINIDOS:
//   admin_general    → todo (lmgomez, pgomez, jgomez)
//   gestion_caja     → dashboard + facturas, compras, contratos, remitos, impuestos, caja (smartinez)
//   operaciones_dash → dashboard + proyectos, remitos, contratos, presupuestos (plgomez)
//   gestion          → facturas, compras, contratos, remitos, impuestos  → redirige a facturas.html
//   operaciones      → proyectos, remitos, contratos, presupuestos       → redirige a proyectos.html
//   rrhh             → empleados + syh                                    → redirige a empleados.html
//   syh              → syh                                                → redirige a syh.html
//
var PERMISOS = {
  admin_general:       ['*'],
  gestion_caja:        ['dashboard','facturas','compras','contratos','remitos','impuestos','caja'],
  operaciones_dash:    ['dashboard','proyectos','remitos','contratos','presupuestos'],
  gestion:             ['facturas','compras','contratos','remitos','impuestos'],
  operaciones:         ['proyectos','remitos','contratos','presupuestos'],
  gestion_operaciones: ['facturas','compras','contratos','remitos','impuestos','proyectos','presupuestos'],
  rrhh:                ['empleados','syh','clientes'],
  syh:                 ['syh'],
};

var INICIO_POR_ROL = {
  gestion:             'facturas.html',
  gestion_operaciones: 'facturas.html',
  operaciones:         'proyectos.html',
  rrhh:                'empleados.html',
  syh:                 'syh.html',
};

var _usuario = null;

// ── Sesión y acceso ───────────────────────────────────────────
async function getUsuario() {
  if (_usuario) return _usuario;
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  const { data } = await db.from('usuarios').select('*').eq('id', session.user.id).single();
  if (!data || !data.activo) { await db.auth.signOut(); window.location.href = 'login.html'; return null; }
  _usuario = { ...data, email: session.user.email };
  return _usuario;
}

async function verificarAcceso(modulo) {
  const usuario = await getUsuario();
  if (!usuario) return false;
  const permitidos = PERMISOS[usuario.rol] || [];
  if (permitidos.includes('*') || permitidos.includes(modulo)) return true;
  mostrarSinAcceso(modulo);
  return false;
}

function mostrarSinAcceso(modulo) {
  const rol    = _usuario?.rol || '';
  const inicio = INICIO_POR_ROL[rol] || 'index.html';
  const label  = inicio === 'index.html' ? 'Ir al dashboard' : 'Ir a mi módulo';
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f1117;font-family:'DM Sans',sans-serif">
      <div style="text-align:center;color:#e8eaf0">
        <div style="font-size:48px;margin-bottom:16px">🔒</div>
        <h2 style="font-size:20px;margin-bottom:8px">Sin acceso</h2>
        <p style="color:#7a8099;margin-bottom:24px">No tenés permiso para ver el módulo "${modulo}"</p>
        <a href="${inicio}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">${label}</a>
      </div>
    </div>`;
}

// ── TOAST — reemplaza todos los alert() ───────────────────────
//
// Uso:
//   toast('Guardado correctamente.')           → verde (éxito)
//   toast('Completá el campo.', 'warn')        → amarillo (validación)
//   toast('Error: ' + e.message, 'error')      → rojo (error)
//   toast('Procesando...', 'info')             → azul (información)
//
// El toast desaparece solo. No bloquea la UI.
//
(function _initToastContainer() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _crearContenedorToast);
  } else {
    _crearContenedorToast();
  }
})();

function _crearContenedorToast() {
  if (document.getElementById('_toast-container')) return;
  const c = document.createElement('div');
  c.id = '_toast-container';
  c.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:99999',
    'display:flex',
    'flex-direction:column',
    'gap:10px',
    'pointer-events:none',
    'max-width:360px',
    'width:calc(100% - 48px)',
  ].join(';');
  document.body.appendChild(c);
}

function toast(mensaje, tipo, duracion) {
  // Asegurarse de que el contenedor existe (por si se llama antes del DOMContentLoaded)
  if (!document.getElementById('_toast-container')) _crearContenedorToast();

  tipo     = tipo     || 'success';
  duracion = duracion || (tipo === 'error' ? 6000 : tipo === 'warn' ? 5000 : 4000);

  const COLORES = {
    success: { bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.35)', icon:'✓', color:'#10b981' },
    error:   { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.35)',  icon:'✕', color:'#ef4444' },
    warn:    { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)', icon:'⚠', color:'#f59e0b' },
    info:    { bg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.35)', icon:'ℹ', color:'#3b82f6' },
  };
  const c = COLORES[tipo] || COLORES.info;

  const el = document.createElement('div');
  el.style.cssText = [
    `background:${c.bg}`,
    `border:1px solid ${c.border}`,
    'border-radius:10px',
    'padding:12px 16px',
    'display:flex',
    'align-items:flex-start',
    'gap:10px',
    `color:${c.color}`,
    "font-family:'DM Sans',sans-serif",
    'font-size:13px',
    'line-height:1.45',
    'backdrop-filter:blur(8px)',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
    'pointer-events:auto',
    'cursor:pointer',
    'transition:opacity 0.3s, transform 0.3s',
    'opacity:0',
    'transform:translateY(8px)',
    'word-break:break-word',
  ].join(';');

  el.innerHTML = `
    <span style="font-size:15px;line-height:1;flex-shrink:0;margin-top:1px">${c.icon}</span>
    <span style="color:#e8eaf0;flex:1">${mensaje}</span>
    <span style="font-size:16px;line-height:1;flex-shrink:0;color:#7a8099;margin-top:1px">×</span>`;

  el.addEventListener('click', () => _cerrarToast(el));

  document.getElementById('_toast-container').appendChild(el);

  // Animar entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity  = '1';
      el.style.transform = 'translateY(0)';
    });
  });

  // Auto-cierre
  const timer = setTimeout(() => _cerrarToast(el), duracion);
  el._toastTimer = timer;
}

function _cerrarToast(el) {
  clearTimeout(el._toastTimer);
  el.style.opacity   = '0';
  el.style.transform = 'translateY(4px)';
  setTimeout(() => el.remove(), 300);
}

// ── CONFIRMAR — reemplaza todos los confirm() ─────────────────
//
// Uso (async/await):
//   const ok = await confirmar('¿Borrar este registro?');
//   if (!ok) return;
//
// Uso (callback alternativo):
//   confirmar('¿Borrar?', { onOk: () => borrar(id) });
//
// Opciones:
//   confirmar(mensaje, { titulo, labelOk, labelCancelar, tipo, onOk, onCancelar })
//   tipo: 'danger' (rojo) | 'warn' (amarillo) | 'info' (azul, default)
//
function confirmar(mensaje, opciones) {
  opciones = opciones || {};

  return new Promise(resolve => {
    const tipo        = opciones.tipo        || 'danger';
    const titulo      = opciones.titulo      || (tipo === 'danger' ? 'Confirmar acción' : 'Confirmar');
    const labelOk     = opciones.labelOk     || (tipo === 'danger' ? 'Eliminar' : 'Confirmar');
    const labelCancel = opciones.labelCancelar || 'Cancelar';

    const COLOR_BTN = {
      danger: '#ef4444',
      warn:   '#f59e0b',
      info:   '#3b82f6',
    };
    const colorBtn = COLOR_BTN[tipo] || COLOR_BTN.info;

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.65)',
      'z-index:99998',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      "font-family:'DM Sans',sans-serif",
      'padding:16px',
    ].join(';');

    overlay.innerHTML = `
      <div style="background:#181c27;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:28px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.6)">
        <h3 style="font-size:15px;font-weight:600;color:#e8eaf0;margin:0 0 10px">${titulo}</h3>
        <p style="font-size:13px;color:#9aa3b8;margin:0 0 24px;line-height:1.5">${mensaje}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="_conf-cancel" style="padding:9px 18px;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#9aa3b8;font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer">${labelCancel}</button>
          <button id="_conf-ok" style="padding:9px 18px;background:${colorBtn};border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer">${labelOk}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Foco en botón OK para poder confirmar con Enter
    setTimeout(() => overlay.querySelector('#_conf-ok').focus(), 50);

    function cerrar(resultado) {
      overlay.remove();
      resolve(resultado);
      if (resultado && opciones.onOk)     opciones.onOk();
      if (!resultado && opciones.onCancelar) opciones.onCancelar();
    }

    overlay.querySelector('#_conf-ok').addEventListener('click', () => cerrar(true));
    overlay.querySelector('#_conf-cancel').addEventListener('click', () => cerrar(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(false); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(false); });
  });
}

// ── Manejo de errores (usa toast) ─────────────────────────────
function manejarError(error, contexto) {
  if (!error) return false;
  console.error(`Error en ${contexto}:`, error);
  const msg = error.message || 'Error desconocido';
  let msgUsuario;
  if (msg.includes('not-null'))    msgUsuario = `Falta completar un campo obligatorio. (${contexto})`;
  else if (msg.includes('unique')) msgUsuario = `Ya existe un registro con ese dato. (${contexto})`;
  else if (msg.includes('foreign key')) msgUsuario = `El registro tiene datos relacionados que impiden la operación. (${contexto})`;
  else                             msgUsuario = `Error en ${contexto}: ${msg}`;
  toast(msgUsuario, 'error');
  return true;
}

// ── Auditoría ─────────────────────────────────────────────────
async function registrarAuditoria(modulo, accion, tabla, registroId, detalle) {
  try {
    const usuario = await getUsuario();
    if (!usuario) return;
    await db.from('auditoria').insert({
      usuario_id:    usuario.id,
      usuario_email: usuario.email,
      modulo, accion, tabla,
      registro_id:   String(registroId || ''),
      detalle:       detalle || null,
    });
  } catch(e) { console.warn('Auditoría no registrada:', e.message); }
}

// ── Paginación ────────────────────────────────────────────────
var PAGE_SIZE = 200;

function renderPaginacion(containerId, pagActual, total, onPage) {
  const totalPags = Math.ceil(total / PAGE_SIZE);
  if (totalPags <= 1) { document.getElementById(containerId).innerHTML = ''; return; }
  let btns = '';
  for (let i = 1; i <= totalPags; i++) {
    btns += `<button onclick="${onPage}(${i})" style="padding:4px 10px;margin:0 2px;border-radius:6px;border:1px solid var(--border);background:${i===pagActual?'var(--blue)':'var(--bg3)'};color:${i===pagActual?'#fff':'var(--text)'};cursor:pointer;font-size:12px">${i}</button>`;
  }
  document.getElementById(containerId).innerHTML = `<div style="display:flex;align-items:center;gap:4px;padding:12px 16px;border-top:1px solid var(--border)">
    <span style="font-size:12px;color:var(--muted);margin-right:8px">${total} registros</span>${btns}</div>`;
}

// ── Búsqueda global ───────────────────────────────────────────
async function busquedaGlobal(termino) {
  if (!termino || termino.length < 2) return [];
  const t = termino.toLowerCase().trim();
  const resultados = [];

  const [{ data: facs }, { data: clients }, { data: proys }, { data: rems }] = await Promise.all([
    db.from('facturas_emitidas').select('id,numero_factura,clientes(nombre),monto_total').ilike('numero_factura', `%${t}%`).limit(5),
    db.from('clientes').select('id,nombre').ilike('nombre', `%${t}%`).limit(5),
    db.from('proyectos').select('id,nombre').ilike('nombre', `%${t}%`).limit(5),
    db.from('remitos_v2').select('id,numero_formateado,clientes(nombre)').ilike('numero_formateado', `%${t}%`).limit(5),
  ]);

  (facs||[]).forEach(r => resultados.push({ tipo:'Factura', label: r.numero_factura, sub: r.clientes?.nombre, link:'facturas.html', icon:'🧾' }));
  (clients||[]).forEach(r => resultados.push({ tipo:'Cliente', label: r.nombre, sub:'', link:'facturas.html', icon:'🏢' }));
  (proys||[]).forEach(r => resultados.push({ tipo:'Proyecto', label: r.nombre, sub:'', link:'proyectos.html', icon:'⚙' }));
  (rems||[]).forEach(r => resultados.push({ tipo:'Remito', label: r.numero_formateado, sub: r.clientes?.nombre, link:'remitos.html', icon:'📋' }));

  return resultados;
}

// ── Exportación CSV/Excel (usa toast) ────────────────────────
function exportarExcel(datos, columnas, nombreArchivo) {
  if (!datos || !datos.length) { toast('No hay datos para exportar.', 'warn'); return; }
  const headers = columnas.map(c => c.label);
  const rows = datos.map(row => columnas.map(c => {
    const v = c.key.split('.').reduce((o, k) => o?.[k], row);
    return v !== null && v !== undefined ? v : '';
  }));
  let csv = headers.join(',') + '\n';
  rows.forEach(r => { csv += r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',') + '\n'; });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast(`Archivo "${nombreArchivo}.csv" descargado.`, 'success');
}

// ── Sidebar dinámico por rol ──────────────────────────────────
async function initSidebar() {
  const usuario = await getUsuario();
  if (!usuario) return;
  const permitidos = PERMISOS[usuario.rol] || [];
  const todoAcceso = permitidos.includes('*');

  document.querySelectorAll('a[data-modulo]').forEach(el => {
    const modulo = el.getAttribute('data-modulo');
    if (!todoAcceso && !permitidos.includes(modulo)) {
      el.style.display = 'none';
    }
  });

  document.querySelectorAll('div[data-seccion]').forEach(el => {
    const modulos = el.getAttribute('data-seccion').split(',');
    const tieneVisible = modulos.some(m => todoAcceso || permitidos.includes(m));
    if (!tieneVisible) el.style.display = 'none';
  });
}

// ── Buscador global en sidebar ────────────────────────────────
function initBuscadorGlobal() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  const buscadorHTML = `
    <div style="padding:8px 12px;position:relative">
      <input id="g-search" type="text" placeholder="Buscar..." autocomplete="off"
        style="width:100%;padding:7px 10px 7px 30px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-family:'DM Sans',sans-serif;outline:none"
        oninput="debounceBusqueda(this.value)">
      <svg style="position:absolute;left:20px;top:50%;transform:translateY(-50%);color:var(--muted)" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <div id="g-search-results" style="display:none;position:absolute;left:12px;right:12px;top:calc(100% - 4px);background:var(--bg2);border:1px solid var(--border);border-radius:8px;z-index:1000;box-shadow:0 8px 24px rgba(0,0,0,0.4);max-height:300px;overflow-y:auto"></div>
    </div>`;
  const firstSection = sidebar.querySelector('.nav-section');
  if (firstSection) firstSection.insertAdjacentHTML('beforebegin', buscadorHTML);
  document.addEventListener('click', e => {
    if (!e.target.closest('#g-search') && !e.target.closest('#g-search-results'))
      document.getElementById('g-search-results').style.display = 'none';
  });
}

var _searchTimer = null;
async function debounceBusqueda(val) {
  clearTimeout(_searchTimer);
  const res = document.getElementById('g-search-results');
  if (val.length < 2) { res.style.display = 'none'; return; }
  _searchTimer = setTimeout(async () => {
    const resultados = await busquedaGlobal(val);
    if (!resultados.length) { res.innerHTML = '<div style="padding:12px 16px;font-size:13px;color:var(--muted)">Sin resultados</div>'; }
    else { res.innerHTML = resultados.map(r => `
      <a href="${r.link}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;text-decoration:none;border-bottom:1px solid var(--border);transition:background 0.1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
        <span style="font-size:16px">${r.icon}</span>
        <div>
          <div style="font-size:12px;color:var(--muted)">${r.tipo}</div>
          <div style="font-size:13px;color:var(--text)">${r.label}</div>
          ${r.sub ? `<div style="font-size:11px;color:var(--muted)">${r.sub}</div>` : ''}
        </div>
      </a>`).join(''); }
    res.style.display = 'block';
  }, 300);
}

// ── Auto-cierre por inactividad (30 minutos) ──────────────────
var INACTIVIDAD_MS = 30 * 60 * 1000;
var AVISO_MS       = 29 * 60 * 1000;
var _timerInactividad = null;
var _timerAviso       = null;
var _modalInactividad = null;

function resetearTimerInactividad() {
  clearTimeout(_timerInactividad);
  clearTimeout(_timerAviso);
  if (_modalInactividad) { _modalInactividad.remove(); _modalInactividad = null; }

  _timerAviso = setTimeout(() => {
    _modalInactividad = document.createElement('div');
    _modalInactividad.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif">
        <div style="background:#181c27;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:28px;max-width:360px;width:100%;text-align:center;color:#e8eaf0">
          <div style="font-size:36px;margin-bottom:12px">⏱</div>
          <h3 style="font-size:16px;font-weight:600;margin-bottom:8px">Sesión por vencer</h3>
          <p style="font-size:13px;color:#7a8099;margin-bottom:20px">Tu sesión se cerrará en 1 minuto por inactividad.</p>
          <button onclick="resetearTimerInactividad()" style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:13px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer">Seguir trabajando</button>
        </div>
      </div>`;
    document.body.appendChild(_modalInactividad);
  }, AVISO_MS);

  _timerInactividad = setTimeout(async () => {
    await db.auth.signOut();
    window.location.href = 'login.html';
  }, INACTIVIDAD_MS);
}

function initInactividad() {
  if (window.location.pathname.includes('login')) return;
  ['mousemove','keydown','click','scroll','touchstart'].forEach(ev =>
    document.addEventListener(ev, resetearTimerInactividad, { passive: true })
  );
  resetearTimerInactividad();
}

// ── Auto-init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBuscadorGlobal();
  initSidebar();
  initInactividad();
});

