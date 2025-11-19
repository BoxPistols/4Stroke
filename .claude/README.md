# Claude Code Configuration for 4Stroke

This directory contains Claude Code configurations, commands, and skills for the 4Stroke project.

## Directory Structure

```
.claude/
├── README.md                           # This file
├── CONTRIBUTING.md                     # Contribution guidelines
├── commands/                           # Slash commands
│   ├── test-mandara.md                # Run Mandara tests
│   ├── debug-tests.md                 # Debug failing tests
│   └── manual-test-guide.md           # Manual testing guide
└── skills/                            # Custom skills
    └── test-architecture-review.md    # Test architecture review
```

## Available Commands

### `/test-mandara`

Run comprehensive automated tests for the Mandara feature.

**Usage**:
```
/test-mandara
```

**What it does**:
- Runs all 27 Playwright E2E tests
- Analyzes test results
- Provides failure diagnostics
- Suggests manual testing if needed

**Output**:
- Test pass/fail summary
- Failed test details
- Recommendations
- Debug commands

---

### `/debug-tests`

Debug failing tests and provide troubleshooting guidance.

**Usage**:
```
/debug-tests
```

**What it does**:
- Identifies failure patterns
- Checks environment issues
- Provides specific solutions
- Suggests debugging strategies

**Output**:
- Debug report
- Root cause analysis
- Solution steps
- Verification procedures

---

### `/manual-test-guide`

Interactive guide for manual testing of Mandara features.

**Usage**:
```
/manual-test-guide
```

**What it does**:
- Guides through 8 test suites
- Provides step-by-step instructions
- Includes debug commands
- Generates test report template

**Output**:
- Setup instructions
- Test procedures for each suite
- Console commands
- Report template

---

## Available Skills

### `test-architecture-review`

Comprehensive review of test architecture and quality.

**Usage**: This skill is invoked automatically when discussing test architecture improvements.

**What it reviews**:
1. Test coverage analysis
2. Architecture design quality
3. Test maintainability
4. CI/CD integration
5. Performance metrics
6. Best practices adherence

**Output**:
- Detailed review report
- Scores per category
- Prioritized recommendations
- Implementation plan

---

## Quick Start

### Running Tests

```bash
# Automated tests
npm run test:e2e -- e2e/mandara.spec.js

# With UI
npm run test:e2e:ui

# Manual testing
npx serve -s . -l 8000
# Then: http://localhost:8000/mandara.html
```

### Using Debug Commands

Open browser console (F12) and use:

```javascript
// View current state
mandaraDebug.logCurrentState()

// Get current mandara
mandaraDebug.getCurrentMandara()

// View localStorage
mandaraDebug.getLocalStorage()

// Force save
await mandaraDebug.forceSave()
```

### Getting Help

```
# In Claude Code
/help

# For testing issues
/debug-tests

# For manual testing
/manual-test-guide
```

---

## Test Architecture Overview

### Test Stack

- **E2E Testing**: Playwright (27 tests)
- **Unit Testing**: Vitest
- **Accessibility**: axe-core/Playwright
- **Browsers**: Chromium, Firefox, WebKit, Mobile

### Test Coverage

- ✅ Mandara CRUD operations
- ✅ Tag & TODO management
- ✅ 4Stroke ↔ Mandara integration
- ✅ Persistence & reload
- ✅ Search, filter, sort
- ✅ Mobile responsive
- ✅ Japanese IME support
- ✅ Error handling

### Test Files

- `e2e/mandara.spec.js` - Main test suite (27 tests)
- `e2e/mandara-debug.spec.js` - Debug tests
- `MANDARA_TEST.md` - Manual test procedures
- `docs/TEST_ARCHITECTURE.md` - Architecture docs

---

## Documentation

### Testing Documentation

1. **TEST_ARCHITECTURE.md** - Comprehensive test architecture guide
   - Testing philosophy
   - Test stack & tools
   - Test types & coverage
   - Automated test architecture
   - Manual testing framework
   - Debug infrastructure
   - Best practices

2. **MANDARA_TEST.md** - Manual testing procedures
   - 8 test suites
   - Step-by-step instructions
   - Expected results
   - Troubleshooting

3. **MANDARA_TEST_RESULTS.md** - Test results & guides
   - Automated test status
   - Manual testing guide
   - Quick verification checklist
   - Known limitations

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main`, `develop`, `claude/*` branches
- Pull requests to `main`, `develop`

### Workflow

```yaml
# .github/workflows/test.yml
- Install dependencies
- Install Playwright browsers
- Build CSS
- Run unit tests
- Run E2E tests
- Upload artifacts (on failure)
```

### Test Reports

- Available in GitHub Actions artifacts
- Playwright HTML report
- Screenshots (on failure)
- Trace files (on retry)

---

## Best Practices

### When Writing Tests

1. ✅ **Independence**: Each test should be self-contained
2. ✅ **Clarity**: Use descriptive test names
3. ✅ **Specificity**: Make specific assertions
4. ✅ **Cleanup**: Clean up in beforeEach/afterEach
5. ✅ **Waits**: Use smart waits, not setTimeout

### When Debugging Tests

1. 📊 **Check Console**: Look for error messages
2. 🔍 **Use Debug Mode**: Run with `--headed` or `--debug`
3. 🎯 **Isolate**: Run single test to reproduce
4. 📝 **Log State**: Use `mandaraDebug` commands
5. 🔄 **Verify Cleanup**: Check storage between tests

### When Reporting Issues

Include:
- Browser & version
- Test environment (local/CI)
- Error messages
- Console output
- Steps to reproduce
- Screenshots (if visual issue)

---

## Common Issues

### Issue: "Page crashed"

**Cause**: Playwright browser crash (environment issue)

**Solution**: Run tests locally, not in sandboxed environment

```bash
npm run test:e2e -- --headed
```

---

### Issue: "Test timeout"

**Cause**: Slow operations, network issues

**Solution**: Increase timeout or optimize test

```javascript
test.setTimeout(60000); // 60 seconds
```

---

### Issue: "Element not found"

**Cause**: Selector issue or element not visible

**Solution**: Add proper wait

```javascript
await page.waitForSelector('#element', { state: 'visible' });
```

---

## Contributing

When adding new tests:

1. Follow existing patterns
2. Add to appropriate test file
3. Update documentation
4. Run full test suite
5. Check for flakiness (run 3x)

When modifying commands/skills:

1. Update this README
2. Test the command/skill
3. Document changes
4. Get review

---

## Support

- **Documentation**: `/docs` directory
- **Issues**: Report via GitHub Issues
- **Questions**: Use `/help` command
- **Testing Help**: Use `/debug-tests` command

---

## Changelog

### 2025-11-18

- ✅ Added comprehensive test architecture documentation
- ✅ Created `/test-mandara` command
- ✅ Created `/debug-tests` command
- ✅ Created `/manual-test-guide` command
- ✅ Created `test-architecture-review` skill
- ✅ Documented all testing infrastructure

---

**Last Updated**: 2025-11-18
**Maintainer**: Claude Code Team
