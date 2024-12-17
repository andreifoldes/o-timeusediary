import { DEBUG_MODE } from './constants.js';

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

        // Get or create markers container
        let markersContainer = timeline.querySelector('.markers');
        if (!markersContainer) {
            markersContainer = document.createElement('div');
            markersContainer.className = 'markers';
            timeline.appendChild(markersContainer);
        }
        markersContainer.appendChild(this.element);
        
        // If this is an hour marker, move the label to timeline-container
        if (this.type === 'hour') {
            const label = this.element.querySelector('.hour-label');
            if (label) {
                this.element.removeChild(label);
                // Get hour-labels container from timeline-container
                let hourLabelsContainer = timeline.parentElement.querySelector('.hour-labels');
                if (!hourLabelsContainer) {
                    hourLabelsContainer = document.createElement('div');
                    hourLabelsContainer.className = 'hour-labels';
                    timeline.parentElement.appendChild(hourLabelsContainer);
                }
                
                const labelWrapper = document.createElement('div');
                labelWrapper.className = 'hour-label-wrapper';
                labelWrapper.style.position = 'absolute';
                labelWrapper.style.top = this.element.style.top;
                labelWrapper.style.left = this.element.style.left;
                labelWrapper.appendChild(label);
                hourLabelsContainer.appendChild(labelWrapper);
            }
        }

        // If this is the last hour marker (03:00) and DEBUG_MODE is true, check the count
        if (this.type === 'hour' && DEBUG_MODE && this.label === '03:00') {
            const hourLabelWrappers = timeline.parentElement.querySelectorAll('.hour-label-wrapper');
            console.log(`Final number of hour-label-wrappers: ${hourLabelWrappers.length}`);
            
            if (hourLabelWrappers.length !== 25) {
                throw new Error(`Invalid number of hour-label-wrappers: ${hourLabelWrappers.length}. Expected: 25`);
            }
        }
        
        return this.element;
    }

    update(isMobile) {
        if (isMobile) {
            this.element.style.top = `${this.position}%`;
            this.element.style.left = '';
            
            // Update hour label wrapper position if this is an hour marker
            if (this.type === 'hour') {
                const timeline = this.element.closest('.timeline');
                const labelWrapper = timeline?.querySelector(`.hour-label-wrapper:nth-child(${Math.floor(this.position)})`);
                if (labelWrapper) {
                    labelWrapper.style.top = `${this.position}%`;
                    labelWrapper.style.left = '';
                }
            }
        } else {
            this.element.style.left = `${this.position}%`;
            this.element.style.top = '';
            
            // Update hour label wrapper position if this is an hour marker
            if (this.type === 'hour') {
                const timeline = this.element.closest('.timeline');
                const labelWrapper = timeline?.querySelector(`.hour-label-wrapper:nth-child(${Math.floor(this.position)})`);
                if (labelWrapper) {
                    labelWrapper.style.left = `${this.position}%`;
                    labelWrapper.style.top = '';
                }
            }
        }
    }
}
