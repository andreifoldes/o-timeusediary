document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const continueBtn = document.getElementById('continueBtn');
    
    // Handle back button state
    if (window.location.pathname.includes('1.html')) {
        // On first page, disable back button
        backBtn.disabled = true;
    } else if (document.referrer.includes('index.html')) {
        // If coming from index.html, prevent going back there
        backBtn.onclick = () => window.location.href = '2.html';
    }
    
    // Change continue button text on last instruction page
    if (window.location.pathname.includes('3.html')) {
        continueBtn.textContent = 'Start';
    }
});
