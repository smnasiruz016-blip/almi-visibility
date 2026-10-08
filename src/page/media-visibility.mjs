/**
 * F92 · IMAGE AND VIDEO VISIBILITY — the images and videos a page relies on, whether they are described, whether a description is
 * truthful (a recorded judgement only), whether structured and sitemap media agree with the visible media, and media recommended only
 * where a recorded need asks for it (acceptance _handoffs 06cdb82, RR-216; approved by its hash 12c52f31…, contract 70f54ee5…).
 *
 *   C1  the media a page relies on, by declared markers: img (alone or in picture) with a src, video with a src or a source child, an iframe on
 *       a declared video host. A decorative claim (F26's: empty alternative, hidden, role presentation/none) is listed, never decided. Media a
 *       script or a style inserts is not in a stored body: NOT MEASURED. No media → NO MEDIA, never a finding.
 *   C2  alt presence is F26's result, READ per image through F26's own assessment (F92 never counts alt attributes); a video is described
 *       by a VideoObject with name and description, a captions/subtitles/descriptions track, or an iframe title.
 *   C3  truthful and adequate only by a recorded judgement from a lawful source (F40's law: a registered provider's recorded call, or a
 *       fixture judgement in a fixture run); otherwise NOT MEASURED, the missing judge named.
 *   C4  structured (F48's valid blocks) and og media URLs against the visible media; a video with no VideoObject and no recorded sitemap
 *       video entry is a finding; sitemap media compared only where a recorded capture holds media entries, otherwise NOT MEASURED.
 *   C5  media recommended only from a recorded need naming a media format; otherwise NOT MEASURED.
 *   C6  PRESENT / CONSISTENT / a FINDING / NOT MEASURED — never a default; F31's bound on every result; one tenant; read-only.
 *   C7  F92 changes no other row.
 *
 * Pure. Records in, findings out. No file, no network, no provider, no store.
 */
import { decideResolvedTenants } from "../tenancy/scope.mjs";
import { assessPage as f26Assess, scannable } from "../audit/accessibility.mjs";
import { discoverBlocks } from "./structured-data.mjs";

export const SIGNAL = Object.freeze({ PRESENT: "PRESENT", CONSISTENT: "CONSISTENT", NO_MEDIA: "NO MEDIA", FINDING: "FINDING", NOT_MEASURED: "NOT MEASURED" });
export const VIDEO_HOSTS = Object.freeze(["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com", "player.vimeo.com"]);
export const TRACK_KINDS = Object.freeze(["captions", "subtitles", "descriptions"]);
export const DESCRIPTION_CRITERION = "F92-media-description";
export const NOT_IN_A_STORED_BODY = "NOT MEASURED — media a script or a style inserts (a background image) is not in a stored body";
export const DECORATIVE_NOT_DECIDED = "NOT MEASURED — a decorative claim (F26's) is listed, never decided by F92";
export const NO_LAWFUL_JUDGE = "NOT MEASURED — no lawful judge: no registered provider's recorded call, and no fixture judgement in a fixture run, judged this description";
export const NO_SITEMAP_MEDIA = "NOT MEASURED — the recorded sitemap capture holds no image or video entries";
export const NO_MEDIA_NEED = "NOT MEASURED — no recorded need names a media format for this page";
export const STANDING = "findings only — F92 writes, generates or inserts no media, alt text, caption, title, transcript, sitemap entry or recommendation of its own, fetches nothing and changes no other row";

const present = (s) => typeof s === "string" && s.trim() !== "";
const sameTenant = (a, b) => decideResolvedTenants(a, b).allowed === true;
const attrOf = (tag, name) => { const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag); return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null; };
const resolveUrl = (u, base) => { try { const x = new URL(String(u).trim(), base ?? undefined); x.hash = ""; return x.href; } catch { return null; } };

/* ── C1 · the media a page relies on ── */
/** F26's own verdict on one image tag — read, never measured again (C2). */
function f26Image(tag) {
  const r = f26Assess(`<html lang="x"><title>x</title>${tag}</html>`);
  return r.machine["img-alt"] > 0 ? "MISSING" : r.person["decorative-claim"] > 0 ? "DECORATIVE" : r.person["alt-adequate"] > 0 ? "PRESENT" : "UNREAD";
}
export function mediaOf(html, pageUrl = null) {
  const s = scannable(html);
  const media = [], decorative = [], notListed = [];
  for (const m of s.matchAll(/<img\b[^>]*>/gi)) {
    const t = m[0], src = attrOf(t, "src");
    const f26 = f26Image(t);
    if (f26 === "DECORATIVE") { decorative.push(Object.freeze({ kind: "image", src: present(src) ? resolveUrl(src, pageUrl) : null, why: DECORATIVE_NOT_DECIDED })); continue; }
    if (!present(src)) { notListed.push(Object.freeze({ kind: "image", why: "an img with no src — not listed" })); continue; }
    media.push(Object.freeze({ kind: "image", src: resolveUrl(src, pageUrl), f26 }));
  }
  for (const m of s.matchAll(/<svg\b[^>]*>/gi)) {
    const r = f26Assess(`<html lang="x"><title>x</title>${m[0]}</svg></html>`);
    if (r.person["decorative-claim"] > 0) decorative.push(Object.freeze({ kind: "inline-svg", src: null, why: DECORATIVE_NOT_DECIDED }));
    else notListed.push(Object.freeze({ kind: "inline-svg", why: "NOT MEASURED — an inline graphic is not on the declared media list" }));
  }
  for (const m of s.matchAll(/(<video\b[^>]*>)([\s\S]*?)<\/video\s*>/gi)) {
    const srcs = [attrOf(m[1], "src"), ...[...m[2].matchAll(/<source\b[^>]*>/gi)].map((x) => attrOf(x[0], "src"))].filter(present).map((u) => resolveUrl(u, pageUrl)).filter(Boolean);
    if (!srcs.length) { notListed.push(Object.freeze({ kind: "video", why: "a video with no src and no source — not listed" })); continue; }
    const tracks = [...m[2].matchAll(/<track\b[^>]*>/gi)].map((x) => (attrOf(x[0], "kind") ?? "").toLowerCase()).filter((k) => TRACK_KINDS.includes(k));
    media.push(Object.freeze({ kind: "video", src: srcs[0], srcs: Object.freeze(srcs), tracks: Object.freeze(tracks), title: null }));
  }
  for (const m of s.matchAll(/<iframe\b[^>]*>/gi)) {
    const src = resolveUrl(attrOf(m[0], "src") ?? "", pageUrl);
    let host = null; try { host = src ? new URL(src).hostname.toLowerCase() : null; } catch { host = null; }
    if (!host || !VIDEO_HOSTS.includes(host)) continue;
    const title = attrOf(m[0], "title");
    media.push(Object.freeze({ kind: "video", src, srcs: Object.freeze([src]), tracks: Object.freeze([]), title: present(title) ? title : null }));
  }
  return Object.freeze({ media: Object.freeze(media), decorative: Object.freeze(decorative), notListed: Object.freeze(notListed), notInBody: NOT_IN_A_STORED_BODY });
}

/* ── C4 · the media the structured data and og tags name ── */
const BLOCK = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const typesOf = (n) => [].concat(n?.["@type"] ?? []).filter((t) => typeof t === "string");
const urlsOf = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(urlsOf) : v && typeof v === "object" && typeof v.url === "string" ? [v.url] : v && typeof v === "object" && typeof v.contentUrl === "string" ? [v.contentUrl] : []);
function walk(node, out) {
  if (Array.isArray(node)) { for (const n of node) walk(n, out); return out; }
  if (!node || typeof node !== "object") return out;
  const t = typesOf(node);
  if (t.includes("ImageObject") || t.includes("VideoObject")) {
    const kind = t.includes("VideoObject") ? "video" : "image";
    for (const k of ["contentUrl", "url", "thumbnailUrl"]) for (const u of urlsOf(node[k])) out.named.push({ kind: k === "thumbnailUrl" ? "image" : kind, from: `${kind === "video" ? "VideoObject" : "ImageObject"}.${k}`, url: u });
    if (kind === "video") out.videoObjects.push({ name: node.name, description: node.description, urls: ["contentUrl", "url", "embedUrl"].flatMap((k) => urlsOf(node[k])) });
  }
  for (const k of ["image", "video"]) if (node[k] !== undefined && !(typesOf(node[k]).length)) for (const u of urlsOf(node[k])) out.named.push({ kind: k, from: `${k} property`, url: u });
  for (const [k, v] of Object.entries(node)) if (v && typeof v === "object" && !["contentUrl", "url", "thumbnailUrl"].includes(k)) walk(v, out);
  return out;
}
/** The media URLs the page's structured data names — only from the blocks F48 discovered VALID, in F48's order. */
export function namedMediaOf(html, pageUrl = null) {
  const verdicts = discoverBlocks(html);
  const raw = [...String(html ?? "").matchAll(BLOCK)].map((m) => m[1]);
  if (raw.length !== verdicts.length) return Object.freeze({ named: Object.freeze([]), videoObjects: Object.freeze([]), fault: "the blocks do not line up with F48's discovery — NOT MEASURED" });
  const out = { named: [], videoObjects: [] };
  raw.forEach((b, i) => { if (verdicts[i].valid) walk(JSON.parse(b), out); });
  for (const m of String(html ?? "").matchAll(/<meta\b[^>]*>/gi)) {
    const p = (attrOf(m[0], "property") ?? "").toLowerCase(), c = attrOf(m[0], "content");
    if (present(c) && (p === "og:image" || p === "og:video")) out.named.push({ kind: p === "og:image" ? "image" : "video", from: p, url: c });
  }
  return Object.freeze({
    named: Object.freeze(out.named.map((n) => Object.freeze({ ...n, url: resolveUrl(n.url, pageUrl) })).filter((n) => n.url)),
    videoObjects: Object.freeze(out.videoObjects.map((v) => Object.freeze({ ...v, urls: v.urls.map((u) => resolveUrl(u, pageUrl)).filter(Boolean) }))),
    fault: null,
  });
}

/* ── C2 · described ── */
export function describedOf(item, videoObjects = []) {
  if (item.kind === "image") {
    if (item.f26 === "MISSING") return Object.freeze({ signal: SIGNAL.FINDING, why: "an image with no text alternative attribute (F26's img-alt check)" });
    if (item.f26 === "PRESENT") return Object.freeze({ signal: SIGNAL.PRESENT, by: "F26: a non-empty text alternative" });
    return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: "F26's assessment gave no presence result for this image" });
  }
  const vo = videoObjects.find((v) => v.urls.some((u) => item.srcs.includes(u)) && present(v.name) && present(v.description));
  if (vo) return Object.freeze({ signal: SIGNAL.PRESENT, by: "a VideoObject with a name and a description" });
  if (item.tracks.length) return Object.freeze({ signal: SIGNAL.PRESENT, by: `a ${item.tracks[0]} track` });
  if (present(item.title)) return Object.freeze({ signal: SIGNAL.PRESENT, by: "the iframe title" });
  return Object.freeze({ signal: SIGNAL.FINDING, why: "a video with no VideoObject name and description, no captions, subtitles or descriptions track, and no iframe title" });
}

/* ── C3 · truthful and adequate: a recorded judgement only ── */
export function judgedOf(item, described, given, { population, registeredProviders = [] }) {
  if (described.signal !== SIGNAL.PRESENT) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: "NOT MEASURED — no description to judge" });
  if (!given) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_LAWFUL_JUDGE });
  const s = given.source ?? {};
  const refuse = (why) => Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: `refused: ${why} — ${NO_LAWFUL_JUDGE}` });
  if (!present(s.kind) || s.kind === "PERSON" || s.kind === "OWNER") return refuse(`a judgement's source is a registered provider's recorded call or a fixture, never ${present(s.kind) ? s.kind.toLowerCase() : "unnamed"}`);
  if (s.kind === "FIXTURE" && population !== "FIXTURE") return refuse("a fixture judgement is never carried into a real run");
  if (s.kind === "AGENT" && !(registeredProviders.includes(s.provider) && present(s.callRef))) return refuse("the provider is not registered or its call is not recorded");
  if (!["FIXTURE", "AGENT"].includes(s.kind)) return refuse(`unknown judgement source ${s.kind}`);
  if (given.criterionId !== DESCRIPTION_CRITERION) return refuse(`the judgement names criterion ${given.criterionId ?? "none"}, not ${DESCRIPTION_CRITERION}`);
  if (!present(given.observation)) return refuse("the judgement records no observation");
  if (!["PASS", "FAIL"].includes(given.verdict)) return refuse("a recorded judgement is PASS or FAIL");
  return Object.freeze({ signal: given.verdict === "PASS" ? SIGNAL.PRESENT : SIGNAL.FINDING, verdict: given.verdict, observation: given.observation, source: Object.freeze({ ...s }) });
}

/* ── C4 · consistent with the visible media ── */
export function consistencyOf({ media, named, videoObjects, sitemapMedia, pageUrl }) {
  const visible = new Set(media.flatMap((m) => m.srcs ?? [m.src]));
  const structured = named.map((n) => Object.freeze({ ...n, signal: visible.has(n.url) ? SIGNAL.CONSISTENT : SIGNAL.FINDING, why: visible.has(n.url) ? null : `${n.from} names a media URL no visible media carries` }));
  let sitemap;
  if (!Array.isArray(sitemapMedia)) sitemap = Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_SITEMAP_MEDIA, entries: Object.freeze([]) });
  else {
    const own = sitemapMedia.filter((e) => resolveUrl(e.pageUrl) === resolveUrl(pageUrl));
    sitemap = Object.freeze({ signal: own.length ? (own.every((e) => visible.has(resolveUrl(e.mediaUrl))) ? SIGNAL.CONSISTENT : SIGNAL.FINDING) : SIGNAL.NO_MEDIA,
      entries: Object.freeze(own.map((e) => Object.freeze({ kind: e.kind, url: resolveUrl(e.mediaUrl), signal: visible.has(resolveUrl(e.mediaUrl)) ? SIGNAL.CONSISTENT : SIGNAL.FINDING }))) });
  }
  const sitemapVideos = new Set((Array.isArray(sitemapMedia) ? sitemapMedia : []).filter((e) => e.kind === "video" && resolveUrl(e.pageUrl) === resolveUrl(pageUrl)).map((e) => resolveUrl(e.mediaUrl)));
  const videos = media.filter((m) => m.kind === "video").map((v) => {
    const hasVO = videoObjects.some((o) => o.urls.some((u) => v.srcs.includes(u)));
    const hasSM = v.srcs.some((u) => sitemapVideos.has(u));
    return Object.freeze({ src: v.src, signal: hasVO || hasSM ? SIGNAL.PRESENT : SIGNAL.FINDING, why: hasVO || hasSM ? null : "a video with no structured-data VideoObject and no recorded sitemap video entry" });
  });
  return Object.freeze({ structured: Object.freeze(structured), sitemap, videos: Object.freeze(videos) });
}

/* ── C5 · media recommended only where a recorded need asks ── */
export function recommendationOf(need) {
  if (!need || !present(need.mediaFormat) || !present(need.ref)) return Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: NO_MEDIA_NEED });
  return Object.freeze({ signal: SIGNAL.PRESENT, needId: need.needId ?? null, format: need.mediaFormat, ref: need.ref });
}

const boundOf = (v) => Object.freeze({ state: present(v?.state) ? v.state : "UNKNOWN", text: present(v?.bound) ? v.bound : "no completeness verdict recorded (F31)" });

/** One page: C1–C5. */
export function assessMedia({ pageId, url = null, html, judgements = [], population = "REAL", registeredProviders = [], sitemapMedia = null, need = null }) {
  if (!present(html)) return Object.freeze({ pageId, measured: false, why: "NOT MEASURED — no stored body for this page" });
  const { media, decorative, notListed, notInBody } = mediaOf(html, url);
  const { named, videoObjects, fault } = namedMediaOf(html, url);
  const items = media.map((m) => {
    const described = describedOf(m, videoObjects);
    const given = judgements.find((j) => j?.pageId === pageId && j?.src === m.src);
    return Object.freeze({ ...m, described, judged: judgedOf(m, described, given, { population, registeredProviders }) });
  });
  return Object.freeze({
    pageId, measured: true,
    media: media.length ? SIGNAL.PRESENT : SIGNAL.NO_MEDIA,
    items: Object.freeze(items), decorative, notListed, notInBody,
    consistency: fault ? Object.freeze({ signal: SIGNAL.NOT_MEASURED, why: fault }) : consistencyOf({ media, named, videoObjects, sitemapMedia, pageUrl: url }),
    recommendation: recommendationOf(need),
  });
}

/** C1–C6 · one tenant's existing pages. */
export function auditMedia({ tenantId, pages = [], completeness = null, judgements = [], population = "REAL", registeredProviders = [], sitemapMedia = null, needs = new Map() }) {
  const own = [], refused = [];
  for (const p of pages) (sameTenant(p?.tenantId, tenantId) ? own : refused).push(p);
  const bound = boundOf(completeness);
  const results = own.map((p) => assessMedia({ pageId: p.pageId, url: p.url, html: p.html, judgements, population, registeredProviders, sitemapMedia, need: needs.get(p.pageId) ?? null }));
  const measured = results.filter((r) => r.measured);
  const anyMedia = measured.some((r) => r.media === SIGNAL.PRESENT);
  const count = (f) => measured.reduce((m, r) => { for (const k of f(r)) m[k] = (m[k] ?? 0) + 1; return m; }, {});
  return Object.freeze({
    feature: "F92", tenantId, bound,
    pages: own.length, measured: measured.length,
    counts: Object.freeze({
      media: count((r) => [r.media]),
      described: count((r) => r.items.map((i) => i.described.signal)),
      judged: count((r) => r.items.map((i) => i.judged.signal)),
      decorative: measured.reduce((n, r) => n + r.decorative.length, 0),
      structured: count((r) => (r.consistency.structured ?? []).map((x) => x.signal)),
      sitemap: count((r) => [r.consistency.sitemap?.signal ?? SIGNAL.NOT_MEASURED]),
      videos: count((r) => (r.consistency.videos ?? []).map((x) => x.signal)),
      recommendation: count((r) => [r.recommendation.signal]),
    }),
    site: Object.freeze({ siteHasNoMedia: anyMedia ? false : bound.state === "COMPLETE" ? true : SIGNAL.NOT_MEASURED }),
    results: Object.freeze(results),
    refused: Object.freeze(refused.map((p) => Object.freeze({ pageId: p?.pageId ?? null, why: "ANOTHER TENANT'S PAGE — never read into this audit (C6)" }))),
    standing: STANDING,
  });
}

/** C1–C5 · one draft F37 rendered for a need F35 chose: its media and the recommendation its recorded need allows. */
export function planForDraft({ draft, need = null, completeness = null }) {
  const r = assessMedia({ pageId: `draft:${draft?.subject ?? need?.needId ?? "unknown"}`, html: draft?.html ?? "", need });
  return Object.freeze({ feature: "F92", bound: boundOf(completeness), ...r, standing: STANDING });
}
