/**
 * Markdown Renderer with Notion-style Checkboxes
 * Renders markdown with interactive checkboxes and progress tracking
 */

import { marked } from 'marked';

/**
 * Parse text and count checkboxes
 * @param {string} text - Raw text content
 * @returns {Object} Checkbox statistics
 */
export function countCheckboxes(text) {
  const checkboxPattern = /^[\s]*[-*]\s+\[([ xX])\]/gm;
  const matches = [...text.matchAll(checkboxPattern)];

  const total = matches.length;
  const checked = matches.filter(match => match[1].toLowerCase() === 'x').length;
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  return {
    total,
    checked,
    percentage,
    hasCheckboxes: total > 0
  };
}

/**
 * Custom renderer for marked to handle checkboxes
 * Uses GFM task list token properties for better reliability
 */
const renderer = {
  listitem(token) {
    // Use the `task` and `checked` properties from the token for GFM task lists.
    // This is more robust than manually parsing the text.
    if (token.task) {
      const content = token.text;
      const isChecked = token.checked;

      return `
        <li class="checkbox-item">
          <label class="checkbox-label">
            <input type="checkbox" class="markdown-checkbox" ${isChecked ? 'checked' : ''}>
            <span class="checkbox-text ${isChecked ? 'checked' : ''}">${content}</span>
          </label>
        </li>
      `;
    }

    return `<li>${token.text}</li>`;
  }
};

marked.use({ renderer });

/**
 * Render markdown with interactive checkboxes
 * @param {string} text - Raw markdown text
 * @returns {string} Rendered HTML
 */
export function renderMarkdown(text) {
  if (!text) return '';

  try {
    const html = marked.parse(text, {
      breaks: true,
      gfm: true
    });
    return html;
  } catch (error) {
    console.error('[ERROR] Markdown rendering failed:', error);
    return text;
  }
}

/**
 * Create progress HTML
 * @param {Object} stats - Checkbox statistics
 * @returns {string} Progress HTML
 */
export function createProgressHTML(stats) {
  if (!stats.hasCheckboxes) return '';

  return `
    <div class="checkbox-progress">
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${stats.percentage}%"></div>
      </div>
      <div class="progress-text">
        ${stats.checked}/${stats.total} (${stats.percentage}%)
      </div>
    </div>
  `;
}

/**
 * Setup checkbox event handlers
 * @param {HTMLElement} container - Container element
 * @param {Function} onChange - Callback when checkbox state changes
 */
export function setupCheckboxHandlers(container, onChange) {
  const checkboxes = container.querySelectorAll('.markdown-checkbox');

  checkboxes.forEach((checkbox, index) => {
    checkbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const textSpan = e.target.nextElementSibling;

      if (textSpan) {
        textSpan.classList.toggle('checked', isChecked);
      }

      // Callback with updated state
      if (onChange) {
        onChange(index, isChecked);
      }
    });
  });
}

/**
 * Update textarea content based on checkbox changes
 * @param {string} originalText - Original textarea text
 * @param {number} index - Checkbox index
 * @param {boolean} isChecked - New checked state
 * @returns {string} Updated text
 */
export function updateTextWithCheckbox(originalText, index, isChecked) {
  const lines = originalText.split('\n');
  let checkboxCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const checkboxPattern = /^([\s]*[-*]\s+)\[([ xX])\](\s+.*)$/;
    const match = lines[i].match(checkboxPattern);

    if (match) {
      if (checkboxCount === index) {
        // Update this checkbox
        const newState = isChecked ? 'x' : ' ';
        lines[i] = `${match[1]}[${newState}]${match[3]}`;
        break;
      }
      checkboxCount++;
    }
  }

  return lines.join('\n');
}
