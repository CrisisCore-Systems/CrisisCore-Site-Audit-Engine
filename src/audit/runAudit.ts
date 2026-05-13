import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import type { AuditConfig, AuditResult } from "../types/audit.js";
import { crawlSite } from "./crawlSite.js";
import { scoreSite } from "./scoreSite.js";
import { collectHeaders } from "../collectors/collectHeaders.js";
import { collectScreenshots } from "../collectors/collectScreenshots.js";
import { collectAxe } from "../collectors/collectAxe.js";
import { collectLighthouse } from "../collectors/collectLighthouse.js";
import { renderMarkdown } from "../report/renderMarkdown.js";
import { renderHtml } from "../report/renderHtml.js";
import { renderCsv } from "../report/renderCsv.js";

export async function runAudit(config: AuditConfig): Promise<AuditResult> {
  const { url, maxPages, depth, outDir } = config;
  const timestamp = new Date().toISOString();

  console.log(`\n🔍 CrisisCore Site Audit Engine`);
  console.log(`   Target: ${url}`);
  console.log(`   Preset: ${config.preset}`);
  console.log(`   Output: ${outDir}\n`);

  // Create directory structure
  const evidenceDir = path.join(outDir, "evidence");
  await fs.mkdir(path.join(evidenceDir, "screenshots"), { recursive: true });
  await fs.mkdir(path.join(evidenceDir, "lighthouse"), { recursive: true });
  await fs.mkdir(path.join(evidenceDir, "axe"), { recursive: true });
  await fs.mkdir(path.join(evidenceDir, "headers"), { recursive: true });
  await fs.mkdir(path.join(evidenceDir, "pages"), { recursive: true });

  // Check for sitemap
  let hasSitemap = false;
  try {
    const sitemapUrl = new URL("/sitemap.xml", url).href;
    const resp = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
    hasSitemap = resp.ok;
  } catch {
    hasSitemap = false;
  }
  console.log(`📍 Sitemap: ${hasSitemap ? "found" : "not found"}`);

  // Phase 1: Crawl
  console.log(`\n🕷️  Crawling site (max ${maxPages} pages, depth ${depth})...`);
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });

  let pages;
  try {
    pages = await crawlSite(url, maxPages, depth, browser);
  } finally {
    await browser.close();
  }

  console.log(`\n✅ Crawled ${pages.length} pages`);

  // Phase 2: Run collectors concurrently (limit 3)
  const limit = pLimit(3);
  console.log(`\n🔬 Collecting evidence (concurrency: 3)...`);

  const browser2 = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    await Promise.all(
      pages.map((pageData) =>
        limit(async () => {
          console.log(`  [collect] ${pageData.url}`);
          // Run all collectors, failures are non-fatal
          await Promise.all([
            collectHeaders(pageData, evidenceDir).catch((e: Error) =>
              console.warn(`    headers failed: ${e.message}`)
            ),
            collectScreenshots(pageData, browser2, evidenceDir).catch((e: Error) =>
              console.warn(`    screenshots failed: ${e.message}`)
            ),
            collectAxe(pageData, browser2, evidenceDir).catch((e: Error) =>
              console.warn(`    axe failed: ${e.message}`)
            ),
          ]);
          // Lighthouse is slow, run sequentially within p-limit
          await collectLighthouse(pageData, evidenceDir).catch((e: Error) =>
            console.warn(`    lighthouse failed: ${e.message}`)
          );
          // Write page JSON evidence
          const pagePath = path.join(evidenceDir, "pages", `page-${pageData.slug}.json`);
          await fs.writeFile(
            pagePath,
            JSON.stringify(
              {
                url: pageData.url,
                title: pageData.title,
                metaDescription: pageData.metaDescription,
                h1: pageData.h1,
                canonical: pageData.canonical,
                robotsMeta: pageData.robotsMeta,
                statusCode: pageData.statusCode,
                hasStructuredData: pageData.hasStructuredData,
                hasNoIndex: pageData.hasNoIndex,
              },
              null,
              2
            )
          );
          pageData.pagePath = pagePath;
        })
      )
    );
  } finally {
    await browser2.close();
  }

  // Phase 3: Score
  console.log(`\n📊 Scoring...`);
  const { score, findings } = scoreSite(pages, hasSitemap, url);

  const result: AuditResult = {
    config,
    timestamp,
    baseUrl: url,
    pages,
    findings,
    score,
    hasSitemap,
  };

  // Phase 4: Render reports
  console.log(`\n📝 Generating reports...`);
  await Promise.all([
    fs.writeFile(path.join(outDir, "audit.json"), JSON.stringify(result, null, 2)),
    renderMarkdown(result, path.join(outDir, "summary.md")),
    renderHtml(result, path.join(outDir, "summary.html")),
    renderCsv(result, path.join(outDir, "findings.csv")),
  ]);

  console.log(`\n✅ Audit complete!`);
  console.log(`   Overall score: ${score.overall}/${score.maxOverall}`);
  console.log(`   SEO: ${score.seo.score}/${score.seo.maxScore}`);
  console.log(`   Accessibility: ${score.accessibility.score}/${score.accessibility.maxScore}`);
  console.log(`   Flow: ${score.flow.score}/${score.flow.maxScore}`);
  console.log(`   Trust: ${score.trust.score}/${score.trust.maxScore}`);
  console.log(`   Findings: ${findings.length} (${findings.filter((f) => f.severity === "critical").length} critical)`);
  console.log(`   Output: ${outDir}\n`);

  return result;
}
