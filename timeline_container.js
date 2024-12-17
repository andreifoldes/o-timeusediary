export class TimelineContainer {
    constructor(timeline) {
        this.timeline = timeline;
        this.markersContainer = null;
        this.hourLabelsContainer = null;
        this.markers = [];
    }

    initialize(isMobile) {
        // Create markers container
        this.markersContainer = document.createElement('div');
        this.markersContainer.className = 'markers';
        this.timeline.appendChild(this.markersContainer);

        // Create hour labels container
        this.hourLabelsContainer = document.createElement('div');
        this.hourLabelsContainer.className = 'hour-labels';
        this.timeline.appendChild(this.hourLabelsContainer);

        // Set dimensions based on layout
        if (isMobile) {
            this.timeline.style.height = '1500px';
            this.timeline.style.width = '100%';
            this.timeline.parentElement.style.height = '1500px';
            this.timeline.parentElement.style.width = '120px';
        } else {
            this.timeline.style.height = '';
            this.timeline.style.width = '100%';
            this.timeline.parentElement.style.height = '';
            this.timeline.parentElement.style.width = '100%';
        }

        return this;
    }

    createMarkers(isMobile) {
        const TIMELINE_START_HOUR = 4;
        const TIMELINE_END_HOUR = 28;

        for (let i = TIMELINE_START_HOUR; i <= TIMELINE_END_HOUR; i++) {
            const hour = i % 24;
            const hourPosition = ((i - TIMELINE_START_HOUR) / 24) * 100;
            
            // Create hour marker
            const hourMarker = new TimelineMarker(
                'hour',
                hourPosition,
                `${hour.toString().padStart(2, '0')}:00`
            );
            hourMarker.create(this.timeline, isMobile);
            this.markers.push(hourMarker);

            // Create minute markers
            for (let j = 1; j < 6; j++) {
                const minutePosition = ((i - TIMELINE_START_HOUR) + j/6) * (100/24);
                if (minutePosition <= 100) {
                    const markerType = j === 3 ? 'minute-marker-30' : 'minute';
                    const minuteMarker = new TimelineMarker(markerType, minutePosition);
                    minuteMarker.create(this.timeline, isMobile);
                    this.markers.push(minuteMarker);
                }
            }
        }

        return this;
    }

    updateLayout(isMobile) {
        if (isMobile) {
            const minHeight = '1500px';
            this.timeline.style.height = minHeight;
            this.timeline.style.width = '';
            this.timeline.parentElement.style.height = minHeight;
            
            this.hourLabelsContainer.style.height = '100%';
            this.hourLabelsContainer.style.width = 'auto';
        } else {
            this.timeline.style.height = '';
            this.timeline.style.width = '100%';
            this.timeline.parentElement.style.height = '';
            
            this.hourLabelsContainer.style.width = '100%';
            this.hourLabelsContainer.style.height = 'auto';
        }

        // Update all markers for the new layout
        this.markers.forEach(marker => marker.update(isMobile));
    }
}
