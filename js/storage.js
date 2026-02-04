/**
 * IndexedDB storage for O-TUD draft persistence
 * Provides autosave capability that survives page reloads and tab closes
 */

const DB_NAME = 'otud-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'diary-state';

let db = null;

/**
 * Initialize IndexedDB connection
 * @returns {Promise<IDBDatabase|null>} Database instance or null if unavailable
 */
export async function initStorage() {
  if (db) return db;

  // Check if IndexedDB is available
  if (!window.indexedDB) {
    console.warn('[storage] IndexedDB not available');
    return null;
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.warn('[storage] Failed to open database:', event.target.error);
        resolve(null);
      };

      request.onsuccess = (event) => {
        db = event.target.result;

        // Handle connection errors after initial open
        db.onerror = (event) => {
          console.warn('[storage] Database error:', event.target.error);
        };

        // Handle database being closed unexpectedly (e.g., version change in another tab)
        db.onclose = () => {
          console.warn('[storage] Database connection closed unexpectedly');
          db = null;
        };

        console.log('[storage] Database opened successfully');
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          console.log('[storage] Object store created');
        }
      };
    } catch (e) {
      console.warn('[storage] IndexedDB error:', e);
      resolve(null);
    }
  });
}

/**
 * Save draft state
 * @param {string} participantId - Unique identifier (from URL params or generated)
 * @param {string} serializedState - JSON string from serializeTimelineState()
 * @returns {Promise<boolean>} Success status
 */
export async function saveDraft(participantId, serializedState) {
  if (!db) {
    console.warn('[storage] Cannot save draft: database not initialized');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const draft = {
        id: participantId,
        state: serializedState,
        timestamp: Date.now()
      };

      const request = store.put(draft);

      request.onsuccess = () => {
        console.log('[storage] Draft saved for participant:', participantId);
        resolve(true);
      };

      request.onerror = (event) => {
        console.warn('[storage] Failed to save draft:', event.target.error);
        resolve(false);
      };

      transaction.onerror = (event) => {
        console.warn('[storage] Transaction error during save:', event.target.error);
        resolve(false);
      };
    } catch (e) {
      console.warn('[storage] Error saving draft:', e);
      resolve(false);
    }
  });
}

/**
 * Load existing draft
 * @param {string} participantId - Unique identifier to load draft for
 * @returns {Promise<{state: string, timestamp: number}|null>} Draft data or null if not found
 */
export async function loadDraft(participantId) {
  if (!db) {
    console.warn('[storage] Cannot load draft: database not initialized');
    return null;
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(participantId);

      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          console.log('[storage] Draft loaded for participant:', participantId);
          resolve({
            state: result.state,
            timestamp: result.timestamp
          });
        } else {
          console.log('[storage] No draft found for participant:', participantId);
          resolve(null);
        }
      };

      request.onerror = (event) => {
        console.warn('[storage] Failed to load draft:', event.target.error);
        resolve(null);
      };

      transaction.onerror = (event) => {
        console.warn('[storage] Transaction error during load:', event.target.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('[storage] Error loading draft:', e);
      resolve(null);
    }
  });
}

/**
 * Check if draft exists without loading full data
 * @param {string} participantId - Unique identifier to check
 * @returns {Promise<{exists: boolean, timestamp: number|null}>} Existence status and timestamp if available
 */
export async function hasDraft(participantId) {
  if (!db) {
    console.warn('[storage] Cannot check draft: database not initialized');
    return { exists: false, timestamp: null };
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(participantId);

      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          console.log('[storage] Draft exists for participant:', participantId);
          resolve({
            exists: true,
            timestamp: result.timestamp
          });
        } else {
          console.log('[storage] No draft exists for participant:', participantId);
          resolve({
            exists: false,
            timestamp: null
          });
        }
      };

      request.onerror = (event) => {
        console.warn('[storage] Failed to check draft:', event.target.error);
        resolve({ exists: false, timestamp: null });
      };

      transaction.onerror = (event) => {
        console.warn('[storage] Transaction error during check:', event.target.error);
        resolve({ exists: false, timestamp: null });
      };
    } catch (e) {
      console.warn('[storage] Error checking draft:', e);
      resolve({ exists: false, timestamp: null });
    }
  });
}

/**
 * Clear draft after successful submission
 * @param {string} participantId - Unique identifier to clear draft for
 * @returns {Promise<boolean>} Success status
 */
export async function clearDraft(participantId) {
  if (!db) {
    console.warn('[storage] Cannot clear draft: database not initialized');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(participantId);

      request.onsuccess = () => {
        console.log('[storage] Draft cleared for participant:', participantId);
        resolve(true);
      };

      request.onerror = (event) => {
        console.warn('[storage] Failed to clear draft:', event.target.error);
        resolve(false);
      };

      transaction.onerror = (event) => {
        console.warn('[storage] Transaction error during clear:', event.target.error);
        resolve(false);
      };
    } catch (e) {
      console.warn('[storage] Error clearing draft:', e);
      resolve(false);
    }
  });
}

/**
 * Get participant ID from URL params or generate session ID
 * Checks common research platform parameters before falling back to generated ID
 * @returns {string} Participant identifier
 */
export function getParticipantId() {
  const params = new URLSearchParams(window.location.search);
  // Try common research platform params
  return params.get('pid')
      || params.get('PROLIFIC_PID')
      || params.get('participantId')
      || params.get('SESSION_ID')
      || `session-${Date.now()}`; // Fallback
}
