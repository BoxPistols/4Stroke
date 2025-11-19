import { test, expect } from '@playwright/test';

test('Debug: Capture console errors on mandara page', async ({ page }) => {
  const errors = [];
  const consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // Set storage mode before loading
    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      localStorage.setItem('storage_mode', 'local');
    });

    // Now try to load mandara page
    await page.goto('http://localhost:5173/mandara.html', { waitUntil: 'networkidle' });

    // Wait a bit to see if page loads
    await page.waitForTimeout(2000);

    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));

    console.log('\n=== PAGE ERRORS ===');
    errors.forEach(err => console.log(err));

    // Try to get the page title
    const title = await page.title().catch(() => 'Could not get title');
    console.log(`\nPage title: ${title}`);

  } catch (error) {
    console.log('\n=== CAUGHT ERROR ===');
    console.log(error.message);
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));
    console.log('\n=== PAGE ERRORS ===');
    errors.forEach(err => console.log(err));
  }
});
