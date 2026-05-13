export const protectiveComputingPreset = {
  name: "protective-computing",
  description: "Security-focused audit — HTTP headers, HTTPS, CSP, HSTS, trust signals",
  checks: {
    seo: false,
    accessibility: false,
    flow: false,
    trust: true,
    lighthouse: false,
    axe: false,
    screenshots: false,
    headers: true,
  },
  weights: {
    seo: 0,
    accessibility: 0,
    flow: 0,
    trust: 100,
  },
};

export default protectiveComputingPreset;
