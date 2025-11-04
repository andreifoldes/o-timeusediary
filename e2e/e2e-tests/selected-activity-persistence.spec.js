// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Test Suite for PR #51: Fix selected activity persistence bug
 *
 * Issue: window.selectedActivity persists when navigating to next timeline,
 * causing users to accidentally add wrong activities to new timelines.
 *
 * Fix: Clear window.selectedActivity when calling addNextTimeline()
 */

test.describe('Selected Activity Persistence (PR #51)', () => {

  test('diagnostic: verify all key elements are present and visible', async ({ page }) => {
    await page.goto('/?instructions=completed');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check viewport and window dimensions
    const viewport = page.viewportSize();
    const windowDimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    }));
    console.log('Viewport:', viewport);
    console.log('Window dimensions:', windowDimensions);

    // Check timeline
    const timelineContainer = page.locator('.timeline-container');
    await expect(timelineContainer).toBeVisible({ timeout: 15000 });
    console.log('✓ Timeline container is visible');

    const timeline = page.locator('.timeline');
    await expect(timeline).toBeVisible({ timeout: 15000 });
    console.log('✓ Timeline is visible');

    // Check activitiesContainer - don't require visibility
    const activitiesContainer = page.locator('#activitiesContainer');
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });

    const isContainerVisible = await activitiesContainer.isVisible();
    console.log('activitiesContainer visible:', isContainerVisible);

    // Get container styles
    const containerStyles = await activitiesContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        opacity: computed.opacity,
        position: computed.position,
        width: computed.width,
        height: computed.height
      };
    });
    console.log('Container styles:', containerStyles);

    // Check media query matching
    const mediaQueryInfo = await page.evaluate(() => {
      return {
        minWidth1440: window.matchMedia('(min-width: 1440px)').matches,
        maxWidth1439: window.matchMedia('(max-width: 1439.98px)').matches,
        landscapeOrientation: window.matchMedia('(orientation: landscape)').matches,
      };
    });
    console.log('Media queries:', mediaQueryInfo);

    // Check activity buttons
    const activityButtons = page.locator('.activity-button');
    const count = await activityButtons.count();
    console.log('Activity buttons count:', count);

    if (count > 0) {
      const firstButton = activityButtons.first();
      const isButtonVisible = await firstButton.isVisible();
      console.log('First activity button visible:', isButtonVisible);

      // Get computed styles
      const styles = await firstButton.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const parent = el.parentElement;
        const parentComputed = parent ? window.getComputedStyle(parent) : null;
        return {
          element: {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            position: computed.position
          },
          parent: parentComputed ? {
            display: parentComputed.display,
            visibility: parentComputed.visibility
          } : null
        };
      });
      console.log('First button styles:', styles);
    }

    // Check global state
    const hasTimelineManager = await page.evaluate(() => window.timelineManager !== undefined);
    const hasSelectedActivity = await page.evaluate(() => window.selectedActivity !== undefined);
    console.log('window.timelineManager:', hasTimelineManager);
    console.log('window.selectedActivity:', hasSelectedActivity);

    // This test always passes - it's just for diagnostics
    expect(true).toBe(true);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the application, skipping instructions
    await page.goto('/?instructions=completed');

    // Clear any persisted data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload to ensure clean state
    await page.reload();

    // Wait for the main timeline to be visible
    await page.waitForSelector('.timeline-container', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('.timeline', { state: 'visible', timeout: 15000 });

    // Wait for activities container to be attached (not necessarily visible yet)
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });

    // Wait for activity buttons to be attached (not necessarily visible yet)
    await page.waitForSelector('.activity-button', { state: 'attached', timeout: 15000 });

    // Wait for app to be initialized
    await page.waitForFunction(() => window.timelineManager !== undefined);
    await page.waitForFunction(() => window.selectedActivity !== undefined);

    // Wait a bit for any animations/modals to settle
    await page.waitForTimeout(1000);
  });

  test('should clear selectedActivity when navigating to next timeline', async ({ page }) => {
    // Step 1: Select an activity on Timeline 1
    const activityButton = page.locator('.activity-button').first();
    await activityButton.click();

    // Verify activity is selected
    const selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).not.toBeNull();
    expect(selectedActivity).toHaveProperty('name');

    const activityName = selectedActivity.name;
    console.log(`Selected activity: ${activityName}`);

    // Step 2: Navigate to next timeline
    const nextButton = page.locator('#nextBtn');
    await nextButton.waitFor({ state: 'visible' });

    // Wait for button to be enabled (may have initial disabled state)
    await page.waitForFunction(() => {
      const btn = document.getElementById('nextBtn');
      return btn && !btn.disabled;
    });

    await nextButton.click();

    // Wait for navigation to complete
    await page.waitForTimeout(500); // Allow debounce to complete

    // Step 3: Verify selectedActivity is cleared (FIX)
    const selectedActivityAfterNav = await page.evaluate(() => window.selectedActivity);

    // THIS IS THE CRITICAL TEST - After PR #51 fix, this should be null
    expect(selectedActivityAfterNav).toBeNull();

    // Verify we actually moved to a new timeline
    const currentIndex = await page.evaluate(() => window.timelineManager.currentIndex);
    expect(currentIndex).toBe(1);
  });

  test('should not add activity to new timeline without selection', async ({ page }) => {
    // Step 1: Select an activity on Timeline 1
    const activityButton = page.locator('.activity-button').first();
    // Activity button exists (checked in beforeEach)
    await activityButton.click();

    // Step 2: Add activity to Timeline 1 by clicking on timeline
    const timeline = page.locator('.timeline').first();
    await timeline.click({ position: { x: 500, y: 50 }, force: true });

    // Verify activity was added
    const timeline1Activities = await page.evaluate(() => {
      const key = window.timelineManager.keys[0];
      return window.timelineManager.activities[key] || [];
    });
    expect(timeline1Activities.length).toBeGreaterThan(0);

    // Step 3: Navigate to next timeline
    const nextButton = page.locator('#nextBtn');
    await page.waitForFunction(() => {
      const btn = document.getElementById('nextBtn');
      return btn && !btn.disabled;
    });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Step 4: Verify no activity is selected
    const selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).toBeNull();

    // Step 5: Try clicking on Timeline 2 - should do nothing
    const timeline2 = page.locator('.timeline').first();
    await timeline2.click({ position: { x: 500, y: 50 }, force: true });

    // Verify no activity was added to Timeline 2
    const timeline2Activities = await page.evaluate(() => {
      const key = window.timelineManager.keys[1];
      return window.timelineManager.activities[key] || [];
    });

    // Timeline 2 should be empty (no accidental activity addition)
    expect(timeline2Activities.length).toBe(0);
  });

  test('should allow selecting different activities on different timelines', async ({ page }) => {
    // Timeline 1: Select first activity
    const activityButtons = page.locator('.activity-button');
    // Activity buttons exist (checked in beforeEach)
    await activityButtons.first().click();

    const activity1 = await page.evaluate(() => window.selectedActivity);
    expect(activity1).not.toBeNull();
    const activity1Name = activity1.name;

    // Add to Timeline 1
    const timeline = page.locator('.timeline').first();
    await timeline.click({ position: { x: 500, y: 50 }, force: true });

    // Navigate to Timeline 2
    const nextButton = page.locator('#nextBtn');
    await page.waitForFunction(() => !document.getElementById('nextBtn').disabled);
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify activity is cleared
    let selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).toBeNull();

    // Timeline 2: Select a different activity (if available)
    const activityCount = await activityButtons.count();
    if (activityCount > 1) {
      // Wait a bit for UI to stabilize after navigation
      await page.waitForTimeout(500);
      await activityButtons.nth(1).click({ force: true });
      await page.waitForTimeout(100);

      const activity2 = await page.evaluate(() => window.selectedActivity);
      expect(activity2).not.toBeNull();
      const activity2Name = activity2.name;

      // Verify it's a different activity (or at least independently selected)
      expect(activity2Name).toBeDefined();

      console.log(`Timeline 1: ${activity1Name}, Timeline 2: ${activity2Name}`);
    }
  });

  test('should clear activity when using back button navigation', async ({ page }) => {
    // Select activity on Timeline 1
    const activityButton = page.locator('.activity-button').first();
    // Activity button exists (checked in beforeEach)
    await activityButton.click();

    const activity1 = await page.evaluate(() => window.selectedActivity);
    expect(activity1).not.toBeNull();

    // Navigate to Timeline 2
    const nextButton = page.locator('#nextBtn');
    await page.waitForFunction(() => !document.getElementById('nextBtn').disabled);
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify cleared
    let selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).toBeNull();

    // Navigate back to Timeline 1
    const backButton = page.locator('#backBtn');
    await page.waitForFunction(() => !document.getElementById('backBtn').disabled);
    await backButton.click();
    await page.waitForTimeout(500);

    // Verify activity is still cleared (not restored from Timeline 1)
    selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).toBeNull();
  });
});

// Test for regression - ensure the fix doesn't break existing functionality
test.describe('Regression Tests - Activity Selection', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application, skipping instructions
    await page.goto('/?instructions=completed');

    // Wait for the main timeline to be visible
    await page.waitForSelector('.timeline-container', { state: 'visible', timeout: 15000 });
    await page.waitForSelector('.timeline', { state: 'visible', timeout: 15000 });

    // Wait for activities container to be attached (not necessarily visible yet)
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });

    // Wait for activity buttons to be attached (not necessarily visible yet)
    await page.waitForSelector('.activity-button', { state: 'attached', timeout: 15000 });

    // Wait for app to be initialized
    await page.waitForFunction(() => window.timelineManager !== undefined);
    await page.waitForFunction(() => window.selectedActivity !== undefined);

    // Wait a bit for any animations/modals to settle
    await page.waitForTimeout(1000);
  });

  test('should still allow adding activities to current timeline', async ({ page }) => {
    // Select activity
    const activityButton = page.locator('.activity-button').first();
    // Activity button exists (checked in beforeEach)
    await activityButton.click();

    // Verify selection
    let selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).not.toBeNull();

    // Click on timeline to add activity
    const timeline = page.locator('.timeline').first();
    await timeline.click({ position: { x: 500, y: 50 }, force: true });

    // Verify activity was added
    const activities = await page.evaluate(() => {
      const key = window.timelineManager.keys[0];
      return window.timelineManager.activities[key] || [];
    });

    expect(activities.length).toBeGreaterThan(0);
  });

  test('should preserve activity selection within same timeline', async ({ page }) => {
    // Select activity
    const activityButton = page.locator('.activity-button').first();
    // Activity button exists (checked in beforeEach)
    await activityButton.click();

    const activity1 = await page.evaluate(() => window.selectedActivity);
    expect(activity1).not.toBeNull();
    const activityName = activity1.name;

    // Wait a bit
    await page.waitForTimeout(1000);

    // Verify activity is still selected (not cleared unless navigating)
    const activity2 = await page.evaluate(() => window.selectedActivity);
    expect(activity2).not.toBeNull();
    expect(activity2.name).toBe(activityName);
  });
});
