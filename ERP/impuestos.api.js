// ============================================================
// API — Impuestos: IVA + IIBB + Pagos + Retenciones + Varios
// Módulo que la usa: impuestos
// Nota: retenciones también está en facturas.api.js
//   porque facturas las genera automáticamente.
// ============================================================

const ImpuestosAPI = (() => {

  // ── Datos para liquidación IVA ───────────────────────────────

  async function getDatosIVA(empresaId, periodoDesde, periodoHasta) {
    const [
      { data: facturas, error: e1 },
      { data: compras,  error: e2 },
      { data: retenciones, error: e3 },
      { data: pagos,    error: e4 },
    ] = await Promise.all([
      db.from('facturas_emitidas')
        .select('*,clientes(nombre,cuit)')
        .eq('empresa_id', empresaId)
        .neq('estado', 'anulada')
        .gte('fecha_emision', periodoDesde)
        .lte('fecha_emision', periodoHasta)
        .order('fecha_emision'),
      db.from('egresos')
        .select('*,proveedores(nombre,cuit)')
        .eq('empresa_id', empresaId)
        .gte('fecha_egreso', periodoDesde)
        .lte('fecha_egreso', periodoHasta)
        .order('fecha_egreso'),
      db.from('retenciones')
        .select('*,clientes(nombre)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'iva')
        .gte('fecha', periodoDesde)
        .lte('fecha', periodoHasta),
      db.from('pagos_impuestos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'iva')
        .gte('fecha', periodoDesde)
        .lte('fecha', periodoHasta),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    if (e4) throw e4;
    return {
      facturas:    facturas    || [],
      compras:     compras     || [],
      retenciones: retenciones || [],
      pagos:       pagos       || [],
    };
  }

  // ── Datos para liquidación IIBB ──────────────────────────────

  async function getDatosIIBB(empresaId, periodoDesde, periodoHasta) {
    const [
      { data: facturas, error: e1 },
      { data: retIIBB,  error: e2 },
      { data: pagos,    error: e3 },
    ] = await Promise.all([
      db.from('facturas_emitidas')
        .select('*,clientes(nombre)')
        .eq('empresa_id', empresaId)
        .neq('estado', 'anulada')
        .gte('fecha_emision', periodoDesde)
        .lte('fecha_emision', periodoHasta)
        .order('fecha_emision'),
      db.from('retenciones')
        .select('*,clientes(nombre)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'iibb')
        .gte('fecha', periodoDesde)
        .lte('fecha', periodoHasta),
      db.from('pagos_impuestos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'iibb')
        .gte('fecha', periodoDesde)
        .lte('fecha', periodoHasta),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    return { facturas: facturas || [], retenciones: retIIBB || [], pagos: pagos || [] };
  }

  // ── Retenciones ──────────────────────────────────────────────

  async function getRetenciones(filtros = {}) {
    let q = db.from('retenciones')
      .select('*,clientes(nombre),empresas(nombre)')
      .order('fecha_pago', { ascending: false, nullsFirst: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);
    if (filtros.periodo)   q = q.eq('periodo', filtros.periodo);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function crearRetencion(payload) {
    const { error } = await db.from('retenciones').insert(payload);
    if (error) throw error;
  }

  async function eliminarRetencion(id) {
    const { error } = await db.from('retenciones').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Pagos de impuestos ───────────────────────────────────────

  async function getPagosImpuestos(filtros = {}) {
    let q = db.from('pagos_impuestos')
      .select('*,empresas(nombre)')
      .order('fecha_pago', { ascending: false, nullsFirst: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);
    if (filtros.periodo)   q = q.eq('periodo', filtros.periodo);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarPago(payload) {
    const { error } = await db.from('pagos_impuestos').insert(payload);
    if (error) throw error;
  }

  async function eliminarPago(id) {
    const { error } = await db.from('pagos_impuestos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Impuestos varios ─────────────────────────────────────────

  async function getImpuestosVarios(filtros = {}) {
    let q = db.from('impuestos_varios')
      .select('*,empresas(nombre)')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);
    if (filtros.pagado !== undefined) q = q.eq('pagado', filtros.pagado);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarImpuestoVario(payload) {
    const { error } = await db.from('impuestos_varios').insert(payload);
    if (error) throw error;
  }

  async function marcarPagadoVario(id) {
    const { error } = await db.from('impuestos_varios')
      .update({ pagado: true })
      .eq('id', id);
    if (error) throw error;
  }

  async function eliminarImpuestoVario(id) {
    const { error } = await db.from('impuestos_varios').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    getDatosIVA,
    getDatosIIBB,
    getRetenciones,
    crearRetencion,
    eliminarRetencion,
    getPagosImpuestos,
    registrarPago,
    eliminarPago,
    getImpuestosVarios,
    registrarImpuestoVario,
    marcarPagadoVario,
    eliminarImpuestoVario,
  };
})();
