# Accessibility Baseline Report

**Generated:** January 2026
**Tool:** axe-core 4.10.x via @axe-core/playwright
**Standard:** WCAG 2.1 Level AA

## Summary

This document establishes the accessibility baseline for O-TUD (Open Time Use Diary) as of the date above. It catalogs known accessibility violations detected through automated testing to track technical debt and guide remediation efforts.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | - |
| Serious | 1 | Tracked |
| Moderate | 1 | Tracked |
| Minor | 0 | - |
| **Total** | **2** | |

## Violations by Severity

### Serious (1)

#### 1. `color-contrast` - Insufficient Color Contrast

**WCAG Criterion:** 1.4.3 Contrast (Minimum) (Level AA)

**Description:** Elements must meet minimum color contrast ratio thresholds. Text smaller than 18pt (or 14pt bold) requires a contrast ratio of at least 4.5:1.

**Affected Pages:**
- `/pages/instructions.html`

**Affected Elements:**
| Element | Foreground | Background | Actual Ratio | Required |
|---------|------------|------------|--------------|----------|
| `.save-btn span[data-i18n="buttons.submit"]` | #ffffff | #059669 | 3.76:1 | 4.5:1 |

**Impact:** Users with low vision or color blindness may have difficulty reading the Submit button text.

**Suggested Fix:**
- Darken the green background to at least `#047857` (ratio ~4.5:1) or `#065f46` (ratio ~5.6:1)
- Or use a larger/bolder font (18pt+ or 14pt bold) which only requires 3:1 ratio

**Reference:** https://dequeuniversity.com/rules/axe/4.11/color-contrast

---

### Moderate (1)

#### 2. `meta-viewport` - Zoom and Scaling Disabled

**WCAG Criterion:** 1.4.4 Resize Text (Level AA)

**Description:** The `<meta name="viewport">` tag includes `maximum-scale=1.0` and `user-scalable=no`, which prevents users from zooming the page.

**Affected Pages:**
- `/index.html`
- `/pages/instructions.html`

**Affected Elements:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

**Impact:** Users with low vision who rely on pinch-to-zoom cannot enlarge content. This is especially problematic on mobile devices.

**Suggested Fix:**
Remove zoom restrictions:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

If zoom causes layout issues with the timeline interaction, consider:
- Using CSS `touch-action` on specific interactive elements instead
- Implementing a custom zoom control for the timeline area only

**Reference:** https://dequeuniversity.com/rules/axe/4.11/meta-viewport

---

## Pages Tested

| Page | Critical | Serious | Moderate | Minor | Status |
|------|----------|---------|----------|-------|--------|
| `/index.html` (Main Timeline) | 0 | 0 | 1 | 0 | meta-viewport |
| `/pages/instructions.html` | 0 | 1 | 1 | 0 | color-contrast, meta-viewport |
| `/pages/thank-you.html` | 0 | 0 | 0 | 0 | Passing |

## Affected User Groups

The current violations primarily affect:

1. **Users with low vision** - Cannot zoom to enlarge text/UI elements
2. **Users with color blindness** - May struggle with low-contrast button text
3. **Users with cognitive disabilities** - May have difficulty reading low-contrast text
4. **Older users** - Often need larger text and higher contrast

## Remediation Priority

1. **High Priority** - `color-contrast`: Quick CSS fix, significant impact
2. **Medium Priority** - `meta-viewport`: Requires testing to ensure timeline interactions still work

## Testing Commands

Run accessibility tests:
```bash
npm run test:a11y
```

Run with detailed output:
```bash
npm run test:a11y -- --reporter=list
```

Run only on Chromium for faster feedback:
```bash
npm run test:a11y -- --project=chromium
```

## Exclusions

The following violations are temporarily excluded in the test suite to allow CI to pass while tracking this technical debt:

1. `color-contrast` on `.save-btn` - Tracked in this baseline
2. `meta-viewport` - Tracked in this baseline

These exclusions should be removed as violations are fixed.

## Next Steps

1. Create GitHub issues for each violation
2. Fix `color-contrast` issue (estimated: low effort)
3. Evaluate `meta-viewport` fix impact on touch interactions
4. Re-run baseline after fixes
5. Add additional page states to testing (modals, error states, etc.)
