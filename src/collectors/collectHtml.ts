import * as cheerio from "cheerio";
import type { PageData } from "../types/audit.js";

export async function collectHtml(url: string): Promise<Partial<PageData>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") ?? "";
  const canonical = $('link[rel="canonical"]').attr("href") ?? null;
  const robotsMeta = $('meta[name="robots"]').attr("content") ?? null;
  const h1 = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
  const hasNoIndex = robotsMeta ? /noindex/i.test(robotsMeta) : false;

  return { title, metaDescription, canonical, robotsMeta, h1, hasStructuredData, hasNoIndex };
}
