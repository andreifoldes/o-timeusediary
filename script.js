// Remove this line:
// import interact from 'https://cdn.interactjs.io/v1.10.27/interactjs/index.js';

let selectedActivity = null;
let timelineData = [];

const MINUTES_PER_DAY = 24 * 60;
const INCREMENT_MINUTES = 10;
const DEFAULT_ACTIVITY_LENGTH = 10;
const TIMELINE_START_HOUR = 4;
const TIMELINE_HOURS = 24;

const DEBUG_MODE = true; // Enable debug mode

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

// Find the nearest 10-minute markers for a given time
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
                
                if (j === 3) {
                    minuteMarker.classList.add('minute-marker-30');
                }
                
                minuteMarker.style.left = `${leftPosition}%`;
                timeline.appendChild(minuteMarker);
            }
        }
    }

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
    
    const existingLabels = document.querySelectorAll('.time-label');
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
    
    const existingLabels = document.querySelectorAll('.time-label');
    existingLabels.forEach(existingLabel => {
        if (existingLabel !== label && isOverlapping(existingLabel, label)) {
            label.style.bottom = 'auto';
            label.style.top = '-20px';
        }
    });
}

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
    
    timeline.addEventListener('click', (e) => {
        if (!selectedActivity || e.target.closest('.activity-block')) return;

        const rect = timeline.getBoundingClientRect();
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

        currentBlock = document.createElement('div');
        currentBlock.className = 'activity-block';
        currentBlock.style.backgroundColor = selectedActivity.color;
        currentBlock.textContent = selectedActivity.name;
        
        // Convert minutes to percentage for positioning
        const startPositionPercent = minutesToPercentage(startMinutes);
        const endPositionPercent = minutesToPercentage(endMinutes);
        let blockWidth = endPositionPercent - startPositionPercent;
        
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
        timeline.appendChild(currentBlock);

        const timeLabel = createTimeLabel(currentBlock);
        updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes), formatTimeHHMM(endMinutes));

        const activityData = {
            id: generateUniqueId(),
            activity: selectedActivity.name,
            startTime: formatTimeDDMMYYYYHHMM(startMinutes),
            endTime: formatTimeDDMMYYYYHHMM(endMinutes),
            color: selectedActivity.color
        };
        timelineData.push(activityData);
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
                        min: { width: (INCREMENT_MINUTES / (TIMELINE_HOURS * 60)) * 100 }
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
                        
                        let widthPercent = (event.rect.width / timelineWidth) * 100;
                        const leftPercent = parseFloat(target.style.left);
                        
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
                        const blockData = timelineData.find(activity => activity.id === blockId);
                        if (blockData) {
                            const leftPercent = parseFloat(event.target.style.left);
                            const widthPercent = parseFloat(event.target.style.width);
                            const newStartMinutes = Math.round((leftPercent / 100) * TIMELINE_HOURS * 60 + TIMELINE_START_HOUR * 60);
                            const widthInMinutes = (widthPercent / 100) * TIMELINE_HOURS * 60;
                            const roundedWidthMinutes = Math.round(widthInMinutes / INCREMENT_MINUTES) * INCREMENT_MINUTES;
                            const newEndMinutes = Math.round(newStartMinutes + roundedWidthMinutes);
                            
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

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        if (timelineData.length > 0) {
            const timeline = document.getElementById('timeline');
            const activityBlocks = timeline.querySelectorAll('.activity-block');
            activityBlocks.forEach(block => block.remove());

            timelineData = [];

            updateButtonStates();

            logDebugInfo();
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

    document.getElementById('undoBtn').addEventListener('click', () => {
        if (timelineData.length > 0) {
            if (DEBUG_MODE) {
                console.log('Before undo - timelineData length:', timelineData.length);
                console.log('Current blocks:', document.querySelectorAll('.activity-block').length);
            }

            const lastActivity = timelineData.pop();
            
            if (DEBUG_MODE) {
                console.log('Removing activity:', lastActivity);
                console.log('After pop - timelineData length:', timelineData.length);
            }

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
