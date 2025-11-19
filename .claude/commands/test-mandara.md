---
description: Run comprehensive tests for Mandara feature
tags: [testing, mandara, e2e, automation]
---

# Test Mandara Feature

You are tasked with running comprehensive tests for the Mandara feature.

## Context

The Mandara feature has:
- 27 automated Playwright E2E tests in `e2e/mandara.spec.js`
- Manual testing procedures in `MANDARA_TEST.md`
- Debug infrastructure accessible via `window.mandaraDebug`
- Test architecture documented in `docs/TEST_ARCHITECTURE.md`

## Your Tasks

1. **Check Test Files Exist**
   - Verify `e2e/mandara.spec.js` exists
   - Check `MANDARA_TEST.md` for manual test procedures
   - Review `docs/TEST_ARCHITECTURE.md` for architecture

2. **Run Automated Tests**
   ```bash
   # Run all Mandara tests
   npm run test:e2e -- e2e/mandara.spec.js --project=chromium

   # If tests fail, run with debugging
   npm run test:e2e -- e2e/mandara.spec.js --headed --debug
   ```

3. **Analyze Results**
   - Count passing/failing tests
   - Identify failure patterns
   - Check console output for errors
   - Generate test report

4. **Report Back**
   Provide a summary:
   ```
   ✅ Tests Passed: X/27
   ❌ Tests Failed: X/27
   ⏱️  Duration: X seconds

   Failed Tests:
   - Test name 1: Reason
   - Test name 2: Reason

   Recommendations:
   - Action 1
   - Action 2
   ```

5. **Manual Testing Guidance** (if automated tests pass)
   Guide the user through manual testing:
   - Reference `MANDARA_TEST.md`
   - Provide step-by-step instructions
   - Use debug commands: `mandaraDebug.logCurrentState()`

## Test Suites Covered

1. Basic Functionality (create, edit, save)
2. Tag Management
3. TODO Management
4. Reload Persistence
5. List & Search
6. Delete Operations
7. Debug Commands
8. 4Stroke Integration
9. Edge Cases

## Debug Commands Available

```javascript
// Browser console commands
mandaraDebug.logCurrentState()      // View current state
mandaraDebug.getCurrentMandara()    // Get current mandara
mandaraDebug.getAllMandaras()       // Get all mandaras
mandaraDebug.getLocalStorage()      // View localStorage
mandaraDebug.forceSave()            // Force save
mandaraDebug.clearAll()             // Clear all data
```

## Success Criteria

- All 27 automated tests pass
- No console errors during execution
- Manual testing guide provided to user
- Debug infrastructure verified working

## If Tests Fail

1. Capture error messages
2. Check if it's an environment issue (Playwright crash)
3. Suggest running locally with: `npm run test:e2e:ui`
4. Provide manual testing as fallback

Execute the tests and provide comprehensive results.
