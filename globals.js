// Global state
let isMobile = window.innerWidth < 1024;

// Get current mobile state
export function getIsMobile() {
    return isMobile;
}
// Make getIsMobile available globally
window.getIsMobile = getIsMobile;

// Update function
export function updateIsMobile() {
    isMobile = window.innerWidth < 1440;  // Changed from 1024 to 1440
    return isMobile;
}

// Initialize immediately
updateIsMobile();

export { isMobile };
