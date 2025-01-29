document.addEventListener('DOMContentLoaded', () => {
    const buttonIds = ['undoBtn', 'cleanRowBtn', 'nextBtn', 'backBtn'];
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