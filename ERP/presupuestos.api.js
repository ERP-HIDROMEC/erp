// ============================================================
// API — Presupuestos + Items de Presupuesto
// ============================================================

const PresupuestosAPI = (() => {

  async function getPresupuestos(filtros = {}) {
    let q = db.from('presupuestos')
      .select('*,clientes(nombre),empresas(nombre),proyectos(nombre)')
      .order('created_at', { ascending: false });
    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.clienteId) q = q.eq('cliente_id', filtros.clienteId);
    if (filtros.estado)    q = q.eq('estado', filtros.estado);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getPresupuestoById(id) {
    const { data, error } = await db.from('presupuestos')
      .select('*,clientes(*),empresas(*)')
      .eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function crearPresupuesto(payload) {
    const { data, error } = await db.from('presupuestos')
      .insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function actualizarPresupuesto(id, payload) {
    const { error } = await db.from('presupuestos').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function cambiarEstado(id, estado) {
    const { error } = await db.from('presupuestos').update({ estado }).eq('id', id);
    if (error) throw error;
  }

  async function eliminarPresupuesto(id) {
    await db.from('presupuesto_items').delete().eq('presupuesto_id', id);
    const { error } = await db.from('presupuestos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Items ────────────────────────────────────────────────────

  async function getItemsPresupuesto(presupuestoId) {
    const { data, error } = await db.from('presupuesto_items')
      .select('*')
      .eq('presupuesto_id', presupuestoId)
      .order('orden');
    if (error) throw error;
    return data || [];
  }

  async function reemplazarItemsPresupuesto(presupuestoId, empresaId, items) {
    await db.from('presupuesto_items').delete().eq('presupuesto_id', presupuestoId);
    if (items && items.length) {
      const rows = items.map((it, i) => ({
        presupuesto_id: presupuestoId,
        empresa_id: empresaId,
        orden: i + 1,
        descripcion: it.descripcion,
        cantidad: it.cantidad || 1,
        precio_unitario: it.precio_unitario || 0,
        subtotal: (it.cantidad || 1) * (it.precio_unitario || 0),
        contrato_item_id: it.contrato_item_id || null,
      }));
      const { error } = await db.from('presupuesto_items').insert(rows);
      if (error) throw error;
    }
  }

  // Convierte un presupuesto aprobado en proyecto
  async function convertirAProyecto(presupuesto, payloadProyecto) {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      db.from('proyectos').insert(payloadProyecto),
      db.from('presupuestos').update({ estado: 'aprobado' }).eq('id', presupuesto.id),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
  }

  return {
    getPresupuestos, getPresupuestoById, crearPresupuesto,
    actualizarPresupuesto, cambiarEstado, eliminarPresupuesto,
    getItemsPresupuesto, reemplazarItemsPresupuesto, convertirAProyecto,
  };
})();
