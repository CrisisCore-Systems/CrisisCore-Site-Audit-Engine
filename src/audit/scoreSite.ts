import type { PageData } from "../types/audit.js";
import type { AuditScore } from "../types/score.js";
import type { Finding } from "../types/finding.js";
import { scoreSeo } from "./scoreSeo.js";
import { scoreAccessibility } from "./scoreAccessibility.js";
import { scoreFlow } from "./scoreFlow.js";
import { scoreTrust } from "./scoreTrust.js";

export function scoreSite(
  pages: PageData[],
  hasSitemap: boolean,
  baseUrl: string
): { score: AuditScore; findings: Finding[] } {
  const allFindings: Finding[] = [];

  const seo = scoreSeo(pages, hasSitemap, allFindings);
  const accessibility = scoreAccessibility(pages, allFindings);
  const flow = scoreFlow(pages, allFindings);
  const trust = scoreTrust(pages, baseUrl, allFindings);

  const overall = seo.score + accessibility.score + flow.score + trust.score;
  const maxOverall = seo.maxScore + accessibility.maxScore + flow.maxScore + trust.maxScore;

  return {
    score: { overall, maxOverall, seo, accessibility, flow, trust },
    findings: allFindings,
  };
}
