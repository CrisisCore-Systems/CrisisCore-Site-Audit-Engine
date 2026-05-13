import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

export function scoreFlow(pages: PageData[], findings: Finding[]): CategoryScore {
  let score = 0;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  // 1. CTA detectable (5pts)
  const pagesWithCta = pages.filter(p => p.ctas.length > 0);
  const ctaScore = pagesWithCta.length > 0 ? 5 : 0;
  breakdown["cta"] = { score: ctaScore, max: 5 };
  score += ctaScore;
  if (ctaScore === 0) {
    findings.push({
      id: "flow-no-cta",
      category: "flow",
      severity: "critical",
      page: "site-wide",
      title: "No primary CTA detected on any page",
      evidence: [],
      whyItMatters: "Without a clear CTA, visitors have no obvious next step, causing high bounce rates and lost conversions.",
      recommendedFix: "Add prominent CTAs (e.g., 'Get Started', 'Contact Us', 'Book a Demo') to every page.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // 2. Key nav links (5pts)
  const allLinks = pages.flatMap(p => p.internalLinks).map(l => l.toLowerCase());
  const hasPrivacy = allLinks.some(l => l.includes("/privacy") || l.includes("privacy-policy"));
  const hasContact = allLinks.some(l => l.includes("/contact") || l.includes("contact-us"));
  const hasAbout = allLinks.some(l => l.includes("/about") || l.includes("about-us"));
  const presentNavLinks = [hasPrivacy, hasContact, hasAbout].filter(Boolean).length;
  const navScore = presentNavLinks >= 2 ? 5 : presentNavLinks === 1 ? 2 : 0;
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
      whyItMatters: "Users expect to find privacy, contact, and about pages easily — their absence signals low trust.",
      recommendedFix: "Ensure privacy policy, contact, and about pages are linked from the main navigation and footer.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 3. No dead-end pages (5pts)
  const deadEnds = pages.filter(p => p.internalLinks.length === 0);
  const deadEndScore = deadEnds.length === 0 ? 5 : Math.max(0, 5 - deadEnds.length * 2);
  breakdown["deadEnds"] = { score: deadEndScore, max: 5, note: `${deadEnds.length} dead-end pages` };
  score += deadEndScore;
  if (deadEnds.length > 0) {
    findings.push({
      id: "flow-dead-ends",
      category: "flow",
      severity: "medium",
      page: deadEnds[0].url,
      title: `${deadEnds.length} dead-end page(s) with no outgoing links`,
      evidence: deadEnds.map(p => p.url),
      whyItMatters: "Dead-end pages trap users with no obvious next action, increasing exit rates.",
      recommendedFix: "Add relevant internal links or CTAs to all pages.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 4. Navigation structure (5pts)
  const pagesWithNav = pages.filter(p => p.internalLinks.length >= 3);
  const navRatio = pages.length > 0 ? pagesWithNav.length / pages.length : 0;
  const navStructureScore = navRatio >= 0.7 ? 5 : navRatio >= 0.4 ? 3 : pagesWithNav.length > 0 ? 2 : 0;
  breakdown["navigationStructure"] = { score: navStructureScore, max: 5 };
  score += navStructureScore;

  // 5. Meaningful above-fold content (5pts)
  const pagesWithContent = pages.filter(p => p.title && p.h1.length > 0 && p.metaDescription);
  const contentScore = pages.length > 0 ? Math.round((pagesWithContent.length / pages.length) * 5) : 0;
  breakdown["aboveFoldContent"] = { score: contentScore, max: 5 };
  score += contentScore;
  if (contentScore < 3) {
    findings.push({
      id: "flow-thin-content",
      category: "flow",
      severity: "medium",
      page: "site-wide",
      title: "Pages lacking meaningful content signals (title, H1, meta description)",
      evidence: pages.filter(p => !p.title || !p.h1.length || !p.metaDescription).slice(0, 3).map(p => p.url),
      whyItMatters: "Thin content pages fail to communicate value, causing users to leave immediately.",
      recommendedFix: "Ensure every page has a clear title, H1, and meta description that describes the page value.",
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
