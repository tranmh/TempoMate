import { test, expect } from '@playwright/test';

/**
 * Helper: simulate tab going hidden.
 * Dispatches visibilitychange with visibilityState = 'hidden'.
 */
function simulateHidden(page) {
  return page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/**
 * Helper: simulate tab becoming visible.
 * Dispatches visibilitychange with visibilityState = 'visible'.
 */
function simulateVisible(page) {
  return page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/**
 * Helper: read the active (right) player's remaining time in ms.
 */
function getRightTimeMs(page) {
  return page.evaluate(() => window.__tempoMateApp.gameState.right.timeMs);
}

test.describe('Background timer accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('clock accounts for elapsed time after tab was hidden then visible', async ({ page }) => {
    // Start the clock (Space starts right player's clock)
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    const timeBefore = await getRightTimeMs(page);

    // Hide tab, wait 3s real time, then show
    await simulateHidden(page);
    await page.waitForTimeout(3000);
    await simulateVisible(page);
    await page.waitForTimeout(100);

    const timeAfter = await getRightTimeMs(page);
    const elapsed = timeBefore - timeAfter;

    // Elapsed should be ~3200ms (200ms foreground + 3000ms background)
    // We check that at least 3000ms was accounted for
    expect(elapsed).toBeGreaterThan(3000 - 300);
    expect(elapsed).toBeLessThan(3000 + 500);
  });

  test('no ticks delivered while tab is hidden (rAF cancelled)', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const timeBefore = await getRightTimeMs(page);

    await simulateHidden(page);

    // Verify rAF was cancelled
    const rafId = await page.evaluate(() => window.__tempoMateApp.timerEngine._rafId);
    expect(rafId).toBeNull();

    // Wait 1s while hidden
    await page.waitForTimeout(1000);

    // Time should NOT have changed (no ticks while hidden)
    const timeAfter = await getRightTimeMs(page);
    const drift = timeBefore - timeAfter;
    expect(drift).toBeLessThan(50);
  });

  test('clock resumes normal ticking after becoming visible', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Hide for 1s then show
    await simulateHidden(page);
    await page.waitForTimeout(1000);
    await simulateVisible(page);

    // Verify rAF restarted
    const rafId = await page.evaluate(() => window.__tempoMateApp.timerEngine._rafId);
    expect(rafId).not.toBeNull();

    // Snapshot time right after becoming visible
    const timeAfterShow = await getRightTimeMs(page);

    // Wait 2s in foreground
    await page.waitForTimeout(2000);

    const timeAfterForeground = await getRightTimeMs(page);
    const foregroundElapsed = timeAfterShow - timeAfterForeground;

    expect(foregroundElapsed).toBeGreaterThan(2000 - 300);
    expect(foregroundElapsed).toBeLessThan(2000 + 300);
  });

  test('multiple hide/show cycles maintain cumulative accuracy', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const timeStart = await getRightTimeMs(page);

    // Cycle 1: hide 2s, show
    await simulateHidden(page);
    await page.waitForTimeout(2000);
    await simulateVisible(page);
    await page.waitForTimeout(100);

    // Cycle 2: hide 2s, show
    await simulateHidden(page);
    await page.waitForTimeout(2000);
    await simulateVisible(page);
    await page.waitForTimeout(100);

    // Cycle 3: hide 1s, show
    await simulateHidden(page);
    await page.waitForTimeout(1000);
    await simulateVisible(page);
    await page.waitForTimeout(100);

    const timeEnd = await getRightTimeMs(page);
    const totalElapsed = timeStart - timeEnd;

    // Background: 2+2+1 = 5s, foreground gaps: ~400ms+100ms initial
    // Total should be ~5.5s
    expect(totalElapsed).toBeGreaterThan(5000);
    expect(totalElapsed).toBeLessThan(6500);
  });

  test('time expiry detected when returning from long background', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Set right player to only 2000ms remaining
    await page.evaluate(() => {
      window.__tempoMateApp.gameState.right.timeMs = 2000;
    });

    // Hide for 3s (exceeds 2s remaining)
    await simulateHidden(page);
    await page.waitForTimeout(3000);
    await simulateVisible(page);
    await page.waitForTimeout(100);

    const timeMs = await getRightTimeMs(page);
    expect(timeMs).toBeLessThanOrEqual(0);

    const flagState = await page.evaluate(
      () => window.__tempoMateApp.gameState.right.flagState
    );
    expect(flagState).toBe('blinking');

    // Default preset has freezeDefault: false, so game stays running
    const status = await page.evaluate(
      () => window.__tempoMateApp.gameState.status
    );
    expect(status).toBe('running');
  });
});
