/* autoscroll.js */

import { getIsMobile } from './globals.js';
import { prefersReducedMotion } from './accessibility.js';

// Module to handle auto-scrolling during both top and bottom edge resizing of activity blocks in vertical layout.
const autoScrollModule = (() => {
  // Configuration options
  let isEnabled = true; // Auto-scroll feature is enabled by default
  const config = {
    threshold: 100,    // Threshold in pixels from top/bottom of viewport
    scrollSpeed: 32,   // Pixels to scroll per tick
    interval: 16       // How often to check for scrolling (16ms ≈ 60fps)
  };

  let mouseMoveListener = null;
  let scrollInterval = null;
  let lastPointerY = null;

  function updatePointerFromEvent(e) {
    if (!e) return;
    if (e.touches && e.touches.length > 0) {
      lastPointerY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      lastPointerY = e.changedTouches[0].clientY;
    } else if (typeof e.clientY === 'number') {
      lastPointerY = e.clientY;
    } else if (e.client && typeof e.client.y === 'number') {
      lastPointerY = e.client.y;
    } else if (typeof e.pageY === 'number') {
      lastPointerY = e.pageY - (window.pageYOffset || document.documentElement.scrollTop || 0);
    } else if (e.page && typeof e.page.y === 'number') {
      lastPointerY = e.page.y - (window.pageYOffset || document.documentElement.scrollTop || 0);
    } else if (typeof e.y === 'number') {
      lastPointerY = e.y;
    }
  }

  function getScrollContainer(resizingElement) {
    if (!getIsMobile()) return window;

    if (resizingElement) {
      let current = resizingElement.parentElement;
      while (current && current !== document.body) {
        const styles = window.getComputedStyle(current);
        const overflowY = styles.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') &&
            current.scrollHeight > current.clientHeight) {
          return current;
        }
        current = current.parentElement;
      }
    }

    const wrapper = document.querySelector('.timelines-wrapper');
    return wrapper || window;
  }

  // Function to perform the actual scrolling
  function performScroll() {
    if (!isEnabled || !getIsMobile() || lastPointerY === null || prefersReducedMotion()) return;

    // Check if an activity block is currently being resized
    const resizingElement = document.querySelector('.activity-block.resizing');
    if (!resizingElement) return;

    const scrollContainer = getScrollContainer(resizingElement);
    const isWindow = scrollContainer === window;

    // Get viewport height and calculate distances relative to scroll container
    const containerRect = isWindow
      ? { top: 0, bottom: window.innerHeight }
      : scrollContainer.getBoundingClientRect();
    const viewportHeight = isWindow ? window.innerHeight : scrollContainer.clientHeight;
    const distanceToBottom = containerRect.bottom - lastPointerY;
    const distanceToTop = lastPointerY - containerRect.top;

    // Get scroll info
    const scrollTop = isWindow
      ? (window.pageYOffset || document.documentElement.scrollTop)
      : scrollContainer.scrollTop;
    const scrollHeight = isWindow
      ? document.documentElement.scrollHeight
      : scrollContainer.scrollHeight;
    const maxScrollTop = Math.max(0, scrollHeight - viewportHeight);

    // Get the header height to prevent scrolling above it
    const headerSection = document.querySelector('.header-section');
    const headerHeight = headerSection ? headerSection.offsetHeight : 0;

    // Retrieve footer element to prevent scrolling past it
    const footer = document.querySelector("#instructionsFooter");
    let footerLimit = Infinity;
    if (footer) {
      // Calculate the absolute top position of the footer
      footerLimit = footer.getBoundingClientRect().top + scrollTop;
    }

    // Scroll Down Condition:
    if (distanceToBottom < config.threshold &&
        scrollTop < maxScrollTop &&
        (isWindow ? (scrollTop + config.scrollSpeed + viewportHeight) < footerLimit : true)) {
      if (isWindow) {
        window.scrollBy({
          top: config.scrollSpeed,
          behavior: 'auto'
        });
      } else {
        scrollContainer.scrollTop = Math.min(maxScrollTop, scrollTop + config.scrollSpeed);
      }
    }
    // Scroll Up Condition:
    else if (distanceToTop < config.threshold &&
        scrollTop > (isWindow ? headerHeight : 0)) {
      if (isWindow) {
        window.scrollBy({
          top: -config.scrollSpeed,
          behavior: 'auto'
        });
      } else {
        scrollContainer.scrollTop = Math.max(0, scrollTop - config.scrollSpeed);
      }
    }
  }

  // Event handler to update pointer position
  function onPointerMove(e) {
    if (!isEnabled || !getIsMobile()) return;

    updatePointerFromEvent(e);
  }

  const MOVE_LISTENER_OPTIONS = { passive: true, capture: true };

  // Enable the auto-scroll functionality
  function enable() {
    if (!mouseMoveListener) {
      mouseMoveListener = onPointerMove;
      document.addEventListener('mousemove', mouseMoveListener, MOVE_LISTENER_OPTIONS);
      document.addEventListener('touchmove', mouseMoveListener, MOVE_LISTENER_OPTIONS);
      document.addEventListener('pointermove', mouseMoveListener, MOVE_LISTENER_OPTIONS);
    }
    
    // Start the scroll interval if not already running
    if (!scrollInterval) {
      scrollInterval = setInterval(performScroll, config.interval);
    }
    
    isEnabled = true;
  }

  // Disable the auto-scroll functionality
  function disable() {
    if (mouseMoveListener) {
      document.removeEventListener('mousemove', mouseMoveListener, { capture: true });
      document.removeEventListener('touchmove', mouseMoveListener, { capture: true });
      document.removeEventListener('pointermove', mouseMoveListener, { capture: true });
      mouseMoveListener = null;
    }
    
    // Clear the scroll interval
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    
    // Reset pointer position
    lastPointerY = null;
    
    isEnabled = false;
  }

  // Expose the module API
  return {
    enable,
    disable,
    config,
    setPointerFromEvent: updatePointerFromEvent
  };
})();

// Make the autoScrollModule globally available
window.autoScrollModule = autoScrollModule;

// Enable auto-scroll by default
autoScrollModule.enable();

export default autoScrollModule; 
