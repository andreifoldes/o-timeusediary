export class TimelineMarker {
    constructor(type, position, label = '') {
        this.type = type; // 'hour', 'minute-30', 'minute-10'
        this.position = position; // percentage position
        this.label = label;
        this.element = null;
    }

    create(timeline, isMobile) {
        this.element = document.createElement('div');
        
        // Set marker class
        if (this.type === 'minute-marker-30') {
            this.element.className = 'minute-marker-30';
        } else if (this.type === 'minute') {
            this.element.className = 'minute-marker';
        } else {
            this.element.className = `${this.type}-marker`;
        }

        // Ensure position is within bounds (0-100%)
        const normalizedPosition = Math.max(0, Math.min(100, this.position));

        if (isMobile) {
            // In mobile mode, scale position to fit within timeline height
            const scaledPosition = (normalizedPosition / 100) * 100;
            this.element.style.top = `${scaledPosition}%`;
        } else {
            this.element.style.left = `${normalizedPosition}%`;
        }

        if (this.type === 'hour') {
            const labelElement = document.createElement('div');
            labelElement.className = 'hour-label';
            labelElement.textContent = this.label;
            this.element.appendChild(labelElement);
        }

        const markersContainer = timeline.querySelector('.markers');
        const timeLabelsContainer = timeline.querySelector('.time-labels');
        
        // Add marker to markers container
        markersContainer.appendChild(this.element);
        
        // If this is an hour marker, move the label to time-labels container
        if (this.type === 'hour' && timeLabelsContainer) {
            const label = this.element.querySelector('.hour-label');
            if (label) {
                this.element.removeChild(label);
                const labelWrapper = document.createElement('div');
                labelWrapper.className = 'hour-label-wrapper';
                labelWrapper.style.position = 'absolute';
                labelWrapper.style.top = this.element.style.top;
                labelWrapper.style.left = this.element.style.left;
                labelWrapper.appendChild(label);
                timeLabelsContainer.appendChild(labelWrapper);
            }
        }
        return this.element;
    }

    update(isMobile) {
        if (isMobile) {
            this.element.style.top = `${this.position}%`;
            this.element.style.left = '';
        } else {
            this.element.style.left = `${this.position}%`;
            this.element.style.top = '';
        }
    }
}
