// Storage Service - Unified interface for Local Storage and Firestore

import { garageIdToNumber, numberToGarageId } from './utils/garage-id-utils.js';
import { GARAGE } from './constants.js';

const STORAGE_MODE_KEY = 'storage_mode';
const MODE_LOCAL = 'local';
const MODE_ONLINE = 'online';

// メモリ上のストレージ（localStorage アクセス不可時のフォールバック）
const memoryStorage = new Map();
let storageAvailable = true;

/**
 * localStorage が利用可能か確認
 */
function isLocalStorageAvailable() {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn('[WARNING] localStorage is not available, using memory storage:', error.message);
    return false;
  }
}

// 初期化時に確認
storageAvailable = isLocalStorageAvailable();

/**
 * localStorage/memoryStorage から値を取得
 */
function getItem(key) {
  try {
    if (storageAvailable) {
      return localStorage.getItem(key);
    } else {
      return memoryStorage.get(key) || null;
    }
  } catch (error) {
    console.warn(`[WARNING] Failed to get item ${key}:`, error.message);
    return memoryStorage.get(key) || null;
  }
}

/**
 * localStorage/memoryStorage に値を設定
 */
function setItem(key, value) {
  try {
    if (storageAvailable) {
      localStorage.setItem(key, value);
    } else {
      memoryStorage.set(key, value);
    }
  } catch (error) {
    console.warn(`[WARNING] Failed to set item ${key}:`, error.message);
    memoryStorage.set(key, value);
  }
}

/**
 * Get current storage mode
 */
export function getStorageMode() {
  return getItem(STORAGE_MODE_KEY) || MODE_LOCAL;
}

/**
 * Set storage mode
 */
export function setStorageMode(mode) {
  setItem(STORAGE_MODE_KEY, mode);
  console.log(`[INFO] Storage mode set to: ${mode}`);
}

/**
 * Check if currently in online mode
 */
export function isOnlineMode() {
  return getStorageMode() === MODE_ONLINE;
}

/**
 * Check if currently in local mode
 */
export function isLocalMode() {
  return getStorageMode() === MODE_LOCAL;
}

/**
 * Local Storage implementation
 */
export const LocalStorage = {
  /**
   * Load garage data from localStorage
   */
  loadGarageData(garageId) {
    const garageNum = garageIdToNumber(garageId);
    return {
      title: getItem(`stroke-title${garageNum}`) || '',
      stroke1: getItem(`stroke${(garageNum - 1) * 4 + 1}`) || '',
      stroke2: getItem(`stroke${(garageNum - 1) * 4 + 2}`) || '',
      stroke3: getItem(`stroke${(garageNum - 1) * 4 + 3}`) || '',
      stroke4: getItem(`stroke${(garageNum - 1) * 4 + 4}`) || '',
    };
  },

  /**
   * Load all mandaras from localStorage
   */
  async loadAllMandaras() {
    const mandarasJson = getItem('mandaras');
    if (!mandarasJson) {
      return [];
    }
    try {
      return JSON.parse(mandarasJson);
    } catch (error) {
      console.error('[ERROR] Failed to parse mandaras from localStorage:', error);
      return [];
    }
  },

  /**
   * Load single mandara by ID
   */
  async loadMandara(mandaraId) {
    const mandaras = await this.loadAllMandaras();
    return mandaras.find(m => m.id === mandaraId) || null;
  },

  /**
   * Save mandara to localStorage
   */
  async saveMandara(mandara) {
    const mandaras = await this.loadAllMandaras();
    const index = mandaras.findIndex(m => m.id === mandara.id);

    if (index >= 0) {
      // Update existing
      mandaras[index] = { ...mandara, updatedAt: new Date().toISOString() };
    } else {
      // Create new
      mandaras.push({
        ...mandara,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setItem('mandaras', JSON.stringify(mandaras));
    console.log(`[SUCCESS] Saved mandara to localStorage: ${mandara.id}`);
  },

  /**
   * Delete mandara from localStorage
   */
  async deleteMandara(mandaraId) {
    const mandaras = await this.loadAllMandaras();
    const filtered = mandaras.filter(m => m.id !== mandaraId);
    setItem('mandaras', JSON.stringify(filtered));
    console.log(`[SUCCESS] Deleted mandara from localStorage: ${mandaraId}`);
  },

  /**
   * Delete multiple mandaras from localStorage
   */
  async deleteMandaras(mandaraIds) {
    if (!mandaraIds || mandaraIds.length === 0) {
      return;
    }
    const mandaras = await this.loadAllMandaras();
    const filtered = mandaras.filter(m => !mandaraIds.includes(m.id));
    setItem('mandaras', JSON.stringify(filtered));
    console.log(`[SUCCESS] Deleted ${mandaraIds.length} mandaras from localStorage`);
  },

  /**
   * Load all garages from localStorage
   */
  async loadAllGarages() {
    const garages = {};
    for (let i = 1; i <= GARAGE.COUNT; i++) {
      const letteredId = numberToGarageId(i);
      garages[letteredId] = this.loadGarageData(letteredId);
    }
    return garages;
  },

  /**
   * Save stroke to localStorage
   */
  async saveStroke(garageId, fieldKey, value) {
    const garageNum = garageIdToNumber(garageId);

    if (fieldKey === 'title') {
      setItem(`stroke-title${garageNum}`, value);
    } else {
      const strokeNum = parseInt(fieldKey.replace('stroke', ''));
      const index = (garageNum - 1) * 4 + strokeNum;
      setItem(`stroke${index}`, value);
    }
    console.log(`[SUCCESS] Saved to localStorage: ${garageId}.${fieldKey}`);
  },

  /**
   * Save title to localStorage
   */
  async saveTitle(garageId, title) {
    return this.saveStroke(garageId, 'title', title);
  },

  /**
   * Delete stroke from localStorage
   */
  async deleteStroke(garageId, fieldKey) {
    return this.saveStroke(garageId, fieldKey, '');
  },

  /**
   * Delete entire garage from localStorage
   */
  async deleteGarage(garageId) {
    const garageNum = garageIdToNumber(garageId);

    setItem(`stroke-title${garageNum}`, '');
    for (let i = 1; i <= GARAGE.STROKES_PER_GARAGE; i++) {
      const index = (garageNum - 1) * GARAGE.STROKES_PER_GARAGE + i;
      setItem(`stroke${index}`, '');
    }
    console.log(`[SUCCESS] Deleted garage: ${garageId}`);
  }
};

/**
 * Unified Storage API - automatically uses Local or Online storage
 */
export const Storage = {
  /**
   * Load all garages
   */
  async loadAllGarages(userId = null) {
    if (isLocalMode()) {
      return LocalStorage.loadAllGarages();
    } else {
      const { loadAllGarages } = await import('./firestore-crud.js');
      return loadAllGarages(userId);
    }
  },

  /**
   * Save stroke
   */
  async saveStroke(userId, garageId, fieldKey, value) {
    if (isLocalMode()) {
      return LocalStorage.saveStroke(garageId, fieldKey, value);
    } else {
      const { saveStroke } = await import('./firestore-crud.js');
      return saveStroke(userId, garageId, fieldKey, value);
    }
  },

  /**
   * Save title
   */
  async saveTitle(userId, garageId, title) {
    if (isLocalMode()) {
      return LocalStorage.saveTitle(garageId, title);
    } else {
      const { saveTitle } = await import('./firestore-crud.js');
      return saveTitle(userId, garageId, title);
    }
  },

  /**
   * Delete stroke
   */
  async deleteStroke(userId, garageId, fieldKey) {
    if (isLocalMode()) {
      return LocalStorage.deleteStroke(garageId, fieldKey);
    } else {
      const { deleteStroke } = await import('./firestore-crud.js');
      return deleteStroke(userId, garageId, fieldKey);
    }
  },

  /**
   * Delete garage
   */
  async deleteGarage(userId, garageId) {
    if (isLocalMode()) {
      return LocalStorage.deleteGarage(garageId);
    } else {
      const { deleteGarage } = await import('./firestore-crud.js');
      return deleteGarage(userId, garageId);
    }
  },

  /**
   * Load all mandaras
   */
  async loadAllMandaras(userId = null) {
    if (isLocalMode()) {
      return LocalStorage.loadAllMandaras();
    } else {
      const { loadAllMandaras } = await import('./firestore-crud.js');
      return loadAllMandaras(userId);
    }
  },

  /**
   * Load single mandara
   */
  async loadMandara(userId, mandaraId) {
    if (isLocalMode()) {
      return LocalStorage.loadMandara(mandaraId);
    } else {
      const { loadMandara } = await import('./firestore-crud.js');
      return loadMandara(userId, mandaraId);
    }
  },

  /**
   * Save mandara
   */
  async saveMandara(userId, mandara) {
    if (isLocalMode()) {
      return LocalStorage.saveMandara(mandara);
    } else {
      const { saveMandara } = await import('./firestore-crud.js');
      return saveMandara(userId, mandara);
    }
  },

  /**
   * Delete mandara
   */
  async deleteMandara(userId, mandaraId) {
    if (isLocalMode()) {
      return LocalStorage.deleteMandara(mandaraId);
    } else {
      const { deleteMandara } = await import('./firestore-crud.js');
      return deleteMandara(userId, mandaraId);
    }
  },

  /**
   * Delete multiple mandaras
   */
  async deleteMandaras(userId, mandaraIds) {
    if (isLocalMode()) {
      return LocalStorage.deleteMandaras(mandaraIds);
    } else {
      const { deleteMandaras } = await import('./firestore-crud.js');
      return deleteMandaras(userId, mandaraIds);
    }
  }
};
