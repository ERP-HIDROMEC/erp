// ============================================================
// ERP HIDROMEC — Módulo compartido de utilidades
// Incluir en todos los HTML: <script src="erp-utils.js"></script>
// ============================================================

const SUPA_URL = 'https://avgkhbqtanvfsqxncmzm.supabase.co';
const SUPA_KEY = 'sb_publishable_Q5W5JwdhUOWnOZv_QaGWQg_xHVhSEls';
const db = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── Formateo ─────────────────────────────────────────────────
const fmt  = v => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v||0);
const fmtF = d => d ? new Date(d+'T12:00:00').toLocaleDateString('es-AR') : '—';
const hoy  = () => new Date().toISOString().split('T')[0];

// ── Roles y permisos ─────────────────────────────────────────
//
// ROLES DEFINIDOS:
//   admin_general  → todo (lmgomez, pgomez)
//   gestion_caja   → dashboard + facturas, compras, contratos, remitos, impuestos, caja (smartinez)
//   operaciones_dash → dashboard + proyectos, remitos, contratos, presupuestos (plgomez)
//   gestion        → facturas, compras, contratos, remitos, impuestos  → redirige a facturas.html
//   operaciones    → proyectos, remitos, contratos, presupuestos       → redirige a proyectos.html
//   rrhh           → empleados + syh                                    → redirige a empleados.html
//   syh            → syh                                                → redirige a syh.html
//
// USUARIOS:
//   lmgomez@hidromecsrl.com     → admin_general      (dashboard completo)
//   pgomez@hidromecsrl.com      → admin_general      (dashboard completo)
//   smartinez@hidromecsrl.com   → gestion_caja       (dashboard completo)
//   plgomez@hidromecsrl.com     → operaciones_dash   (dashboard completo)
//   jgomez@hidromecsrl.com      → admin_general      (dashboard completo)
//   agomez@hidromecsrl.com      → gestion            → facturas.html
//   mpalavecino@hidromecsrl.com → gestion            → facturas.html
//   lpacher@hidromecsrl.com     → gestion            → facturas.html
//   lwintecker@hidromecsrl.com  → operaciones        → proyectos.html
//   storres@hidromecsrl.com     → operaciones        → proyectos.html
//   jmgomez@hidromecsrl.com     → rrhh               → empleados.html

const PERMISOS = {
  admin_general:       ['*'],
  gestion_caja:        ['dashboard','facturas','compras','contratos','remitos','impuestos','caja'],
  operaciones_dash:    ['dashboard','proyectos','remitos','contratos','presupuestos'],
  gestion:             ['facturas','compras','contratos','remitos','impuestos'],
  operaciones:         ['proyectos','remitos','contratos','presupuestos'],
  gestion_operaciones: ['facturas','compras','contratos','remitos','impuestos','proyectos','presupuestos'],
  rrhh:                ['empleados','syh','clientes'],
  syh:                 ['syh'],
};

// Página de inicio por rol (para los que no tienen dashboard)
const INICIO_POR_ROL = {
  gestion:             'facturas.html',
  gestion_operaciones: 'facturas.html',
  operaciones:         'proyectos.html',
  rrhh:                'empleados.html',
  syh:                 'syh.html',
};

let _usuario = null;

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
  const rol = usuario.rol;

  const permitidos = PERMISOS[rol] || [];
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

// ── Auditoría ────────────────────────────────────────────────
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

// ── Manejo de errores ────────────────────────────────────────
function manejarError(error, contexto) {
  if (!error) return false;
  console.error(`Error en ${contexto}:`, error);
  const msg = error.message || 'Error desconocido';
  if (msg.includes('not-null')) alert(`Error: falta completar un campo obligatorio.\n(${contexto})`);
  else if (msg.includes('unique')) alert(`Error: ya existe un registro con ese dato.\n(${contexto})`);
  else if (msg.includes('foreign key')) alert(`Error: el registro tiene datos relacionados que impiden la operación.\n(${contexto})`);
  else alert(`Error en ${contexto}:\n${msg}`);
  return true;
}

// ── Paginación ───────────────────────────────────────────────
const PAGE_SIZE = 200;

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

// ── Búsqueda global ──────────────────────────────────────────
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

  (facs||[]).forEach(r => resultados.push({ tipo:'Factura', label: r.numero_factura, sub: r.clientes?.nombre, link:`facturas.html`, icon:'🧾' }));
  (clients||[]).forEach(r => resultados.push({ tipo:'Cliente', label: r.nombre, sub:'', link:`facturas.html`, icon:'🏢' }));
  (proys||[]).forEach(r => resultados.push({ tipo:'Proyecto', label: r.nombre, sub:'', link:`proyectos.html`, icon:'⚙' }));
  (rems||[]).forEach(r => resultados.push({ tipo:'Remito', label: r.numero_formateado, sub: r.clientes?.nombre, link:`remitos.html`, icon:'📋' }));

  return resultados;
}

// ── Exportación Excel ─────────────────────────────────────────
function exportarExcel(datos, columnas, nombreArchivo) {
  if (!datos || !datos.length) { alert('No hay datos para exportar.'); return; }
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
}

// ── Sidebar dinámico por rol ─────────────────────────────────
async function initSidebar() {
  const usuario = await getUsuario();
  if (!usuario) return;
  const permitidos = PERMISOS[usuario.rol] || [];
  const todoAcceso = permitidos.includes('*');

  // Ocultar nav-items sin permiso
  document.querySelectorAll('a[data-modulo]').forEach(el => {
    const modulo = el.getAttribute('data-modulo');
    if (!todoAcceso && !permitidos.includes(modulo)) {
      el.style.display = 'none';
    }
  });

  // Ocultar secciones que quedaron sin ningún item visible
  document.querySelectorAll('div[data-seccion]').forEach(el => {
    const modulos = el.getAttribute('data-seccion').split(',');
    const tieneVisible = modulos.some(m => todoAcceso || permitidos.includes(m));
    if (!tieneVisible) el.style.display = 'none';
  });
}

// ── Buscador global en sidebar ───────────────────────────────
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

let _searchTimer = null;
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


// ── Auto-cierre por inactividad (30 minutos) ─────────────────
const INACTIVIDAD_MS = 30 * 60 * 1000; // 30 minutos
const AVISO_MS = 29 * 60 * 1000;       // aviso al minuto 29
let _timerInactividad = null;
let _timerAviso = null;
let _modalInactividad = null;

function resetearTimerInactividad() {
  clearTimeout(_timerInactividad);
  clearTimeout(_timerAviso);
  if (_modalInactividad) { _modalInactividad.remove(); _modalInactividad = null; }

  // Aviso 1 minuto antes
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

  // Cierre automático
  _timerInactividad = setTimeout(async () => {
    await db.auth.signOut();
    window.location.href = 'login.html';
  }, INACTIVIDAD_MS);
}

function initInactividad() {
  // Solo activar si hay sesión (no en login.html)
  if (window.location.pathname.includes('login')) return;
  ['mousemove','keydown','click','scroll','touchstart'].forEach(ev =>
    document.addEventListener(ev, resetearTimerInactividad, { passive: true })
  );
  resetearTimerInactividad();
}

// Auto-init al cargar
document.addEventListener('DOMContentLoaded', () => { initBuscadorGlobal(); initSidebar(); initInactividad(); });
