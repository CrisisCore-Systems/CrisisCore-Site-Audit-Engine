import fs from "node:fs/promises";
import path from "node:path";
import type { PageData } from "../types/audit.js";

export async function collectHeaders(pageData: PageData, evidenceDir: string): Promise<void> {
  const response = await fetch(pageData.url, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const headersPath = path.join(evidenceDir, "headers", `headers-${pageData.slug}.json`);
  await fs.writeFile(headersPath, JSON.stringify(headers, null, 2));
  pageData.headers = headers;
  pageData.headersPath = headersPath;
}
