import * as localDB from './local.js';
import * as supabaseDB from './supabase.js';

/**
 * sendData fetches the activities and database configuration,
 * then routes the sending logic based on the researcher's chosen database solution.
 * 
 * Expected:
 * - settings/activities.json to include a general.database_solution key.
 * - settings/database.json to include credentials for the chosen database.
 */
export function sendData() {
    return Promise.all([
        fetch('settings/activities.json').then(response => response.json()),
        fetch('settings/database.json').then(response => response.json())
    ])
    .then(([activitiesSettings, dbSettings]) => {
        const solution = (activitiesSettings.general?.database_solution || 'local').toLowerCase();

        if (solution === 'local') {
            console.log("Using local database solution (CSV download).");
            return localDB.sendData();
        } else if (solution === 'supabase') {
            // Validate that we have all required Supabase credentials.
            if (
                !dbSettings.supabase ||
                !dbSettings.supabase.supabase_url ||
                !dbSettings.supabase.supabase_key ||
                !dbSettings.supabase.table
            ) {
                throw new Error("Supabase configuration missing credentials in settings/database.json.");
            }
            console.log("Using Supabase database solution.");
            return supabaseDB.sendData(dbSettings.supabase);
        } else {
            throw new Error(`Database solution '${solution}' is not supported.`);
        }
    })
    .catch(error => {
        console.error("Error selecting database solution in sendData:", error);
    });
} 