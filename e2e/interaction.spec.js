import { test, expect } from '@playwright/test';

test.describe('User Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start with login page
    await page.goto('/login.html');
  });

  test.describe('Local Mode Flow', () => {
    test('should switch to local mode from login page', async ({ page }) => {
      const localModeBtn = page.locator('button:has-text("LOCAL MODE")');
      await expect(localModeBtn).toBeVisible();
      await localModeBtn.click();

      await page.waitForURL('**/main.html');
      await expect(page).toHaveURL(/main\.html/);
    });

    test('should show "Local Mode" in user email', async ({ page }) => {
      await page.goto('/main.html');
      await page.evaluate(() => {
        localStorage.setItem('storage_mode', 'local');
      });
      await page.reload();

      const userEmail = page.locator('#user-email');
      await expect(userEmail).toHaveText(/Local Mode/i);
    });

    test('should show "ONLINE MODE" button in local mode', async ({ page }) => {
      await page.goto('/main.html');
      await page.evaluate(() => {
        localStorage.setItem('storage_mode', 'local');
      });
      await page.reload();

      const logoutBtn = page.locator('#logout-btn .logout-text');
      await expect(logoutBtn).toHaveText(/ONLINE MODE/i);
    });
  });

  test.describe('Garage Title Editing', () => {
    test('should edit garage title', async ({ page }) => {
      await page.goto('/main.html');
      const title = page.locator('.stroke-title').first();

      await title.click();
      await title.fill('New Garage Title');
      await title.blur();

      await expect(title).toHaveText('New Garage Title');
    });

    test('should save title on blur', async ({ page }) => {
      await page.goto('/main.html');
      const title = page.locator('.stroke-title').first();

      await title.click();
      await title.fill('Test Title');
      await title.blur();
      await page.waitForTimeout(500);

      await page.reload();
      await expect(title).toHaveText('Test Title');
    });
  });

  test.describe('Stroke Text Input', () => {
    test('should type in stroke textarea', async ({ page }) => {
      await page.goto('/main.html');
      const textarea = page.locator('textarea').first();

      await textarea.fill('This is my stroke content');
      await expect(textarea).toHaveValue('This is my stroke content');
    });

    test('should save stroke on blur', async ({ page }) => {
      await page.goto('/main.html');
      const textarea = page.locator('textarea').first();

      await textarea.fill('Test stroke');
      await textarea.blur();
      await page.waitForTimeout(500);

      await page.reload();
      await expect(textarea).toHaveValue('Test stroke');
    });

    test('should clear stroke with clear button', async ({ page }) => {
      await page.goto('/main.html');
      const textarea = page.locator('textarea').first();
      await textarea.fill('Content to clear');

      const clearBtn = page.locator('.clear-btn').first();
      await clearBtn.click();

      await expect(textarea).toHaveValue('');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between garages', async ({ page }) => {
      await page.goto('/main.html');

      const linkB = page.locator('a[href="#garageB"]');
      await linkB.click();

      await expect(page).toHaveURL(/#garageB/);
    });

    test('should scroll to garage on click', async ({ page }) => {
      await page.goto('/main.html');
      await page.waitForLoadState('networkidle');

      const linkC = page.locator('a[href="#garageC"]');
      await linkC.click();

      const garageC = page.locator('#garageC');
      await expect(garageC).toBeInViewport();
    });
  });

  test.describe('Mobile Launcher Interaction', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should expand user info on mobile click', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');

      await userInfo.click();
      await expect(userInfo).toHaveClass(/expanded/);
    });

    test('should show user email when expanded', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');
      const userEmail = page.locator('#user-email');

      // Should be hidden initially
      await expect(userEmail).not.toBeVisible();

      // Click to expand
      await userInfo.click();
      await expect(userEmail).toBeVisible();
    });

    test('should show full button text when expanded', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');
      const logoutText = page.locator('#logout-btn .logout-text');

      // Click to expand
      await userInfo.click();
      await expect(logoutText).toBeVisible();
    });

    test('should collapse when clicking outside', async ({ page }) => {
      await page.goto('/main.html');
      const userInfo = page.locator('.user-info');

      await userInfo.click();
      await expect(userInfo).toHaveClass(/expanded/);

      await page.locator('body').click({ position: { x: 200, y: 200 } });
      await expect(userInfo).not.toHaveClass(/expanded/);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate with Tab key', async ({ page }) => {
      await page.goto('/main.html');

      await page.keyboard.press('Tab');
      const firstFocusable = await page.evaluate(() => document.activeElement.tagName);
      expect(['A', 'BUTTON', 'TEXTAREA']).toContain(firstFocusable);
    });

    test('should activate buttons with Enter key', async ({ page }) => {
      await page.goto('/main.html');

      const logoutBtn = page.locator('#logout-btn');
      await logoutBtn.focus();
      await page.keyboard.press('Enter');

      // Should navigate or show confirmation
      await page.waitForTimeout(500);
    });

    test('should focus textareas with Tab', async ({ page }) => {
      await page.goto('/main.html');

      const textarea = page.locator('textarea').first();
      await textarea.focus();

      const isFocused = await textarea.evaluate((el) => document.activeElement === el);
      expect(isFocused).toBeTruthy();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should show full navigation on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/main.html');

      const navLink = page.locator('.garages-nav a').first();
      await expect(navLink).toHaveText(/GARAGE/);
    });

    test('should show letter-only navigation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/main.html');

      const navLink = page.locator('.garages-nav a').first();
      const text = await navLink.textContent();
      expect(text.length).toBeLessThanOrEqual(1);
    });

    test('should hide logo text on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/main.html');

      const logoTitle = page.locator('.logo-title');
      await expect(logoTitle).not.toBeVisible();
    });
  });

  test.describe('Form Persistence', () => {
    test('should persist data after page reload', async ({ page }) => {
      await page.goto('/main.html');

      const textarea = page.locator('textarea').first();
      await textarea.fill('Persistent data');
      await textarea.blur();
      await page.waitForTimeout(500);

      await page.reload();
      await expect(textarea).toHaveValue('Persistent data');
    });

    test('should load multiple garage data', async ({ page }) => {
      await page.goto('/main.html');

      const textareas = page.locator('textarea');
      const count = await textareas.count();
      expect(count).toBeGreaterThanOrEqual(16); // 4 garages × 4 strokes
    });
  });
});
