/**
 * State serialization for O-TUD timeline data
 * Preserves participant data across responsive breakpoint reloads
 */

const STATE_VERSION = 2;

/**
 * Serializes the current timeline state for storage
 * @returns {string} JSON string of serializable state
 */
export function serializeTimelineState() {
    const activities = cloneActivitiesWithMinutes(window.timelineManager?.activities || {});
    const state = {
        version: STATE_VERSION,
        activities,
        currentIndex: window.timelineManager?.currentIndex ?? 0,
        keys: window.timelineManager?.keys || []
    };
    return JSON.stringify(state);
}

/**
 * Deserializes and restores timeline state
 * @param {string} jsonString - Previously serialized state
 * @returns {boolean} True if restoration succeeded
 */
export function deserializeTimelineState(jsonString) {
    if (!jsonString) {
        console.warn('[state-serializer] No state string provided');
        return false;
    }

    let state;
    try {
        state = JSON.parse(jsonString);
    } catch (e) {
        console.warn('[state-serializer] Failed to parse state JSON:', e.message);
        return false;
    }

    if (!isValidState(state)) {
        console.warn('[state-serializer] Invalid state structure');
        return false;
    }

    // Restore to window.timelineManager (must exist from init)
    if (!window.timelineManager) {
        console.warn('[state-serializer] timelineManager not initialized');
        return false;
    }

    window.timelineManager.activities = state.activities;
    window.timelineManager.currentIndex = state.currentIndex;
    window.timelineManager.keys = state.keys;
    window.selectedActivity = null;

    console.log('[state-serializer] State restored successfully');
    return true;
}

/**
 * Validates a serialized state object has required structure
 * @param {object} state - Parsed state object
 * @returns {boolean}
 */
function isValidState(state) {
    if (!state || typeof state !== 'object') return false;
    if (typeof state.activities !== 'object' || state.activities === null) return false;
    if (typeof state.currentIndex !== 'number') return false;
    if (!Array.isArray(state.keys)) return false;
    return true;
}

function cloneActivitiesWithMinutes(activities) {
    if (!activities || typeof activities !== 'object') return {};

    const minutesById = new Map();
    if (typeof document !== 'undefined') {
        document.querySelectorAll('.activity-block').forEach((block) => {
            const id = block.dataset.id;
            if (!id) return;
            const startMinutes = parseInt(block.dataset.startMinutes, 10);
            const endMinutes = parseInt(block.dataset.endMinutes, 10);
            if (!Number.isNaN(startMinutes) && !Number.isNaN(endMinutes)) {
                minutesById.set(id, { startMinutes, endMinutes });
            }
        });
    }

    const cloned = {};
    for (const [timelineKey, list] of Object.entries(activities)) {
        if (!Array.isArray(list)) {
            cloned[timelineKey] = list;
            continue;
        }
        cloned[timelineKey] = list.map((activity) => {
            const minutes = activity?.id ? minutesById.get(activity.id) : null;
            if (!minutes) return activity;
            return { ...activity, ...minutes };
        });
    }
    return cloned;
}
