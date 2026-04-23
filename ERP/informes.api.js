// ============================================================
// API — Informes de obra / mantenimiento / inspección
// Módulos que la usan: informes
// Tablas: informes, informe_equipos, informe_tareas,
//         informe_alertas, informe_fotos
// ============================================================

const InformesAPI = (() => {

  // ── Informes ─────────────────────────────────────────────────

  async function getInformes(filtros = {}) {
    let q = db.from('informes')
      .select('*,clientes(nombre),empresas(nombre),proyectos(nombre)')
      .order('fecha', { ascending: false });

    if (filtros.empresaId)  q = q.eq('empresa_id', filtros.empresaId);
    if (filtros.clienteId)  q = q.eq('cliente_id', filtros.clienteId);
    if (filtros.proyectoId) q = q.eq('proyecto_id', filtros.proyectoId);
    if (filtros.tipo)       q = q.eq('tipo', filtros.tipo);
    if (filtros.fechaDesde) q = q.gte('fecha', filtros.fechaDesde);
    if (filtros.fechaHasta) q = q.lte('fecha', filtros.fechaHasta);
    if (filtros.limit)      q = q.limit(filtros.limit);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function getInformeById(id) {
    const { data, error } = await db.from('informes')
      .select('*,clientes(nombre),empresas(nombre),proyectos(nombre)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async function crearInforme(payload) {
    const { data, error } = await db.from('informes')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function actualizarInforme(id, payload) {
    const { error } = await db.from('informes').update(payload).eq('id', id);
    if (error) throw error;
  }

  async function eliminarInforme(id) {
    // Cascada manual: fotos → alertas → tareas → equipos → informe
    await db.from('informe_fotos').delete().eq('informe_id', id);
    await db.from('informe_alertas').delete().eq('informe_id', id);
    // tareas se borran por cascade de equipos en la BD, pero por si acaso:
    const { data: eqs } = await db.from('informe_equipos').select('id').eq('informe_id', id);
    if (eqs?.length) {
      const eqIds = eqs.map(e => e.id);
      await db.from('informe_tareas').delete().in('equipo_id', eqIds);
    }
    await db.from('informe_equipos').delete().eq('informe_id', id);
    const { error } = await db.from('informes').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Equipos / secciones ──────────────────────────────────────

  async function getEquiposInforme(informeId) {
    const { data, error } = await db.from('informe_equipos')
      .select('*')
      .eq('informe_id', informeId)
      .order('orden');
    if (error) throw error;
    return data || [];
  }

  async function getTareasEquipo(equipoId) {
    const { data, error } = await db.from('informe_tareas')
      .select('*')
      .eq('equipo_id', equipoId)
      .order('orden');
    if (error) throw error;
    return data || [];
  }

  // ── Alertas ──────────────────────────────────────────────────

  async function getAlertasInforme(informeId) {
    const { data, error } = await db.from('informe_alertas')
      .select('*')
      .eq('informe_id', informeId)
      .order('created_at');
    if (error) throw error;
    return data || [];
  }

  // ── Fotos ────────────────────────────────────────────────────

  async function getFotosInforme(informeId) {
    const { data, error } = await db.from('informe_fotos')
      .select('*')
      .eq('informe_id', informeId)
      .order('orden');
    if (error) throw error;
    return data || [];
  }

  async function subirFotoInforme(informeId, file, orden, caption, seccion) {
    const ext  = file.name.split('.').pop();
    const path = `informes/${informeId}/${Date.now()}_${orden}.${ext}`;
    const { error: upErr } = await db.storage
      .from('informes-fotos')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw upErr;
    const { data: urlData } = db.storage.from('informes-fotos').getPublicUrl(path);
    const url = urlData?.publicUrl || null;
    const { error } = await db.from('informe_fotos').insert({
      informe_id: informeId,
      url,
      storage_path: path,
      caption: caption || '',
      seccion: seccion || '',
      orden,
    });
    if (error) throw error;
    return url;
  }

  async function eliminarFotoInforme(fotoId, storagePath) {
    if (storagePath) await db.storage.from('informes-fotos').remove([storagePath]);
    const { error } = await db.from('informe_fotos').delete().eq('id', fotoId);
    if (error) throw error;
  }

  // ── Guardar informe completo (upsert atómico) ─────────────────
  // Recibe el objeto completo del formulario y lo persiste en cascada.
  // Si el informe ya existe (id presente) actualiza, si no crea uno nuevo.

  async function guardarInformeCompleto(empresaId, formData) {
    const {
      id: existingId,
      tipo, titulo, n_informe, oc, fecha,
      empresa, empresa_ej, localizacion, sector, disciplina,
      ordenes, cert_num, avance_pct, subtipo,
      objetivos, equipos, alertas, observaciones,
      elaborado, aprobado,
      cliente_id = null, proyecto_id = null, contrato_id = null,
    } = formData;

    // 1. Cabecera del informe
    const payload = {
      empresa_id:    empresaId,
      cliente_id:    cliente_id || null,
      proyecto_id:   proyecto_id || null,
      contrato_id:   contrato_id || null,
      tipo,
      titulo,
      n_informe,
      oc:            oc || null,
      fecha,
      empresa_nombre:   empresa || '',
      empresa_ej_nombre: empresa_ej || '',
      localizacion:  localizacion || '',
      sector:        sector || '',
      disciplina:    disciplina || '',
      ordenes_trabajo: ordenes || [],
      cert_num:      cert_num || null,
      avance_pct:    avance_pct ? Number(avance_pct) : null,
      subtipo:       subtipo || null,
      observaciones: observaciones || '',
      elab_nombre:   elaborado?.nombre || '',
      elab_cargo:    elaborado?.cargo || '',
      elab_fecha:    elaborado?.fecha || null,
      apro_nombre:   aprobado?.nombre || '',
      apro_cargo:    aprobado?.cargo || '',
      apro_fecha:    aprobado?.fecha || null,
    };

    let informeId;
    if (existingId) {
      await actualizarInforme(existingId, payload);
      informeId = existingId;
      // Limpiar registros anteriores de objetivos/equipos/alertas
      const { data: eqs } = await db.from('informe_equipos').select('id').eq('informe_id', informeId);
      if (eqs?.length) {
        await db.from('informe_tareas').delete().in('equipo_id', eqs.map(e => e.id));
      }
      await db.from('informe_equipos').delete().eq('informe_id', informeId);
      await db.from('informe_alertas').delete().eq('informe_id', informeId);
    } else {
      const nuevo = await crearInforme(payload);
      informeId = nuevo.id;
    }

    // 2. Objetivos → primer equipo especial "objetivos"
    if (objetivos?.length) {
      const { data: eqObj, error: eErr } = await db.from('informe_equipos')
        .insert({ informe_id: informeId, nombre: '__objetivos__', orden: 0 })
        .select().single();
      if (eErr) throw eErr;
      const tareasObj = objetivos.map((o, i) => ({
        equipo_id: eqObj.id,
        informe_id: informeId,
        descripcion: o.text || o,
        completado: o.done !== false,
        orden: i,
      }));
      if (tareasObj.length) await db.from('informe_tareas').insert(tareasObj);
    }

    // 3. Equipos + tareas
    for (let i = 0; i < (equipos || []).length; i++) {
      const eq = equipos[i];
      const { data: eqRow, error: eqErr } = await db.from('informe_equipos')
        .insert({ informe_id: informeId, nombre: eq.nombre || '', orden: i + 1 })
        .select().single();
      if (eqErr) throw eqErr;
      const tareas = (eq.tareas || []).map((t, j) => ({
        equipo_id: eqRow.id,
        informe_id: informeId,
        descripcion: t.text || t,
        completado: t.done !== false,
        orden: j,
      }));
      if (tareas.length) await db.from('informe_tareas').insert(tareas);
    }

    // 4. Alertas
    const alertasRows = (alertas || []).filter(a => a.texto).map((a, i) => ({
      informe_id: informeId,
      tipo: a.tipo || 'info',
      texto: a.texto,
      orden: i,
    }));
    if (alertasRows.length) await db.from('informe_alertas').insert(alertasRows);

    return informeId;
  }

  // ── Dashboard: últimos informes ──────────────────────────────

  async function getInformesDashboard(limite = 5) {
    const { data, error } = await db.from('informes')
      .select('id,titulo,tipo,fecha,n_informe,empresas(nombre),clientes(nombre)')
      .order('fecha', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  }

  // ── API pública ──────────────────────────────────────────────
  return {
    getInformes,
    getInformeById,
    crearInforme,
    actualizarInforme,
    eliminarInforme,
    getEquiposInforme,
    getTareasEquipo,
    getAlertasInforme,
    getFotosInforme,
    subirFotoInforme,
    eliminarFotoInforme,
    guardarInformeCompleto,
    getInformesDashboard,
  };
})();
