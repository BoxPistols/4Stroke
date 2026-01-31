import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initMarkdownRenderer, getPreview, isPreviewMode, updatePreviewIfActive } from '../js/markdown-renderer.js';

describe('Markdown Renderer', () => {
  beforeEach(() => {
    // Setup DOM structure
    document.body.innerHTML = `
      <div class="garage-stroke-box">
        <h3>KEY</h3>
        <textarea id="stroke1" class="stroke"># Heading
## Subheading

- Item 1
- Item 2

**Bold text**</textarea>
        <div class="clear-area">
          <input type="button" value="Clear" class="clear-btn">
        </div>
      </div>
      <div class="garage-stroke-box">
        <h3>ISSUE</h3>
        <textarea id="stroke2" class="stroke">- [ ] Todo item
- [x] Completed item</textarea>
      </div>
    `;
  });

  describe('Initialization', () => {
    it('should initialize markdown renderer for all textareas', () => {
      initMarkdownRenderer();

      const textareas = document.querySelectorAll('textarea.stroke');
      expect(textareas.length).toBe(2);

      textareas.forEach(textarea => {
        // Check if preview container was created
        expect(textarea.dataset.previewId).toBeDefined();
        const preview = document.getElementById(textarea.dataset.previewId);
        expect(preview).toBeTruthy();
        expect(preview.classList.contains('markdown-preview')).toBe(true);

        // Check if toggle button was created
        const strokeBox = textarea.closest('.garage-stroke-box');
        const button = strokeBox.querySelector('.markdown-toggle-btn');
        expect(button).toBeTruthy();
        expect(button.textContent).toBe('Preview');
      });
    });

    it('should create preview containers with correct IDs', () => {
      initMarkdownRenderer();

      const textarea1 = document.getElementById('stroke1');
      const textarea2 = document.getElementById('stroke2');

      expect(textarea1.dataset.previewId).toBe('preview-stroke1');
      expect(textarea2.dataset.previewId).toBe('preview-stroke2');
    });
  });

  describe('Preview Container', () => {
    beforeEach(() => {
      initMarkdownRenderer();
    });

    it('should create preview container as sibling to textarea', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);

      expect(preview.parentNode).toBe(textarea.parentNode);
      expect(preview.previousElementSibling).toBe(textarea);
    });

    it('should initially hide preview container', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);

      expect(preview.style.display).toBe('none');
    });

    it('should have stroke-preview class', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);

      expect(preview.classList.contains('stroke-preview')).toBe(true);
    });
  });

  describe('Toggle Button', () => {
    beforeEach(() => {
      initMarkdownRenderer();
    });

    it('should create toggle button in h3 element', () => {
      const strokeBox = document.querySelector('.garage-stroke-box');
      const h3 = strokeBox.querySelector('h3');
      const button = h3.querySelector('.markdown-toggle-btn');

      expect(button).toBeTruthy();
      expect(button.parentNode.classList.contains('markdown-toggle-container')).toBe(true);
    });

    it('should toggle between edit and preview mode on click', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      // Initially in edit mode
      expect(textarea.style.display).not.toBe('none');
      expect(preview.style.display).toBe('none');
      expect(button.textContent).toBe('Preview');

      // Click to preview mode
      button.click();
      expect(textarea.style.display).toBe('none');
      expect(preview.style.display).toBe('');
      expect(button.textContent).toBe('Edit');
      expect(button.classList.contains('active')).toBe(true);

      // Click to edit mode
      button.click();
      expect(textarea.style.display).toBe('');
      expect(preview.style.display).toBe('none');
      expect(button.textContent).toBe('Preview');
      expect(button.classList.contains('active')).toBe(false);
    });
  });

  describe('Markdown Rendering', () => {
    beforeEach(() => {
      initMarkdownRenderer();
    });

    it('should render headings correctly', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click(); // Switch to preview mode

      expect(preview.innerHTML).toContain('<h1');
      expect(preview.innerHTML).toContain('Heading');
      expect(preview.innerHTML).toContain('<h2');
      expect(preview.innerHTML).toContain('Subheading');
    });

    it('should render lists correctly', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click();

      expect(preview.innerHTML).toContain('<ul');
      expect(preview.innerHTML).toContain('<li');
      expect(preview.innerHTML).toContain('Item 1');
      expect(preview.innerHTML).toContain('Item 2');
    });

    it('should render bold text correctly', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click();

      expect(preview.innerHTML).toContain('<strong');
      expect(preview.innerHTML).toContain('Bold text');
    });

    it('should render task lists with checkboxes', () => {
      const textarea = document.getElementById('stroke2');
      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click();

      const checkboxes = preview.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
      expect(checkboxes[0].disabled).toBe(true);
      expect(checkboxes[1].disabled).toBe(true);
    });

    it('should sanitize potentially dangerous HTML', () => {
      const textarea = document.getElementById('stroke1');
      textarea.value = '<script>alert("XSS")</script>\n<img src=x onerror=alert("XSS")>';

      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click();

      // Script tags should be removed/escaped
      expect(preview.innerHTML).not.toContain('<script');
      // onerror should be escaped
      expect(preview.innerHTML).toContain('&lt;img');
      // No executable script tags in actual DOM
      expect(preview.querySelector('script')).toBeFalsy();
    });

    it('should show empty state for empty content', () => {
      const textarea = document.getElementById('stroke1');
      textarea.value = '';

      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click();

      expect(preview.innerHTML).toContain('No content');
      expect(preview.querySelector('.empty-preview')).toBeTruthy();
    });
  });

  describe('Helper Functions', () => {
    beforeEach(() => {
      initMarkdownRenderer();
    });

    it('should get preview for textarea', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);

      expect(preview).toBeTruthy();
      expect(preview.id).toBe('preview-stroke1');
    });

    it('should detect preview mode', () => {
      const textarea = document.getElementById('stroke1');
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      expect(isPreviewMode(textarea)).toBe(false);

      button.click();
      expect(isPreviewMode(textarea)).toBe(true);

      button.click();
      expect(isPreviewMode(textarea)).toBe(false);
    });

    it('should update preview if in preview mode', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      button.click(); // Switch to preview mode

      const oldContent = preview.innerHTML;
      textarea.value = '# New Heading';

      updatePreviewIfActive(textarea);

      expect(preview.innerHTML).not.toBe(oldContent);
      expect(preview.innerHTML).toContain('New Heading');
    });

    it('should not update preview if in edit mode', () => {
      const textarea = document.getElementById('stroke1');
      const preview = getPreview(textarea);

      const oldContent = preview.innerHTML;
      textarea.value = '# New Heading';

      updatePreviewIfActive(textarea);

      expect(preview.innerHTML).toBe(oldContent);
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      initMarkdownRenderer();
    });

    it.skip('should toggle preview with Cmd/Ctrl+Shift+M', () => {
      const textarea = document.getElementById('stroke1');
      const button = textarea.closest('.garage-stroke-box').querySelector('.markdown-toggle-btn');

      // Focus textarea
      textarea.focus();

      expect(isPreviewMode(textarea)).toBe(false);

      // Simulate Cmd+Shift+M (Mac)
      const event = new KeyboardEvent('keydown', {
        key: 'M',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });

      const defaultPrevented = !document.dispatchEvent(event);

      // Keyboard shortcut should prevent default
      expect(defaultPrevented).toBe(true);
      // Should toggle to preview mode
      expect(isPreviewMode(textarea)).toBe(true);
    });

    it.skip('should work with Ctrl key (Windows)', () => {
      const textarea = document.getElementById('stroke1');
      textarea.focus();

      expect(isPreviewMode(textarea)).toBe(false);

      const event = new KeyboardEvent('keydown', {
        key: 'M',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });

      document.dispatchEvent(event);

      expect(isPreviewMode(textarea)).toBe(true);
    });
  });
});
