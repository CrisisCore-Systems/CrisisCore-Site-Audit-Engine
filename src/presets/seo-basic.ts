export const seoBasicPreset = {
  name: "seo-basic",
  description: "SEO-focused audit — titles, meta, canonical, structured data, sitemaps, OG tags",
  checks: {
    seo: true,
    accessibility: false,
    flow: false,
    trust: false,
    performance: true,
    lighthouse: true,
    axe: false,
    screenshots: false,
    headers: false,
  },
  weights: {
    seo: 80,
    accessibility: 0,
    flow: 0,
    trust: 0,
    performance: 20,
  },
};

export default seoBasicPreset;
