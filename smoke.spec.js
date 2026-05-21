const { test, expect } = require('@playwright/test');

const base = 'http://127.0.0.1:8765/';

test.describe('static app smoke', () => {
  for (const viewport of [
    { name: 'desktop-tight', width: 1512, height: 820 },
    { name: 'desktop-short', width: 1440, height: 760 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(viewport.name, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript(() => {
        localStorage.setItem('foxesWheelStats', '{bad json');
        localStorage.setItem('foxesExpedites', JSON.stringify({ '2026-P2': '<img src=x onerror=alert(1)>', bad: 7 }));
        localStorage.setItem('foxesSound', 'false');
      });
      await page.goto(`${base}?day=5`);
      await expect(page.locator('#spinButton')).toBeEnabled();
      await expect(page.locator('#wheelChart')).toBeVisible();
      await expect(page.locator('#currentStreakDisplay')).toHaveText('No picks yet');
      await expect(page.locator('#expeditesTotal')).toHaveText('0');
      await expect(page.locator('#soundToggle')).toHaveAttribute('aria-label', 'Enable chime');

      const metrics = await page.evaluate(() => {
        const rect = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        };
        return {
          innerHeight,
          innerWidth,
          spin: rect('#spinButton'),
          aside: rect('aside'),
          canvas: rect('#wheelChart'),
          bodyScrollWidth: document.body.scrollWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          buttonsMissingType: Array.from(document.querySelectorAll('button')).filter(button => button.type !== 'button').length,
        };
      });

      expect(metrics.canvas.width).toBeGreaterThan(100);
      expect(metrics.canvas.height).toBeGreaterThan(100);
      expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
      expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
      expect(metrics.buttonsMissingType).toBe(0);
      if (viewport.width >= 768) {
        expect(metrics.spin.bottom).toBeLessThanOrEqual(metrics.innerHeight);
        expect(metrics.aside.bottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
      }
    });
  }

  test('reduced-motion spin returns focus to winner modal quickly', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1024, height: 720 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(`${base}?day=5`);
    await expect(page.locator('#spinButton')).toBeEnabled();
    await page.click('#spinButton');
    await expect(page.locator('#winner.flex')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('#spinButton')).toBeEnabled();
    await expect(page.locator('#closeWinner')).toBeFocused();
    await expect(page.locator('#chartContainer')).toHaveCSS('transition-duration', '0s');
    await context.close();
  });

  test('edit modal traps focus and clears inert state on close', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto(base);
    await page.locator('.q-edit-btn').first().click();
    await expect(page.locator('#editModalOverlay.flex')).toBeVisible();
    await expect(page.locator('#modalSaveBtn')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#modalDecBtn')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#modalSaveBtn')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#editModalOverlay')).toHaveClass(/hidden/);
    await expect(page.locator('.relative.z-10')).not.toHaveAttribute('inert', '');
  });
});
