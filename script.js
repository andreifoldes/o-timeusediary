import { TimelineMarker } from './timeline_marker.js';
import { Timeline } from './timeline.js';
import { TimelineContainer } from './timeline_container.js';
import { getCurrentTimelineData, getCurrentTimelineType } from './utils.js';
import { updateIsMobile, getIsMobile } from './globals.js';
let selectedActivity = null;

// Make these available globally for debugging
window.timelines = {}; // Timeline metadata
window.timelineData = {}; // Timeline activity data
window.initializedTimelines = new Set(); // Track which timelines have been initialized
window.activeTimeline = null; // Track the active timeline

// Function to calculate timeline coverage percentage
window.getTimelineCoverage = () => {
    const currentData = getCurrentTimelineData(timelineTypes, currentTimelineIndex, timelineData);
    if (!currentData || currentData.length === 0) return 0;

    // Calculate total minutes covered
    let coveredMinutes = 0;
    const sortedActivities = [...currentData].sort((a, b) => 
        timeToMinutes(a.startTime.split(' ')[1]) - timeToMinutes(b.startTime.split(' ')[1])
    );

    // Track the latest end time seen
    let latestEndTime = 0;

    sortedActivities.forEach(activity => {
        const startMinutes = timeToMinutes(activity.startTime.split(' ')[1]);
        const endMinutes = timeToMinutes(activity.endTime.split(' ')[1]);
        
        // Only count non-overlapping portions
        if (startMinutes > latestEndTime) {
            coveredMinutes += endMinutes - startMinutes;
        } else if (endMinutes > latestEndTime) {
            coveredMinutes += endMinutes - latestEndTime;
        }
        
        latestEndTime = Math.max(latestEndTime, endMinutes);
    });

    // Calculate percentage (24 hours = 1440 minutes)
    const percentage = (coveredMinutes / 1440) * 100;
    console.log(`Timeline coverage: ${percentage.toFixed(2)}% (${coveredMinutes} minutes covered)`);
    return percentage;
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

let currentTimelineIndex = 0;
let timelineTypes = []; // Will be populated from activities.json

// Function to add next timeline
async function addNextTimeline() {
    if (DEBUG_MODE) {
        console.log(`Current timeline data saved:`, timelineData);
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
        
        // Update UI for next timeline and set it as active
        timelines[nextTimelineType].isActive = true;
        document.querySelector('.timeline-title').textContent = timelines[nextTimelineType].name;
        document.querySelector('.timeline-description').textContent = timelines[nextTimelineType].description;
        document.title = timelines[nextTimelineType].name;

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
            activeTimeline = newTimeline;
            initTimelineInteraction(newTimeline);
        }

        // Initialize timeline data if not exists
        if (!timelineData[nextTimelineType]) {
            timelineData[nextTimelineType] = [];
        }

        // Render activities for next timeline
        renderActivities(categories);

        // Initialize markers for the new timeline
        initTimeline();
        
        // Initialize interaction for the timeline
        initTimelineInteraction(activeTimeline);

        // Reset button states
        updateButtonStates();
        
        // Scroll new timeline into view
        activeTimeline.scrollIntoView({ behavior: 'smooth', block: 'center' });

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

        // Initialize timelines, timelineData and timelineTypes for all available timeline types
        if (Object.keys(timelines).length === 0) {
            timelineTypes = Object.keys(data); // Dynamically set timeline types
            timelineTypes.forEach(timelineType => {
                timelines[timelineType] = null;
                timelineData[timelineType] = [];
            });
            if (DEBUG_MODE) {
                console.log('Initialized timeline structures:', {
                    timelineTypes,
                    timelines: Object.keys(timelines),
                    timelineData: Object.keys(timelineData)
                });
            }
        }

        if (!data[type]) {
            throw new Error(`Timeline type ${type} not found`);
        }
        
        // Create new Timeline instance with metadata and set active state
        timelines[type] = new Timeline(type, data[type]);
        // Set isActive true only for first timeline, false for others
        timelines[type].isActive = type === 'primary';
        initializedTimelines.add(type); // Mark this timeline as initialized
        
        if (DEBUG_MODE) {
            console.log(`Loaded timeline metadata for ${type}:`, timelines[type]);
            console.log('All available timelines in activities.json:', Object.keys(data));
            console.log('Full timeline data:', data);
            console.log('Initialized timelines:', Array.from(initializedTimelines));
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
    const timeline = document.getElementById('primary');
    timeline.setAttribute('data-active', 'true');
    activeTimeline = timeline;
    
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

function initTimelineInteraction(timeline = null) {
    // If no timeline is provided, use the active timeline
    const targetTimeline = timeline || activeTimeline;
    if (!targetTimeline) return;
    
    // Initialize interact.js resizable
    interact('.activity-block').resizable({
        edges: { right: true },
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: '.timeline'
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
                    
                    // Update block width
                    target.style.width = `${newWidth}%`;
                    
                    // Update time label
                    const timeLabel = target.querySelector('.time-label');
                    if (timeLabel) {
                        const startTime = target.dataset.start;
                        const endMinutes = positionToMinutes((parseFloat(target.style.left) + newWidth));
                        const endTime = formatTimeHHMM(endMinutes);
                        updateTimeLabel(timeLabel, startTime, endTime, target);
                        
                        // Update the end time in the dataset
                        target.dataset.end = endTime;
                    }
                }
            },
            end(event) {
                event.target.classList.remove('resizing');
                const textDiv = event.target.querySelector('.activity-block-text');
                if (textDiv) {
                    textDiv.classList.add('resized');
                }
            }
        }
    });
    
    targetTimeline.addEventListener('click', (e) => {
        // Only process clicks on the active timeline
        if (targetTimeline.getAttribute('data-active') !== 'true') return;
        
        if (!selectedActivity || e.target.closest('.activity-block')) return;
        
        if (isTimelineFull(timelineTypes, currentTimelineIndex, timelineData, timelines)) {
            alert('Timeline is full. Remove some activities first.');
            return;
        }

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

        if (isNaN(startMinutes) || isNaN(endMinutes) || !canPlaceActivity(startMinutes, endMinutes, null, timelineTypes, currentTimelineIndex, timelineData)) {
            alert('Cannot place activity here due to invalid position or overlap with an existing activity.');
            return;
        }

        const currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block';
        currentBlock.dataset.start = formatTimeHHMM(startMinutes);
        currentBlock.dataset.end = formatTimeHHMM(endMinutes);
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
        
        const activitiesContainer = targetTimeline.querySelector('.activities');
        activitiesContainer.appendChild(currentBlock);

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
        getCurrentTimelineData(timelineTypes, currentTimelineIndex, timelineData).push(activityData);
        currentBlock.dataset.id = activityData.id;

        updateButtonStates();


    });
}

function updateButtonStates() {
    const undoButton = document.getElementById('undoBtn');
    const cleanRowButton = document.getElementById('cleanRowBtn');
    const saveButton = document.getElementById('saveBtn');
    const nextButton = document.getElementById('nextBtn');
    
    const currentData = getCurrentTimelineData(timelineTypes, currentTimelineIndex, timelineData);
    const isEmpty = currentData.length === 0;
    const isFull = isTimelineFull(timelineTypes, currentTimelineIndex, timelineData, timelines);
    
    if (undoButton) undoButton.disabled = isEmpty;
    if (cleanRowButton) cleanRowButton.disabled = isEmpty;
    if (saveButton) saveButton.disabled = isEmpty;
    
    // Enable Next button based on timeline coverage and initialization status
    const currentType = getCurrentTimelineType(timelineTypes, currentTimelineIndex);
    const currentTimeline = timelines[currentType];
    const requiresComplete = currentTimeline?.coverage === 'complete';
    const hasNextTimeline = currentTimelineIndex < timelineTypes.length - 1;
    const nextTimelineType = hasNextTimeline ? timelineTypes[currentTimelineIndex + 1] : null;
    const nextTimelineNeedsInit = nextTimelineType && !initializedTimelines.has(nextTimelineType);
    
    if (nextButton) {
        nextButton.disabled = (requiresComplete && !isFull) || (!hasNextTimeline || !nextTimelineNeedsInit);
    }
    
    if (DEBUG_MODE) {
        console.log('Button state update:', {
            currentType,
            requiresComplete,
            isFull,
            hasNextTimeline,
            nextTimelineType,
            nextTimelineNeedsInit,
            initializedTimelines: Array.from(initializedTimelines)
        });
    }
    
    if (DEBUG_MODE && isFull) {
        console.log('Timeline is complete');
    }
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        const currentData = getCurrentTimelineData(timelineTypes, currentTimelineIndex, timelineData);
        if (currentData.length > 0) {
            const activityBlocks = activeTimeline.querySelectorAll('.activity-block');
            activityBlocks.forEach(block => block.remove());

            const currentType = getCurrentTimelineType(timelineTypes, currentTimelineIndex);
            timelineData[currentType] = [];

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
        const currentData = getCurrentTimelineData(timelineTypes, currentTimelineIndex, timelineData);
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
        const nextTimelineType = timelineTypes[currentTimelineIndex + 1];
        if (nextTimelineType && !initializedTimelines.has(nextTimelineType)) {
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
        console.log('isMobile value during init:', getIsMobile());
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
