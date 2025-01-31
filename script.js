import { TimelineMarker } from './timeline_marker.js';
import { Timeline } from './timeline.js';
import { TimelineContainer } from './timeline_container.js';
import { 
    getCurrentTimelineData, 
    getCurrentTimelineKey, 
    createTimelineDataFrame, 
    sendData,
    validateMinCoverage,
    getTimelineCoverage,
    calculateTimeDifference
} from './utils.js';
import { updateIsMobile, getIsMobile } from './globals.js';
import { 
    createModal, 
    createFloatingAddButton, 
    updateFloatingButtonPosition, 
    updateButtonStates, 
    initButtons,
    updateDebugOverlay,
    hideDebugOverlay,
    updateGradientBarLayout,
    scrollToActiveTimeline,
    updateTimelineCountVariable,
    initDebugOverlay,
    handleResize
} from './ui.js';
import { 
    DEBUG_MODE,
    MINUTES_PER_DAY,
    INCREMENT_MINUTES,
    DEFAULT_ACTIVITY_LENGTH,
    TIMELINE_START_HOUR,
    TIMELINE_HOURS
} from './constants.js';

let selectedActivity = null;

// Single timeline management object
window.timelineManager = {
    metadata: {}, // Timeline metadata (former timelines object)
    activities: {}, // Timeline activities (former timelineData object)
    initialized: new Set(), // Tracks initialized timelines
    activeTimeline: document.getElementById('primary'), // Initialize with primary timeline
    keys: [], // Available timeline keys
    currentIndex: 0, // Current timeline index
    study: {} // Store URL parameters
};

// Only create and populate study parameters if URL parameters exist
const urlParams = new URLSearchParams(window.location.search);
if(urlParams.toString()) {
    for (const [key, value] of urlParams) {
        window.timelineManager.study[key] = value;
    }
}

// Function to calculate timeline coverage in minutes
window.getTimelineCoverage = getTimelineCoverage;

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
    generateUniqueId,
    createTimeLabel,
    updateTimeLabel
} from './utils.js';

// Function to add next timeline
async function addNextTimeline() {
    if (DEBUG_MODE) {
        console.log(`Current timeline data saved:`, window.timelineManager.activities);
    }

    // Increment timeline index
    window.timelineManager.currentIndex++;
    if (window.timelineManager.currentIndex >= window.timelineManager.keys.length && DEBUG_MODE) {
        console.log('All timelines initialized');
        return;
    }

    const nextTimelineKey = window.timelineManager.keys[window.timelineManager.currentIndex];

    try {
        // Load next timeline data
        const categories = await fetchActivities(nextTimelineKey);
        
        const isMobile = getIsMobile();
        
        // Update UI for next timeline with animation
        const nextTimeline = window.timelineManager.metadata[nextTimelineKey];
        const timelineHeader = document.querySelector('.timeline-header');
        const timelineTitle = document.querySelector('.timeline-title');
        const timelineDescription = document.querySelector('.timeline-description');
        
        // First remove any existing animation
        timelineHeader.classList.remove('flip-animation');
        
        // Force a reflow before starting new animation
        void timelineHeader.offsetWidth;
        
        // Add animation class before content change
        timelineHeader.classList.add('flip-animation');
        
        // Update content immediately
        timelineTitle.textContent = nextTimeline.name;
        timelineDescription.textContent = nextTimeline.description;
        
        // Trigger reflow to ensure animation plays
        void timelineHeader.offsetWidth;
        
        // Add animation class
        timelineHeader.classList.add('flip-animation');
        
        // Remove animation class after it finishes
        timelineHeader.addEventListener('animationend', () => {
            timelineHeader.classList.remove('flip-animation');
        }, {once: true});

        // Desktop mode - create new timeline container
        const newTimelineContainer = document.createElement('div');
        newTimelineContainer.className = 'timeline-container';
        
        // Add title element
        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = window.timelineManager.metadata[nextTimelineKey].name;
        newTimelineContainer.appendChild(titleDiv);
        
        const newTimeline = document.createElement('div');
        newTimeline.className = 'timeline';
        newTimelineContainer.appendChild(newTimeline);
        
        // Add new timeline to active wrapper
        const activeTimelineWrapper = document.querySelector('.last-initialized-timeline-wrapper');
        activeTimelineWrapper.appendChild(newTimelineContainer);
        
        // Only update previous timeline state if we have at least 2 initialized timelines
        if (window.timelineManager.initialized.size >= 2) {
            const previousTimeline = window.timelineManager.activeTimeline;
            if (previousTimeline) {
                previousTimeline.setAttribute('data-active', 'false');
                previousTimeline.parentElement.setAttribute('data-active', 'false');
                
                // Move the previous timeline to the inactive wrapper
                const inactiveTimelinesWrapper = document.querySelector('.past-initialized-timelines-wrapper');
                inactiveTimelinesWrapper.appendChild(previousTimeline.parentElement);
                
                // Update timeline count variable
                updateTimelineCountVariable();
            }
        }
        
        // Initialize new timeline and container with proper IDs and mode
        newTimeline.id = nextTimelineKey;
        newTimeline.setAttribute('data-timeline-type', nextTimelineKey);
        newTimeline.setAttribute('data-active', 'true');
        newTimeline.setAttribute('data-mode', window.timelineManager.metadata[nextTimelineKey].mode);
        newTimelineContainer.setAttribute('data-active', 'true');
        
        // Create and initialize timeline container with markers
        const timelineContainer = new TimelineContainer(newTimeline);
        timelineContainer.initialize(isMobile).createMarkers(isMobile);
        newTimeline.containerInstance = timelineContainer;
        
        // Set active timeline reference
        window.timelineManager.activeTimeline = newTimeline;

        // Create activities container if it doesn't exist
        let activitiesContainer = window.timelineManager.activeTimeline.querySelector('.activities');
        if (!activitiesContainer) {
            activitiesContainer = document.createElement('div');
            activitiesContainer.className = 'activities';
            window.timelineManager.activeTimeline.appendChild(activitiesContainer);
        }


        // Initialize activities array if not exists
        window.timelineManager.activities[nextTimelineKey] = window.timelineManager.activities[nextTimelineKey] || [];

        // Scroll to active timeline in mobile view
        if (getIsMobile()) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Initialize markers for the new timeline
        initTimeline(window.timelineManager.activeTimeline);

        // Render activities for next timeline
        renderActivities(categories);
        
        // Initialize interaction for the timeline
        initTimelineInteraction(window.timelineManager.activeTimeline);

        // Reset button states
        updateButtonStates();

        // Scroll to the active timeline
        scrollToActiveTimeline();

        if (DEBUG_MODE) {
            console.log(`Switched to ${nextTimelineKey} timeline`);
            console.log('Timeline data structure:', window.timelineManager.activities);
        }

        // Update Back button state
        const backButton = document.getElementById('backBtn');
        if (backButton) {
            backButton.disabled = false;
        }

        // Update activities container data-mode
        const activitiesContainerElement = document.querySelector("#activitiesContainer");
        if (activitiesContainerElement) {
            activitiesContainerElement.setAttribute('data-mode', window.timelineManager.metadata[nextTimelineKey].mode);
        }

        // Update floating button position after timeline changes
        updateFloatingButtonPosition();

    } catch (error) {
        console.error(`Error switching to ${nextTimelineKey} timeline:`, error);
        throw new Error(`Failed to switch to ${nextTimelineKey} timeline: ${error.message}`);
    }
}

function logDebugInfo() {
    if (DEBUG_MODE) {
        console.log('timelineData:', timelineData);
    }
}

async function fetchActivities(key) {
    try {
        const response = await fetch('settings/activities.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data || !data.timeline || !data.general) {
            throw new Error('Invalid JSON structure');
        }

        // Set app name in document title once
        document.title = data.general.app_name;
        
        // Validate min_coverage
        if (data.timeline[key]) {
            try {
                validateMinCoverage(data.timeline[key].min_coverage);
            } catch (error) {
                const errorMessage = `Timeline "${key}": ${error.message}`;
                document.getElementById('activitiesContainer').innerHTML = 
                    `<p style="color: red; padding: 10px; background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px;">
                        ${errorMessage}
                    </p>`;
                throw new Error(errorMessage);
            }
        }

        // Initialize timeline management structure if not already initialized
        if (Object.keys(timelineManager.metadata).length === 0) {
            // Only use timeline keys, excluding 'general'
            timelineManager.keys = Object.keys(data.timeline);
            timelineManager.keys.forEach(timelineKey => {
                if (data.timeline[timelineKey]) {
                    timelineManager.metadata[timelineKey] = new Timeline(timelineKey, data.timeline[timelineKey]);
                    timelineManager.activities[timelineKey] = [];
                }
            });
            if (DEBUG_MODE) {
                console.log('Initialized timeline structure:', timelineManager);
            }
        }

        const timeline = data.timeline[key];
        if (!timeline || !timeline.categories) {
            throw new Error(`Invalid timeline data for key: ${key}`);
        }
        
        // Mark timeline as initialized
        window.timelineManager.initialized.add(key);
        
        if (DEBUG_MODE) {
            console.log(`Loaded timeline metadata for ${key}:`, window.timelineManager.metadata[key]);
            console.log('All available timelines in activities.json:', Object.keys(data));
            console.log('Full timeline data:', data);
            console.log('Initialized timelines:', Array.from(window.timelineManager.initialized));
        }
        
        return data.timeline[key].categories;
    } catch (error) {
        console.error('Error loading activities:', error);
        throw error;
    }
}

function renderActivities(categories, container = document.getElementById('activitiesContainer')) {
    container.innerHTML = '';
    
    // Set data-mode attribute based on current timeline's mode
    const currentKey = getCurrentTimelineKey();
    if (currentKey && window.timelineManager.metadata[currentKey]) {
        container.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
    }

    const isMobile = getIsMobile();
    const isModal = container.id === 'modalActivitiesContainer';

    // Only create accordion if this is the modal container and in mobile view
    if (isMobile && isModal) {
        const accordionContainer = document.createElement('div');
        accordionContainer.className = 'activities-accordion';
        // Set data-mode attribute to match current timeline's mode
        const currentKey = getCurrentTimelineKey();
        if (currentKey && window.timelineManager.metadata[currentKey]) {
            accordionContainer.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
        }

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'activity-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.name;
            categoryDiv.appendChild(categoryTitle);

            const activityButtonsDiv = document.createElement('div');
            activityButtonsDiv.className = 'activity-buttons';

            category.activities.forEach(activity => {
                const activityButton = document.createElement('button');
                const isMultipleChoice = container.getAttribute('data-mode') === 'multiple-choice';
                activityButton.className = `activity-button ${isMultipleChoice ? 'checkbox-style' : ''}`;
                activityButton.style.setProperty('--color', activity.color);
                
                if (isMultipleChoice) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'checkmark';
                    activityButton.appendChild(checkmark);
                }
                
                const textSpan = document.createElement('span');
                textSpan.className = 'activity-text';
                textSpan.textContent = activity.name;
                activityButton.appendChild(textSpan);
                activityButton.addEventListener('click', () => {
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    const isMultipleChoice = activitiesContainer.getAttribute('data-mode') === 'multiple-choice';
                    const categoryButtons = activityButton.closest('.activity-category').querySelectorAll('.activity-button');
                    
                    // Check if this is the "other not listed" button
                    if (activityButton.querySelector('.activity-text').textContent.includes('other not listed (enter)')) {
                        // Show custom activity modal
                        const customActivityModal = document.getElementById('customActivityModal');
                        const customActivityInput = document.getElementById('customActivityInput');
                        customActivityInput.value = ''; // Clear previous input
                        customActivityModal.style.display = 'block';
                        
                        // Handle custom activity submission
                        const handleCustomActivity = () => {
                            const customText = customActivityInput.value.trim();
                            if (customText) {
                                if (isMultipleChoice) {
                                    activityButton.classList.add('selected');
                                    const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                                    selectedActivity = {
                                        selections: selectedButtons.map(btn => ({
                                            name: btn === activityButton ? customText : btn.querySelector('.activity-text').textContent,
                                            color: btn.style.getPropertyValue('--color')
                                        })),
                                        category: category.name
                                    };
                                } else {
                                    categoryButtons.forEach(b => b.classList.remove('selected'));
                                    selectedActivity = {
                                        name: customText,
                                        color: activityButton.style.getPropertyValue('--color'),
                                        category: category.name
                                    };
                                    activityButton.classList.add('selected');
                                }
                                customActivityModal.style.display = 'none';
                                document.getElementById('activitiesModal').style.display = 'none';
                            }
                        };

                        // Set up event listeners for custom activity modal
                        const confirmBtn = document.getElementById('confirmCustomActivity');
                        const inputField = document.getElementById('customActivityInput');
                        
                        // Remove any existing listeners
                        const newConfirmBtn = confirmBtn.cloneNode(true);
                        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                        
                        // Add new listeners
                        newConfirmBtn.addEventListener('click', handleCustomActivity);
                        inputField.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleCustomActivity();
                            }
                        });
                        
                        return;
                    }
                    
                    if (isMultipleChoice) {
                        // Toggle selection for this button
                        activityButton.classList.toggle('selected');
            
                        // Get all selected activities in this category
                        const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
            
                        if (selectedButtons.length > 0) {
                            selectedActivity = {
                                selections: selectedButtons.map(btn => ({
                                    name: btn.textContent,
                                    color: btn.style.getPropertyValue('--color')
                                })),
                                category: category.name
                            };
                        } else {
                            selectedActivity = null;
                        }
                    } else {
                        // Single choice mode
                        categoryButtons.forEach(b => b.classList.remove('selected'));
                        selectedActivity = {
                            name: activity.name,
                            color: activity.color,
                            category: category.name
                        };
                        activityButton.classList.add('selected');
                    }
                    // Only close modal in single-choice mode
                    if (!isMultipleChoice) {
                        const modal = document.querySelector('.modal-overlay');
                        if (modal) {
                            modal.style.display = 'none';
                        }
                    }
                });
                activityButtonsDiv.appendChild(activityButton);
            });

            categoryDiv.appendChild(activityButtonsDiv);
            accordionContainer.appendChild(categoryDiv);
        });

        container.appendChild(accordionContainer);

        // Add click event listener to category titles
        const categoryTitles = accordionContainer.querySelectorAll('.activity-category h3');
        categoryTitles.forEach(title => {
            title.addEventListener('click', () => {
                const category = title.parentElement;
                category.classList.toggle('active');
            });
        });
    } else {
        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'activity-category';

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.name;
            categoryDiv.appendChild(categoryTitle);

            const activityButtonsDiv = document.createElement('div');
            activityButtonsDiv.className = 'activity-buttons';

            category.activities.forEach(activity => {
                const activityButton = document.createElement('button');
                const isMultipleChoice = container.getAttribute('data-mode') === 'multiple-choice';
                activityButton.className = `activity-button ${isMultipleChoice ? 'checkbox-style' : ''}`;
                activityButton.style.setProperty('--color', activity.color);
                
                if (isMultipleChoice) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'checkmark';
                    activityButton.appendChild(checkmark);
                }
                
                const textSpan = document.createElement('span');
                textSpan.className = 'activity-text';
                textSpan.textContent = activity.name;
                activityButton.appendChild(textSpan);
                activityButton.addEventListener('click', () => {
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    const isMultipleChoice = activitiesContainer.getAttribute('data-mode') === 'multiple-choice';
                    const categoryButtons = activityButton.closest('.activity-category').querySelectorAll('.activity-button');
                    
                    // Check if this is the "other not listed" button
                    if (activity.name.includes('other not listed (enter)')) {
                        // Show custom activity modal
                        const customActivityModal = document.getElementById('customActivityModal');
                        const customActivityInput = document.getElementById('customActivityInput');
                        customActivityInput.value = ''; // Clear previous input
                        customActivityModal.style.display = 'block';
                        customActivityInput.focus(); // Focus the input field
                        
                        // Handle custom activity submission
                        const handleCustomActivity = () => {
                            const customText = customActivityInput.value.trim();
                            if (customText) {
                                if (isMultipleChoice) {
                                    activityButton.classList.add('selected');
                                    const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                                    selectedActivity = {
                                        selections: selectedButtons.map(btn => ({
                                            name: btn === activityButton ? customText : btn.querySelector('.activity-text').textContent,
                                            color: btn.style.getPropertyValue('--color')
                                        })),
                                        category: category.name
                                    };
                                } else {
                                    categoryButtons.forEach(b => b.classList.remove('selected'));
                                    selectedActivity = {
                                        name: customText,
                                        color: activity.color,
                                        category: category.name
                                    };
                                    activityButton.classList.add('selected');
                                }
                                customActivityModal.style.display = 'none';
                                document.getElementById('activitiesModal').style.display = 'none';
                            }
                        };

                        // Set up event listeners for custom activity modal
                        const confirmBtn = document.getElementById('confirmCustomActivity');
                        const inputField = document.getElementById('customActivityInput');
                        
                        // Remove any existing listeners
                        const newConfirmBtn = confirmBtn.cloneNode(true);
                        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                        
                        // Add new listeners
                        newConfirmBtn.addEventListener('click', handleCustomActivity);
                        inputField.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleCustomActivity();
                            }
                        });
                        
                        return;
                    }
                    
                    if (isMultipleChoice) {
                        // Toggle selection for this button
                        activityButton.classList.toggle('selected');
            
                        // Get all selected activities in this category
                        const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
            
                        if (selectedButtons.length > 0) {
                            selectedActivity = {
                                selections: selectedButtons.map(btn => ({
                                    name: btn.querySelector('.activity-text').textContent,
                                    color: btn.style.getPropertyValue('--color')
                                })),
                                category: category.name
                            };
                        } else {
                            selectedActivity = null;
                        }
                    } else {
                        // Single choice mode
                        categoryButtons.forEach(b => b.classList.remove('selected'));
                        selectedActivity = {
                            name: activity.name,
                            color: activity.color,
                            category: category.name
                        };
                        activityButton.classList.add('selected');
                    }
                });
                activityButtonsDiv.appendChild(activityButton);
            });

            categoryDiv.appendChild(activityButtonsDiv);
            container.appendChild(categoryDiv);
        });
    }
}

function initTimeline(timeline) {
    timeline.setAttribute('data-active', 'true');
    timeline.setAttribute('data-layout', getIsMobile() ? 'vertical' : 'horizontal');

    // Remove existing markers
    if (timeline.containerInstance && timeline.containerInstance.hourLabelsContainer) {
        timeline.containerInstance.hourLabelsContainer.innerHTML = '';
    }
    
    // Create and initialize timeline container
    const timelineContainer = new TimelineContainer(timeline);
    timelineContainer.initialize(getIsMobile()).createMarkers(getIsMobile());
    
    // Store the container instance and markers on the timeline element for later access
    timeline.containerInstance = timelineContainer;
    timeline.markers = timelineContainer.markers || [];

    // Add window resize handler to update marker positions
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth < 1440;
        timeline.setAttribute('data-layout', newIsMobile ? 'vertical' : 'horizontal');
        
        // Update dimensions on layout change
        if (newIsMobile) {
            const minHeight = '2500px';
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
        
        // Update all markers and their labels if they exist
        if (timeline.markers && timeline.markers.length > 0) {
            timeline.markers.forEach(marker => marker.update(newIsMobile));
        }
    });

    if (DEBUG_MODE) {
        timeline.addEventListener('mousemove', (e) => {
            const rect = timeline.getBoundingClientRect();
            updateDebugOverlay(e.clientX, e.clientY, rect);
        });

        timeline.addEventListener('mouseleave', () => {
            hideDebugOverlay();
        });
    }
}

// Add validation function before the interact.js initialization
function validateActivityBlockTransformation(startMinutes, endMinutes, target) {
    const MIN_BLOCK_LENGTH = 10; // Minimum block length in minutes
    const TIMELINE_START = 240; // 4:00 AM in minutes
    const TIMELINE_END = 1680; // 4:00 AM next day in minutes

    // Normalize end minutes if it wraps to next day
    const normalizedEndMinutes = endMinutes < startMinutes ? endMinutes + 1440 : endMinutes;

    // Calculate block length
    const blockLength = normalizedEndMinutes - startMinutes;

    // Validation checks
    if (blockLength <= 0 || blockLength < MIN_BLOCK_LENGTH) {
        console.warn('Invalid block length:', {
            startTime: formatTimeHHMM(startMinutes),
            endTime: formatTimeHHMM(endMinutes),
            length: blockLength,
            minLength: MIN_BLOCK_LENGTH
        });
        return false;
    }

    if (startMinutes < TIMELINE_START || endMinutes > TIMELINE_END) {
        console.warn('Time out of valid range:', {
            startTime: formatTimeHHMM(startMinutes),
            endTime: formatTimeHHMM(endMinutes),
            validRange: '04:00-04:00(+1)'
        });
        return false;
    }

    return true;
}

function initTimelineInteraction(timeline) {
    if (!timeline) {
        console.error('Timeline must be provided to initTimelineInteraction');
        return;
    }
    const targetTimeline = timeline;
    
    // Initialize interact.js resizable
    interact('.activity-block').resizable({
        onstart: function(event) {
            // Store original values before resize
            const target = event.target;
            target.dataset.originalStart = target.dataset.start;
            target.dataset.originalEnd = target.dataset.end;
            target.dataset.originalLength = target.dataset.length;
            target.dataset.originalHeight = target.style.height;
            target.dataset.originalLeft = target.style.left;
            target.dataset.originalTop = target.style.top;
            target.dataset.originalWidth = target.style.width;  // Add original width
            // Store original raw minutes
            target.dataset.originalStartMinutes = target.dataset.startMinutes || timeToMinutes(target.dataset.start);
            target.dataset.originalEndMinutes = target.dataset.endMinutes || timeToMinutes(target.dataset.end);
        },
        edges: { 
            right: !getIsMobile(), 
            left: !getIsMobile(),
            bottom: getIsMobile(),
            top: getIsMobile()
        },
        modifiers: [
            interact.modifiers.restrictEdges({
                outer: '.timeline',
                endOnly: true
            }),
            interact.modifiers.restrictSize({
                min: { width: 10, height: 10 }
            }),
            // Add snap modifier for 10-minute intervals
            interact.modifiers.snap({
                targets: [
                    interact.snappers.grid({
                        x: timelineRect => (10 / (24 * 60)) * timelineRect.width, // 10-minute intervals
                        y: timelineRect => (10 / (24 * 60)) * timelineRect.height
                    })
                ],
                range: Infinity,
                relativePoints: [ { x: 0, y: 0 } ]
            })
        ],
        inertia: false,
        listeners: {
            start(event) {
                event.target.classList.add('resizing');
            },
            move(event) {
                const target = event.target;
                const timelineRect = targetTimeline.getBoundingClientRect();
                let startMinutes, endMinutes;
                
                target.classList.add('resizing');
                
                if (getIsMobile()) {
                    // Mobile: Handle vertical resizing
                    if (event.edges.top) {
                        // Get raw cursor position from event coordinates
                        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
                        const timelineRect = targetTimeline.getBoundingClientRect();
                        
                        // Calculate relative Y position within timeline bounds
                        const relativeY = clientY - timelineRect.top;
                        const clampedRelativeY = Math.max(0, Math.min(relativeY, timelineRect.height));
                        const positionPercent = (clampedRelativeY / timelineRect.height) * 100;
                        
                        // Convert to raw minutes using timeline-based position
                        const rawMinutes = positionToMinutes(positionPercent, true);
                        startMinutes = Math.round(rawMinutes / 10) * 10;
                        
                        // Keep original end time fixed
                        endMinutes = parseInt(target.dataset.endMinutes);

                        // Debug logging with accurate values
                        if (DEBUG_MODE) {
                            console.log('[Resize Top Edge]:', {
                                clientY,
                                timelineTop: timelineRect.top,
                                relativeY: clampedRelativeY,
                                timelineHeight: timelineRect.height,
                                position: positionPercent.toFixed(2) + '%',
                                time: formatTimeHHMM(startMinutes),
                                startMinutes,
                                endMinutes
                            });
                        }

                        // Validate time order
                        if (startMinutes >= endMinutes) {
                            console.warn('Invalid resize detected (vertical/top): Start time would be after end time', {
                                startTime: formatTimeHHMM(startMinutes),
                                endTime: formatTimeHHMM(endMinutes),
                                blockId: target.dataset.id
                            });
                            target.style.top = target.dataset.originalTop;
                            target.style.height = target.dataset.originalHeight;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Validate transformations
                        if (!validateActivityBlockTransformation(startMinutes, endMinutes, target)) {
                            console.warn('Invalid resize detected (vertical/top): Invalid block transformation', {
                                startTime: formatTimeHHMM(startMinutes),
                                endTime: formatTimeHHMM(endMinutes),
                                blockId: target.dataset.id,
                                reason: 'Block transformation validation failed'
                            });
                            target.style.top = target.dataset.originalTop;
                            target.style.height = target.dataset.originalHeight;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Check for overlaps
                        if (!canPlaceActivity(startMinutes, endMinutes, target.dataset.id)) {
                            console.warn('Invalid resize detected (vertical/top): Activity overlap', {
                                startTime: formatTimeHHMM(startMinutes),
                                endTime: formatTimeHHMM(endMinutes),
                                blockId: target.dataset.id
                            });
                            target.style.top = target.dataset.originalTop;
                            target.style.height = target.dataset.originalHeight;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Update position and size using percentages
                        target.style.top = `${minutesToPercentage(startMinutes)}%`;
                        target.style.height = `${((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100}%`;

                    } else if (event.edges.bottom) {
                        // Keep original start time fixed
                        startMinutes = parseInt(target.dataset.startMinutes);
                        
                        // Get cursor position from event coordinates instead of element rect
                        const clientY = getIsMobile() ? (event.touches ? event.touches[0].clientY : event.clientY) : event.clientY;
                        const timelineRect = targetTimeline.getBoundingClientRect();
                        
                        // Calculate relative Y position within timeline
                        const relativeY = clientY - timelineRect.top;
                        const positionPercent = Math.min(100, Math.max(0, (relativeY / timelineRect.height) * 100));
                        
                        // Convert to minutes using the actual cursor position
                        const rawMinutes = positionToMinutes(positionPercent, true);
                        endMinutes = Math.round(rawMinutes / 10) * 10;
                        
                        // Debug logging with corrected values
                        if (DEBUG_MODE) {
                            console.log('[Resize Bottom Edge]:', {
                                clientY: clientY,
                                timelineTop: timelineRect.top,
                                relativeY: relativeY,
                                timelineHeight: timelineRect.height,
                                position: positionPercent.toFixed(2) + '%',
                                time: formatTimeHHMM(endMinutes),
                                startMinutes: startMinutes,
                                endMinutes: endMinutes
                            });
                        }

                        // Add snap behavior for smoother resizing
                        const currentEndMinutes = parseInt(target.dataset.endMinutes);
                        const minutesDiff = Math.abs(endMinutes - currentEndMinutes);
                        
                        // Only update if the change is at least 10 minutes
                        if (minutesDiff >= 10) {
                            // Validate time order
                            if (endMinutes <= startMinutes) {
                                target.style.height = target.dataset.originalHeight;
                                target.classList.add('invalid');
                                setTimeout(() => target.classList.remove('invalid'), 400);
                                return;
                            }

                            // Validate transformations
                            if (!validateActivityBlockTransformation(startMinutes, endMinutes, target)) {
                                target.style.height = target.dataset.originalHeight;
                                target.classList.add('invalid');
                                setTimeout(() => target.classList.remove('invalid'), 400);
                                return;
                            }

                            // Check for overlaps
                            if (!canPlaceActivity(startMinutes, endMinutes, target.dataset.id)) {
                                target.style.height = target.dataset.originalHeight;
                                target.classList.add('invalid');
                                setTimeout(() => target.classList.remove('invalid'), 400);
                                return;
                            }

                            // Update size using percentages
                            target.style.height = `${((endMinutes - startMinutes) / MINUTES_PER_DAY) * 100}%`;
                        }
                    }
                } else {
                    // Desktop: Handle left and right edge resizing differently
                    const tenMinutesWidth = (10 / (24 * 60)) * 100; // Width of 10-minute interval as percentage
                    
                    if (event.edges.left) {
                        // Left edge resizing - adjust start time
                        const newLeft = (event.rect.left - timelineRect.left) / timelineRect.width * 100;
                        startMinutes = positionToMinutes(newLeft);
                        endMinutes = timeToMinutes(target.dataset.originalEnd);

                        // Debug logging with accurate values
                        if (DEBUG_MODE) {
                            console.log('[Resize Left Edge]:', {
                                newLeft: newLeft.toFixed(2) + '%',
                                time: formatTimeHHMM(startMinutes),
                                startMinutes,
                                endMinutes
                            });
                        }

                        // Validate time order
                        if (startMinutes >= endMinutes && !target.dataset.originalEnd.includes('(+1)')) {
                            console.warn('Invalid resize detected (horizontal/left): Start time would be after end time', {
                                startTime: formatTimeHHMM(startMinutes),
                                endTime: formatTimeHHMM(endMinutes),
                                blockId: target.dataset.id
                            });
                            target.style.left = target.dataset.originalLeft;
                            target.style.width = target.dataset.originalWidth;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Validate transformations
                        if (!validateActivityBlockTransformation(startMinutes, endMinutes, target)) {
                            console.warn('Invalid resize detected (horizontal/left): Invalid block transformation', {
                                startTime: formatTimeHHMM(startMinutes),
                                endTime: formatTimeHHMM(endMinutes),
                                blockId: target.dataset.id,
                                reason: 'Block transformation validation failed'
                            });
                            target.style.left = target.dataset.originalLeft;
                            target.style.width = target.dataset.originalWidth;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Check for overlaps
                        if (!canPlaceActivity(startMinutes, endMinutes, target.dataset.id)) {
                            console.warn('Invalid resize detected (horizontal/left): Activity overlap', {
                                startTime: formatTimeHHMM(startMinutes),
                                endTime: formatTimeHHMM(endMinutes),
                                blockId: target.dataset.id
                            });
                            target.style.left = target.dataset.originalLeft;
                            target.style.width = target.dataset.originalWidth;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Calculate the actual width needed based on time difference
                        const timeDiff = endMinutes - startMinutes;
                        const adjustedWidth = (timeDiff / MINUTES_PER_DAY) * 100;

                        // Update position and size using percentages
                        target.style.left = `${minutesToPercentage(startMinutes)}%`;
                        target.style.width = `${adjustedWidth}%`;

                    } else if (event.edges.right) {
                        // Right edge resizing - adjust end time
                        startMinutes = timeToMinutes(target.dataset.originalStart);
                        const absoluteStartMinutes = startMinutes + 240; // Convert to absolute time
                        
                        // Get cursor position from event coordinates
                        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
                        const timelineRect = targetTimeline.getBoundingClientRect();
                        
                        // Calculate relative X position within timeline bounds
                        const relativeX = clientX - timelineRect.left;
                        const clampedRelativeX = Math.max(0, Math.min(relativeX, timelineRect.width));
                        const positionPercent = (clampedRelativeX / timelineRect.width) * 100;
                        
                        // Convert to raw minutes using timeline-based position
                        const rawMinutes = positionToMinutes(positionPercent, false);
                        endMinutes = Math.round(rawMinutes / 10) * 10;

                        // Convert to absolute time for validation and formatting
                        const absoluteEndMinutes = endMinutes;

                        // Special case: if we're very close to the end of timeline (100%)
                        const SNAP_THRESHOLD = 99.65;
                        if (positionPercent >= SNAP_THRESHOLD) {
                            endMinutes = MINUTES_PER_DAY + (4 * 60); // 04:00(+1)
                        }

                        // Validate transformations with absolute times
                        if (!validateActivityBlockTransformation(absoluteStartMinutes, absoluteEndMinutes, target)) {
                            console.warn('Invalid resize detected (horizontal/right): Invalid block transformation', {
                                startTime: formatTimeHHMM(absoluteStartMinutes, false),
                                endTime: formatTimeHHMM(absoluteEndMinutes, true),
                                blockId: target.dataset.id,
                                reason: 'Block transformation validation failed'
                            });
                            target.style.width = target.dataset.originalWidth;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }

                        // Update dataset with correct absolute times
                        const newStartTime = formatTimeHHMM(absoluteStartMinutes, false);
                        const newEndTime = formatTimeHHMM(absoluteEndMinutes, true);
                        
                        // Calculate time difference using absolute values
                        const timeDiff = absoluteEndMinutes - absoluteStartMinutes;
                        const adjustedWidth = (timeDiff / MINUTES_PER_DAY) * 100;

                        // Update element styles and dataset
                        target.style.width = `${adjustedWidth}%`;
                        target.dataset.start = newStartTime;
                        target.dataset.end = newEndTime;
                        target.dataset.length = timeDiff;
                        target.dataset.startMinutes = absoluteStartMinutes;
                        target.dataset.endMinutes = absoluteEndMinutes;
                        
                        // Update time label with correct absolute times
                        updateTimeLabel(timeLabel, newStartTime, newEndTime, target);
                    }
                }
                
                // Update time label and dataset
                const timeLabel = target.querySelector('.time-label');
                if (timeLabel) {
                    // Format and update times - (+1) notation is handled automatically
                    const newStartTime = formatTimeHHMM(startMinutes, false);  // Start time
                    const newEndTime = formatTimeHHMM(endMinutes % MINUTES_PER_DAY, true);
                    
                    // Final validation to ensure we never have negative length
                    let timeDiff = endMinutes - startMinutes;
                    if (timeDiff < 0 && !newEndTime.includes('(+1)')) {
                        // If we have negative length and we're not spanning midnight, revert
                        target.dataset.start = target.dataset.originalStart;
                        target.dataset.end = target.dataset.originalEnd;
                        target.dataset.length = target.dataset.originalLength;
                        target.style.left = target.dataset.originalLeft;
                        target.style.width = `${parseFloat(target.dataset.originalLength) * (100 / 1440)}%`;
                        
                        console.warn('Invalid resize detected (final validation): Negative length', {
                            startTime: newStartTime,
                            endTime: newEndTime,
                            length: timeDiff,
                            blockId: target.dataset.id
                        });
                        
                        target.classList.add('invalid');
                        setTimeout(() => target.classList.remove('invalid'), 400);
                        return;
                    }
                    
                    target.dataset.start = newStartTime;
                    target.dataset.end = newEndTime;
                    target.dataset.length = timeDiff;
                    target.dataset.startMinutes = startMinutes;
                    target.dataset.endMinutes = endMinutes;
                    updateTimeLabel(timeLabel, newStartTime, newEndTime, target);
                    
                    // Update text class based on length and mode
                    const textDiv = target.querySelector('div[class^="activity-block-text"]');
                    if (textDiv) {
                        textDiv.className = getIsMobile()
                            ? (timeDiff >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow')
                            : (timeDiff >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-vertical');
                    }
                    
                    // Update the activity data in timelineManager
                    const activityId = target.dataset.id;
                    const currentData = getCurrentTimelineData();
                    const activityIndex = currentData.findIndex(activity => activity.id === activityId);
                    
                    if (activityIndex !== -1) {
                        const times = formatTimeDDMMYYYYHHMM(newStartTime, newEndTime);
                        if (!times.startTime || !times.endTime) {
                            throw new Error('Activity start time and end time must be defined');
                        }
                        currentData[activityIndex].startTime = times.startTime;
                        currentData[activityIndex].endTime = times.endTime;
                        currentData[activityIndex].blockLength = parseInt(target.dataset.length);

                        // Update original values incrementally
                        target.dataset.originalStart = newStartTime;
                        target.dataset.originalEnd = newEndTime;
                        target.dataset.originalLength = target.dataset.length;
                        target.dataset.originalHeight = target.style.height;
                        target.dataset.originalLeft = target.style.left;
                        target.dataset.originalTop = target.style.top;
                        
                        // Validate timeline after resizing activity
                        try {
                            const timelineKey = target.dataset.timelineKey;
                            if (!timelineKey) {
                                throw new Error('Timeline key not found on activity block');
                            }
                            window.timelineManager.metadata[timelineKey].validate();
                        } catch (error) {
                            console.error('Timeline validation failed:', error);
                            // Revert the change
                            target.dataset.start = target.dataset.originalStart;
                            target.dataset.end = target.dataset.originalEnd;
                            target.dataset.length = target.dataset.originalLength;
                            target.style.left = target.dataset.originalLeft;
                            target.style.width = `${parseFloat(target.dataset.originalLength) * (100 / 1440)}%`;
                            target.classList.add('invalid');
                            setTimeout(() => target.classList.remove('invalid'), 400);
                            return;
                        }
                    }
                }
            },
            end(event) {
                event.target.classList.remove('resizing');
                const textDiv = event.target.querySelector('div[class^="activity-block-text"]');
                const timeLabel = event.target.querySelector('.time-label');
                if (timeLabel) {
                    timeLabel.style.display = 'block';
                }
                if (textDiv) {
                    const length = parseInt(event.target.dataset.length);
                    textDiv.className = getIsMobile()
                        ? (length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow')
                        : (length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-vertical');
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
        
        const currentKey = getCurrentTimelineKey();
        // Check if timeline is full before proceeding
        if (isTimelineFull()) {
            const block = document.createElement('div');
            block.className = 'activity-block invalid';
            setTimeout(() => block.remove(), 400); // Remove after animation
            return;
        }
        
        // Ensure we're working with the current timeline data
        window.timelineManager.activities[currentKey] = getCurrentTimelineData();

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
            console.warn('Invalid activity placement attempt:', {
                activity: selectedActivity.name,
                startMinutes,
                endMinutes,
                reason: 'Activity cannot be placed at this position due to overlap or timeline bounds'
            });
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
        currentBlock.dataset.timelineKey = getCurrentTimelineKey();
        currentBlock.dataset.start = formatTimeHHMM(startMinutes);
        currentBlock.dataset.end = formatTimeHHMM(endMinutes);
        currentBlock.dataset.length = endMinutes - startMinutes;
        currentBlock.dataset.category = selectedActivity.category;
        currentBlock.dataset.mode = selectedActivity.selections ? 'multiple-choice' : 'single-choice';
        currentBlock.dataset.count = selectedActivity.selections ? selectedActivity.selections.length : 1;
        // Add raw minutes data attributes
        currentBlock.dataset.startMinutes = startMinutes;
        currentBlock.dataset.endMinutes = endMinutes;
        if (selectedActivity.selections) {
            // Multiple selections - create split background
            const colors = selectedActivity.selections.map(s => s.color);
            const isMobile = getIsMobile();
            const numSelections = colors.length;
            const percentage = 100 / numSelections;
            
            if (isMobile) {
                // Horizontal splits for mobile
                const stops = colors.map((color, index) => 
                    `${color} ${index * percentage}%, ${color} ${(index + 1) * percentage}%`
                ).join(', ');
                currentBlock.style.background = `linear-gradient(to right, ${stops})`;
            } else {
                // Vertical splits for desktop
                const stops = colors.map((color, index) => 
                    `${color} ${index * percentage}%, ${color} ${(index + 1) * percentage}%`
                ).join(', ');
                currentBlock.style.background = `linear-gradient(to bottom, ${stops})`;
            }
        } else {
            currentBlock.style.backgroundColor = selectedActivity.color;
        }
        const textDiv = document.createElement('div');
        let combinedActivityText;

        if (selectedActivity.selections) {
            if (DEBUG_MODE) {
                console.log('Multiple selections:', selectedActivity.selections);
            }
            // For multiple selections, join names with line break in the text div
            textDiv.innerHTML = selectedActivity.selections.map(s => s.name).join('<br>');
            // But join with vertical separator for storing in timelineManager 
            combinedActivityText = selectedActivity.selections.map(s => s.name).join(' | ');
        } else {
            textDiv.textContent = selectedActivity.name;
            combinedActivityText = selectedActivity.name;
        }
        textDiv.style.maxWidth = '90%';
        textDiv.style.overflow = 'hidden';
        textDiv.style.textOverflow = 'ellipsis';
        textDiv.style.whiteSpace = 'nowrap';
        // Set initial class based on length and mode
        const length = parseInt(currentBlock.dataset.length);

        // Always use narrow text in mobile mode, add wide and resized only if length >= 60
        textDiv.className = getIsMobile() 
            ? (length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-narrow')
            : (length >= 60 ? 'activity-block-text-narrow wide resized' : 'activity-block-text-vertical');
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
        currentBlock.dataset.start = formatTimeHHMM(startMinutes);
        currentBlock.dataset.end = formatTimeHHMM(adjustedEndMinutes % MINUTES_PER_DAY, true);
        currentBlock.dataset.length = adjustedEndMinutes - startMinutes;
        currentBlock.dataset.startMinutes = startMinutes;
        currentBlock.dataset.endMinutes = adjustedEndMinutes;

        // Fixed dimensions for consistency
        const MOBILE_BLOCK_WIDTH = 75; // 75% width in mobile mode
        const DESKTOP_BLOCK_HEIGHT = 90; // Changed from 60 to 90
        const MOBILE_OFFSET = 25; // Centers the block at 25% from left
        const DESKTOP_OFFSET = 5; // Changed from 25 to 5 to keep blocks centered

        if (isMobile) {
            currentBlock.style.height = `${blockSize}%`;
            currentBlock.style.top = `${startPositionPercent}%`;
            currentBlock.style.width = `${MOBILE_BLOCK_WIDTH}%`;
            currentBlock.style.left = `${MOBILE_OFFSET}%`;
            
            // Add original data attributes for mobile/vertical layout
            currentBlock.dataset.originalStart = formatTimeHHMM(startMinutes);
            currentBlock.dataset.originalEnd = formatTimeHHMM(adjustedEndMinutes % MINUTES_PER_DAY, true);
            currentBlock.dataset.originalLength = adjustedEndMinutes - startMinutes;
            currentBlock.dataset.originalHeight = `${blockSize}%`;
            currentBlock.dataset.originalWidth = `${MOBILE_BLOCK_WIDTH}%`;  // Add original width
            currentBlock.dataset.originalTop = `${startPositionPercent}%`;
            currentBlock.dataset.originalLeft = `${MOBILE_OFFSET}%`;
        } else {
            currentBlock.style.width = `${blockSize}%`;
            currentBlock.style.left = `${startPositionPercent}%`;
            currentBlock.style.height = '75%';
            currentBlock.style.top = '25%';
            
            // Existing original data attributes for desktop/horizontal layout
            currentBlock.dataset.originalStart = formatTimeHHMM(startMinutes);
            currentBlock.dataset.originalEnd = formatTimeHHMM(endMinutes);
            currentBlock.dataset.originalLength = endMinutes - startMinutes;
            currentBlock.dataset.originalHeight = '75%';
            currentBlock.dataset.originalWidth = `${blockSize}%`;  // Add original width
            currentBlock.dataset.originalLeft = `${startPositionPercent}%`;
            currentBlock.dataset.originalTop = '25%';
        }
        
        const activitiesContainer = window.timelineManager.activeTimeline.querySelector('.activities') || (() => {
            const container = document.createElement('div');
            container.className = 'activities';
            window.timelineManager.activeTimeline.appendChild(container);
            return container;
        })();

        // Hide all existing time labels
        activitiesContainer.querySelectorAll('.time-label').forEach(label => {
            label.style.display = 'none';
        });

        activitiesContainer.appendChild(currentBlock);

        // Create time label for both mobile and desktop modes
        const timeLabel = createTimeLabel(currentBlock);
        updateTimeLabel(timeLabel, formatTimeHHMM(startMinutes, false), formatTimeHHMM(endMinutes, true), currentBlock);
        timeLabel.style.display = 'block'; // Ensure the new label is visible

        // Deselect the activity button after successful placement
        document.querySelectorAll('.activity-button').forEach(btn => btn.classList.remove('selected'));
        selectedActivity = null;

        const startTime = currentBlock.dataset.start;
        const endTime = currentBlock.dataset.end;
        const times = formatTimeDDMMYYYYHHMM(startTime, endTime);
        if (!times.startTime || !times.endTime) {
            throw new Error('Activity start time and end time must be defined');
        }
        // Get activity name and category from the block's text content and dataset
        const activityText = textDiv.textContent;
        const activityCategory = currentBlock.dataset.category;
            
        // Create activity data after all variables are defined
        const activityData = {
            id: generateUniqueId(),
            activity: combinedActivityText,
            category: activityCategory,
            startTime: times.startTime,
            endTime: times.endTime,
            blockLength: parseInt(currentBlock.dataset.length),
            color: selectedActivity?.color || '#808080',
            count: parseInt(currentBlock.dataset.count) || 1
        };
        getCurrentTimelineData().push(activityData);
        currentBlock.dataset.id = activityData.id;

        // Validate timeline after adding activity
        try {
            const timelineKey = currentBlock.dataset.timelineKey;
            window.timelineManager.metadata[timelineKey].validate();
        } catch (error) {
            console.error('Timeline validation failed:', error);
            console.warn('Invalid activity placement:', {
                activity: combinedActivityText,
                category: activityCategory,
                timelineKey,
                reason: error.message
            });
            // Remove the invalid activity
            getCurrentTimelineData().pop();
            currentBlock.remove();
            const block = document.createElement('div');
            block.className = 'activity-block invalid';
            block.style.backgroundColor = selectedActivity.color;
            block.style.width = currentBlock.style.width;
            block.style.height = currentBlock.style.height;
            block.style.top = currentBlock.style.top;
            block.style.left = currentBlock.style.left;
            targetTimeline.appendChild(block);
            setTimeout(() => block.remove(), 400);
            return;
        }

        updateButtonStates();

        console.log(`[Drag & Resize] Added event listeners for activity block: ${activityData.id}`);

    });
}

async function init() {
    try {
        // Load initial timeline data
        const response = await fetch('settings/activities.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // New instructions redirect logic
        if (data.general?.instructions && !new URLSearchParams(window.location.search).has('instructions')) {
            // Only redirect if not already on an instructions page and no instructions param
            if (!window.location.pathname.includes('/instructions/')) {
                // Preserve current URL parameters
                const currentParams = new URLSearchParams(window.location.search);
                const redirectUrl = new URL('instructions/1.html', window.location.href);
                currentParams.forEach((value, key) => {
                    redirectUrl.searchParams.append(key, value);
                });
                window.location.href = redirectUrl.toString();
                return;
            }
        } else if (window.location.pathname.includes('/instructions/')) {
            // Redirect to index if instructions are disabled but user is on instructions
            // Preserve current URL parameters
            const currentParams = new URLSearchParams(window.location.search);
            const redirectUrl = new URL('index.html', window.location.href);
            currentParams.forEach((value, key) => {
                redirectUrl.searchParams.append(key, value);
            });
            window.location.href = redirectUrl.toString();
            return;
        }
        
        // Initialize timeline management structure with only timeline keys
        window.timelineManager.keys = Object.keys(data.timeline);
        window.timelineManager.keys.forEach(timelineKey => {
            window.timelineManager.metadata[timelineKey] = new Timeline(timelineKey, data.timeline[timelineKey]);
            window.timelineManager.activities[timelineKey] = [];
        });

        // Create timelines wrapper if it doesn't exist
        const timelinesWrapper = document.querySelector('.timelines-wrapper');
        if (!timelinesWrapper) {
            throw new Error('Timelines wrapper not found');
        }

        // Initialize first timeline using addNextTimeline
        window.timelineManager.currentIndex = -1; // Start at -1 so first addNextTimeline() sets to 0
        await addNextTimeline();
        
        // Update gradient bar layout
        updateGradientBarLayout();
        
        // Create and show floating add button for mobile
        createFloatingAddButton();
        if (getIsMobile()) {
            document.querySelector('.floating-add-button').style.display = 'flex';
            updateFloatingButtonPosition();
        }
        
        // Set initial data-mode on activities container
        const activitiesContainerElement = document.querySelector("#activitiesContainer");
        const currentKey = getCurrentTimelineKey();
        if (currentKey && window.timelineManager.metadata[currentKey]) {
            activitiesContainerElement.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
        }
        
        // Scroll to first timeline in mobile layout
        scrollToActiveTimeline();
        
        initButtons();
        
        // Add resize event listener with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                handleResize();
            }, 100);
        });

        // Add scroll listener to update button position
        window.addEventListener('scroll', () => {
            if (getIsMobile()) {
                updateFloatingButtonPosition();
            }
        });

        // Initialize debug overlay
        initDebugOverlay();

        if (DEBUG_MODE) {
            console.log('Initialized timeline structure:', window.timelineManager);
        }
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

// Export addNextTimeline and renderActivities for ui.js
export { addNextTimeline, renderActivities };
