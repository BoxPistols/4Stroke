// Debounce Utility
// Delays function execution until after a specified wait time has elapsed
// since the last time the function was invoked

/**
 * Creates a debounced function that delays invoking func until after
 * wait milliseconds have elapsed since the last time it was invoked.
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} The debounced function
 *
 * @example
 * const saveData = debounce(() => {
 *   console.log('Saving data...');
 * }, 500);
 *
 * // Will only execute once after 500ms of no calls
 * saveData();
 * saveData();
 * saveData();
 */
export function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
