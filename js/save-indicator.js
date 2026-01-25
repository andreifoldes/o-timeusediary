/**
 * Visual indicator for autosave status
 * Provides non-intrusive feedback when data is being saved
 */

let indicatorElement = null;
let hideTimeout = null;

/**
 * Initialize the save indicator element
 * Creates the DOM element if it doesn't exist
 */
export function initSaveIndicator() {
  if (indicatorElement) return;

  indicatorElement = document.createElement('div');
  indicatorElement.className = 'save-indicator';
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

  document.body.appendChild(indicatorElement);
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
  clearTimeout(hideTimeout);

  const textEl = getTextElement();
  const iconEl = getIconElement();

  textEl.textContent = 'Saving...';
  iconEl.innerHTML = `
    <svg class="save-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
    </svg>
  `;

  indicatorElement.className = 'save-indicator visible saving';
}

/**
 * Show "Saved" state with checkmark (auto-hides after 2s)
 */
export function showSaved() {
  if (!indicatorElement) initSaveIndicator();
  clearTimeout(hideTimeout);

  const textEl = getTextElement();
  const iconEl = getIconElement();

  textEl.textContent = 'Saved';
  iconEl.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;

  indicatorElement.className = 'save-indicator visible saved';

  hideTimeout = setTimeout(() => {
    indicatorElement.className = 'save-indicator';
  }, 2000);
}

/**
 * Show error state with X icon
 * @param {string} message - Error message to display
 */
export function showSaveError(message = 'Save failed') {
  if (!indicatorElement) initSaveIndicator();
  clearTimeout(hideTimeout);

  const textEl = getTextElement();
  const iconEl = getIconElement();

  textEl.textContent = message;
  iconEl.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `;

  indicatorElement.className = 'save-indicator visible error';

  hideTimeout = setTimeout(() => {
    indicatorElement.className = 'save-indicator';
  }, 4000);
}

/**
 * Hide the indicator immediately
 */
export function hideIndicator() {
  if (!indicatorElement) return;
  clearTimeout(hideTimeout);
  indicatorElement.className = 'save-indicator';
}

/**
 * Check if indicator is currently visible
 * @returns {boolean}
 */
export function isIndicatorVisible() {
  return indicatorElement?.classList.contains('visible') ?? false;
}
