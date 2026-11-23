/**
 * Episodes as intervals of minutes on one diary day. Pure functions: no DOM, no
 * window, so they run in the browser and under `node --test`.
 *
 * An episode is the half-open interval [start, end) in minutes counted from 00:00
 * of the date on which the diary day starts: 240 is 04:00, the start of the diary
 * day; 1440 is midnight; 1680 is 04:00 the next morning. Two episodes that only
 * touch (one ends at 08:10, the next starts at 08:10) do not overlap.
 */
export const DAY_START_MINUTES = 240;
export const DAY_END_MINUTES = 1680;
const MINUTES_PER_DAY = 1440;

// "YYYY-MM-DD HH:MM" or "HH:MM" -> minutes after midnight, or null.
function clockMinutes(stamp) {
    if (typeof stamp !== 'string') return null;
    const match = /(\d{1,2}):(\d{2})$/.exec(stamp.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
}

/**
 * The episode's { start, end } in timeline minutes: its stored startMinutes and
 * endMinutes, or, for an activity saved without them, the times of day in its
 * startTime and endTime. On a 04:00-to-04:00 day a start before 04:00 lies after
 * midnight, and so does an end at or before 04:00 (no episode ends at the 04:00 that
 * opens the day). The dates in the strings are ignored on purpose: drafts saved by
 * older versions can carry wrong ones (a month early after midnight on the 1st).
 * Returns null when neither the minutes nor the times can be read.
 */
export function activityInterval(activity) {
    if (Number.isFinite(activity?.startMinutes) && Number.isFinite(activity?.endMinutes)) {
        return { start: activity.startMinutes, end: activity.endMinutes };
    }
    const start = clockMinutes(activity?.startTime);
    const end = clockMinutes(activity?.endTime);
    if (start === null || end === null) return null;
    return {
        start: start < DAY_START_MINUTES ? start + MINUTES_PER_DAY : start,
        end: end <= DAY_START_MINUTES ? end + MINUTES_PER_DAY : end
    };
}

/** The first activity whose interval overlaps [start, end), skipping excludeId; null if none. */
export function findOverlap(activities, start, end, excludeId = null) {
    for (const activity of activities || []) {
        if (excludeId != null && activity?.id === excludeId) continue;
        const interval = activityInterval(activity);
        if (interval && start < interval.end && interval.start < end) return activity;
    }
    return null;
}
