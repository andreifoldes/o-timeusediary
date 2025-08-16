# Translation Guide

Step-by-step instructions for adding new language translations to O-ELIDDI

[← Back to Documentation Index](index.md)

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step-by-Step Translation Process](#step-by-step-translation-process)
- [Translation Reference](#translation-reference)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Testing Checklist](#testing-checklist)
- [Language Codes Reference](#language-codes-reference)

## Overview

The O-ELIDDI application uses a comprehensive internationalization (i18n) system that supports multiple languages with easy extensibility. This guide provides step-by-step instructions for adding new language translations.

### Currently Supported Languages

- **English (en)** - Default/fallback language
- **Spanish (es)** - Complete translation
- **French (fr)** - Complete translation

## Prerequisites

Before starting translation work, ensure you have:

- **Basic JSON knowledge** - Translation files use JSON format
- **Understanding of the application** - Familiarize yourself with the app's functionality
- **Access to the codebase** - You'll need to create/modify files in the `/locales/` directory
- **Browser for testing** - To verify translations work correctly

## Step-by-Step Translation Process

### 1. Create the Translation File

1. Navigate to the `/locales/` directory in the project root
2. Create a new JSON file named with the language code (e.g., `de.json` for German, `it.json` for Italian)
3. Copy the structure from `en.json` as your starting template:

```bash
# Copy English template to new language file
cp locales/en.json locales/de.json
```

### 2. Translate the Content

Open your new language file and translate each text string. Here's the basic structure:

```json
{
  "instructions": {
    "title": "Your Translation Here",
    "subtitle": "Your Translation Here",
    "mainInstruction": "Translate this text...",
    "step1": {
      "title": "Your Translation Here",
      "horizontal": "Instructions for desktop/horizontal layout",
      "vertical": "Instructions for mobile/vertical layout"
    }
  },
  "buttons": {
    "submit": "Your Translation Here",
    "start": "Your Translation Here",
    "undo": "Your Translation Here"
  }
}
```

#### Translation Guidelines

- **Text Length:** Some languages (like German) can be 30-40% longer than English. Test that longer text doesn't break the UI layout.
- **HTML Content:** Some translations contain HTML markup like `<span class="emphasis">yesterday</span>`. Preserve HTML tags and only translate the text content.
- **Context-Specific Content:** The app has different instructions for horizontal (desktop) vs vertical (mobile) layouts. Translate both versions appropriately.
- **Special Characters:** JSON requires escaping quotes with `\"`. Use proper Unicode characters for accented letters.

### 3. Configure the Language Setting

Update the default language in the application settings:

1. Open `settings/activities.json`
2. Locate the `general` section
3. Update the `language` field:

```json
{
  "general": {
    "language": "de",
    "other_settings": "..."
  }
}
```

### 4. Test Your Translation

#### Basic Testing

1. Start the development server: `npm start`
2. Open the application in your browser
3. Check that your translations appear correctly
4. Test both desktop and mobile views

#### Debug Console Testing

Open browser developer tools console and test specific translations:

```javascript
// Test translation loading
await window.i18n.init('de');

// Test specific translation keys
console.log('Title:', window.i18n.t('instructions.title'));
console.log('Submit button:', window.i18n.t('buttons.submit'));

// Test with URL parameter
// Visit: http://localhost:8080?lang=de
```

#### URL Parameter Testing

You can test your language without changing the default setting:

- Main app: `http://localhost:8080?lang=de`
- Instructions page: `http://localhost:8080/pages/instructions.html?lang=de`

### 5. Comprehensive Testing

Test all major sections of the application:

- **Instructions page** - Check all instruction text and button labels
- **Main timeline interface** - Verify activity labels and UI elements
- **Modal dialogs** - Test popup windows and form elements
- **Thank you page** - Check completion messages
- **Error messages** - Test any error scenarios

### 6. Validate Translation Completeness

Use the debug tools to check for missing translations:

```javascript
// Load your language and test for missing keys
window.i18n.init('de').then(() => {
  // Test various translation keys
  const testKeys = [
    'instructions.title',
    'buttons.submit',
    'modals.childItems.title',
    'messages.loading',
    'thankYou.title'
  ];
  
  testKeys.forEach(key => {
    const translation = window.i18n.t(key);
    console.log(`${key}: ${translation}`);
    
    // Check if it fell back to English (indicates missing translation)
    if (translation === window.i18n.t(key, 'en')) {
      console.warn(`Possible missing translation for: ${key}`);
    }
  });
});
```

## Translation Reference

### Complete Translation File Structure

Here's the complete structure you need to translate:

```json
{
  "instructions": {
    "title": "Instructions",
    "subtitle": "How to use this research tool",
    "mainInstruction": "Think about activities you did <span class=\"emphasis\">yesterday</span> and create a timeline of your day.",
    "step1": {
      "title": "Select and Place an Activity",
      "horizontal": "Choose an activity from the menu at the bottom of the screen, then click on the timeline to place it.",
      "vertical": "Tap the (+) button in the bottom right corner to add activities to your timeline."
    },
    "step2": {
      "title": "Adjust Time and Duration", 
      "horizontal": "Drag the ends of activities to adjust their start time and duration.",
      "vertical": "Tap and drag activities to reposition them, or drag their edges to adjust timing."
    },
    "step3": {
      "title": "Submit Your Timeline",
      "description": "When you're satisfied with your timeline, click the Submit button to save your data.",
      "submitHelp": "Submit your completed timeline"
    }
  },
  "buttons": {
    "submit": "Submit",
    "start": "Start Timeline",
    "undo": "Undo",
    "next": "Next",
    "previous": "Previous", 
    "close": "Close",
    "addActivity": "Add Activity",
    "undoTooltip": "Undo the last action"
  },
  "modals": {
    "childItems": {
      "title": "Select Sub-Activity",
      "titleFor": "Select an option for \"{activityName}\"",
      "noOptions": "No sub-activities available for this activity."
    },
    "customActivity": {
      "title": "Add Custom Activity",
      "placeholder": "Enter activity name...",
      "addButton": "Add Activity",
      "cancelButton": "Cancel"
    }
  },
  "messages": {
    "loading": "Loading...",
    "error": "An error occurred while processing your request.",
    "success": "Your timeline has been saved successfully!",
    "offline": "You are currently offline. Your data will be saved when connection is restored.",
    "dataUploaded": "Data uploaded successfully",
    "uploadError": "Error uploading data. Please try again."
  },
  "activities": {
    "selectActivity": "Select an activity",
    "customActivity": "Custom activity",
    "noActivitiesFound": "No activities found"
  },
  "thankYou": {
    "title": "Thank You!",
    "message": "Your timeline has been recorded successfully. Thank you for participating in our research.",
    "footer": "You may now close this browser window."
  }
}
```

### Special Translation Notes

#### Responsive Content

`horizontal` vs `vertical` instructions are for different screen orientations:
- Desktop users see horizontal instructions
- Mobile users see vertical instructions
- Both should be translated to make sense in their respective contexts

#### Parameter Substitution

Some strings contain `{parameter}` placeholders like `{activityName}`:
- Translate around these placeholders but keep the exact parameter names
- Example: `"Select option for {activityName}"` → `"Seleccionar opción para {activityName}"`

#### HTML Markup

Some translations contain HTML like `<span class="emphasis">yesterday</span>`:
- Only translate the text content, preserve all HTML tags and attributes
- These are used for styling specific words or phrases

## Common Issues and Solutions

| Problem | Solution |
|---|---|
| Text is cut off or overflows | Some languages are longer than English. Test translations on both desktop and mobile to ensure they fit properly. |
| Special characters don't display correctly | Ensure your JSON file is saved with UTF-8 encoding and use proper Unicode characters. |
| HTML markup is displayed as text | Check that you're using the correct `data-i18n-html` attribute for content that should render HTML. |
| Translations don't appear | Check JSON syntax is valid (no trailing commas, proper quotes). Verify language code matches filename. Clear browser cache. |
| Fallback to English occurs | Check that all translation keys exist in your file and match the exact key names used in the English version. |

## Testing Checklist

Before submitting your translation:

- [ ] All text strings are translated
- [ ] HTML markup is preserved in translated strings
- [ ] Parameter placeholders (`{activityName}`) are preserved
- [ ] Translation works on both desktop and mobile layouts
- [ ] Special characters display correctly
- [ ] No text is cut off or overflows containers
- [ ] JSON file syntax is valid
- [ ] Language loads without console errors
- [ ] Fallback to English doesn't occur for translated strings

## Language Codes Reference

Use standard ISO 639-1 language codes for your translation files:

| Language | Code | Filename |
|---|---|---|
| German | de | de.json |
| Italian | it | it.json |
| Portuguese | pt | pt.json |
| Dutch | nl | nl.json |
| Russian | ru | ru.json |
| Japanese | ja | ja.json |
| Korean | ko | ko.json |
| Chinese | zh | zh.json |
| Arabic | ar | ar.json |

> **Note:** For regional variants, use the full locale code (e.g., `pt-BR` for Brazilian Portuguese, `zh-CN` for Simplified Chinese).

## Submitting Your Translation

1. **Test thoroughly** using the checklist above
2. **Create a pull request** with your new translation file
3. **Include testing notes** about any layout issues or special considerations
4. **Document any cultural adaptations** you made for the target language

> **Need Help?** If you encounter issues during translation, check the browser console for JavaScript errors, use the debug script to test specific translations, or compare with existing translations (Spanish/French) for reference.