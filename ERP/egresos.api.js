// ============================================================
// API — Egresos + Proveedores + Cheques
// Módulos que la usan: compras, caja, impuestos, index
// ============================================================

const EgresosAPI = (() => {

  // ── Egresos ─────────────────────────────────────────────────

  async function getEgresos(filtros = {}) {
    let q = db.from('egresos')
      .select('*,proveedores(nombre),empresas(nombre),proyectos(nombre)')
      .order('fecha_egreso', { ascending: false });

    if (filtros.empresaId)   q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.proveedorId) q = q.eq('proveedor_id', filtros.proveedorId);
    if (filtros.proyectoId)  q = q.eq('proyecto_id', filtros.proyectoId);
    if (filtros.pagado !== undefined) q = q.eq('pagado', filtros.pagado);
    if (filtros.fechaDesde)  q = q.gte('fecha_egreso', filtros.fechaDesde);
    if (filtros.fechaHasta)  q = q.lte('fecha_egreso', filtros.fechaHasta);
    if (filtros.ids)         q = q.in('id', filtros.ids);
    if (filtros.tipo)        q = q.eq('tipo', filtros.tipo);
    if (filtros.limit)       q = q.limit(filtros.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getEgresosParaDashboard(empresaId, fechaIni, fechaFin) {
    const { data, error } = await db.from('egresos')
      .select('monto')
      .eq('empresa_id', empresaId)
      .gte('fecha_egreso', fechaIni)
      .lt('fecha_egreso', fechaFin);
    if (error) throw error;
    return data || [];
  }

  async function getEgresosFlujoCaja(empresaId, fechaDesde, fechaHasta) {
    const { data, error } = await db.from('egresos')
      .select('monto,fecha_egreso,descripcion,empresas(nombre)')
      .eq('empresa_id', empresaId)
      .eq('pagado', false)
      .gte('fecha_egreso', fechaDesde)
      .lte('fecha_egreso', fechaHasta)
      .order('fecha_egreso');
    if (error) throw error;
    return data || [];
  }

  async function getEgresosVencidosDashboard(limite) {
    let q = db.from('egresos')
      .select('descripcion,monto,fecha_egreso,proveedores(nombre),empresas(nombre)')
      .eq('pagado', false)
      .lt('fecha_egreso', hoy())
      .order('fecha_egreso');
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getEgresoById(id) {
    const { data, error } = await db.from('egresos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function getEgresosImpuestos(empresaId, fechaDesde, fechaHasta) {
    const { data, error } = await db.from('egresos')
      .select('*,proveedores(nombre,cuit)')
      .eq('empresa_id', empresaId)
      .gte('fecha_egreso', fechaDesde)
      .lte('fecha_egreso', fechaHasta)
      .order('fecha_egreso');
    if (error) throw error;
    return data || [];
  }

  // Cuenta egresos con orden de pago asignado (para numeración)
  async function contarEgresosConOP(empresaId) {
    if (!empresaId) return 0;
    const { count, error } = await db.from('egresos')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .not('orden_pago_nro', 'is', null);
    if (error) throw error;
    return count || 0;
  }

  // Verifica duplicados por número de factura (importación)
  async function getEgresosExistentes(empresaId, numeros) {
    const { data, error } = await db.from('egresos')
      .select('numero_factura')
      .eq('empresa_id', empresaId)
      .in('numero_factura', numeros);
    if (error) throw error;
    return data || [];
  }

  // ── Mutaciones de egresos ───────────────────────────────────

  async function crearEgreso(payload) {
    const { data, error } = await db.from('egresos')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarEgreso(id, payload) {
    const { error } = await db.from('egresos')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  }

  async function eliminarEgreso(id) {
    const { error } = await db.from('egresos').delete().eq('id', id);
    if (error) throw error;
  }

  async function pagarEgreso(id, payload) {
    // payload: { pagado, fecha_pago, metodo_pago, orden_pago_nro, ... }
    const { error } = await db.from('egresos')
      .update({ pagado: true, ...payload })
      .eq('id', id);
    if (error) throw error;
  }

  async function liberarOrdenPago(id) {
    const { error } = await db.from('egresos')
      .update({ orden_pago_nro: null, pagado: false, fecha_pago: null, metodo_pago: null })
      .eq('id', id);
    if (error) throw error;
  }

  async function importarEgresos(rows) {
    const { error } = await db.from('egresos').insert(rows);
    if (error) throw error;
  }

  // ── Proveedores ─────────────────────────────────────────────

  async function getProveedores(filtros = {}) {
    let q = db.from('proveedores')
      .select('*,empresas(nombre)')
      .eq('activo', true)
      .order('nombre');

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getProveedoresSelect(empresaId) {
    const { data, error } = await db.from('proveedores')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function getProveedoresConCuit(empresaId) {
    const { data, error } = await db.from('proveedores')
      .select('id,nombre,cuit')
      .eq('empresa_id', empresaId)
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  }

  async function buscarOCrearProveedor(empresaId, nombre, cuit) {
    const { data } = await db.from('proveedores')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .ilike('nombre', nombre.trim())
      .eq('activo', true)
      .single();
    if (data) return data;
    const { data: nuevo, error } = await db.from('proveedores')
      .insert({ empresa_id: empresaId, nombre: nombre.trim(), cuit: cuit || null, activo: true })
      .select()
      .single();
    if (error) throw error;
    return nuevo;
  }

  async function crearProveedor(payload) {
    const { error } = await db.from('proveedores').insert(payload);
    if (error) throw error;
  }

  async function darBajaProveedor(id) {
    const { error } = await db.from('proveedores')
      .update({ activo: false })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Cheques ─────────────────────────────────────────────────

  async function getCheques(filtros = {}) {
    let q = db.from('cheques')
      .select('*,empresas(nombre)')
      .order('fecha_vencimiento');

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.estado)    q = q.eq('estado', filtros.estado);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getChequesFlujoCaja(empresaId, tipo, fechaDesde, fechaHasta) {
    const { data, error } = await db.from('cheques')
      .select('monto,fecha_vencimiento,titular,numero,empresas(nombre)')
      .eq('empresa_id', empresaId)
      .eq('tipo', tipo)
      .gte('fecha_vencimiento', fechaDesde)
      .lte('fecha_vencimiento', fechaHasta)
      .order('fecha_vencimiento');
    if (error) throw error;
    return data || [];
  }

  async function getChequesExistentes(empresaId, numeros) {
    const { data, error } = await db.from('cheques')
      .select('numero')
      .eq('empresa_id', empresaId)
      .in('numero', numeros);
    if (error) throw error;
    return data || [];
  }

  async function crearCheque(payload) {
    const { error } = await db.from('cheques').insert(payload);
    if (error) throw error;
  }

  async function crearCheques(rows) {
    const { error } = await db.from('cheques').insert(rows);
    if (error) throw error;
  }

  async function actualizarEstadoCheque(id, estado) {
    const { error } = await db.from('cheques').update({ estado }).eq('id', id);
    if (error) throw error;
  }

  async function actualizarEstadoCheques(ids, estado) {
    const { error } = await db.from('cheques').update({ estado }).in('id', ids);
    if (error) throw error;
  }

  async function eliminarCheque(id) {
    const { error } = await db.from('cheques').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getEgresos,
    getEgresosParaDashboard,
    getEgresosFlujoCaja,
    getEgresosVencidosDashboard,
    getEgresoById,
    getEgresosImpuestos,
    contarEgresosConOP,
    getEgresosExistentes,
    crearEgreso,
    actualizarEgreso,
    eliminarEgreso,
    pagarEgreso,
    liberarOrdenPago,
    importarEgresos,
    getProveedores,
    getProveedoresSelect,
    getProveedoresConCuit,
    buscarOCrearProveedor,
    crearProveedor,
    darBajaProveedor,
    getCheques,
    getChequesFlujoCaja,
    getChequesExistentes,
    crearCheque,
    crearCheques,
    actualizarEstadoCheque,
    actualizarEstadoCheques,
    eliminarCheque,
  };
})();
