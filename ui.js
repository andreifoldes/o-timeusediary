import { 
    getCurrentTimelineData, 
    getCurrentTimelineKey, 
    sendData,
    formatTimeHHMM,
    timeToMinutes,
    generateUniqueId,
    createTimeLabel,
    updateTimeLabel,
    positionToMinutes,
    minutesToPercentage
} from './utils.js';
import { getIsMobile, updateIsMobile } from './globals.js';
import { addNextTimeline, initTimelineInteraction } from './script.js';
import { DEBUG_MODE } from './constants.js';

// Modal management
function createModal() {
    // Create custom activity input modal
    const customActivityModal = document.createElement('div');
    customActivityModal.className = 'modal-overlay';
    customActivityModal.id = 'customActivityModal';
    customActivityModal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Enter Custom Activity</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content">
                <input type="text" id="customActivityInput" maxlength="30" placeholder="Enter your activity (max 30 chars)">
                <div class="button-container">
                    <button id="confirmCustomActivity" class="btn save-btn">OK</button>
                </div>
            </div>
        </div>
    `;

    const customCloseBtn = customActivityModal.querySelector('.modal-close');
    customCloseBtn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        customActivityModal.style.display = 'none';
    });
    customCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        customActivityModal.style.display = 'none';
    });

    customActivityModal.addEventListener('pointerup', (e) => {
        if (e.target === customActivityModal) {
            customActivityModal.style.display = 'none';
        }
    });
    customActivityModal.addEventListener('click', (e) => {
        if (e.target === customActivityModal) {
            customActivityModal.style.display = 'none';
        }
    });

    // Create activities modal
    const activitiesModal = document.createElement('div');
    activitiesModal.className = 'modal-overlay';
    activitiesModal.id = 'activitiesModal';
    activitiesModal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Add Activity</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div id="modalActivitiesContainer"></div>
        </div>
    `;

    const activitiesCloseBtn = activitiesModal.querySelector('.modal-close');
    activitiesCloseBtn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        activitiesModal.style.display = 'none';
    });
    activitiesCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        activitiesModal.style.display = 'none';
    });

    activitiesModal.addEventListener('pointerup', (e) => {
        if (e.target === activitiesModal) {
            activitiesModal.style.display = 'none';
        }
    });
    activitiesModal.addEventListener('click', (e) => {
        if (e.target === activitiesModal) {
            activitiesModal.style.display = 'none';
        }
    });

    // Create confirmation modal
    const confirmationModal = document.createElement('div');
    confirmationModal.className = 'modal-overlay';
    confirmationModal.id = 'confirmationModal';
    confirmationModal.innerHTML = `
        <div class="modal">
            <div class="modal-content">
                <h3>Are you sure?</h3>
                <p>You will not be able to change your responses.</p>
                <div class="button-container">
                    <button id="confirmCancel" class="btn btn-secondary">Cancel</button>
                    <button id="confirmOk" class="btn save-btn">OK</button>
                </div>
            </div>
        </div>
    `;

    confirmationModal.querySelector('#confirmCancel').addEventListener('click', () => {
        confirmationModal.style.display = 'none';
    });

    confirmationModal.querySelector('#confirmOk').addEventListener('click', () => {
        confirmationModal.style.display = 'none';
        sendData();
        document.getElementById('nextBtn').disabled = true;
    });

    document.body.appendChild(activitiesModal);
    document.body.appendChild(confirmationModal);
    document.body.appendChild(customActivityModal);
    return activitiesModal;
}

// Button management
function createFloatingAddButton() {
    const button = document.createElement('button');
    button.className = 'floating-add-button';
    button.innerHTML = '+';
    button.title = 'Add Activity';
    
    const modal = createModal();
    
    button.addEventListener('click', () => {
        modal.style.display = 'block';
        const currentKey = getCurrentTimelineKey();
        const categories = window.timelineManager.metadata[currentKey].categories;
        renderActivities(categories, document.getElementById('modalActivitiesContainer'));
        
        if (getIsMobile()) {
            const firstCategory = modal.querySelector('.activity-category');
            if (firstCategory) {
                firstCategory.classList.add('active');
            }
        }
    });

    document.body.appendChild(button);
    return button;
}

// Adjust the floating add button's visibility and position based on the current layout.
function updateFloatingButtonPosition() {
    const floatingButton = document.querySelector('.floating-add-button');
    if (!floatingButton) return;

    if (getIsMobile()) {
        // In mobile (vertical) layout, ensure the button is visible and correctly positioned.
        floatingButton.style.display = 'flex';
        const lastTimelineWrapper = document.querySelector('.last-initialized-timeline-wrapper');
        if (!lastTimelineWrapper) return;

        const wrapperRect = lastTimelineWrapper.getBoundingClientRect();
        const buttonWidth = floatingButton.offsetWidth;

        // Position the button 10px to the right of the timeline wrapper.
        const leftPosition = wrapperRect.right + 10;
        // Ensure the button doesn't go off screen.
        const maxLeft = window.innerWidth - buttonWidth - 10;
        const finalLeft = Math.min(leftPosition, maxLeft);

        floatingButton.style.left = `${finalLeft}px`;
    } else {
        // In horizontal (desktop) layout, hide the floating add button.
        floatingButton.style.display = 'none';
    }
}

function updateButtonStates() {
    const undoButton = document.getElementById('undoBtn');
    const cleanRowButton = document.getElementById('cleanRowBtn');
    const nextButton = document.getElementById('nextBtn');
    
    const currentData = getCurrentTimelineData();
    const isEmpty = currentData.length === 0;
    
    // Check if there's an active timeline with activities
    const activeTimeline = window.timelineManager.activeTimeline;
    const hasActivities = activeTimeline && activeTimeline.querySelector('.activity-block');
    
    if (undoButton) undoButton.disabled = isEmpty;
    if (cleanRowButton) cleanRowButton.disabled = !hasActivities;
    
    // Get current timeline coverage
    const currentKey = getCurrentTimelineKey();
    const currentTimeline = window.timelineManager.metadata[currentKey];
    const currentCoverage = window.getTimelineCoverage();
        
    // Get minimum coverage requirement for current timeline
    const minCoverage = parseInt(currentTimeline.minCoverage) || 0;
    const meetsMinCoverage = currentCoverage >= minCoverage;

    // Check if we're on the last timeline
    const isLastTimeline = window.timelineManager.currentIndex === window.timelineManager.keys.length - 1;
    
    if (nextButton) {
        if (isLastTimeline) {
            // On last timeline, enable Next only if coverage requirement is met
            nextButton.disabled = !meetsMinCoverage;
            // Change button text to "Submit" if coverage requirement is met, keeping the arrow icon
            nextButton.innerHTML = meetsMinCoverage ? 'Submit <i class="fas fa-arrow-right"></i>' : 'Next <i class="fas fa-arrow-right"></i>';
        } else {
            // For other timelines, enable Next if coverage requirement is met
            nextButton.disabled = !meetsMinCoverage;
            nextButton.innerHTML = 'Next <i class="fas fa-arrow-right"></i>';
        }
    }
}

function initButtons() {
    const cleanRowBtn = document.getElementById('cleanRowBtn');
    cleanRowBtn.addEventListener('click', () => {
        const currentKey = getCurrentTimelineKey();
        const currentData = getCurrentTimelineData();
        if (currentData.length > 0) {
            // Get the activities container of the active timeline
            const activeTimeline = window.timelineManager.activeTimeline;
            const activitiesContainer = activeTimeline.querySelector('.activities');
            
            if (activitiesContainer) {
                // Remove all activity blocks from the DOM
                while (activitiesContainer.firstChild) {
                    activitiesContainer.removeChild(activitiesContainer.firstChild);
                }
            }

            // Clear the activities data for current timeline
            window.timelineManager.activities[currentKey] = [];
            
            try {
                window.timelineManager.metadata[currentKey].validate();
            } catch (error) {
                console.error('Timeline validation failed:', error);
                alert('Timeline validation error: ' + error.message);
                return;
            }
                
            updateButtonStates();

            if (DEBUG_MODE) {
                console.log('Timeline data after clean:', window.timelineManager.activities);
            }
        }
    });


    document.getElementById('undoBtn').addEventListener('click', () => {
        const currentKey = getCurrentTimelineKey();
        const currentData = getCurrentTimelineData();
        if (currentData.length > 0) {
            if (DEBUG_MODE) {
                console.log('Before undo - timelineData:', window.timelineManager.activities);
            }

            const lastActivity = currentData.pop();
            // Update timeline manager activities and validate
            window.timelineManager.activities[currentKey] = currentData;
            try {
                window.timelineManager.metadata[currentKey].validate();
            } catch (error) {
                console.error('Timeline validation failed:', error);
                // Revert the change
                window.timelineManager.activities[currentKey] = [...currentData, lastActivity];
                const lastBlock = timeline.querySelector(`.activity-block[data-id="${lastActivity.id}"]`);
                if (lastBlock) {
                    lastBlock.classList.add('invalid');
                    setTimeout(() => lastBlock.classList.remove('invalid'), 400);
                }
                return;
            }
            
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

    // Add click handler for Next button with debounce
    let nextButtonLastClick = 0;
    const NEXT_BUTTON_COOLDOWN = 2500; // 2.5 second cooldown
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        const currentTime = Date.now();
        if (currentTime - nextButtonLastClick < NEXT_BUTTON_COOLDOWN) {
            console.log('Next button on cooldown');
            return;
        }
        nextButtonLastClick = currentTime;

        const isLastTimeline = window.timelineManager.currentIndex === window.timelineManager.keys.length - 1;
        
        if (isLastTimeline) {
            // On last timeline, show confirmation modal
            document.getElementById('confirmationModal').style.display = 'block';
        } else {
            // For other timelines, proceed to next timeline
            addNextTimeline();
        }
    });

    // Disable back button initially
    const backButton = document.getElementById('backBtn');
    if (backButton) {
        backButton.disabled = true;
    }
}

// Debug overlay functions
function updateDebugOverlay(mouseX, mouseY, timelineRect) {
    const debugOverlay = document.getElementById('debugOverlay');
    if (!debugOverlay) return;

    const isMobile = getIsMobile();
    
    // In mobile mode, if no timelineRect is provided, get it from active timeline
    if (isMobile && !timelineRect) {
        const activeTimeline = window.timelineManager.activeTimeline;
        if (!activeTimeline) return;
        timelineRect = activeTimeline.getBoundingClientRect();
    }
    
    let positionPercent, axisPosition, axisSize;

    // Get viewport and header dimensions
    const viewportHeight = window.innerHeight;
    const headerSection = document.querySelector('.header-section');
    const headerBottom = headerSection ? headerSection.getBoundingClientRect().bottom : 0;
    
    // Calculate available height (space between header bottom and viewport bottom)
    const availableHeight = viewportHeight - headerBottom;

    // Calculate normalized distances relative to available height
    const distanceToBottom = (viewportHeight - mouseY) / availableHeight;
    const distanceToHeader = (mouseY - headerBottom) / availableHeight;

    if (isMobile) {
        // Vertical layout calculations
        const relativeY = mouseY - timelineRect.top;
        positionPercent = (relativeY / timelineRect.height) * 100;
        axisPosition = Math.round(relativeY);
        axisSize = Math.round(timelineRect.height);
    } else {
        // Horizontal layout calculations
        const relativeX = mouseX - timelineRect.left;
        positionPercent = (relativeX / timelineRect.width) * 100;
        axisPosition = Math.round(relativeX);
        axisSize = Math.round(timelineRect.width);
    }

    const minutes = positionToMinutes(positionPercent, isMobile);
    // Format time - no need to adjust minutes since formatTimeHHMM now handles the offset
    const timeString = formatTimeHHMM(minutes);

    debugOverlay.innerHTML = isMobile
        ? `Mouse Position: ${axisPosition}px<br>
           Timeline Height: ${axisSize}px<br>
           Position: ${positionPercent.toFixed(2)}%<br>
           Time: ${timeString}<br>
           Distance to Bottom: ${distanceToBottom.toFixed(3)}<br>
           Distance to Header: ${distanceToHeader.toFixed(3)}`
        : `Mouse Position: ${axisPosition}px<br>
           Timeline Width: ${axisSize}px<br>
           Position: ${positionPercent.toFixed(2)}%<br>
           Time: ${timeString}<br>
           Distance to Bottom: ${distanceToBottom.toFixed(3)}<br>
           Distance to Header: ${distanceToHeader.toFixed(3)}`;
}

// Initialize continuous debug overlay updates for mobile layout
function initDebugOverlay() {
    if (!DEBUG_MODE) return;

    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 50; // Update every 50ms

    // Function to handle both mouse and touch events
    const handleMove = (e) => {
        const currentTime = Date.now();
        if (getIsMobile() && currentTime - lastUpdateTime > UPDATE_INTERVAL) {
            // Get coordinates from either mouse or touch event
            const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            updateDebugOverlay(x, y);
            lastUpdateTime = currentTime;
        }
    };

    // Add both mouse and touch event listeners
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
}

function hideDebugOverlay() {
    const debugOverlay = document.getElementById('debugOverlay');
    if (debugOverlay) {
        debugOverlay.innerHTML = '';
    }
}

function updateGradientBarLayout() {
    const gradientBar = document.querySelector('.gradient-bar');
    if (gradientBar) {
        gradientBar.setAttribute('data-layout', getIsMobile() ? 'vertical' : 'horizontal');
    }
}

// Helper function to scroll to active timeline
function scrollToActiveTimeline() {
    if (!window.timelineManager.activeTimeline) return;
    
    const activeTimeline = window.timelineManager.activeTimeline.closest('.timeline-container');
    if (!activeTimeline) return;

    if (getIsMobile()) {
        // Mobile: horizontal scroll
        const timelinesWrapper = document.querySelector('.timelines-wrapper');
        if (timelinesWrapper) {
            // Check if wrapper has scrollable overflow
            const hasScrollableOverflow = timelinesWrapper.scrollWidth > timelinesWrapper.clientWidth;
            
            if (hasScrollableOverflow) {
                // Calculate if timeline is partially or fully hidden
                const timelineRect = activeTimeline.getBoundingClientRect();
                const wrapperRect = timelinesWrapper.getBoundingClientRect();
                
                // Check if timeline is not fully visible
                const isPartiallyHidden = 
                    timelineRect.left < wrapperRect.left ||
                    timelineRect.right > wrapperRect.right;
                
                if (isPartiallyHidden) {
                    // Scroll to make timeline fully visible
                    timelinesWrapper.scrollTo({
                        left: activeTimeline.offsetLeft,
                        behavior: 'smooth'
                    });
                }
            }
        }
    } else {
        // Desktop: vertical scroll to center
        const windowHeight = window.innerHeight;
        const timelineRect = activeTimeline.getBoundingClientRect();
        const scrollTarget = window.pageYOffset + timelineRect.top - (windowHeight / 2) + (timelineRect.height / 2);
        
        window.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
        });
    }
}

function updateTimelineCountVariable() {
    const pastTimelinesWrapper = document.querySelector('.past-initialized-timelines-wrapper');
    if (!pastTimelinesWrapper) return;
    
    const timelineCount = pastTimelinesWrapper.querySelectorAll('.timeline-container').length;
    pastTimelinesWrapper.style.setProperty('--timeline-count', timelineCount);
}

// Updates the width of each timeline container based on the current layout.
function updateTimelineDimensions() {
    const timelineContainers = document.querySelectorAll('.timeline-container');
    const isMobile = getIsMobile();
    timelineContainers.forEach(container => {
        if (isMobile) {
            // In vertical/mobile layout, retain the fixed width (adjust as needed)
            container.style.width = '180px';
        } else {
            // In horizontal/desktop layout, allow the timeline to use full available width
            container.style.width = '100%';
        }
    });
}

// Helper function to update the styling of all activity blocks based on the current layout.
function updateActivityBlocksLayout() {
    const activeTimeline = window.timelineManager.activeTimeline;
    if (!activeTimeline) return;
    
    // Determine if we are in mobile (vertical) or desktop (horizontal) layout.
    const isMobile = getIsMobile();
    const blocks = activeTimeline.querySelectorAll('.activity-block');
    
    blocks.forEach(block => {
        // Get the block's start minutes and its duration (data-length in minutes)
        const startMinutes = parseInt(block.getAttribute('data-start-minutes'));
        const blockLength = parseFloat(block.getAttribute('data-length')) || 10; // default to 10 minutes if not defined
        const blockSize = (blockLength / 1440) * 100; // percentage representation

        if (isMobile) {
            // Vertical layout: duration is represented by the block's height.
            block.style.height = `${blockSize}%`;
            block.style.top = `${minutesToPercentage(startMinutes)}%`;
            block.style.width = '75%';
            block.style.left = '25%';

            // Update stored original values for possible later recalculations.
            block.dataset.originalHeight = `${blockSize}%`;
            block.dataset.originalTop = `${minutesToPercentage(startMinutes)}%`;
            block.dataset.originalWidth = '75%';
            block.dataset.originalLeft = '25%';

            // Set text styling for vertical mode.
            const textEl = block.querySelector('.activity-block-text-vertical, .activity-block-text-narrow');
            if (textEl) {
                textEl.className = 'activity-block-text-narrow';
            }
        } else {
            // Horizontal layout: duration is now reflected by the block's width.
            block.style.width = `${blockSize}%`;
            block.style.left = `${minutesToPercentage(startMinutes)}%`;
            block.style.height = '75%';
            block.style.top = '25%';

            // Update stored original values.
            block.dataset.originalWidth = `${blockSize}%`;
            block.dataset.originalLeft = `${minutesToPercentage(startMinutes)}%`;
            block.dataset.originalHeight = '75%';
            block.dataset.originalTop = '25%';

            // Set text styling for horizontal mode.
            const textEl = block.querySelector('.activity-block-text-vertical, .activity-block-text-narrow');
            if (textEl) {
                textEl.className = 'activity-block-text-vertical';
            }
        }
    });
}

// Helper function to update the styling of the time-label elements on activity blocks.
function updateActivityTimeLabelsLayout() {
    const activeTimeline = window.timelineManager.activeTimeline;
    if (!activeTimeline) return;
    
    const isMobile = getIsMobile();
    const blocks = activeTimeline.querySelectorAll('.activity-block');
    
    blocks.forEach(block => {
        const timeLabel = block.querySelector('.time-label');
        if (!timeLabel) return;
        
        // On first pass, store the original display setting if it hasn't been stored yet.
        if (!timeLabel.hasAttribute('data-original-display')) {
            // Prefer an existing inline style if provided, else fall back to computed style.
            const computedDisplay = window.getComputedStyle(timeLabel).display;
            timeLabel.setAttribute('data-original-display', timeLabel.style.display || computedDisplay);
        }
        const origDisplay = timeLabel.getAttribute('data-original-display');

        if (isMobile) {
            // In vertical layout, clear out any horizontal-specific inline styles.
            timeLabel.style.position = '';
            timeLabel.style.left = '';
            timeLabel.style.transform = '';
            timeLabel.style.backgroundColor = '';
            timeLabel.style.color = '';
            timeLabel.style.padding = '';
            timeLabel.style.borderRadius = '';
            timeLabel.style.fontSize = '';
            timeLabel.style.whiteSpace = '';
            timeLabel.style.pointerEvents = '';
            timeLabel.style.zIndex = '';
            timeLabel.style.bottom = '';
            timeLabel.style.top = '';
            timeLabel.style.width = ''; // Remove any fixed width from horizontal mode.
            // Restore the original display value.
            timeLabel.style.display = origDisplay;
        } else {
            // In horizontal layout, reapply the horizontal styling...
            timeLabel.style.position = 'absolute';
            timeLabel.style.left = '50%';
            timeLabel.style.transform = 'translateX(-50%)';
            timeLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            timeLabel.style.color = 'rgb(255, 255, 255)';
            timeLabel.style.padding = '2px 4px';
            timeLabel.style.borderRadius = '4px';
            timeLabel.style.fontSize = '10px';
            timeLabel.style.whiteSpace = 'nowrap';
            timeLabel.style.pointerEvents = 'none';
            timeLabel.style.zIndex = '10';
            timeLabel.style.bottom = '-20px';
            timeLabel.style.top = 'auto';
            // Instead of forcing visibility, set display using the originally stored value.
            timeLabel.style.display = origDisplay;
        }
    });
}

// Updated handleResize function that reinitializes components dynamically during viewport changes.
function handleResize() {
    clearTimeout(window.handleResizeDebounce);

    window.handleResizeDebounce = setTimeout(() => {
        // Update the mobile/desktop state.
        updateIsMobile();

        // Update various UI components.
        updateGradientBarLayout();
        updateFloatingButtonPosition();
        updateTimelineCountVariable();
        updateTimelineDimensions();
        scrollToActiveTimeline();
        updateButtonStates();

        // Reinitialize interact.js settings on activity blocks.
        interact('.activity-block').unset();
        initTimelineInteraction(window.timelineManager.activeTimeline);

        // Update the layout of each activity block according to the current mode.
        updateActivityBlocksLayout();
        // Reinitialize the time-labels to clear any leftover horizontal settings when switching layouts.
        updateActivityTimeLabelsLayout();

        console.log('Components reinitialized after resize');
    }, 100); // 100ms debounce interval
}

// Add renderActivities function
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
        if (currentKey && window.timelineManager.metadata[currentKey]) {
            accordionContainer.setAttribute('data-mode', window.timelineManager.metadata[currentKey].mode);
        }

        // Disable collapsibility if there is only one category
        const isAccordionCollapsible = categories.length > 1;

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            // If only one category, always mark it as active (no collapsibility)
            categoryDiv.className = isAccordionCollapsible ? 'activity-category' : 'activity-category active';

            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category.name;
            categoryDiv.appendChild(categoryTitle);

            const activityButtonsDiv = document.createElement('div');
            activityButtonsDiv.className = 'activity-buttons';

            category.activities.forEach(activity => {
                const activityButton = document.createElement('button');
                // Determine mode from container attribute
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
                activityButton.addEventListener('pointerup', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
    
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    const isMultipleChoice = activitiesContainer.getAttribute('data-mode') === 'multiple-choice';
                    const categoryButtons = activityButton.closest('.activity-category').querySelectorAll('.activity-button');
    
                    // Check if this is the "other not listed" button
                    if (
                        activityButton.querySelector('.activity-text').textContent.includes('other not listed (enter)')
                    ) {
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
                                    window.selectedActivity = {
                                        selections: selectedButtons.map(btn => ({
                                            name: btn.querySelector('.activity-text').textContent,
                                            color: btn.style.getPropertyValue('--color')
                                        })),
                                        category: category.name
                                    };
                                } else {
                                    categoryButtons.forEach(b => b.classList.remove('selected'));
                                    window.selectedActivity = {
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
    
                        // Reset and set up the confirm handler using pointerup
                        const confirmBtn = document.getElementById('confirmCustomActivity');
                        const newConfirmBtn = confirmBtn.cloneNode(true);
                        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                        newConfirmBtn.addEventListener('pointerup', (e) => {
                            e.preventDefault();
                            handleCustomActivity();
                        });
                        customActivityInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleCustomActivity();
                            }
                        });
                        return;
                    }
    
                    if (isMultipleChoice) {
                        // Toggle selection for this button
                        activityButton.classList.toggle('selected');
                        const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                        if (selectedButtons.length > 0) {
                            window.selectedActivity = {
                                selections: selectedButtons.map(btn => ({
                                    name: btn.querySelector('.activity-text').textContent,
                                    color: btn.style.getPropertyValue('--color')
                                })),
                                category: category.name
                            };
                        } else {
                            window.selectedActivity = null;
                        }
                    } else {
                        // Single choice mode
                        categoryButtons.forEach(b => b.classList.remove('selected'));
                        window.selectedActivity = {
                            name: activity.name,
                            color: activity.color,
                            category: category.name
                        };
                        activityButton.classList.add('selected');
                        // Close the activities modal explicitly after a short delay
                        const activitiesModal = document.getElementById('activitiesModal');
                        if (activitiesModal) {
                            setTimeout(() => {
                                activitiesModal.style.display = 'none';
                            }, 10);
                        }
                    }
                });
                activityButtonsDiv.appendChild(activityButton);
            });

            categoryDiv.appendChild(activityButtonsDiv);
            accordionContainer.appendChild(categoryDiv);
        });

        container.appendChild(accordionContainer);

        // Attach click listeners for collapsible accordion only if it's collapsible (multiple categories)
        if (isAccordionCollapsible) {
            const categoryTitles = accordionContainer.querySelectorAll('.activity-category h3');
            categoryTitles.forEach(title => {
                title.addEventListener('click', () => {
                    const category = title.parentElement;
                    category.classList.toggle('active');
                });
            });
        }
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
                activityButton.addEventListener('pointerup', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
    
                    const activitiesContainer = document.getElementById('activitiesContainer');
                    const isMultipleChoice = activitiesContainer.getAttribute('data-mode') === 'multiple-choice';
                    const categoryButtons = activityButton.closest('.activity-category').querySelectorAll('.activity-button');
    
                    // Check if this is the "other not listed" button
                    if (activity.name.includes('other not listed (enter)')) {
                        const customActivityModal = document.getElementById('customActivityModal');
                        const customActivityInput = document.getElementById('customActivityInput');
                        customActivityInput.value = ''; // Clear previous input
                        customActivityModal.style.display = 'block';
                        customActivityInput.focus(); // Focus the input field
    
                        const handleCustomActivity = () => {
                            const customText = customActivityInput.value.trim();
                            if (customText) {
                                if (isMultipleChoice) {
                                    activityButton.classList.add('selected');
                                    const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                                    window.selectedActivity = {
                                        selections: selectedButtons.map(btn => ({
                                            name: btn.querySelector('.activity-text').textContent,
                                            color: btn.style.getPropertyValue('--color')
                                        })),
                                        category: category.name
                                    };
                                } else {
                                    categoryButtons.forEach(b => b.classList.remove('selected'));
                                    window.selectedActivity = {
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
    
                        // Setup confirm button handler using pointerup
                        const confirmBtn = document.getElementById('confirmCustomActivity');
                        const newConfirmBtn = confirmBtn.cloneNode(true);
                        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                        newConfirmBtn.addEventListener('pointerup', (e) => {
                            e.preventDefault();
                            handleCustomActivity();
                        });
                        customActivityInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                handleCustomActivity();
                            }
                        });
                        return;
                    }
    
                    if (isMultipleChoice) {
                        activityButton.classList.toggle('selected');
                        const selectedButtons = Array.from(categoryButtons).filter(btn => btn.classList.contains('selected'));
                        if (selectedButtons.length > 0) {
                            window.selectedActivity = {
                                selections: selectedButtons.map(btn => ({
                                    name: btn.querySelector('.activity-text').textContent,
                                    color: btn.style.getPropertyValue('--color')
                                })),
                                category: category.name
                            };
                        } else {
                            window.selectedActivity = null;
                        }
                    } else {
                        categoryButtons.forEach(b => b.classList.remove('selected'));
                        window.selectedActivity = {
                            name: activity.name,
                            color: activity.color,
                            category: category.name
                        };
                        activityButton.classList.add('selected');
                        // Close the activities modal explicitly after a short delay
                        const activitiesModal = document.getElementById('activitiesModal');
                        if (activitiesModal) {
                            setTimeout(() => {
                                activitiesModal.style.display = 'none';
                            }, 10);
                        }
                    }
                });
                activityButtonsDiv.appendChild(activityButton);
            });

            categoryDiv.appendChild(activityButtonsDiv);
            container.appendChild(categoryDiv);
        });
    }
}

// Export all functions
export {
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
    handleResize,
    renderActivities
};
