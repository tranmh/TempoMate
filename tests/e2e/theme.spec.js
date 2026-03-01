import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('theme button is visible', async ({ page }) => {
    await expect(page.locator('#btn-theme')).toBeVisible();
  });

  test('cycles through themes on click', async ({ page }) => {
    // Click theme button to cycle
    await page.click('#btn-theme');
    // Should now be light (from auto)
    const theme = await page.getAttribute('html', 'data-theme');
    expect(theme).toBe('light');

    await page.click('#btn-theme');
    const theme2 = await page.getAttribute('html', 'data-theme');
    expect(theme2).toBe('dark');

    await page.click('#btn-theme');
    // Back to auto (effective theme depends on system)
    const theme3 = await page.getAttribute('html', 'data-theme');
    expect(['light', 'dark']).toContain(theme3);
  });

  test('dark theme applies dark background', async ({ page }) => {
    // Set dark mode
    await page.click('#btn-theme'); // auto -> light
    await page.click('#btn-theme'); // light -> dark

    // Wait for CSS transition to complete
    await page.waitForTimeout(500);

    const bg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Dark background should be dark (rgb(18, 18, 18) = #121212)
    expect(bg).toBe('rgb(18, 18, 18)');
  });
});
