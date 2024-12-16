import { TimelineMarker } from './timeline_marker.js';

// Test suite for timeline marker positioning
export function testTimelineMarkerPositioning() {
    const timeline = document.createElement('div');
    timeline.style.height = '1500px';
    timeline.style.position = 'relative';
    
    // Create required containers
    const markersContainer = document.createElement('div');
    markersContainer.className = 'markers';
    timeline.appendChild(markersContainer);

    const timeLabelsContainer = document.createElement('div');
    timeLabelsContainer.className = 'time-labels';
    timeline.appendChild(timeLabelsContainer);

    const hourLabelsContainer = document.createElement('div');
    hourLabelsContainer.className = 'hour-labels';
    timeline.appendChild(hourLabelsContainer);

    // Create markers for 24 hours
    const markers = [];
    for (let hour = 4; hour <= 27; hour++) {
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

    return {
        success: errors.length === 0,
        errors: errors
    };
}
