---
name: Accessibility Bug
about: Report an accessibility violation or barrier
title: '[A11y] '
labels: accessibility, bug
assignees: ''
---

## Accessibility Violation Report

### Rule Information

**Rule ID:** <!-- e.g., color-contrast, meta-viewport, button-name -->

**WCAG Criterion:** <!-- e.g., 1.4.3 Contrast (Minimum) -->

**WCAG Level:** <!-- A, AA, or AAA -->

**Severity:** <!-- critical, serious, moderate, or minor -->

### Detection Method

- [ ] Automated testing (axe-core)
- [ ] Manual testing
- [ ] Screen reader testing
- [ ] User report
- [ ] Other:

### Affected Page(s)

<!-- List the URL path(s) where this issue occurs -->
-

### Affected Element(s)

<!-- Provide CSS selectors or describe the elements -->
```
<!-- e.g., .save-btn span[data-i18n="buttons.submit"] -->
```

**HTML snippet (if applicable):**
```html
<!-- Paste the relevant HTML here -->
```

### Steps to Reproduce

1. Navigate to [page]
2. [Additional steps if needed]
3. Run accessibility scan / use assistive technology

### Current Behavior

<!-- Describe what happens currently -->

### Expected Behavior

<!-- Describe what should happen for accessibility compliance -->

### Affected User Groups

<!-- Check all that apply -->
- [ ] Screen reader users
- [ ] Users with low vision
- [ ] Users with color blindness
- [ ] Users with motor impairments
- [ ] Users with cognitive disabilities
- [ ] Keyboard-only users
- [ ] Users of magnification software
- [ ] Other:

### Suggested Fix

<!-- If known, describe how to fix this issue -->

### Additional Context

**axe-core help URL:** <!-- e.g., https://dequeuniversity.com/rules/axe/4.11/color-contrast -->

**Screenshots/Videos:**
<!-- Attach any relevant screenshots or videos -->

### Testing Checklist

Before closing this issue, verify:
- [ ] Fix implemented
- [ ] Automated test updated (exclusion removed from axe config)
- [ ] Manual testing performed
- [ ] Tested with assistive technology (if applicable)
- [ ] accessibility-baseline.md updated
