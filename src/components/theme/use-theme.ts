"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readTheme, type Theme } from "./theme";

function subscribe(onChange: () => void) {
  window.addEventListener("gb-theme", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    window.removeEventListener("gb-theme", onChange);
    observer.disconnect();
  };
}

/** Current theme, kept in sync with the <html data-theme> attribute. Server renders as light. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  return [theme, applyTheme];
}
