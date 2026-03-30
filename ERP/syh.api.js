// ============================================================
// API — Seguridad e Higiene
// Cubre: syh_documentos, syh_capacitaciones,
//        syh_epp_entregas, syh_incidentes,
//        portales_clientes, portal_documentos
// Módulo que la usa: syh
// ============================================================

const SyhAPI = (() => {

  // ── Helper: subir archivo a storage ─────────────────────────
  // Upload delegado a StorageUtils (storage.utils.js)
  // Se mantiene _subirArchivo por compatibilidad con llamadas directas al API
  async function _subirArchivo(file, carpeta) {
    const arch = await StorageUtils.upload(file, carpeta);
    return arch.url;
  }

  // Eliminar archivo: usar StorageUtils.remove(path) desde el HTML
  // o llamar db.storage.from('syh-docs').remove([path]) directamente

  // ── Documentos empresa (syh_documentos) ─────────────────────

  async function getDocumentosEmpresa(filtros = {}) {
    let q = db.from('syh_documentos')
      .select('*,empresas(nombre)')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getDocsEmpresaProxVencer(dias = 60) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const limStr = limite.toISOString().split('T')[0];
    const { data, error } = await db.from('syh_documentos')
      .select('tipo,descripcion,fecha_vencimiento,empresas(nombre)')
      .lte('fecha_vencimiento', limStr)
      .not('fecha_vencimiento', 'is', null);
    if (error) throw error;
    return data || [];
  }

  async function registrarDocumentoEmpresa(payload) {
    // archivo_url y archivo_path ya vienen en payload (subidos por StorageUtils en el HTML)
    const { error } = await db.from('syh_documentos').insert(payload);
    if (error) throw error;
  }

  async function eliminarDocumentoEmpresa(id, storagePath) {
    await StorageUtils.remove(storagePath);
    const { error } = await db.from('syh_documentos').delete().eq('id', id);
    if (error) throw error;
  }

  async function renovarDocumentoEmpresa(id, nuevaFecha) {
    const { error } = await db.from('syh_documentos')
      .update({ fecha_vencimiento: nuevaFecha })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Capacitaciones (syh_capacitaciones) ─────────────────────

  async function getCapacitaciones(filtros = {}) {
    let q = db.from('syh_capacitaciones')
      .select('*,empresas(nombre),syh_capacitacion_asistentes(empleados(nombre))')
      .order('fecha', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getCapacitacionesProxVencer(dias = 60) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const limStr = limite.toISOString().split('T')[0];
    const { data, error } = await db.from('syh_capacitaciones')
      .select('tipo,descripcion,fecha_vencimiento,empresas(nombre)')
      .lte('fecha_vencimiento', limStr)
      .not('fecha_vencimiento', 'is', null);
    if (error) throw error;
    return data || [];
  }

  async function registrarCapacitacion(payload, asistentesIds) {
    // archivo_url y archivo_path ya vienen en payload (subidos por StorageUtils en el HTML)
    const { data: cap, error } = await db.from('syh_capacitaciones').insert(payload).select().single();
    if (error) throw error;

    if (asistentesIds && asistentesIds.length) {
      const { error: ea } = await db.from('syh_capacitacion_asistentes').insert(
        asistentesIds.map(empId => ({ capacitacion_id: cap.id, empleado_id: empId }))
      );
      if (ea) throw ea;
    }
    return cap;
  }

  async function eliminarCapacitacion(id, storagePath) {
    await StorageUtils.remove(storagePath);
    await db.from('syh_capacitacion_asistentes').delete().eq('capacitacion_id', id);
    const { error } = await db.from('syh_capacitaciones').delete().eq('id', id);
    if (error) throw error;
  }

  // ── EPP Entregas (syh_epp_entregas) ─────────────────────────

  async function getEntregasEPP(filtros = {}) {
    let q = db.from('syh_epp_entregas')
      .select('*,empleados(nombre),empresas(nombre)')
      .order('fecha_entrega', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.empleadoId) q = q.eq('empleado_id', filtros.empleadoId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getUltimasEntregasEmpleado(empleadoId, limite = 3) {
    const { data, error } = await db.from('syh_epp_entregas')
      .select('fecha_entrega,items')
      .eq('empleado_id', empleadoId)
      .order('fecha_entrega', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  }

  async function getEntregaEPPById(id) {
    const { data, error } = await db.from('syh_epp_entregas')
      .select('*,empleados(nombre,dni),empresas(nombre)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function registrarEntregaEPP(payload) {
    const { data, error } = await db.from('syh_epp_entregas')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function eliminarEntregaEPP(id) {
    const { error } = await db.from('syh_epp_entregas').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Incidentes (syh_incidentes) ──────────────────────────────

  async function getIncidentes(filtros = {}) {
    let q = db.from('syh_incidentes')
      .select('*,empleados(nombre),empresas(nombre)')
      .order('fecha', { ascending: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.tipo)      q = q.eq('tipo', filtros.tipo);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarIncidente(payload) {
    // archivo_url y archivo_path ya vienen en payload (subidos por StorageUtils en el HTML)
    const { error } = await db.from('syh_incidentes').insert(payload);
    if (error) throw error;
  }

  async function eliminarIncidente(id, storagePath) {
    await StorageUtils.remove(storagePath);
    const { error } = await db.from('syh_incidentes').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Alertas de vencimientos (dashboard syh) ──────────────────

  async function getAlertasVencimientos(dias = 60) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const limStr = limite.toISOString().split('T')[0];

    const [
      { data: docsEmpresa },
      { data: docsEmpleados },
      { data: capacitaciones },
      { data: docsVehiculos },
    ] = await Promise.all([
      db.from('syh_documentos')
        .select('tipo,descripcion,fecha_vencimiento,empresas(nombre)')
        .lte('fecha_vencimiento', limStr).not('fecha_vencimiento', 'is', null),
      db.from('empleados_documentos')
        .select('tipo,descripcion,fecha_vencimiento,empleados(nombre),empresas(nombre)')
        .lte('fecha_vencimiento', limStr).not('fecha_vencimiento', 'is', null),
      db.from('syh_capacitaciones')
        .select('tipo,descripcion,fecha_vencimiento,empresas(nombre)')
        .lte('fecha_vencimiento', limStr).not('fecha_vencimiento', 'is', null),
      db.from('empleados_documentos')
        .select('tipo,descripcion,fecha_vencimiento,empleado_id,empresas(nombre)')
        .not('fecha_vencimiento', 'is', null),
    ]);
    return {
      docsEmpresa:    docsEmpresa    || [],
      docsEmpleados:  docsEmpleados  || [],
      capacitaciones: capacitaciones || [],
      docsVehiculos:  docsVehiculos  || [],
    };
  }

  // ── Portales de clientes ─────────────────────────────────────

  async function getPortales(empresaId) {
    const { data, error } = await db.from('portales_clientes')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function crearPortal(payload) {
    const { data, error } = await db.from('portales_clientes')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ── Documentos de portales ───────────────────────────────────

  async function getDocumentosPortal(filtros = {}) {
    let q = db.from('portal_documentos')
      .select('*,portales_clientes(nombre),empleados(nombre),empresas(nombre)')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.portalId)  q = q.eq('portal_id', filtros.portalId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarDocumentoPortal(payload) {
    const { error } = await db.from('portal_documentos').insert(payload);
    if (error) throw error;
  }

  async function renovarDocumentoPortal(id, nuevaFecha) {
    const { error } = await db.from('portal_documentos')
      .update({ fecha_vencimiento: nuevaFecha })
      .eq('id', id);
    if (error) throw error;
  }

  async function eliminarDocumentoPortal(id) {
    const { error } = await db.from('portal_documentos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    getDocumentosEmpresa,
    getDocsEmpresaProxVencer,
    registrarDocumentoEmpresa,
    eliminarDocumentoEmpresa,
    renovarDocumentoEmpresa,
    getCapacitaciones,
    getCapacitacionesProxVencer,
    registrarCapacitacion,
    eliminarCapacitacion,
    getEntregasEPP,
    getUltimasEntregasEmpleado,
    getEntregaEPPById,
    registrarEntregaEPP,
    eliminarEntregaEPP,
    getIncidentes,
    registrarIncidente,
    eliminarIncidente,
    getAlertasVencimientos,
    getPortales,
    crearPortal,
    getDocumentosPortal,
    registrarDocumentoPortal,
    renovarDocumentoPortal,
    eliminarDocumentoPortal,
  };
})();
