import { getIsMobile, updateIsMobile } from '../globals.js';

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
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
    
    // Update progress bar animation with requestAnimationFrame for better performance
    if (progressBar) {
        let animationFrame;
        const updateProgress = () => {
            progressBar.style.transition = 'width 0.6s ease';
            if (window.location.pathname.includes('1.html')) {
                progressBar.style.width = '50%';
            } else if (window.location.pathname.includes('2.html')) {
                progressBar.style.width = '100%';
            }
        };
        animationFrame = requestAnimationFrame(updateProgress);
    }

    // Detect layout orientation with debouncing
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

    // Handle navigation with transition animations
    if (window.location.pathname.includes('2.html') && backBtn) {
        backBtn.addEventListener('click', () => {
            progressBar.style.width = '0%';
            setTimeout(() => {
                window.location.href = createUrlWithParams('1.html');
            }, 300);
        });
    }
    
    if (window.location.pathname.includes('1.html')) {
        continueBtn.addEventListener('click', () => {
            progressBar.style.width = '100%';
            setTimeout(() => {
                window.location.href = createUrlWithParams('2.html');
            }, 300);
        });
    } else if (window.location.pathname.includes('2.html') && continueBtn) {
        continueBtn.textContent = 'Start';
        continueBtn.addEventListener('click', () => {
            window.location.href = createUrlWithParams('../index.html');
        });
    }

    // Cleanup function
    function cleanup() {
        if (orientationTimeout) clearTimeout(orientationTimeout);
        if (animationFrame) cancelAnimationFrame(animationFrame);
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
