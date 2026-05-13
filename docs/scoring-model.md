# CrisisCore Site Audit Engine — Scoring Model

The audit engine scores sites across **4 equal categories** (25 points each), for a maximum of **100 points**.

---

## 1. SEO (25 points)

| Check | Points | Logic |
|---|---|---|
| Title present & optimal length | 3 | Proportional: pages with title 10–70 chars / total pages × 3 |
| Meta description present | 3 | Proportional: pages with meta desc >50 chars / total pages × 3 |
| Canonical tag | 2 | Proportional: pages with canonical / total pages × 2 |
| Robots meta (no noindex) | 2 | Proportional: pages without noindex / total pages × 2 |
| Indexability | 3 | Full 3 if no noindex pages; deduct 1 per noindex page |
| Sitemap.xml | 2 | 2 if sitemap found at /sitemap.xml, else 0 |
| Structured data (JSON-LD) | 2 | 2 if any page has JSON-LD schema, else 0 |
| H1 present and unique | 3 | Proportional: pages with exactly 1 H1 / total pages × 3 |
| Internal links | 2 | Proportional: pages with >0 internal links / total pages × 2 |
| Unique titles | 3 | 3 if all titles unique; proportional otherwise |

### SEO Findings Generated
- **seo-title**: Missing or out-of-range titles
- **seo-meta-description**: Missing or too-short meta descriptions
- **seo-canonical**: Missing canonical tags
- **seo-noindex**: Pages blocked from indexing (critical)
- **seo-sitemap**: No sitemap.xml found
- **seo-structured-data**: No JSON-LD detected
- **seo-h1**: Missing or multiple H1 tags
- **seo-duplicate-titles**: Duplicate titles across pages

---

## 2. Accessibility (25 points)

Starts at 25, deducts for violations, then adds Lighthouse bonus.

| Check | Points | Logic |
|---|---|---|
| axe-core critical violations | -3 each | Deduct 3 per critical violation across all pages; capped at -15 total |
| axe-core serious violations | -2 each | Deduct 2 per serious violation across all pages; capped at -5 total |
| Lighthouse accessibility score | +0 to +5 | `avgLighthouseA11y / 100 × 5` bonus; capped so total ≤ 25 |

### Accessibility Findings Generated
- **a11y-critical-violations**: Critical axe violations found
- **a11y-serious-violations**: Serious axe violations found

---

## 3. Flow (25 points)

| Check | Points | Logic |
|---|---|---|
| Primary CTA detectable | 5 | 5 if any page has CTA keywords; 0 if none |
| Key nav links (privacy/contact/about) | 5 | 5 if ≥2 present; 2 if 1 present; 0 if none |
| No dead-end pages | 5 | 5 if zero dead-ends; deduct 2 per dead-end page |
| Navigation structure | 5 | 5 if ≥70% pages have ≥3 links; 3 if ≥40%; 2 if any; 0 if none |
| Meaningful above-fold content | 5 | Proportional: pages with title+H1+meta / total × 5 |

### Flow Findings Generated
- **flow-no-cta**: No CTA detected on any page (critical)
- **flow-nav-links**: Missing privacy/contact/about links
- **flow-dead-ends**: Pages with zero outgoing links
- **flow-thin-content**: Pages lacking title, H1, or meta description

---

## 4. Trust (25 points)

| Check | Points | Logic |
|---|---|---|
| Privacy policy page | 3 | 3 if any internal link matches /privacy or privacy-policy |
| Terms of service page | 2 | 2 if any link matches /terms, /legal, /tos, terms-of-service |
| Contact method visible | 3 | 3 if /contact in links OR CTA contains contact/email/phone |
| HTTPS | 3 | 3 if base URL starts with https:// |
| Content-Security-Policy header | 3 | 3 if CSP header present on any crawled page |
| HSTS header | 2 | 2 if Strict-Transport-Security header present |
| X-Frame-Options / frame-ancestors | 2 | 2 if X-Frame-Options OR frame-ancestors in CSP |
| Referrer-Policy header | 2 | 2 if Referrer-Policy header present |
| Social proof | 3 | 3 if testimonial/review/case-study keywords in titles/links/CTAs |
| Company identity (about/team) | 2 | 2 if /about or /team or /company in internal links |

### Trust Findings Generated
- **trust-no-privacy**: No privacy policy (critical)
- **trust-no-terms**: No terms of service
- **trust-no-contact**: No contact method visible
- **trust-no-https**: Site not on HTTPS (critical)
- **trust-no-csp**: Missing Content-Security-Policy
- **trust-no-hsts**: Missing HSTS header
- **trust-no-frame-options**: Missing clickjacking protection
- **trust-no-referrer-policy**: Missing Referrer-Policy
- **trust-no-proof**: No social proof detected
- **trust-no-identity**: No about/team page

---

## Score Interpretation

| Range | Grade | Meaning |
|---|---|---|
| 90–100 | A | Excellent — audit-ready, trust-optimized |
| 75–89 | B | Good — minor issues to address |
| 60–74 | C | Fair — several impactful gaps |
| 45–59 | D | Poor — significant trust and technical debt |
| 0–44 | F | Critical — high risk, immediate action required |

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
