export interface CategoryScore {
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: Record<string, { score: number; max: number; note?: string }>;
}

export interface AuditScore {
  overall: number;
  maxOverall: number;
  seo: CategoryScore;
  accessibility: CategoryScore;
  flow: CategoryScore;
  trust: CategoryScore;
}
