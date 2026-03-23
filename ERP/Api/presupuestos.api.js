// ============================================================
// API — Presupuestos
// Módulo que la usa: presupuestos
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
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function crearPresupuesto(payload) {
    const { data, error } = await db.from('presupuestos')
      .insert(payload)
      .select()
      .single();
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
    const { error } = await db.from('presupuestos').delete().eq('id', id);
    if (error) throw error;
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

  // ── API pública ──────────────────────────────────────────────
  return {
    getPresupuestos,
    getPresupuestoById,
    crearPresupuesto,
    actualizarPresupuesto,
    cambiarEstado,
    eliminarPresupuesto,
    convertirAProyecto,
  };
})();
