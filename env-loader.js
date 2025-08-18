// Create a promise that resolves when env variables are loaded
window.envLoadedPromise = new Promise((resolve) => {
    window.envLoaded = resolve;
});

// Since we're using DataPipe API which doesn't require environment variables,
// we can simply resolve the promise immediately
async function loadEnv() {
    try {
        // Initialize empty ENV object for compatibility
        window.ENV = {};
        console.log('Environment initialization complete - no external API keys required');
        
        // Signal that env variables are loaded
        window.envLoaded();
    } catch (error) {
        console.error('Error during environment initialization:', error);
        window.envLoaded();
    }
}

// Execute immediately
loadEnv();