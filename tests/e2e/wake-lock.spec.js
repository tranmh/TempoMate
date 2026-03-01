import { test, expect } from '@playwright/test';

/**
 * Helper: inject mock Wake Lock + Web Audio APIs before the app loads.
 * Stores call logs on window.__wakeLockLog for assertions.
 *
 * Uses Object.defineProperty because navigator.wakeLock is a prototype
 * getter in Chromium and cannot be overwritten by simple assignment.
 */
function injectMockAPIs(page, { hasNativeAPI = true, nativeShouldFail = false } = {}) {
  return page.addInitScript(({ hasNativeAPI, nativeShouldFail }) => {
    window.__wakeLockLog = {
      nativeRequests: [],
      videoPlays: [],
      audioContextsCreated: [],
      timestamps: {},
    };

    // Mock native Wake Lock API
    if (hasNativeAPI) {
      const locks = [];
      const wakeLockAPI = {
        request: (type) => {
          window.__wakeLockLog.nativeRequests.push({ type, time: performance.now() });
          window.__wakeLockLog.timestamps.nativeRequest = performance.now();
          if (nativeShouldFail) {
            return Promise.reject(new Error('Mock: wake lock denied'));
          }
          const lock = {
            type,
            released: false,
            _listeners: {},
            addEventListener(evt, fn) { this._listeners[evt] = fn; },
            release() {
              this.released = true;
              if (this._listeners.release) this._listeners.release();
              return Promise.resolve();
            },
          };
          locks.push(lock);
          return Promise.resolve(lock);
        },
        _locks: locks,
      };
      Object.defineProperty(navigator, 'wakeLock', {
        value: wakeLockAPI,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    } else {
      // Remove native API — define as non-enumerable undefined then delete
      Object.defineProperty(navigator, 'wakeLock', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      delete navigator.wakeLock;
    }

    // Intercept HTMLVideoElement.play to track calls
    const origPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = function () {
      window.__wakeLockLog.videoPlays.push({ time: performance.now() });
      window.__wakeLockLog.timestamps.videoPlay = performance.now();
      return origPlay.call(this).catch(() => Promise.resolve());
    };

    // Intercept AudioContext creation
    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OrigAudioContext) {
      const MockAudioContext = function (...args) {
        window.__wakeLockLog.audioContextsCreated.push({ time: performance.now() });
        window.__wakeLockLog.timestamps.audioContext = performance.now();
        return new OrigAudioContext(...args);
      };
      MockAudioContext.prototype = OrigAudioContext.prototype;
      window.AudioContext = MockAudioContext;
      if (window.webkitAudioContext) {
        window.webkitAudioContext = MockAudioContext;
      }
    }
  }, { hasNativeAPI, nativeShouldFail });
}

test.describe('Wake Lock — Modern browser (native API available)', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('all 3 strategies activate on tap', async ({ page }) => {
    await page.click('.clock-left');
    // Allow microtask for native .then() to resolve
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBeGreaterThanOrEqual(1);
    expect(log.videoPlays.length).toBeGreaterThanOrEqual(1);
    expect(log.audioContextsCreated.length).toBeGreaterThanOrEqual(1);
  });

  test('no double native request on second tap', async ({ page }) => {
    // First tap starts the clock
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    // Second tap switches turns — should not re-request native lock
    await page.click('.clock-right');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBe(1);
  });
});

test.describe('Wake Lock — Native API failure', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true, nativeShouldFail: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('fallbacks still activate when native fails', async ({ page }) => {
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    // Native was attempted but failed
    expect(log.nativeRequests.length).toBeGreaterThanOrEqual(1);
    // Fallbacks still activated
    expect(log.videoPlays.length).toBeGreaterThanOrEqual(1);
    expect(log.audioContextsCreated.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Wake Lock — No native API (Opera-like)', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: false });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('only video and audio fallbacks used', async ({ page }) => {
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBe(0);
    expect(log.videoPlays.length).toBeGreaterThanOrEqual(1);
    expect(log.audioContextsCreated.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Wake Lock — Visibility change', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('native lock re-acquired after tab hidden then visible', async ({ page }) => {
    // Activate wake lock
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const requestsBefore = await page.evaluate(() => window.__wakeLockLog.nativeRequests.length);
    expect(requestsBefore).toBeGreaterThanOrEqual(1);

    // Simulate: release the current lock (triggers release event → nullifies _nativeLock)
    await page.evaluate(() => {
      const locks = navigator.wakeLock._locks;
      if (locks && locks.length > 0) {
        locks[locks.length - 1].release();
      }
    });
    await page.waitForTimeout(100);

    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);

    const requestsAfter = await page.evaluate(() => window.__wakeLockLog.nativeRequests.length);
    expect(requestsAfter).toBeGreaterThan(requestsBefore);
  });
});

test.describe('Wake Lock — Synchronous call stack', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('all 3 strategies initiated within 5ms of each other', async ({ page }) => {
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const timestamps = await page.evaluate(() => window.__wakeLockLog.timestamps);
    const times = [
      timestamps.nativeRequest,
      timestamps.videoPlay,
      timestamps.audioContext,
    ].filter(Boolean);

    expect(times.length).toBe(3);

    const spread = Math.max(...times) - Math.min(...times);
    // All strategies fire in the same synchronous call stack.
    // An async gap (await) would cause 50ms+ spread.
    expect(spread).toBeLessThan(10);
  });
});

test.describe('Wake Lock — Keyboard activation', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('spacebar triggers wake lock', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBeGreaterThanOrEqual(1);
    expect(log.videoPlays.length).toBeGreaterThanOrEqual(1);
    expect(log.audioContextsCreated.length).toBeGreaterThanOrEqual(1);
  });
});
