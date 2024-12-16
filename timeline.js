export class Timeline {
    constructor(type, metadata) {
        this.type = type;
        this.name = metadata.name || '';
        this.description = metadata.description || '';
        this.mode = metadata.mode || 'single-choice';
        this.categories = metadata.categories || [];
        this.activities = [];
    }

    addActivity(activity) {
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
        // Implementation depends on timeline requirements
        return true;
    }
}
