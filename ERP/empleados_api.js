// ============================================================
// API — Empleados + Sueldos + Documentos + Ausencias + Vehículos
// Módulos que la usan: empleados, proyectos, presupuestos, syh
// ============================================================

const EmpleadosAPI = (() => {

  // ── Empleados ────────────────────────────────────────────────

  async function getEmpleados(filtros = {}) {
    let q = db.from('empleados')
      .select('*,empresas(nombre)')
      .order('nombre');

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.soloActivos !== false) q = q.eq('activo', true);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getEmpleadosSelect(empresaId) {
    const { data, error } = await db.from('empleados')
      .select('id,nombre')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  }

  async function getEmpleadosConCostoHora(empresaId) {
    const { data, error } = await db.from('empleados')
      .select('costo_hora')
      .eq('empresa_id', empresaId)
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  }

  async function getEmpleadoById(id) {
    const { data, error } = await db.from('empleados')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function crearEmpleado(payload) {
    const { data, error } = await db.from('empleados')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarEmpleado(id, payload) {
    const { error } = await db.from('empleados').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function toggleActivoEmpleado(id, estaActivo) {
    const { error } = await db.from('empleados')
      .update({ activo: !estaActivo })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Sueldos ─────────────────────────────────────────────────

  async function getSueldos(filtros = {}) {
    let q = db.from('sueldos')
      .select('*,empleados(nombre),empresas(nombre)')
      .order('periodo', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.empleadoId) q = q.eq('empleado_id', filtros.empleadoId);
    if (filtros.periodo)    q = q.eq('periodo', filtros.periodo);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarSueldo(payload) {
    const { error } = await db.from('sueldos').insert(payload);
    if (error) throw error;
  }

  async function pagarSueldo(id) {
    const { error } = await db.from('sueldos')
      .update({ pagado: true, fecha_pago: hoy() })
      .eq('id', id);
    if (error) throw error;
  }

  async function eliminarSueldo(id) {
    const { error } = await db.from('sueldos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Documentos de empleados ─────────────────────────────────

  async function getDocumentosEmpleado(filtros = {}) {
    let q = db.from('empleados_documentos')
      .select('*,empleados(nombre),empresas(nombre)')
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (filtros.empleadoId) q = q.eq('empleado_id', filtros.empleadoId);
    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.categoria)  q = q.eq('categoria', filtros.categoria);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getDocsProxVencer(dias = 60) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const limStr = limite.toISOString().split('T')[0];

    const { data, error } = await db.from('empleados_documentos')
      .select('tipo,descripcion,fecha_vencimiento,empleados(nombre),empresas(nombre)')
      .lte('fecha_vencimiento', limStr)
      .neq('fecha_vencimiento', null);
    if (error) throw error;
    return data || [];
  }

  async function getDocsAlerta(empresaId, limite) {
    if (!empresaId) return [];
    const { data, error } = await db.from('empleados_documentos')
      .select('tipo,descripcion,fecha_vencimiento,empleados(nombre)')
      .eq('empresa_id', empresaId)
      .not('fecha_vencimiento', 'is', null)
      .order('fecha_vencimiento')
      .limit(limite || 20);
    if (error) throw error;
    return data || [];
  }

  async function subirDocumentoEmpleado(path, file, bucket = 'empleados-docs') {
    const { error } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = db.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function registrarDocumentoEmpleado(payload) {
    const { error } = await db.from('empleados_documentos').insert(payload);
    if (error) throw error;
  }

  async function eliminarDocumentoEmpleado(id, storagePath, bucket = 'empleados-docs') {
    if (storagePath) {
      await db.storage.from(bucket).remove([storagePath]);
    }
    const { error } = await db.from('empleados_documentos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Ausencias ────────────────────────────────────────────────

  async function getAusencias(filtros = {}) {
    let q = db.from('empleados_ausencias')
      .select('*,empleados(nombre),empresas(nombre)')
      .order('fecha_inicio', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.empleadoId) q = q.eq('empleado_id', filtros.empleadoId);
    if (filtros.estado)     q = q.eq('estado', filtros.estado);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function registrarAusencia(payload, file, storagePath) {
    let archivoUrl = null;
    if (file && storagePath) {
      const { error: ue } = await db.storage.from('empleados-docs').upload(storagePath, file, { contentType: file.type, upsert: false });
      if (!ue) {
        const { data: ud } = db.storage.from('empleados-docs').getPublicUrl(storagePath);
        archivoUrl = ud?.publicUrl || null;
      }
    }
    const { error } = await db.from('empleados_ausencias').insert({ ...payload, archivo_url: archivoUrl });
    if (error) throw error;
  }

  async function cambiarEstadoAusencia(id, estado) {
    const { error } = await db.from('empleados_ausencias').update({ estado }).eq('id', id);
    if (error) throw error;
  }

  async function eliminarAusencia(id) {
    const { error } = await db.from('empleados_ausencias').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Vehículos ────────────────────────────────────────────────

  async function getVehiculos(filtros = {}) {
    let q = db.from('vehiculos')
      .select('*,empresas(nombre)')
      .order('descripcion');

    if (filtros.empresaId) q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.soloActivos !== false) q = q.eq('activo', true);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getVehiculosSelect(empresaId) {
    const { data, error } = await db.from('vehiculos')
      .select('id,descripcion,patente')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('descripcion');
    if (error) throw error;
    return data || [];
  }

  async function getVehiculoById(id) {
    const { data, error } = await db.from('vehiculos').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function crearVehiculo(payload) {
    const { error } = await db.from('vehiculos').insert(payload);
    if (error) throw error;
  }

  async function actualizarVehiculo(id, payload) {
    const { error } = await db.from('vehiculos').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function toggleActivoVehiculo(id, estaActivo) {
    const { error } = await db.from('vehiculos').update({ activo: !estaActivo }).eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getEmpleados,
    getEmpleadosSelect,
    getEmpleadosConCostoHora,
    getEmpleadoById,
    crearEmpleado,
    actualizarEmpleado,
    toggleActivoEmpleado,
    getSueldos,
    registrarSueldo,
    pagarSueldo,
    eliminarSueldo,
    getDocumentosEmpleado,
    getDocsProxVencer,
    getDocsAlerta,
    subirDocumentoEmpleado,
    registrarDocumentoEmpleado,
    eliminarDocumentoEmpleado,
    getAusencias,
    registrarAusencia,
    cambiarEstadoAusencia,
    eliminarAusencia,
    getVehiculos,
    getVehiculosSelect,
    getVehiculoById,
    crearVehiculo,
    actualizarVehiculo,
    toggleActivoVehiculo,
  };
})();
