import { DEBUG_MODE } from './constants.js';

const MINUTES_PER_DAY = 24 * 60;

// Timeline state management functions
export function getCurrentTimelineType() {
    return window.timelineManager.types[window.timelineManager.currentIndex];
}

// Export to both module and window
export function getCurrentTimelineData() {
    const currentType = getCurrentTimelineType();
    return window.timelineManager.activities[currentType] || [];
}

// Make getCurrentTimelineData available globally
window.getCurrentTimelineData = getCurrentTimelineData;

export function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

export function formatTimeDDMMYYYYHHMM(startTime, endTime) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    // Create base dates - everything starts on yesterday by default
    // since our timeline starts at 4:00 AM yesterday
    const startDate = new Date(yesterday);
    const endDate = new Date(yesterday);
    
    // If time is after midnight but before 4 AM, it's today
    if (startHour >= 0 && startHour < 4) {
        startDate.setDate(today.getDate());
    }
    
    if (endHour >= 0 && endHour < 4) {
        endDate.setDate(today.getDate());
    }
    
    // Set hours and minutes
    startDate.setHours(startHour, startMin, 0);
    endDate.setHours(endHour, endMin, 0);
    
    // Format dates to YYYY-MM-DD HH:MM
    const formatDate = (d) => {
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    
    return {
        startTime: formatDate(startDate),
        endTime: formatDate(endDate)
    };
}

export function formatTimeHHMM(minutes) {
    const roundedMinutes = Math.round(minutes);
    const h = Math.floor(roundedMinutes / 60) % 24;
    const m = roundedMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeToMinutes(timeStr) {
    if (typeof timeStr === 'number') {
        return Math.round(timeStr);
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

export function findNearestMarkers(minutes, isMobile = false) {
    const INCREMENT_MINUTES = 10;
    const hourMinutes = Math.floor(minutes / 60) * 60;
    const minutePart = minutes % 60;
    const lowerMarker = hourMinutes + Math.floor(minutePart / INCREMENT_MINUTES) * INCREMENT_MINUTES;
    const upperMarker = hourMinutes + Math.ceil(minutePart / INCREMENT_MINUTES) * INCREMENT_MINUTES;
    return [lowerMarker, upperMarker];
}

export function minutesToPercentage(minutes) {
    const TIMELINE_START_HOUR = 4;
    const TIMELINE_HOURS = 24;
    const MINUTES_PER_DAY = 24 * 60;
    const minutesSince4AM = (minutes - TIMELINE_START_HOUR * 60 + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    return (minutesSince4AM / (TIMELINE_HOURS * 60)) * 100;
}

export function positionToMinutes(positionPercent) {
    const TIMELINE_START_HOUR = 4;
    const TIMELINE_HOURS = 24;
    const MINUTES_PER_DAY = 24 * 60;
    
    if (positionPercent >= 100) {
        return null;
    }
    
    const minutesSinceStart = (positionPercent / 100) * TIMELINE_HOURS * 60;
    let totalMinutes = minutesSinceStart + (TIMELINE_START_HOUR * 60);
    totalMinutes = Math.round(totalMinutes) % MINUTES_PER_DAY;
    
    return totalMinutes;
}

export function calculateMinimumBlockWidth() {
    const INCREMENT_MINUTES = 10;
    const TIMELINE_HOURS = 24;
    return (INCREMENT_MINUTES / (TIMELINE_HOURS * 60)) * 100;
}

export function hasOverlap(startMinutes, endMinutes, excludeBlock = null, timelineTypes, currentTimelineIndex, timelineData) {
    return getCurrentTimelineData(timelineTypes, currentTimelineIndex, timelineData).some(activity => {
        if (excludeBlock && activity === excludeBlock) return false;
        const activityStart = timeToMinutes(activity.startTime.split(' ')[1]);
        const activityEnd = timeToMinutes(activity.endTime.split(' ')[1]);
        return (
            (startMinutes < activityEnd && endMinutes > activityStart) || // Overlap
            (startMinutes >= activityStart && endMinutes <= activityEnd) || // Inside
            (startMinutes <= activityStart && endMinutes >= activityEnd) || // Covers
            (startMinutes < activityEnd && endMinutes > activityStart) // Partial overlap
        );
    });
}

export function canPlaceActivity(newStart, newEnd, excludeId = null) {
    const currentType = getCurrentTimelineType();
    const activities = window.timelineManager.activities[currentType] || [];
    
    if (DEBUG_MODE) {
        console.log('canPlaceActivity check:', {
            currentType,
            newStart,
            newEnd,
            excludeId,
            existingActivities: activities.length
        });
    }
    
    // If there are no activities, placement is always valid
    if (activities.length === 0) {
        if (DEBUG_MODE) console.log('No existing activities, placement allowed');
        return true;
    }

    const canPlace = !activities.some(activity => {
        if (excludeId && activity.id === excludeId) return false;
        const activityStart = timeToMinutes(activity.startTime.split(' ')[1]);
        const activityEnd = timeToMinutes(activity.endTime.split(' ')[1]);
        const overlaps = (newStart < activityEnd && newEnd > activityStart);
        
        if (DEBUG_MODE && overlaps) {
            console.log('Overlap detected:', {
                existingActivity: activity,
                activityStart,
                activityEnd,
                newStart,
                newEnd
            });
        }
        return overlaps;
    });

    if (DEBUG_MODE) {
        console.log('Placement decision:', canPlace);
    }
    
    return canPlace;
}

export function isTimelineFull() {
    const currentData = getCurrentTimelineData();
    if (currentData.length === 0) return false;

    const currentType = getCurrentTimelineType();
    const currentTimeline = window.timelineManager.metadata[currentType];
    const requiredCoverage = parseInt(currentTimeline?.minCoverage) || 0;
    if (requiredCoverage === 0) {
        return false;
    }

    // Get the active timeline element
    const activeTimeline = window.timelineManager.activeTimeline;
    if (!activeTimeline) return false;

    const TIMELINE_START_HOUR = 4;
    const TIMELINE_HOURS = 24;
    const timelineStart = TIMELINE_START_HOUR * 60;
    const totalTimelineMinutes = TIMELINE_HOURS * 60;
    
    const timelineCoverage = new Array(totalTimelineMinutes).fill(false);

    currentData.forEach(activity => {
        // Safely extract time portions
        const startTime = activity.startTime?.split(' ')?.[1] || '00:00';
        const endTime = activity.endTime?.split(' ')?.[1] || '00:00';
        
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        let relativeStart = (startMinutes - timelineStart + MINUTES_PER_DAY) % MINUTES_PER_DAY;
        let relativeEnd = (endMinutes - timelineStart + MINUTES_PER_DAY) % MINUTES_PER_DAY;

        if (relativeEnd <= relativeStart) {
            relativeEnd += MINUTES_PER_DAY;
        }

        for (let i = relativeStart; i < relativeEnd; i++) {
            const index = i % totalTimelineMinutes;
            timelineCoverage[index] = true;
        }
    });

    const coveredMinutes = timelineCoverage.filter(covered => covered).length;
    const coveragePercentage = (coveredMinutes / totalTimelineMinutes) * 100;

    if (DEBUG_MODE) {
        console.log(`Timeline coverage: ${coveragePercentage.toFixed(2)}%`);
    }

    return coveredMinutes === totalTimelineMinutes;
}

export function calculateTimeDifference(startTime, endTime) {
    // Special case: If both times are 4:00, return full day minutes
    if (startTime === '04:00' && endTime === '04:00') {
        return 1440; // 24 hours * 60 minutes
    }

    // Convert both times to minutes since midnight
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // Handle special case for 04:00 to 00:00
    if (startMinutes === 240 && endMinutes === 0) { // 240 = 4:00
        return 1200; // 20 hours = 1200 minutes
    }

    // Calculate difference
    let difference = endMinutes - startMinutes;
    
    // If end time is before start time, add 24 hours worth of minutes
    if (difference <= 0) {
        difference += 1440; // 24 hours * 60 minutes
    }

    return difference;
}

export function isOverlapping(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}
