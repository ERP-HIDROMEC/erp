// ============================================================
// API — Clientes
// Módulos que la usan: clientes, contratos, empleados,
//   facturas, impuestos, presupuestos, proyectos, remitos,
//   dedup-clientes, index
// ============================================================

const ClientesAPI = (() => {

  // ── Consultas ───────────────────────────────────────────────

  async function getClientes(filtros = {}) {
    let q = db.from('clientes')
      .select('*,empresas(nombre)')
      .order('nombre');

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.soloActivos !== false) q = q.eq('activo', true);
    if (filtros.buscar)     q = q.ilike('nombre', `%${filtros.buscar}%`);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  // Lista liviana solo id+nombre — para selects/dropdowns
  async function getClientesSelect(empresaId) {
    const { data, error } = await db.from('clientes')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function getClienteById(id) {
    const { data, error } = await db.from('clientes')
      .select('*,empresas(nombre)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // Datos relacionados de un cliente (para su ficha)
  async function getClienteDetalle(id, empresaId) {
    const [
      { data: facturas },
      { data: remitos },
      { data: contratos },
      { data: proyectos },
    ] = await Promise.all([
      db.from('facturas_emitidas')
        .select('id,numero_factura,monto_total,estado,fecha_emision')
        .eq('cliente_id', id)
        .order('fecha_emision', { ascending: false })
        .limit(5),
      db.from('remitos_v2')
        .select('id,numero_formateado,total_valorizado,estado,fecha')
        .eq('cliente_id', id)
        .order('fecha', { ascending: false })
        .limit(5),
      db.from('contratos')
        .select('id,numero_contrato,estado,monto_total,fecha_inicio')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      db.from('proyectos')
        .select('id,nombre,estado,fecha_inicio')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
    return { facturas: facturas || [], remitos: remitos || [], contratos: contratos || [], proyectos: proyectos || [] };
  }

  // ── Mutaciones ──────────────────────────────────────────────

  async function crearCliente(payload) {
    const { data, error } = await db.from('clientes')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarCliente(id, payload) {
    const { data, error } = await db.from('clientes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function toggleActivoCliente(id, estaActivo) {
    const { error } = await db.from('clientes')
      .update({ activo: !estaActivo })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Documentos de cliente (cliente_docs_config) ─────────────

  async function getDocsCliente(clienteId) {
    const { data, error } = await db.from('cliente_docs_config')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function getDocsClientesProxVencer(dias = 60) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const limStr = limite.toISOString().split('T')[0];

    const { data, error } = await db.from('cliente_docs_config')
      .select('tipo,descripcion,fecha_vencimiento,clientes(nombre)')
      .lte('fecha_vencimiento', limStr)
      .neq('fecha_vencimiento', null);
    if (error) throw error;
    return data || [];
  }

  async function crearDocCliente(payload) {
    const { error } = await db.from('cliente_docs_config').insert(payload);
    if (error) throw error;
  }

  async function actualizarDocCliente(id, payload) {
    const { error } = await db.from('cliente_docs_config')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  }

  async function eliminarDocCliente(id) {
    const { error } = await db.from('cliente_docs_config').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getClientes,
    getClientesSelect,
    getClienteById,
    getClienteDetalle,
    crearCliente,
    actualizarCliente,
    toggleActivoCliente,
    getDocsCliente,
    getDocsClientesProxVencer,
    crearDocCliente,
    actualizarDocCliente,
    eliminarDocCliente,
  };
})();
