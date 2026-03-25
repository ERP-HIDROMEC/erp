// ============================================================
// API — Remitos (remitos_v2 + remito_items_v2 + talonarios_cai)
// También cubre la tabla legacy `remitos` (usada en facturas)
// Módulos que la usan: remitos, facturas, contratos, index,
//   clientes, dedup-clientes
// ============================================================

const RemitosAPI = (() => {

  // ── Remitos v2 ──────────────────────────────────────────────

  async function getRemitos(filtros = {}) {
    let q = db.from('remitos_v2')
      .select('*,clientes(nombre),empresas(nombre),factura_id')
      .order('fecha', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.clienteId) q = q.eq('cliente_id', filtros.clienteId);
    if (filtros.estado)    q = q.eq('estado', filtros.estado);
    if (filtros.estados)   q = q.in('estado', filtros.estados);
    if (filtros.fechaDesde) q = q.gte('fecha', filtros.fechaDesde);
    if (filtros.fechaHasta) q = q.lte('fecha', filtros.fechaHasta);
    if (filtros.sinFactura) q = q.is('factura_id', null);
    if (filtros.limit)     q = q.limit(filtros.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getRemitosParaFacturar(empresaId) {
    const { data, error } = await db.from('remitos_v2')
      .select('*,clientes(nombre),empresas(nombre)')
      .eq('empresa_id', empresaId)
      .in('estado', ['emitido', 'aceptado'])
      .is('factura_id', null)
      .order('fecha');
    if (error) throw error;
    return data || [];
  }

  async function getRemitoPendienteDashboard(limite) {
    let q = db.from('remitos_v2')
      .select('numero_formateado,clientes(nombre),empresas(nombre),fecha')
      .in('estado', ['emitido', 'aceptado'])
      .is('factura_id', null)
      .order('fecha');
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getRemitoById(id) {
    const { data, error } = await db.from('remitos_v2')
      .select('*,clientes(*),empresas(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function getRemitoSimple(id) {
    const { data, error } = await db.from('remitos_v2')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // Para el módulo de facturas (vincular remito → factura)
  async function getRemitosParaVincular(empresaId) {
    const { data, error } = await db.from('remitos_v2')
      .select('*,clientes(nombre)')
      .eq('empresa_id', empresaId)
      .in('estado', ['emitido', 'aceptado'])
      .is('factura_id', null)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getFacturasDeRemitos(facIds) {
    if (!facIds || !facIds.length) return [];
    const { data, error } = await db.from('facturas_emitidas')
      .select('id,numero_factura')
      .in('id', facIds);
    if (error) throw error;
    return data || [];
  }

  // ── Items de remito ─────────────────────────────────────────

  async function getItemsRemito(remitoId) {
    const { data, error } = await db.from('remito_items_v2')
      .select('*')
      .eq('remito_id', remitoId)
      .order('orden');
    if (error) throw error;
    return data || [];
  }

  async function reemplazarItemsRemito(remitoId, empresaId, remito, items) {
    // RPC atómica — reemplaza el delete+insert suelto (Fase B)
    const { data, error } = await db.rpc('guardar_remito_con_items', {
      p_remito: { ...remito, id: remitoId, empresa_id: empresaId },
      p_items:  items || [],
    });
    if (error) throw error;
    return data;
  }

  // ── Mutaciones de remitos ───────────────────────────────────

  async function crearRemito(payload) {
    const { data, error } = await db.from('remitos_v2')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarRemito(id, payload) {
    const { error } = await db.from('remitos_v2')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  }

  async function anularRemito(id) {
    const { error } = await db.from('remitos_v2')
      .update({ estado: 'anulado' })
      .eq('id', id);
    if (error) throw error;
  }

  async function marcarRemitoFacturado(id) {
    const { error } = await db.from('remitos_v2')
      .update({ estado: 'facturado' })
      .eq('id', id);
    if (error) throw error;
  }

  async function marcarRemitoEmitido(id) {
    const { error } = await db.from('remitos_v2')
      .update({ estado: 'emitido' })
      .eq('id', id);
    if (error) throw error;
  }

  async function vincularRemitoFactura(remitoId, facturaId) {
    const { error } = await db.from('remitos_v2')
      .update({ factura_id: facturaId, estado: 'facturado' })
      .eq('id', remitoId);
    if (error) throw error;
  }

  // ── Talonarios CAI ──────────────────────────────────────────

  async function getTalonarioActivo(empresaId) {
    const { data, error } = await db.from('talonarios_cai')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .gte('fecha_vencimiento', hoy())
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }

  async function getTalonarios(filtros = {}) {
    let q = db.from('talonarios_cai')
      .select('*,empresas(nombre)')
      .order('created_at', { ascending: false });
    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getTalonarioDashboard() {
    const { data, error } = await db.from('talonarios_cai')
      .select('nro_actual,nro_hasta,fecha_vencimiento,empresas(nombre)')
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  }

  async function avanzarNroTalonario(talonarioId, nroSiguiente) {
    const { error } = await db.from('talonarios_cai')
      .update({ nro_actual: nroSiguiente })
      .eq('id', talonarioId);
    if (error) throw error;
  }

  async function crearTalonario(payload) {
    // Desactivar el anterior de la misma empresa
    await db.from('talonarios_cai')
      .update({ activo: false })
      .eq('empresa_id', payload.empresa_id)
      .eq('activo', true);

    const { error } = await db.from('talonarios_cai').insert(payload);
    if (error) throw error;
  }

  // ── Remitos legacy (tabla `remitos` — solo facturas.html) ───

  async function getRemitosLegacy(filtros = {}) {
    let q = db.from('remitos')
      .select('*,clientes(nombre),empresas(nombre),proyectos(nombre)')
      .order('fecha', { ascending: false });
    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function crearRemitoLegacy(payload) {
    const { error } = await db.from('remitos').insert(payload);
    if (error) throw error;
  }

  async function eliminarRemitoLegacy(id) {
    const { error } = await db.from('remitos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getRemitos,
    getRemitosParaFacturar,
    getRemitoPendienteDashboard,
    getRemitoById,
    getRemitoSimple,
    getRemitosParaVincular,
    getFacturasDeRemitos,
    getItemsRemito,
    reemplazarItemsRemito,
    crearRemito,
    actualizarRemito,
    anularRemito,
    marcarRemitoFacturado,
    marcarRemitoEmitido,
    vincularRemitoFactura,
    getTalonarioActivo,
    getTalonarios,
    getTalonarioDashboard,
    avanzarNroTalonario,
    crearTalonario,
    getRemitosLegacy,
    crearRemitoLegacy,
    eliminarRemitoLegacy,
  };
})();
