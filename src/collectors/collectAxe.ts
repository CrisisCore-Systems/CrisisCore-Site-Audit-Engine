import { AxeBuilder } from "@axe-core/playwright";
import type { Browser } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import type { PageData, AxeViolation } from "../types/audit.js";

export async function collectAxe(
  pageData: PageData,
  browser: Browser,
  evidenceDir: string
): Promise<void> {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  try {
    await page.goto(pageData.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const results = await new AxeBuilder({ page }).analyze();

    const violations: AxeViolation[] = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      nodes: v.nodes.length,
    }));

    const axePath = path.join(evidenceDir, "axe", `axe-${pageData.slug}.json`);
    await fs.writeFile(axePath, JSON.stringify(results, null, 2));
    pageData.axePath = axePath;
    pageData.axeViolations = violations;
  } finally {
    await page.close();
    await context.close();
  }
}
