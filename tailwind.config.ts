import type { Config } from "tailwindcss";

// Colour tokens are CSS variables (see globals.css) so the accent can be swapped per
// business category at runtime via the `data-accent` attribute.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong-rgb) / <alpha-value>)",
        "accent-soft": "var(--accent-soft)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted-rgb) / <alpha-value>)",
        line: "var(--line)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent-rgb) / 0.45), 0 12px 40px -12px rgb(var(--accent-rgb) / 0.55)",
        "glow-lg": "0 0 0 1px rgb(var(--accent-rgb) / 0.55), 0 24px 70px -16px rgb(var(--accent-rgb) / 0.7)",
        card: "0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 20px 50px -30px rgb(0 0 0 / 0.8)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
    },
  },
  plugins: [],
};

export default config;
