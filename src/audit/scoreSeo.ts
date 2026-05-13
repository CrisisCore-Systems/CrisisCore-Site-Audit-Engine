import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

export function scoreSeo(pages: PageData[], hasSitemap: boolean, findings: Finding[]): CategoryScore {
  let score = 0;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  // 1. Title present & optimal (3pts)
  const pagesWithGoodTitle = pages.filter(p => p.title && p.title.length >= 10 && p.title.length <= 70);
  const titleScore = pages.length > 0 ? Math.round((pagesWithGoodTitle.length / pages.length) * 3) : 0;
  breakdown["title"] = { score: titleScore, max: 3 };
  score += titleScore;
  if (titleScore < 3) {
    findings.push({
      id: "seo-title",
      category: "seo",
      severity: titleScore === 0 ? "critical" : "high",
      page: "site-wide",
      title: "Page titles missing or poorly optimized",
      evidence: pages.filter(p => !p.title || p.title.length < 10 || p.title.length > 70).slice(0, 3).map(p => p.url),
      whyItMatters: "Title tags are the #1 on-page SEO signal and the first thing users see in search results.",
      recommendedFix: "Add descriptive titles between 10-70 characters to all pages.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 2. Meta description (3pts)
  const pagesWithMeta = pages.filter(p => p.metaDescription && p.metaDescription.length > 50);
  const metaScore = pages.length > 0 ? Math.round((pagesWithMeta.length / pages.length) * 3) : 0;
  breakdown["metaDescription"] = { score: metaScore, max: 3 };
  score += metaScore;
  if (metaScore < 3) {
    findings.push({
      id: "seo-meta-description",
      category: "seo",
      severity: metaScore === 0 ? "high" : "medium",
      page: "site-wide",
      title: "Meta descriptions missing or too short",
      evidence: pages.filter(p => !p.metaDescription || p.metaDescription.length <= 50).slice(0, 3).map(p => p.url),
      whyItMatters: "Meta descriptions improve click-through rates from search results by up to 30%.",
      recommendedFix: "Write unique meta descriptions (120-160 chars) for each page.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 3. Canonical (2pts)
  const pagesWithCanonical = pages.filter(p => p.canonical);
  const canonicalScore = pages.length > 0 ? Math.round((pagesWithCanonical.length / pages.length) * 2) : 0;
  breakdown["canonical"] = { score: canonicalScore, max: 2 };
  score += canonicalScore;
  if (canonicalScore < 2) {
    findings.push({
      id: "seo-canonical",
      category: "seo",
      severity: "medium",
      page: "site-wide",
      title: "Canonical tags missing",
      evidence: pages.filter(p => !p.canonical).slice(0, 3).map(p => p.url),
      whyItMatters: "Canonical tags prevent duplicate content issues and consolidate link equity.",
      recommendedFix: "Add <link rel='canonical'> to all pages.",
      estimatedEffort: "1h",
      clientVisible: false,
    });
  }

  // 4. Robots meta (2pts) — give points if no noindex pages
  const pagesOkRobots = pages.filter(p => !p.hasNoIndex);
  const robotsScore = pages.length > 0 ? Math.round((pagesOkRobots.length / pages.length) * 2) : 0;
  breakdown["robotsMeta"] = { score: robotsScore, max: 2 };
  score += robotsScore;

  // 5. Indexability (3pts)
  const noIndexPages = pages.filter(p => p.hasNoIndex);
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
      title: `${noIndexPages.length} page(s) blocked from indexing`,
      evidence: noIndexPages.map(p => p.url),
      whyItMatters: "Pages with noindex are invisible to search engines, meaning zero organic traffic.",
      recommendedFix: "Remove noindex meta tags from pages you want indexed.",
      estimatedEffort: "15m",
      clientVisible: true,
    });
  }

  // 6. Sitemap (2pts)
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
      whyItMatters: "Sitemaps help search engines discover and index all pages faster.",
      recommendedFix: "Generate and submit a sitemap.xml to Google Search Console.",
      estimatedEffort: "1h",
      clientVisible: false,
    });
  }

  // 7. Structured data (2pts)
  const pagesWithSchema = pages.filter(p => p.hasStructuredData);
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
      whyItMatters: "Structured data enables rich results (stars, FAQs, etc.) that increase CTR.",
      recommendedFix: "Add JSON-LD schema markup (Organization, WebSite, BreadcrumbList) to key pages.",
      estimatedEffort: "half-day",
      clientVisible: false,
    });
  }

  // 8. H1 present and unique (3pts)
  const pagesWithH1 = pages.filter(p => p.h1.length === 1);
  const h1Score = pages.length > 0 ? Math.round((pagesWithH1.length / pages.length) * 3) : 0;
  breakdown["h1"] = { score: h1Score, max: 3 };
  score += h1Score;
  if (h1Score < 3) {
    findings.push({
      id: "seo-h1",
      category: "seo",
      severity: h1Score === 0 ? "high" : "medium",
      page: "site-wide",
      title: "Pages missing or have multiple H1 tags",
      evidence: pages.filter(p => p.h1.length !== 1).slice(0, 3).map(p => `${p.url} (H1 count: ${p.h1.length})`),
      whyItMatters: "Each page should have exactly one H1 to clearly signal the page topic to search engines.",
      recommendedFix: "Ensure every page has exactly one H1 tag matching the page title.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 9. Internal links (2pts)
  const pagesWithLinks = pages.filter(p => p.internalLinks.length > 0);
  const linksScore = pages.length > 0 ? Math.round((pagesWithLinks.length / pages.length) * 2) : 0;
  breakdown["internalLinks"] = { score: linksScore, max: 2 };
  score += linksScore;

  // 10. Unique titles (3pts)
  const titles = pages.map(p => p.title).filter(Boolean);
  const uniqueTitles = new Set(titles);
  const uniqueTitleScore = titles.length === 0
    ? 0
    : uniqueTitles.size === titles.length
      ? 3
      : Math.round((uniqueTitles.size / titles.length) * 3);
  breakdown["uniqueTitles"] = { score: uniqueTitleScore, max: 3 };
  score += uniqueTitleScore;
  if (uniqueTitleScore < 3 && titles.length > uniqueTitles.size) {
    findings.push({
      id: "seo-duplicate-titles",
      category: "seo",
      severity: "high",
      page: "site-wide",
      title: "Duplicate page titles detected",
      evidence: [],
      whyItMatters: "Duplicate titles confuse search engines about which page to rank for a given query.",
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
