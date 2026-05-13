export const accessibilityBasicPreset = {
  name: "accessibility-basic",
  description: "Accessibility-focused audit — axe-core WCAG 2.1 AA checks + performance",
  checks: {
    seo: false,
    accessibility: true,
    flow: false,
    trust: false,
    performance: true,
    lighthouse: true,
    axe: true,
    screenshots: true,
    headers: false,
  },
  weights: {
    seo: 0,
    accessibility: 80,
    flow: 0,
    trust: 0,
    performance: 20,
  },
};

export default accessibilityBasicPreset;
