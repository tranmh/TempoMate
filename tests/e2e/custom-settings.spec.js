import { test, expect } from '@playwright/test';

/*
 * E2E: Settings panel flow for custom time controls (README B9, B10, B21).
 * - custom slots are numbered 27-31
 * - a custom name is prompted on first save
 * - h/m/s input defines the time
 * - saved custom settings persist across a reload
 *
 * Each test runs in a fresh browser context, so localStorage starts empty.
 */

if (process.env.AQAA_BASE_URL) {
  test.use({ baseURL: process.env.AQAA_BASE_URL });
}

async function openApp(page) {
  await page.goto('./');
  await page.waitForSelector('.clock-container');
  await page.waitForFunction(() => !!window.__tempoMateApp);
}

async function openCustomTab(page) {
  await page.click('#btn-settings');
  await expect(page.locator('.settings-panel')).toBeVisible();
  await page.click('.settings-tab:has-text("Custom")');
  await expect(page.locator('.custom-list')).toBeVisible();
}

function timeGroup(page, label) {
  return page.locator('.time-input-group', { hasText: label }).first();
}

async function setTime(group, h, m, s) {
  await group.getByLabel('h', { exact: true }).fill(String(h));
  await group.getByLabel('m', { exact: true }).fill(String(m));
  await group.getByLabel('s', { exact: true }).fill(String(s));
}

test.describe('Custom Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('custom slots are numbered 27-31 and start empty', async ({ page }) => {
    await openCustomTab(page);
    const items = page.locator('.custom-item');
    await expect(items).toHaveCount(5);
    await expect(items.nth(0).locator('.custom-label')).toContainText('#27');
    await expect(items.nth(4).locator('.custom-label')).toContainText('#31');
    await expect(items.nth(0).locator('.custom-desc')).toHaveText('Empty');
    await expect(items.nth(0).getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(items.nth(0).getByRole('button', { name: 'Use' })).toHaveCount(0);
  });

  test('creates a custom time control, prompts for a name, uses it and keeps it after reload', async ({ page }) => {
    await openCustomTab(page);
    await page.locator('.custom-item').nth(0).getByRole('button', { name: 'Create' }).click();
    await expect(page.locator('.custom-edit-form')).toBeVisible();
    await expect(page.locator('.settings-header h2')).toHaveText('Edit Custom #27');

    // Set main time to 0h 7m 30s
    await setTime(timeGroup(page, 'Main time'), 0, 7, 30);

    // First save with the default name: user is prompted to name the mode, nothing is saved
    await page.getByRole('button', { name: 'Save & Use' }).click();
    await expect(page.locator('.name-hint')).toBeVisible();
    await expect(page.locator('#settings-panel')).not.toHaveClass(/hidden/);
    const storedBefore = await page.evaluate(() => localStorage.getItem('tempomate_custom_options'));
    expect(storedBefore).toBeNull();

    // Enter a name and save again
    const nameInput = page.locator('.custom-edit-form input[type="text"]');
    await nameInput.fill('Club Blitz');
    await expect(page.locator('.name-hint')).toHaveCount(0);
    await page.getByRole('button', { name: 'Save & Use' }).click();

    // Panel closes and the clock uses the custom time control
    await expect(page.locator('#settings-panel')).toHaveClass(/hidden/);
    await expect(page.locator('.clock-left .clock-time')).toHaveText('7:30');
    await expect(page.locator('.clock-right .clock-time')).toHaveText('7:30');
    await expect(page.locator('.status-option')).toContainText('#27');

    // Reload: the custom option is still selected and still listed
    await page.reload();
    await page.waitForSelector('.clock-container');
    await page.waitForFunction(() => !!window.__tempoMateApp);
    await expect(page.locator('.clock-left .clock-time')).toHaveText('7:30');
    await expect(page.locator('.clock-right .clock-time')).toHaveText('7:30');
    await expect(page.locator('.status-option')).toContainText('#27');

    await openCustomTab(page);
    const first = page.locator('.custom-item').nth(0);
    await expect(first.locator('.custom-desc')).toHaveText('Club Blitz');
    await expect(first.getByRole('button', { name: 'Use' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Edit' })).toBeVisible();

    // Editing shows the persisted values
    await first.getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('.custom-edit-form input[type="text"]')).toHaveValue('Club Blitz');
    const main = timeGroup(page, 'Main time');
    await expect(main.getByLabel('h', { exact: true })).toHaveValue('0');
    await expect(main.getByLabel('m', { exact: true })).toHaveValue('7');
    await expect(main.getByLabel('s', { exact: true })).toHaveValue('30');
  });

  test('saves an asymmetric multi-period option without using it, then uses it after reload', async ({ page }) => {
    await openCustomTab(page);
    await page.locator('.custom-item').nth(1).getByRole('button', { name: 'Create' }).click();
    await expect(page.locator('.settings-header h2')).toHaveText('Edit Custom #28');

    await page.locator('.custom-edit-form input[type="text"]').fill('Handicap');
    await page.getByLabel('Different times per player').check();
    await expect(timeGroup(page, 'Right player time')).toBeVisible();

    await setTime(timeGroup(page, 'Main time'), 0, 10, 0);
    await setTime(timeGroup(page, 'Right player time'), 0, 4, 0);

    // Add a second period (full period configuration, up to 4 periods)
    await page.getByRole('button', { name: '+ Add Period' }).click();
    await expect(page.locator('.period-form')).toHaveCount(2);

    // Save only: return to the list, current game unchanged (preset #01)
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.custom-list')).toBeVisible();
    const slot = page.locator('.custom-item').nth(1);
    await expect(slot.locator('.custom-desc')).toHaveText('Handicap');
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-panel')).toHaveClass(/hidden/);
    await expect(page.locator('.status-option')).toContainText('#01');
    await expect(page.locator('.clock-left .clock-time')).toHaveText('5:00');

    // Reload and use the saved option
    await page.reload();
    await page.waitForSelector('.clock-container');
    await page.waitForFunction(() => !!window.__tempoMateApp);
    await expect(page.locator('.status-option')).toContainText('#01');

    await openCustomTab(page);
    const reloadedSlot = page.locator('.custom-item').nth(1);
    await expect(reloadedSlot.locator('.custom-desc')).toHaveText('Handicap');
    await reloadedSlot.getByRole('button', { name: 'Use' }).click();

    await expect(page.locator('#settings-panel')).toHaveClass(/hidden/);
    await expect(page.locator('.status-option')).toContainText('#28');
    await expect(page.locator('.clock-left .clock-time')).toHaveText('10:00');
    await expect(page.locator('.clock-right .clock-time')).toHaveText('4:00');

    // Both periods were persisted
    await page.click('#btn-settings');
    await page.click('.settings-tab:has-text("Custom")');
    await page.locator('.custom-item').nth(1).getByRole('button', { name: 'Edit' }).click();
    await expect(page.locator('.period-form')).toHaveCount(2);
    await expect(page.getByLabel('Different times per player')).toBeChecked();
  });
});
