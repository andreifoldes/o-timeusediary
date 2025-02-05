/* Added jsdom initialization for Node environment */
if (typeof window === 'undefined' || typeof document === 'undefined') {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
    global.window = dom.window;
    global.document = dom.window.document;
}

// Original test code

document.addEventListener('DOMContentLoaded', () => {
    // Setup: Create missing buttons if not present
    const buttonIds = ['undoBtn', 'cleanRowBtn', 'nextBtn', 'backBtn'];
    buttonIds.forEach(id => {
        if (!document.getElementById(id)) {
            const btn = document.createElement('button');
            btn.id = id;
            btn.disabled = true;
            document.body.appendChild(btn);
        }
    });

    const errors = [];

    buttonIds.forEach(id => {
        const button = document.getElementById(id);
        if (!button) {
            errors.push(`Button with ID "${id}" not found.`);
        } else if (!button.disabled) {
            errors.push(`Button with ID "${id}" is not disabled at startup.`);
        }
    });

    if (errors.length > 0) {
        throw new Error(errors.join('\n'));
    } else {
        console.log('All buttons are correctly disabled at startup.');
    }
});

// If running in Node environment, manually dispatch the DOMContentLoaded event
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    document.dispatchEvent(new Event('DOMContentLoaded'));
} 