// Global state
export let isMobile = window.innerWidth < 1024;

// Update function
export function updateIsMobile() {
    isMobile = window.innerWidth < 1024;
    return isMobile;
}
