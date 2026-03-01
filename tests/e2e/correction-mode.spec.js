import { test, expect } from '@playwright/test';

test.describe('Correction Mode (Arbiter Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  /**
   * Helper: start game, pause, then long-press pause button to enter correction mode.
   */
  async function enterCorrectionMode(page) {
    // Start the game
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // Pause the game
    await page.keyboard.press('p');
    await page.waitForTimeout(100);

    // Long-press pause button (3 seconds) to enter correction mode
    const pauseBtn = page.locator('#btn-pause');
    const box = await pauseBtn.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(3200); // slightly over 3s
    await page.mouse.up();

    // Correction overlay should be visible
    await expect(page.locator('#correction-overlay')).not.toHaveClass(/hidden/);
  }

  test('enters correction mode via long-press on pause button', async ({ page }) => {
    await enterCorrectionMode(page);
    await expect(page.locator('.correction-title')).toHaveText('Time Correction');
  });

  test('shows correct initial time values', async ({ page }) => {
    await enterCorrectionMode(page);

    // Default preset is 5 minutes = 00:05:00
    const fields = page.locator('.correction-field');
    // Left hours should be 00 (5 min game)
    await expect(fields.nth(0)).toHaveText('00');
    // Left minutes should be 04 or 05 (depending on tick timing)
    const leftMin = await fields.nth(1).textContent();
    expect(parseInt(leftMin, 10)).toBeGreaterThanOrEqual(4);
    expect(parseInt(leftMin, 10)).toBeLessThanOrEqual(5);
    // Right hours should be 00
    await expect(fields.nth(3)).toHaveText('00');
  });

  test('tapping a field selects it', async ({ page }) => {
    await enterCorrectionMode(page);

    // First field should be active by default
    const fields = page.locator('.correction-field');
    await expect(fields.nth(0)).toHaveClass(/correction-active/);

    // Tap the second field (left minutes)
    await fields.nth(1).click();
    await expect(fields.nth(1)).toHaveClass(/correction-active/);
    await expect(fields.nth(0)).not.toHaveClass(/correction-active/);
  });

  test('touch control buttons navigate fields', async ({ page }) => {
    await enterCorrectionMode(page);

    const fields = page.locator('.correction-field');
    await expect(fields.nth(0)).toHaveClass(/correction-active/);

    // Click next button (▶)
    await page.click('button[title="Next field"]');
    await expect(fields.nth(1)).toHaveClass(/correction-active/);

    // Click prev button (◀)
    await page.click('button[title="Previous field"]');
    await expect(fields.nth(0)).toHaveClass(/correction-active/);
  });

  test('touch control buttons adjust values', async ({ page }) => {
    await enterCorrectionMode(page);

    // Select left minutes field
    const fields = page.locator('.correction-field');
    await fields.nth(1).click();
    const initialText = await fields.nth(1).textContent();
    const initialVal = parseInt(initialText, 10);

    // Click increment (+)
    await page.click('button[title="Increase"]');
    const afterInc = await fields.nth(1).textContent();
    expect(parseInt(afterInc, 10)).toBe(initialVal + 1);

    // Click decrement (−)
    await page.click('button[title="Decrease"]');
    const afterDec = await fields.nth(1).textContent();
    expect(parseInt(afterDec, 10)).toBe(initialVal);
  });

  test('keyboard arrows navigate and adjust', async ({ page }) => {
    await enterCorrectionMode(page);

    const fields = page.locator('.correction-field');
    await expect(fields.nth(0)).toHaveClass(/correction-active/);

    // Arrow right to next field
    await page.keyboard.press('ArrowRight');
    await expect(fields.nth(1)).toHaveClass(/correction-active/);

    // Arrow left back
    await page.keyboard.press('ArrowLeft');
    await expect(fields.nth(0)).toHaveClass(/correction-active/);

    // Arrow up to increment left hours
    const before = await fields.nth(0).textContent();
    await page.keyboard.press('ArrowUp');
    const after = await fields.nth(0).textContent();
    expect(parseInt(after, 10)).toBe(parseInt(before, 10) + 1);
  });

  test('save button applies corrections', async ({ page }) => {
    await enterCorrectionMode(page);

    // Select left minutes and increment a few times
    const fields = page.locator('.correction-field');
    await fields.nth(1).click();
    await page.click('button[title="Increase"]');
    await page.click('button[title="Increase"]');

    // Click Save
    await page.click('.btn-primary');

    // Overlay should be hidden
    await expect(page.locator('#correction-overlay')).toHaveClass(/hidden/);

    // Time should reflect the change (original ~4:59 + 2 minutes)
    const leftTime = page.locator('.clock-left .clock-time');
    const text = await leftTime.textContent();
    // The minutes portion should be larger than original
    expect(text).toMatch(/[67]:\d{2}/);
  });

  test('cancel button discards changes', async ({ page }) => {
    // Start game, let it run briefly
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await page.keyboard.press('p');
    await page.waitForTimeout(100);

    // Capture time before correction
    const rightTimeBefore = await page.locator('.clock-right .clock-time').textContent();

    // Enter correction mode
    const pauseBtn = page.locator('#btn-pause');
    const box = await pauseBtn.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3200);
    await page.mouse.up();

    await expect(page.locator('#correction-overlay')).not.toHaveClass(/hidden/);

    // Make changes
    const fields = page.locator('.correction-field');
    await fields.nth(1).click();
    await page.click('button[title="Increase"]');
    await page.click('button[title="Increase"]');
    await page.click('button[title="Increase"]');

    // Cancel
    await page.click('.btn-secondary');

    // Overlay should be hidden
    await expect(page.locator('#correction-overlay')).toHaveClass(/hidden/);

    // Time should be unchanged
    const rightTimeAfter = await page.locator('.clock-right .clock-time').textContent();
    expect(rightTimeAfter).toBe(rightTimeBefore);
  });

  test('escape key cancels correction mode', async ({ page }) => {
    await enterCorrectionMode(page);
    await expect(page.locator('#correction-overlay')).not.toHaveClass(/hidden/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#correction-overlay')).toHaveClass(/hidden/);
  });
});
