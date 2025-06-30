/**
 * Internationalization (i18n) utility module
 * Handles loading and applying translations based on language settings
 */

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.isLoaded = false;
    }

    /**
     * Initialize the i18n system
     * @param {string} language - Language code (e.g., 'es', 'en', 'fr')
     * @returns {Promise<void>}
     */
    async init(language = 'en') {
        this.currentLanguage = language;
        
        try {
            await this.loadTranslations(language);
            this.updateHtmlLang(language);
            this.isLoaded = true;
            console.log(`i18n initialized with language: ${language}`);
        } catch (error) {
            console.error('Failed to initialize i18n:', error);
            // Fallback to English if the requested language fails
            if (language !== 'en') {
                console.log('Falling back to English...');
                await this.init('en');
            }
        }
    }

    /**
     * Load translation file for the specified language
     * @param {string} language - Language code
     * @returns {Promise<void>}
     */
    async loadTranslations(language) {
        try {
            // Determine the correct path based on current location
            const isInSubfolder = window.location.pathname.includes('/pages/');
            const localesPath = isInSubfolder ? '../locales' : './locales';
            
            const response = await fetch(`${localesPath}/${language}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${language} translations: ${response.status}`);
            }
            this.translations = await response.json();
        } catch (error) {
            console.error(`Error loading translations for ${language}:`, error);
            throw error;
        }
    }

    /**
     * Update the HTML lang attribute
     * @param {string} language - Language code
     */
    updateHtmlLang(language) {
        document.documentElement.lang = language;
    }

    /**
     * Get a translated string by key path
     * @param {string} keyPath - Dot-separated path to translation key (e.g., 'buttons.submit')
     * @param {Object} params - Optional parameters for string interpolation
     * @returns {string} - Translated string or key if not found
     */
    t(keyPath, params = {}) {
        if (!this.isLoaded) {
            console.warn('i18n not loaded yet, returning key:', keyPath);
            return keyPath;
        }

        const keys = keyPath.split('.');
        let translation = this.translations;

        // Navigate through the nested object
        for (const key of keys) {
            if (translation && typeof translation === 'object' && key in translation) {
                translation = translation[key];
            } else {
                console.warn(`Translation not found for key: ${keyPath}`);
                return keyPath;
            }
        }

        // Handle string interpolation if parameters are provided
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return this.interpolate(translation, params);
        }

        return translation;
    }

    /**
     * Simple string interpolation
     * @param {string} template - String template with {{key}} placeholders
     * @param {Object} params - Parameters to substitute
     * @returns {string} - Interpolated string
     */
    interpolate(template, params) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Apply translations to elements with data-i18n attributes
     */
    applyTranslations() {
        if (!this.isLoaded) {
            console.warn('i18n not loaded, cannot apply translations');
            return;
        }

        // Handle elements with data-i18n attribute for text content
        const textElements = document.querySelectorAll('[data-i18n]');
        textElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation !== key) {
                element.textContent = translation;
            }
        });

        // Handle elements with data-i18n-html attribute for innerHTML
        const htmlElements = document.querySelectorAll('[data-i18n-html]');
        htmlElements.forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const translation = this.t(key);
            if (translation !== key) {
                element.innerHTML = translation;
            }
        });

        // Handle elements with data-i18n-placeholder attribute for placeholders
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation !== key) {
                element.placeholder = translation;
            }
        });

        // Handle elements with data-i18n-title attribute for title/tooltip
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation !== key) {
                element.title = translation;
            }
        });

        // Handle elements with data-i18n-aria-label attribute for aria-label
        const ariaLabelElements = document.querySelectorAll('[data-i18n-aria-label]');
        ariaLabelElements.forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');
            const translation = this.t(key);
            if (translation !== key) {
                element.setAttribute('aria-label', translation);
            }
        });
    }

    /**
     * Get current language
     * @returns {string} - Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Check if i18n is loaded
     * @returns {boolean}
     */
    isReady() {
        return this.isLoaded;
    }
}

// Create global instance
window.i18n = new I18n();

// Export for module usage
export default window.i18n;