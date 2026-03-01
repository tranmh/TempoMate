/**
 * FlagIndicator - Flag display logic
 *
 * Manages flag icons:
 * - Blinking flag: final period expired (CSS animation)
 * - Non-blinking flag: non-final period expired (auto-hide after 5 min)
 */

import { FlagState, Limits } from '../utils/constants.js';

export class FlagIndicator {
  /**
   * @param {HTMLElement} leftFlagEl - Left player flag element
   * @param {HTMLElement} rightFlagEl - Right player flag element
   */
  constructor(leftFlagEl, rightFlagEl) {
    this._leftEl = leftFlagEl;
    this._rightEl = rightFlagEl;
  }

  /**
   * Update flag display for a player.
   * @param {string} side - 'left' or 'right'
   * @param {string} flagState - FlagState value
   * @param {number|null} flagSetTime - Timestamp when flag was set
   */
  update(side, flagState, flagSetTime) {
    const el = side === 'left' ? this._leftEl : this._rightEl;
    if (!el) return;

    // Remove all flag classes
    el.classList.remove('flag-blinking', 'flag-solid', 'flag-hidden');

    switch (flagState) {
      case FlagState.BLINKING:
        el.classList.add('flag-blinking');
        el.setAttribute('aria-label', 'Time expired - flag');
        break;

      case FlagState.NON_BLINKING:
        // Check if 5 minutes have elapsed since flag was set
        if (flagSetTime && (Date.now() - flagSetTime) > Limits.FLAG_DISPLAY_DURATION_MS) {
          el.classList.add('flag-hidden');
        } else {
          el.classList.add('flag-solid');
        }
        el.setAttribute('aria-label', 'Period expired - flag');
        break;

      case FlagState.NONE:
      default:
        el.classList.add('flag-hidden');
        el.setAttribute('aria-label', '');
        break;
    }
  }
}
