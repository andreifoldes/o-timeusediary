// Remove this line:
// import interact from 'https://cdn.interactjs.io/v1.10.27/interactjs/index.js';

let selectedActivity = null;
let timelineData = [];

const MINUTES_PER_DAY = 24 * 60;
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

async function fetchActivities() {
    try {
        const response = await fetch('primary_activities.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data || !data.categories) {
            throw new Error('Invalid JSON structure');
        }
        return data.categories;
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

function snapToGrid(minutes) {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
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

function generateSnapPoints() {
    const snapPoints = [];
    const timeline = document.querySelector('.timeline');
    const timelineWidth = timeline.offsetWidth;

    // Add 10-minute interval snap points with increased strength
    for (let i = 0; i <= TIMELINE_HOURS * 6; i++) {
        const percentage = (i / (TIMELINE_HOURS * 6)) * 100;
        snapPoints.push({
            x: `${percentage}%`,
            range: 10,
            strength: 5 // Increased strength for stronger snapping
        });
    }

    // Add hour markers with increased strength
    for (let i = 0; i <= TIMELINE_HOURS; i++) {
        const percentage = (i / TIMELINE_HOURS) * 100;
        snapPoints.push({
            x: `${percentage}%`,
            range: 10, // Reduced range for tighter snapping
            strength: 6 // Increased strength
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
            { x: `${leftPercent}%`, range: 10, strength: 5 },
            { x: `${rightPercent}%`, range: 10, strength: 5 }
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
    const timeline = document.querySelector('.timeline');
    let currentBlock = null;
    
    timeline.addEventListener('mousedown', (e) => {
        if (!selectedActivity || e.target.closest('.activity-block')) return;

        const rect = timeline.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        const clickPositionPercent = (x / rect.width) * 100;
        const snappedPosition = findNearestSnapPoint(clickPositionPercent, generateSnapPoints());
        const startMinutes = snapToGrid(positionToMinutes(snappedPosition));
        const endMinutes = startMinutes + DEFAULT_ACTIVITY_LENGTH;

        // Validation: Check for overlap
        if (!canPlaceActivity(startMinutes, endMinutes)) {
            alert('Cannot place activity here due to overlap with an existing activity.');
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
        currentBlock.style.left = `${snappedPosition}%`;
        
        // Add resize handles
        const leftHandle = document.createElement('div');
        leftHandle.className = 'resize-handle left';
        const rightHandle = document.createElement('div');
        rightHandle.className = 'resize-handle right';
        
        currentBlock.appendChild(leftHandle);
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

        // Setup interact.js resizable and draggable
        interact(currentBlock)
            .resizable({
                edges: { left: true, right: true, bottom: false, top: false },
                invert: 'reposition',
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent'
                    }),
                    interact.modifiers.snap({
                        targets: generateSnapPoints(),
                        range: 10, // Adjusted range for stronger snapping
                        relativePoints: [{ x: 0, y: 0 }],
                        endOnly: true
                    })
                ],
                listeners: {
                    start(event) {
                        event.target.classList.add('resizing');
                    },
                    move(event) {
                        const timeline = document.querySelector('.timeline');
                        const timelineWidth = timeline.offsetWidth;
                        const { width, left } = event.rect;
                        
                        // Convert width and left from pixels to percentage
                        const widthPercent = (width / timelineWidth) * 100;
                        const leftPercent = (left / timelineWidth) * 100;
                        
                        // Calculate new start and end minutes
                        const newStartMinutes = snapToGrid((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                        const newEndMinutes = newStartMinutes + snapToGrid((widthPercent / 100) * TIMELINE_HOURS * 60);
                        
                        // Validation: Check for overlap
                        const blockId = event.target.dataset.id;
                        if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                            // Revert to previous size and position
                            event.target.style.width = `${parseFloat(event.target.style.width)}%`;
                            event.target.style.left = `${parseFloat(event.target.style.left)}%`;
                            return;
                        }

                        event.target.style.width = `${widthPercent}%`;
                        event.target.style.left = `${leftPercent}%`;

                        // Update time label
                        const timeLabel = event.target.querySelector('.time-label');
                        if (timeLabel) {
                            updateTimeLabel(timeLabel, formatTimeHHMM(newStartMinutes), formatTimeHHMM(newEndMinutes));
                        }
                    },
                    end(event) {
                        event.target.classList.remove('resizing');
                        // Update timelineData with new times
                        const blockId = event.target.dataset.id;
                        const blockData = timelineData.find(activity => activity.id === blockId);
                        if (blockData) {
                            const newStartMinutes = snapToGrid((parseFloat(event.target.style.left) / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const newWidthPercent = parseFloat(event.target.style.width);
                            const newEndMinutes = snapToGrid(newStartMinutes + (newWidthPercent / 100) * TIMELINE_HOURS * 60);
                            
                            // Validation: Ensure no overlap after resize
                            if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                                alert('Resizing causes overlap with an existing activity. Reverting changes.');
                                // Revert to previous state
                                // (Implement logic to store and revert previous state if necessary)
                                return;
                            }

                            blockData.startTime = formatTimeDDMMYYYYHHMM(newStartMinutes);
                            blockData.endTime = formatTimeDDMMYYYYHHMM(newEndMinutes);
                        }
                        // Regenerate snap points after resize
                        interact(event.target).resizable({
                            modifiers: [
                                interact.modifiers.snap({
                                    targets: generateSnapPoints(),
                                    range: 10, // Adjusted range for stronger snapping
                                    relativePoints: [{ x: 0, y: 0 }],
                                    endOnly: true
                                })
                            ]
                        });
                    }
                }
            })
            .draggable({
                listeners: {
                    start(event) {
                        event.target.classList.add('dragging');
                    },
                    move(event) {
                        const target = event.target;
                        const timeline = document.querySelector('.timeline');
                        const timelineWidth = timeline.offsetWidth;
                        const dxPercent = (event.dx / timelineWidth) * 100;
                        let newLeft = parseFloat(target.style.left) + dxPercent;
                        const widthPercent = parseFloat(target.style.width);

                        // Calculate new start and end minutes
                        const newStartMinutes = snapToGrid((newLeft / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                        const newEndMinutes = snapToGrid(newStartMinutes + (widthPercent / 100) * TIMELINE_HOURS * 60);

                        // Validation: Check for overlap
                        const blockId = target.dataset.id;
                        if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                            // Revert to previous position
                            newLeft = parseFloat(target.style.left) - dxPercent;
                            target.style.left = `${newLeft}%`;
                            return;
                        }

                        // Ensure newLeft is within bounds
                        newLeft = Math.max(0, Math.min(newLeft, 100 - widthPercent));
                        target.style.left = `${newLeft}%`;

                        // Update time label
                        const timeLabel = target.querySelector('.time-label');
                        if (timeLabel) {
                            updateTimeLabel(timeLabel, formatTimeHHMM(newStartMinutes), formatTimeHHMM(newEndMinutes));
                        }
                    },
                    end(event) {
                        event.target.classList.remove('dragging');
                        // Update timelineData with new times
                        const blockId = event.target.dataset.id;
                        const blockData = timelineData.find(activity => activity.id === blockId);
                        if (blockData) {
                            const newLeftPercent = parseFloat(event.target.style.left);
                            const newWidthPercent = parseFloat(event.target.style.width);
                            const newStartMinutes = snapToGrid((newLeftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const newEndMinutes = snapToGrid(newStartMinutes + (newWidthPercent / 100) * TIMELINE_HOURS * 60);

                            // Validation: Ensure no overlap after drag
                            if (!canPlaceActivity(newStartMinutes, newEndMinutes, blockId)) {
                                alert('Dragging causes overlap with an existing activity. Reverting changes.');
                                // Revert to previous state
                                // (Implement logic to store and revert previous state if necessary)
                                return;
                            }

                            blockData.startTime = formatTimeDDMMYYYYHHMM(newStartMinutes);
                            blockData.endTime = formatTimeDDMMYYYYHHMM(newEndMinutes);
                        }
                    }
                },
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    }),
                    interact.modifiers.snap({
                        targets: generateSnapPoints(),
                        range: 10, // Adjusted range for stronger snapping
                        relativePoints: [{ x: 0, y: 0 }],
                        endOnly: false // Changed from true to false to enable snapping during dragging
                    })
                ]
            });
    });
}

function updateButtonStates() {
    const undoButton = document.getElementById('undoBtn');
    const cleanRowButton = document.getElementById('cleanRowBtn');
    const saveButton = document.getElementById('saveBtn');
    
    const isEmpty = timelineData.length === 0;
    undoButton.disabled = isEmpty;
    cleanRowButton.disabled = isEmpty;
}

function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function findNearestSnapPoint(position, snapPoints) {
    return snapPoints.reduce((nearest, point) => {
        const pointX = parseFloat(point.x);
        const distance = Math.abs(pointX - position);
        if (distance < point.range && (!nearest || distance < Math.abs(nearest.x - position))) {
            return { x: pointX, strength: point.strength };
        }
        return nearest;
    }, null)?.x || position;
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

async function init() {
    try {
        initTimeline();
        initTimelineInteraction(); // Add this line
        updateButtonStates();
        const categories = await fetchActivities();
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
