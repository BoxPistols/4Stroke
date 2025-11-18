---
description: Debug failing tests and provide troubleshooting guidance
tags: [testing, debugging, troubleshooting]
---

# Debug Failing Tests

You are tasked with debugging failing tests and providing troubleshooting guidance.

## Context

Tests may fail due to:
- Environment issues (Playwright crashes)
- Code bugs
- Test flakiness
- Timing issues
- Storage conflicts

## Your Tasks

1. **Identify Failure Type**

   Check error messages for patterns:
   - "Page crashed" → Environment issue
   - "Timeout" → Timing/performance issue
   - "Element not found" → Selector issue
   - "Expected X but got Y" → Logic bug

2. **Environment Check**

   ```bash
   # Verify Node.js version
   node --version

   # Verify dependencies
   npm list @playwright/test

   # Verify Playwright browsers
   npx playwright install --with-deps
   ```

3. **Run Debug Mode**

   ```bash
   # Run with UI mode
   npm run test:e2e:ui -- e2e/mandara.spec.js

   # Run in headed mode
   npm run test:e2e -- e2e/mandara.spec.js --headed

   # Run with debug flag
   npm run test:e2e:debug -- e2e/mandara.spec.js

   # Generate trace
   npm run test:e2e -- e2e/mandara.spec.js --trace on
   ```

4. **Analyze Failure Patterns**

   **Pattern 1: All tests failing with "Page crashed"**
   - Cause: Playwright browser crash
   - Solution: Run tests in local environment, not sandboxed

   **Pattern 2: Intermittent failures**
   - Cause: Race conditions, timing
   - Solution: Check wait strategies, increase timeouts

   **Pattern 3: Storage-related failures**
   - Cause: localStorage not cleared
   - Solution: Verify beforeEach cleanup

   **Pattern 4: IME-related failures**
   - Cause: Composition events not simulated
   - Solution: Add compositionstart/end events

5. **Provide Troubleshooting Steps**

   Based on failure type, provide specific steps:

   ```markdown
   ## Issue: [Issue Type]

   ### Symptoms
   - Symptom 1
   - Symptom 2

   ### Root Cause
   [Explanation]

   ### Solution
   1. Step 1
   2. Step 2
   3. Step 3

   ### Verification
   - How to verify fix
   ```

6. **Manual Testing Fallback**

   If automated tests can't run:
   - Provide manual testing procedure
   - Reference `MANDARA_TEST.md`
   - Guide user through browser testing
   - Use `window.mandaraDebug` commands

## Common Issues & Solutions

### Issue 1: Playwright Browser Crash

```bash
# Symptoms
Error: page.goto: Page crashed

# Solution
1. Run tests locally (not in Docker/sandbox)
2. Or use manual testing procedures
3. Verify browser installation: npx playwright install
```

### Issue 2: Test Timeout

```bash
# Symptoms
Error: Test timeout of 30000ms exceeded

# Solution
1. Increase timeout in test file
2. Check network conditions
3. Optimize test operations
```

### Issue 3: Element Not Found

```bash
# Symptoms
Error: locator.click: Target closed

# Solution
1. Verify selector is correct
2. Add wait: await page.waitForSelector('#element')
3. Check if element is in iframe
```

### Issue 4: Storage Not Persisting

```bash
# Symptoms
localStorage.getItem() returns null

# Solution
1. Verify storage mode: localStorage.setItem('storage_mode', 'local')
2. Check beforeEach cleanup
3. Use mandaraDebug.getLocalStorage()
```

## Debug Workflow

```
1. Identify error type
   ↓
2. Check test logs
   ↓
3. Run in debug mode
   ↓
4. Analyze stack trace
   ↓
5. Apply fix
   ↓
6. Verify fix
   ↓
7. Run all tests
```

## Browser Console Debugging

```javascript
// Check if Mandara initialized
console.log(typeof window.mandaraDebug !== 'undefined')

// View current state
mandaraDebug.logCurrentState()

// Check localStorage
console.log(localStorage.getItem('mandaras'))
console.log(localStorage.getItem('storage_mode'))

// Check sessionStorage
console.log(sessionStorage.getItem('4stroke_expand'))
console.log(sessionStorage.getItem('mandara_expand'))
```

## Output Format

Provide debugging results in this format:

```markdown
## Debug Report

### Test Failure Summary
- Total Tests: X
- Failed Tests: Y
- Failure Rate: Z%

### Failure Analysis

#### Test: [Test Name]
- **Error**: [Error message]
- **Cause**: [Root cause]
- **Solution**: [Proposed fix]
- **Code Change**: [If applicable]

### Environment Check
- ✅ Node.js: v18.x.x
- ✅ Playwright: v1.56.1
- ❌ Browser: Chromium crashed

### Recommendations
1. [Action 1]
2. [Action 2]
3. [Action 3]

### Next Steps
- [ ] Apply fixes
- [ ] Re-run tests
- [ ] Verify resolution
```

## Success Criteria

- Root cause identified
- Solution provided
- Verification steps included
- Fallback options available (manual testing)

Execute debugging analysis and provide comprehensive report.
