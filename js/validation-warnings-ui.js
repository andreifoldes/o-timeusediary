/**
 * UI for research validation warnings
 * Follows the recovery-modal.js pattern: overlay + inner dialog, focus trap,
 * entrance/exit animations, body-scroll lock, full keyboard + screen-reader support.
 */

import { validateDiaryQuality } from './research-validation.js';

/**
 * Show validation warnings panel before submission.
 * Resolves immediately with 'submit' when there are no warnings.
 * @param {Array} activities - Activities from timelineManager.activities[key]
 * @returns {Promise<'submit'|'review'>} User's choice
 */
export function showValidationWarnings(activities) {
  const validation = validateDiaryQuality(activities);

  if (validation.warnings.length === 0) {
    return Promise.resolve('submit');
  }

  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const overlay = createWarningsOverlay(validation, resolve, previouslyFocused);
    document.body.appendChild(overlay);

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });
  });
}

// ---------------------------------------------------------------------------
// DOM construction
// ---------------------------------------------------------------------------

function createWarningsOverlay(validation, resolve, previouslyFocused) {
  const overlay = document.createElement('div');
  overlay.className = 'validation-overlay';
  overlay.setAttribute('role', 'presentation');

  const modal = document.createElement('div');
  modal.className = 'validation-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'validation-title');
  modal.setAttribute('aria-describedby', 'validation-desc');
  modal.setAttribute('tabindex', '-1');

  const scoreClass =
    validation.score >= 80 ? 'good' : validation.score >= 60 ? 'fair' : 'needs-attention';

  const warningCount = validation.warnings.length;

  modal.innerHTML = `
    <header class="validation-header">
      <h2 id="validation-title">Review Your Diary</h2>
      <div class="quality-score ${scoreClass}" role="status" aria-label="Quality score: ${validation.score} out of 100">
        <span class="score-value">${validation.score}</span>
        <span class="score-label">Quality Score</span>
      </div>
    </header>

    <div class="validation-body">
      <p id="validation-desc" class="validation-intro">
        We found ${warningCount} thing${warningCount > 1 ? 's' : ''} you might want to review:
      </p>

      <ul class="warnings-list" role="list">
        ${validation.warnings.map(warning => `
          <li class="warning-item warning-${warning.severity}">
            <span class="warning-icon" aria-hidden="true">
              ${warning.severity === 'moderate'
                ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L1 18h18L10 2z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M10 8v4M10 14h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v4M10 7h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
              }
            </span>
            <div class="warning-content">
              <p class="warning-message">${escapeHtml(warning.message)}</p>
              <p class="warning-suggestion">${escapeHtml(warning.suggestion)}</p>
              ${warning.activityId ? `
                <button type="button" class="warning-link" data-activity-id="${escapeHtml(warning.activityId)}">
                  Go to this activity
                </button>
              ` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    <footer class="validation-footer">
      <p class="validation-note">
        These are suggestions to help improve data quality. You can still submit if everything looks correct.
      </p>
      <div class="validation-actions">
        <button type="button" class="btn btn-secondary" id="validation-review">
          Review My Diary
        </button>
        <button type="button" class="btn btn-primary" id="validation-submit">
          Submit Anyway
        </button>
      </div>
    </footer>
  `;

  overlay.appendChild(modal);

  // ---------------------------------------------------------------------------
  // Focus management
  // ---------------------------------------------------------------------------
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const submitBtn = modal.querySelector('#validation-submit');
  const reviewBtn = modal.querySelector('#validation-review');
  const activityLinks = Array.from(modal.querySelectorAll('.warning-link'));
  const focusableElements = [reviewBtn, ...activityLinks, submitBtn];
  let currentFocusIndex = 0;

  // Announce to screen reader then move focus to first button
  modal.focus();
  setTimeout(() => {
    reviewBtn.focus();
  }, 50);

  // ---------------------------------------------------------------------------
  // Cleanup helper
  // ---------------------------------------------------------------------------
  const cleanup = (result) => {
    document.removeEventListener('keydown', handleKeydown);
    overlay.classList.add('closing');

    setTimeout(() => {
      document.body.style.overflow = originalOverflow;
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      resolve(result);
    }, 200);
  };

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  submitBtn.addEventListener('click', () => cleanup('submit'));
  reviewBtn.addEventListener('click', () => cleanup('review'));

  // Activity "go-to" links
  activityLinks.forEach(link => {
    link.addEventListener('click', () => {
      const activityId = link.dataset.activityId;
      cleanup('review');
      // Wait for modal exit animation before scrolling
      setTimeout(() => highlightActivity(activityId), 250);
    });
  });

  // Click outside modal → redirect focus (don't dismiss)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      reviewBtn.focus();
      currentFocusIndex = 0;
    }
  });

  /** @param {KeyboardEvent} e */
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup('review');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        currentFocusIndex =
          (currentFocusIndex - 1 + focusableElements.length) % focusableElements.length;
      } else {
        currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
      }
      focusableElements[currentFocusIndex].focus();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  return overlay;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Scroll to and visually highlight an activity block on the timeline.
 */
function highlightActivity(activityId) {
  const block = document.querySelector(`.activity-block[data-id="${activityId}"]`);
  if (!block) return;

  block.scrollIntoView({ behavior: 'smooth', block: 'center' });
  block.classList.add('highlight-pulse');
  setTimeout(() => block.classList.remove('highlight-pulse'), 2000);
}

/**
 * Basic HTML-entity escaping to prevent injection from activity names.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
