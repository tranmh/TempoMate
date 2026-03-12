import { test, expect } from '@playwright/test';

/**
 * Helper: inject mock Wake Lock API before the app loads.
 * Stores call logs on window.__wakeLockLog for assertions.
 */
function injectMockAPIs(page, { hasNativeAPI = true, nativeShouldFail = false } = {}) {
  return page.addInitScript(({ hasNativeAPI, nativeShouldFail }) => {
    window.__wakeLockLog = {
      nativeRequests: [],
    };

    if (hasNativeAPI) {
      const wakeLockAPI = {
        request: (type) => {
          window.__wakeLockLog.nativeRequests.push({ type, time: performance.now() });
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
          return Promise.resolve(lock);
        },
      };
      Object.defineProperty(navigator, 'wakeLock', {
        value: wakeLockAPI,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    } else {
      Object.defineProperty(navigator, 'wakeLock', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      delete navigator.wakeLock;
    }
  }, { hasNativeAPI, nativeShouldFail });
}

test.describe('Wake Lock — Native API available', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('wake lock requested on tap', async ({ page }) => {
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBeGreaterThanOrEqual(1);
    expect(log.nativeRequests[0].type).toBe('screen');
  });

  test('wake lock requested on each tap', async ({ page }) => {
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    await page.click('.clock-right');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBe(2);
  });

  test('spacebar triggers wake lock', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Wake Lock — Native API failure', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true, nativeShouldFail: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('gracefully handles native wake lock rejection', async ({ page }) => {
    // Should not throw — the .catch(() => {}) swallows the error
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBeGreaterThanOrEqual(1);

    // App should still be functional (game started)
    const status = await page.evaluate(() => window.__tempoMateApp.gameState.status);
    expect(status).toBe('running');
  });
});

test.describe('Wake Lock — No native API', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: false });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('app works without native wake lock API', async ({ page }) => {
    // Should not throw even without navigator.wakeLock
    await page.click('.clock-left');
    await page.waitForTimeout(200);

    const log = await page.evaluate(() => window.__wakeLockLog);
    expect(log.nativeRequests.length).toBe(0);

    // App should still be functional
    const status = await page.evaluate(() => window.__tempoMateApp.gameState.status);
    expect(status).toBe('running');
  });
});

test.describe('Wake Lock — Visibility change', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAPIs(page, { hasNativeAPI: true });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('wake lock re-acquired after tab becomes visible', async ({ page }) => {
    const requestsBefore = await page.evaluate(() => window.__wakeLockLog.nativeRequests.length);

    // Simulate tab becoming visible
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
