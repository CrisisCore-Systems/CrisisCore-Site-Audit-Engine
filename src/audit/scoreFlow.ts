import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

/**
 * Tree of Thought scoring for Flow (25 pts).
 *
 * Each check evaluates multiple branches and selects the best-supported score:
 *   1. CTA coverage          — 5 pts, tiered on % of pages with CTAs
 *   2. Key nav links          — 5 pts
 *   3. Dead-end pages         — 5 pts
 *   4. Navigation structure   — 3 pts (reduced to fund form check)
 *   5. Above-fold content     — 5 pts
 *   6. Form / lead capture    — 2 pts (new — conversion mechanism check)
 */

export function scoreFlow(pages: PageData[], findings: Finding[]): CategoryScore {
  let score = 0;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  // ── 1. CTA coverage — tiered (5 pts) ─────────────────────────────────────
  // Branch A: CTAs present on ≥75 % of pages → 5 pts (excellent conversion intent)
  // Branch B: CTAs on 40–74 % of pages → 3 pts (partial)
  // Branch C: CTAs on 1–39 % of pages → 1 pt (thin)
  // Branch D: no CTAs detected anywhere → 0 pts
  const pagesWithCta = pages.filter((p) => p.ctas.length > 0);
  const ctaRatio = pages.length > 0 ? pagesWithCta.length / pages.length : 0;
  const ctaScore =
    ctaRatio >= 0.75 ? 5 :
    ctaRatio >= 0.4  ? 3 :
    ctaRatio > 0     ? 1 : 0;
  breakdown["cta"] = {
    score: ctaScore,
    max: 5,
    note: `${pagesWithCta.length}/${pages.length} pages have CTAs`,
  };
  score += ctaScore;
  if (ctaScore < 3) {
    findings.push({
      id: "flow-no-cta",
      category: "flow",
      severity: ctaScore === 0 ? "critical" : "high",
      page: "site-wide",
      title: ctaScore === 0
        ? "No primary CTA detected on any page"
        : `CTAs only found on ${pagesWithCta.length}/${pages.length} pages — insufficient coverage`,
      evidence: ctaScore === 0 ? [] : pages.filter((p) => p.ctas.length === 0).slice(0, 3).map((p) => p.url),
      whyItMatters:
        "Without a clear CTA, visitors have no obvious next step — causing high bounce rates and lost conversions. CTAs should appear on every page.",
      recommendedFix:
        "Add prominent CTAs ('Get Started', 'Contact Us', 'Book a Demo') above the fold on every page.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // ── 2. Key nav links (5 pts) ──────────────────────────────────────────────
  const allLinks = pages.flatMap((p) => p.internalLinks).map((l) => l.toLowerCase());
  const hasPrivacy = allLinks.some((l) => l.includes("/privacy") || l.includes("privacy-policy"));
  const hasContact = allLinks.some((l) => l.includes("/contact") || l.includes("contact-us"));
  const hasAbout = allLinks.some((l) => l.includes("/about") || l.includes("about-us"));
  const presentNavLinks = [hasPrivacy, hasContact, hasAbout].filter(Boolean).length;
  const navScore = presentNavLinks >= 3 ? 5 : presentNavLinks === 2 ? 3 : presentNavLinks === 1 ? 1 : 0;
  breakdown["navLinks"] = {
    score: navScore,
    max: 5,
    note: `privacy:${hasPrivacy}, contact:${hasContact}, about:${hasAbout}`,
  };
  score += navScore;
  if (navScore < 5) {
    findings.push({
      id: "flow-nav-links",
      category: "flow",
      severity: "high",
      page: "site-wide",
      title: "Key navigation links missing (privacy, contact, about)",
      evidence: [`privacy: ${hasPrivacy}`, `contact: ${hasContact}`, `about: ${hasAbout}`],
      whyItMatters:
        "Users expect to find privacy, contact, and about pages in under 2 clicks — their absence signals low trust and increases exit rates.",
      recommendedFix:
        "Link privacy policy, contact, and about pages from the main navigation and footer on every page.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 3. Dead-end pages (5 pts) ─────────────────────────────────────────────
  const deadEnds = pages.filter((p) => p.internalLinks.length === 0);
  const deadEndScore = deadEnds.length === 0 ? 5 : Math.max(0, 5 - deadEnds.length * 2);
  breakdown["deadEnds"] = { score: deadEndScore, max: 5, note: `${deadEnds.length} dead-end pages` };
  score += deadEndScore;
  if (deadEnds.length > 0) {
    findings.push({
      id: "flow-dead-ends",
      category: "flow",
      severity: "medium",
      page: deadEnds[0].url,
      title: `${deadEnds.length} dead-end page(s) with no outgoing internal links`,
      evidence: deadEnds.map((p) => p.url),
      whyItMatters: "Dead-end pages trap users with no obvious next step, driving up exit rates and preventing conversion.",
      recommendedFix: "Add relevant internal links or a CTA to all pages so users always have a clear next action.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 4. Navigation structure — tiered (3 pts) ─────────────────────────────
  // (Reduced from 5 pts to fund the form/lead-capture check below)
  const pagesWithNav = pages.filter((p) => p.internalLinks.length >= 3);
  const navRatio = pages.length > 0 ? pagesWithNav.length / pages.length : 0;
  const navStructureScore =
    navRatio >= 0.7 ? 3 :
    navRatio >= 0.4 ? 2 :
    pagesWithNav.length > 0 ? 1 : 0;
  breakdown["navigationStructure"] = { score: navStructureScore, max: 3 };
  score += navStructureScore;

  // ── 5. Above-fold content quality (5 pts) ────────────────────────────────
  const pagesWithContent = pages.filter((p) => p.title && p.h1.length > 0 && p.metaDescription);
  const contentScore =
    pages.length > 0 ? Math.round((pagesWithContent.length / pages.length) * 5) : 0;
  breakdown["aboveFoldContent"] = { score: contentScore, max: 5 };
  score += contentScore;
  if (contentScore < 3) {
    findings.push({
      id: "flow-thin-content",
      category: "flow",
      severity: "medium",
      page: "site-wide",
      title: "Pages lacking meaningful content signals (title, H1, meta description)",
      evidence: pages
        .filter((p) => !p.title || !p.h1.length || !p.metaDescription)
        .slice(0, 3)
        .map((p) => p.url),
      whyItMatters:
        "Thin content pages fail to communicate value above the fold, causing users to leave before the page loads.",
      recommendedFix:
        "Ensure every page has a clear title, single H1, and meta description that describes the page value.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // ── 6. Form / lead-capture presence (2 pts) ──────────────────────────────
  // Branch A: forms found on ≥1 page (conversion mechanism exists) → 2 pts
  // Branch D: no forms found → 0 pts
  const pagesWithForms = pages.filter((p) => p.formCount > 0);
  const formScore = pagesWithForms.length > 0 ? 2 : 0;
  breakdown["formCapture"] = {
    score: formScore,
    max: 2,
    note: `${pagesWithForms.length} page(s) with forms`,
  };
  score += formScore;
  if (formScore === 0) {
    findings.push({
      id: "flow-no-forms",
      category: "flow",
      severity: "high",
      page: "site-wide",
      title: "No forms detected — site lacks a direct lead-capture mechanism",
      evidence: [],
      whyItMatters:
        "Without a contact or enquiry form, the only conversion path is phone or email, which most visitors won't use. Forms are the primary digital conversion mechanism.",
      recommendedFix:
        "Add at least one contact, demo-request, or newsletter sign-up form to a prominent page.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  score = Math.max(0, Math.min(score, maxScore));
  return {
    label: "Flow",
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    breakdown,
  };
}
