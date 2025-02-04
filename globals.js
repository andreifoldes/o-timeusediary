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

// Update function
export function updateIsMobile() {
    if (isReloading) return false;
    
    const newIsMobile = window.innerWidth < 1440;
    const breakpointChanged = newIsMobile !== lastBreakpointState;
    
    if (breakpointChanged) {
        isReloading = true;
        window.location.reload();
        return false; // Won't actually reach this point due to reload
    }
    
    isMobile = newIsMobile;
    lastBreakpointState = newIsMobile;
    return false;
}

// Initialize immediately
updateIsMobile();

export { isMobile };
