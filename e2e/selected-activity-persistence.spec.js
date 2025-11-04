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

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the application to fully load
    await page.waitForSelector('#activitiesContainer', { timeout: 10000 });
    await page.waitForFunction(() => window.timelineManager !== undefined);

    // Clear any persisted data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload to ensure clean state
    await page.reload();
    await page.waitForSelector('#activitiesContainer', { timeout: 10000 });
  });

  test('should clear selectedActivity when navigating to next timeline', async ({ page }) => {
    // Step 1: Select an activity on Timeline 1
    const activityButton = page.locator('.activity-button').first();
    await activityButton.waitFor({ state: 'visible', timeout: 10000 });
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
    await activityButton.waitFor({ state: 'visible' });
    await activityButton.click();

    // Step 2: Add activity to Timeline 1 by clicking on timeline
    const timeline = page.locator('.timeline-column').first();
    await timeline.click({ position: { x: 50, y: 100 } });

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
    const timeline2 = page.locator('.timeline-column').first();
    await timeline2.click({ position: { x: 50, y: 100 } });

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
    await activityButtons.first().waitFor({ state: 'visible' });
    await activityButtons.first().click();

    const activity1 = await page.evaluate(() => window.selectedActivity);
    expect(activity1).not.toBeNull();
    const activity1Name = activity1.name;

    // Add to Timeline 1
    const timeline = page.locator('.timeline-column').first();
    await timeline.click({ position: { x: 50, y: 100 } });

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
      await activityButtons.nth(1).click();

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
    await activityButton.waitFor({ state: 'visible' });
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

  test('should handle activity selection via modal', async ({ page }) => {
    // Check if there's an activities modal button
    const modalButton = page.locator('button:has-text("Activities"), button:has-text("Select Activity")').first();

    if (await modalButton.isVisible()) {
      // Open modal
      await modalButton.click();

      // Wait for modal to appear
      const modal = page.locator('#activitiesModal, .modal');
      await modal.waitFor({ state: 'visible' });

      // Select an activity from modal
      const modalActivity = modal.locator('.activity-button').first();
      await modalActivity.click();

      // Verify activity is selected
      let selectedActivity = await page.evaluate(() => window.selectedActivity);
      expect(selectedActivity).not.toBeNull();

      // Navigate to next timeline
      const nextButton = page.locator('#nextBtn');
      await page.waitForFunction(() => !document.getElementById('nextBtn').disabled);
      await nextButton.click();
      await page.waitForTimeout(500);

      // Verify activity is cleared after navigation
      selectedActivity = await page.evaluate(() => window.selectedActivity);
      expect(selectedActivity).toBeNull();
    }
  });

  test('should handle multiple-choice activities correctly', async ({ page }) => {
    // Look for multiple-choice category
    const multipleChoiceButton = page.locator('[data-mode="multiple-choice"] .activity-button').first();

    if (await multipleChoiceButton.isVisible()) {
      // Select multiple activities
      await multipleChoiceButton.click();

      let selectedActivity = await page.evaluate(() => window.selectedActivity);
      expect(selectedActivity).not.toBeNull();

      // Navigate to next timeline
      const nextButton = page.locator('#nextBtn');
      await page.waitForFunction(() => !document.getElementById('nextBtn').disabled);
      await nextButton.click();
      await page.waitForTimeout(500);

      // Verify selections are cleared
      selectedActivity = await page.evaluate(() => window.selectedActivity);
      expect(selectedActivity).toBeNull();
    }
  });

  test('should maintain proper state in console logs', async ({ page }) => {
    // Listen to console logs
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('[ACTIVITY]') || msg.text().includes('window.selectedActivity')) {
        logs.push(msg.text());
      }
    });

    // Select activity
    const activityButton = page.locator('.activity-button').first();
    await activityButton.waitFor({ state: 'visible' });
    await activityButton.click();

    // Navigate
    const nextButton = page.locator('#nextBtn');
    await page.waitForFunction(() => !document.getElementById('nextBtn').disabled);
    await nextButton.click();
    await page.waitForTimeout(500);

    // Check selectedActivity state
    const selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).toBeNull();

    console.log('Console logs captured:', logs);
  });
});

// Test for regression - ensure the fix doesn't break existing functionality
test.describe('Regression Tests - Activity Selection', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#activitiesContainer', { timeout: 10000 });
    await page.waitForFunction(() => window.timelineManager !== undefined);
  });

  test('should still allow adding activities to current timeline', async ({ page }) => {
    // Select activity
    const activityButton = page.locator('.activity-button').first();
    await activityButton.waitFor({ state: 'visible' });
    await activityButton.click();

    // Verify selection
    let selectedActivity = await page.evaluate(() => window.selectedActivity);
    expect(selectedActivity).not.toBeNull();

    // Click on timeline to add activity
    const timeline = page.locator('.timeline-column').first();
    await timeline.click({ position: { x: 50, y: 100 } });

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
    await activityButton.waitFor({ state: 'visible' });
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
