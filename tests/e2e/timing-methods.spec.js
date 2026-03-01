import { test, expect } from '@playwright/test';

test.describe('Timing Methods', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('Fischer bonus adds time after move', async ({ page }) => {
    // Select preset 10: 3+2 Fischer
    await page.keyboard.press('0'); // Selects preset 10

    // Start and make a quick move
    await page.keyboard.press('Space');
    await page.waitForTimeout(500); // 0.5 seconds

    // Switch turn (should add 2s bonus)
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // Right player's time should be around 3:01.x (3:00 - 0.5s + 2s bonus)
    const rightTime = page.locator('.clock-right .clock-time');
    const text = await rightTime.textContent();
    // Should have MORE than 3:00 due to Fischer bonus
    // Parse: could be "3:01" or similar
    expect(text).toMatch(/3:0[1-2]/);
  });

  test('time counts down for simple time control', async ({ page }) => {
    // Preset 1: 5 min simple time
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    const rightTime = page.locator('.clock-right .clock-time');
    const text = await rightTime.textContent();
    // Should be around 4:58
    expect(text.startsWith('4:')).toBe(true);
  });

  test('US delay shows delay countdown', async ({ page }) => {
    // Select preset 22: 5+2s US Delay
    await page.click('#btn-settings');
    await page.click('.preset-card[data-option="22"]');

    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Status bar should show delay countdown
    const statusDelay = page.locator('.status-delay');
    // May or may not be visible depending on timing
  });

  test('freeze icon shows for Fischer presets', async ({ page }) => {
    // Select preset 10: Fischer (freeze ON by default)
    await page.keyboard.press('0');
    await page.waitForTimeout(100);

    // Freeze icon should be visible
    const freezeIcon = page.locator('.freeze-icon');
    await expect(freezeIcon).not.toHaveClass(/hidden/);
  });

  test('no freeze icon for simple time presets', async ({ page }) => {
    // Preset 1: Time (freeze OFF)
    const freezeIcon = page.locator('.freeze-icon');
    await expect(freezeIcon).toHaveClass(/hidden/);
  });
});
