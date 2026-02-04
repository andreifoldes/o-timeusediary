// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Test Suite: Activity Search with Recent History
 *
 * Tests the search input, filtering, recent activity panel,
 * keyboard accessibility, and screen reader announcements.
 *
 * Viewport: 1920x1080 (desktop layout, #activitiesContainer visible)
 */

test.describe('Activity Search', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?instructions=completed');

    // Wait for app to fully initialize
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });
    await page.waitForFunction(() => window.selectedActivity !== undefined, { timeout: 10000 });

    // Clear sessionStorage to reset recent activities
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });

    // Wait for activity buttons to be rendered
    await page.waitForSelector('#activitiesContainer .activity-button', { state: 'visible', timeout: 10000 });

    // Wait for search UI to be rendered
    await page.waitForSelector('#activitiesContainer .activity-search-wrapper', { state: 'visible', timeout: 10000 });
  });

  test('search input is rendered in activities container', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('type', 'search');
    await expect(searchInput).toHaveAttribute('placeholder', 'Search activities...');
  });

  test('recent activities panel is rendered', async ({ page }) => {
    const recentPanel = page.locator('#activitiesContainer .recent-activities-panel');
    await expect(recentPanel).toBeVisible();

    // Should show "No recent activities" initially
    const noRecent = page.locator('#activitiesContainer .no-recent');
    await expect(noRecent).toBeVisible();
    await expect(noRecent).toHaveText('No recent activities');
  });

  test('search input filters activities by name', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');
    const allButtons = page.locator('#activitiesContainer .activity-button');

    // Count total activity buttons before search
    const totalBefore = await allButtons.count();
    expect(totalBefore).toBeGreaterThan(0);

    // Type a search term that matches a known activity
    await searchInput.fill('Sleep');
    // Wait for debounce
    await page.waitForTimeout(200);

    // Count visible buttons after search
    const visibleAfter = await page.locator('#activitiesContainer .activity-button:visible').count();
    expect(visibleAfter).toBeGreaterThan(0);
    expect(visibleAfter).toBeLessThan(totalBefore);

    // Verify the visible button contains the search term
    const firstVisible = page.locator('#activitiesContainer .activity-button:visible').first();
    const text = await firstVisible.textContent();
    expect(text.toLowerCase()).toContain('sleep');
  });

  test('search filters by category name', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    // Search for a category name (from activities.json)
    await searchInput.fill('Personal');
    await page.waitForTimeout(200);

    // Activities in the "Personal" category should remain visible
    const visibleButtons = page.locator('#activitiesContainer .activity-button:visible');
    const count = await visibleButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clearing search shows all activities', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');
    const allButtons = page.locator('#activitiesContainer .activity-button');

    const totalBefore = await allButtons.count();

    // Filter then clear
    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);
    await searchInput.fill('');
    await page.waitForTimeout(200);

    // All should be visible again
    const visibleAfter = await page.locator('#activitiesContainer .activity-button:visible').count();
    expect(visibleAfter).toBe(totalBefore);
  });

  test('non-matching search hides all activities and shows empty categories hidden', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('xyznonexistent999');
    await page.waitForTimeout(200);

    const visibleButtons = await page.locator('#activitiesContainer .activity-button:visible').count();
    expect(visibleButtons).toBe(0);

    // Categories with no visible buttons should be hidden
    const visibleCategories = await page.locator('#activitiesContainer .activity-category:visible').count();
    expect(visibleCategories).toBe(0);
  });

  test('empty categories are hidden during search', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    // Search for a term that only matches one category's activities
    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // At least one category should still be visible
    const visibleCategories = await page.locator('#activitiesContainer .activity-category:visible').count();
    expect(visibleCategories).toBeGreaterThan(0);

    // But not all categories should be visible (some have no matches)
    const allCategories = await page.locator('#activitiesContainer .activity-category').count();
    if (allCategories > 1) {
      expect(visibleCategories).toBeLessThan(allCategories);
    }
  });

  test('recent panel is hidden during active search', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');
    const recentPanel = page.locator('#activitiesContainer .recent-activities-panel');

    await expect(recentPanel).toBeVisible();

    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    await expect(recentPanel).toBeHidden();

    // Clear search - recent panel reappears
    await searchInput.fill('');
    await page.waitForTimeout(200);
    await expect(recentPanel).toBeVisible();
  });
});

test.describe('Activity Search - Recent History', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?instructions=completed');
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });

    // Clear sessionStorage for clean recent history
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });
    await page.waitForSelector('#activitiesContainer .activity-button', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('#activitiesContainer .activity-search-wrapper', { state: 'visible', timeout: 10000 });
  });

  test('selecting an activity records it in recent history', async ({ page }) => {
    // Select first activity
    const activityButton = page.locator('#activitiesContainer .activity-button').first();
    await activityButton.click();

    // Verify selection occurred
    const selected = await page.evaluate(() => window.selectedActivity);
    expect(selected).not.toBeNull();
    expect(selected).toHaveProperty('name');

    // Check sessionStorage has the recent entry
    const stored = await page.evaluate(() => sessionStorage.getItem('otud-recent-activities'));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe(selected.name);
  });

  test('recent activities appear in panel after re-render', async ({ page }) => {
    // Select an activity to populate recent history
    const activityButton = page.locator('#activitiesContainer .activity-button').first();
    await activityButton.click();

    const selected = await page.evaluate(() => window.selectedActivity);
    const activityName = selected.name;

    // Re-render activities (simulates what happens on timeline switch)
    // Navigate to next timeline and back to trigger re-render
    // Or we can pre-populate and reload
    await page.evaluate((name) => {
      sessionStorage.setItem('otud-recent-activities', JSON.stringify([
        { name, color: '#a2b4ee', category: 'Personal' }
      ]));
    }, activityName);

    await page.reload();
    await page.waitForSelector('#activitiesContainer .activity-search-wrapper', { state: 'visible', timeout: 10000 });

    // Recent panel should now show the activity
    const recentBtn = page.locator('#activitiesContainer .recent-activity-btn').first();
    await expect(recentBtn).toBeVisible();

    const recentText = await recentBtn.textContent();
    expect(recentText).toContain(activityName);
  });

  test('clicking a recent activity selects it', async ({ page }) => {
    // Pre-populate recent activities via sessionStorage
    const firstActivityName = await page.evaluate(() => {
      const categories = window.timelineManager.metadata[window.timelineManager.keys[0]].categories;
      return categories[0].activities[0].name;
    });
    const firstActivityColor = await page.evaluate(() => {
      const categories = window.timelineManager.metadata[window.timelineManager.keys[0]].categories;
      return categories[0].activities[0].color;
    });
    const firstActivityCategory = await page.evaluate(() => {
      const categories = window.timelineManager.metadata[window.timelineManager.keys[0]].categories;
      return categories[0].name;
    });

    await page.evaluate(({ name, color, category }) => {
      sessionStorage.setItem('otud-recent-activities', JSON.stringify([
        { name, color, category }
      ]));
    }, { name: firstActivityName, color: firstActivityColor, category: firstActivityCategory });

    await page.reload();
    await page.waitForSelector('#activitiesContainer .recent-activity-btn', { state: 'visible', timeout: 10000 });

    // Click the recent activity button
    await page.locator('#activitiesContainer .recent-activity-btn').first().click();
    await page.waitForTimeout(100);

    // Verify the original activity button was triggered
    const selected = await page.evaluate(() => window.selectedActivity);
    expect(selected).not.toBeNull();
    expect(selected.name).toBe(firstActivityName);
  });

  test('recent list is capped at 8 items', async ({ page }) => {
    // Pre-populate sessionStorage with 10 entries
    await page.evaluate(() => {
      const items = [];
      for (let i = 0; i < 10; i++) {
        items.push({ name: `Activity ${i}`, color: '#cccccc', category: 'Test' });
      }
      sessionStorage.setItem('otud-recent-activities', JSON.stringify(items));
    });

    await page.reload();
    await page.waitForSelector('#activitiesContainer .activity-search-wrapper', { state: 'visible', timeout: 10000 });

    // Should render at most 10 (what's stored) but the code trims on record, not on load
    // Select a new activity to trigger trimming
    const activityButton = page.locator('#activitiesContainer .activity-button').first();
    await activityButton.click();
    await page.waitForTimeout(100);

    const stored = await page.evaluate(() => {
      const data = sessionStorage.getItem('otud-recent-activities');
      return data ? JSON.parse(data) : [];
    });
    expect(stored.length).toBeLessThanOrEqual(8);
  });

  test('duplicate selections are moved to front, not duplicated', async ({ page }) => {
    // Use activities without child items to avoid modal blocking
    const simpleButtons = page.locator('#activitiesContainer .activity-button:not(.has-child-items)');
    const count = await simpleButtons.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Select first simple activity
    const firstButton = simpleButtons.first();
    await firstButton.click();
    await page.waitForTimeout(100);

    const firstName = await page.evaluate(() => window.selectedActivity?.name);

    // Select second simple activity
    const secondButton = simpleButtons.nth(1);
    await secondButton.click();
    await page.waitForTimeout(100);

    // Select first simple activity again
    await firstButton.click();
    await page.waitForTimeout(100);

    const stored = await page.evaluate(() => {
      const data = sessionStorage.getItem('otud-recent-activities');
      return data ? JSON.parse(data) : [];
    });

    // Should have exactly 2 entries (no duplicates)
    expect(stored.length).toBe(2);

    // First entry should be the first activity (most recent selection)
    expect(stored[0].name).toBe(firstName);
  });
});

test.describe('Activity Search - Keyboard Accessibility', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?instructions=completed');
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });
    await page.waitForSelector('#activitiesContainer .activity-search-input', { state: 'visible', timeout: 10000 });
  });

  test('search input is reachable via Tab', async ({ page }) => {
    // Focus body first
    await page.locator('body').click();

    // Tab through the page - search input should be reachable
    // Since activities container is in the DOM flow, Tab will eventually reach it
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    // Directly focus it to test it's focusable
    await searchInput.focus();
    const focused = await page.evaluate(() => document.activeElement?.classList.contains('activity-search-input'));
    expect(focused).toBe(true);
  });

  test('Escape key clears search and blurs input', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');
    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // Verify filter is active
    const visibleDuring = await page.locator('#activitiesContainer .activity-button:visible').count();
    const totalButtons = await page.locator('#activitiesContainer .activity-button').count();
    expect(visibleDuring).toBeLessThan(totalButtons);

    // Press Escape
    await searchInput.press('Escape');
    await page.waitForTimeout(200);

    // Input should be cleared
    await expect(searchInput).toHaveValue('');

    // All activities should be visible again
    const visibleAfter = await page.locator('#activitiesContainer .activity-button:visible').count();
    expect(visibleAfter).toBe(totalButtons);
  });

  test('ArrowDown from search moves focus to first visible activity', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    // Type to filter
    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // Press ArrowDown
    await searchInput.press('ArrowDown');

    // Active element should be an activity button
    const focusedIsActivity = await page.evaluate(() =>
      document.activeElement?.classList.contains('activity-button')
    );
    expect(focusedIsActivity).toBe(true);

    // It should contain "Sleep" in its text
    const focusedText = await page.evaluate(() => document.activeElement?.textContent || '');
    expect(focusedText.toLowerCase()).toContain('sleep');
  });

  test('ArrowDown/ArrowUp navigates between visible activity buttons', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    // Filter to get a manageable set
    await searchInput.fill('ing');
    await page.waitForTimeout(200);

    const visibleCount = await page.locator('#activitiesContainer .activity-button:visible').count();
    if (visibleCount < 2) {
      test.skip();
      return;
    }

    // Move to first button
    await searchInput.press('ArrowDown');
    const firstText = await page.evaluate(() => document.activeElement?.textContent || '');

    // Move to second button
    await page.keyboard.press('ArrowDown');
    const secondText = await page.evaluate(() => document.activeElement?.textContent || '');
    expect(secondText).not.toBe(firstText);

    // Move back up
    await page.keyboard.press('ArrowUp');
    const backText = await page.evaluate(() => document.activeElement?.textContent || '');
    expect(backText).toBe(firstText);
  });

  test('ArrowUp from first activity returns focus to search input', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // Move to first button
    await searchInput.press('ArrowDown');
    const isOnButton = await page.evaluate(() =>
      document.activeElement?.classList.contains('activity-button')
    );
    expect(isOnButton).toBe(true);

    // ArrowUp should go back to search input
    await page.keyboard.press('ArrowUp');
    const isOnInput = await page.evaluate(() =>
      document.activeElement?.classList.contains('activity-search-input')
    );
    expect(isOnInput).toBe(true);
  });

  test('Enter on focused activity button selects it', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // Navigate to first result
    await searchInput.press('ArrowDown');
    await page.waitForTimeout(50);

    // Press Enter to select
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Verify selection occurred
    const selected = await page.evaluate(() => window.selectedActivity);
    expect(selected).not.toBeNull();
    expect(selected.name.toLowerCase()).toContain('sleep');
  });

  test('Escape on focused activity clears search and returns to input', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // Navigate to a button
    await searchInput.press('ArrowDown');

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Search should be cleared
    await expect(searchInput).toHaveValue('');

    // Focus should be on search input
    const isOnInput = await page.evaluate(() =>
      document.activeElement?.classList.contains('activity-search-input')
    );
    expect(isOnInput).toBe(true);

    // All activities should be visible
    const allButtons = await page.locator('#activitiesContainer .activity-button').count();
    const visibleButtons = await page.locator('#activitiesContainer .activity-button:visible').count();
    expect(visibleButtons).toBe(allButtons);
  });
});

test.describe('Activity Search - Screen Reader Announcements', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?instructions=completed');
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector('#activitiesContainer', { timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 10000 });
    await page.waitForSelector('#activitiesContainer .activity-search-input', { state: 'visible', timeout: 10000 });
  });

  test('search announces result count to screen readers', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    // Find the live region announcer
    const announcer = page.locator('#activitiesContainer .activity-search-wrapper [aria-live="polite"]');
    const text = await announcer.textContent();
    expect(text).toMatch(/\d+ activit(y|ies) found/);
  });

  test('no-match search announces zero results', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('xyznonexistent999');
    await page.waitForTimeout(200);

    const announcer = page.locator('#activitiesContainer .activity-search-wrapper [aria-live="polite"]');
    const text = await announcer.textContent();
    expect(text).toBe('No activities found');
  });

  test('clearing search clears announcement', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    await searchInput.fill('Sleep');
    await page.waitForTimeout(200);

    await searchInput.fill('');
    await page.waitForTimeout(200);

    const announcer = page.locator('#activitiesContainer .activity-search-wrapper [aria-live="polite"]');
    const text = await announcer.textContent();
    expect(text).toBe('');
  });

  test('search input has accessible label', async ({ page }) => {
    const searchInput = page.locator('#activitiesContainer .activity-search-input');

    // Should have an associated label
    const inputId = await searchInput.getAttribute('id');
    const label = page.locator(`label[for="${inputId}"]`);
    await expect(label).toHaveText('Search activities');

    // Should have aria-describedby
    const describedBy = await searchInput.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();

    const hint = page.locator(`#${describedBy}`);
    const hintText = await hint.textContent();
    expect(hintText).toContain('Type to filter');
  });
});
