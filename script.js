import { TimelineMarker } from './timeline_marker.js';
import { Timeline } from './timeline.js';

let selectedActivity = null;

let timelines = {};
let timelineData = {};
let activeTimeline = null; // Track the active timeline

const MINUTES_PER_DAY = 24 * 60;
const INCREMENT_MINUTES = 10;
const DEFAULT_ACTIVITY_LENGTH = 10;
const TIMELINE_START_HOUR = 4;
const TIMELINE_HOURS = 24;

const DEBUG_MODE = true; // Enable debug mode

// Function to generate unique IDs for activity blocks
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Function to get the current timeline type
function getCurrentTimelineType() {
    return timelineTypes[currentTimelineIndex];
}

// Function to get the current timeline's data array
function getCurrentTimelineData() {
    const currentType = getCurrentTimelineType();
    return timelineData[currentType] || [];
}

let currentTimelineIndex = 0;
const timelineTypes = ['primary', 'secondary', 'tertiary']; // Add more timeline types as needed

// Function to add next timeline
async function addNextTimeline() {
    if (DEBUG_MODE) {
        console.log(`Current timeline data saved:`, timelineData);
        console.log('Current DOM structure before switch:', document.body.innerHTML);
    }

    // Increment timeline index
    currentTimelineIndex++;
    if (currentTimelineIndex >= timelineTypes.length) {
        console.log('All timelines completed');
        return;
    }

    const nextTimelineType = timelineTypes[currentTimelineIndex];

    try {
        // Load next timeline data
        const categories = await fetchActivities(nextTimelineType);
        
        // Update UI for next timeline
        document.querySelector('.timeline-title').textContent = timelines[nextTimelineType].name;
        document.querySelector('.timeline-description').textContent = timelines[nextTimelineType].description;
        document.title = timelines[nextTimelineType].name;

        const isMobile = window.innerWidth < 1024;
        const currentTimelineContainer = document.querySelector('.timeline-container');
        const currentTimeline = currentTimelineContainer.querySelector('.timeline');

        if (isMobile) {
            // In mobile mode, reuse the existing timeline
            currentTimeline.id = 'timeline';
            currentTimeline.setAttribute('data-active', 'true');
            activeTimeline = currentTimeline;
        } else {
            // Desktop mode - handle previous timeline
            currentTimeline.setAttribute('data-active', 'false');
            currentTimelineContainer.setAttribute('data-active', 'false');
            currentTimelineContainer.setAttribute('data-position', 'left');

            // Update timeline IDs and set active state
            currentTimeline.id = 'timeline';
            currentTimeline.setAttribute('data-active', 'true');
            activeTimeline = currentTimeline;
        }

        // Initialize timeline data if not exists
        if (!timelineData[nextTimelineType]) {
            timelineData[nextTimelineType] = [];
        }

        // Render activities for next timeline
        renderActivities(categories);

        // Initialize interaction for the timeline
        initTimelineInteraction(activeTimeline);

        // Reset button states
        updateButtonStates();

        if (DEBUG_MODE) {
            console.log(`Switched to ${nextTimelineType} timeline`);
            console.log('Timeline data structure:', timelineData);
        }

        // Update Back button state
        const backButton = document.getElementById('backBtn');
        if (backButton) {
            backButton.disabled = false;
        }

    } catch (error) {
        console.error(`Error switching to ${nextTimelineType} timeline:`, error);
        throw new Error(`Failed to switch to ${nextTimelineType} timeline: ${error.message}`);
    }
}

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

function findNearestMarkers(minutes, isMobile = false) {
    const hourMinutes = Math.floor(minutes / 60) * 60;
    const minutePart = minutes % 60;
    const lowerMarker = hourMinutes + Math.floor(minutePart / INCREMENT_MINUTES) * INCREMENT_MINUTES;
    const upperMarker = hourMinutes + Math.ceil(minutePart / INCREMENT_MINUTES) * INCREMENT_MINUTES;
    return [lowerMarker, upperMarker];
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

function hasOverlap(startMinutes, endMinutes, excludeBlock = null) {
    return getCurrentTimelineData().some(activity => {
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

function logDebugInfo() {
    if (DEBUG_MODE) {
        console.log('timelineData:', timelineData);
    }
}

async function fetchActivities(type) {
    try {
        const response = await fetch('activities.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data) {
            throw new Error('Invalid JSON structure');
        }

        // Initialize timelines and timelineData for all available timeline types
        if (Object.keys(timelines).length === 0) {
            Object.keys(data).forEach(timelineType => {
                timelines[timelineType] = null;
                timelineData[timelineType] = [];
            });
            if (DEBUG_MODE) {
                console.log('Initialized timeline structures:', {
                    timelines: Object.keys(timelines),
                    timelineData: Object.keys(timelineData)
                });
            }
        }

        if (!data[type]) {
            throw new Error(`Timeline type ${type} not found`);
        }
        
        // Create new Timeline instance with metadata
        timelines[type] = new Timeline(type, data[type]);
        
        if (DEBUG_MODE) {
            console.log(`Loaded timeline metadata for ${type}:`, timelines[type]);
            console.log('All available timelines in activities.json:', Object.keys(data));
            console.log('Full timeline data:', data);
        }
        
        return data[type].categories;
    } catch (error) {
        console.error('Error loading activities:', error);
        throw error;
    }
}

function renderActivities(categories) {
    const container = document.getElementById('activitiesContainer');
    container.innerHTML = '';

    categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'activity-category';

        const categoryTitle = document.createElement('h3');
        categoryTitle.textContent = category.name;
        categoryDiv.appendChild(categoryTitle);

        category.activities.forEach(activity => {
            const activityButton = document.createElement('button');
            activityButton.className = 'activity-button';
            activityButton.style.backgroundColor = activity.color;
            activityButton.textContent = activity.name;
            activityButton.addEventListener('click', () => {
                document.querySelectorAll('.activity-button').forEach(b => b.classList.remove('selected'));
                selectedActivity = {
                    name: activity.name,
                    color: activity.color
                };
                activityButton.classList.add('selected');
            });
            categoryDiv.appendChild(activityButton);
        });

        container.appendChild(categoryDiv);
    });
}

function initTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.setAttribute('data-active', 'true');
    activeTimeline = timeline;
    
    const isMobile = window.innerWidth < 1024;
    timeline.setAttribute('data-layout', isMobile ? 'vertical' : 'horizontal');
    
    // Set fixed dimensions based on layout
    if (isMobile) {
        timeline.style.height = '1500px';
        timeline.style.width = '100%';
        timeline.parentElement.style.height = '1500px';
        timeline.parentElement.style.width = '120px';
    } else {
        timeline.style.height = '';
        timeline.style.width = '100%';
        timeline.parentElement.style.height = '';
        timeline.parentElement.style.width = '100%';
    }
    
    // Create containers
    const markersContainer = document.createElement('div');
    markersContainer.className = 'markers';
    timeline.appendChild(markersContainer);
    
    const hourLabelsContainer = document.createElement('div');
    hourLabelsContainer.className = 'hour-labels';
    timeline.appendChild(hourLabelsContainer);
    
    // Store markers for easy access
    timeline.markers = [];
    
    for (let i = 4; i <= 28; i++) {
        const hour = i % 24;
        // Calculate position as percentage of timeline
        const hourPosition = ((i - 4) / 24) * 100;
        
        // Create hour marker using hourPosition directly
        const hourMarker = new TimelineMarker(
            'hour', 
            hourPosition, 
            `${hour.toString().padStart(2, '0')}:00`
        );
        hourMarker.create(timeline, isMobile);
        timeline.markers.push(hourMarker);

        // Create minute markers
        for (let j = 1; j < 6; j++) {
            const minutePosition = ((i - 4) + j/6) * (100/24);
            if (minutePosition <= 100) {
                const markerType = j === 3 ? 'minute-marker-30' : 'minute';
                const minuteMarker = new TimelineMarker(markerType, minutePosition);
                minuteMarker.create(timeline, isMobile);
                timeline.markers.push(minuteMarker);
            }
        }
    }

    // Add window resize handler to update marker positions
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth < 1024;
        timeline.setAttribute('data-layout', newIsMobile ? 'vertical' : 'horizontal');
        
        // Update dimensions on layout change
        if (newIsMobile) {
            const minHeight = '1500px';
            timeline.style.height = minHeight;
            timeline.style.width = '';
            timeline.parentElement.style.height = minHeight;
            
            // Update hour label container for mobile
            const hourLabelsContainer = timeline.querySelector('.hour-labels');
            if (hourLabelsContainer) {
                hourLabelsContainer.style.height = '100%';
                hourLabelsContainer.style.width = 'auto';
            }
        } else {
            timeline.style.height = '';
            timeline.style.width = '100%';
            timeline.parentElement.style.height = '';
            
            // Update hour label container for desktop
            const hourLabelsContainer = timeline.querySelector('.hour-labels');
            if (hourLabelsContainer) {
                hourLabelsContainer.style.width = '100%';
                hourLabelsContainer.style.height = 'auto';
            }
        }
        
        // Update all markers and their labels
        timeline.markers.forEach(marker => marker.update(newIsMobile));
    });

    if (DEBUG_MODE) {
        timeline.addEventListener('mousemove', (e) => {
            const rect = timeline.getBoundingClientRect();
            updateDebugOverlay(e.clientX, rect);
        });

        timeline.addEventListener('mouseleave', () => {
            hideDebugOverlay();
        });
    }
}

function isOverlapping(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();
    return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
    );
}

function createTimeLabel(block) {
    const isMobile = activeTimeline.getAttribute('data-layout') === 'vertical';
    const label = document.createElement('div');
    label.className = 'time-label';
    label.style.position = 'absolute';
    label.style.left = '50%';
    label.style.transform = isMobile ? 'translateY(-50%)' : 'translateX(-50%)';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    label.style.color = '#fff';
    label.style.padding = '2px 4px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '10px';
    label.style.whiteSpace = 'nowrap';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '10';
    if (isMobile) {
        // Position above activity-block-text in mobile mode
        const textDiv = block.querySelector('.activity-block-text');
        if (textDiv) {
            const textRect = textDiv.getBoundingClientRect();
            const blockRect = block.getBoundingClientRect();
            // In mobile mode, position label to the right of the text
            label.style.left = '120%'; // 20% padding to the right
            label.style.top = '50%';
            label.style.transform = 'translateY(-50%)';
            label.style.bottom = 'auto';
        }
    } else {
        // Keep original positioning for desktop mode
        label.style.bottom = '-20px';
        label.style.top = 'auto';
        
        // Check for overlaps in desktop mode only
        block.appendChild(label);
        const existingLabels = activeTimeline.querySelectorAll('.time-label');
        existingLabels.forEach(existingLabel => {
            if (existingLabel !== label && isOverlapping(existingLabel, label)) {
                label.style.bottom = 'auto';
                label.style.top = '-20px';
            }
        });
    }
    
    block.appendChild(label);
    return label;
}

function updateTimeLabel(label, startTime, endTime, block) {
    const isMobile = activeTimeline.getAttribute('data-layout') === 'vertical';
    
    // Use same format for both layouts
    label.textContent = `${startTime} - ${endTime}`;
    
    if (isMobile) {
        // Position label to the right in mobile mode with text wrapping
        label.style.left = '120%';
        label.style.top = '50%';
        label.style.transform = 'translateY(-50%)';
        label.style.bottom = 'auto';
        label.style.whiteSpace = 'normal';
        label.style.wordWrap = 'break-word';
        label.style.wordBreak = 'break-word';
        label.style.overflowWrap = 'break-word';
        label.style.height = '30px';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
    } else {
        // Desktop mode positioning
        label.style.bottom = '-20px';
        label.style.top = 'auto';
        
        const existingLabels = activeTimeline.querySelectorAll('.time-label');
        existingLabels.forEach(existingLabel => {
            if (existingLabel !== label && isOverlapping(existingLabel, label)) {
                label.style.bottom = 'auto';
                label.style.top = '-20px';
            }
        });
    }
}

function canPlaceActivity(newStart, newEnd, excludeId = null) {
    return !getCurrentTimelineData().some(activity => {
        if (excludeId && activity.id === excludeId) return false;
        const activityStart = timeToMinutes(activity.startTime.split(' ')[1]);
        const activityEnd = timeToMinutes(activity.endTime.split(' ')[1]);
        return (newStart < activityEnd && newEnd > activityStart);
    });
}

function isTimelineFull() {
    const currentData = getCurrentTimelineData();
    if (currentData.length === 0) return false;

    // Get the current timeline's coverage requirement
    const currentType = getCurrentTimelineType();
    const currentTimeline = timelines[currentType];
    if (currentTimeline.coverage !== 'complete') {
        return false; // Partial coverage timelines are never "full"
    }

    // For complete coverage requirement:
    const timelineStart = TIMELINE_START_HOUR * 60; // Start time in minutes
    const totalTimelineMinutes = TIMELINE_HOURS * 60; // Total minutes in the timeline
    
    // Array representing each minute in the timeline
    const timelineCoverage = new Array(totalTimelineMinutes).fill(false);

    // Mark the minutes that are covered by activities
    currentData.forEach(activity => {
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

function initTimelineInteraction(timeline = null) {
    // If no timeline is provided, use the active timeline
    const targetTimeline = timeline || activeTimeline;
    if (!targetTimeline) return;
    
    targetTimeline.addEventListener('click', (e) => {
        // Only process clicks on the active timeline
        if (targetTimeline.getAttribute('data-active') !== 'true') return;
        
        if (!selectedActivity || e.target.closest('.activity-block')) return;
        
        if (isTimelineFull()) {
            alert('Timeline is full. Remove some activities first.');
            return;
        }

        const rect = targetTimeline.getBoundingClientRect();
        const isMobile = targetTimeline.getAttribute('data-layout') === 'vertical';
        let clickPositionPercent;
        
        if (isMobile) {
            const y = e.clientY - rect.top;
            const clampedY = Math.max(0, Math.min(y, rect.height));
            clickPositionPercent = (clampedY / rect.height) * 100;
        } else {
            const x = e.clientX - rect.left;
            const clampedX = Math.max(0, Math.min(x, rect.width));
            clickPositionPercent = (clampedX / rect.width) * 100;
        }
        
        if (clickPositionPercent >= 100) {
            return;
        }

        // Get minutes and find nearest 10-minute markers
        let clickMinutes = positionToMinutes(clickPositionPercent);
        if (clickMinutes === null) {
            return;
        }
        
        const [startMinutes, endMinutes] = findNearestMarkers(clickMinutes, isMobile);

        if (isNaN(startMinutes) || isNaN(endMinutes) || !canPlaceActivity(startMinutes, endMinutes)) {
            alert('Cannot place activity here due to invalid position or overlap with an existing activity.');
            return;
        }

        const currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block';
        currentBlock.style.backgroundColor = selectedActivity.color;
        const textDiv = document.createElement('div');
        textDiv.className = 'activity-block-text';
        textDiv.textContent = selectedActivity.name;
        textDiv.style.maxWidth = '90%';
        textDiv.style.overflow = 'hidden';
        textDiv.style.textOverflow = 'ellipsis';
        textDiv.style.whiteSpace = 'nowrap';
        currentBlock.appendChild(textDiv);
        
        // Convert minutes to percentage for positioning
        const startPositionPercent = minutesToPercentage(startMinutes);
        const endPositionPercent = minutesToPercentage(endMinutes);
        let blockSize = Math.max(endPositionPercent - startPositionPercent, calculateMinimumBlockWidth());
        
        // Ensure fixed size for blocks created between 3:50 and 4:00
        if (startMinutes >= 230 && startMinutes < 240) {
            blockSize = 0.694444;
        }

        // Fixed dimensions for consistency
        const MOBILE_BLOCK_WIDTH = 50; // 50% width in mobile mode
        const DESKTOP_BLOCK_HEIGHT = 50; // 50% height in desktop mode
        const MOBILE_OFFSET = 25; // Centers the block at 25% from left
        const DESKTOP_OFFSET = 25; // Centers the block at 25% from top

        if (isMobile) {
            currentBlock.style.height = `${blockSize}%`;
            currentBlock.style.top = `${startPositionPercent}%`;
            currentBlock.style.width = `${MOBILE_BLOCK_WIDTH}%`;
            currentBlock.style.left = `${MOBILE_OFFSET}%`;
        } else {
            currentBlock.style.width = `${blockSize}%`;
            currentBlock.style.left = `${startPositionPercent}%`;
            currentBlock.style.height = `${DESKTOP_BLOCK_HEIGHT}%`;
            currentBlock.style.top = `${DESKTOP_OFFSET}%`;
        }
        
        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle right';
        currentBlock.appendChild(rightHandle);
        targetTimeline.appendChild(currentBlock);

        // Only create time label initially for desktop mode
        if (!isMobile) {
            const timeLabel = createTimeLabel(currentBlock);
            updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes), currentBlock);
        }

        const activityData = {
            id: generateUniqueId(),
            activity: selectedActivity.name,
            startTime: formatTimeDDMMYYYYHHMM(startMinutes),
            endTime: formatTimeDDMMYYYYHHMM(endMinutes),
            color: selectedActivity.color
        };
        getCurrentTimelineData().push(activityData);
        currentBlock.dataset.id = activityData.id;

        updateButtonStates();

        interact(currentBlock)
            .resizable({
                edges: isMobile ? { bottom: true } : { right: true },
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent',
                        endOnly: true
                    }),
                    interact.modifiers.restrictSize({
                        min: isMobile 
                            ? { height: calculateMinimumBlockWidth() * targetTimeline.offsetHeight / 100 }
                            : { width: calculateMinimumBlockWidth() * targetTimeline.offsetWidth / 100 },
                        max: isMobile 
                            ? { height: targetTimeline.offsetHeight }
                            : { width: targetTimeline.offsetWidth }
                    })
                ],
                listeners: {
                    start(event) {
                        event.target.classList.add('resizing');
                        // Create time label for mobile on resize start if it doesn't exist
                        const isMobile = targetTimeline.getAttribute('data-layout') === 'vertical';
                        if (isMobile && !event.target.querySelector('.time-label')) {
                            const startMinutes = Math.round((parseFloat(event.target.style.top) / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const heightPercent = parseFloat(event.target.style.height);
                            const heightInMinutes = (heightPercent / 100) * TIMELINE_HOURS * 60;
                            const endMinutes = Math.round(startMinutes + heightInMinutes);
                            const timeLabel = createTimeLabel(event.target);
                            updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes), event.target);
                        }
                    },
                    move(event) {
                        const target = event.target;
                        
                        if (isMobile) {
                            const timelineHeight = targetTimeline.offsetHeight;
                            let heightPercent = (event.rect.height / timelineHeight) * 100;
                            const topPercent = parseFloat(target.style.top);
                            
                            // Enforce minimum height
                            heightPercent = Math.max(heightPercent, calculateMinimumBlockWidth());
                            
                            // Prevent resizing past the bottom edge
                            if (topPercent + heightPercent > 100) {
                                heightPercent = 100 - topPercent;
                            }
                            
                            const heightInMinutes = (heightPercent / 100) * TIMELINE_HOURS * 60;
                            const roundedHeightMinutes = Math.round(heightInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                            heightPercent = (roundedHeightMinutes / (TIMELINE_HOURS * 60)) * 100;
                            
                            const newStartMinutes = Math.round((topPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const newEndMinutes = Math.round(newStartMinutes + roundedHeightMinutes);
                            
                            const blockId = target.dataset.id;
                            if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                                return;
                            }

                            target.style.height = `${heightPercent}%`;
                            
                            // Check if block height is at least 6x the 10-minute interval
                            const textElement = target.querySelector('.activity-block-text');
                            if (textElement) {
                                if (heightPercent >= 4.166667) {
                                    textElement.classList.add('resized');
                                } else {
                                    textElement.classList.remove('resized');
                                }
                            }
                            
                            const timeLabel = target.querySelector('.time-label');
                            if (timeLabel) {
                                updateTimeLabel(timeLabel, formatTimeHHMM(newStartMinutes), formatTimeHHMM(newEndMinutes), target);
                            }
                        } else {
                            const timelineWidth = targetTimeline.offsetWidth;
                            let widthPercent = (event.rect.width / timelineWidth) * 100;
                            const leftPercent = parseFloat(target.style.left);
                            
                            widthPercent = Math.max(widthPercent, calculateMinimumBlockWidth());
                            
                            if (leftPercent + widthPercent > 100) {
                                widthPercent = 100 - leftPercent;
                            }
                            
                            const widthInMinutes = (widthPercent / 100) * TIMELINE_HOURS * 60;
                            const roundedWidthMinutes = Math.round(widthInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                            widthPercent = (roundedWidthMinutes / (TIMELINE_HOURS * 60)) * 100;
                            
                            const newStartMinutes = Math.round((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const newEndMinutes = Math.round(newStartMinutes + roundedWidthMinutes);
                            
                            const blockId = target.dataset.id;
                            if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                                return;
                            }

                            target.style.width = `${widthPercent}%`;
                            
                            // Check if block width is at least 6x the 10-minute interval
                            const textElement = target.querySelector('.activity-block-text');
                            if (textElement) {
                                if (widthPercent >= 4.166667) {
                                    textElement.classList.add('resized');
                                } else {
                                    textElement.classList.remove('resized');
                                }
                            }
                            
                            const timeLabel = target.querySelector('.time-label');
                            if (timeLabel) {
                                updateTimeLabel(timeLabel, formatTimeHHMM(newStartMinutes), formatTimeHHMM(newEndMinutes));
                            }
                        }
                    },
                    end(event) {
                        event.target.classList.remove('resizing');
                        const blockId = event.target.dataset.id;
                        const blockData = getCurrentTimelineData().find(activity => activity.id === blockId);
                        if (blockData) {
                            const isMobile = targetTimeline.getAttribute('data-layout') === 'vertical';
                            let newStartMinutes, newEndMinutes;
                            
                            if (isMobile) {
                                const topPercent = parseFloat(event.target.style.top);
                                const heightPercent = parseFloat(event.target.style.height);
                                newStartMinutes = Math.round((topPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                                const heightInMinutes = (heightPercent / 100) * TIMELINE_HOURS * 60;
                                const roundedHeightMinutes = Math.round(heightInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                                newEndMinutes = Math.round(newStartMinutes + roundedHeightMinutes);
                            } else {
                                const leftPercent = parseFloat(event.target.style.left);
                                const widthPercent = parseFloat(event.target.style.width);
                                newStartMinutes = Math.round((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                                const widthInMinutes = (widthPercent / 100) * TIMELINE_HOURS * 60;
                                const roundedWidthMinutes = Math.round(widthInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                                newEndMinutes = Math.round(newStartMinutes + roundedWidthMinutes);
                            }
                            
                            blockData.startTime = formatTimeDDMMYYYYHHMM(newStartMinutes);
                            blockData.endTime = formatTimeDDMMYYYYHHMM(newEndMinutes);
                            
                            updateButtonStates();
                        }
                    }
                }
            });
    });
}

function updateButtonStates() {
    const undoButton = document.getElementById('undoBtn');
    const cleanRowButton = document.getElementById('cleanRowBtn');
    const saveButton = document.getElementById('saveBtn');
    const nextButton = document.getElementById('nextBtn');
    
    const currentData = getCurrentTimelineData();
    const isEmpty = currentData.length === 0;
    const isFull = isTimelineFull();
    
    if (undoButton) undoButton.disabled = isEmpty;
    if (cleanRowButton) cleanRowButton.disabled = isEmpty;
    if (saveButton) saveButton.disabled = isEmpty;
    
    // Enable Next button based on timeline coverage requirement
    const currentType = getCurrentTimelineType();
    const currentTimeline = timelines[currentType];
    const requiresComplete = currentTimeline?.coverage === 'complete';
    if (nextButton) nextButton.disabled = requiresComplete && !isFull;
    
    if (DEBUG_MODE && isFull) {
        console.log('Timeline is complete');
    }
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        const currentData = getCurrentTimelineData();
        if (currentData.length > 0) {
            const activityBlocks = activeTimeline.querySelectorAll('.activity-block');
            activityBlocks.forEach(block => block.remove());

            if (isSecondaryMode) {
                timelineData.secondary = [];
            } else {
                timelineData.primary = [];
            }

            updateButtonStates();

            if (DEBUG_MODE) {
                console.log('Timeline data after clean:', timelineData);
            }
        }
    });

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', () => {
        const jsonData = {
            primary: timelineData.primary,
            secondary: timelineData.secondary
        };

        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timeline_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('undoBtn').addEventListener('click', () => {
        const currentData = getCurrentTimelineData();
        if (currentData.length > 0) {
            if (DEBUG_MODE) {
                console.log('Before undo - timelineData:', timelineData);
            }

            const lastActivity = currentData.pop();
            
            if (DEBUG_MODE) {
                console.log('Removing activity:', lastActivity);
            }

            const blocks = activeTimeline.querySelectorAll('.activity-block');
            
            if (DEBUG_MODE) {
                blocks.forEach(block => {
                    console.log('Block id:', block.dataset.id, 'Last activity id:', lastActivity.id);
                });
            }

            blocks.forEach(block => {
                if (block.dataset.id === lastActivity.id) {
                    if (DEBUG_MODE) {
                        console.log('Removing block with id:', lastActivity.id);
                    }
                    block.remove();
                }
            });

            updateButtonStates();
            
            if (DEBUG_MODE) {
                console.log('Final timelineData:', timelineData);
            }
        }
    });

    // Add click handler for Next button
    document.getElementById('nextBtn').addEventListener('click', () => {
        // Try to add next timeline
        addNextTimeline();
    });
}

function handleResize() {
    const timeline = document.getElementById('timeline');
    const container = timeline.parentElement;
    const markersContainer = timeline.querySelector('.markers');
    const isMobile = window.innerWidth < 1024;
    
    // Update layout attribute
    timeline.setAttribute('data-layout', isMobile ? 'vertical' : 'horizontal');
    
    // Set dimensions based on layout
    if (isMobile) {
        const minHeight = '1500px';
        // Set explicit dimensions for all elements
        container.style.minWidth = '180px';
        container.style.height = minHeight;
        
        timeline.style.width = 'inherit';
        timeline.style.height = minHeight;
        
        markersContainer.style.width = '100%';
        markersContainer.style.height = minHeight;
    } else {
        // Reset to horizontal layout
        container.style.width = '100%';
        container.style.height = '120px';
        
        timeline.style.width = '100%';
        timeline.style.height = '100%';
        
        markersContainer.style.width = '100%';
        markersContainer.style.height = '100%';
    }
    
    // Update all markers for the new layout
    timeline.markers.forEach(marker => marker.update(isMobile));
    
    // Update all activity blocks for the new layout
    const activityBlocks = timeline.querySelectorAll('.activity-block');
    activityBlocks.forEach(block => {
        const timeLabel = block.querySelector('.time-label');
        if (timeLabel) {
            if (isMobile) {
                timeLabel.style.left = '120%';
                timeLabel.style.top = '50%';
                timeLabel.style.transform = 'translateY(-50%)';
                timeLabel.style.bottom = 'auto';
            } else {
                timeLabel.style.left = '50%';
                timeLabel.style.transform = 'translateX(-50%)';
                timeLabel.style.bottom = '-20px';
                timeLabel.style.top = 'auto';
            }
        }
    });
}

async function init() {
    try {
        initTimeline();
        initTimelineInteraction();
        updateButtonStates();
        const categories = await fetchActivities('primary');
        // Set initial title and description
        document.querySelector('.timeline-title').textContent = timelines.primary.name;
        document.querySelector('.timeline-description').textContent = timelines.primary.description;
        document.title = timelines.primary.name;
        renderActivities(categories);
        initButtons();
        updateButtonStates();
        
        // Add resize event listener
        window.addEventListener('resize', handleResize);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('activitiesContainer').innerHTML = 
            '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
    }
}

init().catch(error => {
    console.error('Failed to initialize application:', error);
    document.getElementById('activitiesContainer').innerHTML = 
        '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
});
