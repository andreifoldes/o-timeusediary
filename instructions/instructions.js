import { getIsMobile, updateIsMobile } from '../globals.js';

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const continueBtn = document.getElementById('continueBtn');
    const progressBar = document.getElementById('progressBar');
    
    // Function to create URL with preserved parameters
    function createUrlWithParams(targetPath) {
        const currentUrl = new URL(window.location.href);
        const redirectUrl = new URL(targetPath, currentUrl.origin + currentUrl.pathname.replace(/[^/]*$/, ''));
        currentUrl.searchParams.forEach((value, key) => {
            redirectUrl.searchParams.set(key, value);
        });
        return redirectUrl.toString();
    }
    
    // Update progress bar animation
    if (progressBar) {
        requestAnimationFrame(() => {
            progressBar.style.transition = 'width 0.6s ease';
            if (window.location.pathname.includes('1.html')) {
                progressBar.style.width = '50%';
            } else if (window.location.pathname.includes('2.html')) {
                progressBar.style.width = '100%';
            }
        });
    }

    // Detect layout orientation
    function updateLayoutClass() {
        const isHorizontal = window.innerWidth > window.innerHeight;
        document.body.classList.toggle('is-horizontal', isHorizontal);
        document.body.classList.toggle('is-vertical', !isHorizontal);
    }

    // Update layout class on load and resize
    updateLayoutClass();
    window.addEventListener('resize', updateLayoutClass);

    // Lazy load images
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
                        }
                    });
                },
                { rootMargin: '50px' }
            );
            observer.observe(container);
        }
    });

    // Handle back button state and navigation (only on page 2)
    if (window.location.pathname.includes('2.html') && backBtn) {
        backBtn.addEventListener('click', () => {
            progressBar.style.width = '0%';
            setTimeout(() => {
                window.location.href = createUrlWithParams('1.html');
            }, 300);
        });
    }
    
    // Handle continue button navigation
    if (window.location.pathname.includes('1.html')) {
        continueBtn.addEventListener('click', () => {
            progressBar.style.width = '100%';
            setTimeout(() => {
                window.location.href = createUrlWithParams('2.html');
            }, 300);
        });
    } else if (window.location.pathname.includes('2.html') && continueBtn) {
        // On last page, add instructions=completed parameter when going to index
        continueBtn.textContent = 'Start';
        continueBtn.addEventListener('click', () => {
            const redirectUrl = new URL('../index.html', window.location.href);
            redirectUrl.searchParams.set('instructions', 'completed');
            window.location.href = redirectUrl.toString();
        });
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
