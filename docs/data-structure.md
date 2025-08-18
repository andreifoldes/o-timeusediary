# Data Structure & Export

Understanding O-ELIDDI's data collection and export formats

[← Back to Documentation Home](index.md)

## Overview

O-ELIDDI collects timeline data across multiple dimensions and exports it in a structured CSV format. The application supports two export methods: automatic upload to OSF via JSPsych DataPipe (recommended) or local CSV download as a fallback.

### Key Features

- Automatic data export to OSF research platform via DataPipe
- Comprehensive activity tracking across multiple timeline dimensions
- Built-in participant metadata and technical information
- CSV format optimized for statistical analysis software

## Export Methods

### Method 1: DataPipe API (Recommended)

Automatically uploads data to OSF via JSPsych DataPipe service. This is the default method for seamless data collection.

- **Endpoint:** `https://pipe.jspsych.org/api/data/`
- **Format:** CSV content in POST request
- **Authentication:** Via experimentID in activities.json
- **Redirect:** Automatic redirect to thank you page after success

> **🔌 Database Integration:** The `sendData()` function can be easily modified to send data directly to a relational database instead of OSF. The timeline data is already structured as clean, normalized tabular records perfect for PostgreSQL, MySQL, or other database systems. Simply update the endpoint and data handling in `js/utils.js:sendData()`.

### Method 2: Local CSV Download

Downloads CSV file directly to participant's computer. Used as fallback or when DataPipe is unavailable.

- **Trigger:** Automatic if DataPipe fails (when `fallbackToCSV: true`)
- **Trigger:** Manual via debug mode or configuration
- **Format:** Standard CSV file download
- **Filename:** `timeline_{pid}_{timestamp}.csv`

### Data Flow

```
Data Complete → Try DataPipe → Success: Redirect
                     ↓
              DataPipe Fails → Fallback to CSV → Download File
```

## Data Structure

Each row in the exported CSV represents one time interval with activity information. The data structure captures both the activity details and contextual metadata.

### Core Timeline Fields

| Field | Type | Description | Example |
|---|---|---|---|
| `timelineKey` | String | Timeline identifier (primary, secondary, location, etc.) | `primary` |
| `activity` | String | Activity name(s), multiple activities separated by " \| " | `Sleeping` or `Work \| Computer` |
| `category` | String | Activity category from configuration | `Personal` |
| `startTime` | String | Activity start time in YYYY-MM-DD HH:MM format | `2024-07-01 06:30` |
| `endTime` | String | Activity end time in YYYY-MM-DD HH:MM format | `2024-07-01 08:00` |

### Participant Identification

| Field | Type | Description | Source |
|---|---|---|---|
| `pid` | String | Primary participant identifier | URL parameter or auto-generated |
| `PROLIFIC_PID` | String | Prolific platform participant ID | URL parameter |
| `STUDY_ID` | String | Study identifier | URL parameter |
| `SESSION_ID` | String | Session/wave identifier | URL parameter |
| `diaryWave` | Integer | Diary wave number | URL parameter (DIARY_WAVE) |

### Technical Metadata

| Field | Type | Description | Purpose |
|---|---|---|---|
| `viewportWidth` | Integer | Browser viewport width in pixels | Device/display analysis |
| `viewportHeight` | Integer | Browser viewport height in pixels | Device/display analysis |
| `layoutHorizontal` | Boolean | Whether desktop layout was used | Interface mode tracking |
| `browserName` | String | Browser name (Chrome, Firefox, etc.) | Technical compatibility analysis |
| `browserVersion` | String | Browser version number | Technical compatibility analysis |
| `instructions` | Boolean | Whether instructions were completed | Data quality assessment |

## Time Format and Structure

O-ELIDDI uses a 24-hour timeline starting at 4:00 AM to accommodate typical sleep patterns and ensure each "day" captures a complete sleep cycle.

### Time Representation

- **Timeline Start:** 4:00 AM (configurable via TIMELINE_START_HOUR)
- **Timeline End:** 4:00 AM next day
- **Format:** YYYY-MM-DD HH:MM (24-hour format)
- **Next-day notation:** Hours after midnight use next day's date

#### Time Examples

- 4:00 AM start: `2024-07-01 04:00`
- 6:30 PM same day: `2024-07-01 18:30`
- 11:45 PM same day: `2024-07-01 23:45`
- 1:30 AM next day: `2024-07-02 01:30`

### Time Intervals

Activities are recorded in configurable time intervals (default: 10 minutes). Each row represents one continuous period of activity within a specific timeline.

## Multi-Timeline Data

O-ELIDDI supports multiple concurrent timelines, each representing a different dimension of activity tracking:

### Example Timeline Types

- **primary:** Main daily activities (work, sleep, leisure)
- **location:** Where activities occurred (home, work, other)
- **who:** Social context (alone, with family, friends)
- **device:** Technology usage (computer, phone, tablet)
- **enjoyment:** Activity enjoyment ratings (1-7 scale)

Each timeline generates separate rows in the CSV export, allowing for comprehensive multi-dimensional analysis of time use patterns.

## CSV Export Example

Here's a sample of what the exported CSV data looks like:

| timelineKey | activity | category | startTime | endTime | pid | diaryWave | viewportWidth | viewportHeight | layoutHorizontal | browserName | browserVersion | instructions | PROLIFIC_PID | STUDY_ID | SESSION_ID |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| primary | Sleeping | Personal | 2024-07-01 04:00 | 2024-07-01 07:30 | P001 | 1 | 1920 | 1080 | true | Chrome | 126.0.0.0 | true | 5f8c2a1b3d4e | TimeUse2024 | baseline |
| primary | Washing and Dressing | Personal | 2024-07-01 07:30 | 2024-07-01 08:00 | P001 | 1 | 1920 | 1080 | true | Chrome | 126.0.0.0 | true | 5f8c2a1b3d4e | TimeUse2024 | baseline |
| primary | Eating Breakfast | Personal | 2024-07-01 08:00 | 2024-07-01 08:30 | P001 | 1 | 1920 | 1080 | true | Chrome | 126.0.0.0 | true | 5f8c2a1b3d4e | TimeUse2024 | baseline |
| location | Home | Indoor | 2024-07-01 04:00 | 2024-07-01 09:00 | P001 | 1 | 1920 | 1080 | true | Chrome | 126.0.0.0 | true | 5f8c2a1b3d4e | TimeUse2024 | baseline |
| who | Alone | Solo | 2024-07-01 04:00 | 2024-07-01 08:00 | P001 | 1 | 1920 | 1080 | true | Chrome | 126.0.0.0 | true | 5f8c2a1b3d4e | TimeUse2024 | baseline |
| who | Spouse/Partner | Family | 2024-07-01 08:00 | 2024-07-01 08:30 | P001 | 1 | 1920 | 1080 | true | Chrome | 126.0.0.0 | true | 5f8c2a1b3d4e | TimeUse2024 | baseline |

> **Note:** This table shows the actual CSV structure with proper column alignment. The real CSV file will have comma-separated values without the visual table formatting.

## Data Quality Features

### Automatic Validation

- **Coverage Checking:** Validates minimum timeline coverage requirements
- **Time Continuity:** Ensures no gaps or overlaps in single-choice timelines
- **Required Fields:** Checks all essential fields are populated
- **Format Validation:** Verifies time formats and data types

### Metadata for Analysis

**Quality Indicators:**
- `instructions` - Whether participant viewed instructions
- `layoutHorizontal` - Interface mode (may affect data quality)
- Browser information for technical issue identification
- Viewport dimensions for understanding participant setup

## Data Analysis Considerations

### Multiple Activities

When multiple activities are selected for a time period (in multiple-choice timelines), they are concatenated with " | " separators. You may need to split these during analysis.

#### Handling Multiple Activities in Analysis

```r
# R example
library(tidyverse)
data %>% 
  separate_rows(activity, sep = " \\| ") %>%
  # Continue analysis with individual activities
```

```python
# Python example  
import pandas as pd
data['activity'].str.split(' | ').explode()
# Continue analysis with individual activities
```

### Time Zone Considerations

> **Important:** All times are recorded in the participant's local time zone. For multi-site studies, consider collecting time zone information separately or standardizing to UTC.

### Missing Data

Empty time periods (where participants didn't select any activity) are not included in the export. This means gaps in the timeline indicate unrecorded periods rather than "no activity".

## File Naming and Organization

### DataPipe Files

Files uploaded to OSF via DataPipe follow this naming convention:

`timeline_{participantID}_{timestamp}.csv`

#### Example Filenames

- `timeline_P001_2024-07-01T14-30-15.csv`
- `timeline_5f8c2a1b3d4e_2024-07-01T09-45-22.csv`

### Organization Tips

- **Batch Processing:** Download all DataPipe files for batch analysis
- **Participant Tracking:** Use the PID field to link data across time points
- **Quality Control:** Filter based on technical metadata for data quality
- **Version Control:** Track activities.json versions if modifying study parameters

## Troubleshooting Export Issues

### DataPipe Upload Failures

**Common Causes:**
- Invalid experimentID in activities.json
- Network connectivity issues
- Large file sizes (though this is rare)
- JSPsych DataPipe service downtime

### Data Validation Errors

- **Coverage Issues:** Check min_coverage settings in timeline configuration
- **Time Gaps:** Ensure participants complete all required timeline segments
- **Missing Activities:** Verify all timeline types have at least some data

### Testing Data Export

1. **Test Export:** Complete a test timeline and verify data structure
2. **Check DataPipe:** Confirm files appear in your OSF DataPipe dashboard
3. **Validate CSV:** Open exported files in spreadsheet software to verify format
4. **Analysis Test:** Import test data into your analysis software