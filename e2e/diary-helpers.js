// @ts-check
// Helpers for driving a whole diary with a fake clock: open the diary at a given
// device time, place 10-minute blocks by clicking the real activity buttons and
// timeline, go through the remaining timelines, submit, and read the CSV that would
// have been uploaded. The DataPipe request is intercepted; nothing leaves the machine.
import { expect } from '@playwright/test';

/** Minutes on the timeline: 240 is 04:00 of the reference day, 1680 is 04:00 next morning. */
export const at = (hours, minutes = 0) => hours * 60 + minutes;

/** Intercepts uploads to DataPipe; returns the list the payloads are pushed to. */
export async function captureUploads(page) {
  const uploads = [];
  await page.route('**/pipe.jspsych.org/**', async (route) => {
    uploads.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
  });
  return uploads;
}

/** Collects uncaught page errors. */
export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Collects the text of console warnings. */
export function collectWarnings(page) {
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  return warnings;
}

/** Installs a clock that starts at `iso` and keeps running. Call before openDiary. */
export async function startClockAt(page, iso) {
  await page.clock.install({ time: new Date(iso) });
  await page.clock.resume();
}

/** Opens the diary with the given link parameters and waits until a timeline is active. */
export async function openDiary(page, query) {
  await page.goto(`/index.html?${query}`);
  await waitForDiary(page);
}

export async function waitForDiary(page) {
  await page.waitForFunction(() => window.timelineManager?.keys?.length > 0
    && document.querySelector('.timeline[data-active="true"]'), null, { timeout: 20000 });
}

/** Selects an activity by its visible name and clicks the active timeline at `minutes`. */
export async function placeBlock(page, minutes, activityName = 'Sleeping') {
  await page.locator('.activity-button:visible', { hasText: activityName }).first().click();
  const box = await page.locator('.timeline[data-active="true"]').boundingBox();
  if (!box) throw new Error('no active timeline');
  // Aim 3 minutes into the slot, near the top of the timeline (above drawn blocks).
  const fraction = (minutes + 3 - 240) / 1440;
  await page.mouse.click(box.x + fraction * box.width, box.y + box.height * 0.12);
  // The timeline ignores a click within 300 ms of the previous one: move the clock on.
  await page.clock.fastForward(400);
  await page.waitForTimeout(50);
}

/** Drags the right edge of the block that starts at `startLabel` by `minutes`. */
export async function dragRightEdge(page, startLabel, minutes) {
  const block = page.locator(`.timeline[data-active="true"] .activity-block[data-start="${startLabel}"]`).first();
  const b = await block.boundingBox();
  const tl = await page.locator('.timeline[data-active="true"]').boundingBox();
  if (!b || !tl) throw new Error(`no block starting at ${startLabel}`);
  const dx = (tl.width / 1440) * minutes;
  const y = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width - 1, y);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 1 + dx / 2, y, { steps: 6 });
  await page.mouse.move(b.x + b.width - 1 + dx, y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

/** Episodes of one timeline as stored in the page. */
export function episodes(page, key = 'primary') {
  return page.evaluate((k) => JSON.parse(JSON.stringify(window.timelineManager.activities[k] || [])), key);
}

/** The draft js/storage.js keeps in IndexedDB for `pid` ({ id, state, timestamp }), or null. */
export function readDraft(page, pid) {
  return page.evaluate((id) => new Promise((resolve) => {
    const open = indexedDB.open('otud-drafts', 1);
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const request = db.transaction('diary-state', 'readonly').objectStore('diary-state').get(id);
        request.onsuccess = () => { db.close(); resolve(request.result || null); };
        request.onerror = () => { db.close(); resolve(null); };
      } catch {
        db.close();
        resolve(null);
      }
    };
  }), pid);
}

/** Writes a draft for `pid` into the same store, as another version of the tool would have. */
export function writeDraft(page, pid, state, timestamp) {
  return page.evaluate(({ id, json, savedAt }) => new Promise((resolve, reject) => {
    const open = indexedDB.open('otud-drafts', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('diary-state', { keyPath: 'id' });
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('diary-state', 'readwrite');
      transaction.objectStore('diary-state').put({ id, state: json, timestamp: savedAt });
      transaction.oncomplete = () => { db.close(); resolve(undefined); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }), { id: pid, json: JSON.stringify(state), savedAt: timestamp });
}

// The Next button has a 2.5-second cooldown; jump the fake clock instead of waiting.
async function clickNext(page) {
  await page.clock.fastForward(3000);
  await page.click('#nextBtn');
  await page.waitForTimeout(300);
}

/** Goes through the remaining timelines (one block where one is required) and submits. */
export async function submitDiary(page, uploads) {
  const count = await page.evaluate(() => window.timelineManager.keys.length);
  while (await page.evaluate(() => window.timelineManager.currentIndex) < count - 1) {
    await clickNext(page);
    if (await page.locator('#nextBtn').isDisabled()) await placeBlock(page, at(12));
  }
  if (await page.locator('#nextBtn').isDisabled()) await placeBlock(page, at(12));
  await clickNext(page);
  await page.click('#confirmOk');
  await expect.poll(() => uploads.length, { timeout: 10000 }).toBeGreaterThan(0);
  return parseCsv(uploads[0].data);
}

// Splits one CSV line, honouring double-quoted fields ("Eating, Drinking, ...").
function splitCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { fields.push(field); field = ''; }
    else field += c;
  }
  fields.push(field);
  return fields;
}

/** Parses the tool's CSV into { header, rows }, each row an object keyed by column. */
export function parseCsv(text) {
  const [header, ...lines] = text.split('\n').filter(Boolean);
  const names = splitCsvLine(header);
  return {
    header: names,
    rows: lines.map((line) => Object.fromEntries(splitCsvLine(line).map((v, i) => [names[i], v])))
  };
}
