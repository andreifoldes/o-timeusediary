import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    isValidIsoDate, addDays, referenceDayFromClock, referenceDayOfVersion2Draft, resolveReferenceDay,
    formatTimestamp
} from '../../js/dates.js';

// Node reads process.env.TZ again when it changes, so a test can pin the device zone.
function inZone(timeZone, fn) {
    const saved = process.env.TZ;
    process.env.TZ = timeZone;
    try { return fn(); } finally {
        if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
    }
}
const refAt = (timeZone, iso) => inZone(timeZone, () => referenceDayFromClock(new Date(iso)));

test('isValidIsoDate accepts real dates only', () => {
    for (const ok of ['2026-11-30', '2028-02-29', '2027-01-01']) assert.equal(isValidIsoDate(ok), true, ok);
    for (const bad of ['2026-02-29', '2026-13-01', '2026-11-31', '20261130', '2026-1-05', ' 2026-11-30',
        '0999-01-01', '', null, undefined, 20261130]) assert.equal(isValidIsoDate(bad), false, String(bad));
});

test('addDays crosses month ends, year ends and leap days', () => {
    assert.equal(addDays('2026-11-30', 1), '2026-12-01');
    assert.equal(addDays('2026-12-01', -2), '2026-11-29');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2028-03-01', -1), '2028-02-29');
    assert.equal(addDays('2027-03-01', -1), '2027-02-28');
    assert.equal(inZone('America/New_York', () => addDays('2026-03-07', 1)), '2026-03-08');
    assert.throws(() => addDays('2026-02-30', 1), TypeError);
    assert.throws(() => addDays('2026-11-30', 0.5), TypeError);
});

test('reference day follows the 04:00 boundary, not midnight (Europe/London)', () => {
    const tz = 'Europe/London';
    assert.equal(refAt(tz, '2026-11-20T23:00:00Z'), '2026-11-19'); // 23:00 the evening before
    assert.equal(refAt(tz, '2026-11-21T01:30:00Z'), '2026-11-19'); // 01:30: same diary day
    assert.equal(refAt(tz, '2026-11-21T03:59:00Z'), '2026-11-19');
    assert.equal(refAt(tz, '2026-11-21T04:00:00Z'), '2026-11-20');
    assert.equal(refAt(tz, '2026-11-21T15:00:00Z'), '2026-11-20');
});

test('reference day across month and year ends', () => {
    const tz = 'Europe/London';
    assert.equal(refAt(tz, '2026-12-01T15:00:00Z'), '2026-11-30');
    assert.equal(refAt(tz, '2026-12-01T01:30:00Z'), '2026-11-29');
    assert.equal(refAt(tz, '2027-01-01T10:00:00Z'), '2026-12-31');
    assert.equal(refAt(tz, '2027-01-01T02:00:00Z'), '2026-12-30');
    assert.equal(refAt(tz, '2028-03-01T10:00:00Z'), '2028-02-29');
});

test('reference day on the spring-forward and autumn-back days uses the wall clock', () => {
    // London, 29 March 2026: 01:00 GMT becomes 02:00 BST.
    assert.equal(refAt('Europe/London', '2026-03-29T02:30:00Z'), '2026-03-27'); // 03:30 BST
    assert.equal(refAt('Europe/London', '2026-03-29T03:30:00Z'), '2026-03-28'); // 04:30 BST
    // New York, 8 March 2026: 02:00 EST becomes 03:00 EDT.
    assert.equal(refAt('America/New_York', '2026-03-08T07:30:00Z'), '2026-03-06'); // 03:30 EDT
    assert.equal(refAt('America/New_York', '2026-03-08T08:30:00Z'), '2026-03-07'); // 04:30 EDT
    // New York, 1 November 2026: 02:00 EDT becomes 01:00 EST, so 01:30 happens twice.
    assert.equal(refAt('America/New_York', '2026-11-01T05:30:00Z'), '2026-10-30'); // 01:30 EDT
    assert.equal(refAt('America/New_York', '2026-11-01T06:30:00Z'), '2026-10-30'); // 01:30 EST
    assert.equal(refAt('America/New_York', '2026-11-01T08:30:00Z'), '2026-10-30'); // 03:30 EST
    assert.equal(refAt('America/New_York', '2026-11-01T09:00:00Z'), '2026-10-31'); // 04:00 EST
    // A zone without daylight saving and a half-hour offset.
    assert.equal(refAt('Asia/Kolkata', '2026-11-20T22:00:00Z'), '2026-11-19'); // 03:30 IST on the 21st
});

test('a version 2 draft is dated by its last save and its stamps before midnight', () => {
    const episode = (startTime) => ({ startTime, endTime: startTime });
    const savedAt = (iso) => Date.parse(iso);
    inZone('Europe/London', () => {
        // Filled in at 21:00 on 20 November by the previous version: it dated the episodes
        // before midnight 19 November (the device's "yesterday") and those after midnight
        // 20 November.
        const evening = { primary: [episode('2026-11-19 08:00'), episode('2026-11-19 23:00'),
            episode('2026-11-20 01:30')] };
        assert.equal(referenceDayOfVersion2Draft(evening, savedAt('2026-11-20T21:30:00Z')), '2026-11-19');
        // The page stayed open and kept saving until 09:00 the next morning.
        assert.equal(referenceDayOfVersion2Draft(evening, savedAt('2026-11-21T09:00:00Z')), '2026-11-19');
        // Filled in at 01:30 on 21 November: the stamps say 20 November, the last save the 19th.
        const night = { primary: [episode('2026-11-20 08:00'), episode('2026-11-21 01:00')] };
        assert.equal(referenceDayOfVersion2Draft(night, savedAt('2026-11-21T01:45:00Z')), '2026-11-19');
        // Filled in across midnight: blocks placed after midnight got the next day, on
        // any timeline; the earliest date counts.
        const across = { primary: [episode('2026-11-19 22:00'), episode('2026-11-20 23:00')],
            location: [episode('2026-11-20 08:00')] };
        assert.equal(referenceDayOfVersion2Draft(across, savedAt('2026-11-21T09:00:00Z')), '2026-11-19');
        // Stamps after midnight are not used: on the 1st of a month they are a month early.
        const rollover = { primary: [episode('2026-11-01 00:00'), episode('2026-11-01 01:30')] };
        assert.equal(referenceDayOfVersion2Draft(rollover, savedAt('2026-12-01T15:00:00Z')), '2026-11-30');
        // No episodes, or none that can be read: the last save alone.
        assert.equal(referenceDayOfVersion2Draft({ primary: [] }, savedAt('2026-11-21T09:00:00Z')), '2026-11-20');
        const unreadable = { primary: [episode('08:00'), episode('2026-02-30 08:00'), episode(null), null],
            location: null };
        assert.equal(referenceDayOfVersion2Draft(unreadable, savedAt('2026-11-21T09:00:00Z')), '2026-11-20');
        // No timestamp: the stamps alone, or nothing.
        assert.equal(referenceDayOfVersion2Draft(evening, undefined), '2026-11-19');
        assert.equal(referenceDayOfVersion2Draft({}, undefined), null);
    });
});

test('resolveReferenceDay: link parameter, then stored draft, then clock', () => {
    const now = new Date('2026-12-05T10:00:00Z');
    inZone('Europe/London', () => {
        assert.deepEqual(resolveReferenceDay({ param: '2026-11-30', now }),
            { date: '2026-11-30', source: 'link', warning: null });
        assert.equal(resolveReferenceDay({ param: ' 2026-11-30 ', now }).date, '2026-11-30');
        assert.deepEqual(resolveReferenceDay({ stored: '2026-11-19', now }),
            { date: '2026-11-19', source: 'draft', warning: null });
        assert.deepEqual(resolveReferenceDay({ now }), { date: '2026-12-04', source: 'clock', warning: null });
        const bad = resolveReferenceDay({ param: '2026-02-30', now });
        assert.equal(bad.date, '2026-12-04');
        assert.equal(bad.source, 'clock');
        assert.match(bad.warning, /DIARY_DATE "2026-02-30"/);
        const badWithDraft = resolveReferenceDay({ param: '30/11/2026', stored: '2026-11-19', now });
        assert.equal(badWithDraft.date, '2026-11-19');
        assert.equal(badWithDraft.source, 'draft');
        assert.match(badWithDraft.warning, /30\/11\/2026/);
        const conflict = resolveReferenceDay({ param: '2026-11-30', stored: '2026-11-19', now });
        assert.equal(conflict.date, '2026-11-30');
        assert.equal(conflict.source, 'link');
        assert.match(conflict.warning, /2026-11-19/);
        assert.equal(resolveReferenceDay({ param: '2026-11-19', stored: '2026-11-19', now }).warning, null);
        assert.equal(resolveReferenceDay({ stored: 'garbage', now }).source, 'clock');
    });
});

test('formatTimestamp builds stamps from the reference day and timeline minutes', () => {
    assert.equal(formatTimestamp('2026-11-30', 240), '2026-11-30 04:00');
    assert.equal(formatTimestamp('2026-11-30', 1439), '2026-11-30 23:59');
    assert.equal(formatTimestamp('2026-11-30', 1440), '2026-12-01 00:00');
    assert.equal(formatTimestamp('2026-11-30', 1530), '2026-12-01 01:30');
    assert.equal(formatTimestamp('2026-11-30', 1680), '2026-12-01 04:00');
    assert.equal(formatTimestamp('2026-12-31', 1500), '2027-01-01 01:00');
    assert.equal(formatTimestamp('2028-02-28', 1440), '2028-02-29 00:00');
    assert.throws(() => formatTimestamp('2026-11-30', 12.5), TypeError);
    assert.throws(() => formatTimestamp('2026-11-30', -10), TypeError);
    assert.throws(() => formatTimestamp('2026-11-31', 240), TypeError);
});

test('formatTimestamp keeps the labels of the hour the clocks skip or repeat', () => {
    const ny = (minutes) => inZone('America/New_York', () => formatTimestamp('2026-03-07', minutes));
    assert.deepEqual([1550, 1560, 1590, 1610, 1620].map(ny),
        ['2026-03-08 01:50', '2026-03-08 02:00', '2026-03-08 02:30', '2026-03-08 02:50', '2026-03-08 03:00']);
    assert.equal(inZone('Europe/London', () => formatTimestamp('2026-03-28', 1500)), '2026-03-29 01:00');
    assert.equal(inZone('America/New_York', () => formatTimestamp('2026-10-31', 1530)), '2026-11-01 01:30');
    // The result does not depend on the device zone.
    assert.equal(inZone('Pacific/Auckland', () => formatTimestamp('2026-03-07', 1560)), '2026-03-08 02:00');
});
