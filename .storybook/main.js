

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => {
    // Exclude PWA and parse-voice plugins when building Storybook
    const filterPlugin = (p) => {
      if (!p) return false;
      const name = String(p.name || "").toLowerCase();
      return !name.includes("pwa") && !name.includes("parse-voice");
    };
    config.plugins = config.plugins.flat(Infinity).filter(filterPlugin);
    return config;
  },
};
export default config;