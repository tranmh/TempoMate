/**
 * ClockDisplay - Renders the clock face for both players
 *
 * Delegates per-side rendering to a ClockRenderer instance (digital, Garde, Insa).
 * Manages container structure, ResizeObserver, and coordinated font sizing.
 */

import { Player, FlagState, GameStatus, TimingMethodType, ClockFaceStyle } from '../utils/constants.js';
import { DigitalClockRenderer } from './renderers/DigitalClockRenderer.js';
import { GardeClockRenderer } from './renderers/GardeClockRenderer.js';
import { InsaClockRenderer } from './renderers/InsaClockRenderer.js';

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

    /** @type {import('./renderers/ClockRenderer.js').ClockRenderer} */
    this._leftRenderer = null;
    /** @type {import('./renderers/ClockRenderer.js').ClockRenderer} */
    this._rightRenderer = null;

    /** @type {string} */
    this._rendererType = ClockFaceStyle.DIGITAL;

    // Auto-size state (digital only)
    this._resizeObserver = null;
    this._leftDims = { w: 0, h: 0 };
    this._rightDims = { w: 0, h: 0 };
    this._fontSizeCache = new Map();

    // Dirty-checking cache for container-level state
    this._prev = {};

    this._build();
  }

  /**
   * Build the clock container and initial renderers.
   */
  _build() {
    this._container.innerHTML = '';
    this._container.classList.add('clock-container');

    // Create clock face containers
    this._leftClockEl = this._createClockFaceContainer('left');
    this._rightClockEl = this._createClockFaceContainer('right');

    this._container.appendChild(this._leftClockEl);
    this._container.appendChild(this._rightClockEl);

    // Create renderers and build interiors
    this._leftRenderer = this._createRenderer(this._rendererType);
    this._rightRenderer = this._createRenderer(this._rendererType);
    this._leftRenderer.build(this._leftClockEl, 'left');
    this._rightRenderer.build(this._rightClockEl, 'right');

    this._initAutoSize();
  }

  /**
   * Create a clock face container element (the outer shell).
   * @param {string} side
   * @returns {HTMLElement}
   */
  _createClockFaceContainer(side) {
    const clock = document.createElement('div');
    clock.className = `clock-face clock-${side}`;
    clock.setAttribute('data-side', side);
    clock.setAttribute('role', 'button');
    clock.setAttribute('tabindex', '0');
    clock.setAttribute('aria-label', `${side} player clock`);
    return clock;
  }

  /**
   * Create a renderer instance by style ID.
   * @param {string} styleId - ClockFaceStyle value
   * @returns {import('./renderers/ClockRenderer.js').ClockRenderer}
   */
  _createRenderer(styleId) {
    switch (styleId) {
      case ClockFaceStyle.GARDE:
        return new GardeClockRenderer();
      case ClockFaceStyle.INSA:
        return new InsaClockRenderer();
      case ClockFaceStyle.DIGITAL:
      default:
        return new DigitalClockRenderer();
    }
  }

  /**
   * Switch the clock face style. Tears down current renderers and rebuilds.
   * @param {string} styleId - ClockFaceStyle value
   */
  setClockFaceStyle(styleId) {
    if (styleId === this._rendererType) return;
    this._rendererType = styleId;

    // Destroy current renderers
    if (this._leftRenderer) this._leftRenderer.destroy();
    if (this._rightRenderer) this._rightRenderer.destroy();

    // Clear clock face interiors (keep the containers)
    this._leftClockEl.innerHTML = '';
    this._rightClockEl.innerHTML = '';

    // Reset dirty-check caches
    this._prev = {};
    this._fontSizeCache.clear();

    // Create new renderers
    this._leftRenderer = this._createRenderer(styleId);
    this._rightRenderer = this._createRenderer(styleId);
    this._leftRenderer.build(this._leftClockEl, 'left');
    this._rightRenderer.build(this._rightClockEl, 'right');

    // Toggle container class for analog vs digital styling
    const isAnalog = styleId !== ClockFaceStyle.DIGITAL;
    this._container.classList.toggle('analog-mode', isAnalog);

    // Re-sync sizing
    if (this._isDigital()) {
      requestAnimationFrame(() => this._syncFontSizes());
    } else {
      requestAnimationFrame(() => {
        this._leftRenderer.onResize(this._leftClockEl.clientWidth, this._leftClockEl.clientHeight);
        this._rightRenderer.onResize(this._rightClockEl.clientWidth, this._rightClockEl.clientHeight);
      });
    }
  }

  /**
   * @returns {boolean} Whether current renderer is digital
   */
  _isDigital() {
    return this._rendererType === ClockFaceStyle.DIGITAL;
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
      if (changed) {
        if (this._isDigital()) {
          this._syncFontSizes();
        } else {
          this._leftRenderer.onResize(this._leftDims.w, this._leftDims.h);
          this._rightRenderer.onResize(this._rightDims.w, this._rightDims.h);
        }
      }
    });

    this._resizeObserver.observe(this._leftClockEl);
    this._resizeObserver.observe(this._rightClockEl);

    requestAnimationFrame(() => {
      if (this._isDigital()) {
        this._syncFontSizes();
      }
    });
  }

  /**
   * Binary-search for the largest font-size that fits within the container.
   * @param {HTMLElement} container
   * @param {HTMLElement} textEl
   * @returns {number}
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
   * @param {HTMLElement} container
   * @param {HTMLElement} textEl
   * @param {number} size
   */
  _applyFontSize(container, textEl, size) {
    textEl.style.fontSize = size + 'px';
    const ghostEl = container.querySelector('.clock-ghost');
    if (ghostEl) ghostEl.style.fontSize = size + 'px';
  }

  /**
   * Compute optimal font sizes for both sides and apply the minimum.
   */
  _syncFontSizes() {
    if (!this._isDigital()) return;

    const leftTimeEl = this._leftRenderer.getTimeElement();
    const rightTimeEl = this._rightRenderer.getTimeElement();
    if (!leftTimeEl || !rightTimeEl) return;

    const leftSize = this._computeFitSize(this._leftClockEl, leftTimeEl);
    const rightSize = this._computeFitSize(this._rightClockEl, rightTimeEl);
    if (leftSize === 0 || rightSize === 0) return;

    const size = Math.min(leftSize, rightSize);
    this._applyFontSize(this._leftClockEl, leftTimeEl, size);
    this._applyFontSize(this._rightClockEl, rightTimeEl, size);
  }

  /**
   * Clear the font size cache.
   */
  clearFontSizeCache() {
    this._fontSizeCache.clear();
  }

  /**
   * Get the flag elements for the FlagIndicator.
   * @returns {{ left: HTMLElement, right: HTMLElement }}
   */
  getFlagElements() {
    if (this._isDigital()) {
      return {
        left: this._leftRenderer.getFlagElement(),
        right: this._rightRenderer.getFlagElement(),
      };
    }
    return { left: null, right: null };
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
   * @param {object} state - Full state from app._updateDisplay()
   */
  update(state) {
    const leftActive = state.activePlayer === Player.LEFT && state.gameStatus === GameStatus.RUNNING;
    const rightActive = state.activePlayer === Player.RIGHT && state.gameStatus === GameStatus.RUNNING;
    const leftPaused = state.gameStatus === GameStatus.PAUSED && state.activePlayer === Player.LEFT;
    const rightPaused = state.gameStatus === GameStatus.PAUSED && state.activePlayer === Player.RIGHT;
    const leftFrozen = state.gameStatus === GameStatus.FROZEN && state.leftFlagState !== FlagState.NONE;
    const rightFrozen = state.gameStatus === GameStatus.FROZEN && state.rightFlagState !== FlagState.NONE;

    const leftState = {
      timeMs: state.leftTimeMs,
      isActive: leftActive,
      isPaused: leftPaused,
      isFrozen: leftFrozen,
      color: state.leftColor,
      flagState: state.leftFlagState,
      moves: state.leftMoves,
      showMoves: state.showMoves,
      byoMoments: state.leftByoMoments,
      method: state.leftMethod,
      gameStatus: state.gameStatus,
    };

    const rightState = {
      timeMs: state.rightTimeMs,
      isActive: rightActive,
      isPaused: rightPaused,
      isFrozen: rightFrozen,
      color: state.rightColor,
      flagState: state.rightFlagState,
      moves: state.rightMoves,
      showMoves: state.showMoves,
      byoMoments: state.rightByoMoments,
      method: state.rightMethod,
      gameStatus: state.gameStatus,
    };

    const leftResult = this._leftRenderer.update(leftState);
    const rightResult = this._rightRenderer.update(rightState);

    // For digital renderers, sync font sizes if text length changed
    if (this._isDigital()) {
      const needSync = (leftResult && leftResult.needSync) || (rightResult && rightResult.needSync);
      if (needSync) this._syncFontSizes();
    }
  }

  /**
   * Clean up resources.
   */
  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._leftRenderer) this._leftRenderer.destroy();
    if (this._rightRenderer) this._rightRenderer.destroy();
  }
}
