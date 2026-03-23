// ============================================================
// API — Proyectos + Imputación de Horas + Costos de Obra
//       + Órdenes de Trabajo + Costos de Roles
// Módulos que la usan: proyectos, index, compras,
//   presupuestos, clientes
// ============================================================

const ProyectosAPI = (() => {

  // ── Proyectos ────────────────────────────────────────────────

  async function getProyectos(filtros = {}) {
    let q = db.from('proyectos')
      .select('*,clientes(nombre),empresas(nombre)')
      .order('created_at', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.clienteId) q = q.eq('cliente_id', filtros.clienteId);
    if (filtros.estado)    q = q.eq('estado', filtros.estado);
    if (filtros.estados)   q = q.in('estado', filtros.estados);
    if (filtros.limit)     q = q.limit(filtros.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getProyectosSelect(empresaId, estados = ['activo']) {
    const { data, error } = await db.from('proyectos')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .in('estado', estados)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function getProyectosParaOT(empresaId) {
    const { data, error } = await db.from('proyectos')
      .select('id,nombre,hs_ayudante,hs_oficial,hs_oficial_esp,hs_supervisor,hs_higiene,descripcion,clientes(nombre),contratos(numero_contrato),numero_oc')
      .eq('empresa_id', empresaId)
      .in('estado', ['activo', 'pausado'])
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function getProyectoDashboard(limite) {
    let q = db.from('proyectos')
      .select('id,nombre,estado,clientes(nombre),empresas(nombre)')
      .in('estado', ['activo', 'pausado'])
      .order('created_at', { ascending: false });
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getProyectoById(id) {
    const { data, error } = await db.from('proyectos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // Resumen financiero de un proyecto
  async function getResumenProyecto(proyectoId) {
    const [
      { data: horas },
      { data: costos },
      { data: facturas },
    ] = await Promise.all([
      db.from('imputacion_horas').select('costo_calculado,horas,cantidad_personas').eq('proyecto_id', proyectoId),
      db.from('costos_obra').select('monto,tipo').eq('proyecto_id', proyectoId),
      db.from('facturas_emitidas').select('monto_total').eq('proyecto_id', proyectoId).neq('estado', 'anulada'),
    ]);
    return { horas: horas || [], costos: costos || [], facturas: facturas || [] };
  }

  // Resumen financiero de múltiples proyectos (para listado)
  async function getResumenesProyectos(proyectoIds) {
    if (!proyectoIds.length) return {};
    const [
      { data: horas },
      { data: costos },
      { data: facturas },
    ] = await Promise.all([
      db.from('imputacion_horas').select('proyecto_id,costo_calculado').in('proyecto_id', proyectoIds),
      db.from('costos_obra').select('proyecto_id,monto').in('proyecto_id', proyectoIds),
      db.from('facturas_emitidas').select('proyecto_id,monto_total').in('proyecto_id', proyectoIds).neq('estado', 'anulada'),
    ]);
    // Agrupar por proyecto_id
    const res = {};
    proyectoIds.forEach(id => { res[id] = { costoHoras: 0, costosObra: 0, facturado: 0 }; });
    (horas || []).forEach(r => { if (res[r.proyecto_id]) res[r.proyecto_id].costoHoras += Number(r.costo_calculado || 0); });
    (costos || []).forEach(r => { if (res[r.proyecto_id]) res[r.proyecto_id].costosObra += Number(r.monto || 0); });
    (facturas || []).forEach(r => { if (res[r.proyecto_id]) res[r.proyecto_id].facturado += Number(r.monto_total || 0); });
    return res;
  }

  async function crearProyecto(payload) {
    const { data, error } = await db.from('proyectos')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarProyecto(id, payload) {
    const { error } = await db.from('proyectos').update(payload).eq('id', id);
    if (error) throw error;
  }

  // ── Imputación de horas ─────────────────────────────────────

  async function getImputacionHoras(filtros = {}) {
    let q = db.from('imputacion_horas')
      .select('*,empleados(nombre),proyectos(nombre),empresas(nombre)')
      .order('fecha', { ascending: false })
      .limit(filtros.limit || 200);

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.proyectoId) q = q.eq('proyecto_id', filtros.proyectoId);
    if (filtros.empleadoId) q = q.eq('empleado_id', filtros.empleadoId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getHorasProyectoDashboard(proyectoId) {
    const { data, error } = await db.from('imputacion_horas')
      .select('costo_calculado,horas,cantidad_personas')
      .eq('proyecto_id', proyectoId);
    if (error) throw error;
    return data || [];
  }

  async function registrarHoras(payload) {
    const { error } = await db.from('imputacion_horas').insert(payload);
    if (error) throw error;
  }

  async function eliminarImputacion(id) {
    const { error } = await db.from('imputacion_horas').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Costos de obra ──────────────────────────────────────────

  async function getCostosObra(filtros = {}) {
    let q = db.from('costos_obra')
      .select('*,proyectos(nombre),empresas(nombre)')
      .order('fecha', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.proyectoId) q = q.eq('proyecto_id', filtros.proyectoId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarCostoObra(payload) {
    const { error } = await db.from('costos_obra').insert(payload);
    if (error) throw error;
  }

  async function eliminarCostoObra(id) {
    const { error } = await db.from('costos_obra').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Órdenes de trabajo ──────────────────────────────────────

  async function getOrdenesTrabajo(filtros = {}) {
    let q = db.from('ordenes_trabajo')
      .select('*,proyectos(nombre,numero_oc,contratos(numero_contrato)),empresas(nombre)')
      .order('created_at', { ascending: false })
      .limit(filtros.limit || 200);

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.proyectoId) q = q.eq('proyecto_id', filtros.proyectoId);
    if (filtros.estado)     q = q.eq('estado', filtros.estado);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getOrdenTrabajoById(id) {
    const { data, error } = await db.from('ordenes_trabajo')
      .select('*,proyectos(nombre,clientes(nombre))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function crearOrdenTrabajo(payload) {
    const { error } = await db.from('ordenes_trabajo').insert(payload);
    if (error) throw error;
  }

  async function actualizarOrdenTrabajo(id, payload) {
    const { error } = await db.from('ordenes_trabajo').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function cambiarEstadoOT(id, estado) {
    const { error } = await db.from('ordenes_trabajo').update({ estado }).eq('id', id);
    if (error) throw error;
  }

  // ── Costos de roles (tabla costos_roles) ────────────────────

  async function getCostosRoles(empresaId) {
    const { data, error } = await db.from('costos_roles')
      .select('rol,costo_hora')
      .eq('empresa_id', empresaId);
    if (error) throw error;
    return data || [];
  }

  async function getCostosRolesCompleto(empresaId) {
    const { data, error } = await db.from('costos_roles')
      .select('*,empresas(nombre)')
      .eq('empresa_id', empresaId)
      .order('rol');
    if (error) throw error;
    return data || [];
  }

  async function actualizarCostoRol(id, costoHora) {
    const { error } = await db.from('costos_roles')
      .update({ costo_hora: costoHora })
      .eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getProyectos,
    getProyectosSelect,
    getProyectosParaOT,
    getProyectoDashboard,
    getProyectoById,
    getResumenProyecto,
    getResumenesProyectos,
    crearProyecto,
    actualizarProyecto,
    getImputacionHoras,
    getHorasProyectoDashboard,
    registrarHoras,
    eliminarImputacion,
    getCostosObra,
    registrarCostoObra,
    eliminarCostoObra,
    getOrdenesTrabajo,
    getOrdenTrabajoById,
    crearOrdenTrabajo,
    actualizarOrdenTrabajo,
    cambiarEstadoOT,
    getCostosRoles,
    getCostosRolesCompleto,
    actualizarCostoRol,
  };
})();
