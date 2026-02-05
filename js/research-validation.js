/**
 * Research-grade validation for time use diaries
 * Based on CTUR/HETUS data quality standards
 *
 * These are SOFT warnings — they inform participants but never block submission.
 * References:
 *   - MTUS "good quality" diary criteria (minimum 7 episodes)
 *   - HETUS basic domain coverage (sleep, personal care, eating, travel)
 *   - CTUR suspicious-duration heuristics (>3h non-exempt, 8+ identical slots)
 */

import { INCREMENT_MINUTES } from './constants.js';

// ---------------------------------------------------------------------------
// Domain keywords mapped to actual O-TUD activity names from activities.json
// ---------------------------------------------------------------------------
const BASIC_DOMAINS = {
  sleep: ['sleeping', 'resting', 'rest', 'nap', 'sick in bed'],
  personalCare: ['washing', 'dressing', 'personal care', 'grooming'],
  eating: [
    'eating', 'drinking', 'meal', 'breakfast', 'lunch', 'dinner',
    'going out to eat', 'food preparation', 'cooking'
  ],
  travel: ['travelling', 'travel', 'commute', 'transport', 'driving', 'walking/jogging', 'cycle']
};

// Activities that legitimately span 3+ hours — matched case-insensitively
const LONG_ACTIVITY_EXCEPTIONS = [
  'sleeping', 'paid work', 'paid job', 'formal education',
  'classes and lectures', 'homework', 'school', 'internship',
  'work/study break'
];

const MIN_EPISODES = 7;
const LONG_ACTIVITY_THRESHOLD = 180; // 3 hours in minutes
const CONSECUTIVE_IDENTICAL_THRESHOLD = 8; // 8 × 10-min slots = 80 minutes

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate diary against research quality standards.
 * @param {Array} activities - Placed activities from timelineManager.activities[key].
 *   Each object has: { id, activity, category, startMinutes, endMinutes, … }
 * @returns {{ score: number, warnings: Array, passed: boolean, episodeCount: number, domainCoverage: Object }}
 */
export function validateDiaryQuality(activities) {
  if (!activities || activities.length === 0) {
    return {
      score: 0,
      warnings: [{
        type: 'EMPTY_DIARY',
        severity: 'moderate',
        message: 'Your diary is empty.',
        suggestion: 'Please add your daily activities to the timeline.'
      }],
      passed: false,
      episodeCount: 0,
      domainCoverage: { covered: [], missing: Object.keys(BASIC_DOMAINS).map(formatDomainName) }
    };
  }

  const warnings = [];

  // 1. Episode count (MTUS minimum-7 rule)
  const episodeCount = countEpisodes(activities);
  if (episodeCount < MIN_EPISODES) {
    warnings.push({
      type: 'LOW_EPISODE_COUNT',
      severity: 'moderate',
      message: `Your diary has ${episodeCount} activities. Most people have at least ${MIN_EPISODES} distinct activities in a day.`,
      suggestion: 'Consider if you might have forgotten any activities or transitions.'
    });
  }

  // 2. Basic domain coverage (HETUS 3-of-4 rule)
  const domainCoverage = checkDomainCoverage(activities);
  if (domainCoverage.missing.length > 1) {
    warnings.push({
      type: 'MISSING_DOMAINS',
      severity: 'moderate',
      message: `Your diary doesn't include: ${domainCoverage.missing.join(', ')}.`,
      suggestion: 'Most days include sleep, personal care, eating, and some travel. Did you forget to log any of these?'
    });
  }

  // 3. Unusually long activities (CTUR >3h heuristic)
  const longActivities = findLongActivities(activities);
  longActivities.forEach(act => {
    warnings.push({
      type: 'LONG_ACTIVITY',
      severity: 'low',
      message: `"${act.name}" is logged for ${formatDuration(act.duration)}.`,
      suggestion: 'If this is correct, no action needed. If not, consider breaking it into smaller segments.',
      activityId: act.id
    });
  });

  // 4. Consecutive identical slots (poor-recall indicator)
  const consecutiveIssues = findConsecutiveIdentical(activities);
  consecutiveIssues.forEach(issue => {
    warnings.push({
      type: 'CONSECUTIVE_IDENTICAL',
      severity: 'low',
      message: `"${issue.name}" appears ${issue.count} times in a row (${formatDuration(issue.duration)}).`,
      suggestion: 'Did anything else happen during this time? Consider if there were any breaks or transitions.'
    });
  });

  const score = calculateQualityScore(episodeCount, domainCoverage, warnings);

  return {
    score,
    warnings,
    passed: warnings.filter(w => w.severity === 'moderate').length === 0,
    episodeCount,
    domainCoverage
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Count distinct episodes — consecutive blocks with the same activity name
 * are collapsed into one episode.
 */
function countEpisodes(activities) {
  const sorted = [...activities].sort((a, b) => a.startMinutes - b.startMinutes);

  let count = 0;
  let lastActivity = null;

  sorted.forEach(act => {
    if (act.activity !== lastActivity) {
      count++;
      lastActivity = act.activity;
    }
  });

  return count;
}

/**
 * Check which of the four basic daily domains are represented.
 */
function checkDomainCoverage(activities) {
  const activityNames = activities.map(a => a.activity.toLowerCase());
  const covered = [];
  const missing = [];

  Object.entries(BASIC_DOMAINS).forEach(([domain, keywords]) => {
    const found = activityNames.some(name =>
      keywords.some(keyword => name.includes(keyword))
    );

    if (found) {
      covered.push(domain);
    } else {
      missing.push(formatDomainName(domain));
    }
  });

  return { covered, missing };
}

/**
 * Find activities that exceed the 3-hour threshold (excluding exempted ones).
 */
function findLongActivities(activities) {
  return activities
    .filter(a => {
      const duration = getDurationMinutes(a);
      const isException = LONG_ACTIVITY_EXCEPTIONS.some(ex =>
        a.activity.toLowerCase().includes(ex)
      );
      return duration > LONG_ACTIVITY_THRESHOLD && !isException;
    })
    .map(a => ({
      id: a.id,
      name: a.activity,
      duration: getDurationMinutes(a)
    }));
}

/**
 * Detect sequences of adjacent identical activities.
 *
 * Two blocks are "consecutive" when one ends where the next begins
 * (within one INCREMENT_MINUTES tolerance to allow for grid-snap gaps).
 * A sequence of N blocks maps to N 10-minute slots; flag when N >= threshold.
 */
function findConsecutiveIdentical(activities) {
  if (activities.length < 2) return [];

  const sorted = [...activities].sort((a, b) => a.startMinutes - b.startMinutes);
  const issues = [];

  let runStart = 0;

  for (let i = 1; i <= sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Continue the run if same activity and temporally adjacent
    const sameRun = curr &&
      curr.activity === prev.activity &&
      Math.abs(curr.startMinutes - prev.endMinutes) <= INCREMENT_MINUTES;

    if (!sameRun) {
      // End of a run — check if it is long enough to flag
      const runLength = i - runStart;
      if (runLength >= CONSECUTIVE_IDENTICAL_THRESHOLD) {
        const first = sorted[runStart];
        const last = sorted[i - 1];
        issues.push({
          name: first.activity,
          count: runLength,
          duration: last.endMinutes - first.startMinutes
        });
      }
      runStart = i;
    }
  }

  return issues;
}

/**
 * Produce a 0-100 quality score from the collected signals.
 */
function calculateQualityScore(episodeCount, domainCoverage, warnings) {
  let score = 100;

  // Deduct for low episode count
  if (episodeCount < MIN_EPISODES) {
    score -= (MIN_EPISODES - episodeCount) * 5;
  }

  // Deduct for missing basic domains
  score -= domainCoverage.missing.length * 10;

  // Deduct per warning by severity
  warnings.forEach(w => {
    if (w.severity === 'moderate') score -= 10;
    if (w.severity === 'low') score -= 3;
  });

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function getDurationMinutes(activity) {
  return activity.endMinutes - activity.startMinutes;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} minutes`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

function formatDomainName(domain) {
  const names = {
    sleep: 'sleep or rest',
    personalCare: 'personal care',
    eating: 'eating or drinking',
    travel: 'travel or transport'
  };
  return names[domain] || domain;
}
