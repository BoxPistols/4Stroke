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
      localStorage.setItem('stroke-title1', 'Garage A');
      localStorage.setItem('stroke-title2', 'Garage B');
      localStorage.setItem('stroke-title3', 'Garage C');
      localStorage.setItem('stroke-title4', 'Garage D');

      const garages = await LocalStorage.loadAllGarages();

      expect(Object.keys(garages)).toHaveLength(4);
      expect(garages.garageA.title).toBe('Garage A');
      expect(garages.garageB.title).toBe('Garage B');
      expect(garages.garageC.title).toBe('Garage C');
      expect(garages.garageD.title).toBe('Garage D');
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
      expect(garages.garageA.title).toBe('Test');
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

  describe('LocalStorage - Lettered Garage IDs', () => {
    it('should load garage data using garageA', () => {
      localStorage.setItem('stroke-title1', 'Test Garage A');
      localStorage.setItem('stroke1', 'Stroke 1');
      localStorage.setItem('stroke2', 'Stroke 2');
      localStorage.setItem('stroke3', 'Stroke 3');
      localStorage.setItem('stroke4', 'Stroke 4');

      const data = LocalStorage.loadGarageData('garageA');

      expect(data).toEqual({
        title: 'Test Garage A',
        stroke1: 'Stroke 1',
        stroke2: 'Stroke 2',
        stroke3: 'Stroke 3',
        stroke4: 'Stroke 4',
      });
    });

    it('should load garage data using garageB (indices 5-8)', () => {
      localStorage.setItem('stroke-title2', 'Garage B');
      localStorage.setItem('stroke5', 'B Stroke 1');
      localStorage.setItem('stroke6', 'B Stroke 2');
      localStorage.setItem('stroke7', 'B Stroke 3');
      localStorage.setItem('stroke8', 'B Stroke 4');

      const data = LocalStorage.loadGarageData('garageB');

      expect(data).toEqual({
        title: 'Garage B',
        stroke1: 'B Stroke 1',
        stroke2: 'B Stroke 2',
        stroke3: 'B Stroke 3',
        stroke4: 'B Stroke 4',
      });
    });

    it('should load garage data using garageC (indices 9-12)', () => {
      localStorage.setItem('stroke-title3', 'Garage C');
      localStorage.setItem('stroke9', 'C Stroke 1');
      localStorage.setItem('stroke10', 'C Stroke 2');
      localStorage.setItem('stroke11', 'C Stroke 3');
      localStorage.setItem('stroke12', 'C Stroke 4');

      const data = LocalStorage.loadGarageData('garageC');

      expect(data).toEqual({
        title: 'Garage C',
        stroke1: 'C Stroke 1',
        stroke2: 'C Stroke 2',
        stroke3: 'C Stroke 3',
        stroke4: 'C Stroke 4',
      });
    });

    it('should load garage data using garageD (indices 13-16)', () => {
      localStorage.setItem('stroke-title4', 'Garage D');
      localStorage.setItem('stroke13', 'D Stroke 1');
      localStorage.setItem('stroke14', 'D Stroke 2');
      localStorage.setItem('stroke15', 'D Stroke 3');
      localStorage.setItem('stroke16', 'D Stroke 4');

      const data = LocalStorage.loadGarageData('garageD');

      expect(data).toEqual({
        title: 'Garage D',
        stroke1: 'D Stroke 1',
        stroke2: 'D Stroke 2',
        stroke3: 'D Stroke 3',
        stroke4: 'D Stroke 4',
      });
    });

    it('should load all garages with lettered keys', async () => {
      localStorage.setItem('stroke-title1', 'Garage A');
      localStorage.setItem('stroke-title2', 'Garage B');
      localStorage.setItem('stroke-title3', 'Garage C');
      localStorage.setItem('stroke-title4', 'Garage D');

      const garages = await LocalStorage.loadAllGarages();

      expect(Object.keys(garages)).toHaveLength(4);
      expect(garages.garageA.title).toBe('Garage A');
      expect(garages.garageB.title).toBe('Garage B');
      expect(garages.garageC.title).toBe('Garage C');
      expect(garages.garageD.title).toBe('Garage D');
    });

    it('should save stroke with garageA ID', async () => {
      await LocalStorage.saveStroke('garageA', 'stroke1', 'Test Value');
      expect(localStorage.getItem('stroke1')).toBe('Test Value');
    });

    it('should save stroke with garageB ID (index 5)', async () => {
      await LocalStorage.saveStroke('garageB', 'stroke1', 'B Value');
      expect(localStorage.getItem('stroke5')).toBe('B Value');
    });

    it('should save stroke with garageC ID (index 9)', async () => {
      await LocalStorage.saveStroke('garageC', 'stroke1', 'C Value');
      expect(localStorage.getItem('stroke9')).toBe('C Value');
    });

    it('should save stroke with garageD ID (index 16)', async () => {
      await LocalStorage.saveStroke('garageD', 'stroke4', 'D Value');
      expect(localStorage.getItem('stroke16')).toBe('D Value');
    });

    it('should save title with garageA ID', async () => {
      await LocalStorage.saveTitle('garageA', 'My Title A');
      expect(localStorage.getItem('stroke-title1')).toBe('My Title A');
    });

    it('should save title with garageD ID', async () => {
      await LocalStorage.saveTitle('garageD', 'My Title D');
      expect(localStorage.getItem('stroke-title4')).toBe('My Title D');
    });

    it('should delete stroke with garageA ID', async () => {
      localStorage.setItem('stroke1', 'Test');
      await LocalStorage.deleteStroke('garageA', 'stroke1');
      expect(localStorage.getItem('stroke1')).toBe('');
    });

    it('should delete entire garage with garageA ID', async () => {
      localStorage.setItem('stroke-title1', 'Title');
      localStorage.setItem('stroke1', 'S1');
      localStorage.setItem('stroke2', 'S2');
      localStorage.setItem('stroke3', 'S3');
      localStorage.setItem('stroke4', 'S4');

      await LocalStorage.deleteGarage('garageA');

      expect(localStorage.getItem('stroke-title1')).toBe('');
      expect(localStorage.getItem('stroke1')).toBe('');
      expect(localStorage.getItem('stroke2')).toBe('');
      expect(localStorage.getItem('stroke3')).toBe('');
      expect(localStorage.getItem('stroke4')).toBe('');
    });

    it('should delete entire garage with garageC ID (indices 9-12)', async () => {
      localStorage.setItem('stroke-title3', 'C Title');
      localStorage.setItem('stroke9', 'S1');
      localStorage.setItem('stroke10', 'S2');
      localStorage.setItem('stroke11', 'S3');
      localStorage.setItem('stroke12', 'S4');

      await LocalStorage.deleteGarage('garageC');

      expect(localStorage.getItem('stroke-title3')).toBe('');
      expect(localStorage.getItem('stroke9')).toBe('');
      expect(localStorage.getItem('stroke10')).toBe('');
      expect(localStorage.getItem('stroke11')).toBe('');
      expect(localStorage.getItem('stroke12')).toBe('');
    });

    it('should handle mixed case lettered IDs', () => {
      localStorage.setItem('stroke-title1', 'Test');
      
      const dataLower = LocalStorage.loadGarageData('garagea');
      const dataUpper = LocalStorage.loadGarageData('garageA');
      
      expect(dataLower.title).toBe('Test');
      expect(dataUpper.title).toBe('Test');
    });

    it('should still support numeric garage IDs for backward compatibility', () => {
      localStorage.setItem('stroke-title2', 'Test Garage 2');
      localStorage.setItem('stroke5', 'Stroke 5');

      const data = LocalStorage.loadGarageData('garage2');

      expect(data.title).toBe('Test Garage 2');
      expect(data.stroke1).toBe('Stroke 5');
    });
  });

  describe('Storage - Unified API with Lettered IDs in Local Mode', () => {
    beforeEach(() => {
      setStorageMode('local');
    });

    it('should use LocalStorage for loadAllGarages and return lettered keys', async () => {
      localStorage.setItem('stroke-title1', 'Test A');
      const garages = await Storage.loadAllGarages();
      expect(garages.garageA.title).toBe('Test A');
    });

    it('should use LocalStorage for saveStroke with lettered ID', async () => {
      await Storage.saveStroke(null, 'garageA', 'stroke1', 'Value A');
      expect(localStorage.getItem('stroke1')).toBe('Value A');
    });

    it('should use LocalStorage for saveTitle with lettered ID', async () => {
      await Storage.saveTitle(null, 'garageB', 'Title B');
      expect(localStorage.getItem('stroke-title2')).toBe('Title B');
    });

    it('should use LocalStorage for deleteStroke with lettered ID', async () => {
      localStorage.setItem('stroke9', 'Test');
      await Storage.deleteStroke(null, 'garageC', 'stroke1');
      expect(localStorage.getItem('stroke9')).toBe('');
    });

    it('should use LocalStorage for deleteGarage with lettered ID', async () => {
      localStorage.setItem('stroke-title4', 'Test');
      await Storage.deleteGarage(null, 'garageD');
      expect(localStorage.getItem('stroke-title4')).toBe('');
    });
  });
});
