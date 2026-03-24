// ============================================================
// API — Empresas
// Usada por casi todos los módulos para poblar el selector
// de empresa del sidebar/filtros.
// ============================================================

const EmpresasAPI = (() => {

  async function getEmpresas(soloActivas = true) {
    let q = db.from('empresas').select('id,nombre').order('nombre');
    if (soloActivas) q = q.eq('activa', true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getEmpresaById(id) {
    const { data, error } = await db.from('empresas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    getEmpresas,
    getEmpresaById,
  };
})();
