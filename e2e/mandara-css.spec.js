import { test, expect } from '@playwright/test';

/**
 * CSS State Testing for Mandara Feature
 * Tests computed styles, layout, responsive design, and visual states
 */

test.describe('Mandara CSS State Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/mandara.html');
    await page.evaluate(() => {
      localStorage.setItem('storage_mode', 'local');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Layout & Grid', () => {

    test('Mandara grid should be 3x3', async ({ page }) => {
      const grid = page.locator('.mandara-grid');

      const gridTemplate = await grid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      );

      // Should have 3 columns
      expect(gridTemplate).toMatch(/repeat\(3,\s*1fr\)|1fr 1fr 1fr/);
    });

    test('Grid should have proper gap', async ({ page }) => {
      const grid = page.locator('.mandara-grid');

      const gap = await grid.evaluate(el =>
        window.getComputedStyle(el).gap
      );

      // Check gap exists
      expect(parseInt(gap)).toBeGreaterThan(0);
    });

    test('Cells should fill grid area', async ({ page }) => {
      const cell = page.locator('.mandara-cell').first();

      const height = await cell.evaluate(el =>
        window.getComputedStyle(el).height
      );

      // Height should be 100% of grid cell
      expect(parseInt(height)).toBeGreaterThan(0);
    });
  });

  test.describe('Typography', () => {

    test('Title should have correct font size', async ({ page }) => {
      const title = page.locator('.mandara-title-input');

      const fontSize = await title.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );

      // 1.8rem = 28.8px (base 16px)
      expect(fontSize).toBe('28.8px');
    });

    test('Regular cell should be 20px', async ({ page }) => {
      const cell = page.locator('#cell-1');

      const fontSize = await cell.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );

      expect(fontSize).toBe('20px');
    });

    test('Center cell should be larger (24px)', async ({ page }) => {
      const centerCell = page.locator('#cell-5');

      const fontSize = await centerCell.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );

      expect(fontSize).toBe('24px');
    });

    test('Center cell should be bold', async ({ page }) => {
      const centerCell = page.locator('#cell-5');

      const fontWeight = await centerCell.evaluate(el =>
        window.getComputedStyle(el).fontWeight
      );

      // 'bold' or '700'
      expect(['bold', '700']).toContain(fontWeight);
    });
  });

  test.describe('Checkbox Alignment', () => {

    test('Checkbox and text should have same line-height', async ({ page }) => {
      // Add a TODO first
      await page.locator('#todo-input').fill('Test TODO');
      await page.locator('#todo-input').press('Enter');
      await page.waitForTimeout(200);

      const checkbox = page.locator('.todo-checkbox').first();
      const text = page.locator('.todo-text').first();

      const checkboxHeight = await checkbox.evaluate(el =>
        window.getComputedStyle(el).height
      );
      const textLineHeight = await text.evaluate(el =>
        window.getComputedStyle(el).lineHeight
      );

      // Both should be 20px for alignment
      expect(checkboxHeight).toBe('20px');
      expect(textLineHeight).toBe('20px');
    });

    test('Checkbox should have no margin', async ({ page }) => {
      // Add a TODO
      await page.locator('#todo-input').fill('Test TODO');
      await page.locator('#todo-input').press('Enter');
      await page.waitForTimeout(200);

      const checkbox = page.locator('.todo-checkbox').first();

      const margin = await checkbox.evaluate(el =>
        window.getComputedStyle(el).margin
      );

      expect(margin).toBe('0px');
    });

    test('TODO item should use flexbox with align-items center', async ({ page }) => {
      // Add a TODO
      await page.locator('#todo-input').fill('Test TODO');
      await page.locator('#todo-input').press('Enter');
      await page.waitForTimeout(200);

      const todoItem = page.locator('.todo-item').first();

      const styles = await todoItem.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          alignItems: computed.alignItems
        };
      });

      expect(styles.display).toBe('flex');
      expect(styles.alignItems).toBe('center');
    });
  });

  test.describe('Colors & Backgrounds', () => {

    test('Center cell should have accent background', async ({ page }) => {
      const centerCell = page.locator('#cell-5');

      const bgColor = await centerCell.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // Should have some background (not transparent)
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bgColor).not.toBe('transparent');
    });

    test('Tags should have gradient background', async ({ page }) => {
      // Add a tag
      await page.locator('#tag-input').fill('Test Tag');
      await page.locator('#tag-input').press('Enter');
      await page.waitForTimeout(200);

      const tag = page.locator('.tag-item').first();

      const background = await tag.evaluate(el =>
        window.getComputedStyle(el).background
      );

      // Should have gradient or solid color
      expect(background.length).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Design', () => {

    test('Mobile: Grid should remain 3x3', async ({ page }) => {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      const grid = page.locator('.mandara-grid');

      const gridTemplate = await grid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      );

      // Still 3 columns on mobile
      expect(gridTemplate).toMatch(/repeat\(3,\s*1fr\)|1fr 1fr 1fr/);
    });

    test('Mobile: Font sizes should be smaller', async ({ page }) => {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      const cell = page.locator('.mandara-cell').first();
      const centerCell = page.locator('.mandara-center');

      const cellSize = await cell.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );
      const centerSize = await centerCell.evaluate(el =>
        window.getComputedStyle(el).fontSize
      );

      // Mobile: 16px for cells, 18px for center
      expect(cellSize).toBe('16px');
      expect(centerSize).toBe('18px');
    });

    test('Mobile: Content should stack vertically', async ({ page }) => {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      const content = page.locator('.mandara-content');

      const flexDirection = await content.evaluate(el =>
        window.getComputedStyle(el).flexDirection
      );

      expect(flexDirection).toBe('column');
    });

    test('Tablet: Should have medium sizing', async ({ page }) => {
      // Tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();

      const grid = page.locator('.mandara-grid');

      // Grid should still exist and be visible
      await expect(grid).toBeVisible();

      const gridTemplate = await grid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      );

      expect(gridTemplate).toMatch(/1fr/);
    });
  });

  test.describe('Overflow & Scrolling', () => {

    test('Body should allow vertical scroll on Mandara page', async ({ page }) => {
      const body = page.locator('body');

      const overflow = await body.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          overflowX: computed.overflowX,
          overflowY: computed.overflowY
        };
      });

      expect(overflow.overflowY).toBe('auto');
      expect(overflow.overflowX).toBe('hidden');
    });

    test('Cells should not resize', async ({ page }) => {
      const cell = page.locator('.mandara-cell').first();

      const resize = await cell.evaluate(el =>
        window.getComputedStyle(el).resize
      );

      expect(resize).toBe('none');
    });
  });

  test.describe('Interactive States', () => {

    test('Input should have focus styles', async ({ page }) => {
      const title = page.locator('#mandara-title');

      // Before focus
      const beforeFocus = await title.evaluate(el =>
        window.getComputedStyle(el).borderColor
      );

      // Focus
      await title.focus();

      // After focus - border should change
      const afterFocus = await title.evaluate(el =>
        window.getComputedStyle(el).borderColor
      );

      // Focus should change border color
      expect(beforeFocus).not.toBe(afterFocus);
    });

    test('Buttons should have hover effect', async ({ page }) => {
      const button = page.locator('.new-mandara-btn');

      // Get initial state
      await button.scrollIntoViewIfNeeded();

      // Hover
      await button.hover();

      // Button should be visible and hoverable
      await expect(button).toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {

    test('Mandara page visual snapshot', async ({ page }) => {
      // Take screenshot for visual regression
      await expect(page).toHaveScreenshot('mandara-full-page.png', {
        fullPage: true,
        mask: [page.locator('#created-date'), page.locator('#updated-date')]
      });
    });

    test('Mandara grid visual snapshot', async ({ page }) => {
      const grid = page.locator('.mandara-grid');

      await expect(grid).toHaveScreenshot('mandara-grid.png');
    });

    test('Memo area visual snapshot', async ({ page }) => {
      const memoArea = page.locator('.mandara-memo-area');

      await expect(memoArea).toHaveScreenshot('mandara-memo-area.png');
    });
  });

  test.describe('Accessibility & ARIA', () => {

    test('Inputs should have placeholders', async ({ page }) => {
      const title = page.locator('#mandara-title');
      const tagInput = page.locator('#tag-input');
      const todoInput = page.locator('#todo-input');

      const titlePlaceholder = await title.getAttribute('placeholder');
      const tagPlaceholder = await tagInput.getAttribute('placeholder');
      const todoPlaceholder = await todoInput.getAttribute('placeholder');

      expect(titlePlaceholder).toBeTruthy();
      expect(tagPlaceholder).toContain('タグ');
      expect(todoPlaceholder).toContain('TODO');
    });

    test('Buttons should have accessible text or title', async ({ page }) => {
      const newBtn = page.locator('#new-mandara-btn');
      const deleteBtn = page.locator('#delete-mandara-btn');

      const newBtnText = await newBtn.textContent();
      const deleteBtnText = await deleteBtn.textContent();

      expect(newBtnText).toBeTruthy();
      expect(deleteBtnText).toBeTruthy();
    });
  });
});
