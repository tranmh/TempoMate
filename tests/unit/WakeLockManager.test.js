import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WakeLockManager } from '../../src/js/utils/WakeLockManager.js';

describe('WakeLockManager', () => {
  let manager;

  beforeEach(() => {
    // Remove native wakeLock to test both paths
    delete navigator.wakeLock;
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
      manager = null;
    }
  });

  describe('enable() is synchronous', () => {
    it('returns undefined (not a Promise)', () => {
      manager = new WakeLockManager();
      const result = manager.enable();
      expect(result).toBeUndefined();
    });

    it('all three strategies initiated in single enable() call', () => {
      const mockRequest = jest.fn().mockReturnValue(
        new Promise((resolve) => setTimeout(resolve, 1000))
      );
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: mockRequest },
        configurable: true,
      });

      // Mock AudioContext for jsdom
      const origAudioContext = window.AudioContext;
      window.AudioContext = jest.fn().mockReturnValue({
        state: 'running',
        resume: jest.fn(),
        close: jest.fn(),
        destination: {},
        createOscillator: jest.fn().mockReturnValue({
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          disconnect: jest.fn(),
          frequency: { value: 0 },
        }),
        createGain: jest.fn().mockReturnValue({
          connect: jest.fn(),
          disconnect: jest.fn(),
          gain: { value: 0 },
        }),
      });

      manager = new WakeLockManager();
      manager.enable();

      // Native lock requested
      expect(mockRequest).toHaveBeenCalledWith('screen');
      // NoSleep created
      expect(manager._noSleep).not.toBeNull();
      // Audio context created
      expect(manager._audioCtx).not.toBeNull();

      window.AudioContext = origAudioContext;
    });
  });

  describe('idempotency', () => {
    it('calling enable() twice does not duplicate resources', () => {
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: jest.fn().mockReturnValue(
            new Promise((resolve) => setTimeout(resolve, 1000))
          ),
        },
        configurable: true,
      });
      manager = new WakeLockManager();

      manager.enable();
      const noSleep1 = manager._noSleep;
      const audioCtx1 = manager._audioCtx;

      manager.enable(); // second call — should be no-op
      expect(manager._noSleep).toBe(noSleep1);
      expect(manager._audioCtx).toBe(audioCtx1);
      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('native Wake Lock API path', () => {
    let mockRelease;
    let mockLock;

    beforeEach(() => {
      mockRelease = jest.fn().mockResolvedValue(undefined);
      mockLock = {
        release: mockRelease,
        addEventListener: jest.fn(),
      };
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: jest.fn().mockResolvedValue(mockLock),
        },
        configurable: true,
      });
      manager = new WakeLockManager();
    });

    it('uses native API when available', () => {
      manager.enable();
      expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
    });

    it('native lock requested exactly once (no double request)', async () => {
      manager.enable();
      // Let the .then() resolve so _nativeLock is set
      await Promise.resolve();
      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
    });

    it('native lock not re-requested if already held', async () => {
      manager.enable();
      // Let the .then() resolve
      await Promise.resolve();
      expect(manager._nativeLock).toBe(mockLock);

      // Reset enabled flag so enable() would run again (simulate re-enable)
      manager._enabled = false;
      manager.enable();
      // Still only 1 call because _nativeLock is already held
      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(1);
    });

    it('releases native lock on disable', async () => {
      manager.enable();
      // Let the .then() resolve
      await Promise.resolve();
      manager.disable();
      expect(mockRelease).toHaveBeenCalled();
    });

    it('removes visibility listener on destroy', () => {
      const spy = jest.spyOn(document, 'removeEventListener');
      manager.enable();
      manager.destroy();
      expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      spy.mockRestore();
    });

    it('handles native request failure gracefully', () => {
      navigator.wakeLock.request = jest.fn().mockRejectedValue(new Error('low battery'));
      // Should not throw
      manager.enable();
    });

    it('registers release event listener on native lock', async () => {
      manager.enable();
      await Promise.resolve();
      expect(mockLock.addEventListener).toHaveBeenCalledWith('release', expect.any(Function));
    });
  });

  describe('NoSleep.js fallback path', () => {
    beforeEach(() => {
      // Ensure native API is absent
      delete navigator.wakeLock;
      manager = new WakeLockManager();
    });

    it('falls back to NoSleep when native API is unavailable', () => {
      manager.enable();
      expect(manager._noSleep).not.toBeNull();
    });

    it('disables NoSleep on disable', () => {
      manager.enable();
      const spy = jest.spyOn(manager._noSleep, 'disable');
      manager.disable();
      expect(spy).toHaveBeenCalled();
    });

    it('nullifies NoSleep on disable so re-enable works', () => {
      manager.enable();
      manager.disable();
      expect(manager._noSleep).toBeNull();
    });

    it('cleans up on destroy', () => {
      const removeSpy = jest.spyOn(document, 'removeEventListener');
      manager.enable();
      manager.destroy();
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      removeSpy.mockRestore();
    });
  });

  describe('visibility change re-acquisition', () => {
    it('re-requests native lock on visibility change', async () => {
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: jest.fn().mockResolvedValue({
            release: jest.fn(),
            addEventListener: jest.fn(),
          }),
        },
        configurable: true,
      });
      manager = new WakeLockManager();
      manager.enable();
      // Let the .then() resolve so _nativeLock is set
      await Promise.resolve();

      // Clear the lock to simulate it being released
      manager._nativeLock = null;

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // request called once in enable(), once on visibility change
      expect(navigator.wakeLock.request).toHaveBeenCalledTimes(2);
    });

    it('_reacquire() not called when disabled', () => {
      manager = new WakeLockManager();
      manager.enable();

      // Disable the manager
      manager.disable();

      const spy = jest.spyOn(manager, '_requestNativeLock');

      // Simulate tab becoming visible — should NOT re-acquire
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
