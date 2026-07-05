export default defineNuxtConfig({
  compatibilityDate: "2026-07-04",
  modules: ["@pinia/nuxt", "@nuxtjs/i18n", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  // ponytail: one config bumps every Nuxt UI component (buttons, inputs, badges) off the tiny 'md' default
  ui: { theme: { defaultVariants: { size: "lg" } } },
  // ponytail: Hearth is light-only for teacher screens; dark theme is bespoke to the student game, not a color-mode toggle
  colorMode: { preference: "light", fallback: "light" },
  app: {
    head: {
      title: "Lớp Vui",
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;700&family=Baloo+2:wght@600;700;800&family=JetBrains+Mono&display=swap",
        },
      ],
    },
  },
  i18n: {
    defaultLocale: "vi",
    locales: [{ code: "vi", file: "vi.json" }],
  },
  nitro: {
    routeRules: {
      "/api/**": { proxy: "http://localhost:3001/api/**" },
    },
  },
});
