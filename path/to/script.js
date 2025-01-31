// ... existing code ...

import { 
    getCurrentTimelineData, 
    getCurrentTimelineKey, 
    createTimelineDataFrame, 
    sendData,
    validateMinCoverage,
    getTimelineCoverage,
    calculateTimeDifference,
    calculatePositionPercent // Ensure this import is present
} from './utils.js';

// In the resizable 'move' event listener
listeners: {
    move(event) {
        const target = event.target;
        const timelineRect = targetTimeline.getBoundingClientRect();
        let startMinutes, endMinutes;
        
        target.classList.add('resizing');
        
        if (getIsMobile()) {
            // Mobile: Handle vertical resizing
            if (event.edges.top) {
                // ... existing top edge resizing logic ...
            } else if (event.edges.bottom) {
                // Use the helper function to calculate positionPercent
                const { clampedRelativeY, positionPercent } = calculatePositionPercent(event.clientY, timelineRect);
                
                // Calculate rawMinutes and round to nearest 10
                const rawMinutes = positionToMinutes(positionPercent, true);
                endMinutes = Math.round(rawMinutes / 10) * 10;
                
                // ... rest of the bottom edge resizing logic ...
                
                // Debug logging
                if (DEBUG_MODE) {
                    console.log('[Resize Bottom Edge]:', {
                        cursorPosition: clampedRelativeY,
                        timelineHeight: timelineRect.height,
                        minutes: startMinutes,
                        endMinutes
                    });
                }
                
                // ... remaining validation and updating logic ...

                // Pass the calculated values to updateDebugOverlay
                const x = event.clientX;
                const y = event.clientY;
                updateDebugOverlay(x, y, timelineRect, clampedRelativeY, positionPercent);
            }
        } else {
            // ... existing desktop resizing logic ...
        }
        
        // ... existing code to update time labels and activity data ...
    },
    // ... existing end listener ...
}

// ... existing code ...

// Modify the updateDebugOverlay function to accept clampedRelativeY and positionPercent
function updateDebugOverlay(x, y, timelineRect, clampedRelativeY, positionPercent) {
    const debugOverlay = document.getElementById('debugOverlay');
    if (!debugOverlay) return;

    const isMobile = getIsMobile();
    
    let axisPosition, axisSize;

    // Get viewport and header dimensions
    const viewportHeight = window.innerHeight;
    const headerSection = document.querySelector('.header-section');
    const headerBottom = headerSection ? headerSection.getBoundingClientRect().bottom : 0;
    
    // Calculate available height (space between header bottom and viewport bottom)
    const availableHeight = viewportHeight - headerBottom;

    // Calculate normalized distances relative to available height
    const distanceToBottom = (viewportHeight - y) / availableHeight;
    const distanceToHeader = (y - headerBottom) / availableHeight;

    if (isMobile) {
        // Vertical layout calculations
        axisPosition = Math.round(clampedRelativeY);
        axisSize = Math.round(timelineRect.height);
    } else {
        // Horizontal layout calculations
        const relativeX = x - timelineRect.left;
        const clampedRelativeX = Math.max(0, Math.min(relativeX, timelineRect.width));
        const positionPercentX = (clampedRelativeX / timelineRect.width) * 100;
        axisPosition = Math.round(relativeX);
        axisSize = Math.round(timelineRect.width);
    }

    const minutes = positionToMinutes(positionPercent, isMobile);
    // Format time - no need to adjust minutes since formatTimeHHMM now handles the offset
    const timeString = formatTimeHHMM(minutes);

    debugOverlay.innerHTML = isMobile
        ? `Mouse Position: ${axisPosition}px<br>
           Timeline Height: ${axisSize}px<br>
           Position: ${positionPercent.toFixed(2)}%<br>
           Time: ${timeString}<br>
           Distance to Bottom: ${distanceToBottom.toFixed(3)}<br>
           Distance to Header: ${distanceToHeader.toFixed(3)}`
        : `Mouse Position: ${axisPosition}px<br>
           Timeline Width: ${axisSize}px<br>
           Position: ${positionPercent.toFixed(2)}%<br>
           Time: ${timeString}<br>
           Distance to Bottom: ${distanceToBottom.toFixed(3)}<br>
           Distance to Header: ${distanceToHeader.toFixed(3)}`;
}

// ... existing code ...

// Modify the initDebugOverlay function to use the helper and pass calculated values
function initDebugOverlay() {
    if (!DEBUG_MODE) return;

    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 50; // Update every 50ms

    // Function to handle both mouse and touch events
    const handleMove = (e) => {
        const currentTime = Date.now();
        if (getIsMobile() && currentTime - lastUpdateTime > UPDATE_INTERVAL) {
            // Get coordinates from either mouse or touch event
            const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const timelineRect = window.timelineManager.activeTimeline.getBoundingClientRect();
            
            // Use the helper function to calculate positionPercent
            const { clampedRelativeY, positionPercent } = calculatePositionPercent(y, timelineRect);
            
            // Pass the calculated values to updateDebugOverlay
            updateDebugOverlay(x, y, timelineRect, clampedRelativeY, positionPercent);
            lastUpdateTime = currentTime;
        }
    };

    // Add both mouse and touch event listeners
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
}

// ... existing code ... 