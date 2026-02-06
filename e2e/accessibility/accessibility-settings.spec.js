// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const activitiesPath = path.resolve(process.cwd(), 'settings', 'activities.json');
const baseConfig = JSON.parse(fs.readFileSync(activitiesPath, 'utf-8'));

function buildConfig(overrides = {}) {
  const config = JSON.parse(JSON.stringify(baseConfig));
  config.general = config.general || {};
  config.general.accessibility = {
    enableReducedMotion: true,
    enableHighContrast: true,
    enableForcedColors: true,
    ...overrides
  };
  return config;
}

async function routeActivities(page, overrides = {}) {
  const config = buildConfig(overrides);
  await page.route('**/settings/activities.json', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(config)
    });
  });
}

function mockPrefersContrast(page) {
  return page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query.includes('prefers-contrast')) {
        const listeners = new Set();
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: (cb) => listeners.add(cb),
          removeListener: (cb) => listeners.delete(cb),
          addEventListener: (type, cb) => {
            if (type === 'change') listeners.add(cb);
          },
          removeEventListener: (type, cb) => {
            if (type === 'change') listeners.delete(cb);
          },
          dispatchEvent: () => false
        };
      }
      return originalMatchMedia(query);
    };
  });
}

async function getAccessibilityState(page) {
  return page.evaluate(async () => {
    const mod = await import('/js/accessibility.js');
    return {
      reducedMotion: mod.prefersReducedMotion(),
      highContrast: mod.prefersHighContrast(),
      forcedColors: mod.prefersForcedColors(),
      scrollBehavior: mod.getScrollBehavior(),
      classes: Array.from(document.documentElement.classList)
    };
  });
}

async function getTransitionDurationMs(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const value = window.getComputedStyle(el).transitionDuration || '0s';
    const first = value.split(',')[0].trim();
    if (first.endsWith('ms')) return parseFloat(first);
    if (first.endsWith('s')) return parseFloat(first) * 1000;
    const parsed = Number.parseFloat(first);
    return Number.isFinite(parsed) ? parsed : null;
  }, selector);
}

test.describe('Accessibility settings (config-gated)', () => {
  test('reduced motion enabled honors system preference', async ({ page }) => {
    await routeActivities(page, { enableReducedMotion: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const state = await getAccessibilityState(page);
    expect(state.reducedMotion).toBe(true);
    expect(state.scrollBehavior).toBe('auto');
    expect(state.classes).not.toContain('a11y-reduced-motion-disabled');
  });

  test('reduced motion disabled ignores system preference', async ({ page }) => {
    await routeActivities(page, { enableReducedMotion: false });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const state = await getAccessibilityState(page);
    expect(state.reducedMotion).toBe(false);
    expect(state.scrollBehavior).toBe('smooth');
    expect(state.classes).toContain('a11y-reduced-motion-disabled');
  });

  test('high contrast enabled honors prefers-contrast', async ({ page }) => {
    await mockPrefersContrast(page);
    await routeActivities(page, { enableHighContrast: true });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const state = await getAccessibilityState(page);
    expect(state.highContrast).toBe(true);
    expect(state.classes).not.toContain('a11y-high-contrast-disabled');
  });

  test('high contrast disabled ignores prefers-contrast', async ({ page }) => {
    await mockPrefersContrast(page);
    await routeActivities(page, { enableHighContrast: false });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const state = await getAccessibilityState(page);
    expect(state.highContrast).toBe(false);
    expect(state.classes).toContain('a11y-high-contrast-disabled');
  });

  test('forced colors enabled honors system forced-colors', async ({ page }) => {
    await routeActivities(page, { enableForcedColors: true });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const state = await getAccessibilityState(page);
    expect(state.forcedColors).toBe(true);
    expect(state.classes).not.toContain('a11y-forced-colors-disabled');
  });

  test('forced colors disabled ignores system forced-colors', async ({ page }) => {
    await routeActivities(page, { enableForcedColors: false });
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const state = await getAccessibilityState(page);
    expect(state.forcedColors).toBe(false);
    expect(state.classes).toContain('a11y-forced-colors-disabled');
  });

  test('accessibility toggle button updates state without reload in test mode', async ({ page }) => {
    await page.addInitScript(() => {
      window.__OTUD_TEST__ = true;
      window.__OTUD_DISABLE_A11Y_RELOAD__ = true;
    });
    await routeActivities(page, {
      enableReducedMotion: true,
      enableHighContrast: true,
      enableForcedColors: true
    });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const toggle = page.locator('#otud-a11y-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    const state = await getAccessibilityState(page);
    expect(state.reducedMotion).toBe(false);
    expect(state.highContrast).toBe(false);
    expect(state.forcedColors).toBe(false);
    expect(state.classes).toContain('a11y-reduced-motion-disabled');
    expect(state.classes).toContain('a11y-high-contrast-disabled');
    expect(state.classes).toContain('a11y-forced-colors-disabled');
  });

  test('accessibility toggle meaningfully changes motion UX under reduced motion preference', async ({ page }) => {
    await page.addInitScript(() => {
      window.__OTUD_TEST__ = true;
      window.__OTUD_DISABLE_A11Y_RELOAD__ = true;
    });
    await routeActivities(page, {
      enableReducedMotion: true,
      enableHighContrast: true,
      enableForcedColors: true
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const toggle = page.locator('#otud-a11y-toggle');
    await expect(toggle).toBeVisible();

    const beforeDuration = await getTransitionDurationMs(page, '#nextBtn');
    expect(beforeDuration).not.toBeNull();
    expect(beforeDuration).toBeLessThan(5);

    await toggle.click();
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('a11y-reduced-motion-disabled')
    );

    const afterDuration = await getTransitionDurationMs(page, '#nextBtn');
    expect(afterDuration).not.toBeNull();
    expect(afterDuration).toBeGreaterThan(50);
  });

  test('accessibility toggle forces visible mode styling changes', async ({ page }) => {
    await page.addInitScript(() => {
      window.__OTUD_TEST__ = true;
      window.__OTUD_DISABLE_A11Y_RELOAD__ = true;
    });
    await routeActivities(page, {
      enableReducedMotion: false,
      enableHighContrast: false,
      enableForcedColors: false
    });
    await page.goto('/?instructions=completed');
    await page.waitForFunction(() => window.__OTUD_ACCESSIBILITY__ !== undefined);

    const toggle = page.locator('#otud-a11y-toggle');
    await expect(toggle).toBeVisible();

    const beforeBorder = await page.evaluate(() => {
      return window.getComputedStyle(document.getElementById('nextBtn')).borderTopWidth;
    });
    expect(beforeBorder).toBe('0px');

    await toggle.click();
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('a11y-visible-enabled')
    );

    const afterBorder = await page.evaluate(() => {
      return window.getComputedStyle(document.getElementById('nextBtn')).borderTopWidth;
    });
    expect(afterBorder).toBe('2px');
  });
});
