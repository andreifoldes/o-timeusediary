document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const continueBtn = document.getElementById('continueBtn');
    
    // Handle back button state and navigation
    if (window.location.pathname.includes('1.html')) {
        // On first page, disable back button
        backBtn.disabled = true;
    } else if (window.location.pathname.includes('2.html')) {
        // On second page, always go back to first page
        backBtn.onclick = () => window.location.href = '1.html';
    } else if (window.location.pathname.includes('3.html')) {
        // On third page, always go back to second page
        backBtn.onclick = () => window.location.href = '2.html';
    }
    
    // Change continue button text on last instruction page
    if (window.location.pathname.includes('3.html')) {
        continueBtn.textContent = 'Start';
    }
});
