/**
 * WakeLockManager - Prevents the screen from sleeping.
 *
 * Multi-layered strategy:
 *   1. Native Screen Wake Lock API (modern browsers)
 *   2. Video element in DOM (keeps media subsystem active)
 *   3. Silent audio via Web Audio API (keeps audio subsystem active)
 *
 * All three strategies are initiated synchronously from enable() to
 * preserve the user gesture context (required by Safari/iOS).
 */

import { NoSleep } from '../vendor/NoSleep.js';

const hasNativeWakeLock = () =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator;

export class WakeLockManager {
  constructor() {
    this._nativeLock = null;
    this._noSleep = null;
    this._audioCtx = null;
    this._audioSrc = null;
    this._visibilityHandler = null;
    this._enabled = false;
  }

  /**
   * Request wake lock using all available strategies.
   * Must be called from a user gesture handler.
   *
   * Fully synchronous — no async/await — so all three strategies
   * fire in the same call stack and the gesture token is preserved.
   */
  enable() {
    if (this._enabled) return;
    this._enabled = true;

    // Fire-and-forget: initiate native lock without awaiting
    this._requestNativeLock();

    // Activate fallbacks — native lock can be released at any time
    this._enableNoSleep();
    this._enableSilentAudio();

    if (!this._visibilityHandler) {
      this._visibilityHandler = () => {
        if (document.visibilityState === 'visible' && this._enabled) {
          this._reacquire();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
  }

  /**
   * Release wake lock and stop all fallbacks.
   */
  disable() {
    this._enabled = false;

    if (this._nativeLock) {
      this._nativeLock.release();
      this._nativeLock = null;
    }

    this._disableNoSleep();
    this._disableSilentAudio();
  }

  /**
   * Full teardown — release lock and remove the visibility listener.
   */
  destroy() {
    this.disable();
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }

  /**
   * Re-acquire after tab becomes visible again.
   * Conservative: only re-request native lock and resume existing resources.
   */
  _reacquire() {
    if (!this._enabled) return;

    this._requestNativeLock();

    // Resume existing NoSleep video if it was paused
    if (this._noSleep && !this._noSleep.isEnabled) {
      try {
        this._noSleep.enable().catch(() => {});
      } catch (e) {
        // NoSleep resume failed
      }
    }

    // Resume existing audio context if suspended
    if (this._audioCtx && this._audioCtx.state === 'suspended') {
      this._audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Fire-and-forget native wake lock request.
   * Guards against double requests.
   */
  _requestNativeLock() {
    if (this._nativeLock) return;
    if (!hasNativeWakeLock()) return;

    navigator.wakeLock.request('screen').then((lock) => {
      this._nativeLock = lock;
      lock.addEventListener('release', () => {
        this._nativeLock = null;
        // Auto-re-acquire if still enabled
        if (this._enabled && document.visibilityState === 'visible') {
          this._requestNativeLock();
        }
      });
    }).catch(() => {
      this._nativeLock = null;
    });
  }

  _enableNoSleep() {
    if (!this._noSleep) {
      this._noSleep = new NoSleep();

      // Safari ignores detached video elements for power management.
      // Append to DOM (hidden) so the browser treats it as active media.
      const vid = this._noSleep.noSleepVideo;
      vid.style.position = 'fixed';
      vid.style.top = '0';
      vid.style.left = '0';
      vid.style.width = '1px';
      vid.style.height = '1px';
      vid.style.opacity = '0.01';
      vid.style.pointerEvents = 'none';
      vid.style.zIndex = '-1';
      document.body.appendChild(vid);
    }
    try {
      this._noSleep.enable().catch(() => {});
    } catch (e) {
      // NoSleep enable failed
    }
  }

  _disableNoSleep() {
    if (this._noSleep) {
      this._noSleep.disable();
      const vid = this._noSleep.noSleepVideo;
      if (vid.parentNode) vid.parentNode.removeChild(vid);
      this._noSleep = null;
    }
  }

  /**
   * Play a near-silent tone via Web Audio API.
   * Many browsers keep the screen awake while audio is actively playing.
   */
  _enableSilentAudio() {
    if (this._audioSrc) return; // already running
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }

      const oscillator = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();

      // Inaudible but technically "playing audio"
      gain.gain.value = 0.001;
      oscillator.frequency.value = 1; // 1 Hz — below human hearing
      oscillator.connect(gain);
      gain.connect(this._audioCtx.destination);
      oscillator.start();

      this._audioSrc = { oscillator, gain };
    } catch (e) {
      // Web Audio not available
    }
  }

  _disableSilentAudio() {
    if (this._audioSrc) {
      try {
        this._audioSrc.oscillator.stop();
        this._audioSrc.oscillator.disconnect();
        this._audioSrc.gain.disconnect();
      } catch (e) {
        // Already stopped
      }
      this._audioSrc = null;
    }
    if (this._audioCtx) {
      this._audioCtx.close();
      this._audioCtx = null;
    }
  }
}
