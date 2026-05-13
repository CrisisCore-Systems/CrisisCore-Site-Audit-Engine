#!/usr/bin/env node
import { Command } from "commander";
import { runAudit } from "./audit/runAudit.js";
import path from "node:path";

const program = new Command();

program
  .name("crisiscore-audit")
  .description("CrisisCore Site Audit Engine — trust teardown system")
  .version("0.1.0");

program
  .command("run <url>")
  .description("Crawl and audit a website")
  .option("--max-pages <n>", "Maximum pages to crawl", "25")
  .option("--depth <n>", "Crawl depth", "2")
  .option("--preset <name>", "Audit preset to apply", "trust-hardening")
  .option("--out <dir>", "Output directory", "./audits/output")
  .option("--concurrency <n>", "Parallel collector concurrency per page", "3")
  .option("--skip-lighthouse", "Skip Lighthouse audits (faster, no performance data)", false)
  .action(async (
    url: string,
    options: {
      maxPages: string;
      depth: string;
      preset: string;
      out: string;
      concurrency: string;
      skipLighthouse: boolean;
    }
  ) => {
    try {
      await runAudit({
        url,
        maxPages: parseInt(options.maxPages, 10),
        depth: parseInt(options.depth, 10),
        preset: options.preset,
        outDir: path.resolve(options.out),
        concurrency: Math.max(1, parseInt(options.concurrency, 10)),
        skipLighthouse: options.skipLighthouse,
      });
    } catch (err) {
      console.error("Audit failed:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);
