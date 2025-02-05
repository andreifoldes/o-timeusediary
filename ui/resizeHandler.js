import { getIsMobile } from '../globals.js';
import { positionToMinutes, formatTimeHHMM, minutesToPercentage } from '../utils.js';

// Updates the position of the floating add button for mobile layouts
export function updateFloatingButtonPosition() {
    if (!getIsMobile()) return;
    const floatingButton = document.querySelector('.floating-add-button');
    const lastTimelineWrapper = document.querySelector('.last-initialized-timeline-wrapper');
    if (!floatingButton || !lastTimelineWrapper) return;
    const wrapperRect = lastTimelineWrapper.getBoundingClientRect();
    const buttonWidth = floatingButton.offsetWidth;
    const leftPosition = wrapperRect.right + 10;
    const maxLeft = window.innerWidth - buttonWidth - 10;
    const finalLeft = Math.min(leftPosition, maxLeft);
    floatingButton.style.left = `${finalLeft}px`;
}

// Updates the gradient bar layout based on the current mode
export function updateGradientBarLayout() {
    const gradientBar = document.querySelector('.gradient-bar');
    if (gradientBar) {
        gradientBar.setAttribute('data-layout', getIsMobile() ? 'vertical' : 'horizontal');
    }
}

// Updates the CSS variable for timeline count based on the number of timeline containers
export function updateTimelineCountVariable() {
    const pastTimelinesWrapper = document.querySelector('.past-initialized-timelines-wrapper');
    if (!pastTimelinesWrapper) return;
    const timelineCount = pastTimelinesWrapper.querySelectorAll('.timeline-container').length;
    pastTimelinesWrapper.style.setProperty('--timeline-count', timelineCount);
}

// Handles window resize events and adjusts timelines and activity blocks accordingly
export function handleResize() {
    const isMobile = getIsMobile();
    const timelineStart = 240; // 04:00 in minutes
    const timelineDuration = 1440; // 24 hours in minutes
    const timelineContainers = document.querySelectorAll('.timeline-container');

    timelineContainers.forEach(timeline => {
        // Adjust timeline container style based on layout
        if (isMobile) {
            timeline.style.width = '100%';
            timeline.style.flexShrink = '';
        } else {
            timeline.style.width = 'auto';
            timeline.style.flexShrink = '0';
        }

        const rect = timeline.getBoundingClientRect();
        timeline.querySelectorAll('.activity-block').forEach(block => {
            const startMinutes = parseInt(block.dataset.startMinutes);
            const endMinutes = parseInt(block.dataset.endMinutes);
            const duration = endMinutes - startMinutes;
            
            if (isMobile) {
                // Vertical layout positioning
                const relativePosition = (startMinutes - timelineStart) / timelineDuration;
                const relativeHeight = duration / timelineDuration;
                block.style.top = `${relativePosition * rect.height}px`;
                block.style.height = `${relativeHeight * rect.height}px`;
                block.style.left = '0px';
                block.style.width = '100%';
                
                // Update block classes and inner text styles for vertical layout
                block.classList.remove('horizontal-activity');
                block.classList.add('vertical-activity');
                const textElement = block.querySelector('.activity-block-text-narrow, .activity-block-text-vertical');
                if (textElement) {
                    textElement.className = 'activity-block-text-narrow';
                    textElement.style.maxWidth = '90%';
                    textElement.style.overflow = 'hidden';
                    textElement.style.textOverflow = 'ellipsis';
                    textElement.style.whiteSpace = 'nowrap';
                }
                const timeLabel = block.querySelector('.time-label');
                if (timeLabel) {
                    timeLabel.style.display = 'block';
                    timeLabel.style.transform = 'none';
                    timeLabel.style.fontSize = '1em';
                    timeLabel.style.bottom = '-20px';
                    timeLabel.style.top = 'auto';
                }
            } else {
                // Horizontal layout positioning
                const relativePosition = (startMinutes - timelineStart) / timelineDuration;
                const relativeWidth = duration / timelineDuration;
                block.style.left = `${relativePosition * rect.width}px`;
                block.style.width = `${relativeWidth * rect.width}px`;
                block.style.top = '0px';
                block.style.height = '100%';
                
                // Update block classes and inner text styles for horizontal layout
                block.classList.remove('vertical-activity');
                block.classList.add('horizontal-activity');
                const textElement = block.querySelector('.activity-block-text-narrow, .activity-block-text-vertical');
                if (textElement) {
                    textElement.className = 'activity-block-text-vertical';
                    textElement.style.maxWidth = '90%';
                    textElement.style.overflow = 'hidden';
                    textElement.style.textOverflow = 'ellipsis';
                    textElement.style.whiteSpace = 'nowrap';
                }
                const timeLabel = block.querySelector('.time-label');
                if (timeLabel) {
                    timeLabel.style.display = 'block';
                    timeLabel.style.transform = 'none';
                    timeLabel.style.fontSize = '0.9em';
                    timeLabel.style.bottom = '-20px';
                    timeLabel.style.top = 'auto';
                }
            }
        });
    });

    updateFloatingButtonPosition();
    updateGradientBarLayout();
    updateTimelineCountVariable();
} 