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

test.describe('Mobile autoscroll during resize', () => {
  test.use({ viewport: { width: 390, height: 740 } });

  test('scrolls when pointer is near bottom edge while resizing', async ({ page }) => {
    await routeActivities(page, { enableReducedMotion: true });
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.goto('/?instructions=completed');
    await page.waitForSelector('.timeline', { timeout: 15000 });
    await page.waitForFunction(() => window.autoScrollModule !== undefined);

    await page.evaluate(() => {
      const footer = document.getElementById('instructionsFooter');
      if (document.documentElement.scrollHeight <= window.innerHeight + 200) {
        const spacer = document.createElement('div');
        spacer.style.height = '3000px';
        spacer.setAttribute('data-test-spacer', 'true');
        if (footer && footer.parentNode) {
          footer.parentNode.insertBefore(spacer, footer);
        } else {
          document.body.appendChild(spacer);
        }
      }

      const resizeBlock = document.createElement('div');
      resizeBlock.className = 'activity-block resizing';
      resizeBlock.style.position = 'absolute';
      resizeBlock.style.top = '0';
      resizeBlock.style.left = '0';
      resizeBlock.style.width = '100px';
      resizeBlock.style.height = '100px';
      resizeBlock.setAttribute('data-test-resize-block', 'true');
      document.body.appendChild(resizeBlock);

      if (window.autoScrollModule?.enable) {
        window.autoScrollModule.enable();
      }
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    const startScroll = await page.evaluate(() => window.scrollY);

    await page.dispatchEvent('body', 'pointermove', {
      clientX: 10,
      clientY: 735,
      pointerType: 'touch',
      isPrimary: true
    });

    await page.waitForTimeout(250);

    const endScroll = await page.evaluate(() => window.scrollY);
    expect(endScroll).toBeGreaterThan(startScroll);
  });

  test('scrolls when pointer is at top edge while resizing', async ({ page }) => {
    await routeActivities(page, { enableReducedMotion: true });
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    await page.goto('/?instructions=completed');
    await page.waitForSelector('.timeline', { timeout: 15000 });
    await page.waitForFunction(() => window.autoScrollModule !== undefined);

    await page.evaluate(() => {
      const footer = document.getElementById('instructionsFooter');
      if (document.documentElement.scrollHeight <= window.innerHeight + 200) {
        const spacer = document.createElement('div');
        spacer.style.height = '3000px';
        spacer.setAttribute('data-test-spacer', 'true');
        if (footer && footer.parentNode) {
          footer.parentNode.insertBefore(spacer, footer);
        } else {
          document.body.appendChild(spacer);
        }
      }

      const resizeBlock = document.createElement('div');
      resizeBlock.className = 'activity-block resizing';
      resizeBlock.style.position = 'absolute';
      resizeBlock.style.top = '0';
      resizeBlock.style.left = '0';
      resizeBlock.style.width = '100px';
      resizeBlock.style.height = '100px';
      resizeBlock.setAttribute('data-test-resize-block', 'true');
      document.body.appendChild(resizeBlock);

      if (window.autoScrollModule?.enable) {
        window.autoScrollModule.enable();
      }
    });

    await page.evaluate(() => window.scrollTo(0, 600));
    const startScroll = await page.evaluate(() => window.scrollY);

    await page.dispatchEvent('body', 'pointermove', {
      clientX: 10,
      clientY: 0,
      pointerType: 'touch',
      isPrimary: true
    });

    await page.waitForTimeout(250);

    const endScroll = await page.evaluate(() => window.scrollY);
    expect(endScroll).toBeLessThan(startScroll);
  });
});
