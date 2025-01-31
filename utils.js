import { DEBUG_MODE, MINUTES_PER_DAY } from './constants.js';

// Timeline state management functions
export function getCurrentTimelineKey() {
    return window.timelineManager.keys[window.timelineManager.currentIndex];
}

// Export to both module and window
export function getCurrentTimelineData() {
    const currentKey = getCurrentTimelineKey();
    return window.timelineManager.activities[currentKey] || [];
}

// Make getCurrentTimelineData available globally
window.getCurrentTimelineData = getCurrentTimelineData;

// UI Functions
function createTimeLabel(block, showImmediately = false) {
    // Check if we're in vertical mode by looking at window width
    const isVerticalMode = window.innerWidth <= 1440;
    
    if (isVerticalMode) {
        // Create activity text container
        const textContainer = document.createElement('div');
        textContainer.className = 'activity-text';
        textContainer.textContent = block.dataset.activityName;
        block.appendChild(textContainer);
        
        // Create time label (hidden by default in vertical mode unless showImmediately is true)
        const label = document.createElement('div');
        label.className = 'time-label';
        label.style.display = showImmediately ? 'block' : 'none';
        block.appendChild(label);
        
        return label;
    } else {
        // Horizontal mode - original implementation
        const label = document.createElement('div');
        label.className = 'time-label';
        label.style.position = 'absolute';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        label.style.color = '#fff';
        label.style.padding = '2px 4px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '10px';
        label.style.whiteSpace = 'nowrap';
        label.style.pointerEvents = 'none';
        label.style.zIndex = '10';
        
        label.style.bottom = '-20px';
        label.style.top = 'auto';
        
        block.appendChild(label);
        
        // Only look for labels within the active timeline
        const existingLabels = block.parentElement.querySelectorAll('.time-label');
        existingLabels.forEach(existingLabel => {
            if (existingLabel !== label && isOverlapping(existingLabel, label)) {
                label.style.bottom = 'auto';
                label.style.top = '-20px';
            }
        });

        return label;
    }
}

function updateTimeLabel(label, startTime, endTime) {
    if (!label || !label.parentElement) return;
    
    // Always read times from parent block's data attributes
    const parentBlock = label.parentElement;
    const blockStartTime = parentBlock.dataset.start;
    const blockEndTime = parentBlock.dataset.end;
    
    if (!blockStartTime || !blockEndTime) {
        console.warn('Parent block missing time data:', parentBlock);
        return;
    }
    
    // Remove (+1) notation for display
    const displayStartTime = blockStartTime.replace('(+1)', '');
    const displayEndTime = blockEndTime.replace('(+1)', '');
    
    // Update label text directly without storing in data attributes
    label.textContent = `${displayStartTime} - ${displayEndTime}`;
    
    const isVerticalMode = window.innerWidth <= 1440;
    
    if (isVerticalMode) {
        // Show the label when updating in vertical mode
        label.style.display = 'block';
    } else {
        // Original horizontal mode behavior
        label.style.bottom = '-20px';
        label.style.top = 'auto';
        
        // Only look for labels within the active timeline
        const existingLabels = label.parentElement.parentElement.querySelectorAll('.time-label');
        existingLabels.forEach(existingLabel => {
            if (existingLabel !== label && isOverlapping(existingLabel, label)) {
                label.style.bottom = 'auto';
                label.style.top = '-20px';
            }
        });
    }
}

export {
    createTimeLabel,
    updateTimeLabel
};

export function generateUniqueId() {
    return Math.random().toString(36).substr(2, 9);
}

export function formatTimeDDMMYYYYHHMM(startTime, endTime) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    // Remove (+1) notation for date processing
    const startTimeOnly = startTime.replace('(+1)', '').trim();
    const endTimeOnly = endTime.replace('(+1)', '').trim();
    
    const [startHour, startMin] = startTimeOnly.split(':').map(Number);
    const [endHour, endMin] = endTimeOnly.split(':').map(Number);
    
    // Create base dates - everything starts on yesterday by default
    // since our timeline starts at 4:00 AM yesterday
    const startDate = new Date(yesterday);
    const endDate = new Date(yesterday);
    
    // If time has (+1) or is between 00:00-03:59, it's next day
    if (startTime.includes('(+1)') || (startHour >= 0 && startHour < 4)) {
        startDate.setDate(today.getDate());
    }
    
    if (endTime.includes('(+1)') || (endHour >= 0 && endHour < 4)) {
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

/**
 * Formats absolute minutes into HH:MM format with (+1) notation for next day times.
 * Uses absolute minutes scale where:
 * - 240 = 04:00 (timeline start)
 * - 1440 = 00:00(+1)
 * - 1680 = 04:00(+1) (timeline end)
 *
 * @param {number} minutes - Absolute minutes (240 = 04:00, 1680 = 04:00(+1))
 * @param {boolean} isEndTime - Whether this time is an end time (affects (+1) notation)
 * @returns {string} Formatted time string (e.g., "04:00", "00:00(+1)", "04:00(+1)")
 */
export function formatTimeHHMM(minutes, isEndTime = false) {
    const totalMinutes = minutes % 1440; // Normalize to 0-1439
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const isNextDay = minutes >= 1440;

    // Special case for exact 24-hour wrap
    const isMidnightWrap = isEndTime && totalMinutes === 240; // 04:00 next day

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}${
        isNextDay || isMidnightWrap ? '(+1)' : ''
    }`;
}

export function timeToMinutes(timeStr) {
    if (typeof timeStr === 'number') return Math.round(timeStr);
    
    const isNextDay = timeStr.includes('(+1)');
    const timeOnly = timeStr.replace('(+1)', '').trim();
    const [hours, minutes] = timeOnly.split(':').map(Number);
    
    // Calculate absolute minutes since midnight
    let totalMinutes = (hours * 60) + minutes;
    
    // Adjust for next day notation
    if (isNextDay) totalMinutes += 1440;
    
    return totalMinutes;
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
    const TIMELINE_START = 240; // 04:00 in minutes
    const TIMELINE_HOURS = 24;
    
    // Normalize minutes to be relative to timeline start (04:00 AM)
    let minutesSinceStart = minutes - TIMELINE_START;
    
    // If the time is before 04:00 AM, adjust it to be after the previous day
    if (minutes < TIMELINE_START) {
        minutesSinceStart += MINUTES_PER_DAY;
    }
    
    // Calculate percentage, ensuring it stays within 0-100 range
    return Math.min(100, Math.max(0, (minutesSinceStart / MINUTES_PER_DAY) * 100));
}

export function positionToMinutes(positionPercent, isMobile = false) {
    const TIMELINE_START = 240; // 4:00 AM in absolute minutes
    const TIMELINE_END = 1680; // 4:00 AM (+1) in absolute minutes
    const VISIBLE_TIMELINE_MINUTES = TIMELINE_END - TIMELINE_START; // 1440 minutes

    // Convert percentage to absolute timeline minutes
    const timelineMinutes = TIMELINE_START + (positionPercent / 100) * VISIBLE_TIMELINE_MINUTES;
    
    // Round to nearest 10 minutes and clamp to timeline bounds
    return Math.min(TIMELINE_END, 
         Math.max(TIMELINE_START, 
         Math.round(timelineMinutes / 10) * 10
    ));
}


export function calculateMinimumBlockWidth() {
    const INCREMENT_MINUTES = 10;
    const TIMELINE_HOURS = 24;
    return (INCREMENT_MINUTES / (TIMELINE_HOURS * 60)) * 100;
}

export function hasOverlap(startMinutes, endMinutes, excludeBlock = null) {
    const currentData = getCurrentTimelineData();
    const MINUTES_IN_DAY = 1440;
    const TIMELINE_START = 240; // 4:00 AM in minutes

    // Normalize minutes to timeline's 4:00 AM start
    function normalizeMinutes(minutes) {
        if (minutes < TIMELINE_START) {
            minutes += MINUTES_IN_DAY;
        }
        return minutes;
    }

    // Normalize the new activity times
    const normalizedStart = normalizeMinutes(startMinutes);
    const normalizedEnd = normalizeMinutes(endMinutes);

    return currentData.some(activity => {
        if (excludeBlock && activity.id === excludeBlock) return false;

        // Convert activity times to minutes since midnight
        const activityStartTime = activity.startTime.split(' ')[1];
        const activityEndTime = activity.endTime.split(' ')[1];
        const [startHour, startMin] = activityStartTime.split(':').map(Number);
        const [endHour, endMin] = activityEndTime.split(':').map(Number);
        
        const activityStartMinutes = normalizeMinutes(startHour * 60 + startMin);
        const activityEndMinutes = normalizeMinutes(endHour * 60 + endMin);

        // Check for overlap considering the normalized timeline
        const hasOverlap = (
            Math.max(normalizedStart, activityStartMinutes) < 
            Math.min(normalizedEnd, activityEndMinutes)
        );

        if (hasOverlap && DEBUG_MODE) {
            console.warn('Overlap detected:', {
                new: { 
                    start: startMinutes, 
                    end: endMinutes,
                    normalizedStart,
                    normalizedEnd 
                },
                existing: { 
                    start: startHour * 60 + startMin,
                    end: endHour * 60 + endMin,
                    normalizedStart: activityStartMinutes,
                    normalizedEnd: activityEndMinutes
                },
                activity: activity.activity
            });
        }

        return hasOverlap;
    });
}

// ... [Other imports and code]

export function canPlaceActivity(newStart, newEnd, excludeId = null) {
    // Get current timeline key and activities
    const currentKey = getCurrentTimelineKey();
    const activities = window.timelineManager.activities[currentKey] || [];
    
    // Normalize minutes to handle day wrap-around
    const MINUTES_IN_DAY = 1440;
    const TIMELINE_START = 240; // 4:00 AM in minutes

    function normalizeMinutes(minutes) {
        if (minutes < TIMELINE_START) {
            minutes += MINUTES_IN_DAY;
        }
        return minutes;
    }

    // Normalize the new activity times
    const normalizedNewStart = normalizeMinutes(newStart);
    const normalizedNewEnd = normalizeMinutes(newEnd);
    
    // Check for overlaps in current timeline only
    const hasOverlap = activities.some(activity => {
        if (excludeId && activity.id === excludeId) return false;

        // Extract and normalize existing activity times
        const [activityStartHour, activityStartMin] = activity.startTime.split(' ')[1].split(':').map(Number);
        const [activityEndHour, activityEndMin] = activity.endTime.split(' ')[1].split(':').map(Number);
        
        const activityStart = activityStartHour * 60 + activityStartMin;
        const activityEnd = activityEndHour * 60 + activityEndMin;
        
        const normalizedActivityStart = normalizeMinutes(activityStart);
        const normalizedActivityEnd = normalizeMinutes(activityEnd);

        // Check for overlap considering normalized times and 10-minute increments
        const overlaps = (
            normalizedNewStart < normalizedActivityEnd &&
            normalizedNewEnd > normalizedActivityStart
        );
        
        if (DEBUG_MODE && overlaps) {
            console.warn('Overlap detected:', {
                existingActivity: activity.activity,
                newTime: `${newStart}-${newEnd}`,
                existingTime: `${activity.startTime}-${activity.endTime}`,
                normalizedTimes: {
                    new: [normalizedNewStart, normalizedNewEnd],
                    existing: [normalizedActivityStart, normalizedActivityEnd]
                }
            });
        }

        return overlaps;
    });
    
    return !hasOverlap;
}


export function isTimelineFull() {
    const currentKey = getCurrentTimelineKey();
    const currentData = getCurrentTimelineData();
    
    // Calculate total covered minutes
    const coveredMinutes = currentData.reduce((total, activity) => {
        const startMinutes = timeToMinutes(activity.startTime.split(' ')[1]);
        const endMinutes = timeToMinutes(activity.endTime.split(' ')[1]);
        return total + (endMinutes - startMinutes);
    }, 0);

    // Get timeline metadata
    const timeline = window.timelineManager.metadata[currentKey];
    if (!timeline) {
        console.error('Timeline metadata not found for key:', currentKey);
        return false;
    }

    // Check if timeline is full based on coverage
    const currentCoverage = (coveredMinutes / MINUTES_PER_DAY) * 100;
    return currentCoverage >= 100;
}

export function calculateTimeDifference(startTime, endTime) {
    // Special case: If start is 4:00 and end is 4:00(+1), it's a full day
    if (startTime === '04:00' && endTime === '04:00(+1)') {
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

export function createTimelineDataFrame() {
    // Initialize array to hold all timeline data
    const dataFrame = [];
    
    // Get all timeline keys
    const timelineKeys = window.timelineManager.keys;
    
    // Get study parameters if they exist
    const studyParams = (window.timelineManager.study && Object.keys(window.timelineManager.study).length > 0) 
        ? window.timelineManager.study 
        : {};
    
    // Iterate through each timeline
    timelineKeys.forEach(timelineKey => {
        const activities = window.timelineManager.activities[timelineKey] || [];
        
        // Add each activity to the dataframe with its timeline key
        activities.forEach(activity => {
            const row = {
                timelineKey: timelineKey,
                activity: activity.activity,
                category: activity.category,
                startTime: activity.startTime,
                endTime: activity.endTime
            };
            
            // Only add study params if they exist
            if(Object.keys(studyParams).length > 0) {
                Object.assign(row, studyParams);
            }
            
            dataFrame.push(row);
        });
    });
    
    return dataFrame;
}

export function sendData() {
    // Get flattened timeline data
    const timelineData = createTimelineDataFrame();
    
    // Get all unique headers from study parameters
    const studyHeaders = Object.keys(window.timelineManager.study || {});
    
    // Combine standard headers with study parameter headers
    const headers = ['timelineKey', 'activity', 'category', 'startTime', 'endTime', ...studyHeaders];
    
    // Process timeline data to ensure activity and category are properly set
    const processedData = timelineData.map(row => {
        // Find the activity block element by ID to get the actual activity data
        const activityBlock = document.querySelector(`.activity-block[data-id="${row.id}"]`);
        if (activityBlock) {
            return {
                ...row,
                activity: activityBlock.querySelector('div').textContent || row.activity,
                category: activityBlock.dataset.category || row.category
            };
        }
        return row;
    });

    const csvContent = [
        headers.join(','),
        ...processedData.map(row => 
            headers.map(header => 
                // Wrap values in quotes and escape existing quotes
                `"${String(row[header] || '').replace(/"/g, '""')}"`
            ).join(',')
        )
    ].join('\n');

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const today = new Date();
    const dateStr = today.toISOString().slice(0,10).replace(/-/g,'');
    link.download = `${dateStr}_timeline_activities.csv`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Data exported as CSV:', timelineData);

    // Check if redirect URL is specified in settings
    fetch('settings/activities.json')
        .then(response => response.json())
        .then(data => {
            const redirectUrl = data.general?.redirect_url;
            if (redirectUrl) {
                // Get current URL parameters
                const currentParams = new URLSearchParams(window.location.search);
                
                // Create URL object from redirect URL to handle both URLs with and without existing parameters
                const finalUrl = new URL(redirectUrl);
                
                // Append all current parameters to the redirect URL
                currentParams.forEach((value, key) => {
                    finalUrl.searchParams.append(key, value);
                });

                // Small delay to ensure file download starts before redirect
                setTimeout(() => {
                    window.location.href = finalUrl.toString();
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Error checking redirect URL:', error);
        });
}

export function validateMinCoverage(coverage) {
    // Convert to number if it's a string
    const numCoverage = parseInt(coverage);
    
    // Check if it's a valid number
    if (isNaN(numCoverage)) {
        throw new Error('min_coverage must be a valid number');
    }
    
    // Check range
    if (numCoverage < 0 || numCoverage > 1440) {
        throw new Error('min_coverage must be between 0 and 1440');
    }
    
    // Check if divisible by 10
    if (numCoverage % 10 !== 0) {
        throw new Error('min_coverage must be divisible by 10');
    }
    
    return numCoverage;
}

export function getTimelineCoverage() {
    const activeTimeline = document.querySelector('.timeline[data-active="true"]');
    if (!activeTimeline) return 0;

    const activityBlocks = activeTimeline.querySelectorAll('.activity-block');
    if (!activityBlocks.length) return 0;

    // Calculate total minutes covered using data-length attributes
    let coveredMinutes = 0;
    const sortedBlocks = [...activityBlocks].sort((a, b) => 
        timeToMinutes(a.dataset.start) - timeToMinutes(b.dataset.start)
    );

    // Track the latest end time seen
    let latestEndTime = 0;

    sortedBlocks.forEach(block => {
        const startMinutes = timeToMinutes(block.dataset.start);
        const endMinutes = timeToMinutes(block.dataset.end);
        let blockLength;
        // Special case: If activity is from 4:00 to 4:00, it's a full day
        if (startMinutes === 240 && endMinutes === 240) { // 240 minutes = 4:00
            blockLength = 1440; // Full day in minutes
        } else if (startMinutes === 240 && endMinutes === 0) {
            // Special case: 04:00 to 00:00 = 20 hours = 1200 minutes
            blockLength = 1200;
        } else {
            // Calculate length using absolute difference
            blockLength = Math.abs(endMinutes - startMinutes);
            if (blockLength === 0) {
                // If start and end times are the same (but not 4:00-4:00)
                blockLength = 0;
            } else if (endMinutes < startMinutes) {
                // If end time is before start time, it spans across midnight
                blockLength = 1440 - blockLength;
            }
        }
        
        // Validate that block length is positive
        if (blockLength < 0) {
            throw new Error(`Invalid negative block length: ${blockLength} minutes. Start: ${startMinutes}, End: ${endMinutes}`);
        }
        
        // Only count non-overlapping portions
        if (startMinutes > latestEndTime) {
            coveredMinutes += blockLength;
        } else if (endMinutes > latestEndTime) {
            coveredMinutes += endMinutes - latestEndTime;
        }
        
        latestEndTime = Math.max(latestEndTime, endMinutes);
    });

    // if (DEBUG_MODE) {
    //     console.log(`Timeline coverage: ${coveredMinutes} minutes covered`);
    // }
    return coveredMinutes;
}

function validateActivityBlockTransformation(startMinutes, endMinutes, target) {
    const MIN_BLOCK_LENGTH = 10;
    const TIMELINE_START = 240; // 4:00 AM in absolute minutes
    const TIMELINE_END = 1680; // 4:00 AM next day in absolute minutes

    // No normalization needed - inputs should already be absolute
    const blockLength = endMinutes - startMinutes;

    // Validate block length
    if (blockLength <= 0 || blockLength < MIN_BLOCK_LENGTH) {
        console.warn('Invalid block length:', {
            startTime: formatTimeHHMM(startMinutes),
            endTime: formatTimeHHMM(endMinutes),
            length: blockLength,
            minLength: MIN_BLOCK_LENGTH
        });
        return false;
    }

    // Validate timeline bounds
    const isStartValid = (startMinutes >= TIMELINE_START && startMinutes <= TIMELINE_END) ||
                        (startMinutes + 1440 >= TIMELINE_START && startMinutes + 1440 <= TIMELINE_END);
    
    const isEndValid = (endMinutes >= TIMELINE_START && endMinutes <= TIMELINE_END) ||
                      (endMinutes + 1440 >= TIMELINE_START && endMinutes + 1440 <= TIMELINE_END);

    if (!isStartValid || !isEndValid) {
        console.warn('Time out of valid range:', {
            startTime: formatTimeHHMM(startMinutes),
            endTime: formatTimeHHMM(endMinutes),
            validRange: '04:00-04:00(+1)'
        });
        return false;
    }

    return true;
}
