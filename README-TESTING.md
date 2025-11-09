# Testing Guide

## Overview

This project uses a comprehensive testing strategy with:
- [Vitest](https://vitest.dev/) for unit and integration testing
- [Playwright](https://playwright.dev/) for E2E and visual regression testing
- [Axe](https://github.com/dequelabs/axe-core) for accessibility testing

## Test Structure

```
tests/
├── storage-service.test.js  # LocalStorage and Storage API tests (23 tests)
├── dom.test.js              # DOM structure and interaction tests (21 tests)
├── utils.test.js            # Utility functions and calculations tests (21 tests)
├── responsive.test.js       # Responsive design and breakpoints (25 tests)
├── accessibility.test.js    # A11y and WCAG compliance (30 tests)
└── styles.test.js           # CSS and visual design tests (50 tests)

e2e/
├── visual.spec.js           # Visual regression tests (Playwright)
└── interaction.spec.js      # User interaction E2E tests (Playwright)
```

## Running Tests

### Unit/Integration Tests (Vitest)

```bash
npm test                 # Run all unit tests once
npm run test:watch       # Watch mode (auto-rerun on changes)
npm run test:ui          # Interactive UI dashboard
npm run test:coverage    # Generate coverage report
```

### E2E Tests (Playwright)

```bash
npm run playwright:install  # Install browser binaries (first time only)
npm run test:e2e           # Run all E2E tests
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:debug     # Debug mode with inspector
```

### Run All Tests

```bash
npm run test:all        # Run both unit and E2E tests
```

## Test Coverage

**Total: 170 Unit Tests + E2E Visual/Interaction Tests**

### Storage Service (23 tests)
- ✅ Storage mode management (local/online switching)
- ✅ LocalStorage CRUD operations
- ✅ Garage data loading and saving
- ✅ Stroke index calculations (garage1-4, stroke1-16)
- ✅ Data deletion operations
- ✅ Unified Storage API integration

### DOM Structure (21 tests)
- ✅ User info elements and positioning
- ✅ Navigation structure (4 garages)
- ✅ Garage container layout
- ✅ Grid layout structure (2-column desktop, 1-column mobile)
- ✅ Button click simulation
- ✅ User input handling
- ✅ Content editable titles

### Utility Functions (21 tests)
- ✅ Garage ID parsing (garageA-D, garage1-4)
- ✅ Stroke index calculations (1-16)
- ✅ Data validation (empty strings, null, undefined)
- ✅ LocalStorage key generation
- ✅ Data structure validation

### Responsive Design (25 tests)
- ✅ Breakpoint definitions (768px, 1024px, 480px)
- ✅ Grid layout behavior (2-column → 1-column)
- ✅ Box sizing and overflow prevention
- ✅ Touch target sizes (44px minimum)
- ✅ Mobile navigation (A B C D letters)
- ✅ User info positioning (bottom-left)
- ✅ Typography scaling
- ✅ Layout consistency

### Accessibility (30 tests)
- ✅ Semantic HTML (header, nav, main, h1, h2)
- ✅ Interactive elements accessibility
- ✅ Focus management and tab order
- ✅ Color contrast (WCAG AA compliance)
- ✅ Keyboard navigation (Enter, Tab keys)
- ✅ ARIA attributes (roles, labels, labelledby)
- ✅ Text alternatives for icons
- ✅ Form accessibility
- ✅ Mobile touch targets (44x44px)
- ✅ Content editable accessibility

### CSS/Visual Design (50 tests)
- ✅ Grid layout styles
- ✅ Color scheme (purple/blue gradients)
- ✅ Glassmorphism effects (backdrop-filter blur)
- ✅ Typography (Oswald font, clamp sizing)
- ✅ Border radius (12px, 20px, 50%)
- ✅ Spacing system (viewport units, consistent gaps)
- ✅ Box model (border-box, max-width constraints)
- ✅ Transitions and animations (cubic-bezier easing)
- ✅ Z-index layering
- ✅ Button hover/focus states
- ✅ Textarea styles
- ✅ Background gradients and images

### E2E Visual Regression (Playwright)
- 📸 Desktop views (1920x1080)
- 📸 Mobile views (375x667)
- 📸 Tablet views (768x1024)
- 📸 Component screenshots
- 📸 Glassmorphism effects
- 📸 Dark mode compatibility
- 📸 Cross-browser testing (Chrome, Firefox, Safari)

### E2E Interaction (Playwright)
- 🎭 Local/Online mode switching
- 🎭 Garage title editing
- 🎭 Stroke text input and persistence
- 🎭 Navigation between garages
- 🎭 Mobile launcher expand/collapse
- 🎭 Keyboard navigation
- 🎭 Responsive behavior
- 🎭 Form data persistence

## Writing New Tests

### Example test structure:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    localStorage.clear();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## Test Environment

- **Test Runner**: Vitest v4.0.8
- **DOM Environment**: happy-dom v20.0.10
- **Module Type**: ESM (ES Modules)

## CI/CD Integration

Add this to your CI pipeline:
```yaml
- run: npm install
- run: npm test
```

## Debugging Tests

1. Use `test.only()` to run a single test:
```javascript
it.only('should test this one thing', () => {
  // test code
});
```

2. Use `console.log()` within tests for debugging
3. Run with `--reporter=verbose` for detailed output:
```bash
npx vitest run --reporter=verbose
```

## Test Results Summary

```
✅ 170/170 unit tests passing
✅ 6 test suites (storage, DOM, utils, responsive, a11y, styles)
✅ 100% pass rate
⏱️ ~2s execution time
```

## Known Limitations

- Firebase/Firestore operations not mocked (only local mode tested)
- E2E tests require manual browser installation (`npm run playwright:install`)
- Visual regression baselines need to be generated on first run
- Cross-browser E2E testing requires all browsers installed

## Future Improvements

- ⬜ Add Firebase/Firestore mocking for online mode testing
- ⬜ Add performance testing (Lighthouse CI)
- ⬜ Add snapshot testing for component outputs
- ⬜ Increase coverage to 90%+ (currently focused on critical paths)
- ⬜ Add mutation testing with Stryker
- ⬜ Add contract testing for API interactions
