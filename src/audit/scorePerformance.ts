import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

/**
 * Tree of Thought scoring for Performance (25 pts).
 *
 * Three reasoning branches are explored independently and combined:
 *   Branch A — Lighthouse performance score (12 pts, tiered)
 *   Branch B — Lighthouse best-practices score (8 pts, tiered)
 *   Branch C — Mobile readiness via viewport meta coverage (5 pts, tiered)
 */

function tieredLhScore(avg: number, max: number): number {
  // ToT branches:
  //   ≥90 → full marks (excellent)
  //   75–89 → ~75 % marks (good)
  //   50–74 → ~42 % marks (needs work)
  //   <50  → small partial credit (poor)
  if (avg >= 90) return max;
  if (avg >= 75) return Math.round(max * 0.75);
  if (avg >= 50) return Math.round(max * 0.42);
  return Math.round(max * 0.15);
}

export function scorePerformance(pages: PageData[], findings: Finding[]): CategoryScore {
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};
  let score = 0;

  // ── Branch A: Lighthouse performance (12 pts) ────────────────────────────
  const perfScores = pages.map((p) => p.lighthouseScores?.performance ?? 0).filter((s) => s > 0);
  const avgPerf = perfScores.length > 0 ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : 0;
  const perfPts = perfScores.length > 0 ? tieredLhScore(avgPerf, 12) : 0;
  breakdown["lighthousePerformance"] = {
    score: perfPts,
    max: 12,
    note: perfScores.length > 0 ? `avg ${Math.round(avgPerf)}% across ${perfScores.length} pages` : "no data",
  };
  score += perfPts;
  if (perfPts < 9 && perfScores.length > 0) {
    const slowPages = pages
      .filter((p) => (p.lighthouseScores?.performance ?? 101) < 75)
      .map((p) => `${p.url} (${p.lighthouseScores?.performance ?? "?"}%)`);
    findings.push({
      id: "perf-lighthouse-score",
      category: "performance",
      severity: avgPerf < 50 ? "critical" : "high",
      page: "site-wide",
      title: `Lighthouse performance score is ${Math.round(avgPerf)}% — below acceptable threshold`,
      evidence: slowPages.slice(0, 5),
      whyItMatters:
        "Page speed is a direct Google ranking factor (Core Web Vitals). Slow pages lose 53 % of mobile visitors before they load.",
      recommendedFix:
        "Optimise images (WebP/AVIF), enable code splitting, eliminate render-blocking resources, and leverage a CDN. Target ≥90.",
      estimatedEffort: "multi-day",
      clientVisible: true,
    });
  }

  // ── Branch B: Lighthouse best-practices (8 pts) ──────────────────────────
  const bpScores = pages.map((p) => p.lighthouseScores?.bestPractices ?? 0).filter((s) => s > 0);
  const avgBp = bpScores.length > 0 ? bpScores.reduce((a, b) => a + b, 0) / bpScores.length : 0;
  const bpPts = bpScores.length > 0 ? tieredLhScore(avgBp, 8) : 0;
  breakdown["lighthouseBestPractices"] = {
    score: bpPts,
    max: 8,
    note: bpScores.length > 0 ? `avg ${Math.round(avgBp)}%` : "no data",
  };
  score += bpPts;
  if (bpPts < 6 && bpScores.length > 0) {
    findings.push({
      id: "perf-best-practices",
      category: "performance",
      severity: avgBp < 50 ? "high" : "medium",
      page: "site-wide",
      title: `Lighthouse best-practices score is ${Math.round(avgBp)}% — indicates technical debt`,
      evidence: [],
      whyItMatters:
        "Best-practices issues (deprecated APIs, insecure requests, missing HTTPS) erode user trust and future-proof the site against browser breakage.",
      recommendedFix:
        "Resolve console errors, ensure all resources load over HTTPS, adopt modern APIs, and remove deprecated features.",
      estimatedEffort: "half-day",
      clientVisible: false,
    });
  }

  // ── Branch C: Mobile viewport readiness (5 pts) ──────────────────────────
  // ToT branches:
  //   100 % pages have viewport → 5 pts
  //   ≥75 % → 3 pts
  //   ≥50 % → 2 pts
  //   <50 % → 0 pts
  const pagesWithViewport = pages.filter((p) => p.viewportMeta !== null && p.viewportMeta.trim() !== "");
  const viewportRatio = pages.length > 0 ? pagesWithViewport.length / pages.length : 0;
  const viewportPts =
    viewportRatio === 1 ? 5 :
    viewportRatio >= 0.75 ? 3 :
    viewportRatio >= 0.5 ? 2 : 0;
  breakdown["mobileViewport"] = {
    score: viewportPts,
    max: 5,
    note: `${pagesWithViewport.length}/${pages.length} pages have viewport meta`,
  };
  score += viewportPts;
  if (viewportPts < 5) {
    const missing = pages.filter((p) => !p.viewportMeta).map((p) => p.url);
    findings.push({
      id: "perf-viewport-meta",
      category: "performance",
      severity: viewportRatio < 0.5 ? "critical" : "high",
      page: "site-wide",
      title: `${missing.length} page(s) missing viewport meta tag — not mobile-optimised`,
      evidence: missing.slice(0, 5),
      whyItMatters:
        "Without a viewport meta tag, mobile browsers render pages at desktop width, making text and UI unreadable on phones. Mobile-first indexing means this directly impacts rankings.",
      recommendedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to all pages.',
      estimatedEffort: "15m",
      clientVisible: true,
    });
  }

  score = Math.max(0, Math.min(score, maxScore));
  return {
    label: "Performance",
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    breakdown,
  };
}
