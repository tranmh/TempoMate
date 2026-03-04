/**
 * DigitalClockRenderer - Renders the classic LCD digital clock face.
 *
 * Extracted from ClockDisplay. Creates the per-side DOM structure:
 * header (flag + LED + color), time wrapper (ghost + time), footer (moves + byo).
 */

import { ClockRenderer } from './ClockRenderer.js';
import { formatTime } from '../../utils/TimeFormatter.js';
import { FlagState, TimingMethodType } from '../../utils/constants.js';

export class DigitalClockRenderer extends ClockRenderer {
  constructor() {
    super();
    this._side = null;
    this._container = null;
    this._timeEl = null;
    this._ghostEl = null;
    this._flagEl = null;
    this._colorEl = null;
    this._movesEl = null;
    this._byoEl = null;
    this._ledEl = null;
    this._textLen = 0;

    // Dirty-checking cache
    this._prev = {};
  }

  /**
   * Build the digital clock face DOM inside the container.
   * @param {HTMLElement} container - The .clock-face element
   * @param {string} side - 'left' or 'right'
   */
  build(container, side) {
    this._side = side;
    this._container = container;

    // Flag indicator
    const flag = document.createElement('div');
    flag.className = 'clock-flag flag-hidden';
    flag.textContent = '\u2691';

    // LED indicator
    const led = document.createElement('div');
    led.className = 'led-indicator';

    // Color indicator
    const color = document.createElement('div');
    color.className = 'clock-color';

    // Header row
    const header = document.createElement('div');
    header.className = 'clock-header';
    header.appendChild(flag);
    header.appendChild(led);
    header.appendChild(color);

    // Time wrapper (ghost + real time)
    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'time-wrapper';

    const ghost = document.createElement('div');
    ghost.className = 'clock-ghost';
    ghost.textContent = '8:88';

    const time = document.createElement('div');
    time.className = 'clock-time';
    time.textContent = '0:00';

    timeWrapper.appendChild(ghost);
    timeWrapper.appendChild(time);

    // Footer row
    const footer = document.createElement('div');
    footer.className = 'clock-footer';

    const moves = document.createElement('div');
    moves.className = 'clock-moves hidden';

    const byo = document.createElement('div');
    byo.className = 'clock-byo hidden';

    footer.appendChild(moves);
    footer.appendChild(byo);

    container.appendChild(header);
    container.appendChild(timeWrapper);
    container.appendChild(footer);

    // Store references
    this._timeEl = time;
    this._ghostEl = ghost;
    this._flagEl = flag;
    this._colorEl = color;
    this._movesEl = moves;
    this._byoEl = byo;
    this._ledEl = led;
    this._textLen = 0;
    this._prev = {};
  }

  /**
   * Update the digital display with new state.
   * @param {object} state
   * @returns {{ needSync: boolean }} Whether font re-sync is needed
   */
  update(state) {
    const p = this._prev;
    let needSync = false;

    // Time display
    const isUpcount = state.method === TimingMethodType.UPCOUNT;
    const text = formatTime(state.timeMs, !isUpcount);

    if (text !== p.text) {
      this._timeEl.textContent = text;
      p.text = text;

      if (text.length !== this._textLen) {
        this._textLen = text.length;
        this._ghostEl.textContent = this._toGhostText(text);
        needSync = true;
      }
    }

    // Active/paused/frozen CSS classes
    if (state.isActive !== p.isActive) {
      this._container.classList.toggle('active', state.isActive);
      p.isActive = state.isActive;
    }
    if (state.isPaused !== p.isPaused) {
      this._container.classList.toggle('paused', state.isPaused);
      p.isPaused = state.isPaused;
    }
    if (state.isFrozen !== p.isFrozen) {
      this._container.classList.toggle('frozen', state.isFrozen);
      p.isFrozen = state.isFrozen;
    }

    // Color indicator
    if (state.color !== p.color) {
      this._colorEl.className = `clock-color piece-${state.color}`;
      this._colorEl.setAttribute('aria-label', state.color);
      p.color = state.color;
    }

    // Flag state
    if (state.flagState !== p.flagState) {
      this._updateFlag(this._flagEl, state.flagState);
      p.flagState = state.flagState;
    }

    // Move count
    if (state.showMoves !== p.showMoves || state.moves !== p.moves) {
      if (state.showMoves) {
        this._movesEl.textContent = `Moves: ${state.moves}`;
        this._movesEl.classList.remove('hidden');
      } else {
        this._movesEl.classList.add('hidden');
      }
      p.showMoves = state.showMoves;
      p.moves = state.moves;
    }

    // Byo-yomi moments
    if (state.byoMoments !== p.byoMoments) {
      if (state.byoMoments !== undefined && state.byoMoments > 0) {
        this._byoEl.textContent = `\u00D7${state.byoMoments}`;
        this._byoEl.classList.remove('hidden');
      } else {
        this._byoEl.classList.add('hidden');
      }
      p.byoMoments = state.byoMoments;
    }

    // Expired warning
    const expired = state.timeMs <= 0 && !isUpcount;
    if (expired !== p.expired) {
      this._timeEl.classList.toggle('time-expired', expired);
      p.expired = expired;
    }

    // Low time warning
    const low = state.timeMs > 0 && state.timeMs <= 10000 && !isUpcount;
    if (low !== p.low) {
      this._timeEl.classList.toggle('time-low', low);
      p.low = low;
    }

    return { needSync };
  }

  /**
   * Get the time element (for font sizing by ClockDisplay).
   * @returns {HTMLElement}
   */
  getTimeElement() {
    return this._timeEl;
  }

  /**
   * Get the ghost element (for font sizing by ClockDisplay).
   * @returns {HTMLElement}
   */
  getGhostElement() {
    return this._ghostEl;
  }

  /**
   * Get the flag element.
   * @returns {HTMLElement}
   */
  getFlagElement() {
    return this._flagEl;
  }

  /**
   * Convert time text to ghost text (all digits become 8).
   * @param {string} timeText
   * @returns {string}
   */
  _toGhostText(timeText) {
    return timeText.replace(/\d/g, '8');
  }

  /**
   * Update a flag element's CSS classes.
   * @param {HTMLElement} el
   * @param {string} flagState
   */
  _updateFlag(el, flagState) {
    el.classList.remove('flag-blinking', 'flag-solid', 'flag-hidden');
    switch (flagState) {
      case FlagState.BLINKING:
        el.classList.add('flag-blinking');
        break;
      case FlagState.NON_BLINKING:
        el.classList.add('flag-solid');
        break;
      default:
        el.classList.add('flag-hidden');
        break;
    }
  }

  /** @override */
  destroy() {
    this._container = null;
    this._timeEl = null;
    this._ghostEl = null;
    this._flagEl = null;
    this._colorEl = null;
    this._movesEl = null;
    this._byoEl = null;
    this._ledEl = null;
    this._prev = {};
  }
}
