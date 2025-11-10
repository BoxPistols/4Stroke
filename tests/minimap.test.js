import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  initializeMinimap,
  openMinimapView,
  closeMinimapView,
  toggleMinimapView,
  setMinimapUserId,
} from '../js/minimap.js';

// Mock DOM elements
function setupDOM() {
  document.body.innerHTML = `
    <div id="minimap-view" class="minimap-view">
      <div class="minimap-header">
        <h2>📍 ALL NOTES OVERVIEW</h2>
        <button class="minimap-close-btn" id="minimap-close-btn">✕ CLOSE</button>
      </div>
      <div class="minimap-grid" id="minimap-grid"></div>
    </div>
    <button id="minimap-toggle-btn" class="minimap-toggle-btn">🗺️</button>
    <div id="message" class="is-hidden">Auto Save...</div>
    ${generateGarageHTML()}
  `;
}

function generateGarageHTML() {
  let html = '';
  for (let i = 1; i <= 16; i++) {
    html += `<textarea id="stroke${i}" class="stroke stroke${i}"></textarea>`;
  }
  return html;
}

describe('Minimap Module', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('View Control', () => {
    it('should open minimap view', () => {
      const minimapView = document.getElementById('minimap-view');
      expect(minimapView.classList.contains('active')).toBe(false);

      openMinimapView();

      expect(minimapView.classList.contains('active')).toBe(true);
    });

    it('should close minimap view', () => {
      const minimapView = document.getElementById('minimap-view');
      minimapView.classList.add('active');

      closeMinimapView();

      expect(minimapView.classList.contains('active')).toBe(false);
    });

    it('should toggle minimap view', () => {
      const minimapView = document.getElementById('minimap-view');

      // First toggle - should open
      toggleMinimapView();
      expect(minimapView.classList.contains('active')).toBe(true);

      // Second toggle - should close
      toggleMinimapView();
      expect(minimapView.classList.contains('active')).toBe(false);
    });

    it('should add active class to toggle button when opening', () => {
      const toggleBtn = document.getElementById('minimap-toggle-btn');

      openMinimapView();

      expect(toggleBtn.classList.contains('active')).toBe(true);
    });

    it('should remove active class from toggle button when closing', () => {
      const toggleBtn = document.getElementById('minimap-toggle-btn');
      toggleBtn.classList.add('active');

      closeMinimapView();

      expect(toggleBtn.classList.contains('active')).toBe(false);
    });
  });

  describe('Grid Population', () => {
    it('should populate grid with 16 note cards', () => {
      openMinimapView();

      const grid = document.getElementById('minimap-grid');
      const noteCards = grid.querySelectorAll('.minimap-note');

      expect(noteCards.length).toBe(16);
    });

    it('should create note cards with correct structure', () => {
      openMinimapView();

      const firstNote = document.querySelector('.minimap-note');

      expect(firstNote.querySelector('.minimap-note-header')).toBeTruthy();
      expect(firstNote.querySelector('.note-label')).toBeTruthy();
      expect(firstNote.querySelector('.garage-name')).toBeTruthy();
      expect(firstNote.querySelector('.note-title')).toBeTruthy();
      expect(firstNote.querySelector('.drag-handle')).toBeTruthy();
      expect(firstNote.querySelector('textarea')).toBeTruthy();
    });

    it('should assign correct stroke classes', () => {
      openMinimapView();

      const notes = document.querySelectorAll('.minimap-note');

      // Check first 4 notes (garage A)
      expect(notes[0].classList.contains('stroke-1')).toBe(true);
      expect(notes[1].classList.contains('stroke-2')).toBe(true);
      expect(notes[2].classList.contains('stroke-3')).toBe(true);
      expect(notes[3].classList.contains('stroke-4')).toBe(true);

      // Check next 4 notes (garage B)
      expect(notes[4].classList.contains('stroke-1')).toBe(true);
      expect(notes[5].classList.contains('stroke-2')).toBe(true);
    });

    it('should display correct garage names', () => {
      openMinimapView();

      const notes = document.querySelectorAll('.minimap-note');

      // Garage A notes
      expect(notes[0].querySelector('.garage-name').textContent).toBe('GARAGE-A');
      expect(notes[1].querySelector('.garage-name').textContent).toBe('GARAGE-A');

      // Garage B notes
      expect(notes[4].querySelector('.garage-name').textContent).toBe('GARAGE-B');

      // Garage C notes
      expect(notes[8].querySelector('.garage-name').textContent).toBe('GARAGE-C');

      // Garage D notes
      expect(notes[12].querySelector('.garage-name').textContent).toBe('GARAGE-D');
    });

    it('should display correct note titles', () => {
      openMinimapView();

      const notes = document.querySelectorAll('.minimap-note');

      expect(notes[0].querySelector('.note-title').textContent).toBe('Key');
      expect(notes[1].querySelector('.note-title').textContent).toBe('Issue');
      expect(notes[2].querySelector('.note-title').textContent).toBe('Action');
      expect(notes[3].querySelector('.note-title').textContent).toBe('Publish');
    });
  });

  describe('Content Sync', () => {
    it('should load content from main textareas', () => {
      const mainTextarea1 = document.getElementById('stroke1');
      const mainTextarea2 = document.getElementById('stroke2');
      mainTextarea1.value = 'Test content 1';
      mainTextarea2.value = 'Test content 2';

      openMinimapView();

      const minimapTextarea1 = document.getElementById('minimap-textarea-1');
      const minimapTextarea2 = document.getElementById('minimap-textarea-2');

      expect(minimapTextarea1.value).toBe('Test content 1');
      expect(minimapTextarea2.value).toBe('Test content 2');
    });

    it('should handle empty content', () => {
      openMinimapView();

      const minimapTextarea = document.getElementById('minimap-textarea-1');
      expect(minimapTextarea.value).toBe('');
    });

    it('should preserve all 16 note contents', () => {
      // Set content in all main textareas
      for (let i = 1; i <= 16; i++) {
        const textarea = document.getElementById(`stroke${i}`);
        textarea.value = `Content ${i}`;
      }

      openMinimapView();

      // Verify all minimap textareas have correct content
      for (let i = 1; i <= 16; i++) {
        const minimapTextarea = document.getElementById(`minimap-textarea-${i}`);
        expect(minimapTextarea.value).toBe(`Content ${i}`);
      }
    });
  });

  describe('Drag and Drop Attributes', () => {
    it('should make note cards draggable', () => {
      openMinimapView();

      const noteCard = document.querySelector('.minimap-note');
      expect(noteCard.draggable).toBe(true);
    });

    it('should set correct data attributes', () => {
      openMinimapView();

      const firstNote = document.querySelector('.minimap-note');

      expect(firstNote.dataset.garageIndex).toBe('0');
      expect(firstNote.dataset.strokeIndex).toBe('0');
      expect(firstNote.dataset.noteIndex).toBe('1');
    });

    it('should have correct note indices for all cards', () => {
      openMinimapView();

      const notes = document.querySelectorAll('.minimap-note');

      // Check garage indices
      expect(notes[0].dataset.garageIndex).toBe('0'); // Garage A
      expect(notes[4].dataset.garageIndex).toBe('1'); // Garage B
      expect(notes[8].dataset.garageIndex).toBe('2'); // Garage C
      expect(notes[12].dataset.garageIndex).toBe('3'); // Garage D

      // Check note indices (1-16)
      expect(notes[0].dataset.noteIndex).toBe('1');
      expect(notes[15].dataset.noteIndex).toBe('16');
    });
  });

  describe('User ID Management', () => {
    it('should set user ID', () => {
      expect(() => setMinimapUserId('test-user-123')).not.toThrow();
    });

    it('should accept null user ID', () => {
      expect(() => setMinimapUserId(null)).not.toThrow();
    });
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => initializeMinimap(null)).not.toThrow();
    });

    it('should initialize with user ID', () => {
      expect(() => initializeMinimap('user-123')).not.toThrow();
    });

    it('should setup event listeners', () => {
      initializeMinimap(null);

      const toggleBtn = document.getElementById('minimap-toggle-btn');
      const closeBtn = document.getElementById('minimap-close-btn');

      // Buttons should exist
      expect(toggleBtn).toBeTruthy();
      expect(closeBtn).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing minimap view element', () => {
      document.getElementById('minimap-view').remove();

      expect(() => openMinimapView()).not.toThrow();
      expect(() => closeMinimapView()).not.toThrow();
    });

    it('should handle missing toggle button', () => {
      document.getElementById('minimap-toggle-btn').remove();

      expect(() => openMinimapView()).not.toThrow();
    });

    it('should handle missing main textareas', () => {
      document.querySelectorAll('textarea.stroke').forEach(el => el.remove());

      expect(() => openMinimapView()).not.toThrow();
    });

    it('should populate grid even if some textareas are missing', () => {
      document.getElementById('stroke1').remove();

      openMinimapView();

      const grid = document.getElementById('minimap-grid');
      const noteCards = grid.querySelectorAll('.minimap-note');

      expect(noteCards.length).toBe(16);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close on Escape key', () => {
      initializeMinimap(null);
      openMinimapView();

      const minimapView = document.getElementById('minimap-view');
      expect(minimapView.classList.contains('active')).toBe(true);

      // Simulate Escape key
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(minimapView.classList.contains('active')).toBe(false);
    });
  });

  describe('Responsive Behavior', () => {
    it('should create grid regardless of viewport size', () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      openMinimapView();

      const grid = document.getElementById('minimap-grid');
      const noteCards = grid.querySelectorAll('.minimap-note');

      expect(noteCards.length).toBe(16);
    });
  });
});
