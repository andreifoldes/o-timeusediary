# OSF Backend Setup

Setting up data collection with JSPsych DataPipe and Open Science Framework

[← Back to Documentation Home](index.md)

## Overview

The Open Science Framework (OSF) provides a robust, free platform for research data management. Combined with JSPsych DataPipe, it offers secure, automated data collection for O-TUD studies with built-in research best practices.

### Key Benefits

| **Free & Open** | **Secure** | **Research-Ready** | **Automatic** |
|---|---|---|---|
| Completely free for academic research with unlimited storage and no participant limits. | Data encrypted in transit and at rest, with granular access controls and audit trails. | Built-in version control, metadata management, and collaboration tools for research teams. | No server setup required - data flows automatically from your study to OSF storage. |

## Prerequisites

Before you begin, ensure you have:

- [ ] An OSF account (free at osf.io)
- [ ] A deployed O-TUD study (see GitHub Pages Deployment guide)
- [ ] Basic understanding of your study's data collection needs
- [ ] Institutional ethics approval (if required)

## Step-by-Step Setup

### 1. Create OSF Account

If you don't already have an OSF account:

1. Visit [osf.io](https://osf.io)
2. Click **"Sign Up"**
3. Use your institutional email address if available
4. Verify your email address
5. Complete your profile with research information

> **Tip:** Using an institutional email helps establish credibility and may provide access to additional OSF features.

### 2. Create a New OSF Project

Set up a project to organize your study data:

1. Log into OSF and click **"Create new project"**
2. Enter a descriptive project title (e.g., "Daily Activity Patterns Study 2024")
3. Add a project description including:
   - Study objectives and research questions
   - Participant demographics and recruitment
   - Data collection timeline
   - Analysis plan overview
4. Set appropriate access permissions:
   - **Public:** For open science projects
   - **Private:** For sensitive data (can be made public later)
5. Add relevant tags and subjects for discoverability

### 3. Access JSPsych DataPipe

Set up automated data collection through DataPipe:

1. Visit [pipe.jspsych.org](https://pipe.jspsych.org)
2. Click **"Get Started"**
3. Sign in with your OSF credentials
4. Authorize DataPipe to access your OSF account

> **Authorization:** DataPipe needs access to create files in your OSF projects. This is secure and only allows DataPipe to upload data files to projects you specify.

### 4. Create DataPipe Experiment

Configure DataPipe for your O-TUD study:

1. In DataPipe dashboard, click **"Create Experiment"**
2. On the first page, enter experiment details:
   - **Name:** Match your OSF project name for easy identification
   - **Description:** Brief description of data being collected (e.g., "Daily activity timeline data from O-TUD study")
   - **OSF Project:** Select the project you created in Step 2 from the dropdown menu
3. Click **"Next"** to proceed to data settings
4. Configure data settings on the second page:
   - **Data format:** CSV (default, recommended for O-TUD)
   - **File naming:** Use default pattern (automatic timestamps)
   - **Storage location:** Confirm correct OSF project is selected
5. Click **"Next"** to proceed to the final page
6. **CRITICAL:** On the final page, configure these two essential settings:
   - **Status - Enable data collection?** Toggle to **On**
     - This must be enabled for your study to collect data successfully
     - If left off, participants will receive errors when submitting their timelines
   - **Data Validation - Enable data validation?** Toggle to **Off**
     - This must be disabled for O-TUD data to be accepted
     - If left on, DataPipe will reject O-TUD's data format and submissions will fail
7. Click **"Create Experiment"** to finalize setup
8. **Important:** Copy the generated **Experiment ID** - you'll need this for O-TUD configuration

> **Experiment ID Example:** Your ID will look something like `eR8ENvJPgQth` - save this securely as it's required for data collection.

> **Common Mistake:** Many users forget to configure the final page settings correctly. Ensure both: (1) "Enable data collection?" is toggled **On**, and (2) "Enable data validation?" is toggled **Off**. Missing either setting will cause all participant data submissions to fail. Double-check both toggles before deploying your study.

### 5. Configure O-TUD

Connect your study to DataPipe by updating the configuration:

1. Open your O-TUD repository (locally or on GitHub)
2. Edit `settings/activities.json`
3. Update the `experimentID` field in the `general` section:

```json
{
  "general": {
    "experimentID": "YOUR_DATAPIPE_EXPERIMENT_ID",
    "app_name": "Your Study Name",
    "version": "1.0.0",
    "author": "Your Name",
    "language": "en",
    "instructions": true,
    "primary_redirect_url": "pages/thank-you.html",
    "fallbackToCSV": true
  },
  // ... rest of configuration
}
```

> **Important:** Replace `YOUR_DATAPIPE_EXPERIMENT_ID` with the actual ID from Step 4. Keep `fallbackToCSV: true` for backup data collection.

### 6. Test Data Collection

Verify that data flows correctly from your study to OSF:

1. Deploy your updated O-TUD configuration
2. Complete a test timeline on your deployed study
3. Submit the data and note any error messages
4. Check your OSF project for the uploaded data file
5. Download and examine the CSV to verify data format

#### Successful Test Indicators

- ✅ No error messages during data submission
- ✅ Automatic redirect to thank you page
- ✅ CSV file appears in OSF project within minutes
- ✅ File contains expected timeline data and metadata

## Data Management on OSF

> **🔌 Alternative Backend Integration:** While OSF provides excellent research data management, the application's `sendData()` function can be easily redirected to send the tabular CSV data to any relational database (PostgreSQL, MySQL, etc.) or custom backend. Simply modify the `sendData()` function in `js/utils.js` to POST the structured data to your preferred endpoint instead of DataPipe. The data is already formatted as clean, normalized tabular records ready for database insertion.

### File Organization

DataPipe automatically organizes your files in the OSF project:

- **Folder structure:** Files are typically stored in the main project directory
- **File naming:** `timeline_{participantID}_{timestamp}.csv`
- **Automatic versioning:** OSF tracks all file changes and versions

### Accessing Your Data

#### Via OSF Web Interface

1. Log into OSF and navigate to your project
2. Click **"Files"** tab
3. Browse and download individual files or entire folders
4. Use built-in preview for CSV files

#### Via API Access

For automated data processing, use OSF's API:

```python
# Python example using requests
import requests

# Get project files
project_id = "YOUR_OSF_PROJECT_ID"
url = f"https://api.osf.io/v2/nodes/{project_id}/files/osfstorage/"
response = requests.get(url)

# Download specific file
file_download_url = "DIRECT_FILE_URL_FROM_API"
data = requests.get(file_download_url).content
```

### Data Backup and Security

- **Automatic backups:** OSF maintains multiple copies of your data
- **Version history:** All file versions are preserved
- **Access logs:** Track who accessed what data when
- **Export options:** Download entire projects as ZIP files

## Privacy and Ethics Configuration

### Project Visibility Settings

**Visibility Options:**
- **Private:** Only you and collaborators can access (recommended for active data collection)
- **Public:** Visible to everyone (consider for post-publication data sharing)
- **Embargoed:** Public metadata, private data until a specified date

### Ethical Considerations

Before collecting data, ensure:

- [ ] Institutional ethics approval is obtained
- [ ] Participant consent procedures are documented
- [ ] Data anonymization protocols are in place
- [ ] Data retention policies are established
- [ ] Access permissions are properly configured
- [ ] Compliance with relevant regulations (GDPR, HIPAA, etc.)

### Data Anonymization

O-TUD can collect anonymous data by design:

- **No personal information:** Timeline data contains no inherently identifying information
- **Participant IDs:** Use anonymous codes rather than names or email addresses
- **URL parameters:** Avoid including sensitive information in participant links
- **IP addresses:** Not collected by O-TUD or stored in timeline data

## Collaboration and Team Management

### Adding Team Members

1. In your OSF project, click **"Contributors"**
2. Click **"Add"** and enter collaborator email addresses
3. Set appropriate permission levels:
   - **Administrator:** Full project control
   - **Read + Write:** Can view and upload data
   - **Read:** View-only access
4. Send invitations and manage access as needed

### DataPipe Access Management

> **DataPipe Security:** Only the OSF account holder who created the DataPipe experiment can modify its settings. Team members access data through OSF project permissions, not DataPipe directly.

## Monitoring and Troubleshooting

### DataPipe Dashboard

Monitor your data collection through the DataPipe interface:

- **Upload statistics:** Number of successful uploads
- **Error logs:** Details of any failed uploads
- **Recent activity:** Timeline of data submissions
- **Storage usage:** Amount of data collected

### Common Issues and Solutions

#### Data Not Appearing in OSF

- Check experimentID is correct in activities.json
- Verify OSF project permissions
- Look for error messages in browser console
- Check DataPipe dashboard for upload errors
- Wait up to 5 minutes for processing delays

#### Authentication Errors

- Reauthorize DataPipe in your OSF account settings
- Check that the OSF project still exists
- Verify you have write permissions to the project
- Try creating a test experiment with a new project

### Debugging Data Collection

#### Browser Console Testing

Test DataPipe connectivity directly in browser console:

```javascript
// Check if data would be sent successfully
console.log(window.timelineManager.study);

// Test DataPipe endpoint (replace with your experiment ID)
fetch('https://pipe.jspsych.org/api/data/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        experimentID: 'YOUR_EXPERIMENT_ID',
        filename: 'test.csv',
        data: 'test,data\n1,2'
    })
}).then(response => console.log(response));
```

## Data Analysis Preparation

### Batch Data Download

For analysis, download all participant data at once:

1. In OSF project, go to **Files** tab
2. Select all data files (Ctrl+click or Shift+click)
3. Click **Download** to get a ZIP file
4. Extract CSV files for analysis

### Data Aggregation Scripts

#### Python Example

```python
import pandas as pd
import glob
import os

# Read all CSV files from download
csv_files = glob.glob("downloaded_data/*.csv")
all_data = []

for file in csv_files:
    df = pd.read_csv(file)
    all_data.append(df)

# Combine all participant data
combined_data = pd.concat(all_data, ignore_index=True)

# Save master dataset
combined_data.to_csv("master_timeline_data.csv", index=False)
```

### Quality Control Checks

Recommended data quality checks:

- [ ] Verify all expected participants have submitted data
- [ ] Check for duplicate submissions
- [ ] Validate timeline coverage completeness
- [ ] Review timestamp formatting and ranges
- [ ] Identify any unusual activity patterns
- [ ] Check URL parameter data for accuracy

## Advanced Features

### OSF Registrations

For enhanced research credibility, consider creating an OSF registration:

- **Preregistration:** Document study plan before data collection
- **Timestamps:** Immutable record of research decisions
- **Templates:** Structured formats for different study types
- **DOI assignment:** Permanent identifiers for citations

### Integration with Other Tools

| **GitHub Integration** | **ORCID Integration** | **Institutional Storage** | **Reference Managers** |
|---|---|---|---|
| Link your OSF project to your GitHub repository for complete reproducibility. | Connect your ORCID profile for automatic publication tracking. | Add institutional storage accounts for additional backup. | Export citations directly to Zotero, Mendeley, and other tools. |

## Best Practices Summary

**For successful OSF + DataPipe deployment:**

- ✅ **Test thoroughly:** Always verify data flow before launching
- ✅ **Document everything:** Use OSF project descriptions and wiki features
- ✅ **Plan for scale:** Consider data volume and analysis requirements
- ✅ **Backup strategy:** Enable CSV fallback and monitor regularly
- ✅ **Team coordination:** Set clear access permissions and roles
- ✅ **Ethical compliance:** Ensure all necessary approvals before data collection

> **Remember:** OSF and DataPipe provide powerful infrastructure for research data management. Take advantage of the built-in features for version control, collaboration, and reproducibility to enhance your study's impact and credibility.