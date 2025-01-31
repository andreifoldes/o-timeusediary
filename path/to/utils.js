/**
 * Calculates the clamped relative Y-coordinate and position percentage based on cursor position.
 * @param {number} clientY - The Y-coordinate of the cursor relative to the viewport.
 * @param {DOMRect} timelineRect - The bounding rectangle of the timeline.
 * @returns {Object} An object containing clampedRelativeY and positionPercent.
 */
export function calculatePositionPercent(clientY, timelineRect) {
    // Calculate the Y position relative to the timeline
    const relativeY = clientY - timelineRect.top;
    
    // Clamp the Y position within the timeline bounds
    const clampedRelativeY = Math.max(0, Math.min(relativeY, timelineRect.height));
    
    // Calculate the position percentage
    let positionPercent = (clampedRelativeY / timelineRect.height) * 100;
    positionPercent = Math.min(positionPercent, 100); // Ensure it doesn't exceed 100%
    
    return { clampedRelativeY, positionPercent };
} 