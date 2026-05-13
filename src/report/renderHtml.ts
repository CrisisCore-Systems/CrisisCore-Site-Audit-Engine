import Handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AuditResult } from "../types/audit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function renderHtml(result: AuditResult, outputPath: string): Promise<void> {
  const templatePath = path.join(__dirname, "templates", "summary.html.hbs");
  const templateSrc = await fs.readFile(templatePath, "utf-8");
  const template = Handlebars.compile(templateSrc);

  const criticalCount = result.findings.filter((f) => f.severity === "critical").length;
  const highCount = result.findings.filter((f) => f.severity === "high").length;
  const mediumCount = result.findings.filter((f) => f.severity === "medium").length;
  const lowCount = result.findings.filter((f) => f.severity === "low").length;

  const context = {
    ...result,
    date: new Date(result.timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    pageCount: result.pages.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    findingsByCategory: ["seo", "accessibility", "flow", "trust"].map((cat) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      findings: result.findings.filter((f) => f.category === cat),
    })),
    scorePercent: Math.round((result.score.overall / result.score.maxOverall) * 100),
    seoPercent: Math.round((result.score.seo.score / result.score.seo.maxScore) * 100),
    accessibilityPercent: Math.round(
      (result.score.accessibility.score / result.score.accessibility.maxScore) * 100
    ),
    flowPercent: Math.round((result.score.flow.score / result.score.flow.maxScore) * 100),
    trustPercent: Math.round((result.score.trust.score / result.score.trust.maxScore) * 100),
  };

  const html = template(context);
  await fs.writeFile(outputPath, html, "utf-8");
}
