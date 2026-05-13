import fs from "node:fs/promises";
import type { AuditResult } from "../types/audit.js";

export async function renderCsv(result: AuditResult, outputPath: string): Promise<void> {
  const header = [
    "id",
    "category",
    "severity",
    "page",
    "title",
    "whyItMatters",
    "recommendedFix",
    "estimatedEffort",
    "clientVisible",
  ];
  const rows = result.findings.map((f) =>
    [
      f.id,
      f.category,
      f.severity,
      f.page,
      csvEscape(f.title),
      csvEscape(f.whyItMatters),
      csvEscape(f.recommendedFix),
      f.estimatedEffort,
      f.clientVisible ? "yes" : "no",
    ].join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  await fs.writeFile(outputPath, csv, "utf-8");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
