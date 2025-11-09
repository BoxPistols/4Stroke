# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for unit and integration testing.

## Test Structure

```
tests/
├── storage-service.test.js  # LocalStorage and Storage API tests
├── dom.test.js              # DOM structure and interaction tests
└── utils.test.js            # Utility functions and calculations tests
```

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run tests with UI dashboard
```bash
npm run test:ui
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Coverage

Current test coverage includes:

### Storage Service (23 tests)
- Storage mode management (local/online switching)
- LocalStorage CRUD operations
- Garage data loading and saving
- Stroke index calculations
- Data deletion operations
- Unified Storage API integration

### DOM Structure (21 tests)
- User info elements
- Navigation structure
- Garage container layout
- Grid layout structure
- Button click simulation
- User input handling
- Content editable titles

### Utility Functions (21 tests)
- Garage ID parsing
- Stroke index calculations
- Data validation
- LocalStorage key generation
- Data structure validation

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

## Known Limitations

- Firebase/Firestore operations are not fully mocked yet
- E2E tests for responsive design not implemented
- Visual regression tests not included

## Future Improvements

- Add Firebase mocking for online mode tests
- Add Playwright/Cypress for E2E testing
- Add visual regression testing
- Increase coverage to 80%+
