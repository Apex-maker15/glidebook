import type { Config } from "tailwindcss";

// Every colour is a CSS variable (see globals.css) so light/dark and the
// per-business accent are swapped at runtime via `data-theme` / `data-accent`.
// `white` and `black` are deliberately aliased: "white" is a foreground tint
// that works on both themes, "black" is the text colour that sits on the accent.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Crisp corners everywhere. Components still say rounded-2xl/3xl; the scale is what changed.
    borderRadius: {
      none: "0",
      sm: "2px",
      DEFAULT: "3px",
      md: "4px",
      lg: "5px",
      xl: "6px",
      "2xl": "8px",
      "3xl": "8px",
      full: "9999px",
    },
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
        ok: "rgb(var(--ok-rgb) / <alpha-value>)",
        warn: "rgb(var(--warn-rgb) / <alpha-value>)",
        bad: "rgb(var(--bad-rgb) / <alpha-value>)",
        info: "rgb(var(--info-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
