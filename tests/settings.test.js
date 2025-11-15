import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  applyGarageOrder,
  setupGarageShortcuts,
  openSettingsModal,
  closeSettingsModal,
  initializeSettings,
  showConfirmation,
  showToast,
} from '../js/settings.js';

// Mock DOM elements
function setupDOM() {
  document.body.innerHTML = `
    <div id="settings-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="modal-close" id="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="shortcut-grid">
            <input type="text" id="garageA-key" value="1">
            <input type="checkbox" id="garageA-ctrl">
            <input type="checkbox" id="garageA-alt">
            <input type="checkbox" id="garageA-shift">

            <input type="text" id="garageB-key" value="2">
            <input type="checkbox" id="garageB-ctrl">
            <input type="checkbox" id="garageB-alt">
            <input type="checkbox" id="garageB-shift">

            <input type="text" id="garageC-key" value="3">
            <input type="checkbox" id="garageC-ctrl">
            <input type="checkbox" id="garageC-alt">
            <input type="checkbox" id="garageC-shift">

            <input type="text" id="garageD-key" value="4">
            <input type="checkbox" id="garageD-ctrl">
            <input type="checkbox" id="garageD-alt">
            <input type="checkbox" id="garageD-shift">
          </div>
          <div id="garage-order-list"></div>
        </div>
      </div>
    </div>
    <div class="garages">
      <div class="garage" id="garageA">
        <h2 class="garage-title">GARAGE-A</h2>
      </div>
      <div class="garage" id="garageB">
        <h2 class="garage-title">GARAGE-B</h2>
      </div>
      <div class="garage" id="garageC">
        <h2 class="garage-title">GARAGE-C</h2>
      </div>
      <div class="garage" id="garageD">
        <h2 class="garage-title">GARAGE-D</h2>
      </div>
    </div>
    <div id="confirm-modal" class="modal confirm-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="confirm-title">Confirm</h2>
        </div>
        <div class="modal-body">
          <p id="confirm-message">Are you sure?</p>
        </div>
        <div class="modal-actions">
          <button type="button" id="confirm-yes-btn" class="btn btn-primary">Yes</button>
          <button type="button" id="confirm-no-btn" class="btn btn-tertiary">No</button>
        </div>
      </div>
    </div>
    <div id="success-toast" class="toast">
      <span id="success-toast-message">Settings saved successfully!</span>
    </div>
  `;
}

describe('Settings Module', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Settings Storage', () => {
    it('should load default settings when none exist', () => {
      const settings = loadSettings();

      expect(settings).toHaveProperty('shortcuts');
      expect(settings).toHaveProperty('garageOrder');
      expect(settings.garageOrder).toEqual(['garageA', 'garageB', 'garageC', 'garageD']);
    });

    it('should have default shortcuts for all garages', () => {
      const settings = loadSettings();

      expect(settings.shortcuts.garageA).toEqual({
        key: '1',
        modifiers: ['ctrl']
      });
      expect(settings.shortcuts.garageB).toEqual({
        key: '2',
        modifiers: ['ctrl']
      });
      expect(settings.shortcuts.garageC).toEqual({
        key: '3',
        modifiers: ['ctrl']
      });
      expect(settings.shortcuts.garageD).toEqual({
        key: '4',
        modifiers: ['ctrl']
      });
    });

    it('should save settings to localStorage', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'a', modifiers: ['ctrl', 'shift'] }
        },
        garageOrder: ['garageB', 'garageA', 'garageC', 'garageD']
      };

      const result = saveSettings(settings);

      expect(result).toBe(true);
      const stored = localStorage.getItem('garage-settings');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored)).toEqual(settings);
    });

    it('should load saved settings from localStorage', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'x', modifiers: ['alt'] }
        },
        garageOrder: ['garageD', 'garageC', 'garageB', 'garageA']
      };

      localStorage.setItem('garage-settings', JSON.stringify(settings));

      const loaded = loadSettings();
      expect(loaded.garageOrder).toEqual(settings.garageOrder);
      expect(loaded.shortcuts.garageA).toEqual(settings.shortcuts.garageA);
    });

    it('should merge saved settings with defaults', () => {
      const partialSettings = {
        shortcuts: {
          garageA: { key: 'z', modifiers: [] }
        }
      };

      localStorage.setItem('garage-settings', JSON.stringify(partialSettings));

      const loaded = loadSettings();
      expect(loaded.shortcuts.garageA.key).toBe('z');
      expect(loaded.shortcuts.garageB).toBeTruthy(); // Should have default
      expect(loaded.garageOrder).toBeTruthy(); // Should have default
    });

    it('should reset settings to defaults', () => {
      const customSettings = {
        shortcuts: { garageA: { key: 'x', modifiers: [] } },
        garageOrder: ['garageD', 'garageA', 'garageB', 'garageC']
      };

      saveSettings(customSettings);
      const result = resetSettings();

      expect(result).toBe(true);
      const loaded = loadSettings();
      expect(loaded.shortcuts.garageA.key).toBe('1');
      expect(loaded.garageOrder).toEqual(['garageA', 'garageB', 'garageC', 'garageD']);
    });
  });

  describe('Garage Order', () => {
    it('should apply garage order by updating titles (DOM positions remain fixed)', () => {
      const newOrder = ['garageD', 'garageC', 'garageB', 'garageA'];

      applyGarageOrder(newOrder);

      // DOM element positions should remain fixed
      const container = document.querySelector('.garages');
      const garages = Array.from(container.children);
      expect(garages[0].id).toBe('garageA');
      expect(garages[1].id).toBe('garageB');
      expect(garages[2].id).toBe('garageC');
      expect(garages[3].id).toBe('garageD');

      // But titles should reflect the new order
      expect(garages[0].querySelector('.garage-title').textContent).toBe('GARAGE-D');
      expect(garages[1].querySelector('.garage-title').textContent).toBe('GARAGE-C');
      expect(garages[2].querySelector('.garage-title').textContent).toBe('GARAGE-B');
      expect(garages[3].querySelector('.garage-title').textContent).toBe('GARAGE-A');
    });

    it('should handle partial order arrays', () => {
      const partialOrder = ['garageB', 'garageA'];

      expect(() => applyGarageOrder(partialOrder)).not.toThrow();
    });

    it('should handle invalid garage IDs in order', () => {
      const invalidOrder = ['garageX', 'garageA', 'garageB'];

      expect(() => applyGarageOrder(invalidOrder)).not.toThrow();
    });

    it('should not affect missing garages container', () => {
      document.querySelector('.garages').remove();

      expect(() => applyGarageOrder(['garageA', 'garageB', 'garageC', 'garageD'])).not.toThrow();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should setup keyboard shortcuts', () => {
      const settings = {
        shortcuts: {
          garageA: { key: '1', modifiers: ['ctrl'] },
          garageB: { key: '2', modifiers: ['ctrl'] }
        }
      };

      expect(() => setupGarageShortcuts(settings)).not.toThrow();
    });

    it('should navigate to garage on shortcut press', () => {
      const settings = {
        shortcuts: {
          garageA: { key: '1', modifiers: ['ctrl'] }
        }
      };

      setupGarageShortcuts(settings);

      const scrollIntoViewMock = vi.fn();
      document.getElementById('garageA').scrollIntoView = scrollIntoViewMock;

      // Simulate Ctrl+1
      const event = new KeyboardEvent('keydown', {
        key: '1',
        ctrlKey: true
      });
      document.dispatchEvent(event);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start'
      });
    });

    it('should ignore shortcuts when typing in input', () => {
      const settings = {
        shortcuts: {
          garageA: { key: '1', modifiers: ['ctrl'] }
        }
      };

      setupGarageShortcuts(settings);

      const scrollIntoViewMock = vi.fn();
      document.getElementById('garageA').scrollIntoView = scrollIntoViewMock;

      // Create input element and simulate keydown
      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: '1',
        ctrlKey: true,
        bubbles: true
      });
      Object.defineProperty(event, 'target', { value: input, enumerable: true });

      document.dispatchEvent(event);

      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });

    it('should support modifier combinations', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'a', modifiers: ['ctrl', 'alt', 'shift'] }
        }
      };

      setupGarageShortcuts(settings);

      const scrollIntoViewMock = vi.fn();
      document.getElementById('garageA').scrollIntoView = scrollIntoViewMock;

      // Simulate Ctrl+Alt+Shift+A
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        altKey: true,
        shiftKey: true
      });
      document.dispatchEvent(event);

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('should handle case-insensitive keys', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'A', modifiers: ['ctrl'] }
        }
      };

      setupGarageShortcuts(settings);

      const scrollIntoViewMock = vi.fn();
      document.getElementById('garageA').scrollIntoView = scrollIntoViewMock;

      // Simulate Ctrl+a (lowercase)
      const event = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true
      });
      document.dispatchEvent(event);

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe('Modal Control', () => {
    it('should open settings modal', () => {
      const modal = document.getElementById('settings-modal');

      expect(modal.classList.contains('active')).toBe(false);

      openSettingsModal();

      expect(modal.classList.contains('active')).toBe(true);
    });

    it('should close settings modal', () => {
      const modal = document.getElementById('settings-modal');
      modal.classList.add('active');

      closeSettingsModal();

      expect(modal.classList.contains('active')).toBe(false);
    });

    it('should populate form when opening modal', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'x', modifiers: ['alt'] }
        },
        garageOrder: ['garageA', 'garageB', 'garageC', 'garageD']
      };

      saveSettings(settings);
      openSettingsModal();

      const keyInput = document.getElementById('garageA-key');
      const altCheck = document.getElementById('garageA-alt');

      expect(keyInput.value).toBe('x');
      expect(altCheck.checked).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => initializeSettings()).not.toThrow();
    });

    it('should apply saved garage order on init', () => {
      const customOrder = ['garageB', 'garageA', 'garageD', 'garageC'];
      saveSettings({
        shortcuts: {},
        garageOrder: customOrder
      });

      initializeSettings();

      const container = document.querySelector('.garages');
      const garages = Array.from(container.children);

      // DOM positions remain fixed
      expect(garages[0].id).toBe('garageA');
      expect(garages[1].id).toBe('garageB');

      // But titles reflect the custom order
      expect(garages[0].querySelector('.garage-title').textContent).toBe('GARAGE-B');
      expect(garages[1].querySelector('.garage-title').textContent).toBe('GARAGE-A');
    });

    it('should setup shortcuts on init', () => {
      const scrollIntoViewMock = vi.fn();
      document.getElementById('garageA').scrollIntoView = scrollIntoViewMock;

      initializeSettings();

      // Test default shortcut (Ctrl+1)
      const event = new KeyboardEvent('keydown', {
        key: '1',
        ctrlKey: true
      });
      document.dispatchEvent(event);

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('garage-settings', 'invalid json{');

      expect(() => loadSettings()).not.toThrow();
      const settings = loadSettings();
      expect(settings).toHaveProperty('shortcuts');
      expect(settings).toHaveProperty('garageOrder');
    });

    it('should handle missing modal element', () => {
      document.getElementById('settings-modal').remove();

      expect(() => openSettingsModal()).not.toThrow();
      expect(() => closeSettingsModal()).not.toThrow();
    });

    it('should handle empty settings object', () => {
      const result = saveSettings({});
      expect(result).toBe(true);

      const loaded = loadSettings();
      expect(loaded).toHaveProperty('shortcuts');
    });

    it('should handle null settings', () => {
      const result = saveSettings(null);
      expect(result).toBe(true);
    });

    it('should handle missing garage elements', () => {
      document.querySelectorAll('.garage').forEach(el => el.remove());

      expect(() => applyGarageOrder(['garageA', 'garageB', 'garageC', 'garageD'])).not.toThrow();
    });
  });

  describe('Settings Validation', () => {
    it('should accept valid shortcut modifiers', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'a', modifiers: ['ctrl'] }
        },
        garageOrder: ['garageA', 'garageB', 'garageC', 'garageD']
      };

      const result = saveSettings(settings);
      expect(result).toBe(true);
    });

    it('should accept shortcuts with no modifiers', () => {
      const settings = {
        shortcuts: {
          garageA: { key: 'a', modifiers: [] }
        },
        garageOrder: ['garageA', 'garageB', 'garageC', 'garageD']
      };

      const result = saveSettings(settings);
      expect(result).toBe(true);
    });

    it('should accept all valid garage orders', () => {
      const orders = [
        ['garageA', 'garageB', 'garageC', 'garageD'],
        ['garageD', 'garageC', 'garageB', 'garageA'],
        ['garageB', 'garageA', 'garageD', 'garageC']
      ];

      orders.forEach(order => {
        const settings = {
          shortcuts: {},
          garageOrder: order
        };
        const result = saveSettings(settings);
        expect(result).toBe(true);
      });
    });
  });

  describe('UI Components', () => {
    beforeEach(() => {
      setupDOM();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should show confirmation dialog', async () => {
      const promise = showConfirmation('Test Title', 'Test Message');

      const modal = document.getElementById('confirm-modal');
      const title = document.getElementById('confirm-title');
      const message = document.getElementById('confirm-message');

      expect(modal.classList.contains('active')).toBe(true);
      expect(title.textContent).toBe('Test Title');
      expect(message.textContent).toBe('Test Message');

      // Click yes
      const yesBtn = document.getElementById('confirm-yes-btn');
      yesBtn.click();

      const result = await promise;
      expect(result).toBe(true);
      expect(modal.classList.contains('active')).toBe(false);
    });

    it('should return false when clicking no in confirmation', async () => {
      const promise = showConfirmation('Test', 'Test');

      const noBtn = document.getElementById('confirm-no-btn');
      noBtn.click();

      const result = await promise;
      expect(result).toBe(false);
    });

    it('should close confirmation on escape key', async () => {
      const promise = showConfirmation('Test', 'Test');

      const modal = document.getElementById('confirm-modal');
      expect(modal.classList.contains('active')).toBe(true);

      // Simulate escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      const result = await promise;
      expect(result).toBe(false);
      expect(modal.classList.contains('active')).toBe(false);
    });

    it('should show toast notification', () => {
      showToast('Test message');

      const toast = document.getElementById('success-toast');
      const message = document.getElementById('success-toast-message');

      expect(toast.classList.contains('show')).toBe(true);
      expect(message.textContent).toBe('Test message');
    });

    it('should hide toast after duration', () => {
      showToast('Test message', 1000);

      const toast = document.getElementById('success-toast');
      expect(toast.classList.contains('show')).toBe(true);

      vi.advanceTimersByTime(1000);

      expect(toast.classList.contains('show')).toBe(false);
    });

    it('should handle missing toast elements gracefully', () => {
      const toast = document.getElementById('success-toast');
      toast.remove();

      expect(() => showToast('Test')).not.toThrow();
    });

    it('should handle missing confirmation modal elements gracefully', async () => {
      const modal = document.getElementById('confirm-modal');
      modal.remove();

      const result = await showConfirmation('Test', 'Test');
      expect(result).toBe(false);
    });
  });
});
