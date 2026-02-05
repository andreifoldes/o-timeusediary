/**
 * Accessibility preferences handling
 * Reads researcher config and system preferences to control motion/contrast support.
 */

const DEFAULT_ACCESSIBILITY = {
    enableReducedMotion: true,
    enableHighContrast: true,
    enableForcedColors: true
};

function normalizeAccessibilityConfig(config) {
    if (!config || typeof config !== 'object') {
        return { ...DEFAULT_ACCESSIBILITY };
    }

    return {
        enableReducedMotion: config.enableReducedMotion !== false,
        enableHighContrast: config.enableHighContrast !== false,
        enableForcedColors: config.enableForcedColors !== false
    };
}

export function getAccessibilityConfig() {
    if (window.__OTUD_ACCESSIBILITY__) {
        return window.__OTUD_ACCESSIBILITY__;
    }

    const fromGeneral = window.timelineManager?.general?.accessibility;
    return normalizeAccessibilityConfig(fromGeneral);
}

export function applyAccessibilityConfig(configOverride = null) {
    const config = normalizeAccessibilityConfig(configOverride ?? getAccessibilityConfig());
    window.__OTUD_ACCESSIBILITY__ = config;

    const root = document.documentElement;
    root.classList.toggle('a11y-reduced-motion-disabled', !config.enableReducedMotion);
    root.classList.toggle('a11y-high-contrast-disabled', !config.enableHighContrast);
    root.classList.toggle('a11y-forced-colors-disabled', !config.enableForcedColors);

    return config;
}

function isEditableTarget(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : '';
    return tag === 'input' || tag === 'textarea' || target.isContentEditable === true;
}

export function initAccessibilityDemoShortcut() {
    if (window.__OTUD_ACCESSIBILITY_SHORTCUT__) return;
    window.__OTUD_ACCESSIBILITY_SHORTCUT__ = true;

    window.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || isEditableTarget(event.target)) return;

        const key = (event.key || '').toLowerCase();
        const modifierOk = event.altKey && (event.ctrlKey || event.metaKey);

        if (key !== 'a' || !modifierOk) return;

        const updated = applyAccessibilityConfig({
            enableReducedMotion: true,
            enableHighContrast: true,
            enableForcedColors: true
        });

        if (window.timelineManager?.general) {
            window.timelineManager.general.accessibility = { ...updated };
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Accessibility preferences enabled for demo', 'info', 2500);
        } else {
            console.info('[a11y] Accessibility preferences enabled for demo shortcut');
        }
    });
}

export function prefersReducedMotion() {
    const config = getAccessibilityConfig();
    if (!config.enableReducedMotion) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersHighContrast() {
    const config = getAccessibilityConfig();
    if (!config.enableHighContrast) return false;
    return window.matchMedia('(prefers-contrast: more)').matches;
}

export function prefersForcedColors() {
    const config = getAccessibilityConfig();
    if (!config.enableForcedColors) return false;
    return window.matchMedia('(forced-colors: active)').matches;
}

export function getScrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
}
