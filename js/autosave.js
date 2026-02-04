/**
 * Autosave manager for O-TUD
 * Coordinates periodic saving and recovery prompts
 */

import { initStorage, saveDraft, loadDraft, hasDraft, clearDraft, getParticipantId } from './storage.js';
import { serializeTimelineState, deserializeTimelineState } from './state-serializer.js';
import { showRecoveryModal } from './recovery-modal.js';
import { initSaveIndicator, showSaving, showSaved, showSaveError } from './save-indicator.js';

let saveInterval = null;
let participantId = null;
let isEnabled = true;

const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_DELAY = 1000; // 1 second debounce for rapid changes

/**
 * Initialize autosave system
 * Call this during app startup AFTER timelineManager is created
 * @returns {Promise<'restored'|'discarded'|'none'>} What happened with existing draft
 */
export async function initAutosave() {
  const db = await initStorage();
  if (!db) {
    console.warn('[autosave] Storage unavailable, autosave disabled');
    isEnabled = false;
    return 'none';
  }

  participantId = getParticipantId();
  console.log('[autosave] Initialized for participant:', participantId);

  initSaveIndicator();

  // Check for existing draft
  const draftInfo = await hasDraft(participantId);
  if (draftInfo.exists) {
    const result = await showRecoveryModal(draftInfo.timestamp);
    if (result === 'restore') {
      const draft = await loadDraft(participantId);
      if (draft && deserializeTimelineState(draft.state)) {
        console.log('[autosave] Draft restored');
        startPeriodicSave();
        return 'restored';
      }
    } else {
      await clearDraft(participantId);
      console.log('[autosave] Draft discarded by user');
    }
  }

  // Start periodic saving
  startPeriodicSave();

  return draftInfo.exists ? 'discarded' : 'none';
}

/**
 * Start the periodic save interval
 */
function startPeriodicSave() {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    saveNow();
  }, AUTOSAVE_INTERVAL);
  console.log('[autosave] Periodic save started');
}

/**
 * Stop autosaving (call on successful submit)
 */
export function stopAutosave() {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  isEnabled = false;
  console.log('[autosave] Stopped');
}

/**
 * Save current state immediately
 * @returns {Promise<boolean>} Success status
 */
export async function saveNow() {
  if (!isEnabled || !participantId) return false;

  showSaving();

  try {
    const state = serializeTimelineState();
    if (!state) {
      console.warn('[autosave] No state to save');
      showSaveError('Nothing to save');
      return false;
    }

    const success = await saveDraft(participantId, state);

    if (success) {
      console.log('[autosave] Saved at', new Date().toLocaleTimeString());
      showSaved();
    } else {
      showSaveError();
    }

    return success;
  } catch (e) {
    console.warn('[autosave] Save failed:', e);
    showSaveError();
    return false;
  }
}

// Debounced save for rapid changes
let debounceTimer = null;

/**
 * Trigger a debounced save (use for activity changes)
 * Waits for DEBOUNCE_DELAY ms of inactivity before saving
 */
export function triggerSave() {
  if (!isEnabled) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveNow();
  }, DEBOUNCE_DELAY);
}

/**
 * Clear draft and stop saving (call on successful submit)
 * @returns {Promise<void>}
 */
export async function onSubmitSuccess() {
  stopAutosave();
  if (participantId) {
    await clearDraft(participantId);
    console.log('[autosave] Draft cleared after successful submit');
  }
}

/**
 * Check if autosave is currently enabled
 * @returns {boolean}
 */
export function isAutosaveEnabled() {
  return isEnabled;
}

/**
 * Get the current participant ID
 * @returns {string|null}
 */
export function getCurrentParticipantId() {
  return participantId;
}
