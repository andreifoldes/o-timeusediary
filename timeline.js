export class Timeline {
    constructor(type, metadata = {}) {
        this.type = type;
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

    validate() {
        // Check for overlaps in activities
        const sortedActivities = [...this.activities].sort((a, b) => {
            const aStart = new Date(a.startTime);
            const bStart = new Date(b.startTime);
            return aStart - bStart;
        });

        for (let i = 0; i < sortedActivities.length - 1; i++) {
            const current = sortedActivities[i];
            const next = sortedActivities[i + 1];
            
            const currentEnd = new Date(current.endTime);
            const nextStart = new Date(next.startTime);
            
            if (currentEnd > nextStart) {
                throw new Error(`Timeline validation failed: Overlap detected between activities "${current.activity}" and "${next.activity}"`);
            }
        }
        return true;
    }
}
