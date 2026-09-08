// ============================================================
// API — Órdenes de Compra (OC sueltas, sin contrato macro)
// Módulo que la usa: remitos
// ============================================================

const OrdenesCompraAPI = (() => {

  // Busca una OC existente por cliente+empresa+número (case-insensitive,
  // ignora espacios extra) — la clave única real vive en la base, esto es
  // solo para encontrarla desde la UI antes de decidir crear o reusar.
  async function buscarOC(empresaId, clienteId, numeroOc) {
    if (!empresaId || !clienteId || !numeroOc) return null;
    const { data, error } = await db.from('ordenes_compra')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('cliente_id', clienteId)
      .ilike('numero_oc', numeroOc.trim())
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = 0 filas, no es error real
    return data || null;
  }

  async function crearOC(payload) {
    const { data, error } = await db.from('ordenes_compra')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function getOCById(id) {
    const { data, error } = await db.from('ordenes_compra')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // Suma de remitos ya vinculados a esta OC (sin contar el remito que se
  // está editando ahora mismo, para no contarlo dos veces al recalcular).
  async function getConsumidoOC(ocId, excluirRemitoId) {
    let q = db.from('remitos_v2')
      .select('id,total_valorizado')
      .eq('orden_compra_id', ocId)
      .neq('estado', 'anulado');
    const { data, error } = await q;
    if (error) throw error;
    return (data || [])
      .filter(r => r.id !== excluirRemitoId)
      .reduce((s, r) => s + Number(r.total_valorizado || 0), 0);
  }

  async function getOCsCliente(clienteId) {
    const { data, error } = await db.from('ordenes_compra')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function actualizarOC(id, payload) {
    const { error } = await db.from('ordenes_compra').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function anularOC(id, motivo) {
    const { error } = await db.from('ordenes_compra')
      .update({ estado: 'anulada', anulada_motivo: motivo || null, anulada_en: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async function reactivarOC(id) {
    const { error } = await db.from('ordenes_compra')
      .update({ estado: 'activa', anulada_motivo: null, anulada_en: null })
      .eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    buscarOC,
    crearOC,
    getOCById,
    getConsumidoOC,
    getOCsCliente,
    actualizarOC,
    anularOC,
    reactivarOC,
  };
})();
