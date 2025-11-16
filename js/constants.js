// Application Constants
// Centralized configuration values used across the application

/**
 * Timing constants (in milliseconds)
 */
export const TIMINGS = {
  DEBOUNCE_DELAY: 500,           // Debounce delay for auto-save operations
  AUTO_SAVE_MESSAGE_DURATION: 1200, // Duration to show auto-save message
  AUTO_COLLAPSE_DELAY: 5000,     // Auto-collapse delay for mobile user info
  TOAST_DURATION: 3000           // Duration to show toast notifications
};

/**
 * Breakpoint constants (in pixels)
 */
export const BREAKPOINTS = {
  MOBILE: 768  // Mobile breakpoint for responsive design
};

/**
 * Feature flags
 */
export const FEATURES = {
  URL_CONVERSION_ENABLED: true  // Enable URL to Markdown conversion
};

/**
 * Garage configuration
 */
export const GARAGE = {
  COUNT: 4,           // Total number of garages
  STROKES_PER_GARAGE: 4  // Number of strokes per garage
};
