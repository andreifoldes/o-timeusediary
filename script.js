// Remove this line:
// import interact from 'https://cdn.interactjs.io/v1.10.27/interactjs/index.js';

let selectedActivity = null;
let timelineData = {
    primary: [],
    secondary: []
}; // Hierarchical structure for both timelines
let isSecondaryMode = false;
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

// Function to get the current timeline's data array
function getCurrentTimelineData() {
    return isSecondaryMode ? timelineData.secondary : timelineData.primary;
}

// Function to switch to secondary mode
async function switchToSecondaryMode() {
    if (DEBUG_MODE) {
        console.log('Primary timeline data saved:', timelineData.primary);
    }

    // Update UI for secondary mode
    document.querySelector('.timeline-title').textContent = 'Secondary Activity';
    document.title = 'Secondary Activity';

    // Make primary timeline non-interactable by adding opacity
    const primaryTimelineContainer = document.querySelector('.timeline-container');
    primaryTimelineContainer.style.opacity = '0.6';
    primaryTimelineContainer.style.pointerEvents = 'none';
    primaryTimelineContainer.querySelector('.timeline').setAttribute('data-active', 'false');

    // Create a new timeline container for secondary activities
    const newTimelineContainer = primaryTimelineContainer.cloneNode(true);
    newTimelineContainer.style.opacity = '1';
    newTimelineContainer.style.pointerEvents = 'auto';
    
    // Clear any activity blocks from the cloned timeline
    const activityBlocks = newTimelineContainer.querySelectorAll('.activity-block');
    activityBlocks.forEach(block => block.remove());
    
    primaryTimelineContainer.parentNode.insertBefore(newTimelineContainer, primaryTimelineContainer.nextSibling);

    // Update timeline IDs and set active state
    const primaryTimeline = primaryTimelineContainer.querySelector('.timeline');
    primaryTimeline.id = 'primaryTimeline';
    
    const newTimeline = newTimelineContainer.querySelector('.timeline');
    newTimeline.id = 'timeline';
    newTimeline.setAttribute('data-active', 'true');
    
    // Update active timeline reference
    activeTimeline = newTimeline;

    // Set secondary mode flag
    isSecondaryMode = true;

    // Load secondary activities
    const categories = await fetchActivities('secondary');
    renderActivities(categories);

    // Initialize interaction for the new timeline
    initTimelineInteraction(newTimeline);

    // Reset button states
    updateButtonStates();

    if (DEBUG_MODE) {
        console.log('Switched to secondary mode');
        console.log('Timeline data structure:', timelineData);
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

function findNearestMarkers(minutes) {
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
        if (!data || !data[type] || !data[type].categories) {
            throw new Error('Invalid JSON structure or type not found');
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
    
    // Create markers container
    const markersContainer = document.createElement('div');
    markersContainer.className = 'markers';
    timeline.appendChild(markersContainer);
    
    // Store markers for easy access
    timeline.markers = [];
    
    for (let i = 4; i <= 28; i++) {
        const hour = i % 24;
        const hourPosition = (i - 4) * (100/24);
        
        // Create hour marker
        const hourMarker = new TimelineMarker(
            'hour', 
            hourPosition, 
            `${hour.toString().padStart(2, '0')}:00`
        );
        hourMarker.create(timeline, isMobile);
        timeline.markers.push(hourMarker);

        // Create minute markers
        for (let j = 1; j < 6; j++) {
            const position = (i - 4 + j / 6) * (100 / 24);
            if (position <= 100) {
                const markerType = j === 3 ? 'minute-marker-30' : 'minute';
                const minuteMarker = new TimelineMarker(markerType, position);
                minuteMarker.create(timeline, isMobile);
                timeline.markers.push(minuteMarker);
            }
        }
    }

    // Add window resize handler to update marker positions
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth < 1024;
        timeline.setAttribute('data-layout', newIsMobile ? 'vertical' : 'horizontal');
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
    const existingLabels = activeTimeline.querySelectorAll('.time-label');
    existingLabels.forEach(existingLabel => {
        if (existingLabel !== label && isOverlapping(existingLabel, label)) {
            label.style.bottom = 'auto';
            label.style.top = '-20px';
        }
    });

    return label;
}

function updateTimeLabel(label, startTime, endTime) {
    label.textContent = `${startTime} - ${endTime}`;
    
    label.style.bottom = '-20px';
    label.style.top = 'auto';
    
    // Only look for labels within the active timeline
    const existingLabels = activeTimeline.querySelectorAll('.time-label');
    existingLabels.forEach(existingLabel => {
        if (existingLabel !== label && isOverlapping(existingLabel, label)) {
            label.style.bottom = 'auto';
            label.style.top = '-20px';
        }
    });
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

    // Timeline starts at TIMELINE_START_HOUR and spans TIMELINE_HOURS hours
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
        const x = e.clientX - rect.left;
        const clampedX = Math.max(0, Math.min(x, rect.width));
        const clickPositionPercent = (clampedX / rect.width) * 100;
        
        if (clickPositionPercent >= 100) {
            return;
        }

        // Get minutes and find nearest 10-minute markers
        let clickMinutes = positionToMinutes(clickPositionPercent);
        if (clickMinutes === null) {
            return;
        }
        
        const [startMinutes, endMinutes] = findNearestMarkers(clickMinutes);

        if (isNaN(startMinutes) || isNaN(endMinutes) || !canPlaceActivity(startMinutes, endMinutes)) {
            alert('Cannot place activity here due to invalid position or overlap with an existing activity.');
            return;
        }

        const currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block';
        currentBlock.style.backgroundColor = selectedActivity.color;
        currentBlock.textContent = selectedActivity.name;
        
        // Convert minutes to percentage for positioning
        const startPositionPercent = minutesToPercentage(startMinutes);
        const endPositionPercent = minutesToPercentage(endMinutes);
        let blockWidth = Math.max(endPositionPercent - startPositionPercent, calculateMinimumBlockWidth());
        
        // Ensure fixed width for blocks created between 3:50 and 4:00
        if (startMinutes >= 230 && startMinutes < 240) {
            blockWidth = 0.694444;
            currentBlock.style.left = '85.4167%';
        }

        currentBlock.style.width = `${blockWidth}%`;
        currentBlock.style.left = `${startPositionPercent}%`;
        
        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle right';
        currentBlock.appendChild(rightHandle);
        targetTimeline.appendChild(currentBlock);

        const timeLabel = createTimeLabel(currentBlock);
        updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes));

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
                edges: { right: true },
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent',
                        endOnly: true
                    }),
                    interact.modifiers.restrictSize({
                        min: { width: calculateMinimumBlockWidth() * targetTimeline.offsetWidth / 100 },
                        max: { width: targetTimeline.offsetWidth }
                    })
                ],
                listeners: {
                    start(event) {
                        event.target.classList.add('resizing');
                    },
                    move(event) {
                        const target = event.target;
                        const timelineWidth = targetTimeline.offsetWidth;
                        
                        let widthPercent = (event.rect.width / timelineWidth) * 100;
                        const leftPercent = parseFloat(target.style.left);
                        
                        // Enforce minimum width
                        widthPercent = Math.max(widthPercent, calculateMinimumBlockWidth());
                        
                        // Prevent resizing past the right edge of the timeline
                        if (leftPercent + widthPercent > 100) {
                            widthPercent = 100 - leftPercent;
                        }
                        
                        const widthInMinutes = (widthPercent / 100) * TIMELINE_HOURS * 60;
                        // Round width to nearest 10 minutes
                        const roundedWidthMinutes = Math.round(widthInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                        widthPercent = (roundedWidthMinutes / (TIMELINE_HOURS * 60)) * 100;
                        
                        const newStartMinutes = Math.round((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                        const newEndMinutes = Math.round(newStartMinutes + roundedWidthMinutes);
                        
                        const blockId = target.dataset.id;
                        if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                            return;
                        }

                        target.style.width = `${widthPercent}%`;
                        
                        const timeLabel = target.querySelector('.time-label');
                        if (timeLabel) {
                            updateTimeLabel(timeLabel, formatTimeHHMM(newStartMinutes), formatTimeHHMM(newEndMinutes));
                        }
                    },
                    end(event) {
                        event.target.classList.remove('resizing');
                        const blockId = event.target.dataset.id;
                        const blockData = getCurrentTimelineData().find(activity => activity.id === blockId);
                        if (blockData) {
                            const leftPercent = parseFloat(event.target.style.left);
                            const widthPercent = parseFloat(event.target.style.width);
                            const newStartMinutes = Math.round((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const widthInMinutes = (widthPercent / 100) * TIMELINE_HOURS * 60;
                            const roundedWidthMinutes = Math.round(widthInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                            const newEndMinutes = Math.round(newStartMinutes + roundedWidthMinutes);
                            
                            blockData.startTime = formatTimeDDMMYYYYHHMM(newStartMinutes);
                            blockData.endTime = formatTimeDDMMYYYYHHMM(newEndMinutes);
                            
                            // Check timeline fullness after resizing
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
    
    // In secondary mode, Next button is always enabled
    // In primary mode, Next button is enabled only when timeline is full
    if (nextButton) nextButton.disabled = !isSecondaryMode && !isFull;
    
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
        if (!isSecondaryMode) {
            // Switch to secondary mode
            switchToSecondaryMode();
        } else {
            console.log('Secondary timeline complete');
        }
    });
}

async function init() {
    try {
        initTimeline();
        initTimelineInteraction();
        updateButtonStates();
        const categories = await fetchActivities('primary');
        renderActivities(categories);
        initButtons();
        updateButtonStates();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('activitiesContainer').innerHTML = 
            '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
    }
}

init();
