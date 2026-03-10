/**
 * MotionSensor - Tilt-based turn switching via Generic Sensor API or deviceorientation
 *
 * Prefers the Generic Sensor API (Accelerometer) when available for better precision
 * and configurable sampling frequency. Falls back to the legacy deviceorientation API
 * for browsers that don't support Generic Sensor (Safari, Firefox).
 *
 * Listens to the device's tilt axis (gamma in portrait, beta in landscape)
 * and fires a callback when the tilt exceeds a configurable threshold.
 * Uses hysteresis to prevent repeated triggers when holding at an angle.
 *
 * State machine: idle → triggered → (return to center) → idle
 */

import { MotionConfig } from '../utils/constants.js';

/**
 * Convert accelerometer axis value to tilt degrees.
 * @param {number} value - Accelerometer axis reading (m/s²)
 * @param {boolean} invert - Whether to invert the sign
 * @returns {number} Equivalent tilt angle in degrees
 */
function _accelToDegrees(value, invert = true) {
  const clamped = Math.max(-9.81, Math.min(value, 9.81));
  const degrees = Math.asin(clamped / 9.81) * (180 / Math.PI);
  return invert ? -degrees : degrees;
}

/**
 * Detect if the screen is in landscape orientation.
 * @returns {'landscape-primary'|'landscape-secondary'|null}
 */
function _getLandscapeType() {
  if (typeof screen !== 'undefined' && screen.orientation) {
    const type = screen.orientation.type;
    if (type === 'landscape-primary' || type === 'landscape-secondary') return type;
  }
  return null;
}

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
    this._sensorType = null; // 'generic' | 'legacy' | null
    this._accelerometer = null;

    this._onDeviceOrientation = this._onDeviceOrientation.bind(this);
    this._onAccelReading = this._onAccelReading.bind(this);
    this._onAccelError = this._onAccelError.bind(this);
  }

  /**
   * Check if any motion sensor API is available.
   * @returns {boolean}
   */
  static isSupported() {
    if (typeof window === 'undefined') return false;
    return 'Accelerometer' in window || 'DeviceOrientationEvent' in window;
  }

  /**
   * Return the sensor backend that would be used.
   * @returns {'generic'|'legacy'|null}
   */
  static getSensorType() {
    if (typeof window === 'undefined') return null;
    if ('Accelerometer' in window) return 'generic';
    if ('DeviceOrientationEvent' in window) return 'legacy';
    return null;
  }

  /**
   * Check if a permission request is needed before enabling.
   * @returns {boolean}
   */
  static needsPermissionRequest() {
    // Generic Sensor uses the Permissions API (checked at enable-time)
    // iOS 13+ requires explicit DeviceOrientationEvent.requestPermission()
    return typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function';
  }

  /**
   * Request permission for motion sensors.
   * Must be called from a user gesture handler.
   * @returns {Promise<boolean>} true if granted
   */
  static async requestPermission() {
    // Try Generic Sensor permission first
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'accelerometer' });
        if (result.state === 'granted') return true;
        if (result.state === 'denied') return false;
      } catch (e) {
        // Permission name not recognized — fall through
      }
    }

    // Try iOS DeviceOrientationEvent.requestPermission()
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        return result === 'granted';
      } catch (e) {
        console.warn('Motion sensor permission request failed:', e);
        return false;
      }
    }

    return true;
  }

  /**
   * Enable the motion sensor and start listening.
   * Tries Generic Sensor API first, falls back to deviceorientation.
   */
  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this._triggered = null;

    if (this._tryGenericSensor()) return;
    this._startLegacy();
  }

  /**
   * Disable the motion sensor and stop listening.
   */
  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    this._triggered = null;
    this._stopAccelerometer();
    window.removeEventListener('deviceorientation', this._onDeviceOrientation);
    this._sensorType = null;
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
   * Get the active sensor backend type.
   * @returns {'generic'|'legacy'|null}
   */
  getActiveSensorType() {
    return this._sensorType;
  }

  /**
   * Process a tilt value from either backend.
   * Uses gamma in portrait, beta in landscape — caller selects the correct axis.
   * @param {number} tilt - Tilt angle in degrees (negative = left, positive = right)
   */
  _processTilt(tilt) {
    if (tilt === null || tilt === undefined) return;

    const hysteresis = this._threshold * MotionConfig.HYSTERESIS_RATIO;

    if (this._triggered === null) {
      if (tilt <= -this._threshold) {
        this._triggered = 'left';
        this._onTilt('left');
      } else if (tilt >= this._threshold) {
        this._triggered = 'right';
        this._onTilt('right');
      }
    } else {
      if (this._triggered === 'left' && tilt > -hysteresis) {
        this._triggered = null;
      } else if (this._triggered === 'right' && tilt < hysteresis) {
        this._triggered = null;
      }
    }
  }

  /**
   * Handle deviceorientation events.
   * Uses gamma in portrait, beta in landscape (rocking axis changes).
   * @param {DeviceOrientationEvent} event
   */
  _onDeviceOrientation(event) {
    const landscape = _getLandscapeType();
    if (landscape) {
      // In landscape, the rocking motion maps to beta.
      // landscape-secondary (rotated 180°) inverts the direction.
      const sign = landscape === 'landscape-secondary' ? -1 : 1;
      this._processTilt(sign * event.beta);
    } else {
      this._processTilt(event.gamma);
    }
  }

  /**
   * Handle accelerometer reading events.
   * Uses x-axis in portrait (→ gamma), y-axis in landscape (→ beta).
   */
  _onAccelReading() {
    if (!this._accelerometer) return;
    const landscape = _getLandscapeType();
    if (landscape) {
      // In landscape, rocking maps to the y-axis.
      // landscape-secondary inverts direction.
      const invert = landscape === 'landscape-primary';
      this._processTilt(_accelToDegrees(this._accelerometer.y, invert));
    } else {
      this._processTilt(_accelToDegrees(this._accelerometer.x, true));
    }
  }

  /**
   * Handle accelerometer error — fall back to legacy.
   * @param {Event} event
   */
  _onAccelError(event) {
    console.warn('Accelerometer error, falling back to deviceorientation:', event.error);
    this._fallbackToLegacy();
  }

  /**
   * Try to start the Generic Sensor API (Accelerometer).
   * @returns {boolean} true if successfully started
   */
  _tryGenericSensor() {
    if (typeof window === 'undefined' || !('Accelerometer' in window)) return false;
    try {
      const accel = new Accelerometer({ frequency: MotionConfig.SENSOR_FREQUENCY });
      accel.addEventListener('reading', this._onAccelReading);
      accel.addEventListener('error', this._onAccelError);
      try {
        accel.start();
      } catch (startErr) {
        accel.removeEventListener('reading', this._onAccelReading);
        accel.removeEventListener('error', this._onAccelError);
        throw startErr;
      }
      this._accelerometer = accel;
      this._sensorType = 'generic';
      return true;
    } catch (e) {
      this._accelerometer = null;
      return false;
    }
  }

  /**
   * Start the legacy deviceorientation listener.
   */
  _startLegacy() {
    this._sensorType = 'legacy';
    window.addEventListener('deviceorientation', this._onDeviceOrientation);
  }

  /**
   * Fall back from Generic Sensor to legacy deviceorientation.
   */
  _fallbackToLegacy() {
    this._stopAccelerometer();
    if (this._enabled) {
      this._startLegacy();
    }
  }

  /**
   * Stop and clean up the accelerometer.
   */
  _stopAccelerometer() {
    if (this._accelerometer) {
      this._accelerometer.removeEventListener('reading', this._onAccelReading);
      this._accelerometer.removeEventListener('error', this._onAccelError);
      this._accelerometer.stop();
      this._accelerometer = null;
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
