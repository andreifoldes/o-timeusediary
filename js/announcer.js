/**
 * Screen reader announcement utility
 * Uses ARIA live regions to announce dynamic content changes
 *
 * This module provides a way to announce changes to screen reader users
 * without disrupting their current focus or reading position.
 */

const ANNOUNCER_ID = 'otud-a11y-announcer';

let announcer = null;

/**
 * Initialize the ARIA live region announcer
 * Creates a visually hidden element that screen readers will monitor
 */
export function initAnnouncer() {
  if (document.getElementById(ANNOUNCER_ID)) {
    announcer = document.getElementById(ANNOUNCER_ID);
    return;
  }

  announcer = document.createElement('div');
  announcer.id = ANNOUNCER_ID;
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('role', 'status');
  announcer.className = 'sr-only';
  document.body.appendChild(announcer);

  console.log('[announcer] ARIA live region initialized');
}

/**
 * Announce a message to screen reader users
 * @param {string} message - The message to announce
 * @param {'polite'|'assertive'} priority - Priority level (polite waits, assertive interrupts)
 */
export function announce(message, priority = 'polite') {
  if (!announcer) initAnnouncer();

  // Update priority if different from current
  if (announcer.getAttribute('aria-live') !== priority) {
    announcer.setAttribute('aria-live', priority);
  }

  // Clear the announcer first to ensure the new message is announced
  // even if it's the same as the previous one
  announcer.textContent = '';

  // Use setTimeout to ensure the DOM update is recognized by screen readers
  // The clearing and setting must happen in separate event loops
  setTimeout(() => {
    announcer.textContent = message;
    console.log(`[announcer] ${priority}: "${message}"`);
  }, 100);
}

/**
 * Announce an urgent message that interrupts the current speech
 * Use sparingly - only for critical information like errors
 * @param {string} message - The urgent message to announce
 */
export function announceUrgent(message) {
  announce(message, 'assertive');
}

/**
 * Announce activity placement
 * @param {string} activityName - Name of the activity
 * @param {string} startTime - Start time (e.g., "4:00 AM")
 * @param {string} endTime - End time (e.g., "7:30 AM")
 */
export function announceActivityPlaced(activityName, startTime, endTime) {
  announce(`${activityName} activity placed from ${startTime} to ${endTime}`);
}

/**
 * Announce activity removal
 * @param {string} activityName - Name of the removed activity (optional)
 */
export function announceActivityRemoved(activityName = null) {
  if (activityName) {
    announce(`${activityName} activity removed`);
  } else {
    announce('Activity removed');
  }
}

/**
 * Announce activity resize/adjustment
 * @param {string} activityName - Name of the activity
 * @param {string} startTime - New start time
 * @param {string} endTime - New end time
 */
export function announceActivityResized(activityName, startTime, endTime) {
  announce(`${activityName} adjusted to ${startTime} to ${endTime}`);
}

/**
 * Announce timeline navigation
 * @param {number} currentIndex - Current timeline index (0-based)
 * @param {number} totalTimelines - Total number of timelines
 * @param {string} timelineName - Name/label of the current timeline
 */
export function announceTimelineChange(currentIndex, totalTimelines, timelineName = null) {
  const position = `Timeline ${currentIndex + 1} of ${totalTimelines}`;
  if (timelineName) {
    announce(`${position}: ${timelineName}`);
  } else {
    announce(position);
  }
}

/**
 * Announce validation error
 * @param {string} errorMessage - The error message to announce
 */
export function announceError(errorMessage) {
  announceUrgent(errorMessage);
}

/**
 * Announce successful action
 * @param {string} successMessage - The success message to announce
 */
export function announceSuccess(successMessage) {
  announce(successMessage);
}

/**
 * Announce form submission status
 * @param {'submitting'|'success'|'error'} status - Submission status
 * @param {string} message - Optional custom message
 */
export function announceSubmissionStatus(status, message = null) {
  switch (status) {
    case 'submitting':
      announce(message || 'Submitting your diary, please wait...');
      break;
    case 'success':
      announceUrgent(message || 'Your diary has been submitted successfully!');
      break;
    case 'error':
      announceUrgent(message || 'Submission failed. Please try again.');
      break;
  }
}

/**
 * Announce undo action
 * @param {string} actionDescription - Description of what was undone
 */
export function announceUndo(actionDescription = null) {
  if (actionDescription) {
    announce(`Undone: ${actionDescription}`);
  } else {
    announce('Action undone');
  }
}

/**
 * Announce row/timeline cleared
 */
export function announceRowCleared() {
  announce('Timeline cleared');
}
