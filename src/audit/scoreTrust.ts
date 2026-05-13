import type { PageData } from "../types/audit.js";
import type { CategoryScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";

export function scoreTrust(pages: PageData[], baseUrl: string, findings: Finding[]): CategoryScore {
  let score = 0;
  const maxScore = 25;
  const breakdown: CategoryScore["breakdown"] = {};

  const allLinks = pages.flatMap(p => [...p.internalLinks, p.url]).map(l => l.toLowerCase());
  const allHeaders = pages.flatMap(p => Object.entries(p.headers));
  const getHeader = (name: string): string | null =>
    allHeaders.find(([k]) => k.toLowerCase() === name)?.[1] ?? null;

  // 1. Privacy page (3pts)
  const hasPrivacy = allLinks.some(l => /\/privacy|privacy-policy|datenschutz/i.test(l));
  const privacyScore = hasPrivacy ? 3 : 0;
  breakdown["privacyPage"] = { score: privacyScore, max: 3 };
  score += privacyScore;
  if (!hasPrivacy) {
    findings.push({
      id: "trust-no-privacy",
      category: "trust",
      severity: "critical",
      page: "site-wide",
      title: "No privacy policy page found",
      evidence: [],
      whyItMatters: "A privacy policy is legally required in most jurisdictions (GDPR, CCPA) and builds user trust.",
      recommendedFix: "Create and link a privacy policy page from your footer on every page.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // 2. Terms/legal page (2pts)
  const hasTerms = allLinks.some(l => /\/terms|\/legal|\/tos|terms-of-service|terms-of-use/i.test(l));
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
      whyItMatters: "Terms of service protect the business legally and signal professionalism to prospects.",
      recommendedFix: "Create a terms of service page and link it in the footer.",
      estimatedEffort: "half-day",
      clientVisible: true,
    });
  }

  // 3. Contact method (3pts)
  const hasContact = allLinks.some(l => /\/contact|contact-us|reach-us/i.test(l))
    || pages.some(p => p.ctas.some(c => /contact|email|call|phone/i.test(c)));
  const contactScore = hasContact ? 3 : 0;
  breakdown["contactMethod"] = { score: contactScore, max: 3 };
  score += contactScore;
  if (!hasContact) {
    findings.push({
      id: "trust-no-contact",
      category: "trust",
      severity: "high",
      page: "site-wide",
      title: "No contact method visible",
      evidence: [],
      whyItMatters: "Hidden or missing contact info signals a low-trust operation and prevents customer inquiries.",
      recommendedFix: "Add a prominent contact page link and display contact information in the footer.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 4. HTTPS (3pts)
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
      whyItMatters: "Browsers mark HTTP sites as 'Not Secure', destroying user trust immediately. HTTPS is required for SEO ranking.",
      recommendedFix: "Install an SSL certificate and redirect all HTTP traffic to HTTPS.",
      estimatedEffort: "1h",
      clientVisible: true,
    });
  }

  // 5. CSP header (3pts)
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
      whyItMatters: "CSP prevents XSS attacks that can steal user data and hijack sessions.",
      recommendedFix: "Add a Content-Security-Policy header to your web server configuration.",
      estimatedEffort: "half-day",
      clientVisible: false,
    });
  }

  // 6. HSTS (2pts)
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
      whyItMatters: "HSTS forces browsers to use HTTPS, preventing downgrade attacks.",
      recommendedFix: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to your server.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // 7. X-Frame-Options (2pts)
  const xfoHeader = getHeader("x-frame-options");
  const cspFrameAncestors = cspHeader?.includes("frame-ancestors") ?? false;
  const frameScore = (xfoHeader || cspFrameAncestors) ? 2 : 0;
  breakdown["frameOptions"] = { score: frameScore, max: 2 };
  score += frameScore;
  if (!xfoHeader && !cspFrameAncestors) {
    findings.push({
      id: "trust-no-frame-options",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "X-Frame-Options / frame-ancestors missing",
      evidence: [],
      whyItMatters: "Without clickjacking protection, attackers can embed your site in iframes to steal credentials.",
      recommendedFix: "Add 'X-Frame-Options: SAMEORIGIN' or CSP frame-ancestors directive.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // 8. Referrer-Policy (2pts)
  const referrerHeader = getHeader("referrer-policy");
  const referrerScore = referrerHeader ? 2 : 0;
  breakdown["referrerPolicy"] = { score: referrerScore, max: 2 };
  score += referrerScore;
  if (!referrerHeader) {
    findings.push({
      id: "trust-no-referrer-policy",
      category: "trust",
      severity: "low",
      page: "site-wide",
      title: "Referrer-Policy header missing",
      evidence: [],
      whyItMatters: "Without a referrer policy, URLs with sensitive parameters may leak to third parties.",
      recommendedFix: "Add 'Referrer-Policy: strict-origin-when-cross-origin' to your server.",
      estimatedEffort: "15m",
      clientVisible: false,
    });
  }

  // 9. Social proof (3pts)
  const allTitles = pages.map(p => p.title.toLowerCase()).join(" ");
  const allCtaText = pages.flatMap(p => p.ctas).join(" ").toLowerCase();
  const proofKeywords = ["testimonial", "review", "case study", "success", "client", "result", "proof"];
  const hasProof = proofKeywords.some(kw => allTitles.includes(kw) || allCtaText.includes(kw))
    || allLinks.some(l => proofKeywords.some(kw => l.includes(kw)));
  const proofScore = hasProof ? 3 : 0;
  breakdown["socialProof"] = { score: proofScore, max: 3 };
  score += proofScore;
  if (!hasProof) {
    findings.push({
      id: "trust-no-proof",
      category: "trust",
      severity: "high",
      page: "site-wide",
      title: "No social proof detected (testimonials, case studies, reviews)",
      evidence: [],
      whyItMatters: "Social proof is the #1 trust accelerator. Its absence leaves prospects unconvinced.",
      recommendedFix: "Add client testimonials, case studies, or reviews to key pages.",
      estimatedEffort: "multi-day",
      clientVisible: true,
    });
  }

  // 10. Company/human identity (2pts)
  const hasAbout = allLinks.some(l => /\/about|\/team|\/company|\/people/i.test(l));
  const identityScore = hasAbout ? 2 : 0;
  breakdown["companyIdentity"] = { score: identityScore, max: 2 };
  score += identityScore;
  if (!hasAbout) {
    findings.push({
      id: "trust-no-identity",
      category: "trust",
      severity: "medium",
      page: "site-wide",
      title: "No about/team/company page found",
      evidence: [],
      whyItMatters: "People buy from people. Without human identity signals, trust ceiling is capped.",
      recommendedFix: "Create an About or Team page showcasing the humans behind the business.",
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
