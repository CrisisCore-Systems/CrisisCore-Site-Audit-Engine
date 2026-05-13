import type { Browser } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import type { PageData } from "../types/audit.js";

export async function collectScreenshots(
  pageData: PageData,
  browser: Browser,
  evidenceDir: string
): Promise<void> {
  const screenshotsDir = path.join(evidenceDir, "screenshots");

  // Desktop
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const desktopPage = await desktopCtx.newPage();
  try {
    await desktopPage.goto(pageData.url, { waitUntil: "networkidle", timeout: 30000 });
    const desktopPath = path.join(screenshotsDir, `desktop-${pageData.slug}.png`);
    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    pageData.screenshotDesktop = desktopPath;
  } finally {
    await desktopPage.close();
    await desktopCtx.close();
  }

  // Mobile
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    ignoreHTTPSErrors: true,
  });
  const mobilePage = await mobileCtx.newPage();
  try {
    await mobilePage.goto(pageData.url, { waitUntil: "networkidle", timeout: 30000 });
    const mobilePath = path.join(screenshotsDir, `mobile-${pageData.slug}.png`);
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    pageData.screenshotMobile = mobilePath;
  } finally {
    await mobilePage.close();
    await mobileCtx.close();
  }
}
