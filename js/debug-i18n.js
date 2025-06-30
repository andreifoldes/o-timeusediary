// Debug script to test i18n functionality
// Run this in the browser console on the instructions page

console.log('=== i18n Debug Test ===');

// Check if i18n is available
if (window.i18n) {
    console.log('✓ i18n object is available');
    console.log('Current language:', window.i18n.getCurrentLanguage());
    console.log('Is ready:', window.i18n.isReady());
    
    // Test some translations
    console.log('Test translations:');
    console.log('  instructions.title:', window.i18n.t('instructions.title'));
    console.log('  buttons.submit:', window.i18n.t('buttons.submit'));
    console.log('  buttons.undo:', window.i18n.t('buttons.undo'));
    
    // Check what elements have data-i18n attributes
    const i18nElements = document.querySelectorAll('[data-i18n]');
    console.log(`Found ${i18nElements.length} elements with data-i18n attributes`);
    
    // Show first few elements and their current text
    i18nElements.forEach((el, index) => {
        if (index < 5) {
            console.log(`  Element ${index + 1}: key="${el.getAttribute('data-i18n')}", text="${el.textContent}"`);
        }
    });
    
    // Try applying translations manually
    console.log('Attempting to apply translations...');
    window.i18n.applyTranslations();
    console.log('Translations applied');
    
} else {
    console.log('✗ i18n object is not available');
    console.log('Available globals:', Object.keys(window).filter(key => key.includes('i18n')));
}

// Check if activities.json was loaded with Spanish
fetch('./settings/activities.json').then(response => response.json()).then(data => {
    console.log('Activities.json language setting:', data.general?.language);
}).catch(error => {
    console.log('Error loading activities.json:', error);
});

console.log('=== End Debug Test ===');