import * as cheerio from "cheerio";

export async function collectLinks(url: string, baseUrl: string): Promise<string[]> {
  const base = new URL(baseUrl);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  const $ = cheerio.load(html);
  const links: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const abs = new URL(href, url);
      if (abs.hostname === base.hostname) {
        links.push(abs.href.replace(/\/$/, ""));
      }
    } catch {
      // skip invalid hrefs
    }
  });

  return [...new Set(links)];
}
