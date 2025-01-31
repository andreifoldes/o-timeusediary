(function() {
    // Initialize an array to store mutation records
    const mutationLog = [];
    let debugMode = false;
    let styleDebounceTimers = new Map();
    let isEnabled = false;  // Start disabled
    let mainObserver = null;
    let activeObservers = new Set();

    // Function to format timestamps
    function getTimestamp() {
        const now = new Date();
        return now.toISOString();
    }

    // Function to compare style changes, ignoring cursor changes
    function hasSignificantStyleChange(oldStyle, newStyle) {
        // Parse style strings into objects
        const parseStyle = (style) => {
            if (!style) return {};
            return style.split(';')
                .filter(s => s.trim())
                .reduce((acc, curr) => {
                    const [key, value] = curr.split(':').map(s => s.trim());
                    if (!key.includes('cursor')) { // Ignore cursor changes
                        acc[key] = value;
                    }
                    return acc;
                }, {});
        };

        const oldStyleObj = parseStyle(oldStyle);
        const newStyleObj = parseStyle(newStyle);

        // Compare the objects
        const keys = new Set([...Object.keys(oldStyleObj), ...Object.keys(newStyleObj)]);
        for (const key of keys) {
            if (oldStyleObj[key] !== newStyleObj[key]) {
                return true;
            }
        }
        return false;
    }

    // Function to create a complete snapshot of an activity block
    function createActivitySnapshot(block) {
        return {
            id: block.dataset.id,
            timelineKey: block.dataset.timelineKey,
            start: block.dataset.start,
            end: block.dataset.end,
            length: block.dataset.length,
            category: block.dataset.category,
            mode: block.dataset.mode,
            count: block.dataset.count,
            originalStart: block.dataset.originalStart,
            originalEnd: block.dataset.originalEnd,
            originalLength: block.dataset.originalLength,
            originalHeight: block.dataset.originalHeight,
            originalTop: block.dataset.originalTop,
            originalLeft: block.dataset.originalLeft,
            originalWidth: block.dataset.originalWidth,
            style: block.getAttribute('style')
        };
    }

    // Function to handle attribute changes
    function handleAttributeChange(target, attributeName, oldValue) {
        // For style changes, debounce and check for significant changes
        if (attributeName === 'style') {
            const blockId = target.dataset.id;
            if (styleDebounceTimers.has(blockId)) {
                clearTimeout(styleDebounceTimers.get(blockId));
            }

            styleDebounceTimers.set(blockId, setTimeout(() => {
                const newValue = target.getAttribute('style');
                if (hasSignificantStyleChange(oldValue, newValue)) {
                    createLogEntry(target, ['style']);
                }
                styleDebounceTimers.delete(blockId);
            }, 50)); // 50ms debounce
        } else {
            // For non-style attributes, log immediately
            createLogEntry(target, [attributeName]);
        }
    }

    // Function to create a log entry
    function createLogEntry(target, changedAttributes) {
        const logEntry = {
            timestamp: getTimestamp(),
            type: 'modification',
            elementType: 'activity-block',
            blockId: target.dataset.id,
            changedAttributes,
            snapshot: createActivitySnapshot(target)
        };
        mutationLog.push(logEntry);
    }

    // Function to set up the attribute observer for activity blocks
    function setupActivityObserver(timeline) {
        if (debugMode) console.log('AttributeTracker: Setting up observer for activity blocks...');

        // Define the callback function to execute when mutations are observed
        const callback = (mutationsList) => {
            // Group mutations by target
            const mutationsByTarget = new Map();
            
            mutationsList.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList.contains('activity-block')) {
                        handleAttributeChange(target, mutation.attributeName, mutation.oldValue);
                    }
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains('activity-block')) {
                            observeActivityBlock(node);
                            
                            const logEntry = {
                                timestamp: getTimestamp(),
                                type: 'creation',
                                elementType: 'activity-block',
                                blockId: node.dataset.id,
                                snapshot: createActivitySnapshot(node)
                            };
                            mutationLog.push(logEntry);
                        }
                    });
                    
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains('activity-block')) {
                            const logEntry = {
                                timestamp: getTimestamp(),
                                type: 'deletion',
                                elementType: 'activity-block',
                                blockId: node.dataset.id,
                                snapshot: createActivitySnapshot(node)
                            };
                            mutationLog.push(logEntry);
                        }
                    });
                }
            });
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        // Configuration for timeline observation
        const config = {
            childList: true,     // Observe direct children (activity blocks)
            subtree: true,       // Observe all descendants
            attributes: true,     // Observe attribute changes
            attributeOldValue: true,
            attributeFilter: [    // Attributes to observe
                'data-timeline-key',
                'data-start',
                'data-end',
                'data-length',
                'data-category',
                'data-mode',
                'data-count',
                'style',
                'data-original-start',
                'data-original-end',
                'data-original-length',
                'data-original-height',
                'data-original-top',
                'data-original-left',
                'data-original-width',
                'data-id'
            ]
        };

        // Only start observing if tracker is enabled
        if (isEnabled) {
            observer.observe(timeline, config);
            
            // Also observe the activities container if it exists
            const activitiesContainer = timeline.querySelector('.activities');
            if (activitiesContainer) {
                observer.observe(activitiesContainer, config);
            }
        }

        // Store the observer for later enable/disable
        activeObservers.add(observer);

        if (debugMode) console.log('AttributeTracker: Now watching for activity blocks and their changes.');

        // Expose the mutationLog and observer for debugging or further use
        window.AttributeTracker = {
            mutationLog,
            observer,
            debugMode,
            isEnabled,
            enable: function() {
                if (!isEnabled) {
                    isEnabled = true;
                    // Start all observers
                    const timeline = document.querySelector('.timeline[data-active="true"]');
                    if (timeline) {
                        activeObservers.forEach(obs => {
                            obs.observe(timeline, config);
                            const activitiesContainer = timeline.querySelector('.activities');
                            if (activitiesContainer) {
                                obs.observe(activitiesContainer, config);
                            }
                        });
                    }
                    if (mainObserver) {
                        mainObserver.observe(document.body, {
                            childList: true,
                            subtree: true
                        });
                    }
                    console.log('AttributeTracker: Enabled');
                }
            },
            disable: function() {
                if (isEnabled) {
                    isEnabled = false;
                    // Stop all observers
                    activeObservers.forEach(obs => obs.disconnect());
                    if (mainObserver) {
                        mainObserver.disconnect();
                    }
                    console.log('AttributeTracker: Disabled');
                }
            },
            setDebugMode: function(enabled) {
                debugMode = enabled;
                if (enabled) {
                    console.log('AttributeTracker: Debug mode enabled');
                    console.log('Current mutation log:', this.mutationLog);
                }
            },
            downloadLog: function(filename = 'mutationLog.json') {
                const jsonStr = JSON.stringify(this.mutationLog, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                
                URL.revokeObjectURL(url);
            },
            clearLog: function() {
                mutationLog.length = 0;
                console.log('AttributeTracker: Log cleared');
            }
        };

        // Create initial snapshots for any existing activity blocks only if enabled
        if (isEnabled) {
            const existingBlocks = timeline.querySelectorAll('.activity-block');
            existingBlocks.forEach(block => {
                observeActivityBlock(block);
                // Log initial state
                const logEntry = {
                    timestamp: getTimestamp(),
                    type: 'initial',
                    elementType: 'activity-block',
                    blockId: block.dataset.id,
                    snapshot: createActivitySnapshot(block)
                };
                mutationLog.push(logEntry);
            });
        }
    }

    // Function to observe a single activity block
    function observeActivityBlock(block) {
        const observer = new MutationObserver((mutations) => {
            // Group all attribute changes into a single snapshot
            const changedAttributes = new Set();
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes') {
                    changedAttributes.add(mutation.attributeName);
                }
            });

            if (changedAttributes.size > 0) {
                const logEntry = {
                    timestamp: getTimestamp(),
                    type: 'modification',
                    elementType: 'activity-block',
                    blockId: block.dataset.id,
                    changedAttributes: Array.from(changedAttributes),
                    snapshot: createActivitySnapshot(block)
                };
                mutationLog.push(logEntry);
            }
        });

        observer.observe(block, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: [
                'data-timeline-key',
                'data-start',
                'data-end',
                'data-length',
                'data-category',
                'data-mode',
                'data-count',
                'style',
                'data-original-start',
                'data-original-end',
                'data-original-length',
                'data-original-height',
                'data-original-top',
                'data-original-left',
                'data-original-width',
                'data-id'
            ]
        });
    }

    // Function to wait for the timeline element
    function waitForElement() {
        if (debugMode) console.log('AttributeTracker: Waiting for timeline to be created...');
        
        // Create an observer instance to watch for the element
        mainObserver = new MutationObserver((mutations, obs) => {
            const timeline = document.querySelector('.timeline[data-active="true"]');
            if (timeline) {
                if (debugMode) console.log('AttributeTracker: Timeline found!');
                obs.disconnect(); // Stop observing once we find the element
                setupActivityObserver(timeline);
            }
        });

        // Only start observing if tracker is enabled
        if (isEnabled) {
            mainObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Start waiting for the element when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForElement);
    } else {
        waitForElement();
    }
})(); 