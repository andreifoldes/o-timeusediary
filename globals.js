// Global state
let isMobile = window.innerWidth < 1440;
let lastBreakpointState = isMobile;

// Get current mobile state
export function getIsMobile() {
    return isMobile;
}
// Make getIsMobile available globally
window.getIsMobile = getIsMobile;

// Update function
export function updateIsMobile() {
    const newIsMobile = window.innerWidth < 1440;
    const breakpointChanged = newIsMobile !== lastBreakpointState;
    isMobile = newIsMobile;
    lastBreakpointState = newIsMobile;
    return breakpointChanged;  // Return true only if breakpoint actually changed
}

// Initialize immediately
updateIsMobile();

export { isMobile };
