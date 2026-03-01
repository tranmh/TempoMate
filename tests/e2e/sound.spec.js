import { test, expect } from '@playwright/test';

test.describe('Sound Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('sound button toggles sound state', async ({ page }) => {
    // Initially sound is off for TIME preset
    const soundIcon = page.locator('.sound-icon');
    await expect(soundIcon).toHaveClass(/hidden/);

    // Toggle sound on via button
    await page.click('#btn-sound');
    await expect(soundIcon).not.toHaveClass(/hidden/);

    // Toggle sound off
    await page.click('#btn-sound');
    await expect(soundIcon).toHaveClass(/hidden/);
  });

  test('S key toggles sound', async ({ page }) => {
    const soundIcon = page.locator('.sound-icon');
    await expect(soundIcon).toHaveClass(/hidden/);

    await page.keyboard.press('s');
    await expect(soundIcon).not.toHaveClass(/hidden/);
  });

  test('sound on by default for byo-yomi presets', async ({ page }) => {
    // Select preset 20: Byo-yomi (sound ON by default)
    await page.click('#btn-settings');
    await page.click('.preset-card[data-option="20"]');

    const soundIcon = page.locator('.sound-icon');
    await expect(soundIcon).not.toHaveClass(/hidden/);
  });
});
