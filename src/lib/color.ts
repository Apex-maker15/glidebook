/** Colour helpers for per-provider accents (all pure, safe on server and client). */

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Blend `rgb` towards `target` (0 = unchanged, 1 = target). */
function mix(rgb: [number, number, number], target: [number, number, number], amount: number): [number, number, number] {
  return [rgb[0] + (target[0] - rgb[0]) * amount, rgb[1] + (target[1] - rgb[1]) * amount, rgb[2] + (target[2] - rgb[2]) * amount];
}

/**
 * CSS variables for a custom accent. Mirrors the category blocks in globals.css:
 * a darker "strong" for light mode and a lighter one for dark mode, so text on
 * paper and text on charcoal both stay readable.
 */
export function accentVars(hex: string | null | undefined): Record<string, string> {
  const rgb = hex ? hexToRgb(hex) : null;
  if (!rgb) return {};
  const strongLight = mix(rgb, [0, 0, 0], 0.3);
  const strongDark = mix(rgb, [255, 255, 255], 0.4);
  const f = (c: [number, number, number]) => c.map((n) => Math.round(n)).join(" ");
  return {
    "--accent": toHex(rgb),
    "--accent-rgb": f(rgb),
    "--accent-strong-light": toHex(strongLight),
    "--accent-strong-light-rgb": f(strongLight),
    "--accent-strong-dark": toHex(strongDark),
    "--accent-strong-dark-rgb": f(strongDark),
    "--accent-soft": `rgb(${f(rgb)} / 0.12)`,
  };
}

/** Readable text colour (dark or light) for a solid fill of `hex`. */
export function onColor(hex: string): "#0c0b0a" | "#ffffff" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#0c0b0a";
  const [r, g, b] = rgb.map((c) => c / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#0c0b0a" : "#ffffff";
}
