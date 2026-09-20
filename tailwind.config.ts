import type { Config } from "tailwindcss";

// Every colour is a CSS variable (see globals.css) so light/dark and the
// per-business accent are swapped at runtime via `data-theme` / `data-accent`.
// `white` and `black` are deliberately aliased: "white" is a foreground tint
// that works on both themes, "black" is the text colour that sits on the accent.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: "rgb(var(--tint-rgb) / <alpha-value>)",
        black: "var(--on-accent)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-strong": "rgb(var(--accent-strong-rgb) / <alpha-value>)",
        "accent-soft": "var(--accent-soft)",
        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted-rgb) / <alpha-value>)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent-rgb) / 0.35), 0 12px 32px -14px rgb(var(--accent-rgb) / 0.5)",
        "glow-lg": "0 0 0 1px rgb(var(--accent-rgb) / 0.45), 0 24px 60px -18px rgb(var(--accent-rgb) / 0.6)",
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
    },
  },
  plugins: [],
};

export default config;
