/**
 * 🔴 F25 · MOBILE READINESS (acceptance _handoffs b56655a). Pure: handed one page's stored HTML and, where they exist, its renders'
 * state and layout facts; returns counts only. It never sees a path, an id, a host list or a client.
 *
 * Two sets, kept apart (RR-137 §4):
 *   FROM THE STORED HTML     C2 · the viewport declaration — present or absent, width, zoom restriction
 *   FROM A COMPLETE RENDER   C4 · horizontal overflow at the declared mobile width · C5 · tap targets · C6 · mobile against desktop
 *                            words — each NOT MEASURED, with the render's reason, unless its render(s) are COMPLETE (C3)
 *   AMENDMENT 1 (24cd44f)    an OWN-SITE COMPLETE render — only outside hosts refused, nothing of the page's own site refused, settled in
 *                            time — counts as COMPLETE for F25 (measurableBasisOf); its refusals are carried on every measure from it
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

const nm = (render, what) => ({ state: NOT_MEASURED, reason: `${what}: the render is ${render?.renderState ?? "absent"}${render?.reason ? ` — ${render.reason}` : ""}; measured only from a COMPLETE render (or an OWN-SITE COMPLETE one, Amendment 1)` });

/**
 * C3 · Amendment 1 (_handoffs 24cd44f, the owner's declaration 12ecf91): may a render be measured, and on what basis?
 *   COMPLETE           the render state is COMPLETE.
 *   OWN_SITE_COMPLETE  the render state is PARTIAL, and EVERY refused request was to a host that is not one of the page's declared site
 *                      hosts (`ownHosts`), none was refused on the page's own site, none was left unaccounted (an unaccounted request makes
 *                      the render FAILED, render-state.mjs) and it settled inside its per-page bound (timedOut === false, recorded).
 * Anything else — FAILED, a refusal on the page's own site, a render that did not settle, a PARTIAL render whose refusals cannot be told
 * apart by host, or no declared site hosts at all — is not measurable. The render state itself is never changed here.
 */
export function measurableBasisOf(render, ownHosts = null) {
  if (render?.renderState === "COMPLETE") return { basis: "COMPLETE" };
  if (render?.renderState !== "PARTIAL" || render.timedOut !== false || !(ownHosts instanceof Set) || ownHosts.size === 0) return null;
  const byHost = render.requests?.byHost;
  if (!byHost || !Number.isInteger(render.requests?.refused) || render.requests.refused < 1) return null;
  let outside = 0;
  for (const [host, h] of Object.entries(byHost)) {
    if (!h.refused) continue;
    if (ownHosts.has(host)) return null;
    outside += h.refused;
  }
  if (outside !== render.requests.refused) return null;
  return { basis: "OWN_SITE_COMPLETE", refusedOutside: outside, refusedByReason: { ...(render.requests.refusedByReason ?? {}) } };
}
/* a measure from a COMPLETE render reads exactly as before Amendment 1; one from an OWN-SITE COMPLETE render carries its basis and refusals */
const basisFields = (b) => (b.basis === "COMPLETE" ? {} : { basis: b.basis, refusedOutside: b.refusedOutside, refusedByReason: b.refusedByReason });

/** C4 · horizontal overflow at the declared width, from a COMPLETE (or OWN-SITE COMPLETE) mobile render's layout. */
export function responsiveOf(mobile, ownHosts = null) {
  const b = measurableBasisOf(mobile, ownHosts);
  if (!b || !mobile.layout) return nm(mobile, "responsive rendering");
  const over = Math.max(0, Math.round(mobile.layout.scrollWidth - mobile.layout.viewportWidth));
  return over > 0 ? { state: "HORIZONTAL_OVERFLOW", overflowPx: over, viewportWidth: mobile.layout.viewportWidth, ...basisFields(b) } : { state: "FITS", viewportWidth: mobile.layout.viewportWidth, ...basisFields(b) };
}

/** C5 · WCAG 2.2 SC 2.5.8 over the visible targets of a COMPLETE (or OWN-SITE COMPLETE) mobile render. A target: { x, y, w, h, visible }. */
export function tapTargetsOf(mobile, ownHosts = null) {
  const b = measurableBasisOf(mobile, ownHosts);
  if (!b || !mobile.layout) return nm(mobile, "tap targets");
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
  return { state: undersized > 0 ? "UNDERSIZED_FOUND" : "ALL_SUFFICIENT", targets: ts.length, undersized, smallButSpaced: ts.filter(small).length - undersized, ...basisFields(b) };
}

/** C6 · visible-text words of a COMPLETE desktop render absent from a COMPLETE mobile render (and the reverse); no importance judged.
 *  Either render may be OWN-SITE COMPLETE (Amendment 1); both bases are reported. */
export function mobileContentOf(mobile, desktop, ownHosts = null) {
  const bm = measurableBasisOf(mobile, ownHosts);
  const bd = measurableBasisOf(desktop, ownHosts);
  if (!bm) return nm(mobile, "mobile content (mobile render)");
  if (!bd) return nm(desktop, "mobile content (desktop render)");
  if (mobile.visibleText == null || desktop.visibleText == null) return { state: NOT_MEASURED, reason: "a render's visible text was not read" };
  const d = multisetDiff(wordsOf(desktop.visibleText), wordsOf(mobile.visibleText));
  /* multisetDiff(source=desktop, render=mobile): onlyInSource = desktop words missing on mobile; onlyInRender = mobile-only */
  const own = bm.basis !== "COMPLETE" || bd.basis !== "COMPLETE" ? { mobileBasis: { basis: bm.basis, ...basisFields(bm) }, desktopBasis: { basis: bd.basis, ...basisFields(bd) } } : {};
  return { state: d.onlyInSource === 0 && d.onlyInRender === 0 ? "SAME" : "DIFFERS", missingOnMobile: d.onlyInSource, mobileOnly: d.onlyInRender, ...own };
}

/** One page, all four measures. `ownHosts`: the page's declared site hosts (a Set) — needed only for OWN-SITE COMPLETE (Amendment 1). */
export function assessPage({ html, mobile = null, desktop = null, ownHosts = null }) {
  return { viewport: viewportOf(html), responsive: responsiveOf(mobile, ownHosts), tapTargets: tapTargetsOf(mobile, ownHosts), mobileContent: mobileContentOf(mobile, desktop, ownHosts) };
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
  /* Amendment 1: a render measured as OWN-SITE COMPLETE still says what it refused — counted per render (the mobile render once, from C4;
   * the desktop render once, from C6), never summed into a pass */
  const ownSite = { renders: 0, refusedOutside: 0, refusedByReason: {} };
  const addBasis = (b) => {
    if (b?.basis !== "OWN_SITE_COMPLETE") return;
    ownSite.renders += 1;
    ownSite.refusedOutside += b.refusedOutside;
    for (const [k, n] of Object.entries(b.refusedByReason)) ownSite.refusedByReason[k] = (ownSite.refusedByReason[k] ?? 0) + n;
  };
  for (const a of assessments) { addBasis(a.responsive.state === NOT_MEASURED ? null : a.responsive); addBasis(a.mobileContent.desktopBasis); }
  const out = { pages, pagesWithoutBody, viewport, viewportDeviceWidth: deviceWidth, viewportZoomRestricted: zoomRestricted, responsive: tally("responsive"), tapTargets: { ...tally("tapTargets"), targets, undersized }, mobileContent: tally("mobileContent"), ownSite };
  out.incomplete = pagesWithoutBody > 0 || ["viewport", "responsive", "tapTargets", "mobileContent"].some((k) => assessments.some((a) => a[k].state === NOT_MEASURED));
  return out;
}
