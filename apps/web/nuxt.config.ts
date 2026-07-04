export default defineNuxtConfig({
  compatibilityDate: "2026-07-04",
  // ponytail: default SSR everywhere; Phaser game routes get routeRules ssr:false in #6 (ssr:false globally crashes nuxt 4.4.5 dev)
  modules: ["@pinia/nuxt", "@nuxtjs/i18n", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
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
