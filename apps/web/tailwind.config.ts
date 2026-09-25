import type { Config } from "tailwindcss";

// Tailwind 4 reads this through the @config line in globals.css. We keep the
// brand colors here (instead of only in @theme) so the whole palette lives in
// one place the team already knows how to find.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "wah-purple": "#6d28d9",
        "wah-neon": "#a855f7",
        "wah-lavender": "#e9d5ff",
        "wah-accent": "#a855f7",
        "wah-deep": "#1e1b4b",

        // theme-aware colors, the actual values swap in globals.css
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        "card-bg": "var(--color-card-bg)",
        "text-muted": "var(--color-text-muted)",
        "text-secondary": "var(--color-text-secondary)",
        "glass-bg": "var(--color-glass-bg)",
        "glass-border": "var(--color-glass-border)",
      },
    },
  },
};

export default config;
