import { testTimelineMarkerPositioning } from './timeline_test.js';
import { testModalClosing } from './modal_test.js';

// Run all tests
document.addEventListener('DOMContentLoaded', () => {
    console.log('Running all tests...');
    
    // Timeline tests
    console.log('\nRunning Timeline Tests:');
    const timelineResults = testTimelineMarkerPositioning();
    console.log('Timeline Marker Positioning Test:', 
        timelineResults.success ? 'PASSED' : 'FAILED');
    if (!timelineResults.success) {
        console.error('Errors:', timelineResults.errors);
    }
    
    // Modal tests
    console.log('\nRunning Modal Tests:');
    const modalResults = testModalClosing();
    console.log('Modal Closing Tests:', 
        modalResults.success ? 'PASSED' : 'FAILED');
    if (!modalResults.success) {
        console.error('Errors:', modalResults.errors);
    }
    
    // Button tests are automatically run via button_test.js
    console.log('\nButton Tests: Check console for results');
}); 