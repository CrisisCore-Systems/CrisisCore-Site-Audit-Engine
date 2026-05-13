export const trustHardeningPreset = {
  name: "trust-hardening",
  description: "Full trust teardown — security, SEO, accessibility, flow",
  checks: {
    seo: true,
    accessibility: true,
    flow: true,
    trust: true,
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
  },
};

export default trustHardeningPreset;
