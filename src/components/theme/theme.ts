export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "gb-theme";

/**
 * Runs inline in <head> before paint so the first frame already has the right
 * theme: the saved choice wins, otherwise the OS preference.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode: the choice just doesn't persist */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0d0d10" : "#f6f3ec");
  window.dispatchEvent(new Event("gb-theme"));
}
