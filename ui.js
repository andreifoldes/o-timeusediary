import { 
    getCurrentTimelineData, 
    getCurrentTimelineKey, 
    sendData,
    formatTimeHHMM,
    timeToMinutes,
    generateUniqueId,
    createTimeLabel,
    updateTimeLabel
} from './utils.js';
import { getIsMobile } from './globals.js';
import { addNextTimeline, renderActivities } from './script.js';
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

    customActivityModal.querySelector('.modal-close').addEventListener('click', () => {
        customActivityModal.style.display = 'none';
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

    activitiesModal.querySelector('.modal-close').addEventListener('click', () => {
        activitiesModal.style.display = 'none';
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

function updateFloatingButtonPosition() {
    if (!getIsMobile()) return;

    const floatingButton = document.querySelector('.floating-add-button');
    const lastTimelineWrapper = document.querySelector('.last-initialized-timeline-wrapper');
    
    if (!floatingButton || !lastTimelineWrapper) return;

    const wrapperRect = lastTimelineWrapper.getBoundingClientRect();
    const buttonWidth = floatingButton.offsetWidth;
    
    // Position the button 10px to the right of the wrapper
    const leftPosition = wrapperRect.right + 10;
    
    // Ensure button doesn't go off screen
    const maxLeft = window.innerWidth - buttonWidth - 10;
    const finalLeft = Math.min(leftPosition, maxLeft);
    
    floatingButton.style.left = `${finalLeft}px`;
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

// Debug UI functions
function updateDebugOverlay() {
    // Debug overlay disabled
}

function hideDebugOverlay() {
    // Debug overlay disabled
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

export function updateTimelineCountVariable() {
    const pastTimelinesWrapper = document.querySelector('.past-initialized-timelines-wrapper');
    if (!pastTimelinesWrapper) return;
    
    const timelineCount = pastTimelinesWrapper.querySelectorAll('.timeline-container').length;
    pastTimelinesWrapper.style.setProperty('--timeline-count', timelineCount);
}

// Export the functions
export {
    createModal,
    createFloatingAddButton,
    updateFloatingButtonPosition,
    updateButtonStates,
    initButtons,
    updateDebugOverlay,
    hideDebugOverlay,
    updateGradientBarLayout,
    scrollToActiveTimeline
};
