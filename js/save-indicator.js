/**
 * Visual indicator for autosave status
 * Provides non-intrusive feedback when data is being saved
 */

let indicatorElement = null;
let resetTimeout = null;

/**
 * Initialize the save indicator element
 * Creates the DOM element if it doesn't exist
 */
export function initSaveIndicator() {
  if (indicatorElement) return;

  indicatorElement = document.createElement('div');
  indicatorElement.className = 'save-indicator visible idle';
  indicatorElement.id = 'save-indicator';

  // Accessibility attributes
  indicatorElement.setAttribute('role', 'status');
  indicatorElement.setAttribute('aria-live', 'polite');
  indicatorElement.setAttribute('aria-atomic', 'true');

  // Add icon container for visual feedback
  indicatorElement.innerHTML = `
    <span class="save-indicator-icon" aria-hidden="true"></span>
    <span class="save-indicator-text"></span>
  `;

  const iconEl = indicatorElement.querySelector('.save-indicator-icon');
  const textEl = indicatorElement.querySelector('.save-indicator-text');
  if (iconEl) {
    iconEl.innerHTML = `
      <svg class="save-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
      </svg>
    `;
  }
  if (textEl) {
    textEl.textContent = 'Autosave active';
  }

  const header = document.querySelector('.header-section');
  (header || document.body).appendChild(indicatorElement);
}

/**
 * Get or create the indicator text element
 * @returns {HTMLElement}
 */
function getTextElement() {
  if (!indicatorElement) initSaveIndicator();
  return indicatorElement.querySelector('.save-indicator-text');
}

/**
 * Get or create the indicator icon element
 * @returns {HTMLElement}
 */
function getIconElement() {
  if (!indicatorElement) initSaveIndicator();
  return indicatorElement.querySelector('.save-indicator-icon');
}

/**
 * Show "Saving..." state with spinner
 */
export function showSaving() {
  if (!indicatorElement) initSaveIndicator();
  clearTimeout(resetTimeout);

  const textEl = getTextElement();
  const iconEl = getIconElement();

  textEl.textContent = 'Saving...';
  iconEl.innerHTML = `
    <svg class="save-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
    </svg>
  `;

  indicatorElement.className = 'save-indicator visible saving spinning';
}

/**
 * Show "Saved" state with checkmark (auto-hides after 2s)
 */
export function showSaved() {
  if (!indicatorElement) initSaveIndicator();
  clearTimeout(resetTimeout);

  const textEl = getTextElement();
  const iconEl = getIconElement();

  textEl.textContent = 'Saved';
  iconEl.innerHTML = `
    <svg class="save-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
    </svg>
  `;

  indicatorElement.className = 'save-indicator visible saved spinning';

  resetTimeout = setTimeout(() => {
    indicatorElement.className = 'save-indicator visible idle';
  }, 1000);
}

/**
 * Show error state with X icon
 * @param {string} message - Error message to display
 */
export function showSaveError(message = 'Save failed') {
  if (!indicatorElement) initSaveIndicator();
  clearTimeout(resetTimeout);

  const textEl = getTextElement();
  const iconEl = getIconElement();

  textEl.textContent = message;
  iconEl.innerHTML = `
    <svg class="save-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
    </svg>
  `;

  indicatorElement.className = 'save-indicator visible error';

  resetTimeout = setTimeout(() => {
    indicatorElement.className = 'save-indicator visible idle';
  }, 4000);
}

/**
 * Hide the indicator immediately
 */
export function hideIndicator() {
  if (!indicatorElement) return;
  clearTimeout(resetTimeout);
  indicatorElement.className = 'save-indicator visible idle';
}

/**
 * Check if indicator is currently visible
 * @returns {boolean}
 */
export function isIndicatorVisible() {
  return indicatorElement?.classList.contains('visible') ?? false;
}
