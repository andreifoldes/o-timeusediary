# URL Parameters Guide

Configuring participant links and study parameters

[← Back to Documentation Home](index.md)

## Overview

O-TUD automatically captures URL parameters and incorporates them into the study data. This allows you to pass participant identifiers, study conditions, and other metadata through the URL without requiring participants to manually enter this information.

> **Key Feature:** All URL parameters are automatically captured and included in the exported data, making it easy to link diary data back to your participant management system.

## Supported Parameters

The application recognizes several categories of URL parameters:

### Primary Participant Identifiers

| Parameter | Priority | Description | Example |
|---|---|---|---|
| `ppid` | Highest | Pre-existing Participant ID (takes precedence over all others) | `?ppid=P001` |
| `pid` | Medium | Participant ID (used if ppid not present) | `?pid=12345` |
| `PROLIFIC_PID` | Medium | Prolific participant identifier | `?PROLIFIC_PID=5f8c2a1b3d4e` |

> **ID Priority System:** If multiple ID parameters are present, the system uses this priority order:
> 1. `ppid` (if present and not empty)
> 2. `pid` (if no ppid)
> 3. Automatically generated 16-digit random ID (if neither present)

### Study Management Parameters

| Parameter | Description | Data Export Field | Example |
|---|---|---|---|
| `STUDY_ID` | Study identifier for multi-study setups | `STUDY_ID` | `?STUDY_ID=TimeUse2024` |
| `SESSION_ID` | Session identifier within a study | `SESSION_ID` | `?SESSION_ID=baseline` |
| `DIARY_WAVE` | Diary wave number (converted to integer) | `diaryWave` | `?DIARY_WAVE=1` |
| `survey` or `SURVEY` | Survey identifier (becomes session_id when ppid is used) | `SESSION_ID` | `?survey=follow_up` |

### Application Control Parameters

| Parameter | Values | Description | Example |
|---|---|---|---|
| `instructions` | `completed` | Indicates participant has already viewed instructions | `?instructions=completed` |

## URL Construction Examples

### Basic Participant Link

```
https://yourstudy.github.io/timediary/?pid=P001&STUDY_ID=DailyActivities&DIARY_WAVE=1
```

### Prolific Integration

```
https://yourstudy.github.io/timediary/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
```

### Follow-up Study with Instructions Bypass

```
https://yourstudy.github.io/timediary/?ppid=RETURNING_P001&survey=week2&instructions=completed
```

### Multi-wave Longitudinal Study

```
https://yourstudy.github.io/timediary/?pid=P001&STUDY_ID=LongitudinalTimeUse&DIARY_WAVE=3&SESSION_ID=month6
```

## Parameter Processing

The application processes URL parameters automatically when the page loads:

1. **Capture:** All URL parameters are captured using `URLSearchParams`
2. **Storage:** Parameters are stored in `window.timelineManager.study` object
3. **ID Resolution:** Primary participant ID is determined using the priority system
4. **Data Integration:** Parameters are included in all data exports

### Technical Implementation

```javascript
// Automatic parameter capture
const urlParams = new URLSearchParams(window.location.search);
for (const [key, value] of urlParams) {
    window.timelineManager.study[key] = value;
}

// ID priority resolution
const pid = studyData.ppid || studyData.pid || generateRandomID();
```

## Data Export Integration

All URL parameters are automatically included in the exported data. Key fields in the CSV export include:

| Export Field | Source Parameter(s) | Notes |
|---|---|---|
| `pid` | `ppid`, `pid`, or generated | Primary participant identifier used in analysis |
| `PROLIFIC_PID` | `PROLIFIC_PID` | Prolific platform identifier |
| `STUDY_ID` | `STUDY_ID` | Study identifier |
| `SESSION_ID` | `SESSION_ID`, `survey`, or `SURVEY` | Session/wave identifier |
| `diaryWave` | `DIARY_WAVE` | Converted to integer |
| `instructions` | `instructions` | Boolean indicating instruction completion |

## Best Practices

### Participant Management

- **Use descriptive IDs:** Include study prefix (e.g., `TU2024_P001`)
- **URL encode special characters:** Ensure spaces and special characters are properly encoded
- **Test parameter combinations:** Verify your URL construction with different scenarios
- **Document your scheme:** Keep track of your parameter naming conventions

### Platform Integration

#### Prolific Setup

1. Use Prolific's built-in variables: `{{%PROLIFIC_PID%}}`, `{{%STUDY_ID%}}`, `{{%SESSION_ID%}}`
2. Set completion URL to match your `primary_redirect_url` in activities.json
3. Include the Prolific PID in your completion URL for automatic approval

### Longitudinal Studies

- **Use consistent IDs:** Same participant should have the same base ID across waves
- **Track waves clearly:** Use `DIARY_WAVE` parameter for wave identification
- **Bypass instructions for return participants:** Add `instructions=completed` for experienced users

## Troubleshooting

### Common Issues

**Missing Participant IDs:**
- Check URL encoding - spaces and special characters must be encoded
- Verify parameter names match exactly (case-sensitive)
- Ensure URLs are not truncated in email or platform distribution

### Testing URLs

1. **Local Testing:** Test parameters on localhost before deployment
2. **Browser Console:** Check `window.timelineManager.study` object to verify parameter capture
3. **Data Export:** Verify parameters appear correctly in exported CSV data
4. **Redirect Testing:** Ensure completion redirects work with your parameters

### Debugging Parameters

#### Console Commands for Testing

```javascript
// Check captured parameters
console.log(window.timelineManager.study);

// Check resolved participant ID
console.log(window.timelineManager.study.ppid || window.timelineManager.study.pid);

// Verify current URL parameters
console.log(new URLSearchParams(window.location.search));
```

## Custom Parameters

Beyond the standard parameters, you can include any custom URL parameters relevant to your study. All parameters are automatically captured and included in the exported data.

### Example Custom Parameters

```
https://yourstudy.github.io/timediary/?pid=P001&condition=experimental&researcher=DrSmith&site=university_a
```

These would appear as additional columns in your exported data: `condition`, `researcher`, `site`

> **Tip:** Use custom parameters to track experimental conditions, recruitment sources, or any other metadata relevant to your analysis without requiring additional participant input.