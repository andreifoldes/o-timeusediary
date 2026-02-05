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
