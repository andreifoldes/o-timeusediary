// Create a promise that resolves when env variables are loaded
window.envLoadedPromise = new Promise((resolve) => {
    window.envLoaded = resolve;
});

// Load environment variables from either local config or Netlify function
async function loadEnv() {
    try {
        let env = {};
        
        // Check if we're in development by looking at the hostname
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
            // Only try local config in development
            try {
                const localResponse = await fetch('/.env');
                if (localResponse.ok) {
                    const data = await localResponse.text();
                    // Parse config.env file
                    data.split('\n').forEach(line => {
                        if (!line.trim()) return;
                        const [key, ...value] = line.split('=');
                        if (key && value) {
                            env[key.trim()] = value.join('=').trim();
                        }
                    });
                    console.log('Loaded environment variables from local config');
                }
            } catch (localError) {
                console.log('Local config not found, trying Netlify function');
            }
        }
        
        // If we don't have env variables yet, try Netlify function
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            try {
                const netlifyResponse = await fetch('/.netlify/functions/get-supabase-env');
                if (netlifyResponse.ok) {
                    env = await netlifyResponse.json();
                    console.log('Loaded environment variables from Netlify function');
                } else {
                    throw new Error('Failed to load from Netlify function');
                }
            } catch (netlifyError) {
                console.error('Netlify function error:', netlifyError);
                throw new Error('Failed to load environment variables from Netlify function');
            }
        }

        // Validate that we have the required variables
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            throw new Error('Required environment variables are missing');
        }

        // Store in window.ENV
        window.ENV = env;
        console.log('Environment variables loaded successfully');
        
        // Signal that env variables are loaded
        window.envLoaded();
    } catch (error) {
        console.error('Error loading environment variables:', error);
        window.envLoaded();
    }
}

// Execute immediately
loadEnv();