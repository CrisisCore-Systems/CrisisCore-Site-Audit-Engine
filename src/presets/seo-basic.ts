export const seoBasicPreset = {
  name: "seo-basic",
  description: "SEO-focused audit — titles, meta, canonical, structured data, sitemaps",
  checks: {
    seo: true,
    accessibility: false,
    flow: false,
    trust: false,
    lighthouse: true,
    axe: false,
    screenshots: false,
    headers: false,
  },
  weights: {
    seo: 100,
    accessibility: 0,
    flow: 0,
    trust: 0,
  },
};

export default seoBasicPreset;
