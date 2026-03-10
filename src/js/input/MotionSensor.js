/**
 * MotionSensor - Tilt-based turn switching via Generic Sensor API or deviceorientation
 *
 * Prefers the Generic Sensor API (Accelerometer) when available for better precision
 * and configurable sampling frequency. Falls back to the legacy deviceorientation API
 * for browsers that don't support Generic Sensor (Safari, Firefox).
 *
 * Detects the screen orientation angle and rotates sensor axes so that left/right
 * tilt always maps to the screen's left/right, regardless of portrait or landscape.
 * Supports an additional CSS rotation offset for in-app rotation (e.g. 90° table mode)
 * that the OS screen orientation API doesn't know about.
 *
 * Uses hysteresis to prevent repeated triggers when holding at an angle.
 *
 * State machine: idle → triggered → (return to center) → idle
 */

import { MotionConfig } from '../utils/constants.js';

/**
 * Convert accelerometer axis value to tilt degrees.
 * @param {number} value - Accelerometer axis reading (m/s²)
 * @returns {number} Equivalent tilt angle in degrees
 */
function _accelToDegrees(value) {
  const clamped = Math.max(-9.81, Math.min(value, 9.81));
  return -Math.asin(clamped / 9.81) * (180 / Math.PI);
}

/**
 * Get the current screen orientation angle in degrees.
 * Uses screen.orientation.angle (modern) with window.orientation (legacy) fallback.
 * Returns 0 for portrait, 90/270 for landscape.
 * @returns {number}
 */
function _getScreenAngle() {
  if (typeof screen !== 'undefined' && screen.orientation &&
      typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  // Legacy fallback (iOS < 16.4, older browsers)
  if (typeof window !== 'undefined' && typeof window.orientation === 'number') {
    return window.orientation;
  }
  return 0;
}

/**
 * Compute screen-relative left/right tilt from device-relative beta and gamma.
 * Rotates the sensor axes by the combined screen orientation angle and any
 * additional CSS rotation offset, so that the result always represents the
 * screen's visual left/right tilt direction.
 * @param {number} beta - Device beta (front/back tilt in degrees)
 * @param {number} gamma - Device gamma (left/right tilt in degrees)
 * @param {number} [cssOffset=0] - Additional CSS rotation offset in degrees
 * @returns {number} Screen-relative left/right tilt in degrees
 */
function _screenRelativeTilt(beta, gamma, cssOffset = 0) {
  const angle = _getScreenAngle() + cssOffset;
  const rad = angle * Math.PI / 180;
  return gamma * Math.cos(rad) + beta * Math.sin(rad);
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
    this._accelRefFrame = null; // 'screen' | 'device' | null
    this._cssRotationOffset = 0; // Additional CSS rotation in degrees

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
   * Set an additional CSS rotation offset (e.g. 90 when app is CSS-rotated).
   * This is added to the OS screen orientation angle for axis rotation.
   * @param {number} degrees
   */
  setCssRotationOffset(degrees) {
    this._cssRotationOffset = degrees;
    this._triggered = null;
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
   * Process a screen-relative tilt value from either backend.
   * @param {number} tilt - Screen-relative left/right tilt in degrees
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
   * Rotates beta/gamma by the screen angle so that left/right tilt is always
   * relative to the screen, not the device's natural portrait orientation.
   * @param {DeviceOrientationEvent} event
   */
  _onDeviceOrientation(event) {
    this._processTilt(_screenRelativeTilt(event.beta || 0, event.gamma || 0, this._cssRotationOffset));
  }

  /**
   * Handle accelerometer reading events.
   * With referenceFrame 'screen', x-axis always points screen-right.
   * Falls back to manual rotation if 'screen' frame is not supported.
   */
  _onAccelReading() {
    if (!this._accelerometer) return;
    if (this._accelRefFrame === 'screen' && this._cssRotationOffset === 0) {
      // Screen reference frame already handles OS rotation; no CSS offset needed
      this._processTilt(_accelToDegrees(this._accelerometer.x));
    } else {
      // Manual rotation: combine OS screen angle + CSS rotation offset
      const angle = _getScreenAngle() + this._cssRotationOffset;
      const rad = angle * Math.PI / 180;
      const x = this._accelerometer.x;
      const y = this._accelerometer.y;
      const screenX = x * Math.cos(rad) + y * Math.sin(rad);
      this._processTilt(_accelToDegrees(screenX));
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
   * Prefers referenceFrame 'screen' (axes auto-adjust to screen orientation),
   * falls back to 'device' with manual rotation in _onAccelReading.
   * @returns {boolean} true if successfully started
   */
  _tryGenericSensor() {
    if (typeof window === 'undefined' || !('Accelerometer' in window)) return false;

    // Try 'screen' reference frame first, then fall back to default ('device')
    for (const refFrame of ['screen', 'device']) {
      try {
        const options = { frequency: MotionConfig.SENSOR_FREQUENCY };
        if (refFrame === 'screen') options.referenceFrame = 'screen';
        const accel = new Accelerometer(options);
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
        this._accelRefFrame = refFrame;
        this._sensorType = 'generic';
        return true;
      } catch (e) {
        // 'screen' not supported, try 'device'
        continue;
      }
    }
    this._accelerometer = null;
    return false;
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
