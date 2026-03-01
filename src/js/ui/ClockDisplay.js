/**
 * ClockDisplay - Renders the clock face for both players
 *
 * Displays:
 * - Large time digits for each player
 * - Active/inactive player highlighting
 * - Flag indicators
 * - Color indicators (white/black piece)
 * - Move count (on demand)
 * - Byo-yomi moments remaining
 */

import { formatTime } from '../utils/TimeFormatter.js';
import { Player, FlagState, GameStatus, TimingMethodType } from '../utils/constants.js';

export class ClockDisplay {
  /**
   * @param {HTMLElement} containerEl - Main container element
   */
  constructor(containerEl) {
    this._container = containerEl;

    /** @type {HTMLElement} */
    this._leftClockEl = null;
    /** @type {HTMLElement} */
    this._rightClockEl = null;
    /** @type {HTMLElement} */
    this._leftTimeEl = null;
    /** @type {HTMLElement} */
    this._rightTimeEl = null;
    /** @type {HTMLElement} */
    this._leftFlagEl = null;
    /** @type {HTMLElement} */
    this._rightFlagEl = null;
    /** @type {HTMLElement} */
    this._leftColorEl = null;
    /** @type {HTMLElement} */
    this._rightColorEl = null;
    /** @type {HTMLElement} */
    this._leftMovesEl = null;
    /** @type {HTMLElement} */
    this._rightMovesEl = null;
    /** @type {HTMLElement} */
    this._leftByoEl = null;
    /** @type {HTMLElement} */
    this._rightByoEl = null;
    /** @type {HTMLElement} */
    this._leftGhostEl = null;
    /** @type {HTMLElement} */
    this._rightGhostEl = null;
    /** @type {HTMLElement} */
    this._leftLedEl = null;
    /** @type {HTMLElement} */
    this._rightLedEl = null;

    // Auto-size state
    this._leftTextLen = 0;
    this._rightTextLen = 0;
    this._resizeObserver = null;

    // Dirty-checking cache for update()
    this._prev = {};

    // ResizeObserver dimension tracking
    this._leftDims = { w: 0, h: 0 };
    this._rightDims = { w: 0, h: 0 };

    // Font size cache: "w,h,len" -> fontSize
    this._fontSizeCache = new Map();

    this._build();
  }

  _build() {
    this._container.innerHTML = '';
    this._container.classList.add('clock-container');

    // Left clock
    this._leftClockEl = this._createClockFace('left');
    // Right clock
    this._rightClockEl = this._createClockFace('right');

    this._container.appendChild(this._leftClockEl);
    this._container.appendChild(this._rightClockEl);

    // Store references
    this._leftTimeEl = this._leftClockEl.querySelector('.clock-time');
    this._rightTimeEl = this._rightClockEl.querySelector('.clock-time');
    this._leftFlagEl = this._leftClockEl.querySelector('.clock-flag');
    this._rightFlagEl = this._rightClockEl.querySelector('.clock-flag');
    this._leftColorEl = this._leftClockEl.querySelector('.clock-color');
    this._rightColorEl = this._rightClockEl.querySelector('.clock-color');
    this._leftMovesEl = this._leftClockEl.querySelector('.clock-moves');
    this._rightMovesEl = this._rightClockEl.querySelector('.clock-moves');
    this._leftByoEl = this._leftClockEl.querySelector('.clock-byo');
    this._rightByoEl = this._rightClockEl.querySelector('.clock-byo');
    this._leftGhostEl = this._leftClockEl.querySelector('.clock-ghost');
    this._rightGhostEl = this._rightClockEl.querySelector('.clock-ghost');
    this._leftLedEl = this._leftClockEl.querySelector('.led-indicator');
    this._rightLedEl = this._rightClockEl.querySelector('.led-indicator');

    this._initAutoSize();
  }

  /**
   * Initialize auto-sizing with ResizeObserver.
   */
  _initAutoSize() {
    this._resizeObserver = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const el = entry.target;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const dims = el === this._leftClockEl ? this._leftDims : this._rightDims;
        if (w === dims.w && h === dims.h) continue;
        dims.w = w;
        dims.h = h;
        changed = true;
      }
      if (changed) this._syncFontSizes();
    });

    this._resizeObserver.observe(this._leftClockEl);
    this._resizeObserver.observe(this._rightClockEl);

    // Initial fit after layout
    requestAnimationFrame(() => {
      this._syncFontSizes();
    });
  }

  /**
   * Binary-search for the largest font-size that fits within the container.
   * Returns the computed size without applying it.
   * @param {HTMLElement} container - The clock face element
   * @param {HTMLElement} textEl - The time text element
   * @returns {number} The computed font size in px, or 0 if container has no size
   */
  _computeFitSize(container, textEl) {
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW === 0 || containerH === 0) return 0;

    const textLen = textEl.textContent.length;
    const cacheKey = `${containerW},${containerH},${textLen}`;
    const cached = this._fontSizeCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const maxW = containerW * 0.9;
    const maxH = containerH * 0.5;

    let lo = 16;
    let hi = 500;

    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      textEl.style.fontSize = mid + 'px';
      if (textEl.scrollWidth <= maxW && textEl.scrollHeight <= maxH) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    this._fontSizeCache.set(cacheKey, lo);
    return lo;
  }

  /**
   * Apply a font size to a clock face's time and ghost elements.
   * @param {HTMLElement} container - The clock face element
   * @param {HTMLElement} textEl - The time text element
   * @param {number} size - Font size in px
   */
  _applyFontSize(container, textEl, size) {
    textEl.style.fontSize = size + 'px';
    const ghostEl = container.querySelector('.clock-ghost');
    if (ghostEl) ghostEl.style.fontSize = size + 'px';
  }

  /**
   * Compute optimal font sizes for both sides and apply the minimum
   * so both clocks always display at the same size.
   */
  _syncFontSizes() {
    const leftSize = this._computeFitSize(this._leftClockEl, this._leftTimeEl);
    const rightSize = this._computeFitSize(this._rightClockEl, this._rightTimeEl);
    if (leftSize === 0 || rightSize === 0) return;

    const size = Math.min(leftSize, rightSize);
    this._applyFontSize(this._leftClockEl, this._leftTimeEl, size);
    this._applyFontSize(this._rightClockEl, this._rightTimeEl, size);
  }

  /**
   * Clear the font size cache so sizes recompute on next sync.
   */
  clearFontSizeCache() {
    this._fontSizeCache.clear();
  }

  /**
   * Create a single clock face element.
   * @param {string} side
   * @returns {HTMLElement}
   */
  _createClockFace(side) {
    const clock = document.createElement('div');
    clock.className = `clock-face clock-${side}`;
    clock.setAttribute('data-side', side);
    clock.setAttribute('role', 'button');
    clock.setAttribute('tabindex', '0');
    clock.setAttribute('aria-label', `${side} player clock`);

    // Flag indicator
    const flag = document.createElement('div');
    flag.className = 'clock-flag flag-hidden';
    flag.textContent = '\u2691'; // Flag

    // LED indicator
    const led = document.createElement('div');
    led.className = 'led-indicator';

    // Color indicator
    const color = document.createElement('div');
    color.className = 'clock-color';

    // Header row (flag + LED + color)
    const header = document.createElement('div');
    header.className = 'clock-header';
    header.appendChild(flag);
    header.appendChild(led);
    header.appendChild(color);

    // Time wrapper (holds ghost + real time)
    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'time-wrapper';

    // Ghost segments (unlit LCD segments behind real digits)
    const ghost = document.createElement('div');
    ghost.className = 'clock-ghost';
    ghost.textContent = '8:88';

    // Time display
    const time = document.createElement('div');
    time.className = 'clock-time';
    time.textContent = '0:00';

    timeWrapper.appendChild(ghost);
    timeWrapper.appendChild(time);

    // Footer row (moves + byo)
    const footer = document.createElement('div');
    footer.className = 'clock-footer';

    const moves = document.createElement('div');
    moves.className = 'clock-moves hidden';

    const byo = document.createElement('div');
    byo.className = 'clock-byo hidden';

    footer.appendChild(moves);
    footer.appendChild(byo);

    clock.appendChild(header);
    clock.appendChild(timeWrapper);
    clock.appendChild(footer);

    return clock;
  }

  /**
   * Get the flag elements for the FlagIndicator.
   * @returns {{ left: HTMLElement, right: HTMLElement }}
   */
  getFlagElements() {
    return {
      left: this._leftFlagEl,
      right: this._rightFlagEl,
    };
  }

  /**
   * Get clock face elements (for click/touch binding).
   * @returns {{ left: HTMLElement, right: HTMLElement }}
   */
  getClockFaces() {
    return {
      left: this._leftClockEl,
      right: this._rightClockEl,
    };
  }

  /**
   * Update the display for both players.
   * @param {object} state
   * @param {number} state.leftTimeMs
   * @param {number} state.rightTimeMs
   * @param {string} state.activePlayer - Player.LEFT, Player.RIGHT, or null
   * @param {string} state.gameStatus
   * @param {string} state.leftColor - 'white' or 'black'
   * @param {string} state.rightColor - 'white' or 'black'
   * @param {string} state.leftFlagState
   * @param {string} state.rightFlagState
   * @param {number} state.leftMoves
   * @param {number} state.rightMoves
   * @param {boolean} state.showMoves
   * @param {number} [state.leftByoMoments]
   * @param {number} [state.rightByoMoments]
   * @param {string} [state.leftMethod]
   * @param {string} [state.rightMethod]
   */
  update(state) {
    const p = this._prev;

    // Time display
    const leftIsUpcount = state.leftMethod === TimingMethodType.UPCOUNT;
    const rightIsUpcount = state.rightMethod === TimingMethodType.UPCOUNT;

    const leftText = formatTime(state.leftTimeMs, !leftIsUpcount);
    const rightText = formatTime(state.rightTimeMs, !rightIsUpcount);

    let needSync = false;

    if (leftText !== p.leftText) {
      this._leftTimeEl.textContent = leftText;
      p.leftText = leftText;

      // Re-fit text if length changed (e.g. "5:00" -> "4:59:59")
      if (leftText.length !== this._leftTextLen) {
        this._leftTextLen = leftText.length;
        this._leftGhostEl.textContent = this._toGhostText(leftText);
        needSync = true;
      }
    }

    if (rightText !== p.rightText) {
      this._rightTimeEl.textContent = rightText;
      p.rightText = rightText;

      if (rightText.length !== this._rightTextLen) {
        this._rightTextLen = rightText.length;
        this._rightGhostEl.textContent = this._toGhostText(rightText);
        needSync = true;
      }
    }

    if (needSync) this._syncFontSizes();

    // Active player highlighting
    const leftActive = state.activePlayer === Player.LEFT && state.gameStatus === GameStatus.RUNNING;
    const rightActive = state.activePlayer === Player.RIGHT && state.gameStatus === GameStatus.RUNNING;
    const leftPaused = state.gameStatus === GameStatus.PAUSED && state.activePlayer === Player.LEFT;
    const rightPaused = state.gameStatus === GameStatus.PAUSED && state.activePlayer === Player.RIGHT;

    if (leftActive !== p.leftActive) {
      this._leftClockEl.classList.toggle('active', leftActive);
      p.leftActive = leftActive;
    }
    if (rightActive !== p.rightActive) {
      this._rightClockEl.classList.toggle('active', rightActive);
      p.rightActive = rightActive;
    }
    if (leftPaused !== p.leftPaused) {
      this._leftClockEl.classList.toggle('paused', leftPaused);
      p.leftPaused = leftPaused;
    }
    if (rightPaused !== p.rightPaused) {
      this._rightClockEl.classList.toggle('paused', rightPaused);
      p.rightPaused = rightPaused;
    }

    // Color indicators
    if (state.leftColor !== p.leftColor) {
      this._leftColorEl.className = `clock-color piece-${state.leftColor}`;
      this._leftColorEl.setAttribute('aria-label', state.leftColor);
      p.leftColor = state.leftColor;
    }
    if (state.rightColor !== p.rightColor) {
      this._rightColorEl.className = `clock-color piece-${state.rightColor}`;
      this._rightColorEl.setAttribute('aria-label', state.rightColor);
      p.rightColor = state.rightColor;
    }

    // Flag states
    if (state.leftFlagState !== p.leftFlagState) {
      this._updateFlag(this._leftFlagEl, state.leftFlagState);
      p.leftFlagState = state.leftFlagState;
    }
    if (state.rightFlagState !== p.rightFlagState) {
      this._updateFlag(this._rightFlagEl, state.rightFlagState);
      p.rightFlagState = state.rightFlagState;
    }

    // Move count
    if (state.showMoves !== p.showMoves || state.leftMoves !== p.leftMoves || state.rightMoves !== p.rightMoves) {
      if (state.showMoves) {
        this._leftMovesEl.textContent = `Moves: ${state.leftMoves}`;
        this._leftMovesEl.classList.remove('hidden');
        this._rightMovesEl.textContent = `Moves: ${state.rightMoves}`;
        this._rightMovesEl.classList.remove('hidden');
      } else {
        this._leftMovesEl.classList.add('hidden');
        this._rightMovesEl.classList.add('hidden');
      }
      p.showMoves = state.showMoves;
      p.leftMoves = state.leftMoves;
      p.rightMoves = state.rightMoves;
    }

    // Byo-yomi moments
    if (state.leftByoMoments !== p.leftByoMoments) {
      if (state.leftByoMoments !== undefined && state.leftByoMoments > 0) {
        this._leftByoEl.textContent = `\u00D7${state.leftByoMoments}`;
        this._leftByoEl.classList.remove('hidden');
      } else {
        this._leftByoEl.classList.add('hidden');
      }
      p.leftByoMoments = state.leftByoMoments;
    }

    if (state.rightByoMoments !== p.rightByoMoments) {
      if (state.rightByoMoments !== undefined && state.rightByoMoments > 0) {
        this._rightByoEl.textContent = `\u00D7${state.rightByoMoments}`;
        this._rightByoEl.classList.remove('hidden');
      } else {
        this._rightByoEl.classList.add('hidden');
      }
      p.rightByoMoments = state.rightByoMoments;
    }

    // Frozen state - only mark the flagged player's clock as frozen
    const leftFrozen = state.gameStatus === GameStatus.FROZEN && state.leftFlagState !== FlagState.NONE;
    const rightFrozen = state.gameStatus === GameStatus.FROZEN && state.rightFlagState !== FlagState.NONE;
    if (leftFrozen !== p.leftFrozen) {
      this._leftClockEl.classList.toggle('frozen', leftFrozen);
      p.leftFrozen = leftFrozen;
    }
    if (rightFrozen !== p.rightFrozen) {
      this._rightClockEl.classList.toggle('frozen', rightFrozen);
      p.rightFrozen = rightFrozen;
    }

    // Expired warning (red time)
    const leftExpired = state.leftTimeMs <= 0 && !leftIsUpcount;
    const rightExpired = state.rightTimeMs <= 0 && !rightIsUpcount;
    if (leftExpired !== p.leftExpired) {
      this._leftTimeEl.classList.toggle('time-expired', leftExpired);
      p.leftExpired = leftExpired;
    }
    if (rightExpired !== p.rightExpired) {
      this._rightTimeEl.classList.toggle('time-expired', rightExpired);
      p.rightExpired = rightExpired;
    }

    // Low time warning
    const leftLow = state.leftTimeMs > 0 && state.leftTimeMs <= 10000 && !leftIsUpcount;
    const rightLow = state.rightTimeMs > 0 && state.rightTimeMs <= 10000 && !rightIsUpcount;
    if (leftLow !== p.leftLow) {
      this._leftTimeEl.classList.toggle('time-low', leftLow);
      p.leftLow = leftLow;
    }
    if (rightLow !== p.rightLow) {
      this._rightTimeEl.classList.toggle('time-low', rightLow);
      p.rightLow = rightLow;
    }
  }

  /**
   * Convert a time string to ghost text (all digits become 8).
   * e.g. "5:23" -> "8:88", "1:05:23" -> "8:88:88", "3:45.2" -> "8:88.8"
   * @param {string} timeText
   * @returns {string}
   */
  _toGhostText(timeText) {
    return timeText.replace(/\d/g, '8');
  }

  /**
   * Update a single flag element.
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
}
