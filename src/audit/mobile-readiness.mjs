/**
 * 🔴 F25 · MOBILE READINESS (acceptance _handoffs b56655a). Pure: handed one page's stored HTML and, where they exist, its renders'
 * state and layout facts; returns counts only. It never sees a path, an id, a host list or a client.
 *
 * Two sets, kept apart (RR-137 §4):
 *   FROM THE STORED HTML     C2 · the viewport declaration — present or absent, width, zoom restriction
 *   FROM A COMPLETE RENDER   C4 · horizontal overflow at the declared mobile width · C5 · tap targets · C6 · mobile against desktop
 *                            words — each NOT MEASURED, with the render's reason, unless its render(s) are COMPLETE (C3)
 *
 * Guidance, named: the CSS viewport `<meta name="viewport">` properties; WCAG 2.2 SC 1.4.4 Resize Text (200 percent) for the zoom
 * restriction; WCAG 2.2 SC 2.5.8 Target Size (Minimum) — 24 by 24 CSS pixels, or a 24-pixel circle centred on the target that intersects
 * no other target and no other undersized target's circle.
 */
import { elementsOnly, multisetDiff, wordsOf } from "./render-compare.mjs";

export const NOT_MEASURED = "NOT MEASURED";
export const TARGET_MIN_CSS_PX = 24;
const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};

/** C2 · the page's viewport declaration, read from its stored HTML outside comments, scripts, styles and templates. */
export function viewportOf(html) {
  const metas = [...elementsOnly(html).matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).filter((t) => (attr(t, "name") ?? "").trim().toLowerCase() === "viewport");
  if (metas.length === 0) return { state: "ABSENT" };
  if (metas.length > 1) return { state: "MULTIPLE", count: metas.length };
  const content = attr(metas[0], "content");
  const props = {};
  for (const part of String(content ?? "").split(/[,;]/)) {
    const m = /^\s*([a-z-]+)\s*=\s*([^\s]+)\s*$/i.exec(part);
    if (m) props[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  if (content === null || Object.keys(props).length === 0) return { state: "UNPARSEABLE" };
  const max = props["maximum-scale"] === undefined ? null : Number(props["maximum-scale"]);
  const zoomRestricted = props["user-scalable"] === "no" || props["user-scalable"] === "0" || (max !== null && Number.isFinite(max) && max < 2);
  return { state: "PRESENT", deviceWidth: props.width === "device-width", zoomRestricted, props };
}

const nm = (render, what) => ({ state: NOT_MEASURED, reason: `${what}: the render is ${render?.renderState ?? "absent"}${render?.reason ? ` — ${render.reason}` : ""}; measured only from a COMPLETE render` });

/** C4 · horizontal overflow at the declared width, from a COMPLETE mobile render's layout. */
export function responsiveOf(mobile) {
  if (mobile?.renderState !== "COMPLETE" || !mobile.layout) return nm(mobile, "responsive rendering");
  const over = Math.max(0, Math.round(mobile.layout.scrollWidth - mobile.layout.viewportWidth));
  return over > 0 ? { state: "HORIZONTAL_OVERFLOW", overflowPx: over, viewportWidth: mobile.layout.viewportWidth } : { state: "FITS", viewportWidth: mobile.layout.viewportWidth };
}

/** C5 · WCAG 2.2 SC 2.5.8 over the visible targets of a COMPLETE mobile render. A target: { x, y, w, h, visible }. */
export function tapTargetsOf(mobile) {
  if (mobile?.renderState !== "COMPLETE" || !mobile.layout) return nm(mobile, "tap targets");
  const ts = mobile.layout.targets.filter((t) => t.visible && t.w > 0 && t.h > 0);
  const small = (t) => t.w < TARGET_MIN_CSS_PX || t.h < TARGET_MIN_CSS_PX;
  const centre = (t) => ({ cx: t.x + t.w / 2, cy: t.y + t.h / 2 });
  const r = TARGET_MIN_CSS_PX / 2;
  const circleHitsBox = (c, b) => { const dx = c.cx - Math.max(b.x, Math.min(c.cx, b.x + b.w)); const dy = c.cy - Math.max(b.y, Math.min(c.cy, b.y + b.h)); return dx * dx + dy * dy < r * r; };
  const circlesMeet = (a, b) => (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2 < (2 * r) ** 2;
  let undersized = 0;
  ts.forEach((t, i) => {
    if (!small(t)) return;
    const c = centre(t);
    const hits = ts.some((o, j) => j !== i && (circleHitsBox(c, o) || (small(o) && circlesMeet(c, centre(o)))));
    if (hits) undersized += 1;
  });
  return { state: undersized > 0 ? "UNDERSIZED_FOUND" : "ALL_SUFFICIENT", targets: ts.length, undersized, smallButSpaced: ts.filter(small).length - undersized };
}

/** C6 · visible-text words of a COMPLETE desktop render absent from a COMPLETE mobile render (and the reverse); no importance judged. */
export function mobileContentOf(mobile, desktop) {
  if (mobile?.renderState !== "COMPLETE") return nm(mobile, "mobile content (mobile render)");
  if (desktop?.renderState !== "COMPLETE") return nm(desktop, "mobile content (desktop render)");
  if (mobile.visibleText == null || desktop.visibleText == null) return { state: NOT_MEASURED, reason: "a render's visible text was not read" };
  const d = multisetDiff(wordsOf(desktop.visibleText), wordsOf(mobile.visibleText));
  /* multisetDiff(source=desktop, render=mobile): onlyInSource = desktop words missing on mobile; onlyInRender = mobile-only */
  return { state: d.onlyInSource === 0 && d.onlyInRender === 0 ? "SAME" : "DIFFERS", missingOnMobile: d.onlyInSource, mobileOnly: d.onlyInRender };
}

/** One page, all four measures. */
export function assessPage({ html, mobile = null, desktop = null }) {
  return { viewport: viewportOf(html), responsive: responsiveOf(mobile), tapTargets: tapTargetsOf(mobile), mobileContent: mobileContentOf(mobile, desktop) };
}

/** C7 · the population, count-only, each measure with its denominator; INCOMPLETE whenever anything is NOT MEASURED. */
export function summariseMobile(assessments, { pagesWithoutBody = 0 } = {}) {
  const pages = assessments.length + pagesWithoutBody;
  const tally = (key) => assessments.reduce((m, a) => ((m[a[key].state] = (m[a[key].state] ?? 0) + 1), m), pagesWithoutBody ? { [NOT_MEASURED]: pagesWithoutBody } : {});
  const viewport = tally("viewport");
  const zoomRestricted = assessments.filter((a) => a.viewport.zoomRestricted).length;
  const deviceWidth = assessments.filter((a) => a.viewport.deviceWidth).length;
  const targets = assessments.reduce((n, a) => n + (a.tapTargets.targets ?? 0), 0);
  const undersized = assessments.reduce((n, a) => n + (a.tapTargets.undersized ?? 0), 0);
  const out = { pages, pagesWithoutBody, viewport, viewportDeviceWidth: deviceWidth, viewportZoomRestricted: zoomRestricted, responsive: tally("responsive"), tapTargets: { ...tally("tapTargets"), targets, undersized }, mobileContent: tally("mobileContent") };
  out.incomplete = pagesWithoutBody > 0 || ["viewport", "responsive", "tapTargets", "mobileContent"].some((k) => assessments.some((a) => a[k].state === NOT_MEASURED));
  return out;
}
