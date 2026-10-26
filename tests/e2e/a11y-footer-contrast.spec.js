import { test, expect } from '@playwright/test';

test.describe('Footer link contrast', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForSelector('.clock-container');
  });

  test('footer link to cuong.net/tempomate meets WCAG AA contrast (4.5:1)', async ({ page }) => {
    const link = page.locator('a[href$="tempomate"]');
    await expect(link).toBeVisible();

    const ratio = await link.evaluate((el) => {
      const parse = (c) => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r, g, b, a };
      };
      const luminance = ({ r, g, b }) => {
        const ch = [r, g, b].map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
      };
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let node = el; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c.a > 0) { bg = c; break; }
      }
      const fg = parse(getComputedStyle(el).color);
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    });

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
