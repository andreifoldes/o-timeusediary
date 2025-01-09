document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const continueBtn = document.getElementById('continueBtn');
    
    // Disable back button on first page
    if (window.location.pathname.includes('1.html')) {
        backBtn.disabled = true;
    }
    
    // Change continue button text on last instruction page
    if (window.location.pathname.includes('3.html')) {
        continueBtn.textContent = 'Start';
    }
});
