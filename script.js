let selectedActivity = null;
let timelineData = [];
let activityHistory = [];  // Track individual activities for undo
const MINUTES_PER_DAY = 24 * 60;
const SNAP_MINUTES = 10;
const DEFAULT_ACTIVITY_LENGTH = 10;
const TIMELINE_START_HOUR = 4;
const TIMELINE_HOURS = 24;

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
        const activityStart = timeToMinutes(activity.startTime);
        const activityEnd = timeToMinutes(activity.endTime);
        return (startMinutes < activityEnd && endMinutes > activityStart);
    });
}

function validateAndCleanActivities() {
    // During undo operations, skip the filtering to prevent unwanted removals
    if (!isUndoing) {
        timelineData = timelineData.filter(activity => {
            const startMinutes = timeToMinutes(activity.startTime);
            const endMinutes = timeToMinutes(activity.endTime);
            return startMinutes !== endMinutes;
        });
    }

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
        updateBlockDisplay(block, startMinutes, endMinutes, timeline.offsetWidth, false);
    });

    // Update undo button state
    const undoBtn = document.getElementById('undoBtn');
    undoBtn.disabled = activityHistory.length === 0;
}

function updateBlockDisplay(block, startMinutes, endMinutes, timelineWidth, showTimeLabel = false) {
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
        const currentMinutes = snapToGrid(positionToMinutes(e.offsetX, timelineWidth));

        // If mouse has moved significantly, consider it a drag
        if (Math.abs(e.offsetX - startX) > 5) {
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
        
        if (start === end || hasOverlap(start, end)) {
            currentBlock.remove();
            return;
        }

        const activityData = {
            activity: selectedActivity.name,
            startTime: formatTimeHHMM(start),
            endTime: formatTimeHHMM(end),
            color: selectedActivity.color
        };

        // Add activity to timeline and history
        timelineData.push(activityData);
        activityHistory.push({
            type: 'add',
            data: { ...activityData }
        });
        
        currentBlock.classList.remove('preview');
        updateBlockDisplay(currentBlock, start, end, timelineWidth, false);
        
        validateAndCleanActivities();
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
            const minuteMarker = document.createElement('div');
            minuteMarker.className = 'minute-marker';
            minuteMarker.style.left = `${(i - 4 + j/6) * (100/24)}%`;
            timeline.appendChild(minuteMarker);
        }
    }
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        // Hard reset - clear everything regardless of current state
        timelineData = [];
        activityHistory = [];
        
        // Remove all blocks
        const timeline = document.querySelector('.timeline');
        const blocks = timeline.querySelectorAll('.activity-block');
        blocks.forEach(block => block.remove());
        
        // Disable undo button
        const undoBtn = document.getElementById('undoBtn');
        undoBtn.disabled = true;
    });

    const undoBtn = document.getElementById('undoBtn');
    undoBtn.addEventListener('click', () => {
        if (activityHistory.length === 0) return;

        const lastAction = activityHistory.pop();
        
        if (lastAction.type === 'add') {
            // Remove the last added activity
            timelineData.pop();
        }
        
        // Directly update display without validation
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
            updateBlockDisplay(block, startMinutes, endMinutes, timeline.offsetWidth, false);
        });
        
        // Update undo button state
        undoBtn.disabled = activityHistory.length === 0;
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
}

async function init() {
    try {
        initTimeline();
        const categories = await fetchActivities();
        renderActivities(categories);
        initTimelineInteraction();
        initButtons();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('activitiesContainer').innerHTML = 
            '<p style="color: red;">Error loading activities. Please refresh the page to try again. Error: ' + error.message + '</p>';
    }
}

init();
