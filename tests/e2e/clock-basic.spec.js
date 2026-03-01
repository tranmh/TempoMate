import { test, expect } from '@playwright/test';

test.describe('Clock Basic Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to initialize
    await page.waitForSelector('.clock-container');
  });

  test('displays two clock faces', async ({ page }) => {
    const clocks = page.locator('.clock-face');
    await expect(clocks).toHaveCount(2);
  });

  test('shows initial time from default preset', async ({ page }) => {
    const leftTime = page.locator('.clock-left .clock-time');
    const rightTime = page.locator('.clock-right .clock-time');
    // Default preset 1: 5 minutes
    await expect(leftTime).toHaveText('5:00');
    await expect(rightTime).toHaveText('5:00');
  });

  test('starts clock by clicking left side', async ({ page }) => {
    // Click left clock to start (right clock should start counting)
    await page.click('.clock-left');
    // Wait a moment for the clock to tick
    await page.waitForTimeout(200);
    // Right clock should be active
    await expect(page.locator('.clock-right')).toHaveClass(/active/);
  });

  test('switches turns on clock tap', async ({ page }) => {
    // Start the game
    await page.click('.clock-left');
    await page.waitForTimeout(100);

    // Right is active, click it to switch
    await page.click('.clock-right');
    await page.waitForTimeout(100);

    // Now left should be active
    await expect(page.locator('.clock-left')).toHaveClass(/active/);
  });

  test('starts clock with spacebar', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    // Clock should be running
    const rightClock = page.locator('.clock-right');
    await expect(rightClock).toHaveClass(/active/);
  });

  test('pauses with P key', async ({ page }) => {
    // Start clock
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Pause
    await page.keyboard.press('p');
    await page.waitForTimeout(100);

    // Right clock should show paused
    await expect(page.locator('.clock-right')).toHaveClass(/paused/);
  });

  test('resumes with P key', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    await page.keyboard.press('p');
    await page.waitForTimeout(100);
    await page.keyboard.press('p');
    await page.waitForTimeout(100);

    await expect(page.locator('.clock-right')).toHaveClass(/active/);
  });

  test('resets with R key (double-tap)', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // First R enters confirmation state
    await page.keyboard.press('r');
    await page.waitForTimeout(100);

    // Second R executes the reset
    await page.keyboard.press('r');
    await page.waitForTimeout(100);

    // Should be back to initial time
    const leftTime = page.locator('.clock-left .clock-time');
    await expect(leftTime).toHaveText('5:00');
  });

  test('toolbar buttons are visible', async ({ page }) => {
    await expect(page.locator('#btn-settings')).toBeVisible();
    await expect(page.locator('#btn-reset')).toBeVisible();
    await expect(page.locator('#btn-pause')).toBeVisible();
    await expect(page.locator('#btn-sound')).toBeVisible();
    await expect(page.locator('#btn-theme')).toBeVisible();
  });

  test('status bar shows option number', async ({ page }) => {
    const statusOption = page.locator('.status-option');
    await expect(statusOption).toContainText('#01');
  });

  test('time counts down while running', async ({ page }) => {
    await page.keyboard.press('Space');
    // Wait 1.5 seconds
    await page.waitForTimeout(1500);

    const rightTime = page.locator('.clock-right .clock-time');
    const text = await rightTime.textContent();
    // Should be less than 5:00 (e.g., 4:58 or 4:59)
    expect(text).not.toBe('5:00');
  });

  test('only active player clock counts down', async ({ page }) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Left (inactive) should still be at 5:00
    const leftTime = page.locator('.clock-left .clock-time');
    await expect(leftTime).toHaveText('5:00');
  });
});
