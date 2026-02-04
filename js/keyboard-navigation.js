/**
 * Keyboard navigation for O-TUD timeline
 * Implements WCAG 2.5.7 compliant alternative to drag-and-drop
 * Full ARIA support for screen readers
 */

import { TIMELINE_START_HOUR, INCREMENT_MINUTES, TIMELINE_HOURS } from './constants.js';

const SLOTS_PER_HOUR = 60 / INCREMENT_MINUTES; // 6 slots per hour
const TOTAL_SLOTS = TIMELINE_HOURS * SLOTS_PER_HOUR; // 144 slots
const START_MINUTES = TIMELINE_START_HOUR * 60; // 240 (4:00 AM)

// Navigation state
let currentSlotIndex = 0;
let selectionStartIndex = null;
let isSelecting = false;
let activeTimeline = null;
let slotElements = [];
let selectionOverlay = null;
let instructionsPanel = null;
let announcerElement = null;

// Activity data cache for slot status
let activityCache = new Map();

/**
 * Initialize keyboard navigation on timeline
 * @param {HTMLElement} timelineElement - The .timeline element
 */
export function initKeyboardNavigation(timelineElement) {
    if (!timelineElement) {
        console.warn('KeyboardNavigation: No timeline element provided');
        return;
    }

    activeTimeline = timelineElement;

    // Create announcer element for live regions
    createAnnouncerElement();

    // Set up ARIA attributes on timeline
    setupAriaAttributes(timelineElement);

    // Create virtual slot elements for focus management
    createSlotOverlay(timelineElement);

    // Create instructions panel
    createInstructionsPanel();

    // Build initial activity cache
    updateActivityCache();

    // Attach event listeners
    timelineElement.addEventListener('keydown', handleTimelineKeydown);
    timelineElement.addEventListener('focus', handleTimelineFocus);
    timelineElement.addEventListener('blur', handleTimelineBlur);

    // Allow timeline to receive focus
    timelineElement.setAttribute('tabindex', '0');

    // Listen for activity changes to update cache
    const observer = new MutationObserver(() => {
        updateActivityCache();
        updateSlotAriaLabels();
    });

    const activitiesContainer = timelineElement.querySelector('.activities');
    if (activitiesContainer) {
        observer.observe(activitiesContainer, { childList: true, subtree: true, attributes: true });
    }

    console.log('KeyboardNavigation: Initialized with ARIA support');
}

/**
 * Clean up keyboard navigation (call when timeline is destroyed)
 * @param {HTMLElement} timelineElement
 */
export function destroyKeyboardNavigation(timelineElement) {
    if (!timelineElement) return;

    timelineElement.removeEventListener('keydown', handleTimelineKeydown);
    timelineElement.removeEventListener('focus', handleTimelineFocus);
    timelineElement.removeEventListener('blur', handleTimelineBlur);

    // Remove overlay elements
    const overlay = timelineElement.querySelector('.keyboard-nav-overlay');
    if (overlay) {
        overlay.remove();
    }

    // Remove instructions panel
    if (instructionsPanel) {
        instructionsPanel.remove();
        instructionsPanel = null;
    }

    slotElements = [];
    activeTimeline = null;
    activityCache.clear();
    resetSelectionState();
}

/**
 * Create ARIA live region announcer element
 */
function createAnnouncerElement() {
    // Remove existing announcer
    const existing = document.getElementById('keyboard-nav-announcer');
    if (existing) {
        existing.remove();
    }

    announcerElement = document.createElement('div');
    announcerElement.id = 'keyboard-nav-announcer';
    announcerElement.className = 'sr-only';
    announcerElement.setAttribute('aria-live', 'assertive');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.setAttribute('role', 'status');
    document.body.appendChild(announcerElement);
}

/**
 * Set up ARIA attributes for accessibility
 * @param {HTMLElement} timelineElement
 */
function setupAriaAttributes(timelineElement) {
    // Timeline container: application role for complex widget
    timelineElement.setAttribute('role', 'application');
    timelineElement.setAttribute('aria-label', 'Daily activity timeline. Use arrow keys to navigate, Enter to select time slots.');
    timelineElement.setAttribute('aria-describedby', 'timeline-keyboard-instructions');
    timelineElement.setAttribute('aria-roledescription', 'timeline grid');

    // ARIA value attributes for current position
    timelineElement.setAttribute('aria-valuemin', '0');
    timelineElement.setAttribute('aria-valuemax', String(TOTAL_SLOTS - 1));
    timelineElement.setAttribute('aria-valuenow', '0');
    timelineElement.setAttribute('aria-valuetext', slotIndexToTime(0));

    // Create hidden instructions element for screen readers
    let instructions = document.getElementById('timeline-keyboard-instructions');
    if (!instructions) {
        instructions = document.createElement('div');
        instructions.id = 'timeline-keyboard-instructions';
        instructions.className = 'sr-only';
        instructions.innerHTML = `
            <p>Timeline navigation instructions:</p>
            <ul>
                <li>Use Left and Right arrow keys to move by 10 minutes.</li>
                <li>Use Up and Down arrow keys to move by 1 hour.</li>
                <li>Press Home to go to the start of the day at 4 AM.</li>
                <li>Press End to go to the end of the day at 3:50 AM.</li>
                <li>Press Enter or Space to start selecting a time range.</li>
                <li>While selecting, use arrow keys to extend the selection.</li>
                <li>Press Enter or Space again to confirm your selection.</li>
                <li>Press Escape to cancel the current selection.</li>
                <li>Press Tab to leave the timeline.</li>
            </ul>
        `;
        document.body.appendChild(instructions);
    }
}

/**
 * Create overlay with virtual slot elements for keyboard navigation
 * @param {HTMLElement} timelineElement
 */
function createSlotOverlay(timelineElement) {
    // Remove existing overlay if present
    const existingOverlay = timelineElement.querySelector('.keyboard-nav-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Create overlay container with grid role
    const overlay = document.createElement('div');
    overlay.className = 'keyboard-nav-overlay';
    overlay.setAttribute('role', 'grid');
    overlay.setAttribute('aria-label', 'Time slot grid');

    // Create selection highlight element
    selectionOverlay = document.createElement('div');
    selectionOverlay.className = 'keyboard-selection-range';
    selectionOverlay.style.display = 'none';
    selectionOverlay.setAttribute('aria-hidden', 'true');
    overlay.appendChild(selectionOverlay);

    // Create focus indicator element
    const focusIndicator = document.createElement('div');
    focusIndicator.className = 'keyboard-focus-indicator';
    focusIndicator.id = 'keyboard-focus-indicator';
    focusIndicator.setAttribute('aria-hidden', 'true');
    overlay.appendChild(focusIndicator);

    // Create row container (single row grid)
    const rowContainer = document.createElement('div');
    rowContainer.className = 'keyboard-nav-row';
    rowContainer.setAttribute('role', 'row');

    // Create slot elements for each 10-minute increment
    slotElements = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.className = 'keyboard-nav-slot timeline-slot';
        slot.id = `timeline-slot-${i}`;
        slot.dataset.slotIndex = i;
        slot.dataset.minutes = slotIndexToMinutes(i);

        // ARIA attributes for each slot
        slot.setAttribute('role', 'gridcell');
        slot.setAttribute('aria-colindex', String(i + 1));
        slot.setAttribute('aria-selected', 'false');

        // Generate label with time and status
        const time = slotIndexToTime(i);
        const status = getSlotStatus(i);
        slot.setAttribute('aria-label', `${time}, ${status}`);

        // Only first slot has tabindex 0 (roving tabindex pattern)
        slot.setAttribute('tabindex', i === 0 ? '0' : '-1');

        slotElements.push(slot);
        rowContainer.appendChild(slot);
    }

    overlay.appendChild(rowContainer);
    timelineElement.appendChild(overlay);

    // Position slots based on layout
    positionSlots(timelineElement);
}

/**
 * Create visible instructions panel
 */
function createInstructionsPanel() {
    // Remove existing panel
    const existing = document.getElementById('keyboard-instructions-panel');
    if (existing) {
        existing.remove();
    }

    instructionsPanel = document.createElement('div');
    instructionsPanel.id = 'keyboard-instructions-panel';
    instructionsPanel.className = 'keyboard-instructions-panel';
    instructionsPanel.setAttribute('role', 'complementary');
    instructionsPanel.setAttribute('aria-label', 'Keyboard shortcuts');

    instructionsPanel.innerHTML = `
        <button class="keyboard-instructions-toggle" aria-expanded="false" aria-controls="keyboard-shortcuts-list">
            <span class="toggle-icon">⌨</span>
            <span class="toggle-text">Keyboard Shortcuts</span>
            <span class="toggle-chevron" aria-hidden="true">▼</span>
        </button>
        <div id="keyboard-shortcuts-list" class="keyboard-shortcuts-list" hidden>
            <h4>Timeline Navigation</h4>
            <ul>
                <li><kbd>←</kbd> / <kbd>→</kbd> <span>Move 10 minutes</span></li>
                <li><kbd>↑</kbd> / <kbd>↓</kbd> <span>Move 1 hour</span></li>
                <li><kbd>Home</kbd> <span>Start of day (4:00 AM)</span></li>
                <li><kbd>End</kbd> <span>End of day (3:50 AM)</span></li>
            </ul>
            <h4>Selection</h4>
            <ul>
                <li><kbd>Enter</kbd> / <kbd>Space</kbd> <span>Start/confirm selection</span></li>
                <li><kbd>Escape</kbd> <span>Cancel selection</span></li>
                <li><kbd>Tab</kbd> <span>Exit timeline</span></li>
            </ul>
            <h4>Quick Tips</h4>
            <ul class="tips">
                <li>First, select an activity from the list below</li>
                <li>Then, navigate to your desired time and press Enter</li>
                <li>Extend your selection with arrow keys</li>
                <li>Press Enter again to place the activity</li>
            </ul>
        </div>
    `;

    // Add toggle functionality
    const toggleBtn = instructionsPanel.querySelector('.keyboard-instructions-toggle');
    const shortcutsList = instructionsPanel.querySelector('#keyboard-shortcuts-list');

    toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
        shortcutsList.hidden = isExpanded;
        instructionsPanel.classList.toggle('expanded', !isExpanded);
    });

    // Insert after timeline canvas
    const timelineCanvas = document.querySelector('.timeline-canvas');
    if (timelineCanvas) {
        timelineCanvas.parentNode.insertBefore(instructionsPanel, timelineCanvas.nextSibling);
    } else {
        document.body.appendChild(instructionsPanel);
    }
}

/**
 * Update activity cache from DOM
 */
function updateActivityCache() {
    activityCache.clear();

    if (!activeTimeline) return;

    const activities = activeTimeline.querySelectorAll('.activity-block');
    activities.forEach(activity => {
        const startMinutes = parseInt(activity.dataset.startMinutes, 10);
        const endMinutes = parseInt(activity.dataset.endMinutes, 10);
        const name = activity.querySelector('[class^="activity-block-text"]')?.textContent?.trim() || 'Activity';

        // Mark each slot covered by this activity
        for (let minutes = startMinutes; minutes < endMinutes; minutes += INCREMENT_MINUTES) {
            const slotIndex = minutesToSlotIndex(minutes);
            if (slotIndex >= 0 && slotIndex < TOTAL_SLOTS) {
                activityCache.set(slotIndex, {
                    name,
                    startMinutes,
                    endMinutes,
                    element: activity
                });
            }
        }
    });
}

/**
 * Update ARIA labels for all slots based on current activities
 */
function updateSlotAriaLabels() {
    slotElements.forEach((slot, index) => {
        const time = slotIndexToTime(index);
        const status = getSlotStatus(index);
        slot.setAttribute('aria-label', `${time}, ${status}`);
    });
}

/**
 * Get the status of a slot (empty or activity name)
 * @param {number} slotIndex
 * @returns {string}
 */
function getSlotStatus(slotIndex) {
    const activity = activityCache.get(slotIndex);
    if (activity) {
        return activity.name;
    }
    return 'empty';
}

/**
 * Convert minutes to slot index
 * @param {number} minutes
 * @returns {number}
 */
function minutesToSlotIndex(minutes) {
    const adjustedMinutes = minutes - START_MINUTES;
    if (adjustedMinutes < 0) {
        return Math.floor((adjustedMinutes + 1440) / INCREMENT_MINUTES);
    }
    return Math.floor(adjustedMinutes / INCREMENT_MINUTES);
}

/**
 * Position slot elements based on timeline layout (horizontal/vertical)
 * @param {HTMLElement} timelineElement
 */
function positionSlots(timelineElement) {
    const layout = timelineElement.dataset.layout || 'horizontal';
    const isVertical = layout === 'vertical';
    const slotSize = 100 / TOTAL_SLOTS;

    slotElements.forEach((slot, index) => {
        if (isVertical) {
            slot.style.top = `${index * slotSize}%`;
            slot.style.height = `${slotSize}%`;
            slot.style.left = '0';
            slot.style.width = '100%';
        } else {
            slot.style.left = `${index * slotSize}%`;
            slot.style.width = `${slotSize}%`;
            slot.style.top = '0';
            slot.style.height = '100%';
        }
    });
}

/**
 * Handle keydown events on timeline
 * @param {KeyboardEvent} event
 */
function handleTimelineKeydown(event) {
    // Don't interfere with input fields or modals
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    const key = event.key;
    let handled = true;

    switch (key) {
        case 'ArrowRight':
            moveSlot(1);
            break;
        case 'ArrowLeft':
            moveSlot(-1);
            break;
        case 'ArrowDown':
            moveSlot(SLOTS_PER_HOUR); // Move forward 1 hour
            break;
        case 'ArrowUp':
            moveSlot(-SLOTS_PER_HOUR); // Move backward 1 hour
            break;
        case 'Home':
            jumpToSlot(0); // Start of day (4:00 AM)
            break;
        case 'End':
            jumpToSlot(TOTAL_SLOTS - 1); // End of day (3:50 AM)
            break;
        case 'Enter':
        case ' ':
            event.preventDefault(); // Prevent space from scrolling
            toggleSelection();
            break;
        case 'Escape':
            cancelSelection();
            break;
        case 'Tab':
            // Allow normal tab behavior to move focus out
            handleTabOut(event);
            handled = false;
            break;
        case '?':
            // Show/hide instructions panel
            toggleInstructionsPanel();
            break;
        default:
            handled = false;
    }

    if (handled) {
        event.preventDefault();
        event.stopPropagation();
    }
}

/**
 * Toggle the instructions panel visibility
 */
function toggleInstructionsPanel() {
    if (!instructionsPanel) return;

    const toggleBtn = instructionsPanel.querySelector('.keyboard-instructions-toggle');
    if (toggleBtn) {
        toggleBtn.click();
    }
}

/**
 * Handle timeline receiving focus
 * @param {FocusEvent} event
 */
function handleTimelineFocus(event) {
    // Show focus indicator at current slot
    updateFocusIndicator();
    updateSlotFocus();

    // Brief announcement of current position
    const time = slotIndexToTime(currentSlotIndex);
    const status = getSlotStatus(currentSlotIndex);
    announceToScreenReader(`${time}, ${status}. Press question mark for keyboard shortcuts.`);

    // Show instructions panel hint
    if (instructionsPanel) {
        instructionsPanel.classList.add('hint-visible');
        setTimeout(() => {
            instructionsPanel.classList.remove('hint-visible');
        }, 3000);
    }
}

/**
 * Handle timeline losing focus
 * @param {FocusEvent} event
 */
function handleTimelineBlur(event) {
    // Keep selection state but update visual indicators
    const focusIndicator = activeTimeline?.querySelector('.keyboard-focus-indicator');
    if (focusIndicator && !isSelecting) {
        focusIndicator.classList.remove('visible');
    }

    // Update slot focus state
    slotElements.forEach(slot => {
        slot.removeAttribute('aria-current');
    });
}

/**
 * Handle tab key to move focus out of timeline
 * @param {KeyboardEvent} event
 */
function handleTabOut(event) {
    // If selecting, cancel selection on tab out
    if (isSelecting) {
        cancelSelection();
    }
}

/**
 * Move focus by a number of slots
 * @param {number} delta - Number of slots to move (positive = forward, negative = backward)
 */
function moveSlot(delta) {
    const newIndex = Math.max(0, Math.min(TOTAL_SLOTS - 1, currentSlotIndex + delta));

    if (newIndex !== currentSlotIndex) {
        currentSlotIndex = newIndex;
        updateFocusIndicator();
        updateSlotFocus();

        if (isSelecting) {
            updateSelectionHighlight(selectionStartIndex, currentSlotIndex);
            announceSelectionExtend();
        } else {
            // Brief time announcement
            const time = slotIndexToTime(currentSlotIndex);
            const status = getSlotStatus(currentSlotIndex);
            announceToScreenReader(`${time}, ${status}`);
        }
    }
}

/**
 * Jump to a specific slot index
 * @param {number} index
 */
function jumpToSlot(index) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_SLOTS - 1, index));

    if (clampedIndex !== currentSlotIndex) {
        currentSlotIndex = clampedIndex;
        updateFocusIndicator();
        updateSlotFocus();

        if (isSelecting) {
            updateSelectionHighlight(selectionStartIndex, currentSlotIndex);
            announceSelectionExtend();
        } else {
            const time = slotIndexToTime(currentSlotIndex);
            const status = getSlotStatus(currentSlotIndex);
            announceToScreenReader(`${time}, ${status}`);
        }
    }
}

/**
 * Update the slot that has focus (roving tabindex)
 */
function updateSlotFocus() {
    slotElements.forEach((slot, index) => {
        if (index === currentSlotIndex) {
            slot.setAttribute('tabindex', '0');
            slot.setAttribute('aria-current', 'time');
        } else {
            slot.setAttribute('tabindex', '-1');
            slot.removeAttribute('aria-current');
        }
    });
}

/**
 * Update the visual focus indicator position
 */
function updateFocusIndicator() {
    if (!activeTimeline) return;

    const focusIndicator = activeTimeline.querySelector('.keyboard-focus-indicator');
    if (!focusIndicator) return;

    const layout = activeTimeline.dataset.layout || 'horizontal';
    const isVertical = layout === 'vertical';
    const slotSize = 100 / TOTAL_SLOTS;
    const position = currentSlotIndex * slotSize;

    if (isVertical) {
        focusIndicator.style.top = `${position}%`;
        focusIndicator.style.height = `${slotSize}%`;
        focusIndicator.style.left = '0';
        focusIndicator.style.width = '100%';
    } else {
        focusIndicator.style.left = `${position}%`;
        focusIndicator.style.width = `${slotSize}%`;
        focusIndicator.style.top = '0';
        focusIndicator.style.height = '100%';
    }

    focusIndicator.classList.add('visible');

    // Update ARIA attributes on timeline
    const timeString = slotIndexToTime(currentSlotIndex);
    activeTimeline.setAttribute('aria-valuenow', currentSlotIndex);
    activeTimeline.setAttribute('aria-valuetext', timeString);
}

/**
 * Start or confirm time selection
 */
function toggleSelection() {
    if (!window.selectedActivity) {
        // No activity selected - focus the activity selector
        focusActivitySelector();
        return;
    }

    if (!isSelecting) {
        // Start selection
        startSelection();
    } else {
        // Confirm selection
        confirmSelection();
    }
}

/**
 * Focus the activity selector when no activity is selected
 */
function focusActivitySelector() {
    // Announce to screen reader
    announceToScreenReader('Select an activity to place. Use Tab to navigate to the activity list.');
    showVisualFeedback('Select an activity first', 'warning');

    // Try to focus the first activity button or the floating add button (mobile)
    const floatingAddBtn = document.querySelector('.floating-add-button');
    const firstActivityBtn = document.querySelector('.activity-button');
    const activitiesAccordion = document.querySelector('.activities-accordion');

    if (floatingAddBtn && window.innerWidth <= 1440) {
        // Mobile: focus floating add button
        floatingAddBtn.focus();
        floatingAddBtn.click(); // Open the activity modal
    } else if (firstActivityBtn) {
        // Desktop: focus first activity button
        firstActivityBtn.focus();
    } else if (activitiesAccordion) {
        // Fallback: focus accordion container
        activitiesAccordion.setAttribute('tabindex', '-1');
        activitiesAccordion.focus();
    }
}

/**
 * Start a new time range selection
 */
function startSelection() {
    isSelecting = true;
    selectionStartIndex = currentSlotIndex;

    // Update slot ARIA states
    updateSelectionAriaStates();
    updateSelectionHighlight(selectionStartIndex, currentSlotIndex);

    const startTime = slotIndexToTime(selectionStartIndex);
    announceToScreenReader(`Selection started at ${startTime}. Use arrow keys to extend, Enter to confirm.`);

    // Update focus indicator style for selection mode
    const focusIndicator = activeTimeline?.querySelector('.keyboard-focus-indicator');
    if (focusIndicator) {
        focusIndicator.classList.add('selecting');
    }

    // Add selection-start class to current slot
    slotElements[currentSlotIndex]?.classList.add('selection-start');
}

/**
 * Announce selection extension
 */
function announceSelectionExtend() {
    const minIndex = Math.min(selectionStartIndex, currentSlotIndex);
    const maxIndex = Math.max(selectionStartIndex, currentSlotIndex);

    const startTime = slotIndexToTime(minIndex);
    const endTime = slotIndexToTime(maxIndex + 1); // +1 for exclusive end
    const duration = (maxIndex - minIndex + 1) * INCREMENT_MINUTES;

    // Format duration nicely
    let durationText;
    if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        durationText = hours === 1 ? '1 hour' : `${hours} hours`;
        if (minutes > 0) {
            durationText += ` ${minutes} minutes`;
        }
    } else {
        durationText = `${duration} minutes`;
    }

    announceToScreenReader(`${startTime} to ${endTime} selected, ${durationText}`);
}

/**
 * Update ARIA selected states for slots in selection range
 */
function updateSelectionAriaStates() {
    const minIndex = Math.min(selectionStartIndex ?? currentSlotIndex, currentSlotIndex);
    const maxIndex = Math.max(selectionStartIndex ?? currentSlotIndex, currentSlotIndex);

    slotElements.forEach((slot, index) => {
        const inRange = isSelecting && index >= minIndex && index <= maxIndex;
        slot.setAttribute('aria-selected', String(inRange));

        // Update visual classes
        slot.classList.toggle('in-selection', inRange);
        slot.classList.remove('selection-start', 'selection-end');

        if (inRange && index === minIndex) {
            slot.classList.add('selection-start');
        }
        if (inRange && index === maxIndex) {
            slot.classList.add('selection-end');
        }
    });
}

/**
 * Confirm the current selection and place activity
 */
function confirmSelection() {
    if (selectionStartIndex === null) {
        cancelSelection();
        return;
    }

    const startIndex = Math.min(selectionStartIndex, currentSlotIndex);
    const endIndex = Math.max(selectionStartIndex, currentSlotIndex);

    const startMinutes = slotIndexToMinutes(startIndex);
    const endMinutes = slotIndexToMinutes(endIndex) + INCREMENT_MINUTES; // End is exclusive

    const startTime = slotIndexToTime(startIndex);
    const endTime = slotIndexToTime(endIndex + 1); // +1 because end is exclusive

    // Check if placement is valid (no overlaps)
    if (!canPlaceInRange(startMinutes, endMinutes)) {
        announceToScreenReader('Cannot place activity here. Time slot overlaps with existing activity.');
        showVisualFeedback('Time slot occupied', 'error');
        return;
    }

    // Announce that activity selection is next
    const activityName = window.selectedActivity.selections
        ? window.selectedActivity.selections.map(s => s.name).join(', ')
        : window.selectedActivity.name;

    // Place the activity using the existing mechanism
    placeActivityViaKeyboard(startMinutes, endMinutes);

    // Announce success
    announceToScreenReader(`${activityName} added from ${startTime} to ${endTime}.`);
    showVisualFeedback(`Activity placed: ${startTime} - ${endTime}`, 'success');

    // Reset selection state
    resetSelectionState();
    updateSelectionAriaStates();

    // Update activity cache
    updateActivityCache();
    updateSlotAriaLabels();

    // Move focus to start of placed activity
    currentSlotIndex = startIndex;
    updateFocusIndicator();
    updateSlotFocus();
}

/**
 * Cancel the current selection
 */
function cancelSelection() {
    if (isSelecting) {
        announceToScreenReader('Selection cancelled.');
    }

    resetSelectionState();
    updateSelectionAriaStates();
    updateFocusIndicator();
}

/**
 * Reset all selection state
 */
function resetSelectionState() {
    isSelecting = false;
    selectionStartIndex = null;

    // Hide selection highlight
    if (selectionOverlay) {
        selectionOverlay.style.display = 'none';
    }

    // Remove selecting class from focus indicator
    const focusIndicator = activeTimeline?.querySelector('.keyboard-focus-indicator');
    if (focusIndicator) {
        focusIndicator.classList.remove('selecting');
    }

    // Clear selection classes from slots
    slotElements.forEach(slot => {
        slot.classList.remove('selection-start', 'selection-end', 'in-selection');
        slot.setAttribute('aria-selected', 'false');
    });
}

/**
 * Update the visual selection range highlight
 * @param {number} startIndex
 * @param {number} endIndex
 */
function updateSelectionHighlight(startIndex, endIndex) {
    if (!selectionOverlay || !activeTimeline) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    const layout = activeTimeline.dataset.layout || 'horizontal';
    const isVertical = layout === 'vertical';
    const slotSize = 100 / TOTAL_SLOTS;

    const startPosition = minIndex * slotSize;
    const size = (maxIndex - minIndex + 1) * slotSize;

    if (isVertical) {
        selectionOverlay.style.top = `${startPosition}%`;
        selectionOverlay.style.height = `${size}%`;
        selectionOverlay.style.left = '0';
        selectionOverlay.style.width = '100%';
    } else {
        selectionOverlay.style.left = `${startPosition}%`;
        selectionOverlay.style.width = `${size}%`;
        selectionOverlay.style.top = '0';
        selectionOverlay.style.height = '100%';
    }

    selectionOverlay.style.display = 'block';

    // Update ARIA states for all slots
    updateSelectionAriaStates();
}

/**
 * Check if activity can be placed in the given time range
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @returns {boolean}
 */
function canPlaceInRange(startMinutes, endMinutes) {
    // Use existing canPlaceActivity function if available
    if (typeof window.canPlaceActivity === 'function') {
        return window.canPlaceActivity(startMinutes, endMinutes);
    }

    // Fallback: check for overlaps using cache
    for (let minutes = startMinutes; minutes < endMinutes; minutes += INCREMENT_MINUTES) {
        const slotIndex = minutesToSlotIndex(minutes);
        if (activityCache.has(slotIndex)) {
            return false;
        }
    }

    return true;
}

/**
 * Place activity on timeline using keyboard selection
 * @param {number} startMinutes
 * @param {number} endMinutes
 */
function placeActivityViaKeyboard(startMinutes, endMinutes) {
    if (!window.selectedActivity || !activeTimeline) {
        console.warn('KeyboardNavigation: Cannot place activity - no selection or timeline');
        return;
    }

    // Dispatch a custom event that the main script can listen for
    const event = new CustomEvent('keyboardActivityPlace', {
        bubbles: true,
        cancelable: true,
        detail: {
            startMinutes,
            endMinutes,
            activity: window.selectedActivity,
            timeline: activeTimeline
        }
    });

    activeTimeline.dispatchEvent(event);

    // If the event wasn't handled, try to place directly
    if (!event.defaultPrevented) {
        placeActivityDirectly(startMinutes, endMinutes);
    }
}

/**
 * Directly place activity on timeline (fallback if event not handled)
 * @param {number} startMinutes
 * @param {number} endMinutes
 */
function placeActivityDirectly(startMinutes, endMinutes) {
    const activity = window.selectedActivity;
    if (!activity || !activeTimeline) return;

    const layout = activeTimeline.dataset.layout || 'horizontal';
    const isVertical = layout === 'vertical';

    // Calculate position percentages
    const startPercent = ((startMinutes - START_MINUTES) / (TOTAL_SLOTS * INCREMENT_MINUTES)) * 100;
    const sizePercent = ((endMinutes - startMinutes) / (TOTAL_SLOTS * INCREMENT_MINUTES)) * 100;

    // Format times
    const startTime = minutesToTimeString(startMinutes);
    const endTime = minutesToTimeString(endMinutes);

    // Create activity block element
    const block = document.createElement('div');
    block.className = 'activity-block';
    const blockId = generateUniqueId();
    block.dataset.id = blockId;
    block.dataset.start = startTime;
    block.dataset.end = endTime;
    block.dataset.startMinutes = startMinutes;
    block.dataset.endMinutes = endMinutes;
    block.dataset.length = endMinutes - startMinutes;
    block.dataset.category = activity.category || '';
    block.dataset.timelineKey = activeTimeline.id;
    block.style.backgroundColor = activity.color || '#4A90D9';

    // Position based on layout
    if (isVertical) {
        block.style.top = `${startPercent}%`;
        block.style.height = `${sizePercent}%`;
        block.style.left = '25%';
        block.style.width = '75%';
    } else {
        block.style.left = `${startPercent}%`;
        block.style.width = `${sizePercent}%`;
        block.style.top = '25%';
        block.style.height = '75%';
    }

    // Get activity name
    const activityName = activity.selections
        ? activity.selections.map(s => s.name).join(', ')
        : activity.name;

    // Add content
    block.innerHTML = `
        <div class="activity-block-text-narrow">${activityName}</div>
        <div class="time-label">${startTime} - ${endTime}</div>
    `;

    // Make block accessible
    block.setAttribute('tabindex', '0');
    block.setAttribute('role', 'button');
    block.setAttribute('aria-label', `${activityName}, ${startTime} to ${endTime}. Press Delete to remove.`);

    // Add to activities container
    const activitiesContainer = activeTimeline.querySelector('.activities');
    if (activitiesContainer) {
        activitiesContainer.appendChild(block);
    }

    // Add to timeline data if timelineManager exists
    if (window.timelineManager && typeof window.getCurrentTimelineData === 'function') {
        const activityData = {
            id: block.dataset.id,
            activity: activityName,
            category: activity.category,
            startTime: formatFullTimestamp(startMinutes),
            endTime: formatFullTimestamp(endMinutes),
            blockLength: endMinutes - startMinutes,
            color: activity.color,
            count: 1,
            parentName: activity.parentName || null,
            selected: activity.selected || null
        };

        window.getCurrentTimelineData().push(activityData);
    }

    // Clear selected activity
    window.selectedActivity = null;

    // Trigger validation if available
    if (typeof window.validateTimeline === 'function') {
        window.validateTimeline();
    }

    // Update UI state
    if (typeof window.updateButtonStates === 'function') {
        window.updateButtonStates();
    }
}

/**
 * Convert slot index to minutes since midnight
 * @param {number} index
 * @returns {number}
 */
function slotIndexToMinutes(index) {
    return START_MINUTES + (index * INCREMENT_MINUTES);
}

/**
 * Convert slot index to time string (e.g., "9:30 AM")
 * @param {number} index
 * @returns {string}
 */
function slotIndexToTime(index) {
    const minutes = slotIndexToMinutes(index);
    return minutesToTimeString(minutes);
}

/**
 * Convert minutes to time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string}
 */
function minutesToTimeString(minutes) {
    // Handle wrap-around past midnight
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;

    let hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;

    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${hours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format full timestamp for activity data
 * @param {number} minutes
 * @returns {string}
 */
function formatFullTimestamp(minutes) {
    const now = new Date();
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;

    const hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Generate unique ID for activity
 * @returns {string}
 */
function generateUniqueId() {
    if (typeof window.generateUniqueId === 'function') {
        return window.generateUniqueId();
    }
    return `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Announce message to screen readers via ARIA live region
 * @param {string} message
 * @param {string} priority - 'polite' or 'assertive'
 */
function announceToScreenReader(message, priority = 'assertive') {
    if (!announcerElement) {
        createAnnouncerElement();
    }

    announcerElement.setAttribute('aria-live', priority);

    // Clear and set to trigger announcement
    announcerElement.textContent = '';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            announcerElement.textContent = message;
        });
    });
}

/**
 * Show visual feedback for keyboard actions
 * @param {string} message
 * @param {string} type - 'info', 'warning', 'error', 'success'
 */
function showVisualFeedback(message, type = 'info') {
    let feedback = document.getElementById('keyboard-nav-feedback');

    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'keyboard-nav-feedback';
        feedback.className = 'keyboard-nav-feedback';
        feedback.setAttribute('role', 'alert');
        feedback.setAttribute('aria-live', 'polite');
        document.body.appendChild(feedback);
    }

    feedback.textContent = message;
    feedback.className = `keyboard-nav-feedback ${type} visible`;

    // Auto-hide after delay
    setTimeout(() => {
        feedback.classList.remove('visible');
    }, 2500);
}

/**
 * Convert time string to slot index
 * @param {string} timeString - e.g., "9:30 AM" or "09:30"
 * @returns {number}
 */
export function timeToSlotIndex(timeString) {
    let hours = 0;
    let minutes = 0;

    // Handle "HH:MM" format
    if (timeString.includes(':')) {
        const parts = timeString.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (parts) {
            hours = parseInt(parts[1], 10);
            minutes = parseInt(parts[2], 10);

            if (parts[3]) {
                const period = parts[3].toUpperCase();
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
            }
        }
    }

    const totalMinutes = hours * 60 + minutes;

    // Adjust for 4 AM start
    let adjustedMinutes = totalMinutes - START_MINUTES;
    if (adjustedMinutes < 0) {
        adjustedMinutes += 1440; // Wrap around
    }

    return Math.floor(adjustedMinutes / INCREMENT_MINUTES);
}

/**
 * Jump to a specific time
 * @param {string} timeString
 */
export function jumpToTime(timeString) {
    const index = timeToSlotIndex(timeString);
    jumpToSlot(index);
}

/**
 * Get current navigation state
 * @returns {Object}
 */
export function getNavigationState() {
    return {
        currentSlotIndex,
        currentTime: slotIndexToTime(currentSlotIndex),
        currentMinutes: slotIndexToMinutes(currentSlotIndex),
        isSelecting,
        selectionStartIndex,
        selectionStartTime: selectionStartIndex !== null ? slotIndexToTime(selectionStartIndex) : null
    };
}

/**
 * Programmatically focus the timeline
 */
export function focusTimeline() {
    if (activeTimeline) {
        activeTimeline.focus();
    }
}

/**
 * Focus the timeline at a specific slot (used after activity placement)
 * @param {number} slotIndex - The slot to focus on
 */
export function focusTimelineAtSlot(slotIndex) {
    if (activeTimeline) {
        currentSlotIndex = Math.max(0, Math.min(TOTAL_SLOTS - 1, slotIndex));
        activeTimeline.focus();
        updateFocusIndicator();
        updateSlotFocus();
    }
}

/**
 * Listen for activity selection to return focus to timeline
 */
export function setupActivitySelectionListener() {
    // Watch for selectedActivity changes
    let lastSelectedActivity = window.selectedActivity;

    const checkSelection = () => {
        if (window.selectedActivity && !lastSelectedActivity) {
            // Activity was just selected - announce and offer to return to timeline
            const activityName = window.selectedActivity.selections
                ? window.selectedActivity.selections.map(s => s.name).join(', ')
                : window.selectedActivity.name;

            announceToScreenReader(`${activityName} selected. Return to timeline to place it.`, 'polite');
        }
        lastSelectedActivity = window.selectedActivity;
    };

    // Check periodically (simpler than Proxy for window property)
    setInterval(checkSelection, 500);
}

/**
 * Refresh activity cache and slot labels
 * Call this after activities are modified externally
 */
export function refreshActivityState() {
    updateActivityCache();
    updateSlotAriaLabels();
}

// Export constants for external use
export { SLOTS_PER_HOUR, TOTAL_SLOTS, START_MINUTES };
