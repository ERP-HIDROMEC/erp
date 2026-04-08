// ============================================================
// API — Facturas Emitidas + Cobros + Retenciones
// Módulos que la usan: facturas, index, caja, proyectos,
//   impuestos, clientes, remitos, dedup-clientes
// ============================================================

const FacturasAPI = (() => {

  // ── Facturas emitidas ───────────────────────────────────────

  async function getFacturas(filtros = {}) {
    let q = db.from('facturas_emitidas')
      .select('*,clientes(nombre),empresas(nombre)')
      .order('fecha_emision', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.estado)     q = q.eq('estado', filtros.estado);
    if (filtros.clienteId)  q = q.eq('cliente_id', filtros.clienteId);
    if (filtros.proyectoId) q = q.eq('proyecto_id', filtros.proyectoId);
    if (filtros.fechaDesde) q = q.gte('fecha_emision', filtros.fechaDesde);
    if (filtros.fechaHasta) q = q.lt('fecha_emision', filtros.fechaHasta);
    if (filtros.excluirAnuladas) q = q.neq('estado', 'anulada');
    if (filtros.soloVencidas) q = q.not('estado', 'in', '("cobrada","anulada")').lt('fecha_cobro_estimada', hoy());
    if (filtros.limit)      q = q.limit(filtros.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getFacturasParaDashboard(empresaId, fechaIni, fechaFin, anioIni, anioFin) {
    const [
      { data: mesActual },
      { data: anioActual },
      { data: porCobrar },
      { data: vencidas },
    ] = await Promise.all([
      db.from('facturas_emitidas').select('monto_total')
        .eq('empresa_id', empresaId).neq('estado', 'anulada')
        .gte('fecha_emision', fechaIni).lt('fecha_emision', fechaFin),
      db.from('facturas_emitidas').select('monto_total')
        .eq('empresa_id', empresaId).neq('estado', 'anulada')
        .gte('fecha_emision', anioIni).lt('fecha_emision', anioFin),
      db.from('facturas_emitidas').select('monto_total')
        .eq('empresa_id', empresaId).not('estado', 'in', '("cobrada","anulada")'),
      db.from('facturas_emitidas').select('id')
        .eq('empresa_id', empresaId).not('estado', 'in', '("cobrada","anulada")')
        .lt('fecha_cobro_estimada', hoy()),
    ]);
    return { mesActual: mesActual || [], anioActual: anioActual || [], porCobrar: porCobrar || [], vencidas: vencidas || [] };
  }

  async function getFacturasVencidasDetalle(limite) {
    let q = db.from('facturas_emitidas')
      .select('numero_factura,monto_total,fecha_cobro_estimada,clientes(nombre),empresas(nombre)')
      .not('estado', 'in', '("cobrada","anulada")')
      .lt('fecha_cobro_estimada', hoy())
      .order('fecha_cobro_estimada');
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getFacturaMensual(empresaId, fechaIni, fechaFin) {
    let q = db.from('facturas_emitidas')
      .select('monto_total,fecha_emision,empresas(nombre)')
      .neq('estado', 'anulada')
      .gte('fecha_emision', fechaIni)
      .lt('fecha_emision', fechaFin)
      .order('fecha_emision');
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getFacturasPorCliente(empresaId, fechaIni, fechaFin) {
    let q = db.from('facturas_emitidas')
      .select('monto_total,clientes(nombre),empresas(nombre),empresa_id')
      .neq('estado', 'anulada')
      .gte('fecha_emision', fechaIni)
      .lt('fecha_emision', fechaFin);
    if (empresaId) q = q.eq('empresa_id', empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getFacturasFlujoCaja(empresaId, fechaDesde, fechaHasta) {
    const { data, error } = await db.from('facturas_emitidas')
      .select('monto_total,fecha_cobro_estimada,clientes(nombre),empresas(nombre)')
      .eq('empresa_id', empresaId)
      .not('estado', 'in', '("cobrada","anulada")')
      .gte('fecha_cobro_estimada', fechaDesde)
      .lte('fecha_cobro_estimada', fechaHasta)
      .order('fecha_cobro_estimada');
    if (error) throw error;
    return data || [];
  }

  async function getFacturaById(id) {
    const { data, error } = await db.from('facturas_emitidas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function getFacturasImpuestos(empresaId, fechaDesde, fechaHasta) {
    const { data, error } = await db.from('facturas_emitidas')
      .select('*,clientes(nombre,cuit)')
      .eq('empresa_id', empresaId)
      .neq('estado', 'anulada')
      .gte('fecha_emision', fechaDesde)
      .lte('fecha_emision', fechaHasta)
      .order('fecha_emision');
    if (error) throw error;
    return data || [];
  }

  // Verifica si ya existe una factura con ese número (para importación)
  async function existeFactura(empresaId, numeroFactura) {
    const { data } = await db.from('facturas_emitidas')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('numero_factura', numeroFactura)
      .single();
    return !!data;
  }

  // ── Mutaciones de facturas ──────────────────────────────────

  async function crearFactura(payload) {
    const { data, error } = await db.from('facturas_emitidas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarFactura(id, payload) {
    // Excluir campos que no son columnas de la tabla
    const { remitos_ids, ...clean } = payload;
    const { error } = await db.from('facturas_emitidas')
      .update(clean)
      .eq('id', id);
    if (error) throw error;
  }

  async function anularFactura(id) {
    const { error } = await db.from('facturas_emitidas')
      .update({ estado: 'anulada' })
      .eq('id', id);
    if (error) throw error;
  }

  async function marcarFacturaCobrada(id) {
    const { error } = await db.from('facturas_emitidas')
      .update({ estado: 'cobrada' })
      .eq('id', id);
    if (error) throw error;
  }

  async function importarFacturas(rows) {
    // rows: array de objetos ya validados listos para insertar
    const { error } = await db.from('facturas_emitidas').insert(rows);
    if (error) throw error;
  }

  // ── Cobros ──────────────────────────────────────────────────

  async function getCobros(filtros = {}) {
    let q = db.from('cobros')
      .select('*,facturas_emitidas(numero_factura,clientes(nombre)),empresas(nombre)')
      .order('fecha', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.fechaDesde) q = q.gte('fecha', filtros.fechaDesde);
    if (filtros.fechaHasta) q = q.lte('fecha', filtros.fechaHasta);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getCobrosParaDashboard(empresaId, fechaIni, fechaFin) {
    const { data, error } = await db.from('cobros')
      .select('monto')
      .eq('empresa_id', empresaId)
      .gte('fecha', fechaIni)
      .lt('fecha', fechaFin);
    if (error) throw error;
    return data || [];
  }

  async function registrarCobro(payload) {
    const { error } = await db.from('cobros').insert(payload);
    if (error) throw error;
  }

  // ── Retenciones ─────────────────────────────────────────────

  async function getRetenciones(filtros = {}) {
    let q = db.from('retenciones')
      .select('*,clientes(nombre),empresas(nombre)')
      .order('fecha', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);
    if (filtros.periodo)   q = q.eq('periodo', filtros.periodo);
    if (filtros.soloIIBB)  q = q.eq('tipo', 'iibb');

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function crearRetencion(payload) {
    const { error } = await db.from('retenciones').insert(payload);
    if (error) throw error;
  }

  async function crearRetenciones(rows) {
    const { error } = await db.from('retenciones').insert(rows);
    if (error) throw error;
  }

  async function eliminarRetencion(id) {
    const { error } = await db.from('retenciones').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getFacturas,
    getFacturasParaDashboard,
    getFacturasVencidasDetalle,
    getFacturaMensual,
    getFacturasPorCliente,
    getFacturasFlujoCaja,
    getFacturaById,
    getFacturasImpuestos,
    existeFactura,
    crearFactura,
    actualizarFactura,
    anularFactura,
    marcarFacturaCobrada,
    importarFacturas,
    getCobros,
    getCobrosParaDashboard,
    registrarCobro,
    getRetenciones,
    crearRetencion,
    crearRetenciones,
    eliminarRetencion,
  };
})();
