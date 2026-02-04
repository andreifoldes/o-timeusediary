import { serializeTimelineState } from './state-serializer.js';

// Global state
let isMobile = window.innerWidth < 1440;
let lastBreakpointState = isMobile;
let isReloading = false; // Prevent multiple reloads

// Get current mobile state
export function getIsMobile() {
    return isMobile;
}
// Make getIsMobile available globally
window.getIsMobile = getIsMobile;

// Update function - handles responsive breakpoint changes
export function updateIsMobile() {
    if (isReloading) return false;

    const newIsMobile = window.innerWidth < 1440;
    const breakpointChanged = newIsMobile !== lastBreakpointState;

    if (breakpointChanged) {
        isReloading = true;

        // Preserve state before reload
        try {
            const stateJson = serializeTimelineState();
            const backup = {
                state: JSON.parse(stateJson),
                timestamp: Date.now()
            };
            sessionStorage.setItem('otud-resize-state', JSON.stringify(backup));
        } catch (e) {
            console.warn('[resize] Failed to save state:', e);
        }

        window.location.reload();
        return false;
    }

    isMobile = newIsMobile;
    lastBreakpointState = newIsMobile;
    return false;
}

// Initialize immediately
updateIsMobile();

export { isMobile };
