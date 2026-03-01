import { test, expect } from '@playwright/test';

test.describe('Preset Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('opens settings panel', async ({ page }) => {
    await page.click('#btn-settings');
    await expect(page.locator('.settings-panel')).toBeVisible();
  });

  test('shows all 26 preset cards', async ({ page }) => {
    await page.click('#btn-settings');
    const cards = page.locator('.preset-card');
    await expect(cards).toHaveCount(26);
  });

  test('selects a different preset', async ({ page }) => {
    await page.click('#btn-settings');
    // Click on preset #10 (3+2 Fischer)
    await page.click('.preset-card[data-option="10"]');

    // Settings should close
    await expect(page.locator('#settings-panel')).toHaveClass(/hidden/);

    // Clock should show 3:00 (3 minutes)
    const leftTime = page.locator('.clock-left .clock-time');
    await expect(leftTime).toHaveText('3:00');

    // Status should show option 10
    await expect(page.locator('.status-option')).toContainText('#10');
  });

  test('quick preset selection with number keys', async ({ page }) => {
    await page.keyboard.press('3');
    // Preset 3: 25 minutes
    const leftTime = page.locator('.clock-left .clock-time');
    await expect(leftTime).toHaveText('25:00');
  });

  test('switches to custom tab', async ({ page }) => {
    await page.click('#btn-settings');
    await page.click('.settings-tab:has-text("Custom")');
    await expect(page.locator('.custom-list')).toBeVisible();
  });

  test('closes settings with X button', async ({ page }) => {
    await page.click('#btn-settings');
    await page.click('.settings-close');
    await expect(page.locator('#settings-panel')).toHaveClass(/hidden/);
  });

  test('closes settings with Escape key', async ({ page }) => {
    await page.click('#btn-settings');
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-panel')).toHaveClass(/hidden/);
  });
});
