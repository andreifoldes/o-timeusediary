# O-TUD Documentation

Open-source Electronic Timeline-based Interactive Daily Diary  
A web-based research tool for collecting and visualizing daily activities

## Navigation

- [Responsive Layouts](responsive-layouts.md)
- [GitHub Pages Deployment](deployment.md)
- [OSF Backend Setup](osf-setup.md)
- [Activities Configuration](activities-config.md)
- [URL Parameters](url-parameters.md)
- [Data Structure & Export](data-structure.md)
- [Translation Guide](translation-guide.md)

## Quick Start

O-TUD is a client-side web application designed for time-use research studies. It provides an interactive timeline interface where participants can log their daily activities across multiple dimensions (primary activities, location, social context, device usage, and enjoyment ratings).

### Key Features

- 24-hour interactive timeline with drag-and-drop functionality
- Multi-timeline support (primary/secondary activities, location, social context, etc.)
- Hierarchical activity categories with color coding
- Mobile-responsive design with touch support - [view layouts](responsive-layouts.md)
- Data export to OSF via JSPsych DataPipe or local CSV download
- Configurable activity sets and timeline parameters
- OS-level accessibility support (reduced motion, high contrast, forced colors) configurable per study in `activities.json` - see [Activities Configuration](activities-config.md)
- Demo shortcut: `Ctrl+Alt+A` (Windows/Linux) or `Cmd+Option+A` (macOS) enables all accessibility support when it is disabled in the config

## Architecture Overview

The application is built with vanilla JavaScript (ES6+ modules) and designed for modern browsers. It uses:

- **Frontend:** Pure client-side JavaScript, HTML5, CSS3
- **Data Storage:** OSF via JSPsych DataPipe
- **Deployment:** Static hosting (GitHub Pages, etc.)

## Research Applications

O-TUD is particularly suitable for:

- Time-use studies and activity pattern research
- Daily diary studies in psychology and sociology
- Behavioral pattern analysis
- Experience sampling method (ESM) studies
- Cross-cultural time-use comparisons
- Intervention studies measuring activity changes

## Browser Requirements

Requires modern browser features:

- ES2017+ JavaScript (async/await, modules)
- Modern CSS (Flexbox gap, CSS Grid, clamp())
- Web APIs (IntersectionObserver)
- No Internet Explorer support

---

O-TUD is open-source software designed for research purposes. See individual documentation pages for detailed setup instructions.
