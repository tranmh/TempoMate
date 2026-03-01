/**
 * RotationManager - 90° rotation for mobile flat-on-table use
 *
 * Auto-detects mobile portrait and rotates the clock UI so both
 * players can read their side when the phone is laid flat.
 * User preference is persisted and always wins over auto-detection.
 */

import { StorageManager } from '../storage/StorageManager.js';

export class RotationManager {
  constructor() {
    /** @type {boolean} */
    this._rotated = false;
    /** @type {HTMLElement|null} */
    this._appEl = null;
  }

  /**
   * Initialize rotation state and apply to the app element.
   * @param {HTMLElement} appEl - The #app element
   */
  init(appEl) {
    this._appEl = appEl;

    const saved = StorageManager.loadRotation();
    if (saved !== null) {
      this._rotated = saved;
    } else {
      // Auto-detect: rotate on mobile portrait with touch
      this._rotated = this._isMobilePortrait();
    }

    this._apply();
  }

  /**
   * Toggle rotation state.
   * @returns {boolean} New rotated state
   */
  toggle() {
    this._rotated = !this._rotated;
    StorageManager.saveRotation(this._rotated);
    this._apply();
    return this._rotated;
  }

  /**
   * @returns {boolean}
   */
  isRotated() {
    return this._rotated;
  }

  /**
   * Detect mobile portrait: narrow viewport in portrait orientation with touch.
   * @returns {boolean}
   */
  _isMobilePortrait() {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const narrow = window.matchMedia('(max-width: 600px)').matches;
    return hasTouch && portrait && narrow;
  }

  /**
   * Apply or remove the .rotated class on the app element.
   */
  _apply() {
    if (this._appEl) {
      this._appEl.classList.toggle('rotated', this._rotated);
    }
  }
}
