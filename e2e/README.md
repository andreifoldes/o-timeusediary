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

- `timediary-complete-flow.spec.js` - Complete end-to-end flow test that covers:
  - Starting the diary from instructions page
  - Adding multiple primary activities (Sleeping, Paid Work, Church, Services, Travel, Unpaid Work, Recreation)
  - Adding secondary activities (Caring, Eating)
  - Adding location information
  - Adding people information ("who" section)
  - Adding device usage information
  - Adding enjoyment ratings
  - Submitting the completed diary

## Test Configuration

The tests are configured via `playwright.config.js` in the root directory. Key settings:

- **Base URL**: `https://andreifoldes.github.io/timediary`
- **Viewport**: Tests run with 800x600 viewport (optimized for smaller screens)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on retry

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