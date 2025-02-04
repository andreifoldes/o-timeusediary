// Test suite for modal closing behaviors
export function testModalClosing() {
    const errors = [];
    
    // Test 1: Close button (X)
    function testCloseButton() {
        // Create and show the activities modal
        const activitiesModal = document.getElementById('activitiesModal');
        if (!activitiesModal) {
            errors.push('Activities modal not found');
            return;
        }
        
        activitiesModal.style.display = 'block';
        
        // Find and click the close button
        const closeButton = activitiesModal.querySelector('.modal-close');
        if (!closeButton) {
            errors.push('Close button not found in activities modal');
            return;
        }
        
        closeButton.click();
        
        // Check if modal is hidden
        if (window.getComputedStyle(activitiesModal).display !== 'none') {
            errors.push('Modal did not close when clicking X button');
        }
    }

    // Test 2: Click outside modal
    function testClickOutside() {
        // Create and show the activities modal
        const activitiesModal = document.getElementById('activitiesModal');
        if (!activitiesModal) {
            errors.push('Activities modal not found');
            return;
        }
        
        activitiesModal.style.display = 'block';
        
        // Simulate click on the overlay (outside modal content)
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        activitiesModal.dispatchEvent(clickEvent);
        
        // Check if modal is hidden
        if (window.getComputedStyle(activitiesModal).display !== 'none') {
            errors.push('Modal did not close when clicking outside');
        }
    }

    // Test 3: Single-choice selection
    function testSingleChoiceSelection() {
        // Create and show the activities modal
        const activitiesModal = document.getElementById('activitiesModal');
        if (!activitiesModal) {
            errors.push('Activities modal not found');
            return;
        }
        
        activitiesModal.style.display = 'block';
        
        // Set up a mock timeline in single-choice mode
        const modalContainer = document.getElementById('modalActivitiesContainer');
        if (!modalContainer) {
            errors.push('Modal activities container not found');
            return;
        }
        modalContainer.setAttribute('data-mode', 'single-choice');
        
        // Create and click an activity button
        const activityButton = document.createElement('button');
        activityButton.className = 'activity-button';
        activityButton.innerHTML = '<span class="activity-text">Test Activity</span>';
        modalContainer.appendChild(activityButton);
        
        activityButton.click();
        
        // Check if modal is hidden after a short delay (to account for mobile timeout)
        setTimeout(() => {
            if (window.getComputedStyle(activitiesModal).display !== 'none') {
                errors.push('Modal did not close after single-choice selection');
            }
        }, 100);
    }

    // Run all tests
    console.log('Running modal closing tests...');
    
    try {
        testCloseButton();
        console.log('✓ Close button test completed');
    } catch (error) {
        errors.push(`Close button test error: ${error.message}`);
    }
    
    try {
        testClickOutside();
        console.log('✓ Click outside test completed');
    } catch (error) {
        errors.push(`Click outside test error: ${error.message}`);
    }
    
    try {
        testSingleChoiceSelection();
        console.log('✓ Single-choice selection test completed');
    } catch (error) {
        errors.push(`Single-choice selection test error: ${error.message}`);
    }

    return {
        success: errors.length === 0,
        errors: errors
    };
} 