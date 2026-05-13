import type { Browser } from "playwright";
import * as cheerio from "cheerio";
import type { PageData } from "../types/audit.js";

const CTA_KEYWORDS = ["contact", "get started", "sign up", "signup", "buy", "learn more", "schedule", "book", "demo", "try", "start", "subscribe", "join", "request", "download", "free trial"];
const SKIP_EXTENSIONS = /\.(pdf|zip|jpg|jpeg|png|gif|svg|webp|mp4|mp3|doc|docx|xls|xlsx|css|js|ico|woff|woff2|ttf|eot)$/i;

function toSlug(url: string, baseUrl: string): string {
  try {
    const parsed = new URL(url);
    const base = new URL(baseUrl);
    let p = parsed.pathname;
    if (p === "/" || p === "" || parsed.href === base.href) return "index";
    p = p.replace(/\/$/, "").replace(/^\//, "");
    return p.replace(/\//g, "--").replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 80);
  } catch {
    return "page";
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href.replace(/\/$/, "") || "/";
  } catch {
    return url;
  }
}

export async function crawlSite(
  baseUrl: string,
  maxPages: number,
  depth: number,
  browser: Browser
): Promise<PageData[]> {
  const base = new URL(baseUrl);
  const visited = new Set<string>();
  type QueueItem = { url: string; depth: number };
  const queue: QueueItem[] = [{ url: normalizeUrl(baseUrl), depth: 0 }];
  const pages: PageData[] = [];
  const seenSlugs = new Map<string, number>();

  while (queue.length > 0 && pages.length < maxPages) {
    const item = queue.shift()!;
    const normalized = normalizeUrl(item.url);
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    try {
      console.log(`  [crawl] ${normalized}`);
      const response = await page.goto(normalized, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const statusCode = response?.status() ?? 0;
      const content = await page.content();
      const $ = cheerio.load(content);

      const title = $("title").first().text().trim();
      const metaDescription = $('meta[name="description"]').attr("content") ?? "";
      const canonicalHref = $('link[rel="canonical"]').attr("href") ?? null;
      const canonical = canonicalHref
        ? normalizeUrl(new URL(canonicalHref, normalized).href)
        : null;
      const robotsMeta = $('meta[name="robots"]').attr("content") ?? null;
      const h1 = $("h1")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean);
      const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
      const hasNoIndex = robotsMeta ? /noindex/i.test(robotsMeta) : false;

      const ctas: string[] = [];
      $("a, button").each((_, el) => {
        const text = $(el).text().trim();
        const lower = text.toLowerCase();
        if (CTA_KEYWORDS.some((kw) => lower.includes(kw))) {
          ctas.push(text);
        }
      });

      const internalLinks: string[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        try {
          const abs = new URL(href, normalized);
          if (abs.hostname !== base.hostname) return;
          if (SKIP_EXTENSIONS.test(abs.pathname)) return;
          abs.hash = "";
          const clean = abs.href.replace(/\/$/, "");
          if (!internalLinks.includes(clean)) internalLinks.push(clean);
          if (item.depth < depth && !visited.has(clean)) {
            queue.push({ url: clean, depth: item.depth + 1 });
          }
        } catch {
          // ignore invalid hrefs
        }
      });

      let slug = toSlug(normalized, baseUrl);
      const count = seenSlugs.get(slug) ?? 0;
      seenSlugs.set(slug, count + 1);
      if (count > 0) slug = `${slug}-${count}`;

      pages.push({
        url: normalized,
        slug,
        title,
        metaDescription,
        h1,
        canonical,
        robotsMeta,
        statusCode,
        internalLinks,
        screenshotDesktop: null,
        screenshotMobile: null,
        lighthousePath: null,
        axePath: null,
        headersPath: null,
        pagePath: null,
        hasStructuredData,
        hasNoIndex,
        ctas: [...new Set(ctas)].slice(0, 10),
        axeViolations: [],
        lighthouseScores: null,
        headers: {},
      });
    } catch (err) {
      console.warn(`  [crawl] FAILED ${normalized}: ${(err as Error).message}`);
    } finally {
      await page.close();
      await context.close();
    }
  }

  return pages;
}
