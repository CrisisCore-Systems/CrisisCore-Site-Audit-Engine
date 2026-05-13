import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

export function scoreAccessibility(pages: PageData[], findings: Finding[]): CategoryScore {
  let score = 25;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  // Critical violations: -3 each, max -15 deduction
  let criticalDeduction = 0;
  const criticalPages: string[] = [];
  for (const page of pages) {
    const criticals = page.axeViolations.filter(v => v.impact === "critical");
    for (const v of criticals) {
      criticalDeduction += 3;
      criticalPages.push(`${page.url}: ${v.id}`);
    }
  }
  criticalDeduction = Math.min(criticalDeduction, 15);
  breakdown["axeCritical"] = {
    score: Math.max(0, 15 - criticalDeduction),
    max: 15,
    note: `${criticalDeduction}pts deducted`,
  };
  score -= criticalDeduction;
  if (criticalDeduction > 0) {
    findings.push({
      id: "a11y-critical-violations",
      category: "accessibility",
      severity: "critical",
      page: "site-wide",
      title: "Critical accessibility violations found (axe-core)",
      evidence: criticalPages.slice(0, 5),
      whyItMatters: "Critical accessibility violations prevent disabled users from using your site, violating WCAG 2.1 AA.",
      recommendedFix: "Fix all critical violations. Common fixes: add alt text, fix color contrast, add ARIA labels.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // Serious violations: -2 each, max -5 deduction
  let seriousDeduction = 0;
  const seriousItems: string[] = [];
  for (const page of pages) {
    const serious = page.axeViolations.filter(v => v.impact === "serious");
    for (const v of serious) {
      seriousDeduction += 2;
      seriousItems.push(`${page.url}: ${v.id}`);
    }
  }
  seriousDeduction = Math.min(seriousDeduction, 5);
  breakdown["axeSerious"] = {
    score: Math.max(0, 5 - seriousDeduction),
    max: 5,
    note: `${seriousDeduction}pts deducted`,
  };
  score -= seriousDeduction;
  if (seriousDeduction > 0) {
    findings.push({
      id: "a11y-serious-violations",
      category: "accessibility",
      severity: "high",
      page: "site-wide",
      title: "Serious accessibility violations found (axe-core)",
      evidence: seriousItems.slice(0, 5),
      whyItMatters: "Serious violations significantly impair the experience for users with disabilities.",
      recommendedFix: "Address serious violations prioritizing screen reader and keyboard navigation issues.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // Lighthouse accessibility bonus: up to 5 pts
  const lhScores = pages.map(p => p.lighthouseScores?.accessibility ?? 0).filter(s => s > 0);
  const avgLhA11y = lhScores.length > 0 ? lhScores.reduce((a, b) => a + b, 0) / lhScores.length : 50;
  const lhBonus = Math.round((avgLhA11y / 100) * 5);
  breakdown["lighthouseA11y"] = { score: lhBonus, max: 5, note: `avg ${Math.round(avgLhA11y)}%` };
  score = Math.min(25, score + lhBonus);

  score = Math.max(0, Math.min(score, maxScore));
  return {
    label: "Accessibility",
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    breakdown,
  };
}
