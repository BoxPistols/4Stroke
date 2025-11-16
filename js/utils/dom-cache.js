// DOM Cache Utility
// Centralized DOM element queries to reduce repetitive querySelector calls
// and improve performance

/**
 * DOM element cache
 * Use getter functions to ensure elements are retrieved when needed
 * (helpful for dynamically added elements)
 */
export const DOM = {
  // Textarea elements
  get textareas() {
    return document.querySelectorAll('textarea.stroke');
  },

  get titleInputs() {
    return document.querySelectorAll('.stroke-title');
  },

  // Clear buttons
  get clearBtns() {
    return document.querySelectorAll('input.clear');
  },

  get titleDeleteBtns() {
    return document.querySelectorAll('.title-delete');
  },

  get garageClearBtns() {
    return document.querySelectorAll('#clearA, #clearB, #clearC, #clearD');
  },

  // Messages and notifications
  get messageElement() {
    return document.querySelector('#message');
  },

  // User info and auth
  get userInfo() {
    return document.querySelector('.user-info');
  },

  get logoutBtn() {
    return document.getElementById('logout-btn');
  },

  get logoutText() {
    return this.logoutBtn?.querySelector('.logout-text');
  },

  // Settings modal elements
  get settingsBtn() {
    return document.getElementById('settings-btn');
  },

  get settingsModal() {
    return document.getElementById('settings-modal');
  },

  get modalCloseBtn() {
    return document.getElementById('modal-close-btn');
  },

  get saveSettingsBtn() {
    return document.getElementById('save-settings-btn');
  },

  get resetSettingsBtn() {
    return document.getElementById('reset-settings-btn');
  },

  get cancelSettingsBtn() {
    return document.getElementById('cancel-settings-btn');
  },

  get modeSwitchBtn() {
    return document.getElementById('mode-switch-btn');
  },

  get currentModeDisplay() {
    return document.getElementById('current-mode-display');
  },

  get currentUserDisplay() {
    return document.getElementById('current-user-display');
  },

  get modeSwitchText() {
    return document.getElementById('mode-switch-text');
  },

  // Minimap elements
  get minimapView() {
    return document.getElementById('minimap-view');
  },

  get minimapToggleBtn() {
    return document.getElementById('minimap-toggle-btn');
  },

  get minimapCloseBtn() {
    return document.getElementById('minimap-close-btn');
  },

  get minimapGrid() {
    return document.getElementById('minimap-grid');
  },

  // Garage containers
  get garagesContainer() {
    return document.querySelector('.garages-container');
  },

  /**
   * Get garage element by ID
   * @param {string} garageId - Garage ID (garageA, garageB, etc.)
   * @returns {HTMLElement|null}
   */
  getGarage(garageId) {
    return document.getElementById(garageId);
  },

  /**
   * Get textarea by note index
   * @param {number} noteIndex - Note index (1-16)
   * @returns {HTMLElement|null}
   */
  getTextarea(noteIndex) {
    return document.getElementById(`stroke${noteIndex}`);
  },

  /**
   * Get minimap textarea by note index
   * @param {number} noteIndex - Note index (1-16)
   * @returns {HTMLElement|null}
   */
  getMinimapTextarea(noteIndex) {
    return document.getElementById(`minimap-textarea-${noteIndex}`);
  },

  /**
   * Get title input by garage ID
   * @param {string} garageId - Garage ID (garageA, garageB, etc.)
   * @returns {HTMLElement|null}
   */
  getTitleInput(garageId) {
    const garage = this.getGarage(garageId);
    return garage?.querySelector('.stroke-title');
  }
};

/**
 * Show auto-save message
 * Shared utility for displaying save confirmation
 */
export function showAutoSaveMessage() {
  const message = DOM.messageElement;
  if (message) {
    message.classList.remove('is-hidden');
    // Duration is imported from constants
    import('../constants.js').then(({ TIMINGS }) => {
      setTimeout(() => {
        message.classList.add('is-hidden');
      }, TIMINGS.AUTO_SAVE_MESSAGE_DURATION);
    });
  }
}
