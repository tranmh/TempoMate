/**
 * InputHandler - Touch, click, and keyboard event handling
 *
 * Handles:
 * - Tap/click on clock faces to switch turns
 * - Keyboard shortcuts
 * - Long press detection (for sound toggle, freeze toggle, etc.)
 * - Touch events with proper handling to prevent double-fires
 */

import { Keys, UIConfig } from '../utils/constants.js';

export class InputHandler {
  constructor() {
    /** @type {Map<string, Function>} Event handlers */
    this._handlers = new Map();
    /** @type {Map<string, number>} Long press timers */
    this._longPressTimers = new Map();
    /** @type {Set<string>} Currently held keys */
    this._heldKeys = new Set();
    /** @type {number} Timestamp of the last touch event (for ghost click prevention) */
    this._lastTouchTime = 0;
    /** @type {Array<Function>} Cleanup functions */
    this._cleanups = [];
  }

  /**
   * Register an event handler.
   * @param {string} event - Event name
   * @param {Function} handler
   */
  on(event, handler) {
    this._handlers.set(event, handler);
  }

  /**
   * Emit an event.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    const handler = this._handlers.get(event);
    if (handler) handler(data);
  }

  /**
   * Bind click/touch events to clock face elements.
   * @param {HTMLElement} leftEl - Left clock face
   * @param {HTMLElement} rightEl - Right clock face
   */
  bindClockFaces(leftEl, rightEl) {
    this._bindClockFace(leftEl, 'left');
    this._bindClockFace(rightEl, 'right');
  }

  /**
   * Bind events to a single clock face.
   * @param {HTMLElement} el
   * @param {string} side
   */
  _bindClockFace(el, side) {
    // Touch events
    const touchStart = (e) => {
      e.preventDefault();
      this._lastTouchTime = Date.now();
      this.emit('clockTap', side);
    };

    // Click events (for mouse/desktop)
    const click = (e) => {
      // Ignore ghost click after touch (within 500ms)
      if (this._lastTouchTime && Date.now() - this._lastTouchTime < 500) {
        return;
      }
      this.emit('clockTap', side);
    };

    // Keyboard support for role="button" elements (Enter/Space activation)
    const keyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.emit('clockTap', side);
      }
    };

    el.addEventListener('touchstart', touchStart, { passive: false });
    el.addEventListener('click', click);
    el.addEventListener('keydown', keyDown);

    this._cleanups.push(() => {
      el.removeEventListener('touchstart', touchStart);
      el.removeEventListener('click', click);
      el.removeEventListener('keydown', keyDown);
    });
  }

  /**
   * Bind keyboard events to the document.
   */
  bindKeyboard() {
    const keyDown = (e) => {
      const key = e.key;

      // Prevent default for our shortcuts (avoid page scrolling on space, etc.)
      if (Keys.SWITCH_TURN.includes(key) ||
          Keys.PAUSE.includes(key) ||
          Keys.SOUND_TOGGLE.includes(key) ||
          Keys.FREEZE_TOGGLE.includes(key) ||
          Keys.MOVE_COUNT.includes(key) ||
          Keys.RESET.includes(key) ||
          Keys.ESCAPE.includes(key) ||
          Keys.NAV_LEFT.includes(key) ||
          Keys.NAV_RIGHT.includes(key) ||
          Keys.NAV_UP.includes(key) ||
          Keys.NAV_DOWN.includes(key)) {
        e.preventDefault();
      }

      // Prevent key repeat
      if (this._heldKeys.has(key)) return;
      this._heldKeys.add(key);

      if (Keys.SWITCH_TURN.includes(key)) {
        this.emit('switchTurn');
      } else if (Keys.PAUSE.includes(key)) {
        this.emit('togglePause');
      } else if (Keys.SOUND_TOGGLE.includes(key)) {
        this.emit('toggleSound');
      } else if (Keys.FREEZE_TOGGLE.includes(key)) {
        this.emit('toggleFreeze');
      } else if (Keys.MOVE_COUNT.includes(key)) {
        this.emit('showMoves', true);
      } else if (Keys.RESET.includes(key)) {
        this.emit('reset');
      } else if (Keys.ESCAPE.includes(key)) {
        this.emit('escape');
      } else if (Keys.NAV_LEFT.includes(key)) {
        this.emit('navLeft');
      } else if (Keys.NAV_RIGHT.includes(key)) {
        this.emit('navRight');
      } else if (Keys.NAV_UP.includes(key)) {
        this.emit('navUp');
      } else if (Keys.NAV_DOWN.includes(key)) {
        this.emit('navDown');
      } else if (key >= '1' && key <= '9') {
        // Number keys for quick preset selection
        this.emit('quickPreset', parseInt(key, 10));
      } else if (key === '0') {
        this.emit('quickPreset', 10);
      }
    };

    const keyUp = (e) => {
      this._heldKeys.delete(e.key);

      if (Keys.MOVE_COUNT.includes(e.key)) {
        this.emit('showMoves', false);
      }
    };

    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);

    this._cleanups.push(() => {
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
    });
  }

  /**
   * Bind a button element with optional long press.
   * @param {HTMLElement} el
   * @param {string} tapEvent - Event to emit on tap
   * @param {string} [longPressEvent] - Event to emit on long press
   */
  bindButton(el, tapEvent, longPressEvent) {
    let longPressTimer = null;
    let longPressed = false;
    let lastTouchTime = 0;

    const start = (isTouch) => (e) => {
      e.preventDefault();
      // Prevent mouse events firing after touch events (ghost click guard)
      if (!isTouch && Date.now() - lastTouchTime < 500) return;
      if (isTouch) lastTouchTime = Date.now();

      longPressed = false;

      if (longPressEvent) {
        longPressTimer = setTimeout(() => {
          longPressed = true;
          this.emit(longPressEvent);
        }, UIConfig.LONG_PRESS_MS);
      }
    };

    const end = (isTouch) => (e) => {
      // Prevent mouse events firing after touch events
      if (!isTouch && Date.now() - lastTouchTime < 500) return;

      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (!longPressed) {
        this.emit(tapEvent);
      }
    };

    const cancel = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    el.addEventListener('touchstart', start(true), { passive: false });
    el.addEventListener('touchend', end(true));
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('mousedown', start(false));
    el.addEventListener('mouseup', end(false));
    el.addEventListener('mouseleave', cancel);

    this._cleanups.push(() => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', cancel);
      el.removeEventListener('mousedown', start);
      el.removeEventListener('mouseup', end);
      el.removeEventListener('mouseleave', cancel);
    });
  }

  /**
   * Clean up all event listeners.
   */
  destroy() {
    for (const cleanup of this._cleanups) {
      cleanup();
    }
    this._cleanups = [];
    this._handlers.clear();
    this._heldKeys.clear();
  }
}
