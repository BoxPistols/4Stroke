import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.describe('Desktop Views', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should render main page correctly', async ({ page }) => {
      await page.goto('/main.html');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('desktop-main.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should render login page correctly', async ({ page }) => {
      await page.goto('/login.html');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('desktop-login.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should show user info at bottom-left', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');
      await expect(userInfo).toBeVisible();

      const box = await userInfo.boundingBox();
      expect(box.x).toBeLessThan(100); // Left side
      expect(box.y).toBeGreaterThan(page.viewportSize().height - 200); // Bottom
    });

    test('should display garage grid layout', async ({ page }) => {
      await page.goto('/main.html');
      const garageStrokes = page.locator('.garage-strokes').first();
      await expect(garageStrokes).toBeVisible();

      await expect(garageStrokes).toHaveScreenshot('desktop-garage-grid.png');
    });
  });

  test.describe('Mobile Views - Portrait', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render main page on mobile', async ({ page }) => {
      await page.goto('/main.html');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('mobile-main.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should show icon-only navigation', async ({ page }) => {
      await page.goto('/main.html');
      const nav = page.locator('.garages-nav');
      await expect(nav).toBeVisible();
      await expect(nav).toHaveScreenshot('mobile-nav.png');
    });

    test('should show circular user info button', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');
      await expect(userInfo).toBeVisible();

      const box = await userInfo.boundingBox();
      expect(box.width).toBeLessThanOrEqual(50);
      expect(box.height).toBeLessThanOrEqual(50);
    });

    test('should use single column grid on mobile', async ({ page }) => {
      await page.goto('/main.html');
      const garageStrokes = page.locator('.garage-strokes').first();
      await expect(garageStrokes).toBeVisible();

      await expect(garageStrokes).toHaveScreenshot('mobile-garage-grid.png');
    });

    test('should expand user info on click', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');

      await userInfo.click();
      await page.waitForTimeout(300);

      await expect(userInfo).toHaveClass(/expanded/);
      await expect(userInfo).toHaveScreenshot('mobile-user-info-expanded.png');
    });
  });

  test.describe('Tablet Views', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should render main page on tablet', async ({ page }) => {
      await page.goto('/main.html');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot('tablet-main.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should use 2-column grid on tablet', async ({ page }) => {
      await page.goto('/main.html');
      const garageStrokes = page.locator('.garage-strokes').first();
      await expect(garageStrokes).toBeVisible();

      await expect(garageStrokes).toHaveScreenshot('tablet-garage-grid.png');
    });
  });

  test.describe('Component Visual Tests', () => {
    test('should render garage container', async ({ page }) => {
      await page.goto('/main.html');
      const garage = page.locator('.garage').first();
      await expect(garage).toBeVisible();
      await expect(garage).toHaveScreenshot('component-garage.png');
    });

    test('should render stroke box', async ({ page }) => {
      await page.goto('/main.html');
      const strokeBox = page.locator('.garage-stroke-box').first();
      await expect(strokeBox).toBeVisible();
      await expect(strokeBox).toHaveScreenshot('component-stroke-box.png');
    });

    test('should render logout button', async ({ page }) => {
      await page.goto('/main.html');
      const logoutBtn = page.locator('#logout-btn');
      await expect(logoutBtn).toBeVisible();
      await expect(logoutBtn).toHaveScreenshot('component-logout-btn.png');
    });

    test('should show hover state on button', async ({ page }) => {
      await page.goto('/main.html');
      const logoutBtn = page.locator('#logout-btn');
      await logoutBtn.hover();
      await page.waitForTimeout(200);
      await expect(logoutBtn).toHaveScreenshot('component-logout-btn-hover.png');
    });
  });

  test.describe('Glassmorphism Effects', () => {
    test('should render glassmorphism on garage containers', async ({ page }) => {
      await page.goto('/main.html');
      const garage = page.locator('.garage').first();
      await expect(garage).toHaveCSS('backdrop-filter', /blur/);
    });

    test('should render glassmorphism on user info', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');
      await expect(userInfo).toHaveCSS('backdrop-filter', /blur/);
    });

    test('should have semi-transparent backgrounds', async ({ page }) => {
      await page.goto('/main.html');
      const garage = page.locator('.garage').first();
      await expect(garage).toHaveCSS('background-color', /rgba/);
    });
  });

  test.describe('Dark Mode Compatibility', () => {
    test('should maintain contrast in dark color scheme', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/main.html');
      await expect(page).toHaveScreenshot('dark-mode-main.png', {
        fullPage: true,
      });
    });
  });
});
