/**
 * State serialization for O-TUD timeline data
 * Preserves participant data across responsive breakpoint reloads
 */

const STATE_VERSION = 1;

/**
 * Serializes the current timeline state for storage
 * @returns {string} JSON string of serializable state
 */
export function serializeTimelineState() {
    const state = {
        version: STATE_VERSION,
        activities: window.timelineManager?.activities || {},
        currentIndex: window.timelineManager?.currentIndex ?? 0,
        keys: window.timelineManager?.keys || [],
        selectedActivity: window.selectedActivity || null
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
    window.selectedActivity = state.selectedActivity;

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
    // selectedActivity can be null or object - both valid
    if (state.selectedActivity !== null && typeof state.selectedActivity !== 'object') return false;
    return true;
}
