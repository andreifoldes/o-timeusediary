# E2E Tests for TimeDiary

This directory contains end-to-end tests for the TimeDiary application using Playwright.

## Setup

1. Make sure you have the necessary dependencies installed:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npm run playwright:install
   ```

## Running Tests

### Basic test run
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test timediary-complete-flow.spec.js
```

### Run tests on specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Files

### `timediary-complete-flow.spec.js`
Complete end-to-end flow test that covers:
- Starting the diary from instructions page
- Adding multiple primary activities (Sleeping, Paid Work, Church, Services, Travel, Unpaid Work, Recreation)
- Adding secondary activities (Caring, Eating)
- Adding location information
- Adding people information ("who" section)
- Adding device usage information
- Adding enjoyment ratings
- Submitting the completed diary

### `selected-activity-persistence.spec.js` ⭐ NEW
Tests for **PR #51** - fixing the selected activity persistence bug.

**What it tests:**
- Selected activity is cleared when navigating to next timeline
- Activity doesn't get added to new timeline without explicit selection
- Different activities can be selected on different timelines
- Back button navigation clears activity selection
- Modal-based activity selection works correctly
- Multiple-choice activities are handled correctly
- Regression tests to ensure fix doesn't break existing functionality

### `test-helpers.js`
Reusable helper functions for writing tests. See "Using Test Helpers" section below.

## Testing PR #51 Specifically

### Test on main branch (verify bug exists)
```bash
git checkout main
npm run test:e2e -- selected-activity-persistence.spec.js
```
Expected: Some tests may FAIL because the bug exists

### Test on PR branch (verify fix works)
```bash
git checkout fix-add-activity-in-other-timeline
npm run test:e2e -- selected-activity-persistence.spec.js
```
Expected: All tests should PASS because the fix is applied

### Run in headed mode to see the fix in action
```bash
git checkout fix-add-activity-in-other-timeline
npm run test:e2e:headed -- selected-activity-persistence.spec.js
```

## Using Test Helpers

The `test-helpers.js` file provides reusable functions. Example:

```javascript
import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  selectActivityByIndex,
  navigateToNextTimeline,
  assertSelectedActivityIsNull,
  debugState
} from './test-helpers.js';

test('example test', async ({ page }) => {
  await page.goto('/');
  await waitForAppReady(page);

  // Select an activity
  const activity = await selectActivityByIndex(page, 0);
  console.log('Selected:', activity.name);

  // Navigate to next timeline
  await navigateToNextTimeline(page);

  // Verify activity is cleared (PR #51 fix)
  await assertSelectedActivityIsNull(page);

  // Debug current state
  await debugState(page, 'After navigation');
});
```

**Available helpers:**
- `waitForAppReady(page)` - Wait for app initialization
- `getSelectedActivity(page)` - Get current selected activity
- `selectActivityByIndex(page, index)` - Select an activity
- `navigateToNextTimeline(page)` - Navigate forward
- `navigateToPreviousTimeline(page)` - Navigate backward
- `assertSelectedActivityIsNull(page)` - Verify no selection
- `assertSelectedActivityExists(page)` - Verify selection exists
- `debugState(page, label)` - Print debug info
- And more...

## Test Configuration

The tests are configured via `playwright.config.js` in the root directory. Key settings:

- **Base URL**: `http://localhost:8080` (automatically starts local server)
- **Web Server**: Runs `npm run start` before tests
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

To test against production:
```bash
TEST_URL=https://andreifoldes.github.io/o-timeusediary npm run test:e2e
```

## Debugging

If a test fails:

1. Check the HTML report: `npx playwright show-report`
2. Use debug mode: `npm run test:e2e:debug`
3. Check screenshots and videos in the `test-results/` directory
4. Use the Playwright trace viewer for detailed debugging

## Test Structure

The main test follows this flow:
1. **Setup**: Set viewport and navigate to instructions page
2. **Primary Activities**: Add 7 different activities with various categories
3. **Secondary Activities**: Add caring and eating activities
4. **Location**: Add location information
5. **People**: Add information about who was present
6. **Devices**: Add device usage information
7. **Enjoyment**: Add enjoyment ratings
8. **Submit**: Complete and submit the diary

## Notes

- Tests use aria snapshots to verify the UI state
- Regular expressions are used to match time patterns (e.g., `\\d+:\\d+`)
- The test includes extensive interactions with modals and dropdowns
- All assertions use Playwright's built-in expect matchers for reliability 