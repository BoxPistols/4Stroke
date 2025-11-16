// Garage ID Utilities
// Centralized functions for converting between garage ID formats
// Supports both lettered IDs (garageA-D) and numeric IDs (garage1-4)

import { GARAGE } from '../constants.js';

/**
 * Convert garage ID to numeric value (1-4)
 * Supports both lettered IDs (garageA-D) and numeric IDs (garage1-4)
 *
 * @param {string} garageId - Garage ID in any format (garageA, garage1, etc.)
 * @returns {number} Numeric garage number (1-4)
 *
 * @example
 * garageIdToNumber('garageA') // => 1
 * garageIdToNumber('garageB') // => 2
 * garageIdToNumber('garage1') // => 1
 * garageIdToNumber('garage2') // => 2
 */
export function garageIdToNumber(garageId) {
  if (!garageId) return 1;

  // Handle lettered IDs: garageA -> 1, garageB -> 2, etc.
  if (garageId.match(/^garage[A-D]$/)) {
    return garageId.charCodeAt(6) - 64; // 'A' is 65, so A=1, B=2, C=3, D=4
  }

  // Handle numeric IDs: garage1 -> 1, garage2 -> 2, etc.
  if (garageId.match(/^garage[1-4]$/)) {
    return parseInt(garageId.replace('garage', ''));
  }

  // Fallback: try to parse any number
  const num = parseInt(garageId.replace('garage', ''));
  return isNaN(num) ? 1 : Math.max(1, Math.min(GARAGE.COUNT, num));
}

/**
 * Convert numeric value to lettered garage ID (garageA-D)
 *
 * @param {number} num - Garage number (1-4)
 * @returns {string} Lettered garage ID (garageA, garageB, etc.)
 *
 * @example
 * numberToGarageId(1) // => 'garageA'
 * numberToGarageId(2) // => 'garageB'
 * numberToGarageId(3) // => 'garageC'
 * numberToGarageId(4) // => 'garageD'
 */
export function numberToGarageId(num) {
  const clampedNum = Math.max(1, Math.min(GARAGE.COUNT, num));
  return `garage${String.fromCharCode(64 + clampedNum)}`; // 1 -> A, 2 -> B, etc.
}

/**
 * Convert numeric value to numeric garage ID (garage1-4)
 *
 * @param {number} num - Garage number (1-4)
 * @returns {string} Numeric garage ID (garage1, garage2, etc.)
 *
 * @example
 * numberToNumericGarageId(1) // => 'garage1'
 * numberToNumericGarageId(2) // => 'garage2'
 */
export function numberToNumericGarageId(num) {
  const clampedNum = Math.max(1, Math.min(GARAGE.COUNT, num));
  return `garage${clampedNum}`;
}

/**
 * Normalize garage ID to numeric format (garage1-4)
 * Used for consistent storage keys in Firestore
 *
 * @param {string} garageId - Garage ID in any format
 * @returns {string} Normalized numeric garage ID (garage1, garage2, etc.)
 *
 * @example
 * normalizeGarageId('garageA') // => 'garage1'
 * normalizeGarageId('garageB') // => 'garage2'
 * normalizeGarageId('garage1') // => 'garage1'
 * normalizeGarageId('garage2') // => 'garage2'
 */
export function normalizeGarageId(garageId) {
  const num = garageIdToNumber(garageId);
  return numberToNumericGarageId(num);
}

/**
 * Check if garage ID is valid
 *
 * @param {string} garageId - Garage ID to validate
 * @returns {boolean} True if valid, false otherwise
 *
 * @example
 * isValidGarageId('garageA') // => true
 * isValidGarageId('garage1') // => true
 * isValidGarageId('garageE') // => false
 * isValidGarageId('garage5') // => false
 */
export function isValidGarageId(garageId) {
  if (!garageId || typeof garageId !== 'string') return false;

  // Check lettered format (garageA-D)
  if (garageId.match(/^garage[A-D]$/)) return true;

  // Check numeric format (garage1-4)
  if (garageId.match(/^garage[1-4]$/)) return true;

  return false;
}

/**
 * Get garage letter from garage ID
 *
 * @param {string} garageId - Garage ID in any format
 * @returns {string} Garage letter (A, B, C, or D)
 *
 * @example
 * getGarageLetter('garageA') // => 'A'
 * getGarageLetter('garage1') // => 'A'
 * getGarageLetter('garageB') // => 'B'
 * getGarageLetter('garage2') // => 'B'
 */
export function getGarageLetter(garageId) {
  const num = garageIdToNumber(garageId);
  return String.fromCharCode(64 + num); // 1 -> A, 2 -> B, etc.
}

/**
 * Calculate stroke index from note index (1-16)
 * Note index represents UI position (1-16)
 *
 * @param {number} noteIndex - Note index (1-16)
 * @returns {Object} Object with garageIndex (0-3), strokeNum (1-4), and garageNum (1-4)
 *
 * @example
 * getNotePosition(1)  // => { garageIndex: 0, strokeNum: 1, garageNum: 1 }
 * getNotePosition(5)  // => { garageIndex: 1, strokeNum: 1, garageNum: 2 }
 * getNotePosition(16) // => { garageIndex: 3, strokeNum: 4, garageNum: 4 }
 */
export function getNotePosition(noteIndex) {
  const index = noteIndex - 1; // Convert to 0-based index
  const garageIndex = Math.floor(index / GARAGE.STROKES_PER_GARAGE); // 0-3
  const strokeNum = (index % GARAGE.STROKES_PER_GARAGE) + 1; // 1-4
  const garageNum = garageIndex + 1; // 1-4

  return {
    garageIndex,
    strokeNum,
    garageNum
  };
}

/**
 * Get garage ID from note index
 *
 * @param {number} noteIndex - Note index (1-16)
 * @returns {string} Lettered garage ID (garageA-D)
 *
 * @example
 * getGarageIdFromNoteIndex(1)  // => 'garageA'
 * getGarageIdFromNoteIndex(5)  // => 'garageB'
 * getGarageIdFromNoteIndex(16) // => 'garageD'
 */
export function getGarageIdFromNoteIndex(noteIndex) {
  const { garageNum } = getNotePosition(noteIndex);
  return numberToGarageId(garageNum);
}
