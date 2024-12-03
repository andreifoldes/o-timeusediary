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

function positionToMinutes(position, timelineWidth) {
    const percentage = (position / timelineWidth) * 100;
    const minutes = Math.round((percentage / 100) * TIMELINE_HOURS * 60) + TIMELINE_START_HOUR * 60;
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

function validateAndCleanActivities() {
    timelineData = timelineData.filter(activity => {
        const startMinutes = timeToMinutes(activity.startTime);
        const endMinutes = timeToMinutes(activity.endTime);
        return startMinutes !== endMinutes;
    });

    timelineData.sort((a, b) => {
        const aStart = timeToMinutes(a.startTime);
        const bStart = timeToMinutes(b.startTime);
        return aStart - bStart;
    });

    const timeline = document.querySelector('.timeline');
    const blocks = timeline.querySelectorAll('.activity-block');
    blocks.forEach(block => block.remove());

    timelineData.forEach(activity => {
        const block = document.createElement('div');
        block.className = 'activity-block';
        block.style.backgroundColor = activity.color;
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'activity-text';
        nameSpan.textContent = activity.name;
        block.appendChild(nameSpan);
        
        timeline.appendChild(block);
        
        const startMinutes = timeToMinutes(activity.startTime);
        const endMinutes = timeToMinutes(activity.endTime);
        updateBlockDisplay(block, startMinutes, endMinutes, timeline.offsetWidth, false, activity.id);
    });

    // Update undo button state
    const undoBtn = document.getElementById('undoBtn');
    undoBtn.disabled = timelineData.length === 0;
}

function updateBlockDisplay(block, startMinutes, endMinutes, timelineWidth, showTimeLabel = false, activityId = null) {
    const start = Math.min(startMinutes, endMinutes);
    const end = Math.max(startMinutes, endMinutes);
    const duration = end - start;
    
    const leftPercent = minutesToPosition(start, timelineWidth);
    
    // For 10-minute blocks, use exactly 1/6 of an hour width
    const widthPercent = duration === DEFAULT_ACTIVITY_LENGTH
        ? (100 / 24) / 6  // Exactly 1/6 of an hour for 10-minute blocks
        : (duration / (TIMELINE_HOURS * 60)) * 100;  // Proportional width for dragged blocks

    block.style.left = `${leftPercent}%`;
    block.style.width = `${widthPercent}%`;

    // Set the data-id attribute using the activity ID if provided
    if (activityId) {
        block.dataset.id = activityId;
    }

    // Update time label
    let timeLabel = block.querySelector('.time-label');
    if (showTimeLabel) {
        if (!timeLabel) {
            timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            block.appendChild(timeLabel);
        }
        timeLabel.textContent = `${formatTimeHHMM(start)} - ${formatTimeHHMM(end)}`;
    } else if (timeLabel) {
        timeLabel.remove();
    }

    // Check for overlap and update visual feedback
    const hasOverlapWithOthers = hasOverlap(start, end);
    block.classList.toggle('invalid', hasOverlapWithOthers && showTimeLabel);
}

function initTimelineInteraction() {
    const timeline = document.querySelector('.timeline');
    let isDrawing = false;
    let startX = 0;
    let anchorX = 0;
    let currentBlock = null;
    let startMinutes = 0;
    let endMinutes = 0;
    let dragStartTime = 0;
    let isDragging = false;

    timeline.addEventListener('mousedown', (e) => {
        if (!selectedActivity) return;
        
        isDrawing = true;
        isDragging = false;
        startX = e.offsetX;
        anchorX = startX;
        dragStartTime = Date.now();
        
        const timelineWidth = timeline.offsetWidth;
        startMinutes = snapToGrid(positionToMinutes(startX, timelineWidth));
        endMinutes = startMinutes + DEFAULT_ACTIVITY_LENGTH;

        currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block preview';
        currentBlock.style.backgroundColor = selectedActivity.color;
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'activity-text';
        nameSpan.textContent = selectedActivity.name;
        currentBlock.appendChild(nameSpan);
        
        timeline.appendChild(currentBlock);
        updateBlockDisplay(currentBlock, startMinutes, endMinutes, timelineWidth, true);
    });

    timeline.addEventListener('mousemove', (e) => {
        if (!isDrawing || !currentBlock) return;

        const timelineWidth = timeline.offsetWidth;
        const currentX = e.offsetX;
        const currentMinutes = snapToGrid(positionToMinutes(currentX, timelineWidth));

        // If mouse has moved significantly, consider it a drag
        if (Math.abs(currentX - startX) > 5) {
            isDragging = true;
            endMinutes = currentMinutes;
            
            // Update block display with time label and overlap check
            const start = Math.min(startMinutes, endMinutes);
            const end = Math.max(startMinutes, endMinutes);
            
            // Check for overlap and update visual feedback
            const hasOverlapWithOthers = hasOverlap(start, end);
            currentBlock.classList.toggle('invalid', hasOverlapWithOthers);
            
            updateBlockDisplay(currentBlock, start, end, timelineWidth, true);
        } else {
            // Still in click mode, maintain 10-minute width
            endMinutes = startMinutes + DEFAULT_ACTIVITY_LENGTH;
            updateBlockDisplay(currentBlock, startMinutes, endMinutes, timelineWidth, true);
        }
    });

    timeline.addEventListener('mouseup', (e) => {
        if (!isDrawing || !currentBlock) return;
        isDrawing = false;

        const timelineWidth = timeline.offsetWidth;
        const dragDuration = Date.now() - dragStartTime;
        
        if (!isDragging && dragDuration < 200) {
            // Click interaction - 10-minute block
            endMinutes = startMinutes + DEFAULT_ACTIVITY_LENGTH;
        } else {
            // Drag interaction - variable size
            endMinutes = snapToGrid(positionToMinutes(e.offsetX, timelineWidth));
        }

        const start = Math.min(startMinutes, endMinutes);
        const end = Math.max(startMinutes, endMinutes);
        
        if (start === end || hasOverlap(start, end) || !isWithinTimelineBounds(start, end)) {
            currentBlock.remove();
            return;
        }

        const activityData = {
            id: generateUniqueId(), // Add unique ID
            activity: selectedActivity.name,
            startTime: formatTimeDDMMYYYYHHMM(start),
            endTime: formatTimeDDMMYYYYHHMM(end),
            color: selectedActivity.color
        };

        // Check for duplicates before adding
        const isDuplicate = timelineData.some(activity => 
            activity.activity === activityData.activity &&
            activity.startTime === activityData.startTime &&
            activity.endTime === activityData.endTime &&
            activity.color === activityData.color
        );

        if (!isDuplicate) {
            // Add activity to timelineData
            timelineData.push(activityData);
            currentBlock.dataset.id = activityData.id;  // Set the ID on the block
        }

        updateButtonStates();
        currentBlock.classList.remove('preview');
        updateBlockDisplay(currentBlock, start, end, timelineWidth, false);

        if (DEBUG_MODE) {
            console.log('Added activity:', activityData);
            console.log('Current timelineData:', timelineData);
        }

        // Remove the unnecessary call to validateAndCleanActivities
        // validateAndCleanActivities();
    });

    timeline.addEventListener('mouseleave', () => {
        if (isDrawing && currentBlock) {
            isDrawing = false;
            currentBlock.remove();
            currentBlock = null;
        }
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
                minuteMarker.style.left = `${leftPosition}%`;
                timeline.appendChild(minuteMarker);
            }
        }
    }
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        // Clear only the activity blocks from the timeline display
        const timeline = document.getElementById('timeline');
        const activityBlocks = timeline.querySelectorAll('.activity-block');
        activityBlocks.forEach(block => block.remove());

        // Empty the data arrays
        timelineData = [];

        // Update button states - this will disable both Clean Row and Undo buttons
        updateButtonStates();

        logDebugInfo(); // Log debug information
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

// Fix updateButtonStates to not return a random ID
function updateButtonStates() {
    const undoButton = document.getElementById('undoBtn');
    const cleanRowButton = document.getElementById('cleanRowBtn');
    const saveButton = document.getElementById('saveBtn');
    
    const isEmpty = timelineData.length === 0;
    undoButton.disabled = isEmpty;
    cleanRowButton.disabled = isEmpty;
}

// Add this new function for rendering without validation
function renderTimelineBlocks() {
    const timeline = document.querySelector('.timeline');
    const blocks = timeline.querySelectorAll('.activity-block');
    blocks.forEach(block => block.remove());

    timelineData.forEach(activity => {
        const block = document.createElement('div');
        block.className = 'activity-block';
        block.style.backgroundColor = activity.color;
        block.dataset.id = activity.id;  // Set ID directly
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'activity-text';
        nameSpan.textContent = activity.name;
        block.appendChild(nameSpan);
        
        timeline.appendChild(block);
        
        const startMinutes = timeToMinutes(activity.startTime.split(' ')[1]);
        const endMinutes = timeToMinutes(activity.endTime.split(' ')[1]);
        updateBlockDisplay(block, startMinutes, endMinutes, timeline.offsetWidth, false);
    });
}

function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function isWithinTimelineBounds(startMinutes, endMinutes) {
    const timelineStart = TIMELINE_START_HOUR * 60;
    const timelineEnd = (TIMELINE_START_HOUR + TIMELINE_HOURS) * 60;
    return startMinutes >= timelineStart && endMinutes <= timelineEnd;
}

async function init() {
    try {
        initTimeline();
        updateButtonStates();
        const categories = await fetchActivities();
        renderActivities(categories);
        initTimelineInteraction();
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
