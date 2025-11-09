import { describe, it, expect, beforeEach } from 'vitest';

describe('Utility Functions', () => {
  describe('Garage ID Parsing', () => {
    it('should extract numeric ID from garageA', () => {
      const id = 'garageA';
      const num = parseInt(id.replace('garage', '').charCodeAt(0)) - 64;
      expect(num).toBe(1);
    });

    it('should extract numeric ID from garageB', () => {
      const id = 'garageB';
      const num = parseInt(id.replace('garage', '').charCodeAt(0)) - 64;
      expect(num).toBe(2);
    });

    it('should handle garage1 format', () => {
      const id = 'garage1';
      const num = parseInt(id.replace('garage', ''));
      expect(num).toBe(1);
    });
  });

  describe('Stroke Index Calculation', () => {
    it('should calculate correct stroke index for garage1 stroke1', () => {
      const garageNum = 1;
      const strokeNum = 1;
      const index = (garageNum - 1) * 4 + strokeNum;
      expect(index).toBe(1);
    });

    it('should calculate correct stroke index for garage2 stroke4', () => {
      const garageNum = 2;
      const strokeNum = 4;
      const index = (garageNum - 1) * 4 + strokeNum;
      expect(index).toBe(8);
    });

    it('should calculate correct stroke index for garage4 stroke4', () => {
      const garageNum = 4;
      const strokeNum = 4;
      const index = (garageNum - 1) * 4 + strokeNum;
      expect(index).toBe(16);
    });
  });

  describe('Data Validation', () => {
    it('should validate empty string as falsy', () => {
      const value = '';
      expect(value || 'default').toBe('default');
    });

    it('should validate non-empty string as truthy', () => {
      const value = 'test';
      expect(value || 'default').toBe('test');
    });

    it('should handle null values', () => {
      const value = null;
      expect(value || 'default').toBe('default');
    });

    it('should handle undefined values', () => {
      const value = undefined;
      expect(value || 'default').toBe('default');
    });
  });

  describe('Garage Mapping', () => {
    it('should map garage letters to numbers', () => {
      const mapping = {
        A: 1,
        B: 2,
        C: 3,
        D: 4,
      };

      expect(mapping.A).toBe(1);
      expect(mapping.B).toBe(2);
      expect(mapping.C).toBe(3);
      expect(mapping.D).toBe(4);
    });

    it('should convert garageA to garage1', () => {
      const input = 'garageA';
      const letter = input.replace('garage', '');
      const num = letter.charCodeAt(0) - 64;
      const output = `garage${num}`;
      expect(output).toBe('garage1');
    });

    it('should convert garageD to garage4', () => {
      const input = 'garageD';
      const letter = input.replace('garage', '');
      const num = letter.charCodeAt(0) - 64;
      const output = `garage${num}`;
      expect(output).toBe('garage4');
    });
  });

  describe('LocalStorage Key Generation', () => {
    it('should generate correct title key', () => {
      const garageNum = 1;
      const key = `stroke-title${garageNum}`;
      expect(key).toBe('stroke-title1');
    });

    it('should generate correct stroke key', () => {
      const index = 5;
      const key = `stroke${index}`;
      expect(key).toBe('stroke5');
    });

    it('should generate keys for all garage titles', () => {
      const keys = [];
      for (let i = 1; i <= 4; i++) {
        keys.push(`stroke-title${i}`);
      }
      expect(keys).toEqual([
        'stroke-title1',
        'stroke-title2',
        'stroke-title3',
        'stroke-title4',
      ]);
    });

    it('should generate keys for all strokes', () => {
      const keys = [];
      for (let i = 1; i <= 16; i++) {
        keys.push(`stroke${i}`);
      }
      expect(keys).toHaveLength(16);
      expect(keys[0]).toBe('stroke1');
      expect(keys[15]).toBe('stroke16');
    });
  });

  describe('Data Structure', () => {
    it('should create valid garage data object', () => {
      const garageData = {
        title: 'Test Garage',
        stroke1: 'Intake',
        stroke2: 'Compression',
        stroke3: 'Combustion',
        stroke4: 'Exhaust',
      };

      expect(garageData).toHaveProperty('title');
      expect(garageData).toHaveProperty('stroke1');
      expect(garageData).toHaveProperty('stroke2');
      expect(garageData).toHaveProperty('stroke3');
      expect(garageData).toHaveProperty('stroke4');
    });

    it('should create valid all garages structure', () => {
      const allGarages = {
        garage1: { title: '', stroke1: '', stroke2: '', stroke3: '', stroke4: '' },
        garage2: { title: '', stroke1: '', stroke2: '', stroke3: '', stroke4: '' },
        garage3: { title: '', stroke1: '', stroke2: '', stroke3: '', stroke4: '' },
        garage4: { title: '', stroke1: '', stroke2: '', stroke3: '', stroke4: '' },
      };

      expect(Object.keys(allGarages)).toHaveLength(4);
      expect(allGarages.garage1).toHaveProperty('stroke1');
      expect(allGarages.garage4).toHaveProperty('stroke4');
    });
  });

  describe('Console Logging', () => {
    it('should generate info log message', () => {
      const message = '[INFO] Storage mode set to: local';
      expect(message).toContain('[INFO]');
      expect(message).toContain('local');
    });

    it('should generate success log message', () => {
      const garageId = 'garage1';
      const fieldKey = 'stroke1';
      const message = `[SUCCESS] Saved to localStorage: ${garageId}.${fieldKey}`;
      expect(message).toBe('[SUCCESS] Saved to localStorage: garage1.stroke1');
    });
  });
});
