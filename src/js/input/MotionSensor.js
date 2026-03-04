/**
 * MotionSensor - Tilt-based turn switching via deviceorientation API
 *
 * Listens to the device's gamma axis (left/right tilt) and fires a callback
 * when the tilt exceeds a configurable threshold. Uses hysteresis to prevent
 * repeated triggers when holding at an angle.
 *
 * State machine: idle → triggered → (return to center) → idle
 */

import { MotionConfig } from '../utils/constants.js';

export class MotionSensor {
  /**
   * @param {object} options
   * @param {Function} options.onTilt - Callback fired with 'left' or 'right'
   * @param {number} [options.threshold] - Tilt angle in degrees to trigger
   */
  constructor({ onTilt, threshold = MotionConfig.DEFAULT_THRESHOLD }) {
    this._onTilt = onTilt;
    this._threshold = threshold;
    this._enabled = false;
    this._triggered = null; // null | 'left' | 'right'
    this._onDeviceOrientation = this._onDeviceOrientation.bind(this);
  }

  /**
   * Check if the deviceorientation API is available.
   * @returns {boolean}
   */
  static isSupported() {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  /**
   * Check if iOS 13+ permission request is needed.
   * @returns {boolean}
   */
  static needsPermissionRequest() {
    return typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';
  }

  /**
   * Request permission on iOS 13+.
   * Must be called from a user gesture handler.
   * @returns {Promise<boolean>} true if granted
   */
  static async requestPermission() {
    if (!MotionSensor.needsPermissionRequest()) return true;
    try {
      const result = await DeviceOrientationEvent.requestPermission();
      return result === 'granted';
    } catch (e) {
      console.warn('Motion sensor permission request failed:', e);
      return false;
    }
  }

  /**
   * Enable the motion sensor and start listening to device orientation events.
   */
  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this._triggered = null;
    window.addEventListener('deviceorientation', this._onDeviceOrientation);
  }

  /**
   * Disable the motion sensor and stop listening.
   */
  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    this._triggered = null;
    window.removeEventListener('deviceorientation', this._onDeviceOrientation);
  }

  /**
   * Update the tilt threshold.
   * @param {number} degrees
   */
  setThreshold(degrees) {
    this._threshold = Math.max(MotionConfig.MIN_THRESHOLD, Math.min(degrees, MotionConfig.MAX_THRESHOLD));
    this._triggered = null;
  }

  /**
   * Get the current threshold.
   * @returns {number}
   */
  getThreshold() {
    return this._threshold;
  }

  /**
   * Check if currently enabled.
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Handle deviceorientation events.
   * @param {DeviceOrientationEvent} event
   */
  _onDeviceOrientation(event) {
    const gamma = event.gamma; // left/right tilt in degrees (-90 to 90)
    if (gamma === null || gamma === undefined) return;

    const hysteresis = this._threshold * MotionConfig.HYSTERESIS_RATIO;

    if (this._triggered === null) {
      // Idle state — check for threshold crossing
      if (gamma <= -this._threshold) {
        this._triggered = 'left';
        this._onTilt('left');
      } else if (gamma >= this._threshold) {
        this._triggered = 'right';
        this._onTilt('right');
      }
    } else {
      // Triggered state — wait for return to center (within hysteresis band)
      if (this._triggered === 'left' && gamma > -hysteresis) {
        this._triggered = null;
      } else if (this._triggered === 'right' && gamma < hysteresis) {
        this._triggered = null;
      }
    }
  }

  /**
   * Clean up resources.
   */
  destroy() {
    this.disable();
    this._onTilt = null;
  }
}
