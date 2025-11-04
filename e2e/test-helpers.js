// @ts-check
import { expect } from '@playwright/test';

/**
 * Test Helper Functions for Time Use Diary E2E Tests
 */

/**
 * Wait for the application to be fully loaded and initialized
 * @param {import('@playwright/test').Page} page
 */
export async function waitForAppReady(page) {
  await page.waitForSelector('#activitiesContainer', { timeout: 10000 });
  await page.waitForFunction(() => window.timelineManager !== undefined);
  await page.waitForFunction(() => window.selectedActivity !== undefined);
}

/**
 * Clear all application data and reload
 * @param {import('@playwright/test').Page} page
 */
export async function clearAppData(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await waitForAppReady(page);
}

/**
 * Get the currently selected activity
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<any>}
 */
export async function getSelectedActivity(page) {
  return await page.evaluate(() => window.selectedActivity);
}

/**
 * Get the current timeline index
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getCurrentTimelineIndex(page) {
  return await page.evaluate(() => window.timelineManager.currentIndex);
}

/**
 * Get activities for a specific timeline
 * @param {import('@playwright/test').Page} page
 * @param {number} timelineIndex
 * @returns {Promise<Array>}
 */
export async function getTimelineActivities(page, timelineIndex) {
  return await page.evaluate((index) => {
    const key = window.timelineManager.keys[index];
    return window.timelineManager.activities[key] || [];
  }, timelineIndex);
}

/**
 * Select an activity button by index
 * @param {import('@playwright/test').Page} page
 * @param {number} index
 */
export async function selectActivityByIndex(page, index = 0) {
  const activityButton = page.locator('.activity-button').nth(index);
  await activityButton.waitFor({ state: 'visible', timeout: 10000 });
  await activityButton.click();

  // Wait for selection to register
  await page.waitForTimeout(100);

  const selected = await getSelectedActivity(page);
  expect(selected).not.toBeNull();

  return selected;
}

/**
 * Navigate to next timeline
 * @param {import('@playwright/test').Page} page
 */
export async function navigateToNextTimeline(page) {
  const nextButton = page.locator('#nextBtn');

  // Wait for button to be enabled
  await page.waitForFunction(() => {
    const btn = document.getElementById('nextBtn');
    return btn && !btn.disabled;
  }, { timeout: 5000 });

  const currentIndex = await getCurrentTimelineIndex(page);
  await nextButton.click();

  // Wait for navigation to complete (debounce + animation)
  await page.waitForTimeout(500);

  // Verify navigation happened
  const newIndex = await getCurrentTimelineIndex(page);
  expect(newIndex).toBe(currentIndex + 1);
}

/**
 * Navigate to previous timeline
 * @param {import('@playwright/test').Page} page
 */
export async function navigateToPreviousTimeline(page) {
  const backButton = page.locator('#backBtn');

  // Wait for button to be enabled
  await page.waitForFunction(() => {
    const btn = document.getElementById('backBtn');
    return btn && !btn.disabled;
  }, { timeout: 5000 });

  const currentIndex = await getCurrentTimelineIndex(page);
  await backButton.click();

  // Wait for navigation to complete
  await page.waitForTimeout(500);

  // Verify navigation happened
  const newIndex = await getCurrentTimelineIndex(page);
  expect(newIndex).toBe(currentIndex - 1);
}

/**
 * Click on timeline to add an activity
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @param {number} options.x - X position percentage (0-100)
 * @param {number} options.y - Y position percentage (0-100)
 */
export async function clickOnTimeline(page, options = { x: 50, y: 20 }) {
  const timeline = page.locator('.timeline-column').first();
  await timeline.click({ position: { x: options.x, y: options.y } });

  // Wait for click to register
  await page.waitForTimeout(200);
}

/**
 * Verify that selectedActivity is null
 * @param {import('@playwright/test').Page} page
 */
export async function assertSelectedActivityIsNull(page) {
  const selectedActivity = await getSelectedActivity(page);
  expect(selectedActivity).toBeNull();
}

/**
 * Verify that selectedActivity is not null
 * @param {import('@playwright/test').Page} page
 */
export async function assertSelectedActivityExists(page) {
  const selectedActivity = await getSelectedActivity(page);
  expect(selectedActivity).not.toBeNull();
  return selectedActivity;
}

/**
 * Open the activities modal (if it exists)
 * @param {import('@playwright/test').Page} page
 */
export async function openActivitiesModal(page) {
  const modalButton = page.locator('button:has-text("Activities"), button:has-text("Select Activity")').first();

  if (await modalButton.isVisible()) {
    await modalButton.click();

    const modal = page.locator('#activitiesModal, .modal');
    await modal.waitFor({ state: 'visible' });

    return true;
  }

  return false;
}

/**
 * Close the activities modal
 * @param {import('@playwright/test').Page} page
 */
export async function closeActivitiesModal(page) {
  const closeButton = page.locator('#activitiesModal .close, .modal .close').first();

  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Get all activity buttons
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>}
 */
export function getActivityButtons(page) {
  return page.locator('.activity-button');
}

/**
 * Check if Next button is enabled
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isNextButtonEnabled(page) {
  return await page.evaluate(() => {
    const btn = document.getElementById('nextBtn');
    return btn && !btn.disabled;
  });
}

/**
 * Check if Back button is enabled
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isBackButtonEnabled(page) {
  return await page.evaluate(() => {
    const btn = document.getElementById('backBtn');
    return btn && !btn.disabled;
  });
}

/**
 * Get the total number of timelines
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
export async function getTotalTimelines(page) {
  return await page.evaluate(() => window.timelineManager.keys.length);
}

/**
 * Print debug information about current state
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
export async function debugState(page, label = 'Debug') {
  const state = await page.evaluate(() => ({
    currentIndex: window.timelineManager.currentIndex,
    totalTimelines: window.timelineManager.keys.length,
    selectedActivity: window.selectedActivity,
    activities: Object.keys(window.timelineManager.activities).reduce((acc, key) => {
      acc[key] = window.timelineManager.activities[key].length;
      return acc;
    }, {})
  }));

  console.log(`\n=== ${label} ===`);
  console.log('Current Timeline:', state.currentIndex);
  console.log('Total Timelines:', state.totalTimelines);
  console.log('Selected Activity:', state.selectedActivity?.name || 'null');
  console.log('Activities per timeline:', state.activities);
  console.log('================\n');
}
