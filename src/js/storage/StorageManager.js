/**
 * StorageManager - localStorage persistence for custom options and preferences
 *
 * Saves/loads:
 * - Custom options (26-30)
 * - Last selected option number
 * - Theme preference
 * - Sound enabled state
 */

import { StorageKeys, Limits, TimingMethodType, ClockFont } from '../utils/constants.js';

export class StorageManager {
  /**
   * Save custom options to localStorage.
   * @param {Array<object|null>} options - Array of 5 custom option configs (index 0 = option 26)
   */
  static saveCustomOptions(options) {
    try {
      localStorage.setItem(StorageKeys.CUSTOM_OPTIONS, JSON.stringify(options));
    } catch (e) {
      console.warn('Failed to save custom options:', e);
    }
  }

  /**
   * Load custom options from localStorage.
   * @returns {Array<object|null>} Array of 5 custom option configs
   */
  static loadCustomOptions() {
    try {
      const data = localStorage.getItem(StorageKeys.CUSTOM_OPTIONS);
      if (data) {
        const parsed = JSON.parse(data);
        // Validate: must be an array
        if (!Array.isArray(parsed)) {
          console.warn('Custom options data is not an array, resetting');
          return [null, null, null, null, null];
        }
        // Normalize to exactly MAX_MANUAL_OPTIONS length
        while (parsed.length < Limits.MAX_MANUAL_OPTIONS) parsed.push(null);
        if (parsed.length > Limits.MAX_MANUAL_OPTIONS) parsed.length = Limits.MAX_MANUAL_OPTIONS;
        // Validate each entry has periods array if not null
        for (let i = 0; i < parsed.length; i++) {
          if (parsed[i] !== null && (!parsed[i].periods || !Array.isArray(parsed[i].periods) || parsed[i].periods.length === 0)) {
            console.warn(`Custom option slot ${i} is invalid, clearing`);
            parsed[i] = null;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load custom options:', e);
    }
    return [null, null, null, null, null];
  }

  /**
   * Save a single custom option.
   * @param {number} slot - Slot number (0-4, corresponding to options 26-30)
   * @param {object} config - Option configuration
   */
  static saveCustomOption(slot, config) {
    if (slot < 0 || slot >= Limits.MAX_MANUAL_OPTIONS) return;
    const options = StorageManager.loadCustomOptions();
    options[slot] = config;
    StorageManager.saveCustomOptions(options);
  }

  /**
   * Load a single custom option.
   * @param {number} slot - Slot number (0-4)
   * @returns {object|null}
   */
  static loadCustomOption(slot) {
    if (slot < 0 || slot >= Limits.MAX_MANUAL_OPTIONS) return null;
    const options = StorageManager.loadCustomOptions();
    return options[slot] || null;
  }

  /**
   * Save the last selected option number.
   * @param {number} optionNumber
   */
  static saveLastOption(optionNumber) {
    try {
      localStorage.setItem(StorageKeys.LAST_OPTION, String(optionNumber));
    } catch (e) {
      console.warn('Failed to save last option:', e);
    }
  }

  /**
   * Load the last selected option number.
   * @returns {number} Option number (defaults to 1)
   */
  static loadLastOption() {
    try {
      const val = localStorage.getItem(StorageKeys.LAST_OPTION);
      if (val) {
        const num = parseInt(val, 10);
        if (num >= 1 && num <= Limits.MANUAL_OPTION_END) return num;
      }
    } catch (e) {
      console.warn('Failed to load last option:', e);
    }
    return 1;
  }

  /**
   * Save theme preference.
   * @param {'light'|'dark'|'auto'} theme
   */
  static saveTheme(theme) {
    try {
      localStorage.setItem(StorageKeys.THEME, theme);
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  }

  /**
   * Load theme preference.
   * @returns {'light'|'dark'|'auto'}
   */
  static loadTheme() {
    try {
      const val = localStorage.getItem(StorageKeys.THEME);
      if (val === 'light' || val === 'dark' || val === 'auto') return val;
    } catch (e) {
      console.warn('Failed to load theme:', e);
    }
    return 'auto';
  }

  /**
   * Save sound enabled state.
   * @param {boolean} enabled
   */
  static saveSoundEnabled(enabled) {
    try {
      localStorage.setItem(StorageKeys.SOUND_ENABLED, String(enabled));
    } catch (e) {
      console.warn('Failed to save sound state:', e);
    }
  }

  /**
   * Load sound enabled state.
   * @returns {boolean|null} null means use preset default
   */
  static loadSoundEnabled() {
    try {
      const val = localStorage.getItem(StorageKeys.SOUND_ENABLED);
      if (val === 'true') return true;
      if (val === 'false') return false;
    } catch (e) {
      console.warn('Failed to load sound state:', e);
    }
    return null;
  }

  /**
   * Save clock font preference.
   * @param {string} fontId
   */
  static saveFont(fontId) {
    try {
      localStorage.setItem(StorageKeys.FONT, fontId);
    } catch (e) {
      console.warn('Failed to save font:', e);
    }
  }

  /**
   * Load clock font preference.
   * @returns {string}
   */
  static loadFont() {
    try {
      const val = localStorage.getItem(StorageKeys.FONT);
      if (val && Object.values(ClockFont).includes(val)) return val;
    } catch (e) {
      console.warn('Failed to load font:', e);
    }
    return ClockFont.DSEG7_CLASSIC;
  }

  /**
   * Save rotation preference.
   * @param {boolean} rotated
   */
  static saveRotation(rotated) {
    try {
      localStorage.setItem(StorageKeys.ROTATION, String(rotated));
    } catch (e) {
      console.warn('Failed to save rotation:', e);
    }
  }

  /**
   * Load rotation preference.
   * @returns {boolean|null} null means no preference yet
   */
  static loadRotation() {
    try {
      const val = localStorage.getItem(StorageKeys.ROTATION);
      if (val === 'true') return true;
      if (val === 'false') return false;
    } catch (e) {
      console.warn('Failed to load rotation:', e);
    }
    return null;
  }

  /**
   * Create a default custom option config.
   * @returns {object}
   */
  static createDefaultCustomOption() {
    return {
      name: 'Custom',
      description: 'Custom time control',
      periods: [{ method: TimingMethodType.TIME, timeMs: 300000 }], // 5 minutes
      freezeDefault: false,
      soundDefault: false,
    };
  }

  /**
   * Clear all stored data.
   */
  static clearAll() {
    try {
      Object.values(StorageKeys).forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  }
}
