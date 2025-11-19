import { test, expect } from '@playwright/test';

// Helper function to wait for auto-save
const waitForAutoSave = () => new Promise(resolve => setTimeout(resolve, 600));

test.describe('Mandara Feature - Comprehensive Tests', () => {

  test.beforeEach(async ({ page, context }) => {
    // Clear storage and ensure local mode before loading page
    await context.clearCookies();
    await page.goto('/mandara.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Ensure we're in local storage mode for tests
      localStorage.setItem('storage_mode', 'local');
    });
    // Reload with clean storage
    await page.reload();
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Test 1: Basic Functionality', () => {

    test('1.1 Create new Mandara', async ({ page }) => {
      await page.goto('/mandara.html');

      // Check that NEW button exists and click it
      const newBtn = page.locator('#new-mandara-btn');
      await expect(newBtn).toBeVisible();
      await newBtn.click();

      // Check console logs for initialization
      const logs = [];
      page.on('console', msg => {
        if (msg.type() === 'log') logs.push(msg.text());
      });

      // Wait a bit for initialization
      await page.waitForTimeout(100);

      // Verify a new mandara is created (URL should have id parameter)
      await page.waitForURL(/\?id=mandara_/);
      const url = page.url();
      expect(url).toContain('?id=mandara_');
    });

    test('1.2 Enter title and verify auto-save', async ({ page }) => {
      await page.goto('/mandara.html');

      const titleInput = page.locator('#mandara-title');
      await titleInput.fill('テストマンダラ');

      // Wait for auto-save
      await waitForAutoSave();

      // Verify save message appears
      const message = page.locator('#message');
      await expect(message).toHaveText('Auto Save...');

      // Verify data is saved in localStorage
      const saved = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 && mandaras[0].title === 'テストマンダラ';
      });
      expect(saved).toBe(true);
    });

    test('1.3 Fill 9-cell grid and verify auto-save', async ({ page }) => {
      await page.goto('/mandara.html');

      // Fill all 9 cells
      for (let i = 1; i <= 9; i++) {
        const cell = page.locator(`#cell-${i}`);
        await cell.fill(i === 5 ? '中心キーワード' : `テキスト${i}`);
        await waitForAutoSave();
      }

      // Verify all cells are saved
      const saved = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        if (mandaras.length === 0) return false;
        const cells = mandaras[0].cells;
        return cells['5'] === '中心キーワード' && cells['1'] === 'テキスト1';
      });
      expect(saved).toBe(true);
    });

    test('1.4 Enter memo and verify auto-save', async ({ page }) => {
      await page.goto('/mandara.html');

      const memo = page.locator('#mandara-memo');
      await memo.fill('これは備考メモです。\n複数行のテストです。');

      await waitForAutoSave();

      // Verify memo is saved
      const saved = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 && mandaras[0].memo.includes('備考メモ');
      });
      expect(saved).toBe(true);
    });
  });

  test.describe('Test 2: Tag Management', () => {

    test('2.1 Add a tag', async ({ page }) => {
      await page.goto('/mandara.html');

      const tagInput = page.locator('#tag-input');
      await tagInput.fill('ビジネス');
      await tagInput.press('Enter');

      // Wait for tag to appear
      await page.waitForTimeout(200);

      // Verify tag is displayed
      const tag = page.locator('.tag-item').filter({ hasText: 'ビジネス' });
      await expect(tag).toBeVisible();

      // Verify tag is saved
      const saved = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 && mandaras[0].tags.includes('ビジネス');
      });
      expect(saved).toBe(true);
    });

    test('2.2 Add multiple tags', async ({ page }) => {
      await page.goto('/mandara.html');

      const tagInput = page.locator('#tag-input');
      const tags = ['ビジネス', 'アイデア', 'プロジェクト'];

      for (const tag of tags) {
        await tagInput.fill(tag);
        await tagInput.press('Enter');
        await page.waitForTimeout(100);
      }

      // Verify all tags are displayed
      for (const tag of tags) {
        const tagElement = page.locator('.tag-item').filter({ hasText: tag });
        await expect(tagElement).toBeVisible();
      }

      // Verify count in localStorage
      const count = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 ? mandaras[0].tags.length : 0;
      });
      expect(count).toBe(3);
    });

    test('2.3 Remove a tag', async ({ page }) => {
      await page.goto('/mandara.html');

      // Add tags first
      const tagInput = page.locator('#tag-input');
      await tagInput.fill('ビジネス');
      await tagInput.press('Enter');
      await page.waitForTimeout(100);

      await tagInput.fill('アイデア');
      await tagInput.press('Enter');
      await page.waitForTimeout(100);

      // Remove the first tag
      const removeBtn = page.locator('.tag-item').first().locator('.tag-remove-btn');
      await removeBtn.click();

      await page.waitForTimeout(200);

      // Verify tag count is reduced
      const count = await page.locator('.tag-item').count();
      expect(count).toBe(1);

      // Verify in localStorage
      const savedCount = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 ? mandaras[0].tags.length : 0;
      });
      expect(savedCount).toBe(1);
    });
  });

  test.describe('Test 3: TODO Management', () => {

    test('3.1 Add a TODO', async ({ page }) => {
      await page.goto('/mandara.html');

      const todoInput = page.locator('#todo-input');
      await todoInput.fill('タスク1');
      await todoInput.press('Enter');

      await page.waitForTimeout(200);

      // Verify TODO is displayed
      const todo = page.locator('.todo-item').filter({ hasText: 'タスク1' });
      await expect(todo).toBeVisible();

      // Verify TODO is saved
      const saved = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 && mandaras[0].todos.length === 1;
      });
      expect(saved).toBe(true);
    });

    test('3.2 Add multiple TODOs', async ({ page }) => {
      await page.goto('/mandara.html');

      const todoInput = page.locator('#todo-input');
      const todos = ['タスク1', 'タスク2', 'タスク3'];

      for (const todo of todos) {
        await todoInput.fill(todo);
        await todoInput.press('Enter');
        await page.waitForTimeout(100);
      }

      // Verify all TODOs are displayed
      const count = await page.locator('.todo-item').count();
      expect(count).toBe(3);

      // Verify in localStorage
      const savedCount = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 ? mandaras[0].todos.length : 0;
      });
      expect(savedCount).toBe(3);
    });

    test('3.3 Toggle TODO checkbox', async ({ page }) => {
      await page.goto('/mandara.html');

      // Add a TODO
      const todoInput = page.locator('#todo-input');
      await todoInput.fill('タスク1');
      await todoInput.press('Enter');
      await page.waitForTimeout(200);

      // Click the checkbox
      const checkbox = page.locator('.todo-checkbox').first();
      await checkbox.check();
      await page.waitForTimeout(200);

      // Verify checkbox is checked
      await expect(checkbox).toBeChecked();

      // Verify strikethrough is applied
      const todoText = page.locator('.todo-text').first();
      await expect(todoText).toHaveCSS('text-decoration', /line-through/);

      // Verify in localStorage
      const completed = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 ? mandaras[0].todos[0].completed : false;
      });
      expect(completed).toBe(true);
    });

    test('3.4 Remove a TODO', async ({ page }) => {
      await page.goto('/mandara.html');

      // Add TODOs
      const todoInput = page.locator('#todo-input');
      await todoInput.fill('タスク1');
      await todoInput.press('Enter');
      await page.waitForTimeout(100);

      await todoInput.fill('タスク2');
      await todoInput.press('Enter');
      await page.waitForTimeout(100);

      // Remove first TODO
      const removeBtn = page.locator('.todo-item').first().locator('.todo-remove-btn');
      await removeBtn.click();
      await page.waitForTimeout(200);

      // Verify count is reduced
      const count = await page.locator('.todo-item').count();
      expect(count).toBe(1);

      // Verify in localStorage
      const savedCount = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.length > 0 ? mandaras[0].todos.length : 0;
      });
      expect(savedCount).toBe(1);
    });
  });

  test.describe('Test 4: Reload Persistence', () => {

    test('4.1 Data persists after reload', async ({ page }) => {
      await page.goto('/mandara.html');

      // Enter data
      await page.locator('#mandara-title').fill('永続テスト');
      await page.locator('#cell-5').fill('中心データ');
      await page.locator('#mandara-memo').fill('メモテスト');

      const tagInput = page.locator('#tag-input');
      await tagInput.fill('タグ1');
      await tagInput.press('Enter');
      await page.waitForTimeout(100);

      const todoInput = page.locator('#todo-input');
      await todoInput.fill('TODO1');
      await todoInput.press('Enter');

      await waitForAutoSave();

      // Get the URL with ID
      const urlBefore = page.url();
      expect(urlBefore).toContain('?id=mandara_');

      // Reload the page
      await page.reload();

      // Verify all data is still there
      await expect(page.locator('#mandara-title')).toHaveValue('永続テスト');
      await expect(page.locator('#cell-5')).toHaveValue('中心データ');
      await expect(page.locator('#mandara-memo')).toHaveValue('メモテスト');

      const tag = page.locator('.tag-item').filter({ hasText: 'タグ1' });
      await expect(tag).toBeVisible();

      const todo = page.locator('.todo-item').filter({ hasText: 'TODO1' });
      await expect(todo).toBeVisible();

      // Verify URL still has the same ID
      const urlAfter = page.url();
      expect(urlAfter).toBe(urlBefore);
    });

    test('4.2 URL parameter contains mandara ID', async ({ page }) => {
      await page.goto('/mandara.html');

      // Enter some data to trigger save
      await page.locator('#mandara-title').fill('URLテスト');
      await waitForAutoSave();

      // Check URL has id parameter
      await page.waitForURL(/\?id=mandara_/);
      const url = page.url();
      expect(url).toMatch(/\?id=mandara_\d+/);
    });
  });

  test.describe('Test 5: List and Search', () => {

    test('5.1 Open list view', async ({ page }) => {
      await page.goto('/mandara.html');

      // Create a mandara first
      await page.locator('#mandara-title').fill('リストテスト');
      await waitForAutoSave();

      // Click LIST button
      const listBtn = page.locator('#list-view-btn');
      await listBtn.click();

      // Verify list view is visible
      const listView = page.locator('#list-view');
      await expect(listView).not.toHaveClass(/is-hidden/);

      // Verify at least one mandara is in the list
      const items = page.locator('.mandara-list-item');
      await expect(items).toHaveCount(1);
    });

    test('5.2 Search functionality', async ({ page }) => {
      await page.goto('/mandara.html');

      // Create multiple mandaras
      await page.locator('#mandara-title').fill('検索テスト1');
      await waitForAutoSave();

      const newBtn = page.locator('#new-mandara-btn');
      await newBtn.click();
      await page.waitForTimeout(200);

      await page.locator('#mandara-title').fill('別のマンダラ');
      await waitForAutoSave();

      // Open list view
      await page.locator('#list-view-btn').click();

      // Enter search term
      const filterInput = page.locator('#filter-input');
      await filterInput.fill('検索テスト');
      await page.waitForTimeout(300);

      // Verify filtered results
      const items = page.locator('.mandara-list-item').filter({ hasText: '検索テスト1' });
      await expect(items).toHaveCount(1);
    });

    test('5.3 Sort functionality', async ({ page }) => {
      await page.goto('/mandara.html');

      // Create multiple mandaras
      await page.locator('#mandara-title').fill('Zebra');
      await waitForAutoSave();

      await page.locator('#new-mandara-btn').click();
      await page.waitForTimeout(200);

      await page.locator('#mandara-title').fill('Apple');
      await waitForAutoSave();

      // Open list view
      await page.locator('#list-view-btn').click();

      // Select sort by title A-Z
      const sortSelect = page.locator('#sort-select');
      await sortSelect.selectOption('title-asc');
      await page.waitForTimeout(200);

      // Get first item title
      const firstItem = page.locator('.mandara-list-item').first();
      await expect(firstItem).toContainText('Apple');
    });
  });

  test.describe('Test 6: Delete Functionality', () => {

    test('6.1 Delete a mandara', async ({ page }) => {
      await page.goto('/mandara.html');

      // Create a mandara
      await page.locator('#mandara-title').fill('削除テスト');
      await waitForAutoSave();

      // Set up dialog handler
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('削除');
        await dialog.accept();
      });

      // Click delete button
      const deleteBtn = page.locator('#delete-mandara-btn');
      await deleteBtn.click();

      await page.waitForTimeout(500);

      // Verify mandara is deleted from localStorage
      const count = await page.evaluate(() => {
        const mandaras = JSON.parse(localStorage.getItem('mandaras') || '[]');
        return mandaras.filter(m => m.title === '削除テスト').length;
      });
      expect(count).toBe(0);
    });
  });

  test.describe('Test 7: Debug Commands', () => {

    test('7.1 mandaraDebug.logCurrentState()', async ({ page }) => {
      await page.goto('/mandara.html');

      // Check that debug object exists
      const hasDebug = await page.evaluate(() => {
        return typeof window.mandaraDebug !== 'undefined';
      });
      expect(hasDebug).toBe(true);

      // Call logCurrentState
      const result = await page.evaluate(() => {
        window.mandaraDebug.logCurrentState();
        return true;
      });
      expect(result).toBe(true);
    });

    test('7.2 mandaraDebug.getLocalStorage()', async ({ page }) => {
      await page.goto('/mandara.html');

      // Create a mandara
      await page.locator('#mandara-title').fill('デバッグテスト');
      await waitForAutoSave();

      // Get localStorage via debug command
      const mandaras = await page.evaluate(() => {
        return window.mandaraDebug.getLocalStorage();
      });

      expect(Array.isArray(mandaras)).toBe(true);
      expect(mandaras.length).toBeGreaterThan(0);
    });

    test('7.3 mandaraDebug.getCurrentMandara()', async ({ page }) => {
      await page.goto('/mandara.html');

      await page.locator('#mandara-title').fill('現在のマンダラ');
      await waitForAutoSave();

      const current = await page.evaluate(() => {
        return window.mandaraDebug.getCurrentMandara();
      });

      expect(current).toBeDefined();
      expect(current.title).toBe('現在のマンダラ');
      expect(current.tags).toBeDefined();
      expect(current.todos).toBeDefined();
    });

    test('7.4 mandaraDebug.forceSave()', async ({ page }) => {
      await page.goto('/mandara.html');

      await page.locator('#mandara-title').fill('強制保存テスト');

      // Force save without waiting for auto-save
      await page.evaluate(async () => {
        await window.mandaraDebug.forceSave();
      });

      // Verify it's saved
      const saved = await page.evaluate(() => {
        const mandaras = window.mandaraDebug.getLocalStorage();
        return mandaras.some(m => m.title === '強制保存テスト');
      });
      expect(saved).toBe(true);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {

    test('Empty tag input should not create tag', async ({ page }) => {
      await page.goto('/mandara.html');

      const tagInput = page.locator('#tag-input');
      await tagInput.press('Enter');

      const tagCount = await page.locator('.tag-item').count();
      expect(tagCount).toBe(0);
    });

    test('Empty TODO input should not create TODO', async ({ page }) => {
      await page.goto('/mandara.html');

      const todoInput = page.locator('#todo-input');
      await todoInput.press('Enter');

      const todoCount = await page.locator('.todo-item').count();
      expect(todoCount).toBe(0);
    });

    test('Duplicate tags should not be added', async ({ page }) => {
      await page.goto('/mandara.html');

      const tagInput = page.locator('#tag-input');
      await tagInput.fill('重複タグ');
      await tagInput.press('Enter');
      await page.waitForTimeout(100);

      await tagInput.fill('重複タグ');
      await tagInput.press('Enter');
      await page.waitForTimeout(100);

      const tagCount = await page.locator('.tag-item').count();
      expect(tagCount).toBe(1);
    });

    test('Navigation between mandaras preserves data', async ({ page }) => {
      await page.goto('/mandara.html');

      // Create first mandara
      await page.locator('#mandara-title').fill('マンダラ1');
      await waitForAutoSave();
      const url1 = page.url();

      // Create second mandara
      await page.locator('#new-mandara-btn').click();
      await page.waitForTimeout(200);
      await page.locator('#mandara-title').fill('マンダラ2');
      await waitForAutoSave();

      // Go back to first mandara
      await page.goto(url1);

      // Verify first mandara data is intact
      await expect(page.locator('#mandara-title')).toHaveValue('マンダラ1');
    });
  });
});
