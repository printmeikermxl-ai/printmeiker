import { supabase } from './supabase';

/**
 * Crea una copia de seguridad en la nube (Supabase)
 * @param {string} userId - ID del usuario
 * @param {object} data - Datos completos del estado
 * @param {string} description - Comentario o etiqueta para el backup
 */
export const createCloudBackup = async (userId, data, description = 'Copia manual') => {
  if (!userId) throw new Error('Usuario no autenticado.');

  try {
    const { data: result, error } = await supabase
      .from('user_backups')
      .insert({
        user_id: userId,
        data,
        description,
        created_at: new Date().toISOString()
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error al crear copia en la nube:', error.message);
    throw error;
  }
};

/**
 * Obtiene la lista de copias de seguridad de un usuario en la nube
 * @param {string} userId - ID del usuario
 */
export const getCloudBackups = async (userId) => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('user_backups')
      .select('id, description, created_at, data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error al obtener copias en la nube:', error.message);
    throw error;
  }
};

/**
 * Elimina una copia de seguridad específica de la nube
 * @param {string} backupId - ID del registro de backup
 */
export const deleteCloudBackup = async (backupId) => {
  if (!backupId) throw new Error('ID de copia inválido.');

  try {
    const { error } = await supabase
      .from('user_backups')
      .delete()
      .eq('id', backupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al eliminar copia en la nube:', error.message);
    throw error;
  }
};

/**
 * Descarga una copia de seguridad en el dispositivo del usuario en formato JSON
 * @param {object} data - Estado completo del store
 */
export const exportToJSON = (data) => {
  try {
    const backupObj = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      payload: data
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupObj, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `PrintMeiker_Backup_${dateStr}.json`);
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    return true;
  } catch (error) {
    console.error('Error al exportar copia de seguridad local:', error);
    throw error;
  }
};

/**
 * Lee un archivo local .json y valida su estructura
 * @param {File} file - Archivo cargado por el usuario
 * @returns {Promise<object>} - Retorna el payload de los datos si es válido
 */
export const importFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        
        // Validación básica de la estructura del backup de PrintMeiker
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo no tiene un formato JSON válido.');
        }
        
        if (!parsed.payload || typeof parsed.payload !== 'object') {
          throw new Error('Estructura de copia de seguridad no válida (falta carga útil).');
        }
        
        // Verificar al menos algunas claves esperadas en el payload para mayor seguridad
        const payload = parsed.payload;
        const expectedKeys = ['config', 'pedidos', 'cotizaciones', 'clientes'];
        const hasSomeKeys = expectedKeys.some(key => Object.prototype.hasOwnProperty.call(payload, key));
        
        if (!hasSomeKeys) {
          throw new Error('El archivo no parece ser una copia de seguridad de esta aplicación.');
        }
        
        resolve(payload);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de copia de seguridad.'));
    };
    
    reader.readAsText(file);
  });
};
