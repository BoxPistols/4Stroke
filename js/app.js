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
  resetSettings
} from './settings.js';

// Minimap import
import {
  initializeMinimap,
  setMinimapUserId
} from './minimap.js';

// Constants
const DEBOUNCE_DELAY = 500;
const MOBILE_BREAKPOINT = 768;
const AUTO_COLLAPSE_DELAY = 5000;
const URL_CONVERSION_ENABLED = true; // Feature flag

// Debounce timer
let saveTimer = null;

document.addEventListener("DOMContentLoaded", async function () {
  const mode = getStorageMode();
  console.log(`[INFO] App starting in ${mode} mode`);

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

      // Set user ID for minimap
      setMinimapUserId(user.uid);

      // Show user info
      const userEmailElement = document.getElementById('user-email');
      if (userEmailElement) {
        userEmailElement.textContent = user.email;
      }

      // Show logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.style.display = 'block';
        const logoutText = logoutBtn.querySelector('.logout-text');
        if (logoutText) {
          logoutText.textContent = 'LOGOUT';
        }
      }

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

    // Hide user email, show mode indicator
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
      userEmailElement.textContent = 'Local Mode';
    }

    // Change logout button to "Switch to Online"
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
      const logoutText = logoutBtn.querySelector('.logout-text');
      if (logoutText) {
        logoutText.textContent = 'ONLINE MODE';
      }
      logoutBtn.title = 'Switch to online mode with cloud sync';
    }

    // Load data from localStorage
    await loadData(null);

    // Setup event listeners
    setupEventListeners(null);
  }

  // CSS Scroll Snap Polyfill
  const init = function () {
    cssScrollSnapPolyfill();
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

  /**
   * Utility function
   */
  const $$ = (_x) => {
    return document.querySelectorAll(_x);
  };

  const handleTextArea = $$("textarea.stroke");
  const clearBtns = $$("input.clear");
  const autoSave = () => {
    const message = document.querySelector("#message");
    message.classList.remove("is-hidden");
    setTimeout(() => {
      message.classList.add("is-hidden");
    }, 1200);
  };

  /**
   * Load data from storage (Local or Firestore)
   */
  async function loadData(userId) {
    try {
      console.log('[INFO] Loading data...');
      const garages = await Storage.loadAllGarages(userId);

      // Populate UI
      for (let i = 1; i <= 4; i++) {
        const garage = garages[`garage${i}`];

        // Set title
        const titleInput = document.querySelector(`#garage${String.fromCharCode(64 + i).toLowerCase()} .stroke-title`);
        if (titleInput) {
          titleInput.value = garage.title || '';
        }

        // Set strokes
        for (let j = 1; j <= 4; j++) {
          const strokeIndex = (i - 1) * 4 + j;
          const textarea = handleTextArea[strokeIndex - 1];
          if (textarea) {
            textarea.value = garage[`stroke${j}`] || '';
          }
        }
      }

      console.log('[SUCCESS] Data loaded');
    } catch (error) {
      console.error('[ERROR] Data load failed:', error);
      alert('Failed to load data. Please refresh the page.');
    }
  }

  /**
   * Setup all event listeners
   */
  function setupEventListeners(userId) {
    // Textarea input events
    handleTextArea.forEach((elm, i) => {
      elm.addEventListener("keyup", (event) => {
        // Debounce (wait 500ms after continuous input)
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const garageNum = Math.floor(i / 4) + 1;
          const strokeNum = (i % 4) + 1;
          const garageId = `garage${garageNum}`;
          const fieldKey = `stroke${strokeNum}`;

          try {
            await Storage.saveStroke(userId, garageId, fieldKey, event.target.value);
            autoSave();
          } catch (error) {
            console.error('[ERROR] Save failed:', error);
          }
        }, DEBOUNCE_DELAY);
      });

      // URL to Markdown conversion on paste
      if (URL_CONVERSION_ENABLED) {
        elm.addEventListener("paste", async (event) => {
          event.preventDefault();

          // Get pasted text
          const pastedText = (event.clipboardData || window.clipboardData).getData('text');

          if (!pastedText) return;

          console.log('[INFO] URL conversion: Processing pasted text');

          try {
            // Convert URLs to Markdown format
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
            const garageNum = Math.floor(i / 4) + 1;
            const strokeNum = (i % 4) + 1;
            const garageId = `garage${garageNum}`;
            const fieldKey = `stroke${strokeNum}`;

            await Storage.saveStroke(userId, garageId, fieldKey, elm.value);
            autoSave();

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

    // Title input events
    const titleInputs = document.querySelectorAll('.stroke-title');
    titleInputs.forEach((input, i) => {
      input.addEventListener("keyup", (event) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const garageId = `garage${i + 1}`;
          try {
            await Storage.saveTitle(userId, garageId, event.target.value);
            autoSave();
          } catch (error) {
            console.error('[ERROR] Title save failed:', error);
          }
        }, DEBOUNCE_DELAY);
      });
    });

    // Individual stroke delete
    clearBtns.forEach((btn, i) => {
      btn.addEventListener("click", async () => {
        const textarea = handleTextArea[i];
        if (!textarea.value) {
          alert("Nothing to delete");
          return;
        }

        if (confirm("Delete this stroke?")) {
          const garageNum = Math.floor(i / 4) + 1;
          const strokeNum = (i % 4) + 1;
          const garageId = `garage${garageNum}`;
          const fieldKey = `stroke${strokeNum}`;

          try {
            await Storage.deleteStroke(userId, garageId, fieldKey);
            textarea.value = "";
            autoSave();
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

    // Title delete
    const handleTitleClear = $$(".title-delete");
    handleTitleClear.forEach((btn, i) => {
      btn.addEventListener("click", async () => {
        const titleInput = btn.previousElementSibling;
        if (!titleInput.value) {
          alert("Nothing to delete");
          return;
        }

        if (confirm(`Delete "${titleInput.value}"?`)) {
          const garageId = `garage${i + 1}`;

          try {
            await Storage.saveTitle(userId, garageId, '');
            titleInput.value = "";
            autoSave();
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

    // Garage group delete
    const handleGarageClear = $$('#clearA, #clearB, #clearC, #clearD');
    handleGarageClear.forEach((btn, garageIndex) => {
      btn.addEventListener("click", async () => {
        const garageName = btn.value.replace("Delete /", "").trim();

        if (confirm(`Delete ${garageName}?`)) {
          const garageId = `garage${garageIndex + 1}`;

          try {
            await Storage.deleteGarage(userId, garageId);

            // Clear UI
            const startIndex = garageIndex * 4;
            for (let i = startIndex; i < startIndex + 4; i++) {
              handleTextArea[i].value = "";
            }

            // Clear title
            const titleInputs = document.querySelectorAll('.stroke-title');
            if (titleInputs[garageIndex]) {
              titleInputs[garageIndex].value = "";
            }

            autoSave();
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

    // Logout / Mode switch button
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.querySelector('.user-info');

    if (logoutBtn && userInfo) {
      console.log('[INFO] Setting up logout button, current mode:', getStorageMode());

      // Mobile: Toggle expanded state on first click
      let isExpanded = false;
      let expandTimeout = null;

      const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

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
          }, AUTO_COLLAPSE_DELAY);
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
    } else {
      console.error('[ERROR] Logout button or user-info not found!');
    }
  }

  /**
   * Setup keyboard navigation for garages
   */
  function setupKeyboardNavigation() {
    const garages = ['garageA', 'garageB', 'garageC', 'garageD'];
    let currentGarageIndex = 0;

    // Get current garage index based on scroll position
    function getCurrentGarageIndex() {
      const garageElements = garages.map(id => document.getElementById(id));
      const scrollContainer = document.querySelector('.garages-container');

      if (!scrollContainer) return 0;

      const scrollTop = scrollContainer.scrollTop;
      const scrollLeft = scrollContainer.scrollLeft;

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
      return 0;
    }

    // Navigate to specific garage
    function navigateToGarage(index) {
      if (index < 0 || index >= garages.length) return;

      const targetGarage = document.getElementById(garages[index]);
      if (targetGarage) {
        targetGarage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        currentGarageIndex = index;
        console.log(`[INFO] Navigated to ${garages[index]}`);
      }
    }

    // Keyboard event listener
    document.addEventListener('keydown', (event) => {
      // Ignore if user is typing in an input/textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Get current garage index
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
   * Setup settings modal event listeners
   */
  function setupSettingsModal() {
    const settingsBtn = document.getElementById('settings-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
    const modal = document.getElementById('settings-modal');

    // Open modal
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        openSettingsModal();
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
        if (confirm('Reset all settings to defaults?')) {
          resetSettings();
          alert('Settings reset! Please refresh the page.');
          closeSettingsModal();
        }
      });
    }

    console.log('[INFO] Settings modal initialized');
  }
});
