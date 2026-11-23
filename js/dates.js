/**
 * Date rules for the diary day. Pure functions: no DOM, no window, so they run in
 * the browser and under `node --test`.
 *
 * The diary describes one day from 04:00 to 04:00 the next morning. Its reference
 * day is the calendar date on which that day starts. It is fixed once per diary
 * (resolveReferenceDay) and every exported timestamp is built from it and the
 * episode's minutes on the timeline (formatTimestamp), so the clock at the moment a
 * block is placed or resized no longer matters.
 *
 * Minutes on the timeline count from 00:00 of the reference day: 240 is 04:00, the
 * start of the diary day; 1440 is midnight; 1680 is 04:00 the next morning.
 */
import { TIMELINE_START_HOUR } from './constants.js';

const MINUTES_PER_DAY = 1440;
const ISO_DATE = /^([1-9]\d{3})-(\d{2})-(\d{2})$/;

const pad2 = (n) => String(n).padStart(2, '0');

function parseIsoDate(value) {
    const match = typeof value === 'string' ? ISO_DATE.exec(value) : null;
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    // Round trip through UTC: rejects 2026-02-30, 2026-13-01 and the like.
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
        return null;
    }
    return { year, month, day };
}

/** True for a real calendar date written YYYY-MM-DD. */
export function isValidIsoDate(value) {
    return parseIsoDate(value) !== null;
}

/**
 * Adds whole days to a YYYY-MM-DD date. Calendar arithmetic in UTC, which has no
 * daylight saving, so month ends, year ends and leap days come out right.
 */
export function addDays(isoDate, days) {
    const parts = parseIsoDate(isoDate);
    if (!parts || !Number.isInteger(days)) {
        throw new TypeError(`addDays: invalid arguments ${isoDate}, ${days}`);
    }
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * The reference day for a diary opened at `now`: the local date of (now minus four
 * hours), minus one day. A diary opened at 01:30 therefore describes the same day as
 * one opened at 23:00 the evening before.
 *
 * The four hours come off the wall clock (the local hour is compared with 04:00),
 * not off elapsed time: four elapsed hours would give the wrong day between 04:00
 * and 05:00 on the day the clocks go forward, and between 03:00 and 04:00 on the
 * day they go back.
 */
export function referenceDayFromClock(now = new Date()) {
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    return addDays(today, now.getHours() < TIMELINE_START_HOUR ? -2 : -1);
}

const STAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}):\d{2}$/;

/**
 * The reference day of a draft saved by the previous version (state version 2), which
 * stored none. Its timestamp alone can be a day late: that version saved every 30
 * seconds while the page was open, so a page left open overnight was last saved after
 * the next 04:00. But that version dated each episode starting between 04:00 and
 * midnight with the device's calendar "yesterday" at the moment it was placed or
 * resized, a date that neither the month roll-over nor a clock change moved (unlike
 * the dates of episodes starting after midnight, which are not used). The earliest of
 * those dates and of the clock rule applied to the timestamp is taken. A diary filled
 * in between 00:00 and 03:59, or one with no episode before midnight, still comes out a
 * day late if its page was left open past 04:00: nothing in the draft tells it apart.
 * Returns null if neither can be read.
 */
export function referenceDayOfVersion2Draft(activities, savedAt) {
    const days = Number.isFinite(savedAt) ? [referenceDayFromClock(new Date(savedAt))] : [];
    for (const list of Object.values(activities || {})) {
        if (!Array.isArray(list)) continue;
        for (const activity of list) {
            const match = typeof activity?.startTime === 'string' ? STAMP.exec(activity.startTime) : null;
            const hour = match ? Number(match[2]) : -1;
            if (hour >= TIMELINE_START_HOUR && hour <= 23 && isValidIsoDate(match[1])) {
                days.push(match[1]);
            }
        }
    }
    return days.length > 0 ? days.sort()[0] : null;
}

/**
 * Chooses the diary's reference day: a valid DIARY_DATE link parameter, otherwise
 * the date stored with a restored draft, otherwise the clock rule.
 * Returns { date, source: 'link' | 'draft' | 'clock', warning }.
 */
export function resolveReferenceDay({ param = null, stored = null, now = new Date() } = {}) {
    const requested = typeof param === 'string' ? param.trim() : '';
    let warning = null;
    if (requested) {
        if (isValidIsoDate(requested)) {
            if (isValidIsoDate(stored) && stored !== requested) {
                warning = `DIARY_DATE ${requested} replaces the date ${stored} stored with the draft`;
            }
            return { date: requested, source: 'link', warning };
        }
        warning = `DIARY_DATE "${param}" is not a valid YYYY-MM-DD date and was ignored`;
    }
    if (isValidIsoDate(stored)) {
        return { date: stored, source: 'draft', warning };
    }
    return { date: referenceDayFromClock(now), source: 'clock', warning };
}

/**
 * The exported "YYYY-MM-DD HH:MM" for a point on the timeline: the reference day plus
 * the whole days in `minutes`, and the remaining minutes as a wall-clock time. No Date
 * object is set to a local time, so a label in the hour skipped when the clocks go
 * forward (02:30 in New York on 8 March 2026) is written as it appears on the timeline.
 */
export function formatTimestamp(referenceDay, minutes) {
    if (!Number.isInteger(minutes) || minutes < 0) {
        throw new TypeError(`formatTimestamp: minutes must be a non-negative integer, got ${minutes}`);
    }
    const dayOffset = Math.floor(minutes / MINUTES_PER_DAY);
    const minuteOfDay = minutes % MINUTES_PER_DAY;
    return `${addDays(referenceDay, dayOffset)} ${pad2(Math.floor(minuteOfDay / 60))}:${pad2(minuteOfDay % 60)}`;
}
