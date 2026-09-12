/** Tiny color helpers for the hue-based covers (startups, communities, events). */

function toHex(n: number) {
  return Math.round(n * 255).toString(16).padStart(2, '0');
}

/** HSL (h 0–360, s/l 0–100) → #rrggbb. */
export function hsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = s / 100;
  const ll = l / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Muted two-stop gradient for a hue. Deliberately low-saturation so covers sit
 * inside the warm-black / ivory brand instead of fighting it.
 */
export function hueGradient(hue: number, dark: boolean): [string, string] {
  return dark
    ? [hsl(hue, 30, 24), hsl(hue + 36, 18, 11)]
    : [hsl(hue, 42, 84), hsl(hue + 36, 30, 93)];
}

/** Readable accent for a hue on the current background. */
export function hueInk(hue: number, dark: boolean): string {
  return dark ? hsl(hue, 45, 72) : hsl(hue, 45, 32);
}

/** Stable pseudo-random hue from any string (names, ids). */
export function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Adds alpha to a #rrggbb color. */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  return `${hex}${v}`;
}
