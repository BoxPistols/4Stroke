// Settings Manager
// Manages user preferences for garage shortcuts and order

const SETTINGS_KEY = 'garage-settings';

// Store the garage shortcut listener to prevent duplicates
let garageShortcutListener = null;

// Default settings
// Mac: Option key is Alt key
const DEFAULT_SETTINGS = {
  shortcuts: {
    garageA: { key: '1', modifiers: ['alt'] },
    garageB: { key: '2', modifiers: ['alt'] },
    garageC: { key: '3', modifiers: ['alt'] },
    garageD: { key: '4', modifiers: ['alt'] }
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

    // Cmd + Control + Arrow keys for garage navigation
    // On Mac: Cmd (metaKey) + Control (ctrlKey) + Left/Right
    if (event.metaKey && event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      navigateGarage(event.key === 'ArrowLeft' ? 'prev' : 'next', settings.garageOrder);
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
 * Navigate to next or previous garage
 */
function navigateGarage(direction, garageOrder) {
  // Find current garage
  const garages = garageOrder.map(id => document.getElementById(id));
  let currentIndex = -1;

  // Determine which garage is currently in view
  const container = document.querySelector('.garages-container');
  if (!container) return;

  const scrollLeft = container.scrollLeft;
  const viewportWidth = container.clientWidth;

  for (let i = 0; i < garages.length; i++) {
    const garage = garages[i];
    if (garage) {
      const garageLeft = garage.offsetLeft;
      const garageRight = garageLeft + garage.offsetWidth;

      // Check if garage is currently in viewport
      if (scrollLeft >= garageLeft - viewportWidth / 2 && scrollLeft < garageRight - viewportWidth / 2) {
        currentIndex = i;
        break;
      }
    }
  }

  // Navigate to next or previous
  let targetIndex = currentIndex;
  if (direction === 'next') {
    targetIndex = Math.min(currentIndex + 1, garages.length - 1);
  } else if (direction === 'prev') {
    targetIndex = Math.max(currentIndex - 1, 0);
  }

  if (targetIndex !== currentIndex && garages[targetIndex]) {
    garages[targetIndex].scrollIntoView({ behavior: 'smooth', inline: 'start' });
    console.log(`[INFO] Navigated to ${garageOrder[targetIndex]} via arrow keys`);
  }
}

/**
 * Open settings modal
 */
export function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.add('active');
    populateSettingsForm();
    setupModalEscapeKey();
  }
}

/**
 * Close settings modal
 */
export function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.remove('active');
    removeModalEscapeKey();
  }
}

/**
 * Setup ESC key to close modal
 */
let modalEscapeHandler = null;

function setupModalEscapeKey() {
  // Remove previous listener if exists
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler);
  }

  modalEscapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeSettingsModal();
    }
  };

  document.addEventListener('keydown', modalEscapeHandler);
}

function removeModalEscapeKey() {
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler);
    modalEscapeHandler = null;
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
