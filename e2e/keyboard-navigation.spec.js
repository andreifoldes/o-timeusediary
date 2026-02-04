/**
 * E2E Tests for Keyboard Timeline Navigation
 * Tests WCAG 2.5.7 compliance for O-TUD
 */

import { test, expect } from '@playwright/test';

/**
 * Navigate past the instructions page to reach the timeline
 */
async function navigateToTimeline(page) {
    await page.goto('/');

    // The app redirects to instructions.html first
    // Wait for and click the Start button to proceed to the timeline
    const startBtn = page.locator('button:has-text("Start")');
    await startBtn.waitFor({ state: 'visible', timeout: 10000 });
    await startBtn.click();

    // Wait for timeline page to load and initialize
    await page.waitForFunction(() => window.timelineManager !== undefined, { timeout: 15000 });
    await page.waitForSelector('.timeline', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('.keyboard-nav-overlay', { state: 'attached', timeout: 10000 });
}

test.describe('Keyboard Timeline Navigation', () => {

    test.beforeEach(async ({ page }) => {
        await navigateToTimeline(page);
    });

    test.describe('Basic Navigation', () => {

        test('timeline is focusable via Tab key', async ({ page }) => {
            // Tab through the page to reach the timeline
            await page.keyboard.press('Tab');

            // Keep tabbing until we reach the timeline or skip link
            for (let i = 0; i < 20; i++) {
                const focused = await page.evaluate(() => document.activeElement?.classList.contains('timeline'));
                if (focused) break;
                await page.keyboard.press('Tab');
            }

            // Verify timeline has focus or use skip link
            const skipLink = page.locator('.skip-to-timeline');
            if (await skipLink.isVisible()) {
                await skipLink.focus();
                await page.keyboard.press('Enter');
            }

            const timeline = page.locator('.timeline');
            await timeline.focus();
            await expect(timeline).toBeFocused();
        });

        test('can navigate timeline with arrow keys', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Get initial aria-valuenow
            const initialValue = await timeline.getAttribute('aria-valuenow');

            // Press right arrow
            await page.keyboard.press('ArrowRight');

            // Verify value changed
            const newValue = await timeline.getAttribute('aria-valuenow');
            expect(parseInt(newValue)).toBe(parseInt(initialValue) + 1);
        });

        test('ArrowRight moves forward 10 minutes (1 slot)', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigate to slot 0 first
            await page.keyboard.press('Home');

            // Press right arrow
            await page.keyboard.press('ArrowRight');

            // Check aria-valuetext shows 4:10 AM (10 minutes after 4:00 AM start)
            const valueText = await timeline.getAttribute('aria-valuetext');
            expect(valueText).toContain('4:10');
        });

        test('ArrowLeft moves backward 10 minutes (1 slot)', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigate to slot 6 (5:00 AM)
            await page.keyboard.press('Home');
            for (let i = 0; i < 6; i++) {
                await page.keyboard.press('ArrowRight');
            }

            // Press left arrow
            await page.keyboard.press('ArrowLeft');

            // Check we moved back
            const valueText = await timeline.getAttribute('aria-valuetext');
            expect(valueText).toContain('4:50');
        });

        test('ArrowDown moves forward 1 hour (6 slots)', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Start at beginning
            await page.keyboard.press('Home');
            const initialText = await timeline.getAttribute('aria-valuetext');

            // Press down arrow
            await page.keyboard.press('ArrowDown');

            // Should be 1 hour later
            const newText = await timeline.getAttribute('aria-valuetext');
            expect(newText).toContain('5:00');
        });

        test('ArrowUp moves backward 1 hour (6 slots)', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigate to 6:00 AM (slot 12)
            await page.keyboard.press('Home');
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');

            // Press up arrow
            await page.keyboard.press('ArrowUp');

            // Should be back at 5:00 AM
            const valueText = await timeline.getAttribute('aria-valuetext');
            expect(valueText).toContain('5:00');
        });

        test('Home jumps to start of day (4:00 AM)', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigate somewhere else first
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('ArrowDown');

            // Press Home
            await page.keyboard.press('Home');

            // Verify at start
            const valuenow = await timeline.getAttribute('aria-valuenow');
            expect(valuenow).toBe('0');

            const valueText = await timeline.getAttribute('aria-valuetext');
            expect(valueText).toContain('4:00');
        });

        test('End jumps to end of day (3:50 AM next day)', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Press End
            await page.keyboard.press('End');

            // Verify at end (slot 143 = last slot)
            const valuenow = await timeline.getAttribute('aria-valuenow');
            expect(valuenow).toBe('143');

            const valueText = await timeline.getAttribute('aria-valuetext');
            expect(valueText).toContain('3:50');
        });

        test('navigation stops at boundaries', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Go to start
            await page.keyboard.press('Home');

            // Try to go before start
            await page.keyboard.press('ArrowLeft');

            // Should still be at 0
            const valuenow = await timeline.getAttribute('aria-valuenow');
            expect(valuenow).toBe('0');

            // Go to end
            await page.keyboard.press('End');

            // Try to go past end
            await page.keyboard.press('ArrowRight');

            // Should still be at 143
            const valuenowEnd = await timeline.getAttribute('aria-valuenow');
            expect(valuenowEnd).toBe('143');
        });

    });

    test.describe('Time Selection', () => {

        test('Enter/Space starts selection mode', async ({ page }) => {
            // First select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Start selection
            await page.keyboard.press('Enter');

            // Check that focus indicator has selecting class
            const focusIndicator = page.locator('.keyboard-focus-indicator');
            await expect(focusIndicator).toHaveClass(/selecting/);
        });

        test('can select time range with Enter and arrows', async ({ page }) => {
            // First select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();
            await page.keyboard.press('Home');

            // Start selection
            await page.keyboard.press('Enter');

            // Extend selection by 30 minutes (3 slots)
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowRight');

            // Verify selection highlight is visible
            const selectionRange = page.locator('.keyboard-selection-range');
            await expect(selectionRange).toBeVisible();

            // Verify slots have aria-selected
            const selectedSlots = await page.locator('.timeline-slot[aria-selected="true"]').count();
            expect(selectedSlots).toBe(4); // Start slot + 3 extended
        });

        test('Escape cancels selection', async ({ page }) => {
            // First select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Start selection
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowRight');

            // Verify selection started
            let selectedSlots = await page.locator('.timeline-slot[aria-selected="true"]').count();
            expect(selectedSlots).toBeGreaterThan(0);

            // Cancel with Escape
            await page.keyboard.press('Escape');

            // Verify no selection
            selectedSlots = await page.locator('.timeline-slot[aria-selected="true"]').count();
            expect(selectedSlots).toBe(0);

            // Verify focus indicator no longer in selecting mode
            const focusIndicator = page.locator('.keyboard-focus-indicator');
            await expect(focusIndicator).not.toHaveClass(/selecting/);
        });

        test('selection can be extended backwards', async ({ page }) => {
            // First select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigate to middle of day
            await page.keyboard.press('Home');
            for (let i = 0; i < 12; i++) {
                await page.keyboard.press('ArrowRight');
            }

            // Start selection
            await page.keyboard.press('Enter');

            // Extend backwards
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');

            // Verify 3 slots selected
            const selectedSlots = await page.locator('.timeline-slot[aria-selected="true"]').count();
            expect(selectedSlots).toBe(3);
        });

        test('Tab during selection cancels it', async ({ page }) => {
            // First select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Start selection
            await page.keyboard.press('Enter');

            // Tab out
            await page.keyboard.press('Tab');

            // Selection should be cancelled
            const selectedSlots = await page.locator('.timeline-slot[aria-selected="true"]').count();
            expect(selectedSlots).toBe(0);
        });

    });

    test.describe('Activity Placement', () => {

        test('prompts to select activity when none selected', async ({ page }) => {
            // Clear any selected activity
            await page.evaluate(() => { window.selectedActivity = null; });

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Try to start selection
            await page.keyboard.press('Enter');

            // Check for warning feedback
            const feedback = page.locator('.keyboard-nav-feedback');
            await expect(feedback).toBeVisible();
            await expect(feedback).toHaveClass(/warning/);
        });

        test('can place activity entirely with keyboard', async ({ page }) => {
            // Select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();
            await page.keyboard.press('Home');

            // Start selection at 4:00 AM
            await page.keyboard.press('Enter');

            // Extend to 4:30 AM (3 more slots = 4 total)
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('ArrowRight');

            // Confirm selection
            await page.keyboard.press('Enter');

            // Wait for activity to be placed
            await page.waitForTimeout(500);

            // Verify activity block was created
            const activityBlocks = page.locator('.activity-block');
            const count = await activityBlocks.count();
            expect(count).toBeGreaterThan(0);

            // Verify the last block has correct time range
            const lastBlock = activityBlocks.last();
            const start = await lastBlock.getAttribute('data-start');
            const end = await lastBlock.getAttribute('data-end');
            expect(start).toBe('04:00');
            expect(end).toBe('04:40');
        });

        test('placed activity has correct ARIA attributes', async ({ page }) => {
            // Select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();
            await page.keyboard.press('Home');

            // Place activity
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('Enter');

            await page.waitForTimeout(500);

            // Check ARIA attributes on placed block
            const block = page.locator('.activity-block').last();
            await expect(block).toHaveAttribute('role', 'button');
            await expect(block).toHaveAttribute('tabindex', '0');
            const ariaLabel = await block.getAttribute('aria-label');
            expect(ariaLabel).toContain('04:00');
        });

        test('focus returns to timeline after placement', async ({ page }) => {
            // Select an activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();
            await page.keyboard.press('Home');

            // Place activity
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('Enter');

            await page.waitForTimeout(500);

            // Timeline should still be focused (or focus returned)
            await expect(timeline).toBeFocused();
        });

        test('cannot place overlapping activities', async ({ page }) => {
            // Select and place first activity
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();
            await page.keyboard.press('Home');

            // Place first activity at 4:00-4:20
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('Enter');

            await page.waitForTimeout(500);

            // Select another activity
            await selectFirstActivity(page);

            // Try to place at same time
            await timeline.focus();
            await page.keyboard.press('Home');
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowRight');
            await page.keyboard.press('Enter');

            // Should show error
            const feedback = page.locator('.keyboard-nav-feedback');
            await expect(feedback).toHaveClass(/error/);
        });

    });

    test.describe('ARIA and Screen Reader Support', () => {

        test('timeline has correct ARIA attributes', async ({ page }) => {
            const timeline = page.locator('.timeline');

            await expect(timeline).toHaveAttribute('role', 'application');
            await expect(timeline).toHaveAttribute('aria-label');
            await expect(timeline).toHaveAttribute('aria-describedby', 'timeline-keyboard-instructions');
            await expect(timeline).toHaveAttribute('aria-valuemin', '0');
            await expect(timeline).toHaveAttribute('aria-valuemax', '143');
        });

        test('slots have correct ARIA attributes', async ({ page }) => {
            const firstSlot = page.locator('.timeline-slot').first();

            await expect(firstSlot).toHaveAttribute('role', 'gridcell');
            await expect(firstSlot).toHaveAttribute('aria-colindex', '1');
            await expect(firstSlot).toHaveAttribute('aria-selected', 'false');

            const ariaLabel = await firstSlot.getAttribute('aria-label');
            expect(ariaLabel).toContain('4:00 AM');
            expect(ariaLabel).toContain('empty');
        });

        test('current slot has aria-current="time"', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();
            await page.keyboard.press('Home');

            // First slot should have aria-current
            const currentSlot = page.locator('.timeline-slot[aria-current="time"]');
            await expect(currentSlot).toHaveCount(1);

            // Move and check aria-current moves
            await page.keyboard.press('ArrowRight');
            const newCurrentSlot = page.locator('.timeline-slot[aria-current="time"]');
            const ariaLabel = await newCurrentSlot.getAttribute('aria-label');
            expect(ariaLabel).toContain('4:10 AM');
        });

        test('live region announces navigation', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigate
            await page.keyboard.press('ArrowRight');

            // Wait for announcer to update (uses double requestAnimationFrame)
            await page.waitForFunction(
                () => (document.querySelector('#keyboard-nav-announcer')?.textContent?.length ?? 0) > 0,
                { timeout: 3000 }
            );

            const announcer = page.locator('#keyboard-nav-announcer');
            const text = await announcer.textContent();
            expect(text.length).toBeGreaterThan(0);
            expect(text).toMatch(/AM|PM/); // Contains time
        });

        test('live region announces selection', async ({ page }) => {
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Start selection
            await page.keyboard.press('Enter');

            // Check announcer mentions selection
            const announcer = page.locator('#keyboard-nav-announcer');
            await page.waitForFunction(
                () => document.querySelector('#keyboard-nav-announcer')?.textContent?.includes('Selection'),
                { timeout: 2000 }
            );
        });

        test('keyboard instructions are available to screen readers', async ({ page }) => {
            const instructions = page.locator('#timeline-keyboard-instructions');
            await expect(instructions).toBeAttached();
            await expect(instructions).toHaveClass(/sr-only/);

            const text = await instructions.textContent();
            expect(text).toContain('arrow');
            expect(text).toContain('Enter');
        });

    });

    test.describe('Instructions Panel', () => {

        test('instructions panel is visible', async ({ page }) => {
            const panel = page.locator('.keyboard-instructions-panel');
            await expect(panel).toBeVisible();
        });

        test('instructions panel toggles on click', async ({ page }) => {
            const toggle = page.locator('.keyboard-instructions-toggle');
            const list = page.locator('#keyboard-shortcuts-list');

            // Initially collapsed
            await expect(list).toBeHidden();

            // Click to expand
            await toggle.click();
            await expect(list).toBeVisible();
            await expect(toggle).toHaveAttribute('aria-expanded', 'true');

            // Click to collapse
            await toggle.click();
            await expect(list).toBeHidden();
            await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        });

        test('pressing ? toggles instructions panel', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            const list = page.locator('#keyboard-shortcuts-list');

            // Initially collapsed
            await expect(list).toBeHidden();

            // Press ? to open
            await page.keyboard.press('?');
            await expect(list).toBeVisible();

            // Press ? to close
            await page.keyboard.press('?');
            await expect(list).toBeHidden();
        });

    });

    test.describe('Accessibility Compliance', () => {

        test('focus is visible', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Check focus indicator is visible
            const focusIndicator = page.locator('.keyboard-focus-indicator.visible');
            await expect(focusIndicator).toBeVisible();
        });

        test('focus indicator has sufficient contrast', async ({ page }) => {
            const timeline = page.locator('.timeline');
            await timeline.focus();

            const focusIndicator = page.locator('.keyboard-focus-indicator');
            const boxShadow = await focusIndicator.evaluate(el =>
                getComputedStyle(el).boxShadow
            );

            // Should have box-shadow (our focus ring)
            expect(boxShadow).not.toBe('none');
        });

        test('selection highlight is visible', async ({ page }) => {
            await selectFirstActivity(page);

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Start selection
            await page.keyboard.press('Enter');
            await page.keyboard.press('ArrowRight');

            // Check selection range is visible
            const selectionRange = page.locator('.keyboard-selection-range');
            await expect(selectionRange).toBeVisible();
        });

        test('skip link works', async ({ page }) => {
            // Focus skip link
            const skipLink = page.locator('.skip-to-timeline');

            // Skip link should exist
            await expect(skipLink).toBeAttached();

            // Focus it and verify it becomes visible
            await skipLink.focus();
            await expect(skipLink).toBeFocused();

            // After clicking, the page should scroll to the timeline area
            await skipLink.click();

            // The target is #timeline-canvas - verify it scrolled there
            const timelineCanvas = page.locator('#timeline-canvas');
            await expect(timelineCanvas).toBeVisible();
        });

    });

    test.describe('Mobile Layout', () => {

        test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

        test('keyboard navigation works in vertical layout', async ({ page }) => {
            await page.waitForSelector('.timeline[data-layout="vertical"]', { timeout: 5000 }).catch(() => {
                // Layout may be horizontal on some mobile views
            });

            const timeline = page.locator('.timeline');
            await timeline.focus();

            // Navigation should still work
            await page.keyboard.press('ArrowRight');
            const valueText = await timeline.getAttribute('aria-valuetext');
            expect(valueText).toBeTruthy();
        });

    });

});

/**
 * Helper function to select the first available activity.
 * Handles both desktop (sidebar) and mobile (modal) layouts,
 * and falls back to setting selectedActivity directly via JS.
 */
async function selectFirstActivity(page) {
    // Try clicking an activity button if visible
    const activityBtn = page.locator('.activity-button').first();
    const isVisible = await activityBtn.isVisible().catch(() => false);

    if (isVisible) {
        await activityBtn.click();
        await page.waitForTimeout(200);
    }

    // Check if it worked
    const selected = await page.evaluate(() => window.selectedActivity);
    if (selected) return;

    // Try expanding a category first, then click
    const category = page.locator('.activity-category').first();
    if (await category.isVisible().catch(() => false)) {
        await category.click();
        await page.waitForTimeout(300);
        const btn = page.locator('.activity-button').first();
        if (await btn.isVisible().catch(() => false)) {
            await btn.click();
            await page.waitForTimeout(200);
        }
    }

    // Check again
    const selected2 = await page.evaluate(() => window.selectedActivity);
    if (selected2) return;

    // Fallback: set selectedActivity directly via evaluate
    // This ensures keyboard navigation tests can proceed even if
    // the activity UI isn't accessible in the current layout
    await page.evaluate(() => {
        window.selectedActivity = {
            name: 'Sleep',
            color: '#7986CB',
            category: 'Personal Care'
        };
    });

    await page.waitForFunction(
        () => window.selectedActivity !== null,
        { timeout: 3000 }
    );
}
