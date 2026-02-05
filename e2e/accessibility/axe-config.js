// @ts-check
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA compliance tags
 * These cover Level A and Level AA success criteria from WCAG 2.0 and 2.1
 */
export const WCAG_TAGS = [
  'wcag2a',    // WCAG 2.0 Level A
  'wcag2aa',   // WCAG 2.0 Level AA
  'wcag21a',   // WCAG 2.1 Level A
  'wcag21aa',  // WCAG 2.1 Level AA
];

/**
 * Create a configured AxeBuilder instance for WCAG 2.1 AA testing
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {AxeBuilder} Configured AxeBuilder instance
 */
export function makeAxeBuilder(page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS);
}

/**
 * Format accessibility violations into a readable report
 * @param {Array} violations - Array of axe-core violations
 * @returns {string} Formatted report string
 */
export function formatViolationReport(violations) {
  if (violations.length === 0) {
    return 'No accessibility violations found.';
  }

  const lines = [
    `Found ${violations.length} accessibility violation(s):`,
    '',
  ];

  violations.forEach((violation, index) => {
    lines.push(`${index + 1}. [${violation.impact?.toUpperCase() || 'UNKNOWN'}] ${violation.id}`);
    lines.push(`   Description: ${violation.description}`);
    lines.push(`   Help: ${violation.help}`);
    lines.push(`   Help URL: ${violation.helpUrl}`);
    lines.push(`   WCAG: ${violation.tags.filter(t => t.startsWith('wcag')).join(', ')}`);
    lines.push('');
    lines.push('   Affected elements:');

    violation.nodes.forEach((node, nodeIndex) => {
      lines.push(`     ${nodeIndex + 1}. ${node.target.join(' > ')}`);
      if (node.html) {
        // Truncate long HTML
        const html = node.html.length > 100 ? node.html.substring(0, 100) + '...' : node.html;
        lines.push(`        HTML: ${html}`);
      }
      if (node.failureSummary) {
        lines.push(`        Fix: ${node.failureSummary.split('\n')[0]}`);
      }
    });

    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Group violations by impact level
 * @param {Array} violations - Array of axe-core violations
 * @returns {Object} Violations grouped by impact
 */
export function groupViolationsByImpact(violations) {
  const groups = {
    critical: [],
    serious: [],
    moderate: [],
    minor: [],
  };

  violations.forEach(violation => {
    const impact = violation.impact || 'minor';
    if (groups[impact]) {
      groups[impact].push(violation);
    }
  });

  return groups;
}

/**
 * Get a summary of violations by impact level
 * @param {Array} violations - Array of axe-core violations
 * @returns {string} Summary string
 */
export function getViolationSummary(violations) {
  const groups = groupViolationsByImpact(violations);
  const parts = [];

  if (groups.critical.length > 0) parts.push(`${groups.critical.length} critical`);
  if (groups.serious.length > 0) parts.push(`${groups.serious.length} serious`);
  if (groups.moderate.length > 0) parts.push(`${groups.moderate.length} moderate`);
  if (groups.minor.length > 0) parts.push(`${groups.minor.length} minor`);

  if (parts.length === 0) return 'No violations';
  return parts.join(', ');
}
