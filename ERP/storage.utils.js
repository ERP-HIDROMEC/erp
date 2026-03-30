// ============================================================
// storage.utils.js — Utilidad centralizada de uploads
// Bucket único: syh-docs
// Requiere: erp-utils.js (expone `db`)
// ============================================================

const StorageUtils = (() => {

  const BUCKET = 'syh-docs';

  /**
   * Sube un archivo al bucket y devuelve { url, path }
   * @param {File} file — objeto File del input
   * @param {string} carpeta — subcarpeta dentro del bucket
   * @returns {{ url: string, path: string }}
   */
  async function upload(file, carpeta = 'general') {
    if (!file) throw new Error('No se seleccionó ningún archivo');

    const ext = file.name.split('.').pop().toLowerCase();
    const nombre = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const path = `${carpeta}/${nombre}`;

    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) throw error;

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);

    return { url: data.publicUrl, path };
  }

  /**
   * Elimina un archivo del bucket por su path
   * @param {string} path
   */
  async function remove(path) {
    if (!path) return;
    await db.storage.from(BUCKET).remove([path]);
  }

  return { upload, remove };

})();
