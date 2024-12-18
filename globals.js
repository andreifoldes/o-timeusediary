// Global state
let isMobile = window.innerWidth < 1024;

// Update function
export function updateIsMobile() {
    isMobile = window.innerWidth < 1024;
    return isMobile;
}

// Initialize immediately
updateIsMobile();

export default isMobile;
