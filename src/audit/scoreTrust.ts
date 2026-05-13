import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

/**
 * Tree of Thought scoring for Trust (25 pts).
 *
 * Detection uses multi-signal evidence aggregation — each check explores several
 * evidence branches and selects the strongest-supported score:
 *
 *   1. Privacy page              — 3 pts (link pattern + crawled page quality)
 *   2. Terms / legal page        — 2 pts
 *   3. Contact method            — 3 pts (link + CTA + crawled page)
 *   4. HTTPS                     — 3 pts
 *   5. CSP header                — 3 pts
 *   6. HSTS header               — 2 pts
 *   7. X-Frame-Options           — 2 pts
 *   8. Referrer-Policy           — 1 pt  ← split into two 1-pt checks
 *   9. X-Content-Type-Options    — 1 pt  ← new
 *  10. Social proof               — 3 pts
 *  11. Company identity           — 2 pts (link + crawled page title signals)
 */

export function scoreTrust(pages: PageData[], baseUrl: string, findings: Finding[]): CategoryScore {
  let score = 0;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  const allLinks = [...new Set(pages.flatMap((p) => [...p.internalLinks, p.url]))].map((l) => l.toLowerCase());
  const allHeaders = pages.flatMap((p) => Object.entries(p.headers));
  const getHeader = (name: string): string | null =>
    allHeaders.find(([k]) => k.toLowerCase() === name)?.[1] ?? null;

  // ── 1. Privacy page — multi-signal (3 pts) ───────────────────────────────
  // Branch A: link pattern matches AND a crawled page has "privacy" in its title → 3 pts
  // Branch B: link pattern matches only → 2 pts
  // Branch C: privacy keyword in page content / CTAs but no dedicated page → 1 pt
  // Branch D: no signal → 0 pts
  const privacyLinkExists = allLinks.some((l) => /\/privacy|privacy-policy|datenschutz/i.test(l));
  const privacyCrawled = pages.some((p) => /privacy/i.test(p.title));
  const privacyMentioned = pages.some((p) =>
    p.ctas.some((c) => /privacy/i.test(c)) ||
    p.metaDescription?.toLowerCase().includes("privacy")
  );
  const privacyScore =
    privacyLinkExists && privacyCrawled ? 3 :
    privacyLinkExists ? 2 :
    privacyMentioned ? 1 : 0;
  breakdown["privacyPage"] = { score: privacyScore, max: 3 };
  score += privacyScore;
  if (privacyScore === 0) {
    findings.push({
      id: "trust-no-privacy",
      category: "trust",
      severity: "critical",
      page: "site-wide",
      title: "No privacy policy page found",
      evidence: [],
      whyItMatters:
        "A privacy policy is legally required in most jurisdictions (GDPR, CCPA) and is a key trust signal for new visitors.",
      recommendedFix: "Create a privacy policy page and link it prominently in the footer on every page.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  } else if (privacyScore < 3) {
    findings.push({
      id: "trust-weak-privacy",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "Privacy policy link found but page was not crawled or lacks clear title",
      evidence: [],
      whyItMatters:
        "A privacy link alone is insufficient — the target page must be substantive and clearly titled to satisfy regulatory requirements.",
      recommendedFix: "Ensure the privacy policy page has a clear <title> and <h1> containing 'Privacy Policy'.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // ── 2. Terms / legal page (2 pts) ─────────────────────────────────────────
  const hasTerms = allLinks.some((l) => /\/terms|\/legal|\/tos|terms-of-service|terms-of-use/i.test(l));
  const termsScore = hasTerms ? 2 : 0;
  breakdown["termsPage"] = { score: termsScore, max: 2 };
  score += termsScore;
  if (!hasTerms) {
    findings.push({
      id: "trust-no-terms",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "No terms of service / legal page found",
      evidence: [],
      whyItMatters: "Terms of service protect the business legally and signal professionalism to prospects and partners.",
      recommendedFix: "Create a terms of service page and link it in the footer.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // ── 3. Contact method — multi-signal (3 pts) ──────────────────────────────
  // Branch A: contact page link exists AND a crawled page has "contact" in its title → 3 pts
  // Branch B: contact page link OR CTA keyword match → 2 pts
  // Branch D: no signal → 0 pts
  const contactLinkExists = allLinks.some((l) => /\/contact|contact-us|reach-us/i.test(l));
  const contactCrawled = pages.some((p) => /contact/i.test(p.title));
  const contactCtaExists = pages.some((p) => p.ctas.some((c) => /contact|email|call|phone/i.test(c)));
  const contactScore =
    contactLinkExists && contactCrawled ? 3 :
    contactLinkExists || contactCtaExists ? 2 : 0;
  breakdown["contactMethod"] = { score: contactScore, max: 3 };
  score += contactScore;
  if (contactScore === 0) {
    findings.push({
      id: "trust-no-contact",
      category: "trust",
      severity: "high",
      page: "site-wide",
      title: "No contact method visible",
      evidence: [],
      whyItMatters:
        "Hidden or missing contact info signals a low-trust operation and eliminates the most common conversion path.",
      recommendedFix:
        "Add a prominent contact page and display contact information (email, phone, or form) in the footer.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 4. HTTPS (3 pts) ──────────────────────────────────────────────────────
  const isHttps = baseUrl.startsWith("https://");
  const httpsScore = isHttps ? 3 : 0;
  breakdown["https"] = { score: httpsScore, max: 3 };
  score += httpsScore;
  if (!isHttps) {
    findings.push({
      id: "trust-no-https",
      category: "trust",
      severity: "critical",
      page: baseUrl,
      title: "Site is not served over HTTPS",
      evidence: [baseUrl],
      whyItMatters:
        "Browsers mark HTTP sites as 'Not Secure', destroying user trust on arrival. HTTPS is also a Google ranking signal.",
      recommendedFix: "Install an SSL/TLS certificate and redirect all HTTP traffic to HTTPS.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // ── 5. Content-Security-Policy header (3 pts) ────────────────────────────
  const cspHeader = getHeader("content-security-policy");
  const cspScore = cspHeader ? 3 : 0;
  breakdown["csp"] = { score: cspScore, max: 3 };
  score += cspScore;
  if (!cspHeader) {
    findings.push({
      id: "trust-no-csp",
      category: "trust",
      severity: "high",
      page: "site-wide",
      title: "Content-Security-Policy header missing",
      evidence: [],
      whyItMatters: "CSP prevents XSS attacks that can steal user data, hijack sessions, and deface the site.",
      recommendedFix:
        "Configure a Content-Security-Policy header in your web server. Start with a restrictive policy and loosen only what is necessary.",
      estimatedEffort: "half-day",
      clientVisible: false,
    });
  }

  // ── 6. HSTS header (2 pts) ────────────────────────────────────────────────
  const hstsHeader = getHeader("strict-transport-security");
  const hstsScore = hstsHeader ? 2 : 0;
  breakdown["hsts"] = { score: hstsScore, max: 2 };
  score += hstsScore;
  if (!hstsHeader) {
    findings.push({
      id: "trust-no-hsts",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "HSTS (Strict-Transport-Security) header missing",
      evidence: [],
      whyItMatters: "HSTS instructs browsers to always use HTTPS, preventing protocol-downgrade and man-in-the-middle attacks.",
      recommendedFix: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to your server response.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // ── 7. X-Frame-Options / frame-ancestors (2 pts) ─────────────────────────
  const xfoHeader = getHeader("x-frame-options");
  const cspFrameAncestors = cspHeader?.includes("frame-ancestors") ?? false;
  const frameScore = xfoHeader || cspFrameAncestors ? 2 : 0;
  breakdown["frameOptions"] = { score: frameScore, max: 2 };
  score += frameScore;
  if (!xfoHeader && !cspFrameAncestors) {
    findings.push({
      id: "trust-no-frame-options",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "Clickjacking protection missing (X-Frame-Options / frame-ancestors)",
      evidence: [],
      whyItMatters:
        "Without framing protection, attackers can embed your site inside an iframe to overlay deceptive UI and steal credentials.",
      recommendedFix: "Add 'X-Frame-Options: SAMEORIGIN' or a 'frame-ancestors' directive in your CSP.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // ── 8. Referrer-Policy (1 pt) ─────────────────────────────────────────────
  const referrerHeader = getHeader("referrer-policy");
  const referrerScore = referrerHeader ? 1 : 0;
  breakdown["referrerPolicy"] = { score: referrerScore, max: 1 };
  score += referrerScore;
  if (!referrerHeader) {
    findings.push({
      id: "trust-no-referrer-policy",
      category: "trust",
      severity: "low",
      page: "site-wide",
      title: "Referrer-Policy header missing",
      evidence: [],
      whyItMatters:
        "Without a referrer policy, URLs containing sensitive query parameters (tokens, user IDs) may leak to third-party sites.",
      recommendedFix: "Add 'Referrer-Policy: strict-origin-when-cross-origin' to your server response.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // ── 9. X-Content-Type-Options (1 pt) — new ───────────────────────────────
  const xctoHeader = getHeader("x-content-type-options");
  const xctoScore = xctoHeader?.toLowerCase().includes("nosniff") ? 1 : 0;
  breakdown["xContentTypeOptions"] = { score: xctoScore, max: 1 };
  score += xctoScore;
  if (!xctoScore) {
    findings.push({
      id: "trust-no-xcto",
      category: "trust",
      severity: "low",
      page: "site-wide",
      title: "X-Content-Type-Options: nosniff header missing",
      evidence: [],
      whyItMatters:
        "Without this header, browsers may MIME-sniff responses and execute non-script content as scripts, enabling content-injection attacks.",
      recommendedFix: "Add 'X-Content-Type-Options: nosniff' to all HTTP responses.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // ── 10. Social proof — multi-signal (3 pts) ───────────────────────────────
  // Branch A: dedicated proof page AND proof keywords in content → 3 pts
  // Branch B: proof keywords in titles/CTAs/links → 2 pts
  // Branch D: no signal → 0 pts
  const proofKeywords = ["testimonial", "review", "case study", "success", "client", "result", "proof"];
  const allTitles = pages.map((p) => p.title.toLowerCase()).join(" ");
  const allCtaText = pages.flatMap((p) => p.ctas).join(" ").toLowerCase();
  const proofLinkExists = allLinks.some((l) => proofKeywords.some((kw) => l.includes(kw)));
  const proofInContent = proofKeywords.some((kw) => allTitles.includes(kw) || allCtaText.includes(kw));
  const proofCrawledPage = pages.some((p) =>
    proofKeywords.some((kw) => p.title.toLowerCase().includes(kw))
  );
  const proofScore =
    (proofLinkExists || proofCrawledPage) && proofInContent ? 3 :
    proofInContent || proofLinkExists ? 2 : 0;
  breakdown["socialProof"] = { score: proofScore, max: 3 };
  score += proofScore;
  if (proofScore === 0) {
    findings.push({
      id: "trust-no-proof",
      category: "trust",
      severity: "high",
      page: "site-wide",
      title: "No social proof detected (testimonials, case studies, reviews)",
      evidence: [],
      whyItMatters:
        "Social proof is the #1 trust accelerator. Buyers need evidence that others have succeeded before they commit.",
      recommendedFix:
        "Add client testimonials, case studies, review snippets, or a results-focused page to key conversion pages.",
      estimatedEffort: "multi-day",
      clientVisible: true,
    });
  }

  // ── 11. Company / human identity — multi-signal (2 pts) ──────────────────
  // Branch A: about/team page link exists AND a crawled page matches → 2 pts
  // Branch B: about/team link exists only → 1 pt
  // Branch D: no signal → 0 pts
  const aboutLinkExists = allLinks.some((l) => /\/about|\/team|\/company|\/people/i.test(l));
  const aboutCrawled = pages.some((p) => /about|team|company|people/i.test(p.title));
  const identityScore = aboutLinkExists && aboutCrawled ? 2 : aboutLinkExists ? 1 : 0;
  breakdown["companyIdentity"] = { score: identityScore, max: 2 };
  score += identityScore;
  if (identityScore === 0) {
    findings.push({
      id: "trust-no-identity",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "No about / team / company page found",
      evidence: [],
      whyItMatters:
        "People buy from people. Without human identity signals (faces, names, story), trust ceiling is capped.",
      recommendedFix: "Create an About or Team page showcasing the humans and mission behind the business.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  score = Math.max(0, Math.min(score, maxScore));
  return {
    label: "Trust",
    score,
    maxScore,
    percentage: Math.round((score / maxScore) * 100),
    breakdown,
  };
}
