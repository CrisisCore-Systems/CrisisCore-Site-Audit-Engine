# CrisisCore Site Audit Engine

A headless, CLI-driven website audit tool that crawls a target site and produces a proof-backed, client-ready audit packet covering SEO, Accessibility, Flow, Trust, and Performance.

---

## Features

- **BFS site crawler** — follows internal links up to a configurable depth and page limit
- **5-category scoring** — SEO, Accessibility, Flow, Trust, and Performance (25 pts each, 125 pts total)
- **Evidence collection** — desktop & mobile screenshots, Lighthouse JSON, axe-core JSON, HTTP headers, per-page metadata
- **Structured findings** — every issue carries a severity, business impact, recommended fix, and effort estimate
- **Multiple report formats** — `audit.json`, `summary.md`, `summary.html`, `findings.csv`
- **Preset system** — ship with `trust-hardening`, `seo-basic`, `accessibility-basic`, and `protective-computing` presets
- **robots.txt & sitemap.xml detection** — checked during every audit

---

## Requirements

- **Node.js ≥ 20**
- Chromium (installed automatically via Playwright)

---

## Installation

```bash
npm install
npx playwright install chromium
```

---

## Quick Start

```bash
# Development (no build step required)
npm run dev -- run https://example.com

# Production (build first, then run)
npm run build
node dist/cli.js run https://example.com
```

The audit output is written to `./audits/output` by default.

---

## CLI Reference

```
crisiscore-audit run <url> [options]
```

| Option | Default | Description |
|---|---|---|
| `--max-pages <n>` | `25` | Maximum number of pages to crawl |
| `--depth <n>` | `2` | BFS crawl depth |
| `--preset <name>` | `trust-hardening` | Audit preset to apply |
| `--out <dir>` | `./audits/output` | Output directory |
| `--concurrency <n>` | `3` | Parallel collector concurrency per page |
| `--skip-lighthouse` | `false` | Skip Lighthouse audits (faster, no performance data) |

### Examples

```bash
# Full audit with default settings
crisiscore-audit run https://example.com

# SEO-only audit of up to 50 pages
crisiscore-audit run https://example.com --preset seo-basic --max-pages 50

# Fast audit skipping Lighthouse
crisiscore-audit run https://example.com --skip-lighthouse --out ./my-audit

# Deep crawl with lower concurrency
crisiscore-audit run https://example.com --depth 4 --max-pages 100 --concurrency 2
```

---

## Presets

| Preset | Description |
|---|---|
| `trust-hardening` | Full audit — SEO, Accessibility, Flow, Trust, Performance (default) |
| `seo-basic` | SEO-focused — titles, meta, canonical, structured data, OG tags |
| `accessibility-basic` | Accessibility-focused — axe-core WCAG 2.1 AA + Lighthouse |
| `protective-computing` | Security-focused — HTTP headers, HTTPS, CSP, HSTS, trust signals |

---

## Output Files

After a completed audit, the output directory contains:

```
{outDir}/
  audit.json        — Full structured audit result (machine-readable)
  summary.md        — Human-readable Markdown report
  summary.html      — Styled HTML report
  findings.csv      — Findings as CSV for spreadsheet import
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

See [docs/report-schema.md](docs/report-schema.md) for the full structure of `audit.json`.

---

## Scoring

The engine scores sites across **5 categories** (25 points each) for a maximum of **125 points**:

| Category | What it measures |
|---|---|
| **SEO** | Titles, meta descriptions, canonical tags, social meta, structured data, H1s, image alt text |
| **Accessibility** | axe-core WCAG 2.1 AA violations + Lighthouse accessibility score |
| **Flow** | CTAs, navigation links, dead-end pages, above-fold content, lead-capture forms |
| **Trust** | HTTPS, privacy/terms pages, contact method, security headers, social proof, company identity |
| **Performance** | Lighthouse performance score, best-practices score, mobile viewport coverage |

| Score % | Grade | Meaning |
|---|---|---|
| 90–100% | A | Excellent — audit-ready, trust-optimised |
| 75–89% | B | Good — minor issues to address |
| 60–74% | C | Fair — several impactful gaps |
| 45–59% | D | Poor — significant trust and technical debt |
| 0–44% | F | Critical — high risk, immediate action required |

See [docs/scoring-model.md](docs/scoring-model.md) for the full scoring breakdown.

---

## Architecture

```
src/
  cli.ts                  — Commander CLI entry point
  audit/
    crawlSite.ts          — BFS crawler (Playwright + Cheerio)
    runAudit.ts           — Orchestrator: crawl → collect → score → report
    scoreSeo.ts           — SEO scoring (25 pts)
    scoreAccessibility.ts — Accessibility scoring (25 pts)
    scoreFlow.ts          — Flow scoring (25 pts)
    scoreTrust.ts         — Trust scoring (25 pts)
    scorePerformance.ts   — Performance scoring (25 pts)
    scoreSite.ts          — Aggregates all category scores
  collectors/
    collectAxe.ts         — axe-core accessibility scan
    collectHeaders.ts     — HTTP response headers
    collectLighthouse.ts  — Lighthouse audit
    collectScreenshots.ts — Desktop and mobile screenshots
    collectHtml.ts        — Raw HTML capture
    collectLinks.ts       — Link extraction
  presets/
    trust-hardening.ts
    seo-basic.ts
    accessibility-basic.ts
    protective-computing.ts
  report/
    renderMarkdown.ts     — Markdown report renderer
    renderHtml.ts         — HTML report renderer
    renderCsv.ts          — CSV findings exporter
    templates/            — Handlebars templates
  types/
    audit.ts              — AuditConfig, AuditResult, PageData types
    finding.ts            — Finding type
    score.ts              — AuditScore, CategoryScore types
```

---

## License

MIT — © CrisisCore Systems