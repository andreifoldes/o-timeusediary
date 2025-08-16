# Activities Configuration

Understanding and configuring the activities.json file

[← Back to Documentation Home](index.md)

## Overview

The `settings/activities.json` file is the central configuration file that defines how your time-use diary study will operate. It controls everything from the experiment ID and general settings to the specific activities participants can select and the timelines they interact with.

> **Important:** This file must be valid JSON. Any syntax errors will prevent the application from loading properly.

## File Structure

The activities.json file has two main sections:

- **general:** Global study settings and configuration
- **timeline:** Timeline definitions and activity categories

```json
{
  "general": {
    // Study-level configuration
  },
  "timeline": {
    "primary": { ... },
    "secondary": { ... },
    "location": { ... },
    "who": { ... },
    "device": { ... },
    "enjoyment": { ... }
  }
}
```

## General Configuration Fields

The `general` section contains study-wide settings:

| Field | Type | Required | Description |
|---|---|---|---|
| `experimentID` | String | **Required** | JSPsych DataPipe experiment ID for data collection |
| `app_name` | String | Optional | Display name for the application (e.g., "O-ELIDDI") |
| `version` | String | Optional | Version number for tracking |
| `author` | String | Optional | Study author or researcher name |
| `language` | String | Optional | Language code (e.g., "en", "es", "fr") |
| `instructions` | Boolean | Optional | Whether to show instruction pages |
| `primary_redirect_url` | String | **Required** | URL to redirect to after successful data submission |
| `fallbackToCSV` | Boolean | Optional | Whether to download CSV if DataPipe fails |

### Example General Configuration

```json
"general": {
  "experimentID": "YOUR_DATAPIPE_EXPERIMENT_ID",
  "app_name": "Daily Activity Study",
  "version": "1.0.0",
  "author": "Dr. Jane Smith",
  "language": "en",
  "instructions": true,
  "primary_redirect_url": "pages/thank-you.html",
  "fallbackToCSV": true
}
```

## Timeline Configuration

Each timeline in the `timeline` section represents a different dimension of activity tracking. Common timelines include:

- **primary:** Main daily activities
- **secondary:** Secondary concurrent activities
- **location:** Where activities took place
- **who:** Social context (who was present)
- **device:** Technology usage
- **enjoyment:** Activity enjoyment ratings

### Timeline-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | **Required** | Display name for the timeline |
| `description` | String | Optional | Description or instructions for participants |
| `mode` | String | **Required** | "single-choice" or "multiple-choice" |
| `min_coverage` | String | Optional | Minimum percentage of day that must be covered |
| `categories` | Array | **Required** | Array of activity categories |

## Activity Category Structure

Each category contains a group of related activities:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | **Required** | Category name (e.g., "Personal", "Work/Study") |
| `color` | String | Optional | Default color for activities in this category |
| `activities` | Array | **Required** | Array of activity objects |

## Activity Object Structure

Each activity object defines a specific activity participants can select:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | **Required** | Full activity name displayed to participants |
| `code` | Number | Optional | Numeric code for data analysis (e.g., 101, 102) |
| `label` | String | Optional | Descriptive label for the activity |
| `short` | String | Optional | Shortened name for display in compact spaces |
| `vshort` | String | Optional | Very short abbreviation (3-4 characters) |
| `color` | String | **Required** | Hex color code for timeline visualization |
| `examples` | String | Optional | Examples or clarification for participants |
| `childItems` | Array | Optional | Sub-activities for hierarchical organization |
| `subselection` | Object | Optional | Additional questions for this activity |

### Example Activity Object

```json
{
  "name": "Playing Sports, Exercise",
  "code": 129,
  "label": "playing sports, exercise",
  "short": "exercise",
  "vshort": "ex",
  "color": "#b9ead3",
  "childItems": [
    {
      "name": "Walking and hiking",
      "code": 129,
      "label": "playing sports, exercise",
      "short": "exercise",
      "vshort": "ex",
      "color": "#b9ead3"
    },
    {
      "name": "Jogging and running",
      "code": 129,
      "label": "playing sports, exercise", 
      "short": "exercise",
      "vshort": "ex",
      "color": "#b9ead3"
    }
  ]
}
```

## Color Guidelines

Colors should be specified as hex codes (e.g., `#b9ead3`). Consider these guidelines:

- Use distinct colors for different activity categories
- Ensure sufficient contrast for accessibility
- Use similar hues for related activities within a category
- Avoid very dark colors that make text difficult to read

> **Accessibility Note:** Test your color choices with colorblind users or accessibility tools to ensure all participants can distinguish between activities.

## Hierarchical Activities

Activities can have sub-activities defined in the `childItems` array. This creates a two-level hierarchy where participants first select a main activity, then optionally specify a more detailed sub-activity.

> **Best Practice:** Use hierarchical activities when you want both broad categories and specific details. For example, "Transportation" might have child items like "Car", "Bus", "Walking", etc.

## Timeline Modes

### Single-Choice Mode

In single-choice mode, participants can only select one activity per time slot. This is typical for primary activity timelines.

### Multiple-Choice Mode

In multiple-choice mode, participants can select multiple activities simultaneously. This is useful for dimensions like "who was present" where multiple people might be involved.

#### Example Multiple-Choice Timeline

```json
"who": {
  "name": "Who",
  "description": "Who were you with?",
  "mode": "multiple-choice",
  "min_coverage": "0",
  "categories": [
    {
      "name": " ",
      "activities": [
        {
          "name": "Alone",
          "color": "#cdf0a8"
        },
        {
          "name": "Spouse / partner", 
          "color": "#f0a8d1"
        },
        {
          "name": "Child under 12 from your household",
          "color": "#a8bff0"
        }
      ]
    }
  ]
}
```

## Validation and Testing

Before deploying your study:

1. **Validate JSON:** Use a JSON validator to ensure syntax is correct
2. **Test Colors:** Verify all hex colors are valid and visually distinct
3. **Check Completeness:** Ensure all required fields are present
4. **Test User Experience:** Have someone test the activity selection process
5. **Verify Data Export:** Test that activity codes and names appear correctly in exported data

### Common Errors

- Missing commas between objects or properties
- Invalid hex color codes (must start with # and be 6 characters)
- Inconsistent activity codes across similar activities
- Missing required fields like "name" or "color"

## Multiple Activity Sets

The `settings/` directory can contain multiple activity files for different studies:

- `activities.json` - Default configuration
- `activities_game.json` - Gaming study activities
- `activities_mc.json` - Multiple choice variant
- `activities_usoc.json` - USOC study activities

You can switch between configurations by modifying the import in your main JavaScript files or creating different deployment versions.