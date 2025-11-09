import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageMode,
  setStorageMode,
  isOnlineMode,
  isLocalMode,
  LocalStorage,
  Storage,
} from '../js/storage-service.js';

describe('Storage Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Storage Mode Management', () => {
    it('should default to local mode', () => {
      expect(getStorageMode()).toBe('local');
      expect(isLocalMode()).toBe(true);
      expect(isOnlineMode()).toBe(false);
    });

    it('should set and get storage mode', () => {
      setStorageMode('online');
      expect(getStorageMode()).toBe('online');
      expect(isOnlineMode()).toBe(true);
      expect(isLocalMode()).toBe(false);
    });

    it('should persist storage mode in localStorage', () => {
      setStorageMode('online');
      expect(localStorage.getItem('storage_mode')).toBe('online');
    });
  });

  describe('LocalStorage - loadGarageData', () => {
    it('should load garage data with correct key mapping', () => {
      localStorage.setItem('stroke-title1', 'Test Garage 1');
      localStorage.setItem('stroke1', 'Stroke 1');
      localStorage.setItem('stroke2', 'Stroke 2');
      localStorage.setItem('stroke3', 'Stroke 3');
      localStorage.setItem('stroke4', 'Stroke 4');

      const data = LocalStorage.loadGarageData('garage1');

      expect(data).toEqual({
        title: 'Test Garage 1',
        stroke1: 'Stroke 1',
        stroke2: 'Stroke 2',
        stroke3: 'Stroke 3',
        stroke4: 'Stroke 4',
      });
    });

    it('should return empty strings for missing data', () => {
      const data = LocalStorage.loadGarageData('garage1');

      expect(data).toEqual({
        title: '',
        stroke1: '',
        stroke2: '',
        stroke3: '',
        stroke4: '',
      });
    });

    it('should correctly map garage2 strokes (indices 5-8)', () => {
      localStorage.setItem('stroke-title2', 'Garage 2');
      localStorage.setItem('stroke5', 'G2 Stroke 1');
      localStorage.setItem('stroke6', 'G2 Stroke 2');
      localStorage.setItem('stroke7', 'G2 Stroke 3');
      localStorage.setItem('stroke8', 'G2 Stroke 4');

      const data = LocalStorage.loadGarageData('garage2');

      expect(data).toEqual({
        title: 'Garage 2',
        stroke1: 'G2 Stroke 1',
        stroke2: 'G2 Stroke 2',
        stroke3: 'G2 Stroke 3',
        stroke4: 'G2 Stroke 4',
      });
    });
  });

  describe('LocalStorage - loadAllGarages', () => {
    it('should load all 4 garages', async () => {
      localStorage.setItem('stroke-title1', 'Garage 1');
      localStorage.setItem('stroke-title2', 'Garage 2');
      localStorage.setItem('stroke-title3', 'Garage 3');
      localStorage.setItem('stroke-title4', 'Garage 4');

      const garages = await LocalStorage.loadAllGarages();

      expect(Object.keys(garages)).toHaveLength(4);
      expect(garages.garage1.title).toBe('Garage 1');
      expect(garages.garage2.title).toBe('Garage 2');
      expect(garages.garage3.title).toBe('Garage 3');
      expect(garages.garage4.title).toBe('Garage 4');
    });
  });

  describe('LocalStorage - saveStroke', () => {
    it('should save title with correct key', async () => {
      await LocalStorage.saveStroke('garage1', 'title', 'New Title');
      expect(localStorage.getItem('stroke-title1')).toBe('New Title');
    });

    it('should save stroke1 with correct index', async () => {
      await LocalStorage.saveStroke('garage1', 'stroke1', 'Test Stroke');
      expect(localStorage.getItem('stroke1')).toBe('Test Stroke');
    });

    it('should save stroke4 for garage2 with index 8', async () => {
      await LocalStorage.saveStroke('garage2', 'stroke4', 'Test Stroke');
      expect(localStorage.getItem('stroke8')).toBe('Test Stroke');
    });

    it('should save stroke1 for garage3 with index 9', async () => {
      await LocalStorage.saveStroke('garage3', 'stroke1', 'Test Stroke');
      expect(localStorage.getItem('stroke9')).toBe('Test Stroke');
    });

    it('should save stroke4 for garage4 with index 16', async () => {
      await LocalStorage.saveStroke('garage4', 'stroke4', 'Test Stroke');
      expect(localStorage.getItem('stroke16')).toBe('Test Stroke');
    });
  });

  describe('LocalStorage - saveTitle', () => {
    it('should save title using saveStroke', async () => {
      await LocalStorage.saveTitle('garage2', 'My Title');
      expect(localStorage.getItem('stroke-title2')).toBe('My Title');
    });
  });

  describe('LocalStorage - deleteStroke', () => {
    it('should delete stroke by setting empty string', async () => {
      localStorage.setItem('stroke1', 'Test');
      await LocalStorage.deleteStroke('garage1', 'stroke1');
      expect(localStorage.getItem('stroke1')).toBe('');
    });
  });

  describe('LocalStorage - deleteGarage', () => {
    it('should delete all strokes and title for garage', async () => {
      localStorage.setItem('stroke-title1', 'Title');
      localStorage.setItem('stroke1', 'S1');
      localStorage.setItem('stroke2', 'S2');
      localStorage.setItem('stroke3', 'S3');
      localStorage.setItem('stroke4', 'S4');

      await LocalStorage.deleteGarage('garage1');

      expect(localStorage.getItem('stroke-title1')).toBe('');
      expect(localStorage.getItem('stroke1')).toBe('');
      expect(localStorage.getItem('stroke2')).toBe('');
      expect(localStorage.getItem('stroke3')).toBe('');
      expect(localStorage.getItem('stroke4')).toBe('');
    });

    it('should delete correct strokes for garage3 (indices 9-12)', async () => {
      localStorage.setItem('stroke-title3', 'G3');
      localStorage.setItem('stroke9', 'S1');
      localStorage.setItem('stroke10', 'S2');
      localStorage.setItem('stroke11', 'S3');
      localStorage.setItem('stroke12', 'S4');

      await LocalStorage.deleteGarage('garage3');

      expect(localStorage.getItem('stroke-title3')).toBe('');
      expect(localStorage.getItem('stroke9')).toBe('');
      expect(localStorage.getItem('stroke10')).toBe('');
      expect(localStorage.getItem('stroke11')).toBe('');
      expect(localStorage.getItem('stroke12')).toBe('');
    });
  });

  describe('Storage - Unified API in Local Mode', () => {
    beforeEach(() => {
      setStorageMode('local');
    });

    it('should use LocalStorage for loadAllGarages', async () => {
      localStorage.setItem('stroke-title1', 'Test');
      const garages = await Storage.loadAllGarages();
      expect(garages.garage1.title).toBe('Test');
    });

    it('should use LocalStorage for saveStroke', async () => {
      await Storage.saveStroke(null, 'garage1', 'stroke1', 'Value');
      expect(localStorage.getItem('stroke1')).toBe('Value');
    });

    it('should use LocalStorage for saveTitle', async () => {
      await Storage.saveTitle(null, 'garage1', 'Title');
      expect(localStorage.getItem('stroke-title1')).toBe('Title');
    });

    it('should use LocalStorage for deleteStroke', async () => {
      localStorage.setItem('stroke1', 'Test');
      await Storage.deleteStroke(null, 'garage1', 'stroke1');
      expect(localStorage.getItem('stroke1')).toBe('');
    });

    it('should use LocalStorage for deleteGarage', async () => {
      localStorage.setItem('stroke-title1', 'Test');
      await Storage.deleteGarage(null, 'garage1');
      expect(localStorage.getItem('stroke-title1')).toBe('');
    });
  });

  describe('Storage - Edge Cases', () => {
    it('should handle invalid garage IDs gracefully', () => {
      const data = LocalStorage.loadGarageData('garageInvalid');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('stroke1');
    });

    it('should handle non-numeric stroke keys', async () => {
      await expect(
        LocalStorage.saveStroke('garage1', 'invalid', 'value')
      ).resolves.not.toThrow();
    });
  });
});
