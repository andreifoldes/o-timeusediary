# Sleep Demo — Design Spec

**Branch:** `sleep-demo`
**Status:** Approved scope, awaiting plan
**Date:** 2026-05-15

## Goal

Fork O-TUD into a minimal sleep-focused demo. Participants log every period
they slept (including daytime naps) and rate the perceived quality of each
sleep block. Everything else from the full diary is removed.

## Scope

### In scope

- A single primary timeline containing **one** activity: "Sleep".
  Instructions tell participants to use this same activity for both
  nighttime sleep and short naps.
- A parallel **Sleep quality** timeline with a 5-point categorical scale:
  Poor, Fair, OK, Good, Great.
- Updated participant-facing instructions explaining the sleep + quality
  flow.
- An updated `app_name` and a fresh `experimentID` so this fork's data is
  distinguishable from the main O-TUD study.

### Out of scope

- Changes to timeline rendering, drag-and-drop logic, save/export, or any
  core JS. The data model is config-driven via `Object.keys(data.timeline)`
  (verified in `js/script.js:2469`); the JSON edit alone should produce the
  desired UI.
- Sleep-specific analytics, charting, or summary screens.
- Migration of the existing E2E test suite. Tests that assume multiple
  timelines or specific activities will be marked as expected-to-fail on
  this branch; rewriting them is a follow-up.
- Documentation site (`mkdocs.yml`, `docs/`) updates beyond this spec.

## Detailed design

### Timeline configuration (`settings/activities.json`)

Replace `timeline` with exactly two entries:

```jsonc
{
  "general": {
    "experimentID": "sleepDemo01",
    "app_name": "O-TUD Sleep Demo",
    "version": "1.0.0",
    "language": "en",
    "instructions": true,
    "primary_redirect_url": "pages/thank-you.html",
    "fallbackToCSV": true,
    "accessibility": { /* unchanged */ }
  },
  "timeline": {
    "primary": {
      "name": "Sleep",
      "description": "Log every period you slept, including short naps.",
      "mode": "single-choice",
      "min_coverage": "0",
      "categories": [
        {
          "name": "Sleep",
          "activities": [
            {
              "name": "Sleep",
              "code": 101,
              "label": "sleep",
              "short": "sleep",
              "vshort": "slp",
              "color": "#a2b4ee",
              "childItems": []
            }
          ]
        }
      ]
    },
    "quality": {
      "name": "Sleep quality",
      "description": "Rate the quality of each sleep block.",
      "mode": "single-choice",
      "min_coverage": "0",
      "categories": [
        {
          "name": "Quality",
          "activities": [
            { "name": "Poor",  "code": 201, "label": "poor",  "short": "poor",  "vshort": "p",  "color": "#d9534f", "childItems": [] },
            { "name": "Fair",  "code": 202, "label": "fair",  "short": "fair",  "vshort": "f",  "color": "#f0ad4e", "childItems": [] },
            { "name": "OK",    "code": 203, "label": "ok",    "short": "ok",    "vshort": "ok", "color": "#f7e463", "childItems": [] },
            { "name": "Good",  "code": 204, "label": "good",  "short": "good",  "vshort": "g",  "color": "#9bd17a", "childItems": [] },
            { "name": "Great", "code": 205, "label": "great", "short": "great", "vshort": "gt", "color": "#3fa34d", "childItems": [] }
          ]
        }
      ]
    }
  }
}
```

Notes:

- `min_coverage: "0"` — most of the day is awake; the existing 10% rule
  doesn't apply.
- Color choices: blue for sleep (matches main O-TUD), red→green ramp for
  quality.
- Activity `code`s are stable identifiers reused in CSV/JSON export.

### Instructions page (`pages/instructions.html`)

Rewrite the body copy to:

1. Explain the study purpose ("we're collecting sleep timing and perceived
   quality").
2. Tell participants to drag **Sleep** onto every period they slept —
   including short naps, however brief.
3. Tell them to then rate each sleep block on the **Sleep quality**
   timeline.
4. Note that time not marked as Sleep is assumed to be awake.

Keep existing layout/styling; this is a copy change only.

### What is intentionally not touched

- `js/` — config-driven; no changes needed.
- `styles/`, `assets/`, `favicon/` — no changes.
- `e2e/` — left as-is on this branch; tests will fail and that's accepted
  for the demo.
- `README.md` — optional one-line note; can skip.

## Risks and unknowns

1. **Quality timeline visual fit.** A 5-step scale on a 24h timeline may
   look busy if participants tap-and-drag for every short interval. We'll
   verify visually after the JSON edit; if cramped, the fallback is to
   reduce the scale to 3 points (Poor/OK/Good).
2. **Multiple-timeline UX assumptions.** The UI may show timelines
   side-by-side (desktop) or stacked (mobile) in a layout tuned for 6
   timelines. With only 2, spacing may be off. To be verified manually in
   the browser.
3. **E2E test breakage.** `e2e/selected-activity-persistence.spec.js`
   assumes ≥2 distinct activity selections across timelines. It will fail
   on this branch; not blocking the demo.

## Verification plan

1. Load the demo locally; confirm two timelines render (primary + quality).
2. Drag "Sleep" onto multiple time blocks (overnight + a midday nap).
3. Drag each quality level onto a block; confirm color renders correctly.
4. Export CSV and JSON; confirm both timelines and all codes appear.
5. Visually check desktop and mobile layouts.

## Open questions

- None. Scope confirmed by user.

## Out-of-band follow-ups (not part of this spec)

- Rewriting/skipping E2E tests for the reduced-timeline layout.
- Documentation site update if this branch is deployed publicly.
- Possible sleep-summary visualization (total hours, avg quality).
