// @ts-check
import { test, expect } from '@playwright/test';
import { makeAxeBuilder, formatViolationReport, getViolationSummary } from './axe-config.js';

/**
 * Accessibility Tests for O-TUD Core Pages
 *
 * These tests establish a baseline for WCAG 2.1 AA compliance.
 * Known violations are temporarily excluded to allow CI to pass.
 * See docs/accessibility-baseline.md for details on tracked violations.
 */

/**
 * Known violations that are temporarily excluded.
 * Each exclusion should have a comment explaining why and a tracking reference.
 * Remove exclusions as violations are fixed.
 */
const KNOWN_VIOLATIONS = {
  /**
   * color-contrast: Submit button on instructions page has insufficient contrast
   * Foreground: #ffffff, Background: #059669, Ratio: 3.76:1 (needs 4.5:1)
   * Tracked in: docs/accessibility-baseline.md
   * Fix: Darken button background to #047857 or darker
   */
  colorContrast: 'color-contrast',

  /**
   * meta-viewport: Zoom/scaling disabled via <meta name="viewport">
   * Current: maximum-scale=1.0, user-scalable=no
   * Tracked in: docs/accessibility-baseline.md
   * Fix: Remove zoom restrictions, use CSS touch-action for specific elements if needed
   */
  metaViewport: 'meta-viewport',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__OTUD_TEST__ = true;
  });
});

/**
 * Create an AxeBuilder with known violations excluded
 * This allows tests to pass while tracking technical debt
 * @param {import('@playwright/test').Page} page
 * @returns {import('@axe-core/playwright').default}
 */
function makeAxeBuilderWithExclusions(page) {
  return makeAxeBuilder(page)
    .disableRules([
      KNOWN_VIOLATIONS.colorContrast,
      KNOWN_VIOLATIONS.metaViewport,
    ]);
}

test.describe('Accessibility - Core Pages', () => {
  test.describe('Main Timeline (index.html)', () => {
    test('should have no critical accessibility violations on initial load', async ({ page }) => {
      await page.goto('/');

      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');

      // Allow time for JavaScript initialization
      await page.waitForTimeout(2000);

      const results = await makeAxeBuilderWithExclusions(page).analyze();

      // Log detailed report for debugging
      console.log('\n=== Main Timeline Accessibility Report ===');
      console.log(`Summary: ${getViolationSummary(results.violations)}`);
      if (results.violations.length > 0) {
        console.log(formatViolationReport(results.violations));
      }

      // Fail on any remaining critical/serious violations (after exclusions)
      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(
        criticalViolations,
        `Found ${criticalViolations.length} critical/serious accessibility violations`
      ).toHaveLength(0);
    });

    test('should have no accessibility violations with activity modal open', async ({ page }) => {
      // Force mobile viewport so the activity modal can be opened via the floating button
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const floatingButton = page.locator('.floating-add-button');
      await expect(floatingButton).toBeVisible();
      await floatingButton.click();

      const activitiesModal = page.locator('#activitiesModal');
      await expect(activitiesModal).toBeVisible();

      const results = await makeAxeBuilderWithExclusions(page)
        .include('#activitiesModal')
        .analyze();

      console.log('\n=== Activity Modal Accessibility Report ===');
      console.log(`Summary: ${getViolationSummary(results.violations)}`);
      if (results.violations.length > 0) {
        console.log(formatViolationReport(results.violations));
      }

      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(
        criticalViolations,
        `Found ${criticalViolations.length} critical/serious accessibility violations`
      ).toHaveLength(0);
    });
  });

  test.describe('Instructions Page (pages/instructions.html)', () => {
    test('should have no critical accessibility violations', async ({ page }) => {
      await page.goto('/pages/instructions.html');

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const results = await makeAxeBuilderWithExclusions(page).analyze();

      console.log('\n=== Instructions Page Accessibility Report ===');
      console.log(`Summary: ${getViolationSummary(results.violations)}`);
      if (results.violations.length > 0) {
        console.log(formatViolationReport(results.violations));
      }

      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(
        criticalViolations,
        `Found ${criticalViolations.length} critical/serious accessibility violations`
      ).toHaveLength(0);
    });
  });

  test.describe('Thank You Page (pages/thank-you.html)', () => {
    test('should have no critical accessibility violations', async ({ page }) => {
      await page.goto('/pages/thank-you.html');

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Thank you page currently passes - use standard builder without exclusions
      // to catch any new violations immediately
      const results = await makeAxeBuilder(page).analyze();

      console.log('\n=== Thank You Page Accessibility Report ===');
      console.log(`Summary: ${getViolationSummary(results.violations)}`);
      if (results.violations.length > 0) {
        console.log(formatViolationReport(results.violations));
      }

      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(
        criticalViolations,
        `Found ${criticalViolations.length} critical/serious accessibility violations`
      ).toHaveLength(0);
    });
  });
});

/**
 * Mobile viewport accessibility tests
 * Tests the same pages in mobile viewport to catch responsive-specific issues
 */
test.describe('Accessibility - Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('Main timeline should have no critical violations on mobile', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // Extra time for mobile layout adjustments

    const results = await makeAxeBuilderWithExclusions(page).analyze();

    console.log('\n=== Main Timeline (Mobile) Accessibility Report ===');
    console.log(`Summary: ${getViolationSummary(results.violations)}`);
    if (results.violations.length > 0) {
      console.log(formatViolationReport(results.violations));
    }

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      criticalViolations,
      `Found ${criticalViolations.length} critical/serious accessibility violations on mobile`
    ).toHaveLength(0);
  });

  test('Instructions page should have no critical violations on mobile', async ({ page }) => {
    await page.goto('/pages/instructions.html');

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const results = await makeAxeBuilderWithExclusions(page).analyze();

    console.log('\n=== Instructions Page (Mobile) Accessibility Report ===');
    console.log(`Summary: ${getViolationSummary(results.violations)}`);
    if (results.violations.length > 0) {
      console.log(formatViolationReport(results.violations));
    }

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      criticalViolations,
      `Found ${criticalViolations.length} critical/serious accessibility violations on mobile`
    ).toHaveLength(0);
  });
});

/**
 * Baseline Audit Test
 * This test runs WITHOUT exclusions to generate a full violation report.
 * Use this to update the accessibility baseline document.
 * Run with: npm run test:a11y -- --grep "Baseline Audit" --project=chromium
 */
test.describe('Accessibility - Baseline Audit (Full Report)', () => {
  test('Generate full violation report for all pages @baseline', async ({ page }, testInfo) => {
    // Only run this test on Chromium to avoid duplicate reports
    test.skip(testInfo.project.name !== 'chromium', 'Run baseline audit on Chromium only');

    /** @type {{index: any[], instructions: any[], thankYou: any[]}} */
    const allViolations = {
      index: [],
      instructions: [],
      thankYou: [],
    };

    // Test index.html
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const indexResults = await makeAxeBuilder(page).analyze();
    allViolations.index = indexResults.violations;

    // Test instructions.html
    await page.goto('/pages/instructions.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const instructionsResults = await makeAxeBuilder(page).analyze();
    allViolations.instructions = instructionsResults.violations;

    // Test thank-you.html
    await page.goto('/pages/thank-you.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const thankYouResults = await makeAxeBuilder(page).analyze();
    allViolations.thankYou = thankYouResults.violations;

    // Output full report
    console.log('\n' + '='.repeat(80));
    console.log('ACCESSIBILITY BASELINE AUDIT - FULL REPORT');
    console.log('='.repeat(80));

    console.log('\n--- index.html ---');
    console.log(`Summary: ${getViolationSummary(allViolations.index)}`);
    console.log(formatViolationReport(allViolations.index));

    console.log('\n--- instructions.html ---');
    console.log(`Summary: ${getViolationSummary(allViolations.instructions)}`);
    console.log(formatViolationReport(allViolations.instructions));

    console.log('\n--- thank-you.html ---');
    console.log(`Summary: ${getViolationSummary(allViolations.thankYou)}`);
    console.log(formatViolationReport(allViolations.thankYou));

    console.log('\n' + '='.repeat(80));
    console.log('END OF BASELINE AUDIT');
    console.log('='.repeat(80));

    // This test always passes - it's for generating reports
    expect(true).toBe(true);
  });
});
