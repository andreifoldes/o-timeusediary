class TimelineMarker {
    constructor(type, position, label = '') {
        this.type = type; // 'hour', 'minute-30', 'minute-10'
        this.position = position; // percentage position
        this.label = label;
        this.element = null;
    }

    create(timeline, isMobile) {
        this.element = document.createElement('div');
        this.element.className = `${this.type}-marker`;

        if (isMobile) {
            this.element.style.top = `${this.position}%`;
        } else {
            this.element.style.left = `${this.position}%`;
        }

        if (this.type === 'hour') {
            const labelElement = document.createElement('div');
            labelElement.className = 'hour-label';
            labelElement.textContent = this.label;
            this.element.appendChild(labelElement);
        }

        timeline.appendChild(this.element);
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
