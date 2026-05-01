import { describe, it, expect, beforeEach } from 'vitest';
import { initMandaraViewPrefs } from '../js/mandara-view-prefs.js';

const FONT_SIZE_KEY = 'mandara_cell_font_size';
const COLLAPSED_KEY = 'mandara_sidebar_collapsed';

function setupDom() {
  document.body.innerHTML = `
    <button class="font-size-btn" data-size="small" aria-pressed="false">小</button>
    <button class="font-size-btn" data-size="medium" aria-pressed="false">中</button>
    <button class="font-size-btn" data-size="large" aria-pressed="false">大</button>
    <button id="sidebar-collapse-btn" aria-pressed="false">⇥</button>
  `;
  document.body.removeAttribute('data-cell-font-size');
  document.body.removeAttribute('data-sidebar-collapsed');
}

describe('initMandaraViewPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
    setupDom();
  });

  describe('font size', () => {
    it('applies medium by default when nothing is stored', () => {
      initMandaraViewPrefs();
      expect(document.body.getAttribute('data-cell-font-size')).toBe('medium');
      expect(document.querySelector('[data-size="medium"]').getAttribute('aria-pressed')).toBe('true');
      expect(document.querySelector('[data-size="small"]').getAttribute('aria-pressed')).toBe('false');
    });

    it('restores saved value from localStorage', () => {
      localStorage.setItem(FONT_SIZE_KEY, 'large');
      initMandaraViewPrefs();
      expect(document.body.getAttribute('data-cell-font-size')).toBe('large');
      expect(document.querySelector('[data-size="large"]').getAttribute('aria-pressed')).toBe('true');
    });

    it('falls back to default when stored value is invalid', () => {
      localStorage.setItem(FONT_SIZE_KEY, 'huge');
      initMandaraViewPrefs();
      expect(document.body.getAttribute('data-cell-font-size')).toBe('medium');
    });

    it('updates body attribute and persists when a button is clicked', () => {
      initMandaraViewPrefs();
      document.querySelector('[data-size="small"]').click();
      expect(document.body.getAttribute('data-cell-font-size')).toBe('small');
      expect(localStorage.getItem(FONT_SIZE_KEY)).toBe('small');
      expect(document.querySelector('[data-size="small"]').getAttribute('aria-pressed')).toBe('true');
      expect(document.querySelector('[data-size="medium"]').getAttribute('aria-pressed')).toBe('false');
    });

    it('keeps only one font-size button pressed at a time', () => {
      initMandaraViewPrefs();
      document.querySelector('[data-size="small"]').click();
      document.querySelector('[data-size="large"]').click();
      const pressed = [...document.querySelectorAll('.font-size-btn')]
        .filter((b) => b.getAttribute('aria-pressed') === 'true');
      expect(pressed).toHaveLength(1);
      expect(pressed[0].dataset.size).toBe('large');
    });
  });

  describe('sidebar collapse', () => {
    it('starts un-collapsed by default', () => {
      initMandaraViewPrefs();
      expect(document.body.getAttribute('data-sidebar-collapsed')).toBe('false');
      const btn = document.getElementById('sidebar-collapse-btn');
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.textContent).toBe('⇥');
    });

    it('restores collapsed state from localStorage', () => {
      localStorage.setItem(COLLAPSED_KEY, 'true');
      initMandaraViewPrefs();
      expect(document.body.getAttribute('data-sidebar-collapsed')).toBe('true');
      const btn = document.getElementById('sidebar-collapse-btn');
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.textContent).toBe('⇤');
    });

    it('toggles state on click and persists', () => {
      initMandaraViewPrefs();
      const btn = document.getElementById('sidebar-collapse-btn');

      btn.click();
      expect(document.body.getAttribute('data-sidebar-collapsed')).toBe('true');
      expect(localStorage.getItem(COLLAPSED_KEY)).toBe('true');
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.textContent).toBe('⇤');

      btn.click();
      expect(document.body.getAttribute('data-sidebar-collapsed')).toBe('false');
      expect(localStorage.getItem(COLLAPSED_KEY)).toBe('false');
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.textContent).toBe('⇥');
    });

    it('updates the title attribute to reflect the next action', () => {
      initMandaraViewPrefs();
      const btn = document.getElementById('sidebar-collapse-btn');
      expect(btn.title).toBe('サイドバーを折りたたむ');
      btn.click();
      expect(btn.title).toBe('サイドバーを表示');
    });
  });
});
