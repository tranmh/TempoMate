import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MotionSensor } from '../../src/js/input/MotionSensor.js';
import { MotionConfig } from '../../src/js/utils/constants.js';

/**
 * Helper: dispatch a mock deviceorientation event.
 * @param {number} beta - Tilt angle in degrees
 */
function fireOrientation(beta) {
  const event = new Event('deviceorientation');
  event.beta = beta;
  window.dispatchEvent(event);
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
          this.beta = init.beta ?? null;
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
  });

  describe('isSupported()', () => {
    it('returns true when DeviceOrientationEvent exists', () => {
      expect(MotionSensor.isSupported()).toBe(true);
    });
  });

  describe('enable/disable lifecycle', () => {
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
  });

  describe('tilt detection', () => {
    it('fires left on negative beta past threshold', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback, threshold: 10 });
      sensor.enable();

      fireOrientation(-10);
      expect(tiltCallback).toHaveBeenCalledWith('left');
    });

    it('fires right on positive beta past threshold', () => {
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

    it('ignores null beta', () => {
      sensor = new MotionSensor({ onTilt: tiltCallback });
      sensor.enable();

      const event = new Event('deviceorientation');
      event.beta = null;
      window.dispatchEvent(event);

      expect(tiltCallback).not.toHaveBeenCalled();
    });
  });

  describe('hysteresis', () => {
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
});
