---
description: Guide user through manual testing of Mandara feature
tags: [testing, manual, guide, qa]
---

# Manual Test Guide

You are tasked with guiding the user through manual testing of the Mandara feature.

## Context

Manual testing is required when:
- Automated tests cannot run (environment issues)
- Testing Japanese IME input
- Testing on real mobile devices
- Exploratory testing
- User acceptance testing

Reference: `MANDARA_TEST.md` contains 8 test suites with detailed procedures.

## Your Tasks

### 1. Setup Guide

```bash
# Start local server
npx serve -s . -l 8000

# Or use built-in server
python -m http.server 8000
```

Then open: `http://localhost:8000/mandara.html`

### 2. Pre-Test Checklist

Guide user through:
- [ ] Open browser DevTools (F12)
- [ ] Open Console tab
- [ ] Clear cache/storage if needed
- [ ] Verify `window.mandaraDebug` is available

### 3. Test Suite 1: Basic Functionality

**Test 1.1: Create New Mandara**
```
Steps:
1. Click "NEW" button
2. Observe: New empty mandara loads
3. Check console: [INFO] messages appear
4. Verify: URL has ?id=mandara_xxx parameter

Console command:
mandaraDebug.getCurrentMandara()

Expected: New mandara object with empty fields
```

**Test 1.2: Enter Data**
```
Steps:
1. Enter title: "テストマンダラ"
2. Fill cell 5 (center): "中心キーワード"
3. Fill cells 1-4, 6-9 with test data
4. Enter memo text
5. Wait 1 second (auto-save)

Console command:
mandaraDebug.getLocalStorage()

Expected: Data saved in localStorage
```

**Test 1.3: Reload Persistence**
```
Steps:
1. Press F5 to reload page
2. Observe: All data still present
3. Check console: [INFO] Loaded mandara from URL

Expected: ✅ Data persists after reload
```

### 4. Test Suite 2: Tag Management

**Test 2.1: Add Tag**
```
Steps:
1. Click tag input field
2. Type: "ビジネス"
3. Press Enter
4. Observe: Tag appears with × button

Console command:
mandaraDebug.getCurrentMandara().tags

Expected: ["ビジネス"]
```

**Test 2.2: Japanese IME Tag** (Critical!)
```
Steps:
1. Switch to Japanese input (IME on)
2. Type: "しごと" (shigoto)
3. Press Space → "仕事" appears (conversion)
4. Press Enter to confirm conversion
5. Observe: Tag NOT created yet (correct!)
6. Press Enter again
7. Observe: Tag "仕事" created (correct!)

Expected: ✅ IME conversion works, tag created only after final Enter
```

**Test 2.3: Remove Tag**
```
Steps:
1. Click × button on tag
2. Observe: Tag removed

Console command:
mandaraDebug.getCurrentMandara().tags

Expected: Empty array []
```

### 5. Test Suite 3: TODO Management

**Test 3.1: Add TODO**
```
Steps:
1. Type TODO text
2. Press Enter
3. Observe: TODO appears with checkbox

Console command:
mandaraDebug.getCurrentMandara().todos

Expected: Array with todo object
```

**Test 3.2: Toggle Checkbox**
```
Steps:
1. Click checkbox
2. Observe: Text gets strikethrough
3. Uncheck
4. Observe: Strikethrough removed

Console command:
mandaraDebug.getCurrentMandara().todos[0].completed

Expected: true (when checked), false (when unchecked)
```

**Test 3.3: Checkbox Alignment**
```
Visual check:
- Checkbox and text are horizontally aligned
- No vertical offset
- Text starts immediately after checkbox

Expected: ✅ Perfect alignment
```

### 6. Test Suite 4: 4Stroke Integration

**Test 4.1: Expand to 4Stroke**
```
Steps:
1. Fill mandara data (title, cells)
2. Click "4STROKEへ展開" button
3. Browser navigates to main.html
4. Observe: Garage A populated with mandara data
5. Check: Center cell (5) → Key (stroke 1)
6. Check: Surrounding cells → Other strokes

Expected: ✅ Data transferred correctly
```

**Test 4.2: Expand from 4Stroke**
```
Steps:
1. Go to main.html
2. Fill Garage A (title + Key)
3. Click "→ MANDARA" expand button
4. Browser navigates to mandara.html
5. Observe: Title and center cell populated

Expected: ✅ Data transferred correctly
```

### 7. Test Suite 5: Mobile Responsive

**Test 5.1: Mobile View (Desktop Browser)**
```
Steps:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12" or "Pixel 5"
4. Observe layout:
   - 3x3 grid maintained
   - Smaller cells
   - Single column layout
   - Touch-friendly buttons

Expected: ✅ Responsive layout works
```

**Test 5.2: Mobile Scrolling**
```
Steps:
1. In mobile view
2. Scroll down
3. Observe: Vertical scroll works
4. Try horizontal scroll
5. Observe: Horizontal scroll disabled

Expected: ✅ Vertical scroll only
```

### 8. Test Suite 6: List & Search

**Test 6.1: List View**
```
Steps:
1. Create 2-3 mandaras
2. Click "LIST" button
3. Observe: All mandaras displayed
4. Check: Title, center cell, tags visible

Expected: ✅ List shows all mandaras
```

**Test 6.2: Search**
```
Steps:
1. In list view
2. Type search term in filter input
3. Observe: List filtered in real-time

Expected: ✅ Search works
```

**Test 6.3: Sort**
```
Steps:
1. Select sort option: "更新日時 (新しい順)"
2. Observe: List reordered

Expected: ✅ Sort works
```

### 9. Test Suite 7: Error Handling

**Test 7.1: Empty Input**
```
Steps:
1. Tag input: Press Enter without typing
2. Observe: No tag created
3. TODO input: Press Enter without typing
4. Observe: No TODO created

Expected: ✅ Empty input handled gracefully
```

**Test 7.2: Duplicate Tag**
```
Steps:
1. Add tag: "test"
2. Try to add "test" again
3. Observe: Duplicate not added

Expected: ✅ Duplicates prevented
```

### 10. Test Suite 8: Scrolling Issues

**Test 8.1: 4Stroke Horizontal Scroll (Mobile)**
```
Steps:
1. Open main.html on mobile (or mobile view)
2. Swipe left/right
3. Observe: Can navigate between garages

Expected: ✅ Horizontal scroll works
```

**Test 8.2: Mandara Vertical Scroll**
```
Steps:
1. Open mandara.html
2. Scroll up/down
3. Observe: Page scrolls vertically

Expected: ✅ Vertical scroll works, no cutoff
```

## Console Debug Commands Reference

Provide these commands to user:

```javascript
// Check initialization
console.log('Debug available:', typeof window.mandaraDebug !== 'undefined')

// View current state
mandaraDebug.logCurrentState()

// Get current mandara
mandaraDebug.getCurrentMandara()

// Get all mandaras
mandaraDebug.getAllMandaras()

// View localStorage
mandaraDebug.getLocalStorage()

// Force save
await mandaraDebug.forceSave()

// Clear all (with confirmation)
mandaraDebug.clearAll()
```

## Test Report Template

Ask user to report results in this format:

```markdown
## Manual Test Report

Date: [Date]
Tester: [Name]
Browser: [Chrome/Firefox/Safari]
Device: [Desktop/Mobile]

### Test Results

#### Suite 1: Basic Functionality
- ✅ Create Mandara
- ✅ Enter Data
- ✅ Reload Persistence

#### Suite 2: Tag Management
- ✅ Add Tag
- ✅ Japanese IME Tag
- ✅ Remove Tag

#### Suite 3: TODO Management
- ✅ Add TODO
- ✅ Toggle Checkbox
- ✅ Checkbox Alignment

#### Suite 4: 4Stroke Integration
- ✅ Expand to 4Stroke
- ✅ Expand from 4Stroke

#### Suite 5: Mobile Responsive
- ✅ Mobile View
- ✅ Mobile Scrolling

#### Suite 6: List & Search
- ✅ List View
- ✅ Search
- ✅ Sort

#### Suite 7: Error Handling
- ✅ Empty Input
- ✅ Duplicate Tag

#### Suite 8: Scrolling
- ✅ 4Stroke Horizontal
- ✅ Mandara Vertical

### Issues Found
- [Issue 1 description]
- [Issue 2 description]

### Console Errors
- [Any error messages]

### Overall Status
✅ PASS / ❌ FAIL

### Notes
[Additional observations]
```

## Success Criteria

- User successfully completes all 8 test suites
- All critical paths verified working
- Issues documented if found
- Test report generated

## If User Reports Issues

1. Ask for console error messages
2. Ask for screenshots
3. Reproduce issue with debug commands
4. Provide troubleshooting steps
5. Create bug report if needed

Guide the user step-by-step through manual testing procedures.
