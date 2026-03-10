import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MotionSensor } from '../../src/js/input/MotionSensor.js';
import { MotionConfig } from '../../src/js/utils/constants.js';

/**
 * Helper: dispatch a mock deviceorientation event.
 * @param {number} gamma - Tilt angle in degrees
 * @param {number} [beta] - Forward/backward tilt in degrees
 */
function fireOrientation(gamma, beta = 0) {
  const event = new Event('deviceorientation');
  event.gamma = gamma;
  event.beta = beta;
  window.dispatchEvent(event);
}

/**
 * Helper: set up mock screen.orientation for landscape tests.
 * @param {'landscape-primary'|'landscape-secondary'|'portrait-primary'} type
 * @returns {Function} cleanup function to restore original
 */
function mockScreenOrientation(type) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'screen');
  Object.defineProperty(globalThis, 'screen', {
    value: { orientation: { type } },
    configurable: true,
  });
  return () => {
    if (original) {
      Object.defineProperty(globalThis, 'screen', original);
    } else {
      delete globalThis.screen;
    }
  };
}

/**
 * Mock Accelerometer class for Generic Sensor API tests.
 */
class MockAccelerometer {
  constructor(options = {}) {
    this.frequency = options.frequency || 60;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this._listeners = {};
    this._started = false;
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(h => h !== handler);
  }

  start() {
    this._started = true;
  }

  stop() {
    this._started = false;
  }

  _fireReading() {
    if (this._listeners.reading) {
      this._listeners.reading.forEach(h => h());
    }
  }

  _fireError(error) {
    if (this._listeners.error) {
      this._listeners.error.forEach(h => h({ error }));
    }
  }
}

describe('MotionSensor', () => {
  let sensor;
  let tiltCallback;
  let originalDOE;

  beforeEach(() => {
    tiltCallback = jest.fn();
    // jsdom doesn't define DeviceOrientationEvent — provide a mock on window
    originalDOE = window.DeviceOrientationEvent;
    if (!window.DeviceOrientationEvent) {
      window.DeviceOrientationEvent = class DeviceOrientationEvent extends Event {
        constructor(type, init = {}) {
          super(type, init);
          this.gamma = init.gamma ?? null;
        }
      };
    }
  });

  afterEach(() => {
    if (sensor) {
      sensor.destroy();
      sensor = null;
    }
    // Restore original
    if (originalDOE === undefined) {
      delete window.DeviceOrientationEvent;
    } else {
      window.DeviceOrientationEvent = originalDOE;
    }
    // Clean up any Accelerometer mock
    delete window.Accelerometer;
  });

  describe('isSupported()', () => {
    it('returns true when DeviceOrientationEvent exists', () => {
      expect(MotionSensor.isSupported()).toBe(true);
    });

    it('returns true when Accelerometer exists', () => {
      window.Accelerometer = MockAccelerometer;
      expect(MotionSensor.isSupported()).toBe(true);
    });
  });

  describe('getSensorType()', () => {
    it('returns "legacy" when only DeviceOrientationEvent exists', () => {
      expect(MotionSensor.getSensorType()).toBe('legacy');
    });

    it('returns "generic" when Accelerometer exists', () => {
      window.Accelerometer = MockAccelerometer;
      expect(MotionSensor.getSensorType()).toBe('generic');
    });
  });

  describe('enable/disable lifecycle (legacy)', () => {
    it('starts disabled', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      expect(sensor.isEnabled()).toBe(false);
    });

    it('enable() starts listening', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      expect(sensor.isEnabled()).toBe(true);

      fireOrientation(-15);
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('disable() stops listening', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      sensor.disable();
      expect(sensor.isEnabled()).toBe(false);

      fireOrientation(-15);
      expect(tiltCallback).not.toHaveBeenCalled();
    });

    it('enable() is idempotent', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      const spy = jest.spyOn(window, 'addEventListener');
      sensor.enable();
      sensor.enable();
      // Should only add the listener once
      const calls = spy.mock.calls.filter(([ev]) => ev === 'deviceorientation');
      expect(calls.length).toBe(1);
      spy.mockRestore();
    });

    it('disable() is idempotent', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      // Calling disable when already disabled should not throw
      sensor.disable();
      sensor.disable();
      expect(sensor.isEnabled()).toBe(false);
    });

    it('uses legacy backend when no Accelerometer', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      expect(sensor.getActiveSensorType()).toBe('legacy');
    });
  });

  describe('tilt detection (legacy)', () => {
    it('fires left on negative gamma past threshold', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      fireOrientation(-10);
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('fires right on positive gamma past threshold', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      fireOrientation(10);
      expect(tiltCallback).toHaveBeenCalledWith('right');
    });

    it('does not fire within threshold', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      fireOrientation(-9);
      fireOrientation(9);
      fireOrientation(0);
      expect(tiltCallback).not.toHaveBeenCalled();
    });

    it('ignores null gamma', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();

      const event = new Event('deviceorientation');
      event.gamma = null;
      window.dispatchEvent(event);

      expect(tiltCallback).not.toHaveBeenCalled();
    });
  });

  describe('hysteresis (legacy)', () => {
    it('does not re-trigger until device returns to center', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Trigger left
      fireOrientation(-15);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Still tilted left — should not fire again
      fireOrientation(-20);
      fireOrientation(-12);
      expect(tiltCallback).toHaveBeenCalledTimes(1);
    });

    it('re-triggers after returning within hysteresis band', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Trigger left
      fireOrientation(-15);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Return to center (within hysteresis = 5°)
      fireOrientation(-4);
      // Now tilt left again
      fireOrientation(-15);
      expect(tiltCallback).toHaveBeenCalledTimes(2);
    });

    it('hysteresis band is threshold * HYSTERESIS_RATIO', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 20 });
      sensor.enable();

      // Trigger right at 20°
      fireOrientation(25);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Hysteresis = 20 * 0.5 = 10°; at 11° still outside band
      fireOrientation(11);
      fireOrientation(25);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // At 9° inside band — reset
      fireOrientation(9);
      fireOrientation(25);
      expect(tiltCallback).toHaveBeenCalledTimes(2);
    });

    it('allows switching direction after return to center', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Trigger left
      fireOrientation(-15);
      expect(tiltCallback).toHaveBeenCalledWith('left');

      // Return to center
      fireOrientation(0);

      // Trigger right
      fireOrientation(15);
      expect(tiltCallback).toHaveBeenCalledWith('right');
      expect(tiltCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('threshold configuration', () => {
    it('uses default threshold from MotionConfig', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      expect(sensor.getThreshold()).toBe(MotionConfig.DEFAULT_THRESHOLD);
    });

    it('setThreshold() updates the threshold', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.setThreshold(25);
      expect(sensor.getThreshold()).toBe(25);
    });

    it('clamps threshold to MIN_THRESHOLD', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.setThreshold(1);
      expect(sensor.getThreshold()).toBe(MotionConfig.MIN_THRESHOLD);
    });

    it('clamps threshold to MAX_THRESHOLD', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.setThreshold(100);
      expect(sensor.getThreshold()).toBe(MotionConfig.MAX_THRESHOLD);
    });

    it('runtime threshold change affects detection', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // At 15° triggers with threshold 10
      fireOrientation(15);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Return to center
      fireOrientation(0);

      // Raise threshold to 20
      sensor.setThreshold(20);

      // 15° no longer triggers
      fireOrientation(15);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // But 25° does
      fireOrientation(25);
      expect(tiltCallback).toHaveBeenCalledTimes(2);
    });

    it('setThreshold() resets triggered state to prevent stale hysteresis', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Trigger left at -15° (past threshold of 10)
      fireOrientation(-15);
      expect(tiltCallback).toHaveBeenCalledTimes(1);
      expect(tiltCallback).toHaveBeenCalledWith('left');

      // Device stays tilted at -12°; lower threshold to 5 (hysteresis = 2.5)
      // -12° is well past new threshold of 5, sensor should not be stuck
      sensor.setThreshold(5);

      // Device moves to -7° — past the new threshold, and should be able
      // to trigger again since setThreshold() should have reset state
      fireOrientation(-7);
      expect(tiltCallback).toHaveBeenCalledTimes(2);
      expect(tiltCallback).toHaveBeenLastCalledWith('left');
    });
  });

  describe('landscape orientation (legacy)', () => {
    let restoreScreen;

    afterEach(() => {
      if (restoreScreen) {
        restoreScreen();
        restoreScreen = null;
      }
    });

    it('uses beta axis in landscape-primary', () => {
      restoreScreen = mockScreenOrientation('landscape-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Beta -15 in landscape-primary → left tilt
      fireOrientation(0, -15);
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('uses beta axis for right tilt in landscape-primary', () => {
      restoreScreen = mockScreenOrientation('landscape-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      fireOrientation(0, 15);
      expect(tiltCallback).toHaveBeenCalledWith('right');
    });

    it('inverts beta in landscape-secondary', () => {
      restoreScreen = mockScreenOrientation('landscape-secondary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Beta +15 in landscape-secondary → inverted → left tilt
      fireOrientation(0, 15);
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('ignores gamma in landscape mode', () => {
      restoreScreen = mockScreenOrientation('landscape-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Large gamma but beta=0 → should not trigger
      fireOrientation(-30, 0);
      expect(tiltCallback).not.toHaveBeenCalled();
    });

    it('uses gamma in portrait mode', () => {
      restoreScreen = mockScreenOrientation('portrait-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      fireOrientation(-15, 0);
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('hysteresis works with beta in landscape', () => {
      restoreScreen = mockScreenOrientation('landscape-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Trigger left
      fireOrientation(0, -15);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Still tilted — no re-trigger
      fireOrientation(0, -20);
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Return to center
      fireOrientation(0, 0);

      // Trigger right
      fireOrientation(0, 15);
      expect(tiltCallback).toHaveBeenCalledTimes(2);
      expect(tiltCallback).toHaveBeenLastCalledWith('right');
    });
  });

  describe('landscape orientation (accelerometer)', () => {
    let mockAccel;
    let restoreScreen;

    beforeEach(() => {
      mockAccel = null;
      window.Accelerometer = function(options) {
        mockAccel = new MockAccelerometer(options);
        return mockAccel;
      };
    });

    afterEach(() => {
      if (restoreScreen) {
        restoreScreen();
        restoreScreen = null;
      }
    });

    it('uses y-axis in landscape-primary', () => {
      restoreScreen = mockScreenOrientation('landscape-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // In landscape-primary, y-axis with invert=true
      // Positive y → negative tilt (left)
      mockAccel.y = 2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('uses y-axis in landscape-secondary with inverted sign', () => {
      restoreScreen = mockScreenOrientation('landscape-secondary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // In landscape-secondary, invert=false
      // Positive y → positive tilt (right)
      mockAccel.y = 2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('right');
    });

    it('uses x-axis in portrait', () => {
      restoreScreen = mockScreenOrientation('portrait-primary');
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      mockAccel.x = 2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });
  });

  describe('iOS permission', () => {
    it('needsPermissionRequest() returns false by default', () => {
      expect(MotionSensor.needsPermissionRequest()).toBe(false);
    });

    it('needsPermissionRequest() returns true when requestPermission exists', () => {
      // Create a mock class with requestPermission as a static method
      const MockDOE = class extends Event {};
      MockDOE.requestPermission = jest.fn();
      window.DeviceOrientationEvent = MockDOE;
      expect(MotionSensor.needsPermissionRequest()).toBe(true);
    });

    it('requestPermission() returns true when granted', async () => {
      const MockDOE = class extends Event {};
      MockDOE.requestPermission = jest.fn().mockResolvedValue('granted');
      window.DeviceOrientationEvent = MockDOE;
      const result = await MotionSensor.requestPermission();
      expect(result).toBe(true);
    });

    it('requestPermission() returns false when denied', async () => {
      const MockDOE = class extends Event {};
      MockDOE.requestPermission = jest.fn().mockResolvedValue('denied');
      window.DeviceOrientationEvent = MockDOE;
      const result = await MotionSensor.requestPermission();
      expect(result).toBe(false);
    });

    it('requestPermission() returns true when no permission API', async () => {
      const result = await MotionSensor.requestPermission();
      expect(result).toBe(true);
    });
  });

  describe('destroy()', () => {
    it('disables and cleans up', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      sensor.destroy();

      expect(sensor.isEnabled()).toBe(false);
      fireOrientation(-15);
      expect(tiltCallback).not.toHaveBeenCalled();
    });
  });

  // --- Generic Sensor API tests ---

  describe('Generic Sensor API (Accelerometer)', () => {
    let mockAccel;

    beforeEach(() => {
      // Install MockAccelerometer as global and capture instances
      mockAccel = null;
      window.Accelerometer = function(options) {
        mockAccel = new MockAccelerometer(options);
        return mockAccel;
      };
    });

    it('prefers Generic Sensor when available', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      expect(sensor.getActiveSensorType()).toBe('generic');
      expect(mockAccel).not.toBeNull();
      expect(mockAccel._started).toBe(true);
    });

    it('passes configured frequency to Accelerometer', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      expect(mockAccel.frequency).toBe(MotionConfig.SENSOR_FREQUENCY);
    });

    it('detects left tilt from accelerometer x', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Positive x → negative gamma (left tilt)
      // For gamma = -15°: x = -9.81 * sin(-15° * PI/180) ≈ 2.539
      // But _accelXToGamma negates: gamma = -asin(x/9.81) * (180/PI)
      // To get gamma = -15, we need x such that -asin(x/9.81)*180/PI = -15
      // asin(x/9.81)*180/PI = 15, x/9.81 = sin(15°) ≈ 0.2588, x ≈ 2.54
      mockAccel.x = 2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('detects right tilt from accelerometer x', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Negative x → positive gamma (right tilt)
      mockAccel.x = -2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('right');
    });

    it('hysteresis works with accelerometer', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // Trigger left (gamma ≈ -15°)
      mockAccel.x = 2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Still tilted — no re-trigger
      mockAccel.x = 3.0;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledTimes(1);

      // Return to center (gamma ≈ 0°)
      mockAccel.x = 0;
      mockAccel._fireReading();

      // Trigger left again
      mockAccel.x = 2.54;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledTimes(2);
    });

    it('handles accelerometer x values at gravity limits', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // x at full gravity (device on its side)
      mockAccel.x = 9.81;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('clamps accelerometer values beyond gravity', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      // x beyond gravity (shouldn't produce NaN)
      mockAccel.x = 15;
      mockAccel._fireReading();
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('stops accelerometer on disable()', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      expect(mockAccel._started).toBe(true);

      sensor.disable();
      expect(mockAccel._started).toBe(false);
      expect(sensor.getActiveSensorType()).toBeNull();
    });

    it('stops accelerometer on destroy()', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();
      sensor.destroy();
      expect(mockAccel._started).toBe(false);
    });

    describe('error fallback', () => {
      let warnSpy;
      beforeEach(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
      afterEach(() => { warnSpy.mockRestore(); });

      it('falls back to legacy on accelerometer error', () => {
        sensor = new MotionSensor({ onTilt: tiltCallback });
        sensor.enable();
        expect(sensor.getActiveSensorType()).toBe('generic');

        // Simulate error
        mockAccel._fireError({ name: 'NotReadableError', message: 'Sensor not available' });
        expect(sensor.getActiveSensorType()).toBe('legacy');

        // Legacy should now work
        fireOrientation(-15);
        expect(tiltCallback).toHaveBeenCalledWith('left');
      });

      it('accelerometer readings no longer fire after fallback', () => {
        sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
        sensor.enable();

        // Simulate error → fallback
        mockAccel._fireError({ name: 'NotReadableError' });

        // Old accelerometer reading shouldn't do anything
        // (listeners were removed during fallback)
        mockAccel.x = 5;
        mockAccel._fireReading();
        expect(tiltCallback).not.toHaveBeenCalled();
      });
    });

    describe('constructor failure fallback', () => {
      it('falls back to legacy when Accelerometer constructor throws', () => {
        window.Accelerometer = function() {
          throw new Error('Accelerometer not available');
        };

        sensor = new MotionSensor({ onTilt: tiltCallback });
        sensor.enable();
        expect(sensor.getActiveSensorType()).toBe('legacy');

        // Legacy should work
        fireOrientation(-15);
        expect(tiltCallback).toHaveBeenCalledWith('left');
      });
    });
  });

  describe('permission handling with Generic Sensor', () => {
    let origPerms;

    beforeEach(() => {
      origPerms = navigator.permissions;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'permissions', {
        value: origPerms,
        configurable: true,
      });
    });

    it('requestPermission() checks accelerometer permission', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ state: 'granted' });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: mockQuery },
        configurable: true,
      });

      const result = await MotionSensor.requestPermission();
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith({ name: 'accelerometer' });
    });

    it('requestPermission() returns false when accelerometer permission is denied', async () => {
      // BUG: 'denied' state falls through to iOS check, then returns true
      const mockQuery = jest.fn().mockResolvedValue({ state: 'denied' });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: mockQuery },
        configurable: true,
      });

      const result = await MotionSensor.requestPermission();
      expect(result).toBe(false);
    });
  });

  describe('defensive null guards', () => {
    let mockAccel;

    beforeEach(() => {
      mockAccel = null;
      window.Accelerometer = function(options) {
        mockAccel = new MockAccelerometer(options);
        return mockAccel;
      };
    });

    it('_onAccelReading does not crash if accelerometer is null', () => {
      // BUG: If a queued reading event fires after error fallback
      // nulled the accelerometer, accessing this._accelerometer.x crashes
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();
      expect(sensor.getActiveSensorType()).toBe('generic');

      // Simulate: error fires and cleans up accelerometer
      mockAccel._fireError({ name: 'NotReadableError' });
      expect(sensor.getActiveSensorType()).toBe('legacy');

      // Now simulate a stale reading callback (bound method called directly)
      // This should not throw
      expect(() => sensor._onAccelReading()).not.toThrow();
      expect(tiltCallback).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('_tryGenericSensor cleans up listeners when start() throws', () => {
      // BUG: If start() throws, listeners are left attached to the
      // orphaned accelerometer without being removed
      let createdAccel = null;
      window.Accelerometer = function(options) {
        createdAccel = new MockAccelerometer(options);
        createdAccel.start = () => { throw new Error('SecurityError'); };
        return createdAccel;
      };

      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();

      // Should have fallen back to legacy
      expect(sensor.getActiveSensorType()).toBe('legacy');

      // The orphaned accelerometer should have no listeners left
      expect(createdAccel._listeners.reading?.length ?? 0).toBe(0);
      expect(createdAccel._listeners.error?.length ?? 0).toBe(0);
    });
  });
});
