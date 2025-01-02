import { TimelineMarker } from './timeline_marker.js';

// Test suite for timeline marker positioning
export function testTimelineMarkerPositioning() {
    // Create timeline container first
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    
    // Create timeline element
    const timeline = document.createElement('div');
    timeline.style.height = '2500px';
    timeline.style.position = 'relative';
    
    // Add timeline to container and container to document
    timelineContainer.appendChild(timeline);
    document.body.appendChild(timelineContainer);
    
    // Create required containers
    const markersContainer = document.createElement('div');
    markersContainer.className = 'markers';
    timeline.appendChild(markersContainer);

    const hourLabelsContainer = document.createElement('div');
    hourLabelsContainer.className = 'hour-labels';
    timelineContainer.appendChild(hourLabelsContainer);

    // Create markers for 24 hours
    const markers = [];
    for (let hour = 4; hour <= 28; hour++) {
        const displayHour = hour % 24;
        const position = ((hour - 4) / 24) * 100;
        
        const marker = new TimelineMarker(
            'hour',
            position,
            `${displayHour.toString().padStart(2, '0')}:00`
        );
        marker.create(timeline, true);
        markers.push(marker);
    }

    // Verify marker positions
    const markerElements = timeline.querySelectorAll('.hour-marker');
    let lastPosition = -1;
    let errors = [];

    markerElements.forEach((marker, index) => {
        const position = parseFloat(marker.style.top);
        if (position < 0 || position > 100) {
            errors.push(`Marker ${index} position ${position}% is outside bounds`);
        }
        if (position <= lastPosition) {
            errors.push(`Marker ${index} position ${position}% is not greater than previous ${lastPosition}%`);
        }
        lastPosition = position;
    });

    // Clean up
    document.body.removeChild(timelineContainer);

    return {
        success: errors.length === 0,
        errors: errors
    };
}
