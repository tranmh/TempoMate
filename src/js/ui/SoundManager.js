/**
 * SoundManager - Web Audio API beep generation
 *
 * Generates tones programmatically for:
 * - Warning beep at 10 seconds remaining
 * - Short beep every second in last 5 seconds
 * - Longer beep at 0:00
 * - Byo-yomi moment end beep
 */

import { SoundConfig } from '../utils/constants.js';

export class SoundManager {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;
    /** @type {boolean} */
    this._enabled = false;
    /** @type {number|null} Last second we beeped for (to avoid double-beeping) */
    this._lastBeepSecond = null;
    /** @type {boolean} Whether the warning beep (at 10s) has been played */
    this._warningPlayed = false;
  }

  /**
   * Initialize the AudioContext (must be called from a user gesture).
   */
  init() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  /**
   * Enable or disable sound.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    if (enabled) {
      this.init();
    }
  }

  /**
   * Toggle sound on/off.
   * @returns {boolean} New enabled state
   */
  toggle() {
    this._enabled = !this._enabled;
    if (this._enabled) {
      this.init();
    }
    return this._enabled;
  }

  /**
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Check remaining time and play appropriate beeps.
   * Should be called every tick for the active player.
   * @param {number} remainingMs - Remaining time in milliseconds
   */
  checkAndBeep(remainingMs) {
    if (!this._enabled) return;

    const remainingSeconds = Math.ceil(remainingMs / 1000);

    // Warning beep at 10 seconds
    if (remainingMs <= SoundConfig.WARNING_TIME_MS && !this._warningPlayed && remainingMs > SoundConfig.COUNTDOWN_START_MS) {
      this._warningPlayed = true;
      this._playBeep(SoundConfig.BEEP_FREQUENCY, SoundConfig.BEEP_DURATION_SHORT);
      this._lastBeepSecond = remainingSeconds;
      return;
    }

    // Beep every second in last 5 seconds
    if (remainingMs <= SoundConfig.COUNTDOWN_START_MS && remainingMs > SoundConfig.FINAL_BEEP_MS) {
      if (this._lastBeepSecond !== remainingSeconds) {
        this._lastBeepSecond = remainingSeconds;
        this._playBeep(SoundConfig.BEEP_FREQUENCY, SoundConfig.BEEP_DURATION_SHORT);
      }
      return;
    }

    // Longer beep in the last second
    if (remainingMs <= SoundConfig.FINAL_BEEP_MS && remainingMs > 0) {
      if (this._lastBeepSecond !== 0) {
        this._lastBeepSecond = 0;
        this._playBeep(SoundConfig.BEEP_FREQUENCY, SoundConfig.BEEP_DURATION_LONG);
      }
    }
  }

  /**
   * Play a beep for byo-yomi moment expiry.
   */
  playMomentBeep() {
    if (!this._enabled) return;
    this._playBeep(SoundConfig.BEEP_FREQUENCY * 1.5, SoundConfig.BEEP_DURATION_LONG);
  }

  /**
   * Play a beep for period transition.
   */
  playPeriodBeep() {
    if (!this._enabled) return;
    this._playBeep(SoundConfig.BEEP_FREQUENCY, SoundConfig.BEEP_DURATION_LONG);
  }

  /**
   * Reset beep tracking state (call on turn switch or game start).
   */
  resetBeepState() {
    this._lastBeepSecond = null;
    this._warningPlayed = false;
  }

  /**
   * Play a beep tone.
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in ms
   */
  _playBeep(frequency, duration) {
    if (!this._ctx) {
      this.init();
    }
    if (!this._ctx) return;

    try {
      const oscillator = this._ctx.createOscillator();
      const gainNode = this._ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this._ctx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, this._ctx.currentTime);

      gainNode.gain.setValueAtTime(SoundConfig.BEEP_VOLUME, this._ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this._ctx.currentTime + duration / 1000);

      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };

      oscillator.start(this._ctx.currentTime);
      oscillator.stop(this._ctx.currentTime + duration / 1000);
    } catch (e) {
      // Silently fail if audio context is not available
    }
  }

  /**
   * Clean up resources.
   */
  destroy() {
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
  }
}
