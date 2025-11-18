# 4Stroke & Mandara - Test Architecture Documentation

## Overview

This document provides a comprehensive guide to the testing architecture for the 4Stroke and Mandara features. It covers automated testing, manual testing, debugging strategies, and test maintenance.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Stack & Tools](#test-stack--tools)
3. [Test Types & Coverage](#test-types--coverage)
4. [Automated Test Architecture](#automated-test-architecture)
5. [Manual Testing Framework](#manual-testing-framework)
6. [Debug Infrastructure](#debug-infrastructure)
7. [Test Execution](#test-execution)
8. [CI/CD Integration](#cicd-integration)
9. [Test Maintenance](#test-maintenance)
10. [Best Practices](#best-practices)

---

## Testing Philosophy

### Core Principles

1. **Test Pyramid**: Unit tests (foundation) → Integration tests → E2E tests (top)
2. **User-Centric**: Tests should validate real user workflows
3. **Fast Feedback**: Quick test execution for rapid iteration
4. **Reliability**: Tests should be deterministic and repeatable
5. **Maintainability**: Tests should be easy to understand and update

### Coverage Goals

- **Critical Paths**: 100% coverage of critical user workflows
- **Features**: 80%+ coverage of feature functionality
- **Edge Cases**: Cover common edge cases and error scenarios
- **Accessibility**: Basic accessibility testing with axe-core

---

## Test Stack & Tools

### Testing Frameworks

```javascript
{
  "e2e": "Playwright ^1.56.1",
  "unit": "Vitest ^4.0.8",
  "accessibility": "@axe-core/playwright ^4.11.0",
  "browser": "Chromium, Firefox, WebKit"
}
```

### Test Files Structure

```
4Stroke/
├── e2e/                          # E2E tests (Playwright)
│   ├── mandara.spec.js           # Mandara feature tests (27 tests)
│   ├── mandara-debug.spec.js     # Debug/error capture tests
│   ├── interaction.spec.js       # 4Stroke interaction tests
│   ├── new-features.spec.js      # Feature tests
│   └── visual.spec.js            # Visual regression tests
├── tests/                        # Unit tests (Vitest)
│   └── [unit test files]
├── docs/
│   ├── TEST_ARCHITECTURE.md      # This document
│   ├── MANDARA_TEST.md           # Manual test procedures
│   └── MANDARA_TEST_RESULTS.md   # Test results & guides
└── playwright.config.js          # Playwright configuration
```

---

## Test Types & Coverage

### 1. E2E Tests (Playwright)

**Purpose**: Validate complete user workflows in real browser environments

**Coverage**:
- ✅ Mandara CRUD operations
- ✅ Tag & TODO management
- ✅ 4Stroke ↔ Mandara integration
- ✅ Persistence & reload behavior
- ✅ Search, filter, sort functionality
- ✅ Mobile responsive behavior

**Test Count**: 27 automated tests for Mandara

### 2. Unit Tests (Vitest)

**Purpose**: Test individual functions and modules in isolation

**Coverage**:
- Storage service functions
- Utility functions (debounce, DOM helpers)
- Data transformation functions
- URL conversion logic

### 3. Visual Regression Tests

**Purpose**: Detect unintended UI changes

**Coverage**:
- Desktop layouts (1920x1080)
- Mobile layouts (375x667, 768x1024)
- Dark/light theme consistency

### 4. Accessibility Tests

**Purpose**: Ensure WCAG 2.1 compliance

**Coverage**:
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- ARIA attributes

### 5. Manual Tests

**Purpose**: Exploratory testing and complex user scenarios

**Coverage**:
- Japanese IME input
- Complex multi-step workflows
- Cross-browser compatibility
- Real device testing

---

## Automated Test Architecture

### Playwright Configuration

**File**: `playwright.config.js`

```javascript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
    { name: 'Tablet', use: { ...devices['iPad Pro'] } },
  ],

  webServer: {
    command: 'npx serve -s . -l 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Structure Pattern

```javascript
// e2e/mandara.spec.js

import { test, expect } from '@playwright/test';

// Helper functions
const waitForAutoSave = () => new Promise(resolve => setTimeout(resolve, 600));

test.describe('Feature Name', () => {

  // Setup & teardown
  test.beforeEach(async ({ page, context }) => {
    // Clear storage
    await context.clearCookies();
    await page.goto('/mandara.html');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('storage_mode', 'local');
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  // Test suite
  test.describe('Test Category', () => {

    test('Test name', async ({ page }) => {
      // Arrange
      const input = page.locator('#element');

      // Act
      await input.fill('test data');
      await waitForAutoSave();

      // Assert
      await expect(input).toHaveValue('test data');

      // Verify persistence
      const saved = await page.evaluate(() => {
        const data = localStorage.getItem('mandaras');
        return JSON.parse(data);
      });
      expect(saved.length).toBeGreaterThan(0);
    });
  });
});
```

### Key Testing Patterns

#### 1. Page Object Pattern (Implicit)

```javascript
// Locators as constants
const selectors = {
  title: '#mandara-title',
  cell: (num) => `#cell-${num}`,
  tagInput: '#tag-input',
  todoInput: '#todo-input',
};

// Usage
await page.locator(selectors.title).fill('Title');
```

#### 2. Wait Strategies

```javascript
// Auto-save debounce
const waitForAutoSave = () => new Promise(resolve => setTimeout(resolve, 600));

// Network idle
await page.waitForLoadState('networkidle');

// DOM ready
await page.waitForLoadState('domcontentloaded');

// Element ready
await page.locator('#element').waitFor({ state: 'visible' });
```

#### 3. Storage Verification

```javascript
// Verify localStorage
const saved = await page.evaluate(() => {
  return localStorage.getItem('mandaras');
});
const data = JSON.parse(saved);
expect(data).toBeDefined();

// Verify sessionStorage
const sessionData = await page.evaluate(() => {
  return sessionStorage.getItem('4stroke_expand');
});
```

#### 4. Event Simulation

```javascript
// Keyboard events
await input.press('Enter');

// IME composition
await input.dispatchEvent('compositionstart');
await input.fill('日本語');
await input.dispatchEvent('compositionend');

// Custom events
await element.dispatchEvent(new Event('input', { bubbles: true }));
```

---

## Manual Testing Framework

### Test Procedure Document

**File**: `MANDARA_TEST.md`

**Structure**:
1. Prerequisites & Setup
2. Test Suites (8 suites, 50+ test cases)
3. Expected Results
4. Troubleshooting Guide

### Test Suites

#### Suite 1: Basic Functionality
- Create Mandara
- Edit title, cells, memo
- Verify auto-save
- Test persistence after reload

#### Suite 2: Tag Management
- Add tags (single & multiple)
- Remove tags
- Duplicate tag prevention
- Tag display & filtering

#### Suite 3: TODO Management
- Add TODOs
- Toggle completion
- Remove TODOs
- Checkbox state persistence

#### Suite 4: Japanese IME Support
- Test hiragana input
- Test kanji conversion
- Verify Enter key behavior during composition
- Multi-character selection

#### Suite 5: Search & Filter
- Search by title
- Search by tags
- Search by content
- Filter and sort combination

#### Suite 6: 4Stroke Integration
- Expand from 4Stroke → Mandara
- Expand from Mandara → 4Stroke
- Data mapping verification
- URL parameter handling

#### Suite 7: Mobile Responsiveness
- Touch interactions
- Swipe gestures
- Viewport adaptation
- Keyboard display

#### Suite 8: Edge Cases & Errors
- Empty input handling
- Network failure scenarios
- Storage quota exceeded
- Concurrent edits

---

## Debug Infrastructure

### Browser Console Debug Tools

**Implementation**: `js/mandara.js`

```javascript
// Global debug object
window.mandaraDebug = {
  // State inspection
  getCurrentMandara: () => currentMandara,
  getAllMandaras: () => allMandaras,
  getLocalStorage: () => {
    const data = localStorage.getItem('mandaras');
    return data ? JSON.parse(data) : [];
  },

  // State logging
  logCurrentState: () => {
    console.log('=== Mandara Debug State ===');
    console.log('Current User ID:', currentUserId);
    console.log('Storage Mode:', getStorageMode());
    console.log('Current Mandara:', currentMandara);
    console.log('All Mandaras Count:', allMandaras.length);
  },

  // Manual operations
  forceSave: async () => {
    await saveCurrentMandara();
  },

  clearAll: () => {
    if (confirm('Clear all mandaras?')) {
      localStorage.removeItem('mandaras');
      location.reload();
    }
  }
};
```

### Logging Levels

```javascript
// Information
console.log('[INFO] Operation started');

// Success
console.log('[SUCCESS] Data saved');

// Warning
console.warn('[WARN] Missing optional data');

// Error
console.error('[ERROR] Operation failed:', error);

// Debug
console.log('[DEBUG] State:', state);
```

### Debug Test File

**File**: `e2e/mandara-debug.spec.js`

```javascript
test('Capture console errors', async ({ page }) => {
  const errors = [];
  const consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  // Execute test
  await page.goto('/mandara.html');

  // Report findings
  console.log('=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));

  console.log('=== PAGE ERRORS ===');
  errors.forEach(err => console.log(err));
});
```

---

## Test Execution

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/mandara.spec.js

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test by name
npm run test:e2e -- -g "Add a tag"

# Run on specific browser
npm run test:e2e -- --project=chromium

# Debug mode
npm run test:e2e:debug
```

### Unit Tests

```bash
# Run unit tests
npm run test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui

# Coverage
npm run test:coverage
```

### Manual Testing

```bash
# Start local server
npx serve -s . -l 8000

# Open browser
http://localhost:8000/mandara.html

# Open console (F12)
# Run debug commands
mandaraDebug.logCurrentState()
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop, claude/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright browsers
      run: npx playwright install --with-deps

    - name: Build CSS
      run: npm run build:css

    - name: Run unit tests
      run: npm run test

    - name: Run E2E tests
      run: npm run test:e2e

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

### Test Metrics

Track these metrics in CI:
- ✅ Test pass rate (target: >95%)
- ✅ Test execution time (target: <5 min)
- ✅ Code coverage (target: >80%)
- ✅ Flaky test rate (target: <5%)

---

## Test Maintenance

### When to Update Tests

1. **Feature Changes**: Update tests when features are added/modified
2. **Bug Fixes**: Add regression tests for fixed bugs
3. **Refactoring**: Update tests to match new implementation
4. **Breaking Changes**: Rewrite tests for major architectural changes

### Test Review Checklist

- [ ] Tests follow naming conventions
- [ ] Tests are independent and isolated
- [ ] Tests clean up after themselves
- [ ] Tests have clear assertions
- [ ] Tests have proper error messages
- [ ] Tests cover happy path and edge cases
- [ ] Tests are not flaky
- [ ] Tests run in reasonable time

### Debugging Failing Tests

```bash
# Run in headed mode to see what's happening
npm run test:e2e -- --headed

# Enable debug mode
npm run test:e2e:debug

# Run with trace
npm run test:e2e -- --trace on

# Generate trace viewer
npx playwright show-trace trace.zip
```

---

## Best Practices

### 1. Test Independence

```javascript
// ✅ GOOD: Independent test
test.beforeEach(async ({ page }) => {
  await page.goto('/mandara.html');
  await page.evaluate(() => localStorage.clear());
});

// ❌ BAD: Test depends on previous test
test('test 1', async ({ page }) => {
  await createMandara();
});
test('test 2', async ({ page }) => {
  await editMandara(); // Assumes test 1 ran
});
```

### 2. Clear Test Names

```javascript
// ✅ GOOD: Descriptive name
test('should persist data after page reload');

// ❌ BAD: Vague name
test('test reload');
```

### 3. Proper Assertions

```javascript
// ✅ GOOD: Specific assertion
await expect(input).toHaveValue('expected value');

// ❌ BAD: Vague assertion
expect(input).toBeTruthy();
```

### 4. Wait Strategies

```javascript
// ✅ GOOD: Wait for specific condition
await page.waitForSelector('#element', { state: 'visible' });

// ❌ BAD: Arbitrary timeout
await page.waitForTimeout(5000);
```

### 5. Error Handling

```javascript
// ✅ GOOD: Helpful error message
expect(data.length).toBe(1, 'Should have exactly one mandara');

// ❌ BAD: No context
expect(data.length).toBe(1);
```

### 6. Test Data

```javascript
// ✅ GOOD: Unique test data
const uniqueTitle = `Test-${Date.now()}`;

// ❌ BAD: Hardcoded data that might conflict
const title = 'Test Mandara';
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Timeout

**Cause**: Network requests, slow operations
**Solution**: Increase timeout, optimize operations

```javascript
test('slow operation', async ({ page }) => {
  // Increase timeout for this test
  test.setTimeout(60000);
});
```

#### 2. Flaky Tests

**Cause**: Race conditions, timing issues
**Solution**: Use proper wait strategies

```javascript
// Instead of waitForTimeout
await page.waitForTimeout(1000);

// Use waitForSelector
await page.waitForSelector('#element', { state: 'visible' });
```

#### 3. Storage Issues

**Cause**: localStorage not cleared between tests
**Solution**: Clear in beforeEach

```javascript
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

#### 4. IME Issues

**Cause**: composition events not handled
**Solution**: Simulate composition events

```javascript
await input.dispatchEvent('compositionstart');
await input.fill('日本語');
await input.dispatchEvent('compositionend');
```

---

## Test Coverage Reports

### Generating Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage
open coverage/index.html
```

### Coverage Thresholds

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

---

## Future Improvements

### Planned Enhancements

1. **Visual Regression Testing**
   - Implement Percy or Chromatic
   - Snapshot testing for UI components
   - Cross-browser screenshot comparison

2. **Performance Testing**
   - Lighthouse CI integration
   - Core Web Vitals monitoring
   - Load time tracking

3. **Accessibility Testing**
   - Automated WCAG 2.1 validation
   - Keyboard navigation testing
   - Screen reader compatibility

4. **API Testing**
   - Firebase/Firestore API mocking
   - Network request interception
   - Offline mode testing

5. **Load Testing**
   - Large dataset handling
   - Concurrent user simulation
   - Memory leak detection

---

## Resources

### Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)

### Project Files

- `e2e/mandara.spec.js` - Main test suite
- `MANDARA_TEST.md` - Manual testing guide
- `MANDARA_TEST_RESULTS.md` - Test results
- `playwright.config.js` - Playwright config

### Debug Tools

- `window.mandaraDebug` - Browser console debug object
- Chrome DevTools
- Playwright Inspector
- Trace Viewer

---

## Conclusion

This testing architecture provides:
- ✅ Comprehensive automated test coverage
- ✅ Clear manual testing procedures
- ✅ Robust debugging infrastructure
- ✅ CI/CD integration
- ✅ Maintainability and scalability

**Test Metrics**:
- 27 automated E2E tests
- 8 manual test suites
- 50+ test cases
- Multi-browser support (6 targets)
- Mobile & desktop coverage

For questions or improvements, refer to the Claude Code documentation or open an issue.

---

**Last Updated**: 2025-11-18
**Version**: 1.0.0
**Maintainer**: Claude Code Team
