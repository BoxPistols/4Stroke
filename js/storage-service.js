// Storage Service - Unified interface for Local Storage and Firestore

const STORAGE_MODE_KEY = 'storage_mode';
const MODE_LOCAL = 'local';
const MODE_ONLINE = 'online';

/**
 * Get current storage mode
 */
export function getStorageMode() {
  return localStorage.getItem(STORAGE_MODE_KEY) || MODE_LOCAL;
}

/**
 * Set storage mode
 */
export function setStorageMode(mode) {
  localStorage.setItem(STORAGE_MODE_KEY, mode);
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
    const garageNum = parseInt(garageId.replace('garage', ''));
    return {
      title: localStorage.getItem(`stroke-title${garageNum}`) || '',
      stroke1: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 1}`) || '',
      stroke2: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 2}`) || '',
      stroke3: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 3}`) || '',
      stroke4: localStorage.getItem(`stroke${(garageNum - 1) * 4 + 4}`) || '',
    };
  },

  /**
   * Load all garages from localStorage
   */
  async loadAllGarages() {
    const garages = {};
    for (let i = 1; i <= 4; i++) {
      garages[`garage${i}`] = this.loadGarageData(`garage${i}`);
    }
    return garages;
  },

  /**
   * Save stroke to localStorage
   */
  async saveStroke(garageId, fieldKey, value) {
    const garageNum = parseInt(garageId.replace('garage', ''));

    if (fieldKey === 'title') {
      localStorage.setItem(`stroke-title${garageNum}`, value);
    } else {
      const strokeNum = parseInt(fieldKey.replace('stroke', ''));
      const index = (garageNum - 1) * 4 + strokeNum;
      localStorage.setItem(`stroke${index}`, value);
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
    const garageNum = parseInt(garageId.replace('garage', ''));

    localStorage.setItem(`stroke-title${garageNum}`, '');
    for (let i = 1; i <= 4; i++) {
      const index = (garageNum - 1) * 4 + i;
      localStorage.setItem(`stroke${index}`, '');
    }
    console.log(`[SUCCESS] Deleted garage: ${garageId}`);
  }
};

/**
 * Unified Storage API - automatically uses Local or Online storage
 * With automatic offline fallback for online mode
 */
export const Storage = {
  /**
   * Load all garages
   */
  async loadAllGarages(userId = null) {
    if (isLocalMode()) {
      return LocalStorage.loadAllGarages();
    } else {
      try {
        const { loadAllGarages } = await import('./firestore-crud.js');
        return await loadAllGarages(userId);
      } catch (error) {
        console.warn('[WARN] Failed to load from Firestore, falling back to localStorage:', error);
        return LocalStorage.loadAllGarages();
      }
    }
  },

  /**
   * Save stroke with offline fallback
   */
  async saveStroke(userId, garageId, fieldKey, value) {
    if (isLocalMode()) {
      return LocalStorage.saveStroke(garageId, fieldKey, value);
    } else {
      const { saveWithFallback } = await import('./offline-manager.js');
      return saveWithFallback(userId, garageId, fieldKey, value);
    }
  },

  /**
   * Save title with offline fallback
   */
  async saveTitle(userId, garageId, title) {
    return this.saveStroke(userId, garageId, 'title', title);
  },

  /**
   * Delete stroke with offline fallback
   */
  async deleteStroke(userId, garageId, fieldKey) {
    if (isLocalMode()) {
      return LocalStorage.deleteStroke(garageId, fieldKey);
    } else {
      const { deleteWithFallback } = await import('./offline-manager.js');
      return deleteWithFallback(userId, garageId, fieldKey);
    }
  },

  /**
   * Delete garage with offline fallback
   */
  async deleteGarage(userId, garageId) {
    if (isLocalMode()) {
      return LocalStorage.deleteGarage(garageId);
    } else {
      const { deleteGarageWithFallback } = await import('./offline-manager.js');
      return deleteGarageWithFallback(userId, garageId);
    }
  }
};
