// Create a promise that resolves when Supabase is initialized
const initSupabase = () => {
    return new Promise(async (resolve, reject) => {
        try {
            // Wait for environment variables to be loaded
            await window.envLoadedPromise;
            
            // Simple log without sensitive data
            console.log("Supabase initialization started");
            
            // Check if environment variables are properly loaded
            if (!window.ENV?.SUPABASE_URL || !window.ENV?.SUPABASE_ANON_KEY) {
                throw new Error('Required environment variables are missing');
            }

            // Create Supabase client with loaded environment variables
            const supabase = window.supabase.createClient(
                window.ENV.SUPABASE_URL,
                window.ENV.SUPABASE_ANON_KEY
            );

            // Make supabase client available globally
            window.supabaseClient = supabase;
            resolve(supabase);
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            reject(error);
        }
    });
};

// Initialize once and store the promise
const supabasePromise = initSupabase();

// Export the helper function to get the initialized client
export async function getSupabase() {
    return await supabasePromise;
}

// For backward compatibility
export const supabase = null; 