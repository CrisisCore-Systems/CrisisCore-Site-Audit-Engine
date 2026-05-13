# CrisisCore Site Audit Engine — Report Schema

The `audit.json` output file contains the full structured audit result. This document describes every field.

---

## Root Object: `AuditResult`

```typescript
interface AuditResult {
  config: AuditConfig;        // Audit configuration used
  timestamp: string;          // ISO 8601 timestamp of audit start
  baseUrl: string;            // The target URL that was audited
  pages: PageData[];          // All crawled pages with collected data
  findings: Finding[];        // All findings across all categories
  score: AuditScore;          // Aggregate and per-category scores
  hasSitemap: boolean;        // Whether sitemap.xml was found
  robotsTxt: string | null;   // Raw content of robots.txt, or null if not found
}
```

---

## `AuditConfig`

```typescript
interface AuditConfig {
  url: string;             // Target URL
  maxPages: number;        // Max pages crawled
  depth: number;           // BFS crawl depth
  preset: string;          // Preset name used (e.g., "trust-hardening")
  outDir: string;          // Absolute path to output directory
  concurrency: number;     // Parallel collector concurrency per page
  skipLighthouse: boolean; // Whether Lighthouse audits were skipped
}
```

---

## `PageData`

```typescript
interface PageData {
  url: string;                        // Normalized page URL
  slug: string;                       // URL-derived slug used for evidence filenames
  title: string;                      // <title> tag content
  metaDescription: string;            // <meta name="description"> content
  h1: string[];                       // All <h1> text content on the page
  canonical: string | null;           // <link rel="canonical"> href
  robotsMeta: string | null;          // <meta name="robots"> content
  statusCode: number;                 // HTTP response status code
  internalLinks: string[];            // All same-domain links found on page
  screenshotDesktop: string | null;   // Path to desktop screenshot PNG
  screenshotMobile: string | null;    // Path to mobile screenshot PNG
  lighthousePath: string | null;      // Path to Lighthouse JSON report
  axePath: string | null;             // Path to axe-core JSON report
  headersPath: string | null;         // Path to HTTP headers JSON
  pagePath: string | null;            // Path to page metadata JSON
  hasStructuredData: boolean;         // Whether JSON-LD was detected
  hasNoIndex: boolean;                // Whether noindex directive was found
  ctas: string[];                     // CTA button/link text found (max 10)
  axeViolations: AxeViolation[];      // Summarized axe-core violations
  lighthouseScores: LighthouseScores | null;  // Lighthouse category scores
  headers: Record<string, string>;    // HTTP response headers (lowercase keys)
  // Extended signals collected during crawl
  loadTimeMs: number | null;          // Page load time in milliseconds
  imageCount: number;                 // Total number of <img> elements
  imagesWithAlt: number;              // Number of <img> elements with non-empty alt text
  hasOpenGraph: boolean;              // Whether og: meta tags were detected
  hasTwitterCard: boolean;            // Whether twitter: meta tags were detected
  formCount: number;                  // Number of <form> elements on the page
  hasCookieBanner: boolean;           // Whether a cookie consent banner was detected
  viewportMeta: string | null;        // <meta name="viewport"> content, or null if absent
  redirectCount: number;              // Number of redirects followed to reach the page
}
```

---

## `AxeViolation`

```typescript
interface AxeViolation {
  id: string;           // axe-core rule ID (e.g., "color-contrast")
  impact: string | null; // "critical" | "serious" | "moderate" | "minor" | null
  description: string;  // Human-readable rule description
  nodes: number;        // Number of elements in violation
}
```

---

## `LighthouseScores`

```typescript
interface LighthouseScores {
  performance: number;    // 0–100
  accessibility: number;  // 0–100
  bestPractices: number;  // 0–100
  seo: number;            // 0–100
}
```

---

## `AuditScore`

```typescript
interface AuditScore {
  overall: number;               // Sum of all category scores
  maxOverall: number;            // Sum of all category maxScores (125)
  seo: CategoryScore;
  accessibility: CategoryScore;
  flow: CategoryScore;
  trust: CategoryScore;
  performance: CategoryScore;
}
```

---

## `CategoryScore`

```typescript
interface CategoryScore {
  label: string;    // Display name (e.g., "SEO")
  score: number;    // Earned points
  maxScore: number; // Maximum possible (25)
  percentage: number; // Math.round((score / maxScore) * 100)
  breakdown: Record<string, {
    score: number;  // Points earned for this check
    max: number;    // Maximum points for this check
    note?: string;  // Optional explanatory note
  }>;
}
```

---

## `Finding`

```typescript
interface Finding {
  id: string;                  // Unique ID, format: "{category}-{check}"
  category: "seo" | "accessibility" | "flow" | "trust" | "performance";
  severity: "critical" | "high" | "medium" | "low";
  page: string;                // Affected URL or "site-wide"
  title: string;               // Short description of the issue
  evidence: string[];          // URLs or data points supporting the finding
  whyItMatters: string;        // Business/technical impact explanation
  recommendedFix: string;      // Actionable remediation steps
  estimatedEffort: "15m" | "1h" | "half-day" | "multi-day";
  clientVisible: boolean;      // Whether to surface in client-facing report
}
```

---

## Evidence Directory Structure

```
{outDir}/
  audit.json           — Full structured audit result
  summary.md           — Markdown report
  summary.html         — Styled HTML report
  findings.csv         — Findings as CSV for import
  evidence/
    screenshots/
      desktop-{slug}.png
      mobile-{slug}.png
    lighthouse/
      lighthouse-{slug}.json
    axe/
      axe-{slug}.json
    headers/
      headers-{slug}.json
    pages/
      page-{slug}.json
```

---

## Slug Generation

Slugs are derived from the page URL path:
- Homepage → `index`
- `/about` → `about`
- `/blog/post-title` → `blog--post-title`
- Truncated to 80 characters
- Duplicate slugs get a numeric suffix: `about-1`, `about-2`
