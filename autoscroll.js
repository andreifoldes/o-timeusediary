/* autoscroll.js */

import { getIsMobile } from './globals.js';

// Module to handle auto-scrolling during bottom-edge resizing of activity blocks in vertical layout.
const autoScrollModule = (() => {
  // Configuration options
  let isEnabled = true; // Auto-scroll feature is enabled by default
  const config = {
    threshold: 100,    // Threshold in pixels from bottom of viewport
    scrollSpeed: 8,    // Pixels to scroll per tick
    interval: 16       // How often to check for scrolling (16ms ≈ 60fps)
  };

  let mouseMoveListener = null;
  let scrollInterval = null;
  let lastPointerY = null;

  // Function to perform the actual scrolling
  function performScroll() {
    if (!isEnabled || !getIsMobile() || !lastPointerY) return;

    // Check if an activity block is currently being resized
    const resizingElement = document.querySelector('.activity-block.resizing');
    if (!resizingElement) return;

    // Get viewport height and calculate distance from bottom
    const viewportHeight = window.innerHeight;
    const distanceToBottom = viewportHeight - lastPointerY;

    // Get scroll info
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;

    // Only scroll if we're not at the bottom of the page
    if (distanceToBottom < config.threshold && scrollTop < scrollHeight - viewportHeight) {
      window.scrollBy({
        top: config.scrollSpeed,
        behavior: 'auto'
      });
    }
  }

  // Event handler to update pointer position
  function onPointerMove(e) {
    if (!isEnabled || !getIsMobile()) return;

    // Check if an activity block is currently being resized
    const resizingElement = document.querySelector('.activity-block.resizing');
    if (!resizingElement) return;

    // Update pointer position
    if (e.touches && e.touches.length > 0) {
      lastPointerY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      lastPointerY = e.changedTouches[0].clientY;
    } else {
      lastPointerY = e.clientY;
    }
  }

  // Enable the auto-scroll functionality
  function enable() {
    if (!mouseMoveListener) {
      mouseMoveListener = onPointerMove;
      document.addEventListener('mousemove', mouseMoveListener, { passive: true });
      document.addEventListener('touchmove', mouseMoveListener, { passive: true });
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
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('touchmove', mouseMoveListener);
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
    config
  };
})();

// Make the autoScrollModule globally available
window.autoScrollModule = autoScrollModule;

// Enable auto-scroll by default
autoScrollModule.enable();

export default autoScrollModule; 