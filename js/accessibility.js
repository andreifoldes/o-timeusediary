/**
 * Accessibility preferences handling
 * Reads researcher config and system preferences to control motion/contrast support.
 */

const DEFAULT_ACCESSIBILITY = {
    enableReducedMotion: true,
    enableHighContrast: true,
    enableForcedColors: true,
    autoscrollSpeed: 32
};

const A11Y_SHORTCUT_FADE_ID = 'otud-a11y-shortcut-fade';
const A11Y_SHORTCUT_STORAGE_KEY = 'otud-a11y-shortcut-config';
const A11Y_SHORTCUT_RELOAD_DELAY_MS = 2200;

function ensureA11yShortcutFadeOverlay() {
    let overlay = document.getElementById(A11Y_SHORTCUT_FADE_ID);
    if (overlay) return overlay;
    if (!document.body) return null;

    overlay = document.createElement('div');
    overlay.id = A11Y_SHORTCUT_FADE_ID;
    overlay.className = 'a11y-shortcut-fade';
    overlay.setAttribute('aria-hidden', 'true');

    overlay.addEventListener('animationend', () => {
        overlay.classList.remove('a11y-shortcut-fade-active');
    });

    document.body.appendChild(overlay);
    return overlay;
}

function triggerA11yShortcutFade() {
    const overlay = ensureA11yShortcutFadeOverlay();
    if (!overlay) return;

    overlay.classList.remove('a11y-shortcut-fade-active');
    void overlay.offsetWidth;
    overlay.classList.add('a11y-shortcut-fade-active');
}

function getStoredShortcutConfig() {
    try {
        const raw = window.sessionStorage.getItem(A11Y_SHORTCUT_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return normalizeAccessibilityConfig(parsed);
    } catch (error) {
        console.warn('[a11y] Failed to read stored shortcut config:', error);
        return null;
    }
}

function setStoredShortcutConfig(config) {
    try {
        window.sessionStorage.setItem(
            A11Y_SHORTCUT_STORAGE_KEY,
            JSON.stringify(normalizeAccessibilityConfig(config))
        );
    } catch (error) {
        console.warn('[a11y] Failed to store shortcut config:', error);
    }
}

function normalizeAccessibilityConfig(config) {
    if (!config || typeof config !== 'object') {
        return { ...DEFAULT_ACCESSIBILITY };
    }

    return {
        enableReducedMotion: config.enableReducedMotion !== false,
        enableHighContrast: config.enableHighContrast !== false,
        enableForcedColors: config.enableForcedColors !== false,
        autoscrollSpeed: Number.isFinite(config.autoscrollSpeed) && config.autoscrollSpeed > 0
            ? config.autoscrollSpeed
            : DEFAULT_ACCESSIBILITY.autoscrollSpeed
    };
}

export function getAccessibilityConfig() {
    if (window.__OTUD_ACCESSIBILITY__) {
        return window.__OTUD_ACCESSIBILITY__;
    }

    const storedShortcutConfig = getStoredShortcutConfig();
    if (storedShortcutConfig) {
        return storedShortcutConfig;
    }

    const fromGeneral = window.timelineManager?.general?.accessibility;
    return normalizeAccessibilityConfig(fromGeneral);
}

export function applyAccessibilityConfig(configOverride = null) {
    const storedShortcutConfig = getStoredShortcutConfig();
    const config = normalizeAccessibilityConfig(
        storedShortcutConfig ?? configOverride ?? getAccessibilityConfig()
    );
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
        if (event.defaultPrevented || event.repeat || isEditableTarget(event.target)) return;
        if (window.__OTUD_A11Y_SHORTCUT_RELOADING__) return;

        const key = (event.key || '').toLowerCase();
        const modifierOk = event.altKey && (event.ctrlKey || event.metaKey);

        if (key !== 'a' || !modifierOk) return;

        event.preventDefault();

        const enableSettings = !event.shiftKey;
        const updated = normalizeAccessibilityConfig({
            ...getAccessibilityConfig(),
            enableReducedMotion: enableSettings,
            enableHighContrast: enableSettings,
            enableForcedColors: enableSettings
        });
        setStoredShortcutConfig(updated);
        applyAccessibilityConfig(updated);

        triggerA11yShortcutFade();

        if (window.timelineManager?.general) {
            window.timelineManager.general.accessibility = { ...updated };
        }

        const message = enableSettings
            ? 'Accessibility preferences enabled. Reloading...'
            : 'Accessibility preferences disabled. Reloading...';

        if (typeof window.showToast === 'function') {
            window.showToast(message, 'info', A11Y_SHORTCUT_RELOAD_DELAY_MS);
        } else {
            console.info('[a11y] %s', message);
        }

        window.__OTUD_A11Y_SHORTCUT_RELOADING__ = true;
        window.setTimeout(() => {
            window.location.reload();
        }, A11Y_SHORTCUT_RELOAD_DELAY_MS);
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

export function getAutoscrollSpeed() {
    const config = getAccessibilityConfig();
    const speed = Number(config.autoscrollSpeed);
    if (!Number.isFinite(speed) || speed <= 0) {
        return DEFAULT_ACCESSIBILITY.autoscrollSpeed;
    }
    return speed;
}
