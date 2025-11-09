// Settings Manager
// Manages user preferences for garage shortcuts and order

const SETTINGS_KEY = 'garage-settings';

// Default settings
const DEFAULT_SETTINGS = {
  shortcuts: {
    garageA: { key: '1', modifiers: ['ctrl'] },
    garageB: { key: '2', modifiers: ['ctrl'] },
    garageC: { key: '3', modifiers: ['ctrl'] },
    garageD: { key: '4', modifiers: ['ctrl'] }
  },
  garageOrder: ['garageA', 'garageB', 'garageC', 'garageD']
};

/**
 * Load settings from localStorage
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return {
        shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...settings.shortcuts },
        garageOrder: settings.garageOrder || DEFAULT_SETTINGS.garageOrder
      };
    }
  } catch (error) {
    console.error('[ERROR] Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    console.log('[INFO] Settings saved');
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to save settings:', error);
    return false;
  }
}

/**
 * Reset settings to defaults
 */
export function resetSettings() {
  return saveSettings(DEFAULT_SETTINGS);
}

/**
 * Apply garage order by rearranging DOM elements
 */
export function applyGarageOrder(order) {
  const garagesContainer = document.querySelector('.garages');
  if (!garagesContainer) return;

  // Get all garage elements
  const garageElements = {};
  order.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      garageElements[id] = element;
    }
  });

  // Remove all garages from container
  Object.values(garageElements).forEach(element => {
    element.remove();
  });

  // Re-add garages in new order
  order.forEach(id => {
    if (garageElements[id]) {
      garagesContainer.appendChild(garageElements[id]);
    }
  });

  console.log('[INFO] Garage order applied:', order);
}

/**
 * Setup keyboard shortcuts for garages
 */
export function setupGarageShortcuts(settings) {
  document.addEventListener('keydown', (event) => {
    // Ignore if user is typing
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    // Check each garage shortcut
    for (const [garageId, shortcut] of Object.entries(settings.shortcuts)) {
      if (event.key === shortcut.key || event.key === shortcut.key.toLowerCase()) {
        // Check modifiers
        const ctrlMatch = shortcut.modifiers.includes('ctrl') ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.modifiers.includes('alt') ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.modifiers.includes('shift') ? event.shiftKey : !event.shiftKey;

        if (ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          const garage = document.getElementById(garageId);
          if (garage) {
            garage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log(`[INFO] Navigated to ${garageId} via shortcut`);
          }
          break;
        }
      }
    }
  });

  console.log('[INFO] Garage shortcuts initialized');
}

/**
 * Open settings modal
 */
export function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.add('active');
    populateSettingsForm();
  }
}

/**
 * Close settings modal
 */
export function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Populate settings form with current settings
 */
function populateSettingsForm() {
  const settings = loadSettings();

  // Populate shortcuts
  const garages = ['garageA', 'garageB', 'garageC', 'garageD'];
  garages.forEach(garageId => {
    const shortcut = settings.shortcuts[garageId];
    const keyInput = document.getElementById(`${garageId}-key`);
    const ctrlCheck = document.getElementById(`${garageId}-ctrl`);
    const altCheck = document.getElementById(`${garageId}-alt`);
    const shiftCheck = document.getElementById(`${garageId}-shift`);

    if (keyInput) keyInput.value = shortcut.key;
    if (ctrlCheck) ctrlCheck.checked = shortcut.modifiers.includes('ctrl');
    if (altCheck) altCheck.checked = shortcut.modifiers.includes('alt');
    if (shiftCheck) shiftCheck.checked = shortcut.modifiers.includes('shift');
  });

  // Populate garage order
  const orderContainer = document.getElementById('garage-order-list');
  if (orderContainer) {
    orderContainer.innerHTML = '';
    settings.garageOrder.forEach((garageId, index) => {
      const item = document.createElement('div');
      item.className = 'garage-order-item';
      item.draggable = true;
      item.dataset.garageId = garageId;

      const label = garageId.replace('garage', 'GARAGE-');
      item.innerHTML = `
        <span class="drag-handle">☰</span>
        <span class="garage-label">${label}</span>
        <div class="order-buttons">
          <button type="button" class="order-btn up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="order-btn down" data-index="${index}" ${index === settings.garageOrder.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      `;

      orderContainer.appendChild(item);
    });

    setupDragAndDrop(orderContainer);
    setupOrderButtons();
  }
}

/**
 * Setup drag and drop for garage order
 */
function setupDragAndDrop(container) {
  let draggedItem = null;

  container.querySelectorAll('.garage-order-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== item) {
        const rect = item.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
          container.insertBefore(draggedItem, item);
        } else {
          container.insertBefore(draggedItem, item.nextSibling);
        }
      }
    });
  });
}

/**
 * Setup order up/down buttons
 */
function setupOrderButtons() {
  document.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      const container = document.getElementById('garage-order-list');
      const items = Array.from(container.querySelectorAll('.garage-order-item'));

      if (e.target.classList.contains('up') && index > 0) {
        container.insertBefore(items[index], items[index - 1]);
      } else if (e.target.classList.contains('down') && index < items.length - 1) {
        container.insertBefore(items[index + 1], items[index]);
      }

      populateSettingsForm(); // Refresh buttons
    });
  });
}

/**
 * Save settings from form
 */
export function saveSettingsFromForm() {
  const garages = ['garageA', 'garageB', 'garageC', 'garageD'];

  // Collect shortcuts
  const shortcuts = {};
  garages.forEach(garageId => {
    const keyInput = document.getElementById(`${garageId}-key`);
    const ctrlCheck = document.getElementById(`${garageId}-ctrl`);
    const altCheck = document.getElementById(`${garageId}-alt`);
    const shiftCheck = document.getElementById(`${garageId}-shift`);

    const modifiers = [];
    if (ctrlCheck?.checked) modifiers.push('ctrl');
    if (altCheck?.checked) modifiers.push('alt');
    if (shiftCheck?.checked) modifiers.push('shift');

    shortcuts[garageId] = {
      key: keyInput?.value || '1',
      modifiers
    };
  });

  // Collect garage order
  const orderContainer = document.getElementById('garage-order-list');
  const garageOrder = Array.from(orderContainer.querySelectorAll('.garage-order-item'))
    .map(item => item.dataset.garageId);

  // Save settings
  const settings = { shortcuts, garageOrder };
  if (saveSettings(settings)) {
    alert('Settings saved! Refresh the page to apply changes.');
    closeSettingsModal();
  } else {
    alert('Failed to save settings');
  }
}

/**
 * Initialize settings
 */
export function initializeSettings() {
  const settings = loadSettings();

  // Apply garage order
  applyGarageOrder(settings.garageOrder);

  // Setup keyboard shortcuts
  setupGarageShortcuts(settings);

  console.log('[INFO] Settings initialized');
}
