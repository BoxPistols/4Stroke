// Settings Manager
// Manages user preferences for garage shortcuts and order

const SETTINGS_KEY = 'garage-settings';

// Store the garage shortcut listener to prevent duplicates
let garageShortcutListener = null;

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
 * Get the data garage ID for a given UI position (0-3)
 * UI positions are fixed: garageA, garageB, garageC, garageD
 * This returns which garage's data should be displayed at that position
 */
export function getGarageDataIdFromPosition(position) {
  const settings = loadSettings();
  const order = settings.garageOrder;
  return order[position] || `garage${position + 1}`;
}

/**
 * Get the UI position (0-3) for a given data garage ID
 * This is the inverse of getGarageDataIdFromPosition
 */
export function getPositionFromGarageDataId(garageId) {
  const settings = loadSettings();
  const order = settings.garageOrder;
  const position = order.indexOf(garageId);
  return position >= 0 ? position : parseInt(garageId.replace('garage', '')) - 1;
}

/**
 * Apply garage order by updating titles (not moving DOM elements)
 * DOM positions remain fixed: garageA, garageB, garageC, garageD
 * Only the displayed titles and data change based on the order
 */
export function applyGarageOrder(order) {
  const garagesContainer = document.querySelector('.garages');
  if (!garagesContainer) return;

  // Fixed UI positions (DOM IDs)
  const uiPositions = ['garageA', 'garageB', 'garageC', 'garageD'];

  // Update the <h2> garage titles to reflect the order
  uiPositions.forEach((uiId, index) => {
    const dataGarageId = order[index];

    // Skip if garage ID is invalid or undefined
    if (!dataGarageId || typeof dataGarageId !== 'string') return;

    const garageLetter = dataGarageId.replace('garage', '');
    const garageElement = document.getElementById(uiId);

    if (garageElement) {
      const titleElement = garageElement.querySelector('.garage-title');
      if (titleElement) {
        titleElement.textContent = `GARAGE-${garageLetter}`;
      }
    }
  });

  console.log('[INFO] Garage order applied (titles updated):', order);
}

/**
 * Setup keyboard shortcuts for garages
 */
export function setupGarageShortcuts(settings) {
  // Remove the previous listener to prevent duplicates
  if (garageShortcutListener) {
    document.removeEventListener('keydown', garageShortcutListener);
  }

  // Create new listener function
  garageShortcutListener = (event) => {
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
  };

  // Add the new listener
  document.addEventListener('keydown', garageShortcutListener);

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
 * Show confirmation dialog
 */
export function showConfirmation(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes-btn');
    const noBtn = document.getElementById('confirm-no-btn');

    if (!modal || !titleEl || !messageEl || !yesBtn || !noBtn) {
      resolve(false);
      return;
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.classList.add('active');

    const handleYes = () => {
      modal.classList.remove('active');
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      resolve(true);
    };

    const handleNo = () => {
      modal.classList.remove('active');
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      resolve(false);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);

    // Close on escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.classList.remove('active');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Show success toast
 */
export function showToast(message, duration = 3000) {
  const toast = document.getElementById('success-toast');
  const messageEl = document.getElementById('success-toast-message');

  if (!toast || !messageEl) return;

  messageEl.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
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
    // Apply settings dynamically without page refresh
    applyGarageOrder(settings.garageOrder);
    setupGarageShortcuts(settings);

    showToast('Settings saved successfully!');
    closeSettingsModal();
  } else {
    showToast('Failed to save settings', 3000);
  }
}

/**
 * Reset settings to defaults with confirmation
 */
export async function resetSettingsWithConfirmation() {
  const confirmed = await showConfirmation(
    'Reset Settings',
    'Are you sure you want to reset all settings to defaults? This cannot be undone.'
  );

  if (confirmed) {
    if (resetSettings()) {
      // Apply default settings dynamically
      const defaultSettings = loadSettings();
      applyGarageOrder(defaultSettings.garageOrder);
      setupGarageShortcuts(defaultSettings);
      populateSettingsForm();

      showToast('Settings reset to defaults');
    } else {
      showToast('Failed to reset settings', 3000);
    }
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
