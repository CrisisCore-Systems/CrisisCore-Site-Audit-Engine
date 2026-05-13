import type { Finding } from "./finding.js";
import type { AuditScore } from "./score.js";

export interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  nodes: number;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface PageData {
  url: string;
  slug: string;
  title: string;
  metaDescription: string;
  h1: string[];
  canonical: string | null;
  robotsMeta: string | null;
  statusCode: number;
  internalLinks: string[];
  screenshotDesktop: string | null;
  screenshotMobile: string | null;
  lighthousePath: string | null;
  axePath: string | null;
  headersPath: string | null;
  pagePath: string | null;
  hasStructuredData: boolean;
  hasNoIndex: boolean;
  ctas: string[];
  axeViolations: AxeViolation[];
  lighthouseScores: LighthouseScores | null;
  headers: Record<string, string>;
}

export interface AuditConfig {
  url: string;
  maxPages: number;
  depth: number;
  preset: string;
  outDir: string;
}

export interface AuditResult {
  config: AuditConfig;
  timestamp: string;
  baseUrl: string;
  pages: PageData[];
  findings: Finding[];
  score: AuditScore;
  hasSitemap: boolean;
}
