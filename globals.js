// Global state
let isMobile = window.innerWidth < 1024;

// Get current mobile state
export function getIsMobile() {
    return isMobile;
}

// Update function
export function updateIsMobile() {
    isMobile = window.innerWidth < 1024;
    return isMobile;
}

// Initialize immediately
updateIsMobile();

export { isMobile };
