import { getIsMobile, updateIsMobile } from '../globals.js';

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const continueBtn = document.getElementById('continueBtn');
    
    // Function to create URL with preserved parameters
    function createUrlWithParams(targetPath) {
        const currentParams = new URLSearchParams(window.location.search);
        const redirectUrl = new URL(targetPath, window.location.href);
        currentParams.forEach((value, key) => {
            redirectUrl.searchParams.append(key, value);
        });
        return redirectUrl.toString();
    }
    
    // Handle back button state and navigation
    if (window.location.pathname.includes('1.html')) {
        // On first page, disable back button
        backBtn.disabled = true;
    } else if (window.location.pathname.includes('2.html')) {
        // On second page, always go back to first page
        backBtn.onclick = () => window.location.href = createUrlWithParams('1.html');
    } else if (window.location.pathname.includes('3.html')) {
        // On third page, always go back to second page
        backBtn.onclick = () => window.location.href = createUrlWithParams('2.html');
    }
    
    // Handle continue button navigation
    if (window.location.pathname.includes('1.html')) {
        continueBtn.onclick = () => window.location.href = createUrlWithParams('2.html');
    } else if (window.location.pathname.includes('2.html')) {
        continueBtn.onclick = () => window.location.href = createUrlWithParams('3.html');
    } else if (window.location.pathname.includes('3.html')) {
        // On last page, add instructions=completed parameter when going to index
        continueBtn.textContent = 'Start';
        continueBtn.onclick = () => {
            const redirectUrl = new URL('../index.html', window.location.href);
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.append('instructions', 'completed');
            currentParams.forEach((value, key) => {
                redirectUrl.searchParams.append(key, value);
            });
            window.location.href = redirectUrl.toString();
        };
    }
});

function updateLayout() {
    const isHorizontal = !getIsMobile();
    document.body.classList.toggle('is-horizontal', isHorizontal);
    document.body.classList.toggle('is-vertical', !isHorizontal);
}

// Initial layout
updateLayout();

// Update on resize - updateIsMobile will handle the reload at breakpoint
window.addEventListener('resize', () => {
    updateIsMobile();
});

// No longer need layoutChange event listener since we're doing full page reloads
