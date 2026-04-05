// ============================================================
// ERP HIDROMEC — Capa API  v1.0
// api/index.js — Cargador maestro
//
// INCLUIR EN CADA HTML (después de erp-utils.js):
//
//   <script src="api/empresas.api.js"></script>
//   <script src="api/clientes.api.js"></script>
//   <script src="api/facturas.api.js"></script>
//   <script src="api/remitos.api.js"></script>
//   <script src="api/egresos.api.js"></script>
//   <script src="api/proyectos.api.js"></script>
//   <script src="api/contratos.api.js"></script>
//   <script src="api/empleados.api.js"></script>
//   <script src="api/caja.api.js"></script>
//   <script src="api/impuestos.api.js"></script>
//   <script src="api/presupuestos.api.js"></script>
//   <script src="api/syh.api.js"></script>
//
// O cargar solo los que necesita cada módulo (recomendado).
// Ver tabla al final de este archivo.
//
// ============================================================
//
// PATRÓN DE USO
// ─────────────
// ANTES (directo a Supabase — NO hacer más):
//
//   const { data, error } = await db.from('clientes')
//     .select('*').eq('empresa_id', emp).eq('activo', true);
//
// AHORA (a través de la API):
//
//   const clientes = await ClientesAPI.getClientesSelect(empresaId);
//
// La API:
//   - encapsula los filtros comunes
//   - lanza throw en error (en vez de devolver { error })
//   - siempre devuelve array vacío [] en vez de null
//   - tiene nombres descriptivos que documentan la intención
//
// ============================================================
//
// MANEJO DE ERRORES
// ─────────────────
// Todas las funciones lanzan el error de Supabase.
// Capturarlos con try/catch en el módulo:
//
//   try {
//     const clientes = await ClientesAPI.getClientes({ empresaId });
//     renderTabla(clientes);
//   } catch(e) {
//     manejarError(e, 'cargar clientes');  // función de erp-utils.js
//   }
//
// ============================================================
//
// TABLA: qué API cargar en cada módulo HTML
// ─────────────────────────────────────────
//
//  HTML            APIs necesarias
//  ─────────────── ────────────────────────────────────────────
//  index.html      empresas, facturas, egresos, remitos,
//                  proyectos, empleados (docs alerta)
//  facturas.html   empresas, clientes, facturas, remitos
//  remitos.html    empresas, clientes, remitos, contratos
//  compras.html    empresas, egresos, proyectos (select)
//  caja.html       empresas, caja, egresos (cheques)
//  clientes.html   empresas, clientes
//  contratos.html  empresas, clientes, contratos, remitos
//  proyectos.html  empresas, clientes, proyectos, contratos,
//                  empleados (select)
//  presupuestos.html empresas, clientes, proyectos,
//                    empleados, presupuestos
//  empleados.html  empresas, empleados, clientes
//  impuestos.html  empresas, clientes, impuestos
//  syh.html        empresas, empleados, syh
//
// ============================================================

// Este archivo no contiene código ejecutable.
// Es documentación de referencia + guía de carga.

// ============================================================
// FUNCIONES GLOBALES DISPONIBLES (desde erp-utils.js)
// ============================================================
//
// FORMATO
//   fmt(valor)              → "$1.234.567"  (ARS sin decimales)
//   fmtF(fecha)             → "12/03/2026"  (fecha localizada)
//   fmtNum(valor, isUSD)    → "$1.234,56" o "U$S 1.234,56"
//
// LOADING
//   setLoading(id, true/false, mensaje?)
//     → muestra/oculta spinner en un contenedor por ID
//
//   withLoading(id, asyncFn, mensajeCarga?)
//     → ejecuta fn async con spinner + manejo de error automático
//     → devuelve resultado o null si error
//     Ejemplo:
//       const datos = await withLoading('contenido', () => ClientesAPI.getClientes());
//
//   withSave(btnId, asyncFn, mensajeOk?)
//     → deshabilita botón, muestra spinner, toast de éxito al terminar
//     → devuelve resultado o null si error
//     Ejemplo:
//       const ok = await withSave('btn-guardar', () => crearCliente(payload), 'Cliente guardado');
//
// ERRORES
//   manejarError(error, contexto)
//     → toast de error con mensaje legible para el usuario
//     → detecta: campos nulos, duplicados, FK, sesión expirada, sin conexión
//
// TOASTS
//   toast(mensaje, tipo?, duracion?)
//     → tipos: 'success' | 'error' | 'warn' | 'info'
//
// CONFIRMACIÓN
//   confirmar(mensaje, opciones?)  → Promise<boolean>
//
// AUDITORÍA
//   registrarAuditoria(modulo, accion, tabla, registroId, detalle)
// ============================================================
