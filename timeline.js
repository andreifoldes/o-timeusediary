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
        console.log('Starting timeline validation');
        console.log('Current activities:', this.activities);

        // Check for overlaps in activities
        const sortedActivities = [...this.activities].sort((a, b) => {
            const aStart = new Date(a.startTime);
            const bStart = new Date(b.startTime);
            console.log('Comparing start times:', {
                activity1: a.activity,
                time1: a.startTime,
                activity2: b.activity,
                time2: b.startTime
            });
            return aStart - bStart;
        });

        console.log('Sorted activities:', sortedActivities);

        for (let i = 0; i < sortedActivities.length - 1; i++) {
            const current = sortedActivities[i];
            const next = sortedActivities[i + 1];
            
            const currentEnd = new Date(current.endTime);
            const nextStart = new Date(next.startTime);
            
            console.log('Checking overlap:', {
                currentActivity: current.activity,
                currentStart: current.startTime,
                currentEnd: current.endTime,
                nextActivity: next.activity,
                nextStart: next.startTime,
                nextEnd: next.endTime,
                isOverlapping: currentEnd > nextStart
            });
            
            if (currentEnd > nextStart) {
                console.error('Overlap detected:', {
                    current: current,
                    next: next,
                    currentEndTime: currentEnd,
                    nextStartTime: nextStart
                });
                throw new Error(`Timeline validation failed: Overlap detected between activities "${current.activity}" and "${next.activity}"`);
            }
        }
        console.log('Timeline validation successful');
        return true;
    }
}
