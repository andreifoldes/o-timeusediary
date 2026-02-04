// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Responsive breakpoint reload preserves state (PR #63)', () => {
  test('keeps activities after resize-triggered reload', async ({ page }) => {
    await page.goto('/?instructions=completed');
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => window.timelineManager !== undefined);

    // Ensure clean storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });

    // Select an activity and place it on the first timeline
    const activityButton = page.locator('.activity-button').first();
    await activityButton.waitFor({ state: 'visible', timeout: 15000 });
    await activityButton.click();

    const timeline = page.locator('.timeline').first();
    await timeline.waitFor({ state: 'visible', timeout: 15000 });
    await timeline.click({ position: { x: 500, y: 50 }, force: true });

    await page.waitForFunction(() => {
      const key = window.timelineManager.keys[0];
      return (window.timelineManager.activities[key]?.length || 0) > 0;
    }, { timeout: 15000 });

    const activityCountBefore = await page.evaluate(() => {
      const key = window.timelineManager.keys[0];
      return window.timelineManager.activities[key]?.length || 0;
    });

    // Trigger breakpoint resize (>=1440 -> <1440) which should reload
    await page.setViewportSize({ width: 1200, height: 900 });

    // Wait for reload to finish
    await page.waitForLoadState('load');
    await page.waitForSelector('#activitiesContainer', { state: 'attached', timeout: 15000 });

    const activityCountAfter = await page.evaluate(() => {
      const key = window.timelineManager.keys[0];
      return window.timelineManager.activities[key]?.length || 0;
    });

    expect(activityCountAfter).toBe(activityCountBefore);

    // Also verify a block exists in DOM
    const blocks = page.locator('.activity-block');
    await expect(blocks).toHaveCount(activityCountAfter);
  });
});
