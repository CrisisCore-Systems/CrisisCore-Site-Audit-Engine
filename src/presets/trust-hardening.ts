export const trustHardeningPreset = {
  name: "trust-hardening",
  description: "Full trust teardown — security, SEO, accessibility, flow, performance",
  checks: {
    seo: true,
    accessibility: true,
    flow: true,
    trust: true,
    performance: true,
    lighthouse: true,
    axe: true,
    screenshots: true,
    headers: true,
  },
  weights: {
    seo: 25,
    accessibility: 25,
    flow: 25,
    trust: 25,
    performance: 25,
  },
};

export default trustHardeningPreset;
