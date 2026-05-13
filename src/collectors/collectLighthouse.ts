import { launch } from "chrome-launcher";
import fs from "node:fs/promises";
import path from "node:path";
import type { PageData } from "../types/audit.js";

export async function collectLighthouse(pageData: PageData, evidenceDir: string): Promise<void> {
  const chrome = await launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });
  try {
    // Dynamic import to handle ESM/CJS differences
    const lighthouseModule = await import("lighthouse");
    const lighthouse = lighthouseModule.default;

    const result = await lighthouse(pageData.url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });

    if (!result) return;

    const { lhr } = result;
    const lhPath = path.join(evidenceDir, "lighthouse", `lighthouse-${pageData.slug}.json`);
    await fs.writeFile(lhPath, JSON.stringify(lhr, null, 2));
    pageData.lighthousePath = lhPath;
    pageData.lighthouseScores = {
      performance: Math.round((lhr.categories["performance"]?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories["accessibility"]?.score ?? 0) * 100),
      bestPractices: Math.round((lhr.categories["best-practices"]?.score ?? 0) * 100),
      seo: Math.round((lhr.categories["seo"]?.score ?? 0) * 100),
    };
  } finally {
    await chrome.kill();
  }
}
