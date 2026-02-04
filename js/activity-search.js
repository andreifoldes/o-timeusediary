/**
 * Activity search and recent history for O-TUD
 * Reduces cognitive load when selecting from large activity lists (100-300+ codes)
 */

const MAX_RECENT = 8;
const SEARCH_DEBOUNCE = 150;
const STORAGE_KEY = 'otud-recent-activities';

let recentActivities = [];

/**
 * Initialize activity search on a rendered activity container.
 * Called after renderActivities() populates the DOM.
 * @param {HTMLElement} container - The activities container (#activitiesContainer or #modalActivitiesContainer)
 * @param {Array} categories - The categories array from timeline metadata
 */
export function initActivitySearch(container, categories) {
    if (!container) return;

    // Remove any existing search UI in this container (renderActivities clears innerHTML,
    // but the search wrapper may have been placed outside the accordion)
    const existing = container.querySelector('.activity-search-wrapper');
    if (existing) existing.remove();

    // Build flat index of activities with references to their DOM buttons
    const allActivities = buildActivityIndex(container, categories);

    // Load recent from storage
    loadRecentFromStorage();

    // Create and insert search UI at top of container
    const searchWrapper = createSearchUI(container, allActivities, categories);
    container.insertBefore(searchWrapper, container.firstChild);
}

/**
 * Build a flat index mapping activity data to their rendered DOM buttons.
 * @param {HTMLElement} container
 * @param {Array} categories
 * @returns {Array<{name: string, category: string, color: string, examples: string, code: number, button: HTMLElement, categoryDiv: HTMLElement, hasChildItems: boolean}>}
 */
function buildActivityIndex(container, categories) {
    const index = [];
    const categoryDivs = container.querySelectorAll('.activity-category');

    categories.forEach((category, catIdx) => {
        const categoryDiv = categoryDivs[catIdx];
        if (!categoryDiv) return;

        const buttons = categoryDiv.querySelectorAll('.activity-button');
        category.activities.forEach((activity, actIdx) => {
            const button = buttons[actIdx];
            if (!button) return;

            index.push({
                name: activity.name,
                category: category.name,
                color: activity.color || '',
                examples: activity.examples || '',
                code: activity.code,
                childItems: activity.childItems || [],
                hasChildItems: activity.childItems && activity.childItems.length > 0,
                button,
                categoryDiv
            });
        });
    });

    return index;
}

/**
 * Create the search input and recent activities panel.
 * @param {HTMLElement} container
 * @param {Array} allActivities - Flat activity index
 * @param {Array} categories - Original categories for recent-click handling
 * @returns {HTMLElement}
 */
function createSearchUI(container, allActivities, categories) {
    const wrapper = document.createElement('div');
    wrapper.className = 'activity-search-wrapper';

    // Search input
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'activity-search-input-wrapper';

    const label = document.createElement('label');
    label.setAttribute('for', 'activity-search-' + container.id);
    label.className = 'sr-only';
    label.textContent = 'Search activities';

    const input = document.createElement('input');
    input.type = 'search';
    input.id = 'activity-search-' + container.id;
    input.className = 'activity-search-input';
    input.placeholder = 'Search activities...';
    input.autocomplete = 'off';
    input.setAttribute('aria-describedby', 'search-hint-' + container.id);

    const hint = document.createElement('span');
    hint.id = 'search-hint-' + container.id;
    hint.className = 'sr-only';
    hint.textContent = 'Type to filter activities. Use arrow keys to navigate results.';

    inputWrapper.appendChild(label);
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(hint);
    wrapper.appendChild(inputWrapper);

    // Live region for screen reader announcements
    const announcer = document.createElement('div');
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('role', 'status');
    wrapper.appendChild(announcer);

    // Recent activities panel
    const recentPanel = document.createElement('div');
    recentPanel.className = 'recent-activities-panel';
    recentPanel.setAttribute('aria-label', 'Recently used activities');

    const recentHeading = document.createElement('h4');
    recentHeading.className = 'recent-heading';
    recentHeading.textContent = 'Recent';

    const recentList = document.createElement('div');
    recentList.className = 'recent-activities-list';
    recentList.setAttribute('role', 'list');

    recentPanel.appendChild(recentHeading);
    recentPanel.appendChild(recentList);
    wrapper.appendChild(recentPanel);

    // Render recent activities
    renderRecentPanel(recentList, allActivities, container);

    // Search input handler with debounce
    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = input.value.trim().toLowerCase();
            filterActivities(query, allActivities, announcer, recentPanel);
        }, SEARCH_DEBOUNCE);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            filterActivities('', allActivities, announcer, recentPanel);
            input.blur();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstVisible = getVisibleButtons(allActivities)[0];
            if (firstVisible) firstVisible.focus();
        }
    });

    // Delegate arrow-key navigation on activity buttons within the container
    container.addEventListener('keydown', (e) => {
        const target = e.target;
        if (!target.classList.contains('activity-button')) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const visible = getVisibleButtons(allActivities);
            const idx = visible.indexOf(target);
            if (idx === -1) return;

            if (e.key === 'ArrowDown') {
                const next = visible[idx + 1];
                if (next) next.focus();
            } else {
                if (idx === 0) {
                    // Return focus to search input
                    input.focus();
                } else {
                    visible[idx - 1].focus();
                }
            }
        } else if (e.key === 'Escape') {
            input.value = '';
            filterActivities('', allActivities, announcer, recentPanel);
            input.focus();
        }
    });

    return wrapper;
}

/**
 * Filter activity buttons based on search query.
 * Hides non-matching buttons and empty categories.
 * @param {string} query
 * @param {Array} allActivities
 * @param {HTMLElement} announcer
 * @param {HTMLElement} recentPanel
 */
function filterActivities(query, allActivities, announcer, recentPanel) {
    if (!query) {
        // Show all
        allActivities.forEach(a => {
            a.button.style.display = '';
        });
        // Show all categories
        const categoryDivs = new Set(allActivities.map(a => a.categoryDiv));
        categoryDivs.forEach(div => {
            div.style.display = '';
        });
        // Show recent panel when not searching
        recentPanel.style.display = '';
        announcer.textContent = '';
        return;
    }

    // Hide recent panel during search
    recentPanel.style.display = 'none';

    let matchCount = 0;

    allActivities.forEach(a => {
        const matches =
            a.name.toLowerCase().includes(query) ||
            a.category.toLowerCase().includes(query) ||
            a.examples.toLowerCase().includes(query);

        a.button.style.display = matches ? '' : 'none';
        if (matches) matchCount++;
    });

    // Hide empty categories
    const categoryDivs = new Set(allActivities.map(a => a.categoryDiv));
    categoryDivs.forEach(div => {
        const visibleButtons = div.querySelectorAll('.activity-button:not([style*="display: none"])');
        div.style.display = visibleButtons.length === 0 ? 'none' : '';
    });

    // Announce to screen readers
    announcer.textContent = matchCount === 0
        ? 'No activities found'
        : `${matchCount} ${matchCount === 1 ? 'activity' : 'activities'} found`;
}

/**
 * Get visible (not display:none) activity buttons in DOM order.
 * @param {Array} allActivities
 * @returns {HTMLElement[]}
 */
function getVisibleButtons(allActivities) {
    return allActivities
        .filter(a => a.button.style.display !== 'none')
        .map(a => a.button);
}

/**
 * Record an activity selection in recent history.
 * Call this whenever an activity is selected (set on window.selectedActivity).
 * @param {{name: string, color: string, category: string}} activity
 */
export function recordActivitySelection(activity) {
    if (!activity || !activity.name) return;

    // Build a unique key from name + category
    const key = activity.name + '|' + (activity.category || '');

    // Remove duplicate if present
    recentActivities = recentActivities.filter(a => (a.name + '|' + (a.category || '')) !== key);

    // Add to front
    recentActivities.unshift({
        name: activity.name,
        color: activity.color || '',
        category: activity.category || ''
    });

    // Trim
    if (recentActivities.length > MAX_RECENT) {
        recentActivities = recentActivities.slice(0, MAX_RECENT);
    }

    saveRecentToStorage();
}

/**
 * Render the recent activities panel.
 * @param {HTMLElement} listEl
 * @param {Array} allActivities - Flat activity index
 * @param {HTMLElement} container - Activities container for scoping
 */
function renderRecentPanel(listEl, allActivities, container) {
    listEl.innerHTML = '';

    if (recentActivities.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'no-recent';
        empty.textContent = 'No recent activities';
        listEl.appendChild(empty);
        return;
    }

    recentActivities.forEach(recent => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'recent-activity-btn';
        btn.setAttribute('role', 'listitem');

        const colorDot = document.createElement('span');
        colorDot.className = 'activity-color-dot';
        colorDot.style.backgroundColor = recent.color;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'recent-activity-name';
        nameSpan.textContent = recent.name;

        btn.appendChild(colorDot);
        btn.appendChild(nameSpan);

        btn.addEventListener('click', () => {
            // Find the matching activity button in the current render and click it
            const match = allActivities.find(
                a => a.name === recent.name && a.category === recent.category
            );
            if (match && match.button) {
                match.button.click();
            }
        });

        listEl.appendChild(btn);
    });
}

/**
 * Save recent activities to sessionStorage.
 */
function saveRecentToStorage() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(recentActivities));
    } catch (e) {
        // Storage full or unavailable — silently fail
    }
}

/**
 * Load recent activities from sessionStorage.
 */
function loadRecentFromStorage() {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            recentActivities = JSON.parse(stored);
        }
    } catch (e) {
        recentActivities = [];
    }
}
