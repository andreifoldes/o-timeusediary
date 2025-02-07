import { getIsMobile, updateIsMobile } from '../globals.js';

// Add the missing updateLayout function
function updateLayout() {
    const isMobile = getIsMobile();
    document.body.classList.toggle('mobile-layout', isMobile);
    document.body.classList.toggle('desktop-layout', !isMobile);
    
    // Update orientation classes
    const isHorizontal = window.innerWidth > window.innerHeight;
    document.body.classList.toggle('is-horizontal', isHorizontal);
    document.body.classList.toggle('is-vertical', !isHorizontal);
}

document.addEventListener('DOMContentLoaded', () => {
    const continueBtn = document.getElementById('continueBtn');
    
    // Function to create URL with preserved parameters
    function createUrlWithParams(targetPath) {
        const currentUrl = new URL(window.location.href);
        const redirectUrl = new URL(targetPath, currentUrl.origin + currentUrl.pathname.replace(/[^/]*$/, ''));
        
        // Preserve all existing URL parameters
        currentUrl.searchParams.forEach((value, key) => {
            // Don't override 'instructions' param if it's the target destination
            if (targetPath === '../index.html' && key === 'instructions') {
                return;
            }
            redirectUrl.searchParams.set(key, value);
        });
        
        // Add instructions=completed for final redirect
        if (targetPath === '../index.html') {
            redirectUrl.searchParams.set('instructions', 'completed');
        }
        
        return redirectUrl.toString();
    }
    
    // Handle orientation changes
    let orientationTimeout;
    function updateLayoutClass() {
        clearTimeout(orientationTimeout);
        orientationTimeout = setTimeout(() => {
            const isHorizontal = window.innerWidth > window.innerHeight;
            document.body.classList.toggle('is-horizontal', isHorizontal);
            document.body.classList.toggle('is-vertical', !isHorizontal);
        }, 100);
    }

    // Update layout class on load and resize with passive event listener
    updateLayoutClass();
    window.addEventListener('resize', updateLayoutClass, { passive: true });

    // Lazy load images with IntersectionObserver
    const lazyImageObservers = new Map();
    const lazyImages = document.querySelectorAll('.gif-container[data-src]');
    lazyImages.forEach(container => {
        const img = container.querySelector('img');
        if (img) {
            const observer = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            img.src = container.dataset.src;
                            observer.unobserve(entry.target);
                            lazyImageObservers.delete(container);
                        }
                    });
                },
                { rootMargin: '50px', threshold: 0.1 }
            );
            observer.observe(container);
            lazyImageObservers.set(container, observer);
        }
    });

    // Handle start button click
    if (continueBtn) {
        continueBtn.textContent = 'Start';
        continueBtn.addEventListener('click', () => {
            window.location.href = createUrlWithParams('../index.html');
        });
    }

    // Cleanup function
    function cleanup() {
        if (orientationTimeout) clearTimeout(orientationTimeout);
        lazyImageObservers.forEach(observer => observer.disconnect());
        lazyImageObservers.clear();
        window.removeEventListener('resize', updateLayoutClass);
    }

    // Clean up when page is unloaded
    window.addEventListener('unload', cleanup);
});

// Initial layout
updateLayout();

// Update on resize with debouncing
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateIsMobile();
        updateLayout();
    }, 100);
}, { passive: true });
