const STEP = 5;
const MIN = 0;
const MAX = 300;

let widgetEl = null;
let inputEl = null;
let errorEl = null;
let initialized = false;
let onChangeCallback = null;

function clamp(value) {
    if (Number.isNaN(value)) return null;
    return Math.max(MIN, Math.min(MAX, Math.round(value)));
}

function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
        const translated = window.i18n.t(key);
        if (translated && translated !== key) return translated;
    }
    return fallback;
}

function setError(message) {
    if (!errorEl || !inputEl) return;
    if (message) {
        errorEl.textContent = message;
        errorEl.hidden = false;
        inputEl.classList.add('invalid');
        inputEl.setAttribute('aria-invalid', 'true');
    } else {
        errorEl.textContent = '';
        errorEl.hidden = true;
        inputEl.classList.remove('invalid');
        inputEl.removeAttribute('aria-invalid');
    }
}

function applyStep(delta) {
    if (!inputEl) return;
    const current = parseInt(inputEl.value, 10);
    const base = Number.isNaN(current) ? 0 : current;
    const next = clamp(base + delta);
    inputEl.value = next === null ? '' : String(next);
    setError(null);
    notifyChange();
}

function notifyChange() {
    if (typeof onChangeCallback === 'function') {
        onChangeCallback(getSleepLatencyValue());
    }
}

export function initSleepLatencyWidget({ onChange } = {}) {
    if (initialized) return;
    widgetEl = document.getElementById('sleepLatencyStep');
    inputEl = document.getElementById('sleepLatencyInput');
    errorEl = document.getElementById('sleepLatencyError');
    if (!inputEl || !errorEl) return;

    onChangeCallback = typeof onChange === 'function' ? onChange : null;

    const decBtn = document.getElementById('sleepLatencyDecrement');
    const incBtn = document.getElementById('sleepLatencyIncrement');
    if (decBtn) decBtn.addEventListener('click', () => applyStep(-STEP));
    if (incBtn) incBtn.addEventListener('click', () => applyStep(STEP));

    inputEl.addEventListener('input', () => {
        setError(null);
        notifyChange();
    });

    inputEl.addEventListener('blur', () => {
        if (inputEl.value === '') return;
        const numeric = clamp(parseInt(inputEl.value, 10));
        if (numeric === null) {
            inputEl.value = '';
        } else {
            inputEl.value = String(numeric);
        }
        notifyChange();
    });

    initialized = true;
}

export function showSleepLatencyWidget() {
    if (widgetEl) widgetEl.hidden = false;
}

export function hideSleepLatencyWidget() {
    if (widgetEl) widgetEl.hidden = true;
}

export function isSleepLatencyWidgetVisible() {
    return Boolean(widgetEl && !widgetEl.hidden);
}

export function getSleepLatencyValue() {
    if (!inputEl) return null;
    const raw = inputEl.value;
    if (raw === '' || raw === null || raw === undefined) return null;
    const numeric = clamp(parseInt(raw, 10));
    return numeric;
}

export function setSleepLatencyValue(value) {
    if (!inputEl) return;
    if (value === null || value === undefined || value === '') {
        inputEl.value = '';
    } else {
        const numeric = clamp(parseInt(value, 10));
        inputEl.value = numeric === null ? '' : String(numeric);
    }
    setError(null);
}

export function validateSleepLatency() {
    const value = getSleepLatencyValue();
    if (value === null) {
        setError(t('sleepLatency.errorRequired', 'Please enter your sleep latency in minutes.'));
        if (inputEl) inputEl.focus();
        return { valid: false, value: null };
    }
    if (value < MIN || value > MAX) {
        setError(t('sleepLatency.errorRange', `Enter a value between ${MIN} and ${MAX} minutes.`));
        if (inputEl) inputEl.focus();
        return { valid: false, value };
    }
    setError(null);
    return { valid: true, value };
}
