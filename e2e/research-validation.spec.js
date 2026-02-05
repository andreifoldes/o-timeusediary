// @ts-check
import { test, expect } from '@playwright/test';
import { waitForAppReady } from './test-helpers.js';

/**
 * Test Suite: Research-grade validation warnings
 *
 * Tests both the validation logic (research-validation.js) and the
 * warnings UI modal (validation-warnings-ui.js) against CTUR/HETUS
 * data quality standards.
 *
 * Strategy: inject mock activity arrays via page.evaluate() and
 * dynamically import the ES modules to exercise them in the real
 * browser environment.
 */

// ---------------------------------------------------------------------------
// Shared mock-data factories
// ---------------------------------------------------------------------------

/**
 * Build a minimal activity object matching the timelineManager data model.
 * @param {Partial<{id:string, activity:string, category:string, startMinutes:number, endMinutes:number, color:string}>} overrides
 */
function makeActivity(overrides = {}) {
  const start = overrides.startMinutes ?? 240;
  const end = overrides.endMinutes ?? start + 10;
  return {
    id: overrides.id ?? `test-${Math.random().toString(36).slice(2, 8)}`,
    activity: overrides.activity ?? 'Sleeping',
    category: overrides.category ?? 'Personal',
    startTime: minutesToHHMM(start),
    endTime: minutesToHHMM(end),
    startMinutes: start,
    endMinutes: end,
    color: overrides.color ?? '#a2b4ee',
  };
}

function minutesToHHMM(mins) {
  const h = String(Math.floor(mins / 60) % 24).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Good-quality diary — 8 distinct episodes across all 4 domains.
 * Should produce zero warnings.
 */
function goodDiary() {
  return [
    makeActivity({ activity: 'Sleeping',                               startMinutes: 240,  endMinutes: 720 }),
    makeActivity({ activity: 'Washing, Dressing',                      startMinutes: 720,  endMinutes: 750 }),
    makeActivity({ activity: 'Eating, Drinking, Meal (At Home or Work)', startMinutes: 750, endMinutes: 780 }),
    makeActivity({ activity: 'Travelling: in own car',                 startMinutes: 780,  endMinutes: 810 }),
    makeActivity({ activity: 'Paid Work (Including at Home)',          startMinutes: 810,  endMinutes: 1080 }),
    makeActivity({ activity: 'Travelling: in own car',                 startMinutes: 1080, endMinutes: 1110 }),
    makeActivity({ activity: 'Watching TV/DVD, Listening to Music',    startMinutes: 1110, endMinutes: 1290 }),
    makeActivity({ activity: 'Sleeping',                               startMinutes: 1290, endMinutes: 1440 }),
  ];
}

/**
 * Low-episode diary — only 3 distinct activities (below MIN_EPISODES=7).
 * Covers sleep + eating + travel but missing personal care (only 1 missing → no MISSING_DOMAINS).
 */
function lowEpisodeDiary() {
  return [
    makeActivity({ activity: 'Sleeping',                               startMinutes: 240,  endMinutes: 720 }),
    makeActivity({ activity: 'Eating, Drinking, Meal (At Home or Work)', startMinutes: 720, endMinutes: 780 }),
    makeActivity({ activity: 'Travelling: cycle',                      startMinutes: 780,  endMinutes: 810 }),
  ];
}

/**
 * Missing-domains diary — no travel, no personal care (2 missing → triggers warning).
 * Also only 4 episodes so triggers LOW_EPISODE_COUNT too.
 */
function missingDomainsDiary() {
  return [
    makeActivity({ activity: 'Sleeping',                               startMinutes: 240,  endMinutes: 720 }),
    makeActivity({ activity: 'Eating, Drinking, Meal (At Home or Work)', startMinutes: 720, endMinutes: 780 }),
    makeActivity({ activity: 'Paid Work (Including at Home)',          startMinutes: 780,  endMinutes: 1080 }),
    makeActivity({ activity: 'Watching TV/DVD, Listening to Music',    startMinutes: 1080, endMinutes: 1290 }),
  ];
}

/**
 * Long-activity diary — "Watching TV" for 4 hours (>180 min, not exempt).
 * Also has 7+ episodes to avoid LOW_EPISODE_COUNT, all 4 domains covered.
 */
function longActivityDiary() {
  return [
    makeActivity({ activity: 'Sleeping',                               startMinutes: 240,  endMinutes: 720 }),
    makeActivity({ activity: 'Washing, Dressing',                      startMinutes: 720,  endMinutes: 750 }),
    makeActivity({ activity: 'Eating, Drinking, Meal (At Home or Work)', startMinutes: 750, endMinutes: 780 }),
    makeActivity({ activity: 'Travelling: in own car',                 startMinutes: 780,  endMinutes: 810 }),
    makeActivity({ activity: 'Paid Work (Including at Home)',          startMinutes: 810,  endMinutes: 1080 }),
    makeActivity({ activity: 'Travelling: in own car',                 startMinutes: 1080, endMinutes: 1110 }),
    makeActivity({ id: 'long-tv', activity: 'Watching TV/DVD, Listening to Music', startMinutes: 1110, endMinutes: 1350 }),
    makeActivity({ activity: 'Sleeping',                               startMinutes: 1350, endMinutes: 1440 }),
  ];
}

/**
 * Consecutive-identical diary — 10 adjacent 10-min "Reading" blocks (>= 8 threshold).
 * Also has 7+ distinct episodes and all 4 domains to isolate the consecutive warning.
 */
function consecutiveDiary() {
  const readingBlocks = Array.from({ length: 10 }, (_, i) =>
    makeActivity({
      activity: 'Reading (Including E-books)',
      startMinutes: 900 + i * 10,
      endMinutes: 910 + i * 10,
    })
  );
  return [
    makeActivity({ activity: 'Sleeping',                               startMinutes: 240,  endMinutes: 720 }),
    makeActivity({ activity: 'Washing, Dressing',                      startMinutes: 720,  endMinutes: 750 }),
    makeActivity({ activity: 'Eating, Drinking, Meal (At Home or Work)', startMinutes: 750, endMinutes: 780 }),
    makeActivity({ activity: 'Travelling: in own car',                 startMinutes: 780,  endMinutes: 810 }),
    makeActivity({ activity: 'Paid Work (Including at Home)',          startMinutes: 810,  endMinutes: 900 }),
    ...readingBlocks,
    makeActivity({ activity: 'Sleeping',                               startMinutes: 1000, endMinutes: 1440 }),
  ];
}

// ---------------------------------------------------------------------------
// Helper: dynamically import the validation UI module inside the page
// ---------------------------------------------------------------------------

/**
 * Wait for page JS environment to be ready (lighter than waitForAppReady).
 * UI tests only need the page loaded + ES module imports working; they don't
 * need #activitiesContainer to be visible (it can be behind a PID modal).
 *
 * Includes a pid parameter to prevent the app from generating one and
 * navigating mid-test, and waits for network to settle.
 */
const UI_TEST_URL = '/?instructions=completed&pid=e2e-test';

async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 15000 });
}

/**
 * Call showValidationWarnings inside the page and return the promise handle.
 * The returned promise is NOT awaited here — the test interacts with the
 * modal DOM and the promise settles once the user clicks submit/review.
 */
async function openValidationModal(page, activities) {
  await page.evaluate((acts) => {
    // Store on window so the module import can access it
    window.__testActivities = acts;
  }, activities);

  // Fire-and-forget: the modal will appear in the DOM
  page.evaluate(async () => {
    const { showValidationWarnings } = await import('./js/validation-warnings-ui.js');
    window.__validationResult = showValidationWarnings(window.__testActivities);
  });

  // Wait for the overlay and at least one warning item to appear
  await page.waitForSelector('.validation-overlay', { timeout: 5000 });
  await page.waitForSelector('.validation-modal', { state: 'visible', timeout: 5000 });
}

/** Retrieve the resolved value of the validation promise. */
async function getValidationResult(page) {
  return page.evaluate(() => window.__validationResult);
}

// ============================================================================
// Test suites
// ============================================================================

test.describe('Research Validation — Logic (validateDiaryQuality)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?instructions=completed');
    await waitForAppReady(page);
  });

  test('good diary produces no warnings and score of 100', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, goodDiary());

    expect(result.warnings).toHaveLength(0);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.episodeCount).toBeGreaterThanOrEqual(7);
    expect(result.domainCoverage.missing).toHaveLength(0);
  });

  test('empty array returns EMPTY_DIARY warning', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality([]);
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('EMPTY_DIARY');
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('null input returns EMPTY_DIARY warning', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(null);
    });

    expect(result.warnings[0].type).toBe('EMPTY_DIARY');
    expect(result.passed).toBe(false);
  });

  test('fewer than 7 episodes triggers LOW_EPISODE_COUNT', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, lowEpisodeDiary());

    const lowEp = result.warnings.find(w => w.type === 'LOW_EPISODE_COUNT');
    expect(lowEp).toBeDefined();
    expect(lowEp.severity).toBe('moderate');
    expect(result.episodeCount).toBe(3);
  });

  test('missing 2+ domains triggers MISSING_DOMAINS', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, missingDomainsDiary());

    const domainWarn = result.warnings.find(w => w.type === 'MISSING_DOMAINS');
    expect(domainWarn).toBeDefined();
    expect(domainWarn.severity).toBe('moderate');
    expect(result.domainCoverage.missing.length).toBeGreaterThan(1);
  });

  test('missing only 1 domain does NOT trigger MISSING_DOMAINS', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, lowEpisodeDiary()); // covers sleep, eating, travel — missing only personalCare

    const domainWarn = result.warnings.find(w => w.type === 'MISSING_DOMAINS');
    expect(domainWarn).toBeUndefined();
  });

  test('non-exempt activity over 3 hours triggers LONG_ACTIVITY', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, longActivityDiary());

    const longWarn = result.warnings.find(w => w.type === 'LONG_ACTIVITY');
    expect(longWarn).toBeDefined();
    expect(longWarn.severity).toBe('low');
    expect(longWarn.activityId).toBe('long-tv');
    expect(longWarn.message).toContain('Watching TV');
  });

  test('exempt activities over 3 hours do NOT trigger LONG_ACTIVITY', async ({ page }) => {
    // Sleeping and Paid Work are both >3h in the good diary but are exempt
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, goodDiary());

    const longWarn = result.warnings.find(w => w.type === 'LONG_ACTIVITY');
    expect(longWarn).toBeUndefined();
  });

  test('8+ consecutive identical blocks triggers CONSECUTIVE_IDENTICAL', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, consecutiveDiary());

    const consWarn = result.warnings.find(w => w.type === 'CONSECUTIVE_IDENTICAL');
    expect(consWarn).toBeDefined();
    expect(consWarn.severity).toBe('low');
    expect(consWarn.message).toContain('10 times in a row');
    expect(consWarn.message).toContain('Reading');
  });

  test('7 consecutive identical blocks does NOT trigger warning', async ({ page }) => {
    const sevenBlocks = Array.from({ length: 7 }, (_, i) =>
      makeActivity({
        activity: 'Reading (Including E-books)',
        startMinutes: 900 + i * 10,
        endMinutes: 910 + i * 10,
      })
    );
    const diary = [
      ...goodDiary().slice(0, 5),
      ...sevenBlocks,
      makeActivity({ activity: 'Sleeping', startMinutes: 1200, endMinutes: 1440 }),
    ];

    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, diary);

    const consWarn = result.warnings.find(w => w.type === 'CONSECUTIVE_IDENTICAL');
    expect(consWarn).toBeUndefined();
  });

  test('quality score is clamped between 0 and 100', async ({ page }) => {
    // Single non-domain activity → many deductions, score should floor at 0
    const result = await page.evaluate(async () => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality([
        { id: '1', activity: 'Hobbies', category: 'Recreation', startMinutes: 240, endMinutes: 250, startTime: '04:00', endTime: '04:10', color: '#ccc' },
      ]);
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('consecutive episodes of DIFFERENT activities are counted separately', async ({ page }) => {
    // 8 blocks alternating between two activities — no consecutive-identical warning
    const diary = Array.from({ length: 8 }, (_, i) =>
      makeActivity({
        activity: i % 2 === 0 ? 'Reading (Including E-books)' : 'Using Computer',
        startMinutes: 900 + i * 10,
        endMinutes: 910 + i * 10,
      })
    );

    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, diary);

    const consWarn = result.warnings.find(w => w.type === 'CONSECUTIVE_IDENTICAL');
    expect(consWarn).toBeUndefined();
  });
});

// ===========================================================================

test.describe('Validation Warnings UI — Modal Behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_TEST_URL);
    await waitForPageReady(page);
  });

  test('no warnings → resolves immediately without showing modal', async ({ page }) => {
    const result = await page.evaluate(async (activities) => {
      const { showValidationWarnings } = await import('./js/validation-warnings-ui.js');
      return showValidationWarnings(activities);
    }, goodDiary());

    expect(result).toBe('submit');

    // Modal should never have appeared
    const overlay = page.locator('.validation-overlay');
    await expect(overlay).toHaveCount(0);
  });

  test('warnings present → modal is shown with correct structure', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    // Overlay
    const overlay = page.locator('.validation-overlay');
    await expect(overlay).toBeVisible();

    // Dialog
    const modal = page.locator('.validation-modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Title
    await expect(page.locator('#validation-title')).toHaveText('Review Your Diary');

    // Score badge
    await expect(page.locator('.quality-score')).toBeVisible();
    await expect(page.locator('.score-value')).toBeVisible();

    // At least one warning
    const items = page.locator('.warning-item');
    expect(await items.count()).toBeGreaterThan(0);

    // Buttons
    await expect(page.locator('#validation-review')).toBeVisible();
    await expect(page.locator('#validation-submit')).toBeVisible();

    // Footer note
    await expect(page.locator('.validation-note')).toContainText('suggestions');
  });

  test('"Submit Anyway" resolves with "submit" and removes modal', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    await page.locator('#validation-submit').click();

    // Wait for exit animation
    await page.waitForTimeout(300);

    const result = await getValidationResult(page);
    expect(result).toBe('submit');

    await expect(page.locator('.validation-overlay')).toHaveCount(0);
  });

  test('"Review My Diary" resolves with "review" and removes modal', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    await page.locator('#validation-review').click();
    await page.waitForTimeout(300);

    const result = await getValidationResult(page);
    expect(result).toBe('review');

    await expect(page.locator('.validation-overlay')).toHaveCount(0);
  });

  test('Escape key resolves with "review"', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const result = await getValidationResult(page);
    expect(result).toBe('review');

    await expect(page.locator('.validation-overlay')).toHaveCount(0);
  });

  test('clicking outside modal does not close it', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    // Click on overlay (outside modal)
    await page.locator('.validation-overlay').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    // Modal should still be visible
    await expect(page.locator('.validation-modal')).toBeVisible();
  });

  test('body scroll is locked while modal is open', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');

    // Close and verify scroll restored
    await page.locator('#validation-review').click();
    await page.waitForTimeout(300);

    const overflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(overflowAfter).not.toBe('hidden');
  });
});

// ===========================================================================

test.describe('Validation Warnings UI — Warning Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_TEST_URL);
    await waitForPageReady(page);
  });

  test('LOW_EPISODE_COUNT warning displays correct message', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const warningText = await page.locator('.warning-message').first().textContent();
    expect(warningText).toContain('3 activities');
    expect(warningText).toContain('at least 7');
  });

  test('MISSING_DOMAINS warning lists missing domains', async ({ page }) => {
    await openValidationModal(page, missingDomainsDiary());

    const warnings = page.locator('.warning-item');
    const allText = await warnings.allTextContents();
    const domainWarning = allText.find(t => t.includes("doesn't include"));
    expect(domainWarning).toBeDefined();
    // missingDomainsDiary is missing personalCare and travel
    expect(domainWarning).toContain('personal care');
    expect(domainWarning).toContain('travel');
  });

  test('LONG_ACTIVITY warning shows activity name and has "Go to" link', async ({ page }) => {
    await openValidationModal(page, longActivityDiary());

    const warnings = page.locator('.warning-item');
    const allText = await warnings.allTextContents();
    const longWarning = allText.find(t => t.includes('Watching TV'));
    expect(longWarning).toBeDefined();

    // Should have a "Go to this activity" link for the long activity
    const goToLink = page.locator('.warning-link[data-activity-id="long-tv"]');
    await expect(goToLink).toBeVisible();
    await expect(goToLink).toHaveText('Go to this activity');
  });

  test('CONSECUTIVE_IDENTICAL warning shows count and duration', async ({ page }) => {
    await openValidationModal(page, consecutiveDiary());

    const warnings = page.locator('.warning-item');
    const allText = await warnings.allTextContents();
    const consWarning = allText.find(t => t.includes('times in a row'));
    expect(consWarning).toBeDefined();
    expect(consWarning).toContain('Reading');
    expect(consWarning).toContain('10 times');
  });

  test('moderate warnings get moderate styling', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const moderateItems = page.locator('.warning-item.warning-moderate');
    expect(await moderateItems.count()).toBeGreaterThan(0);
  });

  test('low warnings get low styling', async ({ page }) => {
    await openValidationModal(page, longActivityDiary());

    const lowItems = page.locator('.warning-item.warning-low');
    expect(await lowItems.count()).toBeGreaterThan(0);
  });

  test('warning count is stated correctly in intro text', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const result = await page.evaluate(async (activities) => {
      const { validateDiaryQuality } = await import('./js/research-validation.js');
      return validateDiaryQuality(activities);
    }, lowEpisodeDiary());

    const introText = await page.locator('.validation-intro').textContent();
    expect(introText).toContain(`${result.warnings.length} thing`);
  });
});

// ===========================================================================

test.describe('Validation Warnings UI — Quality Score Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_TEST_URL);
    await waitForPageReady(page);
  });

  test('score >= 80 shows "good" badge', async ({ page }) => {
    // longActivityDiary has only 1 low warning → score ~97
    await openValidationModal(page, longActivityDiary());

    const badge = page.locator('.quality-score');
    await expect(badge).toHaveClass(/good/);
  });

  test('score < 60 shows "needs-attention" badge', async ({ page }) => {
    // missingDomainsDiary has 2 moderate warnings + domain deductions → low score
    await openValidationModal(page, missingDomainsDiary());

    const badge = page.locator('.quality-score');
    await expect(badge).toHaveClass(/needs-attention/);
  });

  test('score badge has accessible label', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const badge = page.locator('.quality-score');
    const label = await badge.getAttribute('aria-label');
    expect(label).toMatch(/Quality score: \d+ out of 100/);
  });

  test('score value is displayed as a number', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const scoreText = await page.locator('.score-value').textContent();
    expect(Number(scoreText)).not.toBeNaN();
    expect(Number(scoreText)).toBeGreaterThanOrEqual(0);
    expect(Number(scoreText)).toBeLessThanOrEqual(100);
  });
});

// ===========================================================================

test.describe('Validation Warnings UI — Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_TEST_URL);
    await waitForPageReady(page);
  });

  test('modal has correct ARIA attributes', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const modal = page.locator('.validation-modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'validation-title');
    await expect(modal).toHaveAttribute('aria-describedby', 'validation-desc');
  });

  test('overlay has role="presentation"', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const overlay = page.locator('.validation-overlay');
    await expect(overlay).toHaveAttribute('role', 'presentation');
  });

  test('warning icons are hidden from screen readers', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const icons = page.locator('.warning-icon');
    const count = await icons.count();
    for (let i = 0; i < count; i++) {
      await expect(icons.nth(i)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('focus moves to Review button on open', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    // Allow initial focus to settle
    await page.waitForTimeout(200);

    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('validation-review');
  });

  test('Tab key cycles through focusable elements', async ({ page }) => {
    await openValidationModal(page, longActivityDiary());
    await page.waitForTimeout(200);

    // Should start on Review
    let focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('validation-review');

    // Tab → should move to "Go to this activity" link (if present) or Submit
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    // Either a button.warning-link or #validation-submit
    expect(['button']).toContain(focusedTag);

    // Keep tabbing until we reach Submit
    for (let i = 0; i < 5; i++) {
      focusedId = await page.evaluate(() => document.activeElement?.id);
      if (focusedId === 'validation-submit') break;
      await page.keyboard.press('Tab');
    }
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('validation-submit');

    // One more Tab should wrap back to Review
    await page.keyboard.press('Tab');
    focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('validation-review');
  });

  test('Shift+Tab cycles focus backwards', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());
    await page.waitForTimeout(200);

    // Starting on Review, Shift+Tab should wrap to Submit
    await page.keyboard.press('Shift+Tab');
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('validation-submit');
  });

  test('focus is restored to previously focused element after close', async ({ page }) => {
    // Inject a focusable test anchor so we have a reliable target
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'focus-test-anchor';
      btn.textContent = 'Test Anchor';
      document.body.prepend(btn);
    });

    const anchor = page.locator('#focus-test-anchor');
    await anchor.focus();
    await page.waitForTimeout(100);

    await openValidationModal(page, lowEpisodeDiary());
    await page.locator('#validation-review').click();
    await page.waitForTimeout(300);

    // Focus should have returned to the test anchor
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe('focus-test-anchor');
  });

  test('warnings list uses correct list semantics', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const list = page.locator('.warnings-list');
    await expect(list).toHaveAttribute('role', 'list');

    const tagName = await list.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('ul');

    const items = page.locator('.warnings-list li.warning-item');
    await items.first().waitFor({ state: 'attached', timeout: 5000 });
    expect(await items.count()).toBeGreaterThan(0);
  });
});

// ===========================================================================

test.describe('Validation Warnings UI — Activity Highlight', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_TEST_URL);
    await waitForPageReady(page);
  });

  test('"Go to this activity" link closes modal and highlights block', async ({ page }) => {
    // Place an activity on the timeline so there's a real DOM block to find
    const activityId = 'highlight-test-id';

    // Inject a mock activity block into the timeline DOM
    await page.evaluate((id) => {
      const block = document.createElement('div');
      block.className = 'activity-block';
      block.dataset.id = id;
      block.style.cssText = 'position: absolute; width: 50px; height: 20px; top: 200px; left: 100px;';
      block.textContent = 'Test Activity';
      const timeline = document.querySelector('.timeline-column') || document.body;
      timeline.appendChild(block);
    }, activityId);

    // Create a diary with a long activity that references our mock block
    const diary = longActivityDiary().map(a =>
      a.id === 'long-tv' ? { ...a, id: activityId } : a
    );

    await openValidationModal(page, diary);

    const goToLink = page.locator(`.warning-link[data-activity-id="${activityId}"]`);
    await expect(goToLink).toBeVisible();
    await goToLink.click();

    // Wait for modal exit + highlight delay
    await page.waitForTimeout(600);

    // Modal should be gone
    await expect(page.locator('.validation-overlay')).toHaveCount(0);

    // Block should have the highlight class
    const block = page.locator(`.activity-block[data-id="${activityId}"]`);
    await expect(block).toHaveClass(/highlight-pulse/);
  });

  test('highlight-pulse class is removed after 2 seconds', async ({ page }) => {
    const activityId = 'pulse-timeout-test';

    await page.evaluate((id) => {
      const block = document.createElement('div');
      block.className = 'activity-block';
      block.dataset.id = id;
      block.style.cssText = 'position: absolute; width: 50px; height: 20px;';
      (document.querySelector('.timeline-column') || document.body).appendChild(block);
    }, activityId);

    const diary = longActivityDiary().map(a =>
      a.id === 'long-tv' ? { ...a, id: activityId } : a
    );

    await openValidationModal(page, diary);
    await page.locator(`.warning-link[data-activity-id="${activityId}"]`).click();

    // Wait for highlight to appear
    await page.waitForTimeout(600);
    await expect(page.locator(`.activity-block[data-id="${activityId}"]`)).toHaveClass(/highlight-pulse/);

    // Wait for highlight to be removed (2s timeout + buffer)
    await page.waitForTimeout(2000);
    const block = page.locator(`.activity-block[data-id="${activityId}"]`);
    await expect(block).not.toHaveClass(/highlight-pulse/);
  });
});

// ===========================================================================

test.describe('Validation Warnings UI — Entrance/Exit Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI_TEST_URL);
    await waitForPageReady(page);
  });

  test('overlay gains "visible" class on open', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    const overlay = page.locator('.validation-overlay');
    await expect(overlay).toHaveClass(/visible/);
  });

  test('overlay gains "closing" class before removal', async ({ page }) => {
    await openValidationModal(page, lowEpisodeDiary());

    // Click submit — triggers closing animation
    await page.locator('#validation-submit').click();

    // Immediately check for closing class (before the 200ms removal)
    const overlay = page.locator('.validation-overlay');
    await expect(overlay).toHaveClass(/closing/);
  });
});
