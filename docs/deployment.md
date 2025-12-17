# GitHub Pages Deployment

Complete guide to deploying O-TUD on GitHub Pages

[← Back to Documentation Home](index.md)

## Overview

GitHub Pages provides free static website hosting, making it ideal for deploying O-TUD studies. This guide covers forking the repository, configuring your study, and setting up automatic deployment.

### Benefits of GitHub Pages

- Free hosting for public repositories
- Automatic deployment from Git repository
- Custom domain support
- HTTPS enabled by default
- Version control for your study configuration

## Prerequisites

Before you begin, ensure you have:

- A GitHub account (free at github.com)
- Basic familiarity with Git and GitHub
- A JSPsych DataPipe account and experiment ID (see OSF Setup guide)
- Your study activities configured (see Activities Configuration guide)

## Step-by-Step Deployment

### 1. Fork the Repository

Create your own copy of the O-TUD repository:

1. Visit the original O-TUD repository on GitHub
2. Click the **"Fork"** button in the top-right corner
3. Choose your GitHub account as the destination
4. Optionally rename the repository (e.g., "my-timeuse-study")

> **Repository Visibility:** GitHub Pages is free for public repositories. For private repositories, you need a paid GitHub account.

### 2. Clone Your Fork Locally

Download your fork to make configuration changes:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 3. Configure Your Study

Customize the application for your research study:

#### A. Update activities.json

Edit `settings/activities.json` with your study configuration:

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
  "timeline": {
    // Your timeline configuration
  }
}
```

#### B. Customize Thank You Page

Edit `pages/thank-you.html` to match your study completion message.

#### C. Update Instructions (Optional)

Modify `pages/instructions.html` and `pages/instructions.js` to customize participant instructions.

### 4. Test Locally

Before deploying, test your configuration locally:

```bash
# Install dependencies (if needed)
npm install

# Start local development server
npm start

# Open browser to http://localhost:8080
```

Verify that:
- Activities load correctly
- Timeline interactions work properly
- Instructions display as expected
- Data export functions (test in browser console)

### 5. Commit and Push Changes

Save your configuration to GitHub:

```bash
git add .
git commit -m "Configure study settings and activities"
git push origin main
```

### 6. Enable GitHub Pages

Configure GitHub to serve your repository as a website:

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **"Deploy from a branch"**
5. Select **main** branch and **/ (root)** folder
6. Click **Save**

> **Optional:** To display your GitHub Pages link prominently on your repository homepage:
> 1. Go to your repository's main page
> 2. Click the settings icon (⚙️) next to **About**
> 3. Check **"Use your GitHub Pages website"**
> 4. Click **Save changes**
>
> This will show your live Time Use Diary URL in the repository's About section for easy access.

### 7. Access Your Study

GitHub will provide a URL for your deployed study:

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

This process may take a few minutes. Check the Pages section in your repository settings for the exact URL and deployment status.

## Custom Domain Setup (Optional)

You can use a custom domain instead of the default github.io URL:

### Requirements

- A domain name you own
- Access to your domain's DNS settings

### Configuration Steps

1. In your repository's Pages settings, add your custom domain
2. Create a `CNAME` file in your repository root with your domain name
3. Configure your domain's DNS to point to GitHub Pages
4. Enable "Enforce HTTPS" once DNS propagation is complete

> **DNS Configuration:** Add these DNS records at your domain provider:
> - A record pointing to 185.199.108.153
> - A record pointing to 185.199.109.153
> - A record pointing to 185.199.110.153
> - A record pointing to 185.199.111.153

## Automatic Deployment Workflow

GitHub Pages automatically rebuilds your site when you push changes to the main branch. However, you can create a custom GitHub Actions workflow for more control:

### Create .github/workflows/deploy.yml

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Run tests (if available)
      run: npm test --if-present
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

## URL Parameters for Participant Links

Once deployed, you can create participant-specific links by adding URL parameters:

### Basic Participant Link

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/?pid=P001&STUDY_ID=MyStudy&DIARY_WAVE=1
```

### Prolific Integration

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
```

See the [URL Parameters guide](url-parameters.md) for complete details on parameter configuration.

## Managing Study Updates

### Making Changes

1. Edit files locally or directly on GitHub
2. Test changes locally if significant
3. Commit and push to main branch
4. GitHub Pages automatically deploys updates

### Version Control Best Practices

- **Branch for major changes:** Create feature branches for significant modifications
- **Tag releases:** Use Git tags to mark stable study versions
- **Document changes:** Update commit messages with clear descriptions
- **Backup configurations:** Keep copies of activities.json for different study phases

```bash
# Create a new branch for changes
git checkout -b study-modifications

# Make your changes, then:
git add .
git commit -m "Update activities for phase 2"
git push origin study-modifications

# Create pull request on GitHub to review changes
# Merge to main when ready to deploy
```

## Monitoring and Analytics

### GitHub Insights

Monitor your study deployment through GitHub's built-in analytics:

- **Traffic:** View visitor statistics in repository Insights
- **Actions:** Monitor deployment status in Actions tab
- **Issues:** Track technical problems reported by participants

### Additional Monitoring (Optional)

For more detailed analytics, consider integrating:

- Google Analytics for detailed visitor tracking
- Hotjar or similar tools for user behavior analysis
- Uptime monitoring services to ensure site availability

## Troubleshooting Common Issues

### Site Not Loading

**Common Solutions:**
- Check that GitHub Pages is enabled in repository settings
- Verify the correct branch (main) is selected
- Wait up to 10 minutes for initial deployment
- Check for any error messages in the Actions tab

### Activities Not Loading

- Validate activities.json syntax using a JSON validator
- Check browser console for JavaScript errors
- Verify file paths are correct (case-sensitive on GitHub Pages)

### DataPipe Export Failing

- Confirm experimentID is correct in activities.json
- Test with fallbackToCSV enabled to isolate the issue
- Check OSF DataPipe dashboard for error messages

### HTTPS Issues

**GitHub Pages automatically provides HTTPS.** If you encounter mixed content warnings:
- Ensure all external resources use HTTPS URLs
- Update any hardcoded HTTP links to HTTPS
- Check that DataPipe endpoint uses HTTPS (it does by default)

## Security and Privacy Considerations

### Data Protection

- **No sensitive data in repository:** Never commit participant data or API keys
- **Use environment variables:** For any sensitive configuration (though O-TUD uses public DataPipe IDs)
- **Review commit history:** Ensure no accidentally committed sensitive information

### Participant Privacy

- **HTTPS encryption:** All data transmission is encrypted
- **No server-side storage:** Data goes directly to OSF via DataPipe
- **Minimal logging:** GitHub Pages has minimal access logging

## Performance Optimization

### Loading Speed

- **Minimize file sizes:** Compress images and remove unused assets
- **Optimize activities.json:** Remove unnecessary fields for large activity sets
- **Use CDN resources:** Link to external libraries via CDN when possible

### Mobile Optimization

O-TUD is mobile-responsive by default, but consider:

- Testing on various device sizes
- Optimizing activity names for small screens
- Verifying touch interactions work smoothly

## Deployment Checklist

Before launching your study:

- [ ] Test complete diary workflow on your deployed site
- [ ] Verify data export to OSF DataPipe
- [ ] Check participant links with URL parameters
- [ ] Test on mobile devices
- [ ] Validate instructions and thank you pages
- [ ] Confirm redirect URLs work correctly
- [ ] Test with different browsers
- [ ] Review activities.json for accuracy
- [ ] Set up monitoring/analytics if desired
- [ ] Document your deployment for future reference