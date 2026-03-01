/**
 * TimerEngine - High-precision timer using requestAnimationFrame + performance.now()
 *
 * Provides accurate time tracking with minimal drift, handles background tab detection,
 * and calls a tick callback with elapsed delta each frame.
 */

export class TimerEngine {
  constructor() {
    /** @type {number|null} */
    this._rafId = null;
    /** @type {number} Last timestamp from performance.now() */
    this._lastTimestamp = 0;
    /** @type {boolean} */
    this._running = false;
    /** @type {Function|null} Callback: (deltaMs: number) => void */
    this._onTick = null;
    /** @type {Function|null} */
    this._onVisibilityChange = null;
    /** @type {number} Wall-clock timestamp (Date.now()) when tab became hidden */
    this._hiddenAtWallClock = 0;

    this._boundTick = this._tick.bind(this);
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);
  }

  /**
   * Set the tick callback.
   * @param {(deltaMs: number) => void} callback
   */
  setTickCallback(callback) {
    this._onTick = callback;
  }

  /**
   * Start the timer loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTimestamp = performance.now();
    this._rafId = requestAnimationFrame(this._boundTick);

    document.addEventListener('visibilitychange', this._boundVisibilityChange);
  }

  /**
   * Stop the timer loop.
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    document.removeEventListener('visibilitychange', this._boundVisibilityChange);
  }

  /**
   * Check if the timer is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._running;
  }

  /**
   * Internal tick handler called by requestAnimationFrame.
   * @param {number} timestamp - DOMHighResTimeStamp from rAF
   */
  _tick(timestamp) {
    if (!this._running) return;

    const delta = timestamp - this._lastTimestamp;
    this._lastTimestamp = timestamp;

    // Clamp delta to prevent huge jumps (e.g., after returning from background)
    // Max delta of 1 second to catch up gradually
    const clampedDelta = Math.min(delta, 1000);

    if (this._onTick && clampedDelta > 0) {
      this._onTick(clampedDelta);
    }

    this._rafId = requestAnimationFrame(this._boundTick);
  }

  /**
   * Handle visibility change to account for time when tab was hidden.
   * When tab becomes visible again, calculate actual elapsed time.
   */
  _handleVisibilityChange() {
    if (!this._running) return;

    if (document.visibilityState === 'visible') {
      // Cancel any pending rAF to prevent double-delivery of time
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }

      // Use wall-clock (Date.now) for elapsed time while hidden.
      // performance.now() can freeze on mobile browsers when the OS
      // suspends the tab, but Date.now() always reflects real time.
      const now = Date.now();
      const delta = now - this._hiddenAtWallClock;
      this._lastTimestamp = performance.now();

      if (this._onTick && delta > 0) {
        this._onTick(delta);
      }

      // Re-schedule the rAF loop
      this._rafId = requestAnimationFrame(this._boundTick);
    } else {
      // Tab becoming hidden: stop rAF entirely (browsers throttle it
      // in background tabs, and the 1s clamp in _tick would lose time)
      // and record wall-clock time for accurate delta on return.
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this._hiddenAtWallClock = Date.now();
    }
  }

  /**
   * Clean up resources.
   */
  destroy() {
    this.stop();
    this._onTick = null;
  }
}
