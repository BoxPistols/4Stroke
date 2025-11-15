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
 * Convert garage ID to numeric index
 * Supports both lettered IDs (garageA-D) and numeric IDs (garage1-4)
 */
function garageIdToNumber(garageId) {
  // Handle lettered IDs: garageA -> 1, garageB -> 2, etc.
  if (garageId.match(/^garage[A-D]$/)) {
    return garageId.charCodeAt(6) - 64; // 'A' is 65, so A=1, B=2, C=3, D=4
  }
  // Handle numeric IDs: garage1 -> 1, garage2 -> 2, etc.
  if (garageId.match(/^garage[1-4]$/)) {
    return parseInt(garageId.replace('garage', ''));
  }
  // Fallback: try to parse any number
  const num = parseInt(garageId.replace('garage', ''));
  return isNaN(num) ? 1 : num;
}

/**
 * Convert numeric index to lettered garage ID
 */
function numberToGarageId(num) {
  return `garage${String.fromCharCode(64 + num)}`; // 1 -> A, 2 -> B, etc.
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
    const garageNum = garageIdToNumber(garageId);

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
  }
};
