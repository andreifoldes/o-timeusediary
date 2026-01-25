/**
 * Preferences Panel - Manual control for accessibility settings
 * Allows users to override system preferences for motion and contrast
 * Settings persist for session only (sessionStorage)
 */

// ==========================================================================
// Preference Getters - Priority: User override > System preference > Default
// ==========================================================================

/**
 * Get the effective motion preference
 * @returns {boolean} true if reduced motion should be applied
 */
export function getMotionPreference() {
    const override = sessionStorage.getItem('otud-motion-pref');
    if (override !== null) return override === 'reduce';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get the effective contrast preference
 * @returns {boolean} true if high contrast should be applied
 */
export function getContrastPreference() {
    const override = sessionStorage.getItem('otud-contrast-pref');
    if (override !== null) return override === 'high';
    return window.matchMedia('(prefers-contrast: more)').matches;
}

// ==========================================================================
// Preference Application
// ==========================================================================

/**
 * Apply preferences by adding/removing classes on <html>
 * Classes work alongside media queries for CSS styling
 */
export function applyPreferences() {
    document.documentElement.classList.toggle('reduce-motion', getMotionPreference());
    document.documentElement.classList.toggle('high-contrast', getContrastPreference());
}

/**
 * Set motion preference override
 * @param {boolean|null} reduce - true for reduced motion, false for normal, null to clear
 */
export function setMotionPreference(reduce) {
    if (reduce === null) {
        sessionStorage.removeItem('otud-motion-pref');
    } else {
        sessionStorage.setItem('otud-motion-pref', reduce ? 'reduce' : 'normal');
    }
    applyPreferences();
}

/**
 * Set contrast preference override
 * @param {boolean|null} high - true for high contrast, false for normal, null to clear
 */
export function setContrastPreference(high) {
    if (high === null) {
        sessionStorage.removeItem('otud-contrast-pref');
    } else {
        sessionStorage.setItem('otud-contrast-pref', high ? 'high' : 'normal');
    }
    applyPreferences();
}

// ==========================================================================
// Panel Creation and Management
// ==========================================================================

let panelElement = null;
let triggerButton = null;

/**
 * Create the preferences panel HTML and inject into DOM
 */
function createPanel() {
    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'preferences-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Display preferences');
    panel.hidden = true;

    panel.innerHTML = `
        <div class="preferences-panel-header">
            <h2 id="preferences-panel-title">Display Settings</h2>
            <button id="pref-close" class="preferences-close-btn" aria-label="Close display settings">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="preferences-panel-content">
            <div class="preference-item">
                <div class="preference-toggle">
                    <input type="checkbox" id="pref-motion" />
                    <label for="pref-motion">Reduce motion</label>
                </div>
                <p class="preference-description">Minimize animations and transitions</p>
            </div>
            <div class="preference-item">
                <div class="preference-toggle">
                    <input type="checkbox" id="pref-contrast" />
                    <label for="pref-contrast">High contrast</label>
                </div>
                <p class="preference-description">Increase border widths and color contrast</p>
            </div>
        </div>
        <p class="preferences-note">Settings apply to this session only</p>
    `;

    document.body.appendChild(panel);
    return panel;
}

/**
 * Create the settings trigger button
 */
function createTriggerButton() {
    const button = document.createElement('button');
    button.id = 'preferences-trigger';
    button.className = 'preferences-trigger-btn';
    button.setAttribute('aria-label', 'Open display settings');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'preferences-panel');

    button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16.0833 10C16.0833 10.3333 16.0556 10.6583 16.0028 10.975L17.7778 12.3417C17.9361 12.4667 17.9778 12.6917 17.875 12.8667L16.2083 15.7583C16.1056 15.9333 15.8889 16.0083 15.7028 15.9333L13.6222 15.1C13.1111 15.4833 12.5472 15.8 11.9389 16.0333L11.6278 18.2583C11.6 18.4583 11.425 18.6083 11.2194 18.6083H7.88611C7.68056 18.6083 7.50556 18.4583 7.47778 18.2583L7.16667 16.0333C6.55833 15.8 5.99444 15.4833 5.48333 15.1L3.40278 15.9333C3.21667 16.0083 3 15.9333 2.89722 15.7583L1.23056 12.8667C1.12778 12.6917 1.16944 12.4667 1.32778 12.3417L3.10278 10.975C3.05 10.6583 3.02222 10.3333 3.02222 10C3.02222 9.66667 3.05 9.34167 3.10278 9.025L1.32778 7.65833C1.16944 7.53333 1.12778 7.30833 1.23056 7.13333L2.89722 4.24167C3 4.06667 3.21667 3.99167 3.40278 4.06667L5.48333 4.9C5.99444 4.51667 6.55833 4.2 7.16667 3.96667L7.47778 1.74167C7.50556 1.54167 7.68056 1.39167 7.88611 1.39167H11.2194C11.425 1.39167 11.6 1.54167 11.6278 1.74167L11.9389 3.96667C12.5472 4.2 13.1111 4.51667 13.6222 4.9L15.7028 4.06667C15.8889 3.99167 16.1056 4.06667 16.2083 4.24167L17.875 7.13333C17.9778 7.30833 17.9361 7.53333 17.7778 7.65833L16.0028 9.025C16.0556 9.34167 16.0833 9.66667 16.0833 10Z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
    `;

    // Insert in header section if available, otherwise at top of body
    const headerSection = document.querySelector('.header-section');
    if (headerSection) {
        headerSection.appendChild(button);
    } else {
        document.body.insertBefore(button, document.body.firstChild);
    }

    return button;
}

/**
 * Open the preferences panel
 */
export function openPanel() {
    if (!panelElement) return;

    panelElement.hidden = false;
    triggerButton?.setAttribute('aria-expanded', 'true');

    // Announce to screen readers
    panelElement.setAttribute('aria-live', 'polite');

    // Sync checkbox states with current preferences
    const motionCheckbox = document.getElementById('pref-motion');
    const contrastCheckbox = document.getElementById('pref-contrast');

    if (motionCheckbox) {
        motionCheckbox.checked = getMotionPreference();
    }
    if (contrastCheckbox) {
        contrastCheckbox.checked = getContrastPreference();
    }

    // Focus the first interactive element
    setTimeout(() => {
        motionCheckbox?.focus();
    }, 50);
}

/**
 * Close the preferences panel
 */
export function closePanel() {
    if (!panelElement) return;

    panelElement.hidden = true;
    triggerButton?.setAttribute('aria-expanded', 'false');
    panelElement.removeAttribute('aria-live');

    // Return focus to trigger button
    triggerButton?.focus();
}

/**
 * Toggle panel open/closed
 */
export function togglePanel() {
    if (panelElement?.hidden) {
        openPanel();
    } else {
        closePanel();
    }
}

// ==========================================================================
// Event Handlers
// ==========================================================================

function handleMotionChange(event) {
    setMotionPreference(event.target.checked);
}

function handleContrastChange(event) {
    setContrastPreference(event.target.checked);
}

function handleKeydown(event) {
    // Close on Escape
    if (event.key === 'Escape' && !panelElement?.hidden) {
        closePanel();
        event.preventDefault();
    }
}

function handleClickOutside(event) {
    if (!panelElement?.hidden &&
        !panelElement.contains(event.target) &&
        event.target !== triggerButton &&
        !triggerButton?.contains(event.target)) {
        closePanel();
    }
}

// ==========================================================================
// Initialization
// ==========================================================================

/**
 * Initialize the preferences panel
 * Call this after DOM is ready
 */
export function initPreferencesPanel() {
    // Create UI elements
    triggerButton = createTriggerButton();
    panelElement = createPanel();

    // Apply any existing preferences
    applyPreferences();

    // Set up event listeners
    triggerButton.addEventListener('click', togglePanel);

    const closeBtn = document.getElementById('pref-close');
    closeBtn?.addEventListener('click', closePanel);

    const motionCheckbox = document.getElementById('pref-motion');
    motionCheckbox?.addEventListener('change', handleMotionChange);

    const contrastCheckbox = document.getElementById('pref-contrast');
    contrastCheckbox?.addEventListener('change', handleContrastChange);

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleClickOutside);

    // Listen for system preference changes and update if no override
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
        if (sessionStorage.getItem('otud-motion-pref') === null) {
            applyPreferences();
        }
    });

    window.matchMedia('(prefers-contrast: more)').addEventListener('change', () => {
        if (sessionStorage.getItem('otud-contrast-pref') === null) {
            applyPreferences();
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreferencesPanel);
} else {
    initPreferencesPanel();
}
