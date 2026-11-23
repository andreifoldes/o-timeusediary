// @ts-check
// The diary's reference day is fixed once, by the 04:00 rule or by DIARY_DATE, and
// every exported timestamp is built from it and the episode's timeline minutes, so
// the device clock at the moment a block is placed or resized no longer matters.
import { test, expect } from '@playwright/test';
import {
  at, captureUploads, collectPageErrors, collectWarnings, startClockAt, openDiary, waitForDiary,
  placeBlock, dragRightEdge, episodes, readDraft, writeDraft, submitDiary
} from './diary-helpers.js';

const ORIGINAL_COLUMNS = ['timelineKey', 'activity', 'category', 'startTime', 'endTime', 'pid',
  'diaryWave', 'viewportWidth', 'viewportHeight', 'layoutHorizontal', 'browserName',
  'browserVersion', 'instructions', 'PROLIFIC_PID', 'STUDY_ID', 'SESSION_ID'];

const stamps = (list) => list.map((e) => [e.startTime, e.endTime]);
const diaryDate = (page) => page.evaluate(() => window.timelineManager.diaryDate);

/** Waits until the autosave has written a draft for `pid`; returns its parsed state. */
async function savedState(page, pid) {
  await page.clock.fastForward(1500);          // let the debounced autosave run
  await expect.poll(async () => (await readDraft(page, pid)) !== null, { timeout: 10000 }).toBe(true);
  return JSON.parse((await readDraft(page, pid)).state);
}

const SLEEPING = { category: 'Personal', activity: 'Sleeping', color: '#a2b4ee', blockLength: 10, count: 1 };

/** Writes a draft for `pid` whose primary timeline holds `primary`; `state` adds version, diaryDate. */
async function writePrimaryDraft(page, pid, { primary, ...state }, savedAt) {
  const keys = await page.evaluate(() => window.timelineManager.keys);
  const activities = Object.fromEntries(keys.map((key) => [key, []]));
  activities.primary = primary;
  await writeDraft(page, pid, { activities, currentIndex: 0, keys, selectedActivity: null, ...state }, savedAt);
}

/**
 * Crosses the 1,440 px breakpoint, which reloads the page from its sessionStorage
 * backup; the reloaded page offers the draft again, and this restores it.
 */
async function restoreAgainAfterBreakpointReload(page) {
  const restored = page.waitForEvent('console', (message) => message.text().includes('[autosave] Draft restored'));
  await page.setViewportSize({ width: 1200, height: 900 });   // crosses 1,440 px: reloads
  await page.click('#recovery-restore');
  await restored;
}

test.describe('reference day, Europe/London', () => {
  test.use({ timezoneId: 'Europe/London' });

  for (const c of [
    { clock: '2026-12-01T15:00:00Z', day: '2026-11-30', next: '2026-12-01' },
    { clock: '2027-01-01T15:00:00Z', day: '2026-12-31', next: '2027-01-01' },
  ]) {
    test(`a diary opened at 15:00 on ${c.next} is dated ${c.day}, after midnight ${c.next}`, async ({ page }) => {
      const errors = collectPageErrors(page);
      const uploads = await captureUploads(page);
      await startClockAt(page, c.clock);
      await openDiary(page, 'instructions=completed&pid=D1&DIARY_WAVE=1');
      for (const m of [at(8), at(23, 50), at(24), at(25, 30), at(27, 50)]) await placeBlock(page, m);
      const { header, rows } = await submitDiary(page, uploads);

      expect(header.slice(0, 16)).toEqual(ORIGINAL_COLUMNS);
      expect(header[16]).toBe('diaryDate');
      expect(new Set(rows.map((r) => r.diaryDate))).toEqual(new Set([c.day]));
      expect(rows.filter((r) => r.timelineKey === 'primary').map((r) => [r.startTime, r.endTime])).toEqual([
        [`${c.day} 08:00`, `${c.day} 08:10`],
        [`${c.day} 23:50`, `${c.next} 00:00`],
        [`${c.next} 00:00`, `${c.next} 00:10`],
        [`${c.next} 01:30`, `${c.next} 01:40`],
        [`${c.next} 03:50`, `${c.next} 04:00`],
      ]);
      for (const r of rows) expect(r.endTime > r.startTime).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test('a diary opened at 01:30 describes the same day as one opened at 23:00 the evening before', async ({ browser }) => {
    const results = [];
    for (const clock of ['2026-11-20T23:00:00Z', '2026-11-21T01:30:00Z']) {
      const context = await browser.newContext({ timezoneId: 'Europe/London', viewport: { width: 1920, height: 1080 } });
      const page = await context.newPage();
      await startClockAt(page, clock);
      await openDiary(page, 'instructions=completed&pid=D2&DIARY_WAVE=1');
      for (const m of [at(8), at(23, 50), at(25, 30)]) await placeBlock(page, m);
      results.push({ date: await diaryDate(page), stamps: stamps(await episodes(page)) });
      await context.close();
    }
    expect(results[0]).toEqual(results[1]);
    expect(results[0].date).toBe('2026-11-19');
    expect(results[0].stamps).toEqual([
      ['2026-11-19 08:00', '2026-11-19 08:10'],
      ['2026-11-19 23:50', '2026-11-20 00:00'],
      ['2026-11-20 01:30', '2026-11-20 01:40'],
    ]);
  });

  test('the day changes at 04:00, not at midnight', async ({ page }) => {
    await startClockAt(page, '2026-11-21T04:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D3');
    expect(await diaryDate(page)).toBe('2026-11-20');
  });

  test('a diary begun at 23:50 and finished at 00:10 keeps one reference day', async ({ page }) => {
    const uploads = await captureUploads(page);
    await startClockAt(page, '2026-11-20T23:50:00Z');
    await openDiary(page, 'instructions=completed&pid=D4&DIARY_WAVE=1');
    await placeBlock(page, at(8));
    await placeBlock(page, at(23, 50));
    await page.clock.setSystemTime(new Date('2026-11-21T00:10:00Z'));
    await placeBlock(page, at(9));
    await placeBlock(page, at(25));
    await dragRightEdge(page, '08:00', 20);   // resizing after midnight must not re-date it
    const { rows } = await submitDiary(page, uploads);
    expect(new Set(rows.map((r) => r.diaryDate))).toEqual(new Set(['2026-11-19']));
    expect(rows.filter((r) => r.timelineKey === 'primary').map((r) => [r.startTime, r.endTime])).toEqual([
      ['2026-11-19 08:00', '2026-11-19 08:30'],
      ['2026-11-19 23:50', '2026-11-20 00:00'],
      ['2026-11-19 09:00', '2026-11-19 09:10'],
      ['2026-11-20 01:00', '2026-11-20 01:10'],
    ]);
  });

  test('DIARY_DATE in the link sets the reference day', async ({ page }) => {
    const uploads = await captureUploads(page);
    await startClockAt(page, '2026-12-05T10:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D5&DIARY_WAVE=1&DIARY_DATE=2026-11-30');
    for (const m of [at(8), at(24), at(27, 50)]) await placeBlock(page, m);
    const { rows } = await submitDiary(page, uploads);
    expect(new Set(rows.map((r) => r.diaryDate))).toEqual(new Set(['2026-11-30']));
    expect(rows.filter((r) => r.timelineKey === 'primary').map((r) => [r.startTime, r.endTime])).toEqual([
      ['2026-11-30 08:00', '2026-11-30 08:10'],
      ['2026-12-01 00:00', '2026-12-01 00:10'],
      ['2026-12-01 03:50', '2026-12-01 04:00'],
    ]);
  });

  test('an invalid DIARY_DATE is ignored with a console warning', async ({ page }) => {
    const warnings = collectWarnings(page);
    await startClockAt(page, '2026-12-05T10:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D6&DIARY_DATE=2026-02-30');
    expect(await diaryDate(page)).toBe('2026-12-04');
    expect(warnings.some((w) => w.includes('DIARY_DATE "2026-02-30"'))).toBe(true);
  });

  test('the reference day is stored with the draft and restored with it', async ({ page }) => {
    await startClockAt(page, '2026-11-20T23:50:00Z');
    await openDiary(page, 'instructions=completed&pid=D7&DIARY_WAVE=1');
    await placeBlock(page, at(8));
    expect(await savedState(page, 'D7')).toMatchObject({ version: 3, diaryDate: '2026-11-19' });
    await page.clock.setSystemTime(new Date('2026-11-22T10:00:00Z'));
    await page.reload();
    await page.click('#recovery-restore');
    await waitForDiary(page);
    await expect(page.locator('.timeline[data-active="true"] .activity-block')).toHaveCount(1);
    await placeBlock(page, at(9));
    expect(await diaryDate(page)).toBe('2026-11-19');
    expect(stamps(await episodes(page))).toEqual([
      ['2026-11-19 08:00', '2026-11-19 08:10'],
      ['2026-11-19 09:00', '2026-11-19 09:10'],
    ]);
  });

  test('a DIARY_DATE that differs from the draft\'s date wins, with a warning', async ({ page }) => {
    const warnings = collectWarnings(page);
    await startClockAt(page, '2026-11-20T10:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D9&DIARY_DATE=2026-11-18');
    await placeBlock(page, at(8));
    expect(await savedState(page, 'D9')).toMatchObject({ diaryDate: '2026-11-18' });
    await page.goto('/index.html?instructions=completed&pid=D9&DIARY_DATE=2026-11-19');
    await page.click('#recovery-restore');
    await waitForDiary(page);
    await expect(page.locator('.timeline[data-active="true"] .activity-block')).toHaveCount(1);
    expect(await diaryDate(page)).toBe('2026-11-19');
    expect(stamps(await episodes(page))).toEqual([['2026-11-19 08:00', '2026-11-19 08:10']]);
    expect(warnings.some((w) => w.includes('DIARY_DATE 2026-11-19 replaces the date 2026-11-18'))).toBe(true);
  });

  test('a draft saved by the previous version is dated from its last save', async ({ page }) => {
    await startClockAt(page, '2026-12-03T10:00:00Z');
    // Any diary page will do to reach the draft store; this pid is not the one restored.
    await openDiary(page, 'instructions=completed&pid=D10-setup');
    const keys = await page.evaluate(() => window.timelineManager.keys);
    const activities = Object.fromEntries(keys.map((key) => [key, []]));
    // Saved at 15:00 on 1 December by the old code (state version 2, no diaryDate):
    // its after-midnight stamps carry the month roll-over (1 November instead of
    // 1 December), and the last episode was saved without its minutes.
    const episode = { category: 'Personal', activity: 'Sleeping', color: '#a2b4ee', blockLength: 10, count: 1 };
    activities.primary = [
      { ...episode, id: 'v2a', startTime: '2026-11-30 08:00', endTime: '2026-11-30 08:10', startMinutes: 480, endMinutes: 490 },
      { ...episode, id: 'v2b', startTime: '2026-11-30 23:50', endTime: '2026-11-01 00:00', startMinutes: 1430, endMinutes: 1440 },
      { ...episode, id: 'v2c', startTime: '2026-11-01 01:30', endTime: '2026-11-01 01:40' },
    ];
    await writeDraft(page, 'D10', { version: 2, activities, currentIndex: 0, keys, selectedActivity: null },
      Date.parse('2026-12-01T15:00:00Z'));

    await page.goto('/index.html?instructions=completed&pid=D10');
    await page.click('#recovery-restore');
    await waitForDiary(page);
    await expect(page.locator('.timeline[data-active="true"] .activity-block')).toHaveCount(3);
    expect(await diaryDate(page)).toBe('2026-11-30');   // the clock today would give 2026-12-02
    const restored = await episodes(page);
    expect(stamps(restored)).toEqual([
      ['2026-11-30 08:00', '2026-11-30 08:10'],
      ['2026-11-30 23:50', '2026-12-01 00:00'],
      ['2026-12-01 01:30', '2026-12-01 01:40'],
    ]);
    expect(restored.map((e) => [e.startMinutes, e.endMinutes])).toEqual([[480, 490], [1430, 1440], [1530, 1540]]);
  });

  test('a draft saved by the previous version keeps the date of its episodes before midnight', async ({ page }) => {
    await startClockAt(page, '2026-11-21T10:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D11-setup');
    // Filled in at 21:00 on 20 November by the previous version, which dated the
    // episodes before midnight with the device's "yesterday", 19 November. The page
    // stayed open and saved every 30 seconds until 09:00 the next morning.
    await writePrimaryDraft(page, 'D11', { version: 2, primary: [
      { ...SLEEPING, id: 'v2d', startTime: '2026-11-19 08:00', endTime: '2026-11-19 08:10', startMinutes: 480, endMinutes: 490 },
      { ...SLEEPING, id: 'v2e', startTime: '2026-11-19 23:00', endTime: '2026-11-19 23:10', startMinutes: 1380, endMinutes: 1390 },
      { ...SLEEPING, id: 'v2f', startTime: '2026-11-20 01:30', endTime: '2026-11-20 01:40', startMinutes: 1530, endMinutes: 1540 },
    ] }, Date.parse('2026-11-21T09:00:00Z'));
    await page.goto('/index.html?instructions=completed&pid=D11');
    await page.click('#recovery-restore');
    await waitForDiary(page);
    await expect(page.locator('.timeline[data-active="true"] .activity-block')).toHaveCount(3);
    expect(await diaryDate(page)).toBe('2026-11-19');   // its last save alone would give 2026-11-20
    expect(stamps(await episodes(page))).toEqual([
      ['2026-11-19 08:00', '2026-11-19 08:10'],
      ['2026-11-19 23:00', '2026-11-19 23:10'],
      ['2026-11-20 01:30', '2026-11-20 01:40'],
    ]);
  });

  test('a breakpoint reload just after 04:00 keeps the reference day', async ({ page }) => {
    await startClockAt(page, '2026-11-21T03:59:30Z');
    await openDiary(page, 'instructions=completed&pid=D8');
    await placeBlock(page, at(8));
    await page.clock.setSystemTime(new Date('2026-11-21T04:00:30Z'));
    // The reload comes from a debounced resize handler, so wait for the new page's
    // load event: waitForLoadState('load') is already satisfied by the old page.
    const reloaded = page.waitForEvent('load');
    await page.setViewportSize({ width: 1200, height: 900 });   // crosses 1,440 px: reloads
    await reloaded;
    await waitForDiary(page);
    expect(await page.evaluate(() => window.getIsMobile())).toBe(true);
    // The clock rule would now give 2026-11-20; the backup keeps the diary's day.
    expect(await diaryDate(page)).toBe('2026-11-19');
    expect(stamps(await episodes(page))).toEqual([['2026-11-19 08:00', '2026-11-19 08:10']]);
  });

  test('a draft restored again after a breakpoint reload is restamped', async ({ page }) => {
    await startClockAt(page, '2026-12-03T10:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D12-setup');
    // Saved at 15:00 on 1 December by the previous version, with the month roll-over.
    await writePrimaryDraft(page, 'D12', { version: 2, primary: [
      { ...SLEEPING, id: 'v2a', startTime: '2026-11-30 08:00', endTime: '2026-11-30 08:10', startMinutes: 480, endMinutes: 490 },
      { ...SLEEPING, id: 'v2b', startTime: '2026-11-30 23:50', endTime: '2026-11-01 00:00', startMinutes: 1430, endMinutes: 1440 },
      { ...SLEEPING, id: 'v2c', startTime: '2026-11-01 01:30', endTime: '2026-11-01 01:40' },
    ] }, Date.parse('2026-12-01T15:00:00Z'));
    await page.goto('/index.html?instructions=completed&pid=D12');
    await page.click('#recovery-restore');
    await waitForDiary(page);
    await expect(page.locator('.timeline[data-active="true"] .activity-block')).toHaveCount(3);
    // Nothing has been saved since, so the reloaded page offers the old draft again.
    expect(JSON.parse((await readDraft(page, 'D12')).state).version).toBe(2);
    await restoreAgainAfterBreakpointReload(page);
    expect(await diaryDate(page)).toBe('2026-11-30');
    expect(stamps(await episodes(page))).toEqual([
      ['2026-11-30 08:00', '2026-11-30 08:10'],
      ['2026-11-30 23:50', '2026-12-01 00:00'],
      ['2026-12-01 01:30', '2026-12-01 01:40'],
    ]);
  });

  test('DIARY_DATE still wins when the draft is restored again after a breakpoint reload', async ({ page }) => {
    await startClockAt(page, '2026-11-20T10:00:00Z');
    await openDiary(page, 'instructions=completed&pid=D13-setup');
    await writePrimaryDraft(page, 'D13', { version: 3, diaryDate: '2026-11-18', primary: [
      { ...SLEEPING, id: 'v3a', startTime: '2026-11-18 08:00', endTime: '2026-11-18 08:10', startMinutes: 480, endMinutes: 490 },
    ] }, Date.parse('2026-11-20T09:00:00Z'));
    await page.goto('/index.html?instructions=completed&pid=D13&DIARY_DATE=2026-11-19');
    await page.click('#recovery-restore');
    await waitForDiary(page);
    await expect(page.locator('.timeline[data-active="true"] .activity-block')).toHaveCount(1);
    expect(await diaryDate(page)).toBe('2026-11-19');
    // Nothing has been saved since, so the reloaded page offers the draft dated 2026-11-18.
    expect(JSON.parse((await readDraft(page, 'D13')).state).diaryDate).toBe('2026-11-18');
    await restoreAgainAfterBreakpointReload(page);
    expect(await diaryDate(page)).toBe('2026-11-19');
    expect(stamps(await episodes(page))).toEqual([['2026-11-19 08:00', '2026-11-19 08:10']]);
  });
});

test.describe('spring-forward day, Europe/London (29 March 2026)', () => {
  test.use({ timezoneId: 'Europe/London' });

  test('blocks in the skipped hour keep their labels and none is refused', async ({ page }) => {
    const errors = collectPageErrors(page);
    await startClockAt(page, '2026-03-29T11:00:00Z');        // 12:00 BST
    await openDiary(page, 'instructions=completed&pid=S1');
    for (const m of [at(24, 50), at(25), at(25, 30), at(26)]) await placeBlock(page, m);
    expect(await diaryDate(page)).toBe('2026-03-28');
    expect(stamps(await episodes(page))).toEqual([
      ['2026-03-29 00:50', '2026-03-29 01:00'],
      ['2026-03-29 01:00', '2026-03-29 01:10'],
      ['2026-03-29 01:30', '2026-03-29 01:40'],
      ['2026-03-29 02:00', '2026-03-29 02:10'],
    ]);
    expect(errors).toEqual([]);
  });

  test('the reference day follows the wall clock around 04:00', async ({ browser }) => {
    for (const [clock, day] of [['2026-03-29T02:30:00Z', '2026-03-27'], ['2026-03-29T03:30:00Z', '2026-03-28']]) {
      const context = await browser.newContext({ timezoneId: 'Europe/London' });
      const page = await context.newPage();
      await startClockAt(page, clock);                        // 03:30 and 04:30 BST
      await openDiary(page, 'instructions=completed&pid=S2');
      expect(await diaryDate(page)).toBe(day);
      await context.close();
    }
  });
});

test.describe('spring-forward day, America/New_York (8 March 2026)', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('blocks in the skipped hour keep their labels and none is refused', async ({ page }) => {
    const errors = collectPageErrors(page);
    await startClockAt(page, '2026-03-08T14:00:00Z');        // 10:00 EDT
    await openDiary(page, 'instructions=completed&pid=S3');
    for (const m of [at(25, 50), at(26), at(26, 30), at(26, 50), at(27)]) await placeBlock(page, m);
    expect(await diaryDate(page)).toBe('2026-03-07');
    expect(stamps(await episodes(page))).toEqual([
      ['2026-03-08 01:50', '2026-03-08 02:00'],
      ['2026-03-08 02:00', '2026-03-08 02:10'],
      ['2026-03-08 02:30', '2026-03-08 02:40'],
      ['2026-03-08 02:50', '2026-03-08 03:00'],
      ['2026-03-08 03:00', '2026-03-08 03:10'],
    ]);
    expect(errors).toEqual([]);
  });

  test('the reference day follows the wall clock around 04:00', async ({ browser }) => {
    for (const [clock, day] of [['2026-03-08T07:30:00Z', '2026-03-06'], ['2026-03-08T08:30:00Z', '2026-03-07']]) {
      const context = await browser.newContext({ timezoneId: 'America/New_York' });
      const page = await context.newPage();
      await startClockAt(page, clock);                        // 03:30 and 04:30 EDT
      await openDiary(page, 'instructions=completed&pid=S4');
      expect(await diaryDate(page)).toBe(day);
      await context.close();
    }
  });
});

test.describe('autumn-back day, America/New_York (1 November 2026)', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('the repeated hour appears once on the grid, in 10-minute steps', async ({ page }) => {
    await startClockAt(page, '2026-11-01T15:00:00Z');        // 10:00 EST
    await openDiary(page, 'instructions=completed&pid=S5');
    for (const m of [at(25), at(25, 30), at(25, 50), at(26)]) await placeBlock(page, m);
    expect(await diaryDate(page)).toBe('2026-10-31');
    expect(stamps(await episodes(page))).toEqual([
      ['2026-11-01 01:00', '2026-11-01 01:10'],
      ['2026-11-01 01:30', '2026-11-01 01:40'],
      ['2026-11-01 01:50', '2026-11-01 02:00'],
      ['2026-11-01 02:00', '2026-11-01 02:10'],
    ]);
  });
});
