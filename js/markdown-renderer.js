/**
 * Markdown Renderer Module
 * Provides real-time markdown rendering for textareas
 */

import { marked } from '../node_modules/marked/lib/marked.esm.js';
import DOMPurify from '../node_modules/dompurify/dist/purify.es.mjs';

// Configure marked options
marked.setOptions({
  breaks: true,       // Convert \n to <br>
  gfm: true,          // GitHub Flavored Markdown
  headerIds: true,
  mangle: false,
  sanitize: false     // We'll use DOMPurify instead
});

/**
 * Create preview container for a textarea
 */
function createPreviewContainer(textarea) {
  const container = document.createElement('div');
  container.className = 'markdown-preview';
  container.id = `preview-${textarea.id}`;
  container.style.display = 'none';

  // Match textarea's styling
  container.classList.add('stroke-preview');

  // Insert after textarea
  textarea.parentNode.insertBefore(container, textarea.nextSibling);

  return container;
}

/**
 * Create toggle button for edit/preview mode
 */
function createToggleButton(textarea, preview) {
  const strokeBox = textarea.closest('.garage-stroke-box');
  if (!strokeBox) return null;

  const h3 = strokeBox.querySelector('h3');
  if (!h3) return null;

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'markdown-toggle-container';

  const button = document.createElement('button');
  button.className = 'markdown-toggle-btn';
  button.type = 'button';
  button.textContent = 'Preview';
  button.title = 'Toggle Markdown Preview';

  button.addEventListener('click', (e) => {
    e.preventDefault();
    togglePreview(textarea, preview, button);
  });

  buttonContainer.appendChild(button);
  h3.appendChild(buttonContainer);

  return button;
}

/**
 * Toggle between edit and preview mode
 */
function togglePreview(textarea, preview, button) {
  const isPreview = preview.style.display !== 'none';

  if (isPreview) {
    // Switch to edit mode
    preview.style.display = 'none';
    textarea.style.display = '';
    button.textContent = 'Preview';
    button.classList.remove('active');
  } else {
    // Switch to preview mode
    renderMarkdown(textarea, preview);
    textarea.style.display = 'none';
    preview.style.display = '';
    button.textContent = 'Edit';
    button.classList.add('active');
  }
}

/**
 * Render markdown content
 */
function renderMarkdown(textarea, preview) {
  const content = textarea.value || '';

  // Convert markdown to HTML
  const rawHtml = marked.parse(content);

  // Sanitize HTML to prevent XSS
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'strong', 'em', 'u', 's', 'del',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'input', 'label'  // For checkboxes
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src',
      'type', 'checked', 'disabled',
      'class', 'id'
    ],
    ALLOW_DATA_ATTR: false
  });

  preview.innerHTML = cleanHtml || '<p class="empty-preview">No content</p>';

  // Handle checkboxes for task lists
  processTaskLists(preview);
}

/**
 * Process GitHub-style task lists
 */
function processTaskLists(preview) {
  const checkboxes = preview.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    // Make checkboxes readonly in preview mode
    checkbox.disabled = true;
  });
}

/**
 * Initialize markdown rendering for all textareas
 */
export function initMarkdownRenderer() {
  const textareas = document.querySelectorAll('textarea.stroke');

  textareas.forEach(textarea => {
    // Create preview container
    const preview = createPreviewContainer(textarea);

    // Create toggle button
    createToggleButton(textarea, preview);

    // Store reference for later use
    textarea.dataset.previewId = preview.id;
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  console.log('✓ Markdown renderer initialized for', textareas.length, 'textareas');
}

/**
 * Setup keyboard shortcuts for toggling preview
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + Shift + M: Toggle preview for focused textarea
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();

      // Find the focused textarea or the textarea in the current stroke box
      const activeElement = document.activeElement;
      let targetTextarea = null;

      if (activeElement.tagName === 'TEXTAREA' && activeElement.classList.contains('stroke')) {
        targetTextarea = activeElement;
      } else {
        // Find the stroke box containing the active element
        const strokeBox = activeElement.closest('.garage-stroke-box');
        if (strokeBox) {
          targetTextarea = strokeBox.querySelector('textarea.stroke');
        }
      }

      if (targetTextarea) {
        const preview = getPreview(targetTextarea);
        const button = targetTextarea.closest('.garage-stroke-box')?.querySelector('.markdown-toggle-btn');

        if (preview && button) {
          togglePreview(targetTextarea, preview, button);
        }
      }
    }
  });
}

/**
 * Get preview element for a textarea
 */
export function getPreview(textarea) {
  const previewId = textarea.dataset.previewId;
  return previewId ? document.getElementById(previewId) : null;
}

/**
 * Check if textarea is in preview mode
 */
export function isPreviewMode(textarea) {
  const preview = getPreview(textarea);
  return preview && preview.style.display !== 'none';
}

/**
 * Force switch to edit mode (useful when user wants to edit)
 */
export function switchToEditMode(textarea) {
  const preview = getPreview(textarea);
  if (!preview) return;

  const strokeBox = textarea.closest('.garage-stroke-box');
  const button = strokeBox?.querySelector('.markdown-toggle-btn');

  if (preview.style.display !== 'none') {
    togglePreview(textarea, preview, button);
  }
}

/**
 * Update preview if currently in preview mode
 * Useful when textarea value changes externally (e.g., from minimap sync)
 */
export function updatePreviewIfActive(textarea) {
  const preview = getPreview(textarea);
  if (!preview) return;

  // Only update if currently in preview mode
  if (preview.style.display !== 'none') {
    renderMarkdown(textarea, preview);
  }
}
