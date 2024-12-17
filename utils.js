// Import constants
import {
    MINUTES_PER_DAY,
    INCREMENT_MINUTES,
    TIMELINE_START_HOUR,
    TIMELINE_HOURS,
    DEBUG_MODE
} from './constants.js';

// Time calculation and formatting utilities
function formatTimeDDMMYYYYHHMM(minutes) {
    const date = new Date();
    const roundedMinutes = Math.round(minutes);
    const h = Math.floor(roundedMinutes / 60) % 24;
    const m = roundedMinutes % 60;
    const isYesterday = h < TIMELINE_START_HOUR;
    if (isYesterday) {
        date.setDate(date.getDate() - 1);
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTimeHHMM(minutes) {
    const roundedMinutes = Math.round(minutes);
    const h = Math.floor(roundedMinutes / 60) % 24;
    const m = roundedMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
    if (typeof timeStr === 'number') {
        return Math.round(timeStr);
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function findNearestMarkers(minutes) {
    // Round down to nearest 10 minutes for start
    const startMinutes = Math.floor(minutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
    // Add 10 minutes for end
    const endMinutes = startMinutes + INCREMENT_MINUTES;
    return [startMinutes, endMinutes];
}

function minutesToPercentage(minutes) {
    const minutesSince4AM = (minutes - TIMELINE_START_HOUR * 60 + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    return (minutesSince4AM / (TIMELINE_HOURS * 60)) * 100;
}

function minutesToPosition(minutes, timelineWidth) {
    return minutesToPercentage(minutes);
}

function positionToMinutes(positionPercent) {
    if (positionPercent >= 100) {
        return null;
    }
    
    const minutesSinceStart = (positionPercent / 100) * TIMELINE_HOURS * 60;
    let totalMinutes = minutesSinceStart + (TIMELINE_START_HOUR * 60);
    totalMinutes = Math.round(totalMinutes) % MINUTES_PER_DAY;
    
    return totalMinutes;
}

function calculateMinimumBlockWidth() {
    return (INCREMENT_MINUTES / (TIMELINE_HOURS * 60)) * 100;
}

// Activity placement utilities
function canPlaceActivity(timelineData, newStart, newEnd, excludeId = null) {
    return !timelineData.some(activity => {
        if (excludeId && activity.id === excludeId) return false;
        const activityStart = timeToMinutes(activity.startTime.split(' ')[1]);
        const activityEnd = timeToMinutes(activity.endTime.split(' ')[1]);
        return (newStart < activityEnd && newEnd > activityStart);
    });
}

function isTimelineFull(timelineData) {
    if (timelineData.length === 0) return false;

    // Timeline starts at TIMELINE_START_HOUR and spans TIMELINE_HOURS hours
    const timelineStart = TIMELINE_START_HOUR * 60; // Start time in minutes
    const totalTimelineMinutes = TIMELINE_HOURS * 60; // Total minutes in the timeline
    
    // Array representing each minute in the timeline
    const timelineCoverage = new Array(totalTimelineMinutes).fill(false);

    // Mark the minutes that are covered by activities
    timelineData.forEach(activity => {
        const startMinutes = timeToMinutes(activity.startTime.split(' ')[1]);
        const endMinutes = timeToMinutes(activity.endTime.split(' ')[1]);

        // Adjust times relative to timeline start
        let relativeStart = (startMinutes - timelineStart + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        let relativeEnd = (endMinutes - timelineStart + MINUTES_PER_DAY) % MINUTES_PER_DAY;

        // Handle wrap-around at midnight
        if (relativeEnd <= relativeStart) {
            relativeEnd += MINUTES_PER_DAY;
        }

        for (let i = relativeStart; i < relativeEnd; i++) {
            const index = i % totalTimelineMinutes;
            timelineCoverage[index] = true;
        }
    });

    // Calculate covered minutes
    const coveredMinutes = timelineCoverage.filter(covered => covered).length;
    const coveragePercentage = (coveredMinutes / totalTimelineMinutes) * 100;

    if (DEBUG_MODE) {
        console.log(`Timeline coverage: ${coveragePercentage.toFixed(2)}%`);
    }

    return coveredMinutes === totalTimelineMinutes;
}

// Debug utilities
function updateDebugOverlay(mouseX, timelineRect) {
    if (!DEBUG_MODE) return;
    
    const debugOverlay = document.getElementById('debugOverlay');
    if (!debugOverlay) return;

    const positionPercent = ((mouseX - timelineRect.left) / timelineRect.width) * 100;
    const minutes = positionToMinutes(positionPercent);
    const timeStr = minutes !== null ? formatTimeHHMM(minutes) : 'Invalid';
    
    debugOverlay.style.display = 'block';
    debugOverlay.innerHTML = `
        Position: ${Math.round(positionPercent)}%<br>
        Time: ${timeStr}
    `;
}

function hideDebugOverlay() {
    const debugOverlay = document.getElementById('debugOverlay');
    if (debugOverlay) {
        debugOverlay.style.display = 'none';
    }
}

function logDebugInfo(timelineData) {
    if (DEBUG_MODE) {
        console.log('timelineData:', timelineData);
    }
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export all utility functions
export {
    formatTimeDDMMYYYYHHMM,
    formatTimeHHMM,
    timeToMinutes,
    findNearestMarkers,
    minutesToPercentage,
    minutesToPosition,
    positionToMinutes,
    calculateMinimumBlockWidth,
    canPlaceActivity,
    isTimelineFull,
    updateDebugOverlay,
    hideDebugOverlay,
    logDebugInfo,
    generateUniqueId
};
