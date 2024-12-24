import { TimelineMarker } from './timeline_marker.js';
import { Timeline } from './timeline.js';
import { TimelineContainer } from './timeline_container.js';
import { getCurrentTimelineData, getCurrentTimelineType } from './utils.js';
import { updateIsMobile, getIsMobile } from './globals.js';
let selectedActivity = null;

// Single timeline management object
window.timelineManager = {
    metadata: {}, // Timeline metadata (former timelines object)
    activities: {}, // Timeline activities (former timelineData object)
    initialized: new Set(), // Tracks initialized timelines
    activeTimeline: document.getElementById('primary'), // Initialize with primary timeline
    types: [], // Available timeline types
    currentIndex: 0 // Current timeline index
};

// Function to calculate timeline coverage in minutes
window.getTimelineCoverage = () => {
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

    console.log(`Timeline coverage: ${coveredMinutes} minutes covered`);
    return coveredMinutes;
};

const MINUTES_PER_DAY = 24 * 60;
const INCREMENT_MINUTES = 10;
const DEFAULT_ACTIVITY_LENGTH = 10;
const TIMELINE_START_HOUR = 4;
const TIMELINE_HOURS = 24;

const DEBUG_MODE = true; // Enable debug mode
import { 
    formatTimeDDMMYYYYHHMM,
    formatTimeHHMM,
    timeToMinutes,
    findNearestMarkers,
    minutesToPercentage,
    positionToMinutes,
    calculateMinimumBlockWidth,
    hasOverlap,
    canPlaceActivity,
    isTimelineFull,
    isOverlapping,
    generateUniqueId
} from './utils.js';


// Function to add next timeline
async function addNextTimeline() {
    if (DEBUG_MODE) {
        console.log(`Current timeline data saved:`, window.timelineManager.activities);
    }

    // Increment timeline index
    window.timelineManager.currentIndex++;
    if (window.timelineManager.currentIndex >= window.timelineManager.types.length) {
        console.log('All timelines completed');
        return;
    }

    const nextTimelineType = window.timelineManager.types[window.timelineManager.currentIndex];

    try {
        // Load next timeline data
        const categories = await fetchActivities(nextTimelineType);
        
        // Update UI for next timeline and set it as active
        const nextTimeline = window.timelineManager.metadata[nextTimelineType];
        document.querySelector('.timeline-title').textContent = nextTimeline.name;
        document.querySelector('.timeline-description').textContent = nextTimeline.description;
        document.title = nextTimeline.name;

        const isMobile = getIsMobile();
        const currentTimelineContainer = document.querySelector('.timeline-container');
        const currentTimeline = currentTimelineContainer.querySelector('.timeline');

        if (isMobile) {
            // In mobile mode, reuse the existing timeline
            currentTimeline.id = 'timeline';
            currentTimeline.setAttribute('data-active', 'true');
            activeTimeline = currentTimeline;
        } else {
            // Desktop mode - create new timeline container
            const newTimelineContainer = document.createElement('div');
            newTimelineContainer.className = 'timeline-container';
            const newTimeline = document.createElement('div');
            newTimeline.className = 'timeline';
            newTimelineContainer.appendChild(newTimeline);
            
            // Add new timeline below current one
            const timelinesWrapper = document.querySelector('.timelines-wrapper');
            timelinesWrapper.appendChild(newTimelineContainer);
            
            // Update previous timeline state
            currentTimeline.setAttribute('data-active', 'false');
            currentTimelineContainer.setAttribute('data-active', 'false');
            
            // Initialize new timeline and container with proper IDs
            newTimeline.id = nextTimelineType;
            newTimeline.setAttribute('data-timeline-type', nextTimelineType);
            newTimeline.setAttribute('data-active', 'true');
            newTimelineContainer.setAttribute('data-active', 'true');
            
            // Create and initialize timeline container with markers
            const timelineContainer = new TimelineContainer(newTimeline);
            timelineContainer.initialize(isMobile).createMarkers(isMobile);
            newTimeline.containerInstance = timelineContainer;
            
            // Set active timeline reference and initialize interaction
            window.timelineManager.activeTimeline = newTimeline;
            initTimelineInteraction(newTimeline);
        }

        // Initialize activities array if not exists
        if (!window.timelineManager.activities[nextTimelineType]) {
            window.timelineManager.activities[nextTimelineType] = [];
        }

        // Render activities for next timeline
        renderActivities(categories);

        // Initialize markers for the new timeline
        initTimeline();
        
        // Initialize interaction for the timeline
        initTimelineInteraction(window.timelineManager.activeTimeline);

        // Reset button states
        updateButtonStates();

        // If this was the last timeline, call sendData (empty for now)
        const isLastTimeline = window.timelineManager.currentIndex === window.timelineManager.types.length - 1;
        if (isLastTimeline) {
            sendData();
        }
        
        // Scroll new timeline into view
        window.timelineManager.activeTimeline.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (DEBUG_MODE) {
            console.log(`Switched to ${nextTimelineType} timeline`);
            console.log('Timeline data structure:', window.timelineManager.activities);
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

function validateMinCoverage(coverage) {
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
        
        // Validate min_coverage
        if (data[type]) {
            try {
                validateMinCoverage(data[type].min_coverage);
            } catch (error) {
                const errorMessage = `Timeline "${type}": ${error.message}`;
                document.getElementById('activitiesContainer').innerHTML = 
                    `<p style="color: red; padding: 10px; background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px;">
                        ${errorMessage}
                    </p>`;
                throw new Error(errorMessage);
            }
        }

        // Initialize timeline management structure
        if (Object.keys(timelineManager.metadata).length === 0) {
            timelineManager.types = Object.keys(data);
            timelineManager.types.forEach(timelineType => {
                timelineManager.metadata[timelineType] = new Timeline(timelineType, data[timelineType]);
                timelineManager.activities[timelineType] = [];
                // Set isActive true only for first timeline, false for others
                timelineManager.metadata[timelineType].isActive = timelineType === 'primary';
            });
            if (DEBUG_MODE) {
                console.log('Initialized timeline structure:', timelineManager);
            }
        }

        if (!data[type]) {
            throw new Error(`Timeline type ${type} not found`);
        }
        
        // Mark timeline as initialized
        window.timelineManager.initialized.add(type);
        
        if (DEBUG_MODE) {
            console.log(`Loaded timeline metadata for ${type}:`, window.timelineManager.metadata[type]);
            console.log('All available timelines in activities.json:', Object.keys(data));
            console.log('Full timeline data:', data);
            console.log('Initialized timelines:', Array.from(window.timelineManager.initialized));
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
    const timeline = window.timelineManager.activeTimeline;
    timeline.setAttribute('data-active', 'true');
    timeline.setAttribute('data-layout', getIsMobile() ? 'vertical' : 'horizontal');
    
    // Create and initialize timeline container
    const timelineContainer = new TimelineContainer(timeline);
    timelineContainer.initialize(getIsMobile()).createMarkers(getIsMobile());
    
    // Store the container instance on the timeline element for later access
    timeline.containerInstance = timelineContainer;

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

function createTimeLabel(block) {
    const isMobile = window.timelineManager.activeTimeline.getAttribute('data-layout') === 'vertical';
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
        const timeline = window.timelineManager.activeTimeline;
        const existingLabels = timeline.querySelectorAll('.time-label');
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
    const isMobile = window.timelineManager.activeTimeline.getAttribute('data-layout') === 'vertical';
    
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
        
        const timeline = window.timelineManager.activeTimeline;
        const existingLabels = timeline.querySelectorAll('.time-label');
        existingLabels.forEach(existingLabel => {
            if (existingLabel !== label && isOverlapping(existingLabel, label)) {
                label.style.bottom = 'auto';
                label.style.top = '-20px';
            }
        });
    }
}

function initTimelineInteraction(timeline = null) {
    // If no timeline is provided, use the active timeline from timelineManager
    const targetTimeline = timeline || window.timelineManager.activeTimeline;
    if (!targetTimeline) return;
    
    // Initialize interact.js resizable
    interact('.activity-block').resizable({
        edges: { right: true },
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: '.timeline'
            }),
            interact.modifiers.restrictSize({
                min: { width: 10 }
            })
        ],
        listeners: {
            start(event) {
                event.target.classList.add('resizing');
            },
            move(event) {
                const target = event.target;
                const timelineRect = targetTimeline.getBoundingClientRect();
                
                // Only apply resizing in desktop layout
                if (window.innerWidth >= 1024) {
                    // Calculate current width in percentage
                    let newWidth = (event.rect.width / timelineRect.width) * 100;
                    
                    // Calculate the width of 10 minutes in percentage
                    const tenMinutesWidth = (10 / (24 * 60)) * 100;
                    
                    // Calculate how many 10-minute intervals fit in the current width
                    const intervals = Math.round(newWidth / tenMinutesWidth);
                    
                    // Snap to nearest 10-minute interval
                    newWidth = intervals * tenMinutesWidth;
                    
                    // Apply minimum and maximum constraints
                    newWidth = Math.max(tenMinutesWidth, Math.min(newWidth, 100));
                    
                    // Check for overlap at new width
                    const startTime = target.dataset.start;
                    const startMinutes = timeToMinutes(startTime);
                    const endMinutes = positionToMinutes((parseFloat(target.style.left) + newWidth));
                    
                    if (!canPlaceActivity(startMinutes, endMinutes, target.dataset.id)) {
                        target.classList.add('invalid');
                        setTimeout(() => target.classList.remove('invalid'), 400);
                        return;
                    }
                    
                    // Update block width if no overlap
                    target.style.width = `${newWidth}%`;
                    
                    // Update time label
                    const timeLabel = target.querySelector('.time-label');
                    if (timeLabel) {
                        const startTime = target.dataset.start;
                        const startMinutes = timeToMinutes(startTime);
                        let endMinutes = positionToMinutes((parseFloat(target.style.left) + newWidth));
                            
                        // If the position is at the end of timeline (100%), set to 04:00
                        if (parseFloat(target.style.left) + newWidth >= 100) {
                            endMinutes = 240; // 04:00 in minutes
                        }
                        const endTime = formatTimeHHMM(endMinutes);
                        updateTimeLabel(timeLabel, startTime, endTime, target);
                                
                        // Update the end time and length in the dataset using calculateTimeDifference
                        target.dataset.end = endTime;
                        const newLength = calculateTimeDifference(startTime, endTime);
                        target.dataset.length = newLength;
                        
                        // Update text class based on new length
                        const textDiv = target.querySelector('div[class^="activity-block-text"]');
                        if (textDiv) {
                            textDiv.className = newLength >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow';
                        }
                        
                        // Update the activity data in timelineManager
                        const activityId = target.dataset.id;
                        const currentData = getCurrentTimelineData();
                        const activityIndex = currentData.findIndex(activity => activity.id === activityId);
                        
                        if (activityIndex !== -1) {
                            const times = formatTimeDDMMYYYYHHMM(formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes));
                            if (!times.startTime || !times.endTime) {
                                throw new Error('Activity start time and end time must be defined');
                            }
                            currentData[activityIndex].startTime = times.startTime;
                            currentData[activityIndex].endTime = times.endTime;
                            currentData[activityIndex].blockLength = parseInt(target.dataset.length);
                            if (DEBUG_MODE) {
                                console.log('Updated activity data:', currentData[activityIndex]);
                            }
                        }
                    }
                }
            },
            end(event) {
                event.target.classList.remove('resizing');
                const textDiv = event.target.querySelector('div[class^="activity-block-text"]');
                if (textDiv) {
                    // Get the current length from the block's dataset
                    const length = parseInt(event.target.dataset.length);
                    // Update classes based on length
                    textDiv.className = length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow';
                }
                updateButtonStates();
            }
        }
    });
    
    // Add click handling with debounce
    let lastClickTime = 0;
    const CLICK_DELAY = 300; // milliseconds

    targetTimeline.addEventListener('click', (e) => {
        // Only process clicks on the active timeline
        if (!targetTimeline || targetTimeline !== window.timelineManager.activeTimeline) return;
        
        // Prevent double-clicks
        const currentTime = new Date().getTime();
        if (currentTime - lastClickTime < CLICK_DELAY) return;
        lastClickTime = currentTime;

        if (!selectedActivity || e.target.closest('.activity-block')) return;
        
        const currentType = getCurrentTimelineType();
        // Check if timeline is full before proceeding
        if (isTimelineFull()) {
            const block = document.createElement('div');
            block.className = 'activity-block invalid';
            setTimeout(() => block.remove(), 400); // Remove after animation
            return;
        }
        
        // Ensure we're working with the current timeline data
        window.timelineManager.activities[currentType] = getCurrentTimelineData();

        const rect = targetTimeline.getBoundingClientRect();
        const isMobile = getIsMobile();
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

        if (isNaN(startMinutes) || isNaN(endMinutes)) {
            console.error('Invalid minutes calculation:', { startMinutes, endMinutes });
            alert('Cannot place activity here due to invalid position.');
            return;
        }
        
        // Check if activity can be placed at this position
        if (!canPlaceActivity(startMinutes, endMinutes, null)) {
            console.error('Activity placement blocked:', { startMinutes, endMinutes });
            const block = document.createElement('div');
            block.className = 'activity-block invalid';
            block.style.backgroundColor = selectedActivity.color;
            
            // Calculate position percentages
            const startPositionPercent = minutesToPercentage(startMinutes);
            const blockSize = (10 / 1440) * 100;  // 10 minutes as percentage of day
            
            if (isMobile) {
                block.style.height = `${blockSize}%`;
                block.style.top = `${startPositionPercent}%`;
                block.style.width = '50%';
                block.style.left = '25%';
            } else {
                block.style.width = `${blockSize}%`;
                block.style.left = `${startPositionPercent}%`;
                block.style.height = '50%';
                block.style.top = '25%';
            }
            
            targetTimeline.appendChild(block);
            setTimeout(() => block.remove(), 400); // Remove after animation
            return;
        }

        const currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block';
        currentBlock.dataset.start = formatTimeHHMM(startMinutes);
        currentBlock.dataset.end = formatTimeHHMM(endMinutes);
        currentBlock.dataset.length = endMinutes - startMinutes;
        currentBlock.style.backgroundColor = selectedActivity.color;
        const textDiv = document.createElement('div');
        textDiv.textContent = selectedActivity.name;
        textDiv.style.maxWidth = '90%';
        textDiv.style.overflow = 'hidden';
        textDiv.style.textOverflow = 'ellipsis';
        textDiv.style.whiteSpace = 'nowrap';
        // Set initial class based on length
        const length = parseInt(currentBlock.dataset.length);
        textDiv.className = length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow';
        currentBlock.appendChild(textDiv);
        
        // Convert minutes to percentage for positioning
        const startPositionPercent = minutesToPercentage(startMinutes);
        const endPositionPercent = minutesToPercentage(endMinutes);
        // Set block size to exactly 10/1440 percentage (10 minutes out of 24 hours)
        let blockSize = (10 / 1440) * 100;  // This equals approximately 0.694444%
        
        // Ensure minimum block width is maintained
        blockSize = Math.max(blockSize, calculateMinimumBlockWidth());
        
        // Adjust end time to match the block size
        const adjustedEndMinutes = startMinutes + 10;
        currentBlock.dataset.end = formatTimeHHMM(adjustedEndMinutes);

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
        
        const activitiesContainer = window.timelineManager.activeTimeline.querySelector('.activities') || (() => {
            const container = document.createElement('div');
            container.className = 'activities';
            window.timelineManager.activeTimeline.appendChild(container);
            return container;
        })();
        activitiesContainer.appendChild(currentBlock);

        // Only create time label initially for desktop mode
        if (!isMobile) {
            const timeLabel = createTimeLabel(currentBlock);
            updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes), currentBlock);
        }

        const startTime = currentBlock.dataset.start;
        const endTime = currentBlock.dataset.end;
        const times = formatTimeDDMMYYYYHHMM(startTime, endTime);
        if (!times.startTime || !times.endTime) {
            throw new Error('Activity start time and end time must be defined');
        }
        const activityData = {
            id: generateUniqueId(),
            activity: selectedActivity.name,
            startTime: times.startTime,
            endTime: times.endTime,
            blockLength: parseInt(currentBlock.dataset.length),
            color: selectedActivity.color
        };
        getCurrentTimelineData().push(activityData);
        currentBlock.dataset.id = activityData.id;

        updateButtonStates();


    });
}

function sendData() {
    // TODO: Implement data sending functionality
    console.log('Sending data...', window.timelineManager.activities);
}

function updateButtonStates() {
    const undoButton = document.getElementById('undoBtn');
    const cleanRowButton = document.getElementById('cleanRowBtn');
    const nextButton = document.getElementById('nextBtn');
    
    const currentData = getCurrentTimelineData();
    const isEmpty = currentData.length === 0;
    const isFull = isTimelineFull();
    
    if (undoButton) undoButton.disabled = isEmpty;
    if (cleanRowButton) cleanRowButton.disabled = isEmpty;
    
    // Get current timeline coverage
    const currentType = getCurrentTimelineType();
    const currentTimeline = window.timelineManager.metadata[currentType];
    const requiredCoverage = parseInt(currentTimeline?.minCoverage) || 0;
    const currentCoverage = window.getTimelineCoverage();
    
    // Check if we have sufficient coverage and a next timeline to go to
    const hasSufficientCoverage = currentCoverage >= requiredCoverage;
    const hasNextTimeline = window.timelineManager.currentIndex < window.timelineManager.types.length - 1;
    const nextTimelineType = hasNextTimeline ? window.timelineManager.types[window.timelineManager.currentIndex + 1] : null;
    const nextTimelineNeedsInit = nextTimelineType && !window.timelineManager.initialized.has(nextTimelineType);
    
    if (nextButton) {
        // Enable next button if:
        // 1. Current coverage meets or exceeds required coverage
        // 2. There is a next timeline available that needs initialization
        nextButton.disabled = !hasSufficientCoverage || !hasNextTimeline || !nextTimelineNeedsInit;
    }
    
    if (DEBUG_MODE) {
        console.log('Button state update:', {
            currentType,
            requiredCoverage,
            currentCoverage,
            hasSufficientCoverage,
            hasNextTimeline,
            nextTimelineType,
            nextTimelineNeedsInit,
            initializedTimelines: Array.from(window.timelineManager.initialized)
        });
    }
    
    if (DEBUG_MODE && isFull) {
        console.log('Timeline is complete');
    }
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        const currentType = getCurrentTimelineType();
        const currentData = getCurrentTimelineData();
        if (currentData.length > 0) {
            const activityBlocks = window.timelineManager.activeTimeline.querySelectorAll('.activity-block');
            activityBlocks.forEach(block => block.remove());

            // Update timeline manager activities
            window.timelineManager.activities[currentType] = [];
                
            updateButtonStates();

            if (DEBUG_MODE) {
                console.log('Timeline data after clean:', window.timelineManager.activities);
            }
        }
    });


    document.getElementById('undoBtn').addEventListener('click', () => {
        const currentType = getCurrentTimelineType();
        const currentData = getCurrentTimelineData();
        if (currentData.length > 0) {
            if (DEBUG_MODE) {
                console.log('Before undo - timelineData:', window.timelineManager.activities);
            }

            const lastActivity = currentData.pop();
            // Update timeline manager activities
            window.timelineManager.activities[currentType] = currentData;
            
            if (DEBUG_MODE) {
                console.log('Removing activity:', lastActivity);
            }

            const timeline = window.timelineManager.activeTimeline;
            const blocks = timeline.querySelectorAll('.activity-block');
            
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
                console.log('Final timelineData:', window.timelineManager.activities);
            }
        }
    });

    // Add click handler for Next button
    document.getElementById('nextBtn').addEventListener('click', () => {
        const nextTimelineType = window.timelineManager.types[window.timelineManager.currentIndex + 1];
        if (nextTimelineType && !window.timelineManager.initialized.has(nextTimelineType)) {
            addNextTimeline();
        } else {
            console.log('No more timelines to initialize');
            nextBtn.disabled = true;
        }
    });
}

function handleResize() {
    const timeline = document.getElementById('timeline');
    const wasVertical = getIsMobile();
    const layoutChanged = wasVertical !== updateIsMobile();
    
    // Update layout attribute
    timeline.setAttribute('data-layout', getIsMobile() ? 'vertical' : 'horizontal');
    
    // Update container layout using the stored container instance
    timeline.containerInstance.updateLayout(getIsMobile());
    
    // Update all activity blocks for the new layout
    const activityBlocks = timeline.querySelectorAll('.activity-block');
    activityBlocks.forEach(block => {
        const timeLabel = block.querySelector('.time-label');
        if (timeLabel) {
            if (getIsMobile()) {
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
        // Disable all buttons initially
        const buttons = ['undoBtn', 'cleanRowBtn', 'nextBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.disabled = true;
        });

        console.log('isMobile value during init:', getIsMobile());
        initTimeline();
        initTimelineInteraction();
        const categories = await fetchActivities('primary');
        // Set initial title and description
        document.querySelector('.timeline-title').textContent = window.timelineManager.metadata.primary.name;
        document.querySelector('.timeline-description').textContent = window.timelineManager.metadata.primary.description;
        document.title = window.timelineManager.metadata.primary.name;
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
