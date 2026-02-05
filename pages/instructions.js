import { getIsMobile, updateIsMobile } from '../js/globals.js';
import i18n from '../js/i18n.js';
import { applyAccessibilityConfig } from '../js/accessibility.js';

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

// Initialize i18n when the module loads
(async () => {
    try {
        // Load activities.json to get language setting
        const response = await fetch('../settings/activities.json');
        if (response.ok) {
            const data = await response.json();
            const language = data.general?.language || 'en';
            applyAccessibilityConfig(data.general?.accessibility);
            console.log('Loading language:', language);
            await i18n.init(language);
            i18n.applyTranslations();
            console.log('i18n initialized successfully');
        } else {
            console.warn('Could not load activities.json, defaulting to English');
            applyAccessibilityConfig();
            await i18n.init('en');
            i18n.applyTranslations();
        }
    } catch (error) {
        console.error('Error initializing i18n:', error);
        // Fallback to English if there's any error
        applyAccessibilityConfig();
        await i18n.init('en');
        i18n.applyTranslations();
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const continueBtn = document.getElementById('continueBtn');
    const progressBar = document.getElementById('progressBar');
    
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
    
    // Update progress bar
    if (progressBar) {
        progressBar.style.transition = 'width 0.6s ease';
        progressBar.style.width = '100%';
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
        console.log('Continue button found, adding click handler');
        continueBtn.addEventListener('click', (e) => {
            console.log('Continue button clicked');
            const targetUrl = createUrlWithParams('../index.html');
            console.log('Redirecting to:', targetUrl);
            window.location.href = targetUrl;
        });
    } else {
        console.error('Continue button not found!');
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
