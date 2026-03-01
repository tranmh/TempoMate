import { test, expect } from '@playwright/test';

test.describe('90° Rotation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('rotate button is visible', async ({ page }) => {
    await expect(page.locator('#btn-rotate')).toBeVisible();
  });

  test('rotate button toggles .rotated class on #app', async ({ page }) => {
    const app = page.locator('#app');

    // Desktop defaults to not rotated
    await expect(app).not.toHaveClass(/rotated/);

    // Click rotate -> adds class
    await page.click('#btn-rotate');
    await expect(app).toHaveClass(/rotated/);

    // Click again -> removes class
    await page.click('#btn-rotate');
    await expect(app).not.toHaveClass(/rotated/);
  });

  test('clock faces remain clickable after rotation', async ({ page }) => {
    // Enable rotation
    await page.click('#btn-rotate');
    await expect(page.locator('#app')).toHaveClass(/rotated/);

    // Click left clock to start the game
    await page.click('.clock-left');

    // Right clock should become active (left player pressed, so right plays)
    await expect(page.locator('.clock-right')).toHaveClass(/active/);
  });

  test('rotation preference persists across page reload', async ({ page }) => {
    const app = page.locator('#app');

    // Rotate
    await page.click('#btn-rotate');
    await expect(app).toHaveClass(/rotated/);

    // Reload
    await page.reload();
    await page.waitForSelector('.clock-container');

    // Should still be rotated
    await expect(page.locator('#app')).toHaveClass(/rotated/);

    // Toggle off
    await page.click('#btn-rotate');
    await expect(page.locator('#app')).not.toHaveClass(/rotated/);

    // Reload again
    await page.reload();
    await page.waitForSelector('.clock-container');

    // Should remain un-rotated
    await expect(page.locator('#app')).not.toHaveClass(/rotated/);
  });
});
