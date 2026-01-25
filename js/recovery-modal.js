/**
 * Accessible recovery modal for draft restoration
 * WCAG 2.1 AA compliant with focus management and keyboard navigation
 */

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Human-readable time
 */
function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const date = new Date(timestamp);

  // Less than 1 minute
  if (diff < 60000) {
    return 'just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  // Check if yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (date.toDateString() === yesterday.toDateString()) {
    return `yesterday at ${timeStr}`;
  }

  // More than 24 hours - show full date
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Show recovery modal and wait for user decision
 * @param {number} timestamp - When the draft was saved
 * @returns {Promise<'restore'|'discard'>}
 */
export function showRecoveryModal(timestamp) {
  return new Promise((resolve) => {
    // Store the element that had focus before opening modal
    const previouslyFocused = document.activeElement;

    // Create modal container
    const overlay = document.createElement('div');
    overlay.className = 'recovery-modal-overlay';
    overlay.setAttribute('role', 'presentation');

    const modal = document.createElement('div');
    modal.className = 'recovery-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'recovery-modal-title');
    modal.setAttribute('aria-describedby', 'recovery-modal-desc');
    modal.setAttribute('tabindex', '-1');

    const timeAgo = formatTimestamp(timestamp);

    modal.innerHTML = `
      <div class="recovery-modal-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M12 7v5l4 2"/>
        </svg>
      </div>
      <h2 id="recovery-modal-title">Restore your previous session?</h2>
      <p id="recovery-modal-desc">
        We found unsaved data from <strong>${timeAgo}</strong>.
        Would you like to continue where you left off?
      </p>
      <div class="recovery-modal-actions">
        <button type="button" class="btn btn-primary" id="recovery-restore">
          <i class="fas fa-undo" aria-hidden="true"></i>
          Restore My Work
        </button>
        <button type="button" class="btn btn-secondary" id="recovery-discard">
          <i class="fas fa-file" aria-hidden="true"></i>
          Start Fresh
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Prevent body scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Get focusable elements
    const restoreBtn = modal.querySelector('#recovery-restore');
    const discardBtn = modal.querySelector('#recovery-discard');
    const focusableElements = [restoreBtn, discardBtn];
    let currentFocusIndex = 0;

    // Focus the modal first for screen reader announcement, then move to first button
    modal.focus();
    setTimeout(() => {
      restoreBtn.focus();
    }, 50);

    /**
     * Clean up modal and restore state
     * @param {'restore'|'discard'} result
     */
    const cleanup = (result) => {
      // Remove event listeners
      document.removeEventListener('keydown', handleKeydown);

      // Animate out
      overlay.classList.add('closing');

      setTimeout(() => {
        // Restore body scroll
        document.body.style.overflow = originalOverflow;

        // Remove modal
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }

        // Restore focus to previously focused element
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }

        resolve(result);
      }, 200);
    };

    /**
     * Handle keyboard events for accessibility
     * @param {KeyboardEvent} e
     */
    const handleKeydown = (e) => {
      // Escape key = Start Fresh (discard)
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup('discard');
        return;
      }

      // Tab key = focus trap
      if (e.key === 'Tab') {
        e.preventDefault();

        if (e.shiftKey) {
          // Shift+Tab: move backwards
          currentFocusIndex = (currentFocusIndex - 1 + focusableElements.length) % focusableElements.length;
        } else {
          // Tab: move forward
          currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
        }

        focusableElements[currentFocusIndex].focus();
      }

      // Enter key on focused button (handled by click, but ensure it works)
      if (e.key === 'Enter' && document.activeElement === restoreBtn) {
        e.preventDefault();
        cleanup('restore');
      }

      if (e.key === 'Enter' && document.activeElement === discardBtn) {
        e.preventDefault();
        cleanup('discard');
      }
    };

    // Button click handlers
    restoreBtn.addEventListener('click', () => {
      cleanup('restore');
    });

    discardBtn.addEventListener('click', () => {
      cleanup('discard');
    });

    // Click on overlay (outside modal) redirects focus back to modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        // Don't close on outside click - redirect focus for accessibility
        restoreBtn.focus();
        currentFocusIndex = 0;
      }
    });

    // Add keydown listener
    document.addEventListener('keydown', handleKeydown);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
  });
}

/**
 * Check if recovery modal is currently open
 * @returns {boolean}
 */
export function isRecoveryModalOpen() {
  return document.querySelector('.recovery-modal-overlay') !== null;
}
