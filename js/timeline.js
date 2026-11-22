import { activityInterval, findOverlap } from './intervals.js';

export class Timeline {
    constructor(key, metadata = {}) {
        this.key = key;
        this.name = metadata?.name || '';
        this.description = metadata?.description || '';
        this.mode = metadata?.mode || 'single-choice';
        this.minCoverage = metadata?.min_coverage || 0;
        this.categories = metadata?.categories || [];
        this.activities = [];
    }

    addActivity(activity) {
        if (!activity.startTime || !activity.endTime) {
            throw new Error('Activity start time and end time must be defined');
        }
        this.activities.push(activity);
    }

    removeActivity(activityId) {
        const index = this.activities.findIndex(a => a.id === activityId);
        if (index !== -1) {
            return this.activities.splice(index, 1)[0];
        }
        return null;
    }

    getActivities() {
        return [...this.activities];
    }

    clear() {
        this.activities = [];
    }

    isComplete() {
        // Implementation depends on timeline requirements
        return false;
    }

    /**
     * Throws if two episodes of this timeline overlap. Episodes are compared by
     * their minutes on the timeline (js/intervals.js), not by parsing their stamps
     * with new Date(): that moved times in the hour skipped when the clocks go
     * forward (02:30 became 03:30 in New York on 8 March 2026) and raised false
     * overlaps on that day.
     */
    validate() {
        const activities = window.timelineManager.activities[this.key] || [];

        for (const activity of activities) {
            const interval = activityInterval(activity);
            if (!interval) continue;
            const others = activities.filter(a => a !== activity);
            const other = findOverlap(others, interval.start, interval.end);
            if (other) {
                throw new Error(`Timeline validation failed: Overlap detected between activities "${activity.activity}" and "${other.activity}"`);
            }
        }
        return true;
    }
}
