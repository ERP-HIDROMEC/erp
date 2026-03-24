// ============================================================
// API — Caja: movimientos + cheques (flujo) + FCI
// Módulos que la usan: caja, index
// Nota: getCheques/crearCheque están en egresos.api.js
//   porque compras también los usa. Acá solo el flujo de caja.
// ============================================================

const CajaAPI = (() => {

  // ── Resumen KPIs ─────────────────────────────────────────────

  async function getResumenCaja(empresaId) {
    const [
      { data: movimientos, error: e1 },
      { data: fci, error: e2 },
    ] = await Promise.all([
      db.from('caja_movimientos').select('tipo,origen,monto').eq('empresa_id', empresaId),
      db.from('caja_fci').select('tipo,monto').eq('empresa_id', empresaId),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    return { movimientos: movimientos || [], fci: fci || [] };
  }

  // ── Movimientos ──────────────────────────────────────────────

  async function getMovimientos(filtros = {}) {
    let q = db.from('caja_movimientos')
      .select('*,empresas(nombre)')
      .order('fecha', { ascending: false })
      .limit(500);

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)       q = q.eq('tipo', filtros.tipo);
    if (filtros.fechaDesde) q = q.gte('fecha', filtros.fechaDesde);
    if (filtros.fechaHasta) q = q.lte('fecha', filtros.fechaHasta);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getMovimientosParaExportar(empresaId, fechaDesde, fechaHasta) {
    const { data, error } = await db.from('caja_movimientos')
      .select('fecha,descripcion,monto')
      .eq('empresa_id', empresaId)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .order('fecha');
    if (error) throw error;
    return data || [];
  }

  async function registrarMovimiento(payload) {
    const { error } = await db.from('caja_movimientos').insert(payload);
    if (error) throw error;
  }

  async function registrarMovimientos(rows) {
    const { error } = await db.from('caja_movimientos').insert(rows);
    if (error) throw error;
  }

  async function eliminarMovimiento(id) {
    const { error } = await db.from('caja_movimientos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Flujo de caja proyectado ─────────────────────────────────
  // Consolida: facturas por cobrar + egresos pendientes +
  //            cheques en cartera + cheques emitidos
  async function getFlujoCajaProyectado(empresaId, fechaDesde, fechaHasta) {
    const [
      { data: porCobrar },
      { data: porPagar },
      { data: chqCartera },
      { data: chqEmitidos },
    ] = await Promise.all([
      db.from('facturas_emitidas')
        .select('monto_total,fecha_cobro_estimada,clientes(nombre),empresas(nombre)')
        .eq('empresa_id', empresaId)
        .not('estado', 'in', '("cobrada","anulada")')
        .gte('fecha_cobro_estimada', fechaDesde)
        .lte('fecha_cobro_estimada', fechaHasta)
        .order('fecha_cobro_estimada'),
      db.from('egresos')
        .select('monto,fecha_egreso,descripcion,empresas(nombre)')
        .eq('empresa_id', empresaId)
        .eq('pagado', false)
        .gte('fecha_egreso', fechaDesde)
        .lte('fecha_egreso', fechaHasta)
        .order('fecha_egreso'),
      db.from('cheques')
        .select('monto,fecha_vencimiento,titular,numero,empresas(nombre)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'cartera')
        .gte('fecha_vencimiento', fechaDesde)
        .lte('fecha_vencimiento', fechaHasta)
        .order('fecha_vencimiento'),
      db.from('cheques')
        .select('monto,fecha_vencimiento,titular,numero,empresas(nombre)')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'emitido')
        .gte('fecha_vencimiento', fechaDesde)
        .lte('fecha_vencimiento', fechaHasta)
        .order('fecha_vencimiento'),
    ]);
    return {
      porCobrar:   porCobrar   || [],
      porPagar:    porPagar    || [],
      chqCartera:  chqCartera  || [],
      chqEmitidos: chqEmitidos || [],
    };
  }

  // ── FCI (Fondos Comunes de Inversión) ────────────────────────

  async function getFCI(filtros = {}) {
    let q = db.from('caja_fci')
      .select('*,empresas(nombre)')
      .order('fecha', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarFCI(payload) {
    const { error } = await db.from('caja_fci').insert(payload);
    if (error) throw error;
  }

  async function eliminarFCI(id) {
    const { error } = await db.from('caja_fci').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Pago de egreso desde caja ────────────────────────────────
  // (actualiza el egreso y genera el movimiento de caja)
  async function pagarEgresoConMovimiento(egresoId, payloadEgreso, movimientoCaja) {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      db.from('egresos').update(payloadEgreso).eq('id', egresoId),
      db.from('caja_movimientos').insert(movimientoCaja),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    getResumenCaja,
    getMovimientos,
    getMovimientosParaExportar,
    registrarMovimiento,
    registrarMovimientos,
    eliminarMovimiento,
    getFlujoCajaProyectado,
    getFCI,
    registrarFCI,
    eliminarFCI,
    pagarEgresoConMovimiento,
  };
})();
