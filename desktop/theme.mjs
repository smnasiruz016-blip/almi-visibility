/**
 * 🔴 THE SUNRISE LOOK (RR-299 B; owner decision 2: "almiworld ki color scheme … sunrise"). AlmiWorld's own colours and font, READ from the
 * owner's sites on 20 Oct 2026 (almiworld.com and almioet.almiworld.com: its theme CSS names --color-almi-*), never invented:
 *   cream #FFFBF5 · peach #FFE8D6 · coral #FF7A6B (deep #FF6B5B) · sunrise #F4A340 (deep #E08E2A) · ink #1A1A2E · text #334155 ·
 *   muted #475569 · teal #0D9488 · night #14110D with gold #D4A24C (the footer) · white · font Inter.
 * The maker's logo ("almi world · live beautifully") is the owner's own image (desktop/brand/almiworld-logo.png), cropped, never redrawn.
 * READABLE: every text-on-background pair the app uses is checked against WCAG 2.1 AA (4.5:1 for text; 3:1 for large text and edges).
 */
export const SUNRISE = Object.freeze({
  cream: "#FFFBF5", peach: "#FFE8D6", coral: "#FF7A6B", coralDeep: "#FF6B5B", sunrise: "#F4A340", sunriseDeep: "#E08E2A",
  ink: "#1A1A2E", text: "#334155", muted: "#475569", teal: "#0D9488", night: "#14110D", gold: "#D4A24C", white: "#FFFFFF",
  font: "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
});
export const SOURCE = Object.freeze({ readOn: "2026-10-20", from: ["https://almiworld.com/", "https://almioet.almiworld.com/ (its theme CSS)"], requests: 5 });

const lum = (hex) => { const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** Every pair the app paints: [what, foreground, background, minimum ratio]. */
export const PAIRS = Object.freeze([
  ["body text on cream", SUNRISE.text, SUNRISE.cream, 4.5],
  ["headings on cream", SUNRISE.ink, SUNRISE.cream, 4.5],
  ["muted text on white cards", SUNRISE.muted, SUNRISE.white, 4.5],
  ["button text on coral", SUNRISE.ink, SUNRISE.coral, 4.5],
  ["button text on sunrise", SUNRISE.ink, SUNRISE.sunrise, 4.5],
  ["state badge on peach", SUNRISE.ink, SUNRISE.peach, 4.5],
  ["gold on night (footer, dark mode)", SUNRISE.gold, SUNRISE.night, 4.5],
  ["cream on night (dark mode text)", SUNRISE.cream, SUNRISE.night, 4.5],
  ["teal focus ring on cream (an edge)", SUNRISE.teal, SUNRISE.cream, 3],
].map(Object.freeze));
export const readable = () => PAIRS.map(([what, fg, bg, min]) => Object.freeze({ what, ratio: Math.round(contrast(fg, bg) * 100) / 100, min, ok: contrast(fg, bg) >= min }));

/** The CSS custom properties the app's page uses — from SUNRISE, so the page and the check can never differ. */
export const cssVariables = () => `:root{${Object.entries(SUNRISE).filter(([k]) => k !== "font").map(([k, v]) => `--${k}:${v}`).join(";")};--font:${SUNRISE.font}}`;
