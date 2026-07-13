// ============================================================
// API — Costo Laboral UOCRA (supuestos + categorías + cálculo)
// Módulo que la usa: empleados (pestaña "Costos por categoría")
// ============================================================

const CostoLaboralAPI = (() => {

  // ── Supuestos (fila única) ────────────────────────────────────

  async function getSupuestos() {
    const { data, error } = await db.from('costo_laboral_supuestos')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarSupuestos(payload) {
    const { error } = await db.from('costo_laboral_supuestos')
      .update(payload)
      .eq('id', 1);
    if (error) throw error;
  }

  // ── Categorías UOCRA ──────────────────────────────────────────

  async function getCategorias() {
    const { data, error } = await db.from('costo_laboral_categorias')
      .select('*')
      .order('orden');
    if (error) throw error;
    return data || [];
  }

  async function actualizarJornalCategoria(id, jornalParitaria) {
    const { error } = await db.from('costo_laboral_categorias')
      .update({ jornal_paritaria: jornalParitaria, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Cálculo (replica exacta de la planilla UOCRA) ──────────────
  // Devuelve el desglose completo para una categoría dada los supuestos.
  function calcular(jornalParitaria, supuestos) {
    const s = supuestos;
    const jornalConAcuerdo = jornalParitaria * (1 + Number(s.pct_acuerdo_empresarial));
    const salarioMensualRemunerativo = jornalConAcuerdo * Number(s.jornales_mes);
    const provisionFeriados = jornalConAcuerdo * (Number(s.feriados_anio) / 12);
    const premioAsistencia = salarioMensualRemunerativo * Number(s.pct_presentismo);
    const snrMensual = 0; // sin sumas no remunerativas cargadas por ahora
    const totalRemuneracionBruta = salarioMensualRemunerativo + provisionFeriados + premioAsistencia + snrMensual;
    const sac = (totalRemuneracionBruta - snrMensual) * Number(s.sac_factor);
    const provisionVacaciones = jornalConAcuerdo * (Number(s.dias_vacaciones) / 12);
    const baseRemunerativa = totalRemuneracionBruta + sac + provisionVacaciones;
    const contribSegSocial = baseRemunerativa * Number(s.pct_cargas_sociales);
    const fondoCese = baseRemunerativa * Number(s.pct_fondo_cese);
    const aporteObraSocial = baseRemunerativa * Number(s.pct_obra_social);
    const art = baseRemunerativa * Number(s.pct_art);
    const seguroVida = Number(s.seguro_vida_mensual);
    const eppMensual = eppTotalMensual(s.epp_items);
    const contingenciaEnfermedad = salarioMensualRemunerativo * Number(s.pct_contingencia_enfermedad || 0);

    const costoTotalMes = totalRemuneracionBruta + sac + provisionVacaciones +
      contribSegSocial + fondoCese + aporteObraSocial + art + seguroVida + eppMensual + contingenciaEnfermedad;
    const costoTotalHora = costoTotalMes / Number(s.jornales_mes);

    return {
      jornalConAcuerdo, salarioMensualRemunerativo, provisionFeriados, premioAsistencia,
      snrMensual, totalRemuneracionBruta, sac, provisionVacaciones, baseRemunerativa,
      contribSegSocial, fondoCese, aporteObraSocial, art, seguroVida, eppMensual,
      contingenciaEnfermedad, costoTotalMes, costoTotalHora,
    };
  }

  function eppTotalMensual(items) {
    return (items || []).reduce((s, it) => {
      const vidaUtil = Number(it.vida_util_meses) || 1;
      return s + (Number(it.precio_unitario) || 0) / vidaUtil;
    }, 0);
  }

  // ── Adicionales por cliente ($/hora) ───────────────────────────

  async function getCostosAdicionalesCliente(clienteId) {
    const { data, error } = await db.from('cliente_costos_adicionales')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at');
    if (error) throw error;
    return data || [];
  }

  // Suma solo los adicionales activos — es lo que se usa para costear
  async function getTotalAdicionalCliente(clienteId) {
    if (!clienteId) return 0;
    const { data, error } = await db.from('cliente_costos_adicionales')
      .select('monto_hora')
      .eq('cliente_id', clienteId)
      .eq('activo', true);
    if (error) throw error;
    return (data || []).reduce((s, r) => s + Number(r.monto_hora || 0), 0);
  }

  async function crearCostoAdicionalCliente(payload) {
    const { error } = await db.from('cliente_costos_adicionales').insert(payload);
    if (error) throw error;
  }

  async function actualizarCostoAdicionalCliente(id, payload) {
    const { error } = await db.from('cliente_costos_adicionales').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function eliminarCostoAdicionalCliente(id) {
    const { error } = await db.from('cliente_costos_adicionales').delete().eq('id', id);
    if (error) throw error;
  }

  // ── API pública ─────────────────────────────────────────────
  return {
    getSupuestos,
    actualizarSupuestos,
    getCategorias,
    actualizarJornalCategoria,
    calcular,
    eppTotalMensual,
    getCostosAdicionalesCliente,
    getTotalAdicionalCliente,
    crearCostoAdicionalCliente,
    actualizarCostoAdicionalCliente,
    eliminarCostoAdicionalCliente,
  };
})();
