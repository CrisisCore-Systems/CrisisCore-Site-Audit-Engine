import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

/**
 * Tree of Thought scoring for SEO (25 pts).
 *
 * Each check explores multiple quality branches rather than a binary pass/fail:
 *   Branch A — optimal state (full points)
 *   Branch B — acceptable state (partial points)
 *   Branch C — degraded state (minimal points)
 *   Branch D — absent/broken (0 points)
 *
 * New checks in this version:
 *   • OG / Social meta tags (replaces robots-meta check)
 *   • Image alt text coverage (replaces internal-links check)
 */

export function scoreSeo(pages: PageData[], hasSitemap: boolean, findings: Finding[]): CategoryScore {
  let score = 0;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  // ── 1. Title quality — tiered (3 pts) ────────────────────────────────────
  // Branch A: 30–60 chars → 3 pts (optimal for display + SEO)
  // Branch B: 10–29 or 61–70 chars → 2 pts (acceptable)
  // Branch C: 1–9 chars → 1 pt (exists but poor)
  // Branch D: absent or >70 chars → 0 pts
  const titleBuckets = pages.map((p) => {
    const l = p.title?.length ?? 0;
    if (l >= 30 && l <= 60) return 3;
    if ((l >= 10 && l < 30) || (l > 60 && l <= 70)) return 2;
    if (l > 0 && l < 10) return 1;
    return 0;
  });
  const titleScore =
    pages.length > 0
      ? Math.round((titleBuckets as number[]).reduce((a, b) => a + b, 0) / pages.length)
      : 0;
  breakdown["title"] = { score: titleScore, max: 3 };
  score += titleScore;
  if (titleScore < 3) {
    const bad = pages.filter((p) => {
      const l = p.title?.length ?? 0;
      return l < 10 || l > 70;
    });
    findings.push({
      id: "seo-title",
      category: "seo",
      severity: titleScore === 0 ? "critical" : "high",
      page: "site-wide",
      title: "Page titles missing, too short, or too long",
      evidence: bad.slice(0, 3).map((p) => `${p.url} (title: "${p.title?.slice(0, 50) ?? "(none)"}", ${p.title?.length ?? 0} chars)`),
      whyItMatters:
        "Title tags are the #1 on-page SEO signal. Titles between 30–60 characters maximise SERP display and click-through rates.",
      recommendedFix: "Write unique, descriptive titles between 30–60 characters for every page.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 2. Meta description quality — tiered (3 pts) ─────────────────────────
  // Branch A: 120–160 chars → 3 pts (ideal snippet length)
  // Branch B: 50–119 or 161–200 chars → 2 pts (acceptable)
  // Branch C: 1–49 chars → 1 pt (too short)
  // Branch D: absent → 0 pts
  const metaBuckets = pages.map((p) => {
    const l = p.metaDescription?.length ?? 0;
    if (l >= 120 && l <= 160) return 3;
    if ((l >= 50 && l < 120) || (l > 160 && l <= 200)) return 2;
    if (l > 0 && l < 50) return 1;
    return 0;
  });
  const metaScore =
    pages.length > 0
      ? Math.round((metaBuckets as number[]).reduce((a, b) => a + b, 0) / pages.length)
      : 0;
  breakdown["metaDescription"] = { score: metaScore, max: 3 };
  score += metaScore;
  if (metaScore < 3) {
    const bad = pages.filter((p) => !p.metaDescription || p.metaDescription.length < 120 || p.metaDescription.length > 160);
    findings.push({
      id: "seo-meta-description",
      category: "seo",
      severity: metaScore === 0 ? "high" : "medium",
      page: "site-wide",
      title: "Meta descriptions missing, too short, or too long",
      evidence: bad.slice(0, 3).map((p) => `${p.url} (${p.metaDescription?.length ?? 0} chars)`),
      whyItMatters:
        "Meta descriptions are the search-result snippet. Optimal length (120–160 chars) improves click-through rates by up to 30 %.",
      recommendedFix: "Write unique meta descriptions of 120–160 characters for each page.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 3. Canonical tags (2 pts) ─────────────────────────────────────────────
  const pagesWithCanonical = pages.filter((p) => p.canonical);
  const canonicalScore = pages.length > 0 ? Math.round((pagesWithCanonical.length / pages.length) * 2) : 0;
  breakdown["canonical"] = { score: canonicalScore, max: 2 };
  score += canonicalScore;
  if (canonicalScore < 2) {
    findings.push({
      id: "seo-canonical",
      category: "seo",
      severity: "medium",
      page: "site-wide",
      title: "Canonical tags missing on some pages",
      evidence: pages.filter((p) => !p.canonical).slice(0, 3).map((p) => p.url),
      whyItMatters: "Canonical tags prevent duplicate-content penalties and consolidate link equity to the preferred URL.",
      recommendedFix: "Add <link rel='canonical' href='...'> to all pages, self-referencing their canonical URL.",
      estimatedEffort: "1h",
      clientVisible: false,
    });
  }

  // ── 4. OG / Social meta tags (2 pts) — replaces robots-meta check ─────────
  // Branch A: both OG and Twitter card → 2 pts
  // Branch B: either OG or Twitter card → 1 pt
  // Branch D: neither → 0 pts
  const pagesWithOg = pages.filter((p) => p.hasOpenGraph);
  const pagesWithTwitter = pages.filter((p) => p.hasTwitterCard);
  const ogRatio = pages.length > 0 ? pagesWithOg.length / pages.length : 0;
  const twitterRatio = pages.length > 0 ? pagesWithTwitter.length / pages.length : 0;
  const ogPts = ogRatio >= 0.5 && twitterRatio >= 0.5 ? 2 : ogRatio >= 0.5 || twitterRatio >= 0.5 ? 1 : 0;
  breakdown["socialMeta"] = {
    score: ogPts,
    max: 2,
    note: `OG: ${pagesWithOg.length} pages, Twitter: ${pagesWithTwitter.length} pages`,
  };
  score += ogPts;
  if (ogPts < 2) {
    findings.push({
      id: "seo-social-meta",
      category: "seo",
      severity: "medium",
      page: "site-wide",
      title: "Open Graph or Twitter Card meta tags incomplete",
      evidence: [
        `Open Graph: ${pagesWithOg.length}/${pages.length} pages`,
        `Twitter Card: ${pagesWithTwitter.length}/${pages.length} pages`,
      ],
      whyItMatters:
        "OG and Twitter Card tags control how pages appear when shared on social media — missing tags produce ugly, unbranded link previews that reduce click-through.",
      recommendedFix:
        "Add og:title, og:description, og:image and twitter:card, twitter:title to all key pages.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 5. Indexability (3 pts) ────────────────────────────────────────────────
  const noIndexPages = pages.filter((p) => p.hasNoIndex);
  const indexScore = noIndexPages.length === 0 ? 3 : Math.max(0, 3 - noIndexPages.length);
  breakdown["indexability"] = {
    score: indexScore,
    max: 3,
    note: noIndexPages.length > 0 ? `${noIndexPages.length} noindex pages` : undefined,
  };
  score += indexScore;
  if (noIndexPages.length > 0) {
    findings.push({
      id: "seo-noindex",
      category: "seo",
      severity: "critical",
      page: noIndexPages[0].url,
      title: `${noIndexPages.length} page(s) blocked from search-engine indexing`,
      evidence: noIndexPages.map((p) => p.url),
      whyItMatters: "Pages with noindex are invisible to search engines — they receive zero organic traffic.",
      recommendedFix: "Remove noindex meta tags from pages you want indexed.",
      estimatedEffort: "15m",
      clientVisible: true,
    });
  }

  // ── 6. Sitemap (2 pts) ────────────────────────────────────────────────────
  const sitemapScore = hasSitemap ? 2 : 0;
  breakdown["sitemap"] = { score: sitemapScore, max: 2 };
  score += sitemapScore;
  if (!hasSitemap) {
    findings.push({
      id: "seo-sitemap",
      category: "seo",
      severity: "high",
      page: "site-wide",
      title: "No sitemap.xml found",
      evidence: [],
      whyItMatters: "Sitemaps help search engines discover and crawl all pages — essential for large or newly-launched sites.",
      recommendedFix: "Generate a sitemap.xml and submit it via Google Search Console.",
      estimatedEffort: "1h",
      clientVisible: false,
    });
  }

  // ── 7. Structured data (2 pts) ────────────────────────────────────────────
  const pagesWithSchema = pages.filter((p) => p.hasStructuredData);
  const schemaScore = pagesWithSchema.length > 0 ? 2 : 0;
  breakdown["structuredData"] = { score: schemaScore, max: 2 };
  score += schemaScore;
  if (schemaScore === 0) {
    findings.push({
      id: "seo-structured-data",
      category: "seo",
      severity: "medium",
      page: "site-wide",
      title: "No structured data (JSON-LD) detected",
      evidence: [],
      whyItMatters: "Structured data enables rich results (star ratings, FAQs, breadcrumbs) that increase SERP CTR.",
      recommendedFix:
        "Add JSON-LD schema markup (Organization, WebSite, BreadcrumbList) to key pages.",
      estimatedEffort: "half-day",
      clientVisible: false,
    });
  }

  // ── 8. H1 structure — tiered (3 pts) ─────────────────────────────────────
  // Branch A: exactly 1 H1 per page → 3 pts
  // Branch B: H1 present but duplicated or extra → 1 pt
  // Branch D: no H1 → 0 pts
  const h1Buckets = pages.map((p) => {
    if (p.h1.length === 1) return 3;
    if (p.h1.length > 1) return 1;
    return 0;
  });
  const h1Score =
    pages.length > 0
      ? Math.round((h1Buckets as number[]).reduce((a, b) => a + b, 0) / pages.length)
      : 0;
  breakdown["h1"] = { score: h1Score, max: 3 };
  score += h1Score;
  if (h1Score < 3) {
    findings.push({
      id: "seo-h1",
      category: "seo",
      severity: h1Score === 0 ? "high" : "medium",
      page: "site-wide",
      title: "Pages missing H1, or have multiple H1 tags",
      evidence: pages
        .filter((p) => p.h1.length !== 1)
        .slice(0, 3)
        .map((p) => `${p.url} (H1 count: ${p.h1.length})`),
      whyItMatters:
        "Each page needs exactly one H1 to clearly signal the page topic to search engines and screen readers.",
      recommendedFix: "Ensure every page has exactly one H1 tag that matches the page's primary keyword/topic.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 9. Image alt text coverage — tiered (2 pts) ──────────────────────────
  // Replaces the blunt "internal links present" check with a richer signal.
  // Branch A: ≥90 % of images have non-empty alt → 2 pts
  // Branch B: 60–89 % → 1 pt
  // Branch D: <60 % → 0 pts
  const totalImages = pages.reduce((a, p) => a + p.imageCount, 0);
  const altImages = pages.reduce((a, p) => a + p.imagesWithAlt, 0);
  const altRatio = totalImages > 0 ? altImages / totalImages : 1;
  const altPts = altRatio >= 0.9 ? 2 : altRatio >= 0.6 ? 1 : 0;
  breakdown["imageAlt"] = {
    score: altPts,
    max: 2,
    note: totalImages > 0 ? `${altImages}/${totalImages} images have alt text (${Math.round(altRatio * 100)}%)` : "no images",
  };
  score += altPts;
  if (altPts < 2 && totalImages > 0) {
    findings.push({
      id: "seo-image-alt",
      category: "seo",
      severity: altRatio < 0.6 ? "high" : "medium",
      page: "site-wide",
      title: `${totalImages - altImages} image(s) missing alt text (${Math.round((1 - altRatio) * 100)}% of all images)`,
      evidence: [],
      whyItMatters:
        "Alt text is an accessibility requirement and an SEO signal — Google reads it to understand image content and rank image searches.",
      recommendedFix:
        "Add descriptive alt attributes to all meaningful images. Decorative images should use alt=\"\".",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 10. Unique titles (3 pts) ─────────────────────────────────────────────
  const titles = pages.map((p) => p.title).filter(Boolean);
  const uniqueTitles = new Set(titles);
  const uniqueTitleScore =
    titles.length === 0
      ? 0
      : uniqueTitles.size === titles.length
        ? 3
        : Math.round((uniqueTitles.size / titles.length) * 3);
  breakdown["uniqueTitles"] = { score: uniqueTitleScore, max: 3 };
  score += uniqueTitleScore;
  if (uniqueTitleScore < 3 && titles.length > uniqueTitles.size) {
    const dupeCount = titles.length - uniqueTitles.size;
    findings.push({
      id: "seo-duplicate-titles",
      category: "seo",
      severity: "high",
      page: "site-wide",
      title: `${dupeCount} duplicate page title(s) detected`,
      evidence: [],
      whyItMatters:
        "Duplicate titles confuse search engines about which page to rank for a given query and suppress both pages.",
      recommendedFix: "Write a unique, descriptive title for every page.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  score = Math.max(0, Math.min(score, maxScore));
  return {
    label: "SEO",
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    breakdown,
  };
}
