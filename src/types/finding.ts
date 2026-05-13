export type FindingCategory = "seo" | "accessibility" | "flow" | "trust";
export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type EstimatedEffort = "15m" | "1h" | "half-day" | "multi-day";

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  page: string;
  title: string;
  evidence: string[];
  whyItMatters: string;
  recommendedFix: string;
  estimatedEffort: EstimatedEffort;
  clientVisible: boolean;
}
