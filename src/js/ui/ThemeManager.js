/**
 * ThemeManager - Dark/light theme switching
 *
 * Supports:
 * - Auto detection via prefers-color-scheme
 * - Manual toggle
 * - Persistence in localStorage
 */

import { StorageManager } from '../storage/StorageManager.js';

export class ThemeManager {
  constructor() {
    /** @type {'light'|'dark'|'auto'} */
    this._preference = StorageManager.loadTheme();
    /** @type {MediaQueryList|null} */
    this._mediaQuery = null;
    /** @type {Function|null} */
    this._mediaListener = null;
  }

  /**
   * Initialize the theme manager and apply the current theme.
   */
  init() {
    // Listen for system preference changes
    if (window.matchMedia) {
      this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this._mediaListener = () => this._applyTheme();
      this._mediaQuery.addEventListener('change', this._mediaListener);
    }

    this._applyTheme();
  }

  /**
   * Get the current effective theme.
   * @returns {'light'|'dark'}
   */
  getEffectiveTheme() {
    if (this._preference === 'auto') {
      return this._mediaQuery && this._mediaQuery.matches ? 'dark' : 'light';
    }
    return this._preference;
  }

  /**
   * Get the current preference setting.
   * @returns {'light'|'dark'|'auto'}
   */
  getPreference() {
    return this._preference;
  }

  /**
   * Set theme preference.
   * @param {'light'|'dark'|'auto'} pref
   */
  setPreference(pref) {
    this._preference = pref;
    StorageManager.saveTheme(pref);
    this._applyTheme();
  }

  /**
   * Cycle through theme options: auto -> light -> dark -> auto
   */
  cycle() {
    const order = ['auto', 'light', 'dark'];
    const idx = order.indexOf(this._preference);
    const next = order[(idx + 1) % order.length];
    this.setPreference(next);
    return next;
  }

  /**
   * Apply the current theme to the document.
   */
  _applyTheme() {
    const theme = this.getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Clean up listeners.
   */
  destroy() {
    if (this._mediaQuery && this._mediaListener) {
      this._mediaQuery.removeEventListener('change', this._mediaListener);
    }
  }
}
