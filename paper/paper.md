---
title: 'O-TUD: A web-based tool for collecting and visualizing daily activities'
tags:
  - time-use survey
  - data collection
  - visualization
  - javascript
authors:
  - name: Thomas Hakman
    orcid: 0009-0009-8292-2482
    affiliation: 1
  - name: Tamás Andrei Földes
    orcid: 0000-0002-0623-9149
    affiliation: 1
  - name: Oriel Sullivan
    orcid: 0000-0000-0000-0000
    affiliation: 2
  - name: Jonathan Gershuny
    orcid: 0000-0000-0000-0000
    affiliation: 2
  - name: Juana Lamote de Grignon Perez
    orcid: 0000-0000-0000-0000
    affiliation: 2
  - name: Elena Mylona
    orcid: 0000-0000-0000-0000
    affiliation: 2
affiliations:
 - name: University of Oxford
   index: 1
 - name: Centre for Time Use Research (CTUR), Social Research Institute, University College London
   index: 2
date: 8 July 2025
bibliography: paper.bib
---

# Summary

O-TUD (Online Ecological Longitudinal Information on Daily-living Diary) is an open-source, web-based tool for collecting time-use data through an interactive timeline interface. The software enables researchers to conduct digital diary studies by allowing participants to drag and drop activities onto a visual 24-hour timeline, providing an intuitive alternative to traditional paper diaries or survey-style questionnaires.

The tool's core functionality centers on a visual timeline where participants can easily add, resize, and reposition activity blocks representing their daily schedule. The interface is responsive and works on both desktop and mobile devices, enabling real-time data collection as activities occur. Researchers can fully customize activity lists, categories, and study parameters through configuration files, making the tool adaptable to various research contexts.

O-TUD supports multiple concurrent data streams (primary activities, locations, social context, device usage) with independent timing, enabling sophisticated analyses such as comprehensive childcare measurement, digital device usage patterns, and behavioral risk assessment. The software automatically validates data completeness and exports structured datasets in standard formats (CSV, JSON) for analysis.

The tool integrates with GitHub Pages for free hosting and the Open Science Framework (OSF) for secure data storage, requiring no technical infrastructure from researchers. This combination provides a complete, zero-cost research platform that democratizes access to sophisticated time-use data collection methods while maintaining the methodological rigor of established diary designs.

# Statement of Need

Time-use research provides essential data for understanding economic activity, social inequalities, well-being, public health, and environmental sustainability [@stiglitz2009report; @sullivan2021pnas; @cornwell2019social]. Current policy applications include quantifying unpaid care work for gender equality initiatives (UN SDG 5.4), measuring subjective well-being [@kahneman2004day], and assessing behavioral health risks during pandemics [@sullivan2021pnas].

While digital data collection has become standard across social sciences, many online diary tools have compromised methodological quality to reduce perceived complexity. Survey-style approaches, which present repetitive questions for each activity, have been shown to increase respondent burden and reduce data quality [@tebraak2022methods; @chatzitheochari2018using]. These tools often abandon key principles from decades of time-use research, such as independent timing of multiple data fields, limiting their analytical potential.

Existing solutions are typically proprietary, expensive, or lack the specific features required for rigorous time-use research. Open-source alternatives often require complex installation procedures or lack the visual interface that aids participant recall and engagement. This creates barriers for researchers, particularly those in lower-resourced institutions or developing countries where time-use research is increasingly important.

O-TUD addresses these limitations by implementing established time-use research principles [@eurostat2020hetus] in a modern, accessible web platform. The software's visual approach reduces cognitive burden compared to survey-style tools [@chatzitheochari2018using], while its multiple independent data fields enable sophisticated analyses impossible with simplified designs. By providing free hosting and data storage through established platforms (GitHub Pages, OSF), the tool removes technical and financial barriers to conducting high-quality time-use research, supporting the growing international emphasis on this type of data collection across multiple continents and research contexts.

# Acknowledgements

We acknowledge the Centre for Time Use Research (CTUR) at University College London for their foundational work on time-use research methodology. We thank the JSPsych and Open Science Framework teams for providing the infrastructure that enables O-TUD's data collection capabilities, and the open-source community for their contributions to the underlying technologies.

# References 