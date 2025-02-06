// This Netlify Function returns Supabase credentials
exports.handler = async function(event, context) {
  try {
    // Access environment variables (set in your .env for local dev,
    // and in the Netlify UI or via CLI for production)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Supabase credentials not set" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey,
      }),
    };
  } catch (error) {
    console.error("Error fetching Supabase environment variables:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
}; 