// Storage service import
import { getStorageMode, isLocalMode, isOnlineMode, Storage } from './storage-service.js';

// URL converter import
import { processPastedText, processPastedTextSync } from './url-converter.js';

// Settings import
import {
  initializeSettings,
  openSettingsModal,
  closeSettingsModal,
  saveSettingsFromForm,
  resetSettings,
  resetSettingsWithConfirmation,
  showConfirmation,
  getGarageDataIdFromPosition,
  getPositionFromGarageDataId,
  loadSettings
} from './settings.js';

// Minimap import
import {
  initializeMinimap,
  setMinimapUserId
} from './minimap.js';

// Utilities import
import { TIMINGS, BREAKPOINTS, FEATURES, GARAGE } from './constants.js';
import { debounce } from './utils/debounce.js';
import { DOM, showAutoSaveMessage } from './utils/dom-cache.js';
import { numberToGarageId, getNotePosition } from './utils/garage-id-utils.js';

// Debounce timer
let saveTimer = null;

document.addEventListener("DOMContentLoaded", async function () {
  const mode = getStorageMode();
  console.log(`[INFO] App starting in ${mode} mode`);

  // Note: DOM elements and autoSave function are now imported from dom-cache.js

  /**
   * Load data from storage (Local or Firestore)
   * Uses garage order mapping to display data at correct UI positions
   */
  async function loadData(userId) {
    try {
      console.log('[INFO] Loading data...', { userId, mode: getStorageMode() });
      const garages = await Storage.loadAllGarages(userId);
      console.log('[INFO] Garages loaded:', garages);

      const textareas = DOM.textareas;

      // Populate UI
      for (let i = 1; i <= GARAGE.COUNT; i++) {
        const letteredId = numberToGarageId(i);
        const garage = garages[letteredId];

        // Safety check: skip if garage data is missing
        if (!garage) {
          console.warn(`[WARNING] No data for ${letteredId}`);
          continue;
        }

        const uiPosition = i - 1; // UI position (0-3)

        // Set title
        const titleInput = DOM.getTitleInput(letteredId);
        if (titleInput) {
          titleInput.value = garage.title || '';
        }

        // Set strokes
        for (let j = 1; j <= GARAGE.STROKES_PER_GARAGE; j++) {
          const strokeIndex = uiPosition * GARAGE.STROKES_PER_GARAGE + j;
          const textarea = textareas[strokeIndex - 1];
          if (textarea) {
            textarea.value = garage[`stroke${j}`] || '';
          }
        }
      }

      console.log('[SUCCESS] Data loaded');
    } catch (error) {
      console.error('[ERROR] Data load failed:', error);
      console.error('[ERROR] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert(`Failed to load data. Please refresh the page.\n\nError: ${error.message}`);
    }
  }

  /**
   * Setup textarea input event listeners
   */
  function setupTextareaListeners(userId) {
    const textareas = DOM.textareas;

    textareas.forEach((elm, i) => {
      // Keyup event with debounce
      elm.addEventListener("keyup", (event) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const { garageNum, strokeNum } = getNotePosition(i + 1);
          const garageId = numberToGarageId(garageNum);
          const fieldKey = `stroke${strokeNum}`;

          try {
            await Storage.saveStroke(userId, garageId, fieldKey, event.target.value);
            showAutoSaveMessage();
          } catch (error) {
            console.error('[ERROR] Save failed:', error);
          }
        }, TIMINGS.DEBOUNCE_DELAY);
      });

      // URL to Markdown conversion on paste
      if (FEATURES.URL_CONVERSION_ENABLED) {
        elm.addEventListener("paste", async (event) => {
          event.preventDefault();

          const pastedText = (event.clipboardData || window.clipboardData).getData('text');
          if (!pastedText) return;

          console.log('[INFO] URL conversion: Processing pasted text');

          try {
            const processedText = await processPastedText(pastedText);

            // Insert processed text at cursor position
            const start = elm.selectionStart;
            const end = elm.selectionEnd;
            const currentValue = elm.value;

            elm.value = currentValue.substring(0, start) + processedText + currentValue.substring(end);

            // Set cursor position after inserted text
            const newCursorPos = start + processedText.length;
            elm.setSelectionRange(newCursorPos, newCursorPos);

            // Trigger save
            const { garageNum, strokeNum } = getNotePosition(i + 1);
            const garageId = numberToGarageId(garageNum);
            const fieldKey = `stroke${strokeNum}`;

            await Storage.saveStroke(userId, garageId, fieldKey, elm.value);
            showAutoSaveMessage();

            console.log('[SUCCESS] URL conversion completed');
          } catch (error) {
            console.error('[ERROR] URL conversion failed:', error);
            // Fallback: insert original text
            const start = elm.selectionStart;
            const end = elm.selectionEnd;
            const currentValue = elm.value;
            elm.value = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
          }
        });
      }
    });
  }

  /**
   * Setup title input event listeners
   */
  function setupTitleListeners(userId) {
    const titleInputs = DOM.titleInputs;

    titleInputs.forEach((input, i) => {
      input.addEventListener("keyup", (event) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const garageId = numberToGarageId(i + 1);
          try {
            await Storage.saveTitle(userId, garageId, event.target.value);
            showAutoSaveMessage();
          } catch (error) {
            console.error('[ERROR] Title save failed:', error);
          }
        }, TIMINGS.DEBOUNCE_DELAY);
      });
    });
  }

  /**
   * Setup stroke delete button listeners
   */
  function setupStrokeDeleteListeners(userId) {
    const clearBtns = DOM.clearBtns;
    const textareas = DOM.textareas;

    clearBtns.forEach((btn, i) => {
      btn.addEventListener("click", async () => {
        const textarea = textareas[i];
        if (!textarea.value) {
          alert("Nothing to delete");
          return;
        }

        if (confirm("Delete this stroke?")) {
          const { garageNum, strokeNum } = getNotePosition(i + 1);
          const garageId = numberToGarageId(garageNum);
          const fieldKey = `stroke${strokeNum}`;

          try {
            await Storage.deleteStroke(userId, garageId, fieldKey);
            textarea.value = "";
            showAutoSaveMessage();
            alert("Deleted");
          } catch (error) {
            console.error('[ERROR] Delete failed:', error);
            alert('Delete failed');
          }
        } else {
          alert("Cancelled");
        }
      });
    });
  }

  /**
   * Setup title delete button listeners
   */
  function setupTitleDeleteListeners(userId) {
    const titleDeleteBtns = DOM.titleDeleteBtns;

    titleDeleteBtns.forEach((btn, i) => {
      btn.addEventListener("click", async () => {
        const titleInput = btn.previousElementSibling;
        if (!titleInput.value) {
          alert("Nothing to delete");
          return;
        }

        if (confirm(`Delete "${titleInput.value}"?`)) {
          const garageId = numberToGarageId(i + 1);

          try {
            await Storage.saveTitle(userId, garageId, '');
            titleInput.value = "";
            showAutoSaveMessage();
            alert("Deleted");
          } catch (error) {
            console.error('[ERROR] Title delete failed:', error);
            alert('Delete failed');
          }
        } else {
          alert("Cancelled");
        }
      });
    });
  }

  /**
   * Setup garage delete button listeners
   */
  function setupGarageDeleteListeners(userId) {
    const garageClearBtns = DOM.garageClearBtns;
    const textareas = DOM.textareas;
    const titleInputs = DOM.titleInputs;

    garageClearBtns.forEach((btn, garageIndex) => {
      btn.addEventListener("click", async () => {
        const garageName = btn.value.replace("Delete /", "").trim();

        if (confirm(`Delete ${garageName}?`)) {
          const garageId = numberToGarageId(garageIndex + 1);

          try {
            await Storage.deleteGarage(userId, garageId);

            // Clear UI
            const startIndex = garageIndex * GARAGE.STROKES_PER_GARAGE;
            for (let i = startIndex; i < startIndex + GARAGE.STROKES_PER_GARAGE; i++) {
              textareas[i].value = "";
            }

            // Clear title
            if (titleInputs[garageIndex]) {
              titleInputs[garageIndex].value = "";
            }

            showAutoSaveMessage();
            alert("Deleted");
          } catch (error) {
            console.error('[ERROR] Garage delete failed:', error);
            alert('Delete failed');
          }
        } else {
          alert("Cancelled");
        }
      });
    });
  }

  /**
   * Setup logout/mode switch button listeners
   */
  function setupLogoutButton() {
    const logoutBtn = DOM.logoutBtn;
    const userInfo = DOM.userInfo;

    if (!logoutBtn || !userInfo) {
      console.error('[ERROR] Logout button or user-info not found!');
      return;
    }

    console.log('[INFO] Setting up logout button, current mode:', getStorageMode());

    // Mobile: Toggle expanded state on first click
    let isExpanded = false;
    let expandTimeout = null;

    const isMobile = () => window.innerWidth <= BREAKPOINTS.MOBILE;

    userInfo.addEventListener('click', (e) => {
      if (!isMobile()) return;

      if (!isExpanded) {
        e.stopPropagation();
        userInfo.classList.add('expanded');
        isExpanded = true;

        // Auto-collapse after timeout
        expandTimeout = setTimeout(() => {
          userInfo.classList.remove('expanded');
          isExpanded = false;
        }, TIMINGS.AUTO_COLLAPSE_DELAY);
      }
    });

    // Collapse when clicking outside
    document.addEventListener('click', (e) => {
      if (isMobile() && isExpanded && !userInfo.contains(e.target)) {
        userInfo.classList.remove('expanded');
        isExpanded = false;
        clearTimeout(expandTimeout);
      }
    });

    // Actual logout/mode switch action
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // On mobile, if not expanded, expand instead of action
      if (isMobile() && !isExpanded) {
        userInfo.classList.add('expanded');
        isExpanded = true;
        return;
      }

      console.log('[INFO] Logout button clicked, mode:', getStorageMode());

      if (isOnlineMode()) {
        // Logout from online mode
        if (confirm('Logout?')) {
          const { logout } = await import('./auth.js');
          try {
            await logout();
            window.location.href = '/login.html';
          } catch (error) {
            console.error('[ERROR] Logout failed:', error);
            alert('Logout failed');
          }
        }
      } else {
        // Switch to online mode
        if (confirm('Switch to online mode? You will need to login.')) {
          window.location.href = '/login.html';
        }
      }
    });
  }

  /**
   * Setup expand to Mandara button listeners
   */
  function setupExpandToMandaraListeners() {
    const expandBtns = document.querySelectorAll('.expand-to-mandara-btn');

    expandBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const garageId = btn.dataset.garage;
        const titleInput = DOM.getTitleInput(garageId);
        const title = titleInput ? titleInput.value : '';

        // Get Key (stroke1) for this garage
        const garageNum = garageId.charCodeAt(garageId.length - 1) - 64; // A=1, B=2, etc.
        const keyTextarea = DOM.textareas[(garageNum - 1) * 4]; // First stroke of this garage
        const key = keyTextarea ? keyTextarea.value : '';

        // Store data in sessionStorage for Mandara to pick up
        const data = {
          garageId,
          title,
          key
        };
        sessionStorage.setItem('4stroke_expand', JSON.stringify(data));

        // Navigate to mandara.html
        window.location.href = 'mandara.html?from=4stroke';
      });
    });
  }

  /**
   * Setup all event listeners - orchestrates all listener setup functions
   */
  function setupEventListeners(userId) {
    setupTextareaListeners(userId);
    setupTitleListeners(userId);
    setupStrokeDeleteListeners(userId);
    setupTitleDeleteListeners(userId);
    setupGarageDeleteListeners(userId);
    setupLogoutButton();
    setupExpandToMandaraListeners();
  }

  /**
   * Setup keyboard navigation for garages
   */
  function setupKeyboardNavigation() {
    let currentGarageIndex = 0;
    let isNavigating = false;
    let navigationTimeout = null;

    // Fixed UI positions (DOM order is always the same)
    const uiPositions = ['garageA', 'garageB', 'garageC', 'garageD'];

    // Load navigation shortcuts from settings
    const settings = loadSettings();
    const prevShortcut = settings.navigation.prev;
    const nextShortcut = settings.navigation.next;

    // Get current garage index based on scroll position
    function getCurrentGarageIndex() {
      const garageElements = uiPositions.map(id => document.getElementById(id));
      const scrollContainer = DOM.garagesContainer;

      if (!scrollContainer) return 0;

      // Find which garage is currently visible
      for (let i = 0; i < garageElements.length; i++) {
        const garage = garageElements[i];
        if (garage) {
          const rect = garage.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          // Check if garage is in viewport
          if (rect.top >= containerRect.top && rect.top <= containerRect.bottom) {
            return i;
          }
        }
      }
      return currentGarageIndex;
    }

    // Navigate to specific garage
    function navigateToGarage(index) {
      if (index < 0 || index >= uiPositions.length) {
        return;
      }

      const targetGarage = document.getElementById(uiPositions[index]);
      if (targetGarage) {
        // Update current index BEFORE scrolling
        currentGarageIndex = index;

        // Use smooth scrolling but don't block rapid navigation
        targetGarage.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Mark as navigating
        isNavigating = true;

        // Clear previous timeout
        if (navigationTimeout) {
          clearTimeout(navigationTimeout);
        }

        // Reset navigation flag after animation
        navigationTimeout = setTimeout(() => {
          isNavigating = false;
        }, 300); // Short timeout to allow rapid consecutive navigation

        console.log(`[INFO] Navigated to ${uiPositions[index]}`);
      }
    }

    // Check if modifiers match the shortcut
    function modifiersMatch(event, shortcut) {
      const ctrlMatch = shortcut.modifiers.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
      const altMatch = shortcut.modifiers.includes('alt') ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.modifiers.includes('shift') ? event.shiftKey : !event.shiftKey;
      const metaMatch = shortcut.modifiers.includes('meta') ? event.metaKey : !event.metaKey;

      return ctrlMatch && altMatch && shiftMatch && metaMatch;
    }

    // Keyboard event listener
    document.addEventListener('keydown', (event) => {
      // Check for navigation shortcuts (works even when typing)
      const prevKeyMatch = event.key === prevShortcut.key;
      const nextKeyMatch = event.key === nextShortcut.key;
      const prevModMatch = modifiersMatch(event, prevShortcut);
      const nextModMatch = modifiersMatch(event, nextShortcut);

      if (prevKeyMatch && prevModMatch) {
        event.preventDefault();
        navigateToGarage(currentGarageIndex - 1);
        return;
      }

      if (nextKeyMatch && nextModMatch) {
        event.preventDefault();
        navigateToGarage(currentGarageIndex + 1);
        return;
      }

      // Ignore plain arrow keys if user is typing in an input/textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Get current garage index for plain arrow keys
      currentGarageIndex = getCurrentGarageIndex();

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          navigateToGarage(currentGarageIndex - 1);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          navigateToGarage(currentGarageIndex + 1);
          break;
      }
    });

    console.log('[INFO] Keyboard navigation initialized');
  }

  /**
   * Update mode display in settings modal
   */
  function updateModeDisplay() {
    const currentModeDisplay = DOM.currentModeDisplay;
    const currentUserDisplay = DOM.currentUserDisplay;
    const modeSwitchText = DOM.modeSwitchText;

    if (isOnlineMode()) {
      if (currentModeDisplay) currentModeDisplay.textContent = 'Online Mode';
      // Will be updated with actual user email when logged in
      if (currentUserDisplay) currentUserDisplay.textContent = 'Logged in';
      if (modeSwitchText) modeSwitchText.textContent = 'Logout';
    } else {
      if (currentModeDisplay) currentModeDisplay.textContent = 'Local Mode';
      if (currentUserDisplay) currentUserDisplay.textContent = 'Not logged in';
      if (modeSwitchText) modeSwitchText.textContent = 'Switch to Online Mode';
    }
  }

  /**
   * Setup settings modal event listeners
   */
  function setupSettingsModal() {
    const settingsBtn = DOM.settingsBtn;
    const modalCloseBtn = DOM.modalCloseBtn;
    const saveSettingsBtn = DOM.saveSettingsBtn;
    const resetSettingsBtn = DOM.resetSettingsBtn;
    const cancelSettingsBtn = DOM.cancelSettingsBtn;
    const modeSwitchBtn = DOM.modeSwitchBtn;
    const modal = DOM.settingsModal;

    // Open modal
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        openSettingsModal();
        updateModeDisplay();
      });
    }

    // Close modal
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => {
        closeSettingsModal();
      });
    }

    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener('click', () => {
        closeSettingsModal();
      });
    }

    // Close modal on background click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeSettingsModal();
        }
      });
    }

    // Save settings
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        saveSettingsFromForm();
      });
    }

    // Reset settings
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => {
        resetSettingsWithConfirmation();
      });
    }

    // Mode switch
    if (modeSwitchBtn) {
      modeSwitchBtn.addEventListener('click', async () => {
        if (isOnlineMode()) {
          // Logout from online mode
          const confirmed = await showConfirmation(
            'Logout',
            'Are you sure you want to logout?'
          );
          if (confirmed) {
            const { logout } = await import('./auth.js');
            try {
              await logout();
              window.location.href = '/login.html';
            } catch (error) {
              console.error('[ERROR] Logout failed:', error);
              const { showToast } = await import('./settings.js');
              showToast('Logout failed');
            }
          }
        } else {
          // Switch to online mode
          const confirmed = await showConfirmation(
            'Switch to Online Mode',
            'You will need to login. Continue?'
          );
          if (confirmed) {
            window.location.href = '/login.html';
          }
        }
      });
    }

    console.log('[INFO] Settings modal initialized');
  }

  /**
   * Handle Mandara expansion - populate 4Stroke from Mandara data
   */
  function handleMandaraExpand() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromMandara = urlParams.get('from') === 'mandara';

    if (!fromMandara) return;

    const expandData = sessionStorage.getItem('mandara_expand');
    if (!expandData) {
      console.warn('[WARN] No mandara_expand data found in sessionStorage');
      return;
    }

    try {
      const data = JSON.parse(expandData);
      console.log('[INFO] Expanding from Mandara:', data);

      // Clear sessionStorage
      sessionStorage.removeItem('mandara_expand');

      // Remove 'from=mandara' from URL
      urlParams.delete('from');
      const newUrl = urlParams.toString() ?
        `${window.location.pathname}?${urlParams.toString()}` :
        window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Populate the first garage (Garage A) with mandara data
      const textareas = DOM.textareas;

      // Set center cell (cell 5) as Key (stroke 1)
      if (textareas[0] && data.center) {
        textareas[0].value = data.center;
        textareas[0].dispatchEvent(new Event('keyup', { bubbles: true }));
      }

      // Set surrounding cells (1-4, 6-9) as other strokes
      const cellMapping = [1, 2, 3, 4, 6, 7, 8, 9]; // Skip cell 5 (center)
      cellMapping.forEach((cellNum, idx) => {
        const textareaIdx = idx + 1; // Skip Key, start from stroke 2
        if (textareas[textareaIdx] && data.cells && data.cells[cellNum]) {
          textareas[textareaIdx].value = data.cells[cellNum];
          textareas[textareaIdx].dispatchEvent(new Event('keyup', { bubbles: true }));
        }
      });

      // Set title
      const titleInput = DOM.getTitleInput('garageA');
      if (titleInput && data.title) {
        titleInput.value = data.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      console.log('[SUCCESS] Mandara data expanded to 4Stroke');

      // Show success message
      const message = document.getElementById('message');
      if (message) {
        message.textContent = 'Mandaraから展開しました';
        message.classList.remove('is-hidden');
        setTimeout(() => {
          message.classList.add('is-hidden');
          message.textContent = 'Auto Save...';
        }, 2000);
      }
    } catch (error) {
      console.error('[ERROR] Failed to expand mandara data:', error);
    }
  }

  if (isOnlineMode()) {
    // Online mode - require authentication
    const { onAuthChange, getCurrentUser, logout } = await import('./auth.js');
    const { migrateFromLocalStorage } = await import('./firestore-crud.js');

    onAuthChange(async (user) => {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }

      console.log('[SUCCESS] Logged in:', user.email);

      // Update user info display in settings modal
      const currentUserDisplay = DOM.currentUserDisplay;
      if (currentUserDisplay) {
        currentUserDisplay.textContent = user.email || 'Logged in';
      }

      // Update logout button text with user email
      const logoutBtn = DOM.logoutBtn;
      if (logoutBtn) {
        const logoutText = DOM.logoutText;
        if (logoutText) {
          logoutText.textContent = 'LOGOUT';
        }
        logoutBtn.title = `Logout (${user.email})`;
      }

      // Set user ID for minimap
      setMinimapUserId(user.uid);

      // Migrate from localStorage (first time only)
      await migrateFromLocalStorage(user.uid);

      // Load data
      await loadData(user.uid);

      // Setup event listeners
      setupEventListeners(user.uid);
    });
  } else {
    // Local mode - no authentication required
    console.log('[INFO] Running in local storage mode');

    // Update logout button for local mode
    const logoutBtn = DOM.logoutBtn;
    if (logoutBtn) {
      const logoutText = DOM.logoutText;
      if (logoutText) {
        logoutText.textContent = 'LOGIN';
      }
      logoutBtn.title = 'Switch to Online Mode';
    }

    // Load data from localStorage
    await loadData(null);

    // Setup event listeners
    setupEventListeners(null);
  }

  // CSS Scroll Snap Polyfill (only if available)
  const init = function () {
    if (typeof cssScrollSnapPolyfill !== 'undefined') {
      cssScrollSnapPolyfill();
    }
  };
  init();

  // Initialize settings (garage order and shortcuts)
  initializeSettings();

  // Keyboard navigation for garages
  setupKeyboardNavigation();

  // Setup settings modal
  setupSettingsModal();

  // Initialize minimap
  const currentMode = getStorageMode();
  const userId = isOnlineMode() ? null : null; // Will be set properly in auth callback
  initializeMinimap(userId);

  // Handle Mandara expansion if coming from mandara page
  handleMandaraExpand();
});
