import Handlebars from "handlebars";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AuditResult } from "../types/audit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function renderMarkdown(result: AuditResult, outputPath: string): Promise<void> {
  const templatePath = path.join(__dirname, "templates", "summary.md.hbs");
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
    findingsByCategory: groupFindingsByCategory(result),
    scorePercent: Math.round((result.score.overall / result.score.maxOverall) * 100),
  };

  const markdown = template(context);
  await fs.writeFile(outputPath, markdown, "utf-8");
}

function groupFindingsByCategory(result: AuditResult) {
  const categories = ["seo", "accessibility", "flow", "trust"] as const;
  return categories.map((cat) => ({
    category: cat.toUpperCase(),
    findings: result.findings.filter((f) => f.category === cat),
  }));
}
