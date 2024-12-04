// Remove this line:
// import interact from 'https://cdn.interactjs.io/v1.10.27/interactjs/index.js';

let selectedActivity = null;
let timelineData = [];

const MINUTES_PER_DAY = 24 * 60;
// Update SNAP_MINUTES for 10-minute snapping
const SNAP_MINUTES = 10;
const DEFAULT_ACTIVITY_LENGTH = 10;
const TIMELINE_START_HOUR = 4;
const TIMELINE_HOURS = 24;

const DEBUG_MODE = true; // Enable debug mode

function logDebugInfo() {
    if (DEBUG_MODE) {
        console.log('timelineData:', timelineData);
    }
}

// Modify the fetchActivities function to accept a string parameter that selects which top-level tree to import
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

function formatTimeDDMMYYYYHHMM(minutes) {
    const date = new Date();
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
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
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
    if (typeof timeStr === 'number') {
        return timeStr;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Modify snapToGrid to always round up to the nearest 10 minutes
function snapToGrid(minutes) {
    return Math.ceil(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function minutesToPercentage(minutes) {
    const minutesSince4AM = (minutes - TIMELINE_START_HOUR * 60 + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    return (minutesSince4AM / (TIMELINE_HOURS * 60)) * 100;
}

function minutesToPosition(minutes, timelineWidth) {
    return minutesToPercentage(minutes);
}

// Modify the positionToMinutes function to accept position as a percentage
function positionToMinutes(positionPercent) {
    const minutes = Math.round((positionPercent / 100) * TIMELINE_HOURS * 60) + TIMELINE_START_HOUR * 60;
    return minutes % MINUTES_PER_DAY;
}

function hasOverlap(startMinutes, endMinutes, excludeBlock = null) {
    return timelineData.some(activity => {
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

function initTimeline() {
    const timeline = document.getElementById('timeline');
    
    for (let i = 4; i <= 28; i++) {
        const hour = i % 24;
        
        const marker = document.createElement('div');
        marker.className = 'hour-marker';
        marker.style.left = `${(i - 4) * (100/24)}%`;
        
        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = `${hour.toString().padStart(2, '0')}:00`;
        marker.appendChild(label);
        timeline.appendChild(marker);

        for (let j = 1; j < 6; j++) {
            const leftPosition = (i - 4 + j / 6) * (100 / 24);
            if (leftPosition <= 100) {
                const minuteMarker = document.createElement('div');
                minuteMarker.className = 'minute-marker';
                
                // Add a special class for the 30-minute marker
                if (j === 3) {
                    minuteMarker.classList.add('minute-marker-30');
                }
                
                minuteMarker.style.left = `${leftPosition}%`;
                timeline.appendChild(minuteMarker);
            }
        }
    }
}

// Modify generateSnapPoints to implement snapping hierarchy
function generateSnapPoints() {
    const snapPoints = [];
    const timeline = document.querySelector('.timeline');
    const timelineWidth = timeline.offsetWidth;

    // Highest Priority: Snap to timeline ends
    snapPoints.push(
        { x: `0%`, range: 1, strength: 40 },   // Left end with highest strength
        { x: `100%`, range: 1, strength: 30 }  // Right end with slightly lower strength
    );

    // Medium Priority: Snap to hour markers
    for (let i = 1; i <= TIMELINE_HOURS; i++) {
        const percentage = (i / TIMELINE_HOURS) * 100;
        snapPoints.push({
            x: `${percentage}%`,
            range: 0.75, // Slightly larger range for hour markers
            strength: 20 // Medium strength
        });
    }

    // Lowest Priority: Snap to minute markers (every 10 minutes)
    for (let i = 0; i <= TIMELINE_HOURS * 6; i++) { // 6 snaps per hour (every 10 minutes)
        const percentage = (i * SNAP_MINUTES) / (TIMELINE_HOURS * 60) * 100;
        snapPoints.push({
            x: `${percentage}%`,
            range: 0.5, // Smaller range for minute markers
            strength: 15 // Lower strength for left grid
        });
    }

    // Add activity block edges with increased strength
    const blocks = timeline.querySelectorAll('.activity-block');
    blocks.forEach(block => {
        if (block.classList.contains('resizing')) return; // Skip the block being resized

        const rect = block.getBoundingClientRect();
        const timelineRect = timeline.getBoundingClientRect();
        
        // Convert positions to percentages
        const leftPercent = ((rect.left - timelineRect.left) / timelineRect.width) * 100;
        const rightPercent = ((rect.right - timelineRect.left) / timelineRect.width) * 100;

        // Add block edges with stronger snap
        snapPoints.push(
            { x: `${leftPercent}%`, range: 0.5, strength: 25 }, // Higher strength for left block edges
            { x: `${rightPercent}%`, range: 0.5, strength: 15 } // Lower strength for right block edges
        );
    });

    return snapPoints;
}

// Function to check if two elements overlap
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

// Modify the createTimeLabel function to alternate positioning based on collision
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
    label.style.zIndex = '10'; // Ensure the label appears above other elements
    
    // Initially position below the activity block
    label.style.bottom = '-20px';
    label.style.top = 'auto';
    
    block.appendChild(label);
    
    // Check for collision with existing labels
    const existingLabels = document.querySelectorAll('.time-label');
    existingLabels.forEach(existingLabel => {
        if (existingLabel !== label && isOverlapping(existingLabel, label)) {
            // If collision detected, position above instead of below
            label.style.bottom = 'auto';
            label.style.top = '-20px';
        }
    });

    return label;
}

// Modify the updateTimeLabel function to recheck collisions after updates
function updateTimeLabel(label, startTime, endTime) {
    label.textContent = `${startTime} - ${endTime}`;
    
    // Reset positioning to bottom
    label.style.bottom = '-20px';
    label.style.top = 'auto';
    
    // Recheck for collisions and adjust if necessary
    const existingLabels = document.querySelectorAll('.time-label');
    existingLabels.forEach(existingLabel => {
        if (existingLabel !== label && isOverlapping(existingLabel, label)) {
            // If collision detected, position above instead of below
            label.style.bottom = 'auto';
            label.style.top = '-20px';
        }
    });
}

// Add a new function to check for overlaps
function canPlaceActivity(newStart, newEnd, excludeId = null) {
    return !timelineData.some(activity => {
        if (excludeId && activity.id === excludeId) return false;
        const activityStart = timeToMinutes(activity.startTime.split(' ')[1]);
        const activityEnd = timeToMinutes(activity.endTime.split(' ')[1]);
        return (newStart < activityEnd && newEnd > activityStart);
    });
}

function initTimelineInteraction() {
    const timeline = document.querySelector('.timeline'); // Changed from getElementById to querySelector for consistency
    let currentBlock = null;
    
    timeline.addEventListener('click', (e) => { // Changed from 'mousedown' to 'click' for single-click action
        if (!selectedActivity || e.target.closest('.activity-block')) return;

        const rect = timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Clamp x within timeline bounds
        const clampedX = Math.max(0, Math.min(x, rect.width));
        
        const clickPositionPercent = (clampedX / rect.width) * 100;
        const snappedPosition = findNearestSnapPoint(clickPositionPercent, generateSnapPoints());

        // Validate snappedPosition
        const validSnappedPosition = !isNaN(parseFloat(snappedPosition)) ? parseFloat(snappedPosition) : clickPositionPercent;

        const startMinutes = positionToMinutes(validSnappedPosition); // Ensure validSnappedPosition is used
        const endMinutes = startMinutes + DEFAULT_ACTIVITY_LENGTH;

        // Validation: Check for overlap and valid minutes
        if (isNaN(startMinutes) || isNaN(endMinutes) || !canPlaceActivity(startMinutes, endMinutes)) {
            alert('Cannot place activity here due to invalid position or overlap with an existing activity.');
            return;
        }

        currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block';
        currentBlock.style.backgroundColor = selectedActivity.color;
        currentBlock.textContent = selectedActivity.name;
        
        // Start with default 10-minute width
        const percentPerMinute = 100 / (TIMELINE_HOURS * 60);
        const initialWidthPercent = percentPerMinute * DEFAULT_ACTIVITY_LENGTH;
        currentBlock.style.width = `${initialWidthPercent}%`;
        currentBlock.style.left = `${validSnappedPosition}%`; // Position block where the mouse was clicked
        
        // <!-- Remove left resize handle creation -->
        // const leftHandle = document.createElement('div');
        // leftHandle.className = 'resize-handle left';
        // currentBlock.appendChild(leftHandle);

        // Add only right resize handle
        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle right';
        currentBlock.appendChild(rightHandle);
        timeline.appendChild(currentBlock);

        // Create and append time label
        const timeLabel = createTimeLabel(currentBlock);
        updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes));

        // Add block to timelineData
        const activityData = {
            id: generateUniqueId(),
            activity: selectedActivity.name,
            startTime: formatTimeDDMMYYYYHHMM(startMinutes),
            endTime: formatTimeDDMMYYYYHHMM(endMinutes),
            color: selectedActivity.color
        };
        timelineData.push(activityData);
        currentBlock.dataset.id = activityData.id;

        // Update button states
        updateButtonStates();

        // Setup interact.js resizable
        interact(currentBlock)
            .resizable({
                edges: { right: true },
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent',
                        endOnly: true
                    }),
                    interact.modifiers.restrictSize({
                        min: { width: (DEFAULT_ACTIVITY_LENGTH / (TIMELINE_HOURS * 60)) * 100 }
                    }),
                    interact.modifiers.snap({
                        targets: generateSnapPoints(),
                        range: 0.75,
                        endOnly: true
                    })
                ],
                listeners: {
                    start(event) {
                        event.target.classList.add('resizing');
                    },
                    move(event) {
                        const target = event.target;
                        const timeline = document.querySelector('.timeline');
                        const timelineWidth = timeline.offsetWidth;
                        
                        // Calculate width in percentage
                        let widthPercent = (event.rect.width / timelineWidth) * 100;
                        const leftPercent = parseFloat(target.style.left);
                        
                        // Convert width to minutes
                        const widthInMinutes = (widthPercent / 100) * TIMELINE_HOURS * 60;
                        // Snap to nearest 10-minute increment
                        const snappedMinutes = Math.round(widthInMinutes / DEFAULT_ACTIVITY_LENGTH) * DEFAULT_ACTIVITY_LENGTH;
                        // Convert back to percentage
                        widthPercent = (snappedMinutes / (TIMELINE_HOURS * 60)) * 100;
                        
                        // Calculate times
                        const newStartMinutes = snapToGrid((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                        const newEndMinutes = snapToGrid(newStartMinutes + snappedMinutes);
                        
                        // Validation
                        const blockId = target.dataset.id;
                        if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                            return;
                        }

                        // Update width
                        target.style.width = `${widthPercent}%`;
                        
                        // Update label
                        const timeLabel = target.querySelector('.time-label');
                        if (timeLabel) {
                            updateTimeLabel(timeLabel, formatTimeHHMM(newStartMinutes), formatTimeHHMM(newEndMinutes));
                        }
                    },
                    end(event) {
                        event.target.classList.remove('resizing');
                        const blockId = event.target.dataset.id;
                        const blockData = timelineData.find(activity => activity.id === blockId);
                        if (blockData) {
                            const leftPercent = parseFloat(event.target.style.left);
                            const widthPercent = parseFloat(event.target.style.width);
                            const newStartMinutes = snapToGrid((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const newEndMinutes = snapToGrid(newStartMinutes + (widthPercent / 100) * TIMELINE_HOURS * 60);
                            
                            blockData.startTime = formatTimeDDMMYYYYHHMM(newStartMinutes);
                            blockData.endTime = formatTimeDDMMYYYYHHMM(newEndMinutes);
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
    
    const isEmpty = timelineData.length === 0;
    if (undoButton) {
        undoButton.disabled = isEmpty;
    }
    if (cleanRowButton) {
        cleanRowButton.disabled = isEmpty;
    }
    if (saveButton) {
        saveButton.disabled = isEmpty;
    }
}

function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Modify findNearestSnapPoint to prioritize higher strength snaps
function findNearestSnapPoint(position, snapPoints) {
    // Sort snapPoints by strength descending
    const sortedSnapPoints = snapPoints.sort((a, b) => b.strength - a.strength);
    for (let point of sortedSnapPoints) {
        const pointX = parseFloat(point.x);
        const distance = Math.abs(pointX - position);
        if (distance <= point.range) {
            return point.x;
        }
    }
    return position;
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        if (timelineData.length > 0) {
            // Clear only the activity blocks from the timeline display
            const timeline = document.getElementById('timeline');
            const activityBlocks = timeline.querySelectorAll('.activity-block');
            activityBlocks.forEach(block => block.remove());

            // Empty the data arrays
            timelineData = [];

            // Update button states - this will disable both Clean Row and Undo buttons
            updateButtonStates();

            logDebugInfo(); // Log debug information
        }
    });

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', () => {
        const jsonData = {
            activities: timelineData
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

    // Single undo button implementation
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (timelineData.length > 0) {
            if (DEBUG_MODE) {
                console.log('Before undo - timelineData length:', timelineData.length);
                console.log('Current blocks:', document.querySelectorAll('.activity-block').length);
            }

            // Get and remove the last activity
            const lastActivity = timelineData.pop();
            
            if (DEBUG_MODE) {
                console.log('Removing activity:', lastActivity);
                console.log('After pop - timelineData length:', timelineData.length);
            }

            // Remove the corresponding block
            const timeline = document.querySelector('.timeline');
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
                console.log('Final timelineData:', timelineData);
                console.log('Remaining blocks:', document.querySelectorAll('.activity-block').length);
            }
        }
    });
}

// Modify the init function to pass the desired type to fetchActivities
async function init() {
    try {
        initTimeline();
        initTimelineInteraction(); // Add this line
        updateButtonStates();
        const categories = await fetchActivities('primary'); // Pass the desired type here
        renderActivities(categories);
        initButtons();
        updateButtonStates();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('activitiesContainer').innerHTML = 
            '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
    }
}

// Make sure init() is called only once
init();
