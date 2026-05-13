/**
 * E2E test suite for the CrisisCore Site Audit Engine.
 * Runs a real audit against https://paintracker.ca and validates every
 * structural contract of the engine's output.
 *
 * Run:  npm run test:e2e
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runAudit } from "../../src/audit/runAudit.js";
import type { AuditResult } from "../../src/types/audit.js";

const TARGET_URL = "https://paintracker.ca";
/** Keep the test fast: crawl a handful of pages, skip Lighthouse. */
const MAX_PAGES = 5;

let outDir: string;
let result: AuditResult;

describe("CrisisCore Audit Engine — E2E against paintracker.ca", () => {
  before(async () => {
    outDir = await fs.mkdtemp(path.join(os.tmpdir(), "crisiscore-e2e-"));
    result = await runAudit({
      url: TARGET_URL,
      maxPages: MAX_PAGES,
      depth: 2,
      preset: "trust-hardening",
      outDir,
      concurrency: 3,
      skipLighthouse: true,
    });
  });

  after(async () => {
    // Best-effort cleanup; leave files on failure for inspection.
    try {
      await fs.rm(outDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // ── Top-level result shape ─────────────────────────────────────────────────

  test("result is an object", () => {
    assert.equal(typeof result, "object");
    assert.notEqual(result, null);
  });

  test("baseUrl matches the target", () => {
    assert.equal(result.baseUrl, TARGET_URL);
  });

  test("timestamp is a valid ISO-8601 string", () => {
    assert.match(result.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test("hasSitemap is a boolean", () => {
    assert.equal(typeof result.hasSitemap, "boolean");
  });

  test("robotsTxt is a string or null", () => {
    assert.ok(
      result.robotsTxt === null || typeof result.robotsTxt === "string",
      "robotsTxt must be string | null"
    );
  });

  // ── Pages ──────────────────────────────────────────────────────────────────

  test("at least one page was crawled", () => {
    assert.ok(result.pages.length >= 1, `Expected ≥1 page, got ${result.pages.length}`);
  });

  test(`no more than ${MAX_PAGES} pages were crawled`, () => {
    assert.ok(
      result.pages.length <= MAX_PAGES,
      `Expected ≤${MAX_PAGES} pages, got ${result.pages.length}`
    );
  });

  test("every page has a non-empty url", () => {
    for (const page of result.pages) {
      assert.ok(page.url.length > 0, `Page slug "${page.slug}" has empty url`);
    }
  });

  test("every page url is on the target domain", () => {
    const host = new URL(TARGET_URL).hostname;
    for (const page of result.pages) {
      const pageHost = new URL(page.url).hostname;
      assert.equal(pageHost, host, `Unexpected host "${pageHost}" for page "${page.url}"`);
    }
  });

  test("every page has a slug", () => {
    for (const page of result.pages) {
      assert.ok(typeof page.slug === "string" && page.slug.length > 0, `Missing slug on ${page.url}`);
    }
  });

  test("every page has a numeric statusCode", () => {
    for (const page of result.pages) {
      assert.equal(typeof page.statusCode, "number", `Non-numeric statusCode on ${page.url}`);
    }
  });

  test("every page has numeric imageCount and imagesWithAlt", () => {
    for (const page of result.pages) {
      assert.equal(typeof page.imageCount, "number");
      assert.equal(typeof page.imagesWithAlt, "number");
      assert.ok(
        page.imagesWithAlt <= page.imageCount,
        `imagesWithAlt (${page.imagesWithAlt}) > imageCount (${page.imageCount}) on ${page.url}`
      );
    }
  });

  test("every page loadTimeMs is a non-negative number or null", () => {
    for (const page of result.pages) {
      if (page.loadTimeMs !== null) {
        assert.ok(page.loadTimeMs >= 0, `Negative loadTimeMs on ${page.url}`);
      }
    }
  });

  test("every page axeViolations is an array", () => {
    for (const page of result.pages) {
      assert.ok(Array.isArray(page.axeViolations), `axeViolations not an array on ${page.url}`);
    }
  });

  test("every page ctas is an array with ≤10 items", () => {
    for (const page of result.pages) {
      assert.ok(Array.isArray(page.ctas), `ctas not an array on ${page.url}`);
      assert.ok(page.ctas.length <= 10, `More than 10 CTAs on ${page.url}`);
    }
  });

  test("every page internalLinks is an array", () => {
    for (const page of result.pages) {
      assert.ok(Array.isArray(page.internalLinks));
    }
  });

  test("every page redirectCount is a non-negative integer", () => {
    for (const page of result.pages) {
      assert.ok(Number.isInteger(page.redirectCount) && page.redirectCount >= 0);
    }
  });

  // ── Score ──────────────────────────────────────────────────────────────────

  test("score has all five category keys", () => {
    const { score } = result;
    for (const key of ["seo", "accessibility", "flow", "trust", "performance"] as const) {
      assert.ok(key in score, `Missing score category: ${key}`);
    }
  });

  test("score.overall equals the sum of category scores", () => {
    const { score } = result;
    const sum =
      score.seo.score +
      score.accessibility.score +
      score.flow.score +
      score.trust.score +
      score.performance.score;
    assert.equal(score.overall, sum);
  });

  test("score.maxOverall equals the sum of category maxScores", () => {
    const { score } = result;
    const sumMax =
      score.seo.maxScore +
      score.accessibility.maxScore +
      score.flow.maxScore +
      score.trust.maxScore +
      score.performance.maxScore;
    assert.equal(score.maxOverall, sumMax);
  });

  test("overall score is between 0 and maxOverall", () => {
    const { overall, maxOverall } = result.score;
    assert.ok(overall >= 0 && overall <= maxOverall, `overall=${overall} not in [0,${maxOverall}]`);
  });

  test("each category percentage is between 0 and 100", () => {
    for (const key of ["seo", "accessibility", "flow", "trust", "performance"] as const) {
      const cat = result.score[key];
      assert.ok(
        cat.percentage >= 0 && cat.percentage <= 100,
        `${key}.percentage=${cat.percentage} out of range`
      );
    }
  });

  test("each category has a breakdown object", () => {
    for (const key of ["seo", "accessibility", "flow", "trust", "performance"] as const) {
      const cat = result.score[key];
      assert.equal(typeof cat.breakdown, "object");
      assert.notEqual(cat.breakdown, null);
    }
  });

  // ── Findings ───────────────────────────────────────────────────────────────

  test("findings is an array", () => {
    assert.ok(Array.isArray(result.findings));
  });

  test("every finding has required fields", () => {
    for (const f of result.findings) {
      assert.ok(typeof f.id === "string" && f.id.length > 0, `Finding missing id`);
      assert.ok(
        ["seo", "accessibility", "flow", "trust", "performance"].includes(f.category),
        `Invalid category "${f.category}"`
      );
      assert.ok(
        ["critical", "high", "medium", "low"].includes(f.severity),
        `Invalid severity "${f.severity}"`
      );
      assert.ok(typeof f.title === "string" && f.title.length > 0, `Finding "${f.id}" missing title`);
      assert.ok(Array.isArray(f.evidence), `Finding "${f.id}" evidence not an array`);
      assert.ok(typeof f.whyItMatters === "string", `Finding "${f.id}" missing whyItMatters`);
      assert.ok(typeof f.recommendedFix === "string", `Finding "${f.id}" missing recommendedFix`);
      assert.ok(
        ["15m", "1h", "half-day", "multi-day"].includes(f.estimatedEffort),
        `Finding "${f.id}" invalid estimatedEffort`
      );
      assert.equal(typeof f.clientVisible, "boolean", `Finding "${f.id}" clientVisible not boolean`);
    }
  });

  // ── Output files ───────────────────────────────────────────────────────────

  test("audit.json is written and parseable", async () => {
    const filePath = path.join(outDir, "audit.json");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as AuditResult;
    assert.equal(parsed.baseUrl, TARGET_URL);
    assert.ok(Array.isArray(parsed.pages));
  });

  test("summary.md is written and non-empty", async () => {
    const filePath = path.join(outDir, "summary.md");
    const raw = await fs.readFile(filePath, "utf8");
    assert.ok(raw.length > 0);
    assert.ok(raw.includes("paintracker"), "summary.md should mention target domain");
  });

  test("summary.html is written and non-empty", async () => {
    const filePath = path.join(outDir, "summary.html");
    const raw = await fs.readFile(filePath, "utf8");
    assert.ok(raw.length > 0);
    assert.ok(raw.includes("<html") || raw.includes("<!DOCTYPE"), "Expected HTML document");
  });

  test("findings.csv is written and non-empty", async () => {
    const filePath = path.join(outDir, "findings.csv");
    const raw = await fs.readFile(filePath, "utf8");
    assert.ok(raw.length > 0);
    // CSV should have at least a header row
    assert.ok(raw.includes(","), "Expected CSV-formatted content");
  });

  test("evidence directory was created", async () => {
    const evidenceDir = path.join(outDir, "evidence");
    const stat = await fs.stat(evidenceDir);
    assert.ok(stat.isDirectory());
  });

  test("evidence/pages directory has at least one JSON file", async () => {
    const pagesDir = path.join(outDir, "evidence", "pages");
    const files = await fs.readdir(pagesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    assert.ok(jsonFiles.length >= 1, `Expected ≥1 page JSON, found ${jsonFiles.length}`);
  });

  test("each page JSON file is valid and has required fields", async () => {
    const pagesDir = path.join(outDir, "evidence", "pages");
    const files = (await fs.readdir(pagesDir)).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const raw = await fs.readFile(path.join(pagesDir, file), "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      assert.ok(typeof parsed.url === "string", `${file}: missing url`);
      assert.ok(typeof parsed.statusCode === "number", `${file}: missing statusCode`);
    }
  });

  test("config embedded in audit.json matches the run parameters", async () => {
    const filePath = path.join(outDir, "audit.json");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as AuditResult;
    assert.equal(parsed.config.url, TARGET_URL);
    assert.equal(parsed.config.maxPages, MAX_PAGES);
    assert.equal(parsed.config.skipLighthouse, true);
  });
});
