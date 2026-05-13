# CrisisCore Site Audit Engine — Scoring Model

The audit engine scores sites across **5 equal categories** (25 points each), for a maximum of **125 points**.

---

## 1. SEO (25 points)

Each check uses tiered (Tree of Thought) scoring rather than a binary pass/fail — see the Logic column for the tier thresholds.

| Check | Points | Logic |
|---|---|---|
| Title quality | 3 | Avg per page: 30–60 chars → 3 pts; 10–29 or 61–70 chars → 2 pts; 1–9 chars → 1 pt; absent or >70 chars → 0 pts |
| Meta description quality | 3 | Avg per page: 120–160 chars → 3 pts; 50–119 or 161–200 chars → 2 pts; 1–49 chars → 1 pt; absent → 0 pts |
| Canonical tag | 2 | Proportional: pages with canonical / total pages × 2 |
| OG / Social meta tags | 2 | Both OG and Twitter Card on ≥50% of pages → 2 pts; either one → 1 pt; neither → 0 pts |
| Indexability | 3 | 3 if no noindex pages; deduct 1 per noindex page |
| Sitemap.xml | 2 | 2 if sitemap found at /sitemap.xml, else 0 |
| Structured data (JSON-LD) | 2 | 2 if any page has JSON-LD schema, else 0 |
| H1 structure | 3 | Avg per page: exactly 1 H1 → 3 pts; multiple H1s → 1 pt; no H1 → 0 pts |
| Image alt text coverage | 2 | ≥90% of images have alt text → 2 pts; ≥60% → 1 pt; <60% → 0 pts |
| Unique titles | 3 | 3 if all titles unique; proportional otherwise |

### SEO Findings Generated
- **seo-title**: Titles missing, too short (<10 chars), or too long (>70 chars)
- **seo-meta-description**: Meta descriptions missing, too short, or too long
- **seo-canonical**: Missing canonical tags on some pages
- **seo-social-meta**: Open Graph or Twitter Card meta tags incomplete
- **seo-noindex**: Pages blocked from indexing (critical)
- **seo-sitemap**: No sitemap.xml found
- **seo-structured-data**: No JSON-LD detected
- **seo-h1**: Missing or multiple H1 tags
- **seo-image-alt**: Images missing alt text
- **seo-duplicate-titles**: Duplicate titles across pages

---

## 2. Accessibility (25 points)

Starts at 25, deducts for violations, then adds a Lighthouse bonus.

| Check | Points | Logic |
|---|---|---|
| axe-core critical violations | up to −15 | Deduct 3 per critical violation across all pages; capped at −15 total |
| axe-core serious violations | up to −5 | Deduct 2 per serious violation across all pages; capped at −5 total |
| Lighthouse accessibility score | +0 to +5 | `avgLighthouseA11y / 100 × 5` bonus (can restore lost points); total capped at 25 |

### Accessibility Findings Generated
- **a11y-critical-violations**: Critical axe violations found
- **a11y-serious-violations**: Serious axe violations found

---

## 3. Flow (25 points)

| Check | Points | Logic |
|---|---|---|
| CTA coverage | 5 | CTAs on ≥75% of pages → 5 pts; 40–74% → 3 pts; 1–39% → 1 pt; none → 0 pts |
| Key nav links (privacy/contact/about) | 5 | All 3 present → 5 pts; 2 present → 3 pts; 1 present → 1 pt; none → 0 pts |
| No dead-end pages | 5 | 5 if zero dead-ends; deduct 2 per dead-end page |
| Navigation structure | 3 | ≥70% pages have ≥3 links → 3 pts; ≥40% → 2 pts; any → 1 pt; none → 0 pts |
| Meaningful above-fold content | 5 | Proportional: pages with title + H1 + meta / total × 5 |
| Form / lead-capture presence | 2 | 2 if any page contains a `<form>` element; 0 if none |

### Flow Findings Generated
- **flow-no-cta**: No CTA detected on any page (critical), or CTA coverage too low (high)
- **flow-nav-links**: Missing privacy/contact/about links
- **flow-dead-ends**: Pages with zero outgoing internal links
- **flow-thin-content**: Pages lacking title, H1, or meta description
- **flow-no-forms**: No forms detected — site lacks a direct lead-capture mechanism

---

## 4. Trust (25 points)

| Check | Points | Logic |
|---|---|---|
| Privacy policy page | 3 | Link + crawled page title match → 3 pts; link only → 2 pts; keyword mention → 1 pt; none → 0 pts |
| Terms of service page | 2 | 2 if any link matches /terms, /legal, /tos, terms-of-service, terms-of-use |
| Contact method visible | 3 | Contact page link + crawled page → 3 pts; link OR CTA keyword → 2 pts; none → 0 pts |
| HTTPS | 3 | 3 if base URL starts with https://, else 0 |
| Content-Security-Policy header | 3 | 3 if CSP header present on any crawled page |
| HSTS header | 2 | 2 if Strict-Transport-Security header present |
| X-Frame-Options / frame-ancestors | 2 | 2 if X-Frame-Options OR frame-ancestors in CSP |
| Referrer-Policy header | 1 | 1 if Referrer-Policy header present |
| X-Content-Type-Options header | 1 | 1 if X-Content-Type-Options: nosniff present |
| Social proof | 3 | Dedicated proof page + proof keywords in content → 3 pts; keywords in titles/CTAs/links → 2 pts; none → 0 pts |
| Company identity (about/team) | 2 | About/team link + crawled page title match → 2 pts; link only → 1 pt; none → 0 pts |

### Trust Findings Generated
- **trust-no-privacy**: No privacy policy page found (critical)
- **trust-weak-privacy**: Privacy link found but the target page lacks a clear title
- **trust-no-terms**: No terms of service page
- **trust-no-contact**: No contact method visible
- **trust-no-https**: Site not on HTTPS (critical)
- **trust-no-csp**: Missing Content-Security-Policy
- **trust-no-hsts**: Missing HSTS header
- **trust-no-frame-options**: Missing clickjacking protection
- **trust-no-referrer-policy**: Missing Referrer-Policy
- **trust-no-xcto**: Missing X-Content-Type-Options: nosniff
- **trust-no-proof**: No social proof detected
- **trust-no-identity**: No about/team page

---

## 5. Performance (25 points)

Scored using tiered Lighthouse data (Tree of Thought). Tiers apply to both Lighthouse performance and best-practices scores:

| Average score | Points awarded |
|---|---|
| ≥90 | Full marks |
| 75–89 | ~75% of max |
| 50–74 | ~42% of max |
| <50 | ~15% of max |

| Check | Points | Logic |
|---|---|---|
| Lighthouse performance score | 12 | Tiered (see table above); 0 pts if no Lighthouse data |
| Lighthouse best-practices score | 8 | Tiered (see table above); 0 pts if no Lighthouse data |
| Mobile viewport meta coverage | 5 | 100% of pages have viewport meta → 5 pts; ≥75% → 3 pts; ≥50% → 2 pts; <50% → 0 pts |

### Performance Findings Generated
- **perf-lighthouse-score**: Lighthouse performance score below acceptable threshold (critical if avg <50%, else high)
- **perf-best-practices**: Lighthouse best-practices score indicates technical debt
- **perf-viewport-meta**: Pages missing viewport meta tag — not mobile-optimised (critical if <50% of pages, else high)

> **Note:** Performance findings are only generated when Lighthouse data is available. Use `--skip-lighthouse` to omit Lighthouse collection (performance score will be 0).

---

## Score Interpretation

Grades are based on the percentage of total possible points (125).

| Percentage | Grade | Meaning |
|---|---|---|
| 90–100% | A | Excellent — audit-ready, trust-optimised |
| 75–89% | B | Good — minor issues to address |
| 60–74% | C | Fair — several impactful gaps |
| 45–59% | D | Poor — significant trust and technical debt |
| 0–44% | F | Critical — high risk, immediate action required |

---

## Finding Severity Definitions

| Severity | Definition |
|---|---|
| **critical** | Blocks users, search engines, or creates legal/security risk |
| **high** | Significantly impacts conversions, trust, or ranking |
| **medium** | Noticeable issue but not immediately harmful |
| **low** | Minor improvement opportunity |

## Effort Estimates

| Code | Meaning |
|---|---|
| `15m` | Quick config or meta tag change |
| `1h` | Content writing or simple code change |
| `half-day` | Design/development work required |
| `multi-day` | Substantial content or feature creation |
