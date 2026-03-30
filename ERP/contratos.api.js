// ============================================================
// API — Contratos + Items de Contrato + Historial de Precios
// Módulos que la usan: contratos, remitos, proyectos, clientes
// ============================================================

const ContratosAPI = (() => {

  // ── Contratos ────────────────────────────────────────────────

  async function getContratos(filtros = {}) {
    let q = db.from('contratos')
      .select('*,clientes(nombre),empresas(nombre)')
      .order('created_at', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.clienteId) q = q.eq('cliente_id', filtros.clienteId);
    if (filtros.estado)    q = q.eq('estado', filtros.estado);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getContratosSelect(empresaId) {
    // Lista liviana para dropdowns — solo contratos activos
    let q = db.from('contratos')
      .select('id,numero_contrato,descripcion,cliente_id,clientes(nombre)')
      .eq('estado', 'activo')
      .order('numero_contrato');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getContratoById(id) {
    const { data, error } = await db.from('contratos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function crearContrato(payload) {
    const { data, error } = await db.from('contratos')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarContrato(id, payload) {
    const { error } = await db.from('contratos').update(payload).eq('id', id);
    if (error) throw error;
  }

  // Remitos asociados a un contrato (para mostrar en ficha)
  async function getRemitosDeContrato(contratoId) {
    const { data, error } = await db.from('remitos_v2')
      .select('id,numero_formateado,fecha,estado,total_valorizado,clientes(nombre)')
      .eq('contrato_id', contratoId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ── Items de contrato ────────────────────────────────────────

  async function getItemsContrato(contratoId) {
    const { data, error } = await db.from('contrato_items')
      .select('*')
      .eq('contrato_id', contratoId)
      .eq('activo', true)
      .order('descripcion');
    if (error) throw error;
    return data || [];
  }

  async function getItemContratoById(id) {
    const { data, error } = await db.from('contrato_items')
      .select('precio_unitario')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function crearItemContrato(payload) {
    const { error } = await db.from('contrato_items').insert(payload);
    if (error) throw error;
  }

  async function actualizarItemContrato(id, payload) {
    const { error } = await db.from('contrato_items').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function darBajaItemContrato(id) {
    const { error } = await db.from('contrato_items')
      .update({ activo: false })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Historial de precios ─────────────────────────────────────

  async function getHistorialPrecios(filtros = {}) {
    let q = db.from('contrato_precios_historial')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtros.itemId)     q = q.eq('item_id', filtros.itemId);
    if (filtros.contratoId) q = q.eq('contrato_id', filtros.contratoId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarCambioPrecio(payload) {
    const { error } = await db.from('contrato_precios_historial').insert(payload);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getContratos,
    getContratosSelect,
    getContratoById,
    crearContrato,
    actualizarContrato,
    getRemitosDeContrato,
    getItemsContrato,
    getItemContratoById,
    crearItemContrato,
    actualizarItemContrato,
    darBajaItemContrato,
    getHistorialPrecios,
    registrarCambioPrecio,
  };
})();
