import { test, expect } from '@playwright/test';

test.describe('New Features E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to main page in local mode
    await page.goto('/main.html');
    await page.evaluate(() => {
      localStorage.setItem('storage_mode', 'local');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate to next garage with ArrowDown', async ({ page }) => {
      // Ensure we're at the top
      await page.evaluate(() => window.scrollTo(0, 0));

      // Press ArrowDown
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);

      // Check if garageB is in viewport
      const garageB = page.locator('#garageB');
      await expect(garageB).toBeInViewport();
    });

    test('should navigate to previous garage with ArrowUp', async ({ page }) => {
      // Start at garageC
      await page.click('a[href="#garageC"]');
      await page.waitForTimeout(500);

      // Press ArrowUp
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(500);

      // Check if garageB is in viewport
      const garageB = page.locator('#garageB');
      await expect(garageB).toBeInViewport();
    });

    test('should navigate with ArrowRight', async ({ page }) => {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);

      const garageB = page.locator('#garageB');
      await expect(garageB).toBeInViewport();
    });

    test('should navigate with ArrowLeft', async ({ page }) => {
      // Start at garageB
      await page.click('a[href="#garageB"]');
      await page.waitForTimeout(500);

      // Press ArrowLeft
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(500);

      const garageA = page.locator('#garageA');
      await expect(garageA).toBeInViewport();
    });

    test('should not navigate when typing in textarea', async ({ page }) => {
      const textarea = page.locator('textarea').first();
      await textarea.focus();

      // Press arrow key while in textarea - should not navigate
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);

      // Should still be at garageA
      const garageA = page.locator('#garageA');
      await expect(garageA).toBeInViewport();
    });

    test('should not navigate past last garage', async ({ page }) => {
      // Navigate to last garage
      await page.click('a[href="#garageD"]');
      await page.waitForTimeout(500);

      // Try to go further
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);

      // Should still be at garageD
      const garageD = page.locator('#garageD');
      await expect(garageD).toBeInViewport();
    });
  });

  test.describe('Minimap View', () => {
    test('should open minimap view when clicking toggle button', async ({ page }) => {
      const toggleBtn = page.locator('#minimap-toggle-btn');
      await expect(toggleBtn).toBeVisible();

      await toggleBtn.click();

      const minimapView = page.locator('#minimap-view');
      await expect(minimapView).toHaveClass(/active/);
    });

    test('should display all 16 note cards in minimap', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const noteCards = page.locator('.minimap-note');
      await expect(noteCards).toHaveCount(16);
    });

    test('should close minimap with close button', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const closeBtn = page.locator('#minimap-close-btn');
      await closeBtn.click();

      const minimapView = page.locator('#minimap-view');
      await expect(minimapView).not.toHaveClass(/active/);
    });

    test('should close minimap with Escape key', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      await page.keyboard.press('Escape');

      const minimapView = page.locator('#minimap-view');
      await expect(minimapView).not.toHaveClass(/active/);
    });

    test('should sync content from main view to minimap', async ({ page }) => {
      // Add content to first textarea in main view
      const mainTextarea = page.locator('#stroke1');
      await mainTextarea.fill('Test content in main view');
      await page.waitForTimeout(600);

      // Open minimap
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      // Check minimap textarea has same content
      const minimapTextarea = page.locator('#minimap-textarea-1');
      await expect(minimapTextarea).toHaveValue('Test content in main view');
    });

    test('should edit content in minimap textarea', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const minimapTextarea = page.locator('#minimap-textarea-1');
      await minimapTextarea.fill('Edited in minimap');
      await minimapTextarea.blur();
      await page.waitForTimeout(600);

      // Close minimap
      await page.keyboard.press('Escape');

      // Check main view has updated content
      const mainTextarea = page.locator('#stroke1');
      await expect(mainTextarea).toHaveValue('Edited in minimap');
    });

    test('should show correct garage names and note titles', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const firstNote = page.locator('.minimap-note').first();
      const garageName = firstNote.locator('.garage-name');
      const noteTitle = firstNote.locator('.note-title');

      await expect(garageName).toHaveText('GARAGE-A');
      await expect(noteTitle).toHaveText('Key');
    });

    test('should display color-coded note cards', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const notes = page.locator('.minimap-note');

      // Check first 4 notes have different stroke classes
      await expect(notes.nth(0)).toHaveClass(/stroke-1/);
      await expect(notes.nth(1)).toHaveClass(/stroke-2/);
      await expect(notes.nth(2)).toHaveClass(/stroke-3/);
      await expect(notes.nth(3)).toHaveClass(/stroke-4/);
    });

    test('should perform drag and drop to swap notes', async ({ page }) => {
      // Add content to two notes
      await page.fill('#stroke1', 'Content A');
      await page.fill('#stroke2', 'Content B');
      await page.waitForTimeout(600);

      // Open minimap
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      // Drag note 1 to note 2
      const note1 = page.locator('.minimap-note').nth(0);
      const note2 = page.locator('.minimap-note').nth(1);

      await note1.dragTo(note2);
      await page.waitForTimeout(600);

      // Check that contents are swapped in minimap
      const minimapTextarea1 = page.locator('#minimap-textarea-1');
      const minimapTextarea2 = page.locator('#minimap-textarea-2');

      await expect(minimapTextarea1).toHaveValue('Content B');
      await expect(minimapTextarea2).toHaveValue('Content A');

      // Close minimap and verify main view
      await page.keyboard.press('Escape');

      await expect(page.locator('#stroke1')).toHaveValue('Content B');
      await expect(page.locator('#stroke2')).toHaveValue('Content A');
    });

    test('should toggle button state when opening/closing', async ({ page }) => {
      const toggleBtn = page.locator('#minimap-toggle-btn');

      // Initially not active
      await expect(toggleBtn).not.toHaveClass(/active/);

      // Click to open
      await toggleBtn.click();
      await expect(toggleBtn).toHaveClass(/active/);

      // Click again to close
      await toggleBtn.click();
      await expect(toggleBtn).not.toHaveClass(/active/);
    });
  });

  test.describe('Settings Modal', () => {
    test('should open settings modal when clicking settings button', async ({ page }) => {
      const settingsBtn = page.locator('#settings-btn');
      await expect(settingsBtn).toBeVisible();

      await settingsBtn.click();

      const modal = page.locator('#settings-modal');
      await expect(modal).toHaveClass(/active/);
    });

    test('should close settings modal with close button', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      const closeBtn = page.locator('#modal-close-btn');
      await closeBtn.click();

      const modal = page.locator('#settings-modal');
      await expect(modal).not.toHaveClass(/active/);
    });

    test('should close settings modal with cancel button', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      const cancelBtn = page.locator('#cancel-settings-btn');
      await cancelBtn.click();

      const modal = page.locator('#settings-modal');
      await expect(modal).not.toHaveClass(/active/);
    });

    test('should close settings modal when clicking outside', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      const modal = page.locator('#settings-modal');
      await modal.click({ position: { x: 5, y: 5 } });

      await expect(modal).not.toHaveClass(/active/);
    });

    test('should display shortcut configuration inputs', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      // Check all garage shortcut inputs exist
      await expect(page.locator('#garageA-key')).toBeVisible();
      await expect(page.locator('#garageB-key')).toBeVisible();
      await expect(page.locator('#garageC-key')).toBeVisible();
      await expect(page.locator('#garageD-key')).toBeVisible();
    });

    test('should display garage order configuration', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      const orderList = page.locator('#garage-order-list');
      await expect(orderList).toBeVisible();

      const orderItems = page.locator('.garage-order-item');
      await expect(orderItems).toHaveCount(4);
    });

    test('should change shortcut key', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      const keyInput = page.locator('#garageA-key');
      await keyInput.fill('x');

      const ctrlCheckbox = page.locator('#garageA-ctrl');
      await ctrlCheckbox.check();

      const saveBtn = page.locator('#save-settings-btn');

      // Handle the alert
      page.on('dialog', dialog => dialog.accept());

      await saveBtn.click();
      await page.waitForTimeout(300);
    });

    test('should reset settings to defaults', async ({ page }) => {
      await page.click('#settings-btn');
      await page.waitForTimeout(300);

      // Handle confirmation and alert dialogs
      page.on('dialog', dialog => dialog.accept());

      const resetBtn = page.locator('#reset-settings-btn');
      await resetBtn.click();
      await page.waitForTimeout(300);

      // Modal should close
      const modal = page.locator('#settings-modal');
      await expect(modal).not.toHaveClass(/active/);
    });
  });

  test.describe('Garage Shortcuts', () => {
    test('should navigate with default shortcut Ctrl+1', async ({ page }) => {
      // Ensure we start at top
      await page.evaluate(() => window.scrollTo(0, 0));

      // Press Ctrl+1
      await page.keyboard.press('Control+1');
      await page.waitForTimeout(500);

      const garageA = page.locator('#garageA');
      await expect(garageA).toBeInViewport();
    });

    test('should navigate with Ctrl+2 to garage B', async ({ page }) => {
      await page.keyboard.press('Control+2');
      await page.waitForTimeout(500);

      const garageB = page.locator('#garageB');
      await expect(garageB).toBeInViewport();
    });

    test('should navigate with Ctrl+3 to garage C', async ({ page }) => {
      await page.keyboard.press('Control+3');
      await page.waitForTimeout(500);

      const garageC = page.locator('#garageC');
      await expect(garageC).toBeInViewport();
    });

    test('should navigate with Ctrl+4 to garage D', async ({ page }) => {
      await page.keyboard.press('Control+4');
      await page.waitForTimeout(500);

      const garageD = page.locator('#garageD');
      await expect(garageD).toBeInViewport();
    });
  });

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should show minimap button on mobile', async ({ page }) => {
      const minimapBtn = page.locator('#minimap-toggle-btn');
      await expect(minimapBtn).toBeVisible();
    });

    test('should show settings button on mobile', async ({ page }) => {
      const settingsBtn = page.locator('#settings-btn');
      await expect(settingsBtn).toBeVisible();
    });

    test('should display 2-column grid in minimap on mobile', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const grid = page.locator('#minimap-grid');
      const computedStyle = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      // Should have 2 columns on mobile (375px)
      expect(computedStyle.split(' ').length).toBeGreaterThanOrEqual(2);
    });

    test('should open minimap in fullscreen on mobile', async ({ page }) => {
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      const minimapView = page.locator('#minimap-view');
      const bbox = await minimapView.boundingBox();

      expect(bbox.width).toBeGreaterThan(300);
      expect(bbox.height).toBeGreaterThan(600);
    });
  });

  test.describe('Integration Tests', () => {
    test('should maintain data consistency between views', async ({ page }) => {
      const testContent = 'Integration test content';

      // Add content in main view
      await page.fill('#stroke1', testContent);
      await page.waitForTimeout(600);

      // Verify in main view
      await expect(page.locator('#stroke1')).toHaveValue(testContent);

      // Open minimap
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      // Verify in minimap
      await expect(page.locator('#minimap-textarea-1')).toHaveValue(testContent);

      // Edit in minimap
      const newContent = 'Edited in minimap view';
      await page.fill('#minimap-textarea-1', newContent);
      await page.waitForTimeout(600);

      // Close minimap
      await page.keyboard.press('Escape');

      // Verify in main view
      await expect(page.locator('#stroke1')).toHaveValue(newContent);

      // Reload page and verify persistence
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#stroke1')).toHaveValue(newContent);
    });

    test('should allow navigation while minimap is open', async ({ page }) => {
      // Open minimap
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);

      // Should be able to close and use keyboard navigation
      await page.keyboard.press('Escape');

      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);

      const garageB = page.locator('#garageB');
      await expect(garageB).toBeInViewport();
    });

    test('should allow settings and minimap to be opened sequentially', async ({ page }) => {
      // Open settings
      await page.click('#settings-btn');
      await page.waitForTimeout(300);
      await expect(page.locator('#settings-modal')).toHaveClass(/active/);

      // Close settings
      await page.click('#modal-close-btn');
      await page.waitForTimeout(300);

      // Open minimap
      await page.click('#minimap-toggle-btn');
      await page.waitForTimeout(300);
      await expect(page.locator('#minimap-view')).toHaveClass(/active/);
    });
  });
});
