/**
 * 🔴 F66 · F67 · F68 · THE VISIBILITY SCORE OF ONE URL, FROM ITS STORED EVIDENCE — QUICK OR FULL, EVERY POINT EXPLAINED (acceptances
 * _handoffs AlmiVisibility_F66/F67/F68_ACCEPTANCE_2026-10-19.md, RR-291).
 *
 * One list of checks (CHECKS), each a pure function of one URL's STORED evidence — its latest stored read of the page (its HTML as read), its
 * stored security read and its stored link observations. Each check answers PASS, FAIL or NOT MEASURED (the evidence it needs is not stored),
 * names the evidence id it read, and on FAIL its finding and its next action. Nothing is fetched.
 *   F68 · the score is the sum of the weights of the checks that PASS over the sum of the weights of the checks EVALUATED; a NOT MEASURED
 *         check is out of the denominator, and the report says so, listing it by name.
 *   F67 · quick mode runs the SAME checks (this very list — there is no second copy) over a sample of the URLs, and says the sample size and
 *         which URLs it skipped.
 *   F66 · every point traces to its check; the report carries the score, the findings and the actions.
 * Pure. Generic: it names no client, product or host.
 */
export const RESULT = Object.freeze({ PASS: "PASS", FAIL: "FAIL", NOT_MEASURED: "NOT MEASURED" });

const strip = (h) => String(h ?? "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
const textOf = (h) => strip(h).replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const tags = (h, t) => strip(h).match(new RegExp(`<${t}\\b[^>]*>`, "gi")) ?? [];
const attr = (tag, a) => (new RegExp(`\\b${a}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag) ?? [])[1] ?? null;
const page = (e) => e.page?.html ?? null;
const nm = (needs) => ({ result: RESULT.NOT_MEASURED, needs });

/** The checks — one list, read by quick and full alike. Each: id, category, weight, run(evidence) → { result, finding?, action? }. */
export const CHECKS = Object.freeze([
  Object.freeze({ id: "title", category: "CONTENT", weight: 3, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); const t = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) ?? [])[1]?.trim() ?? ""; return t.length >= 10 && t.length <= 70 ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: t ? `the title is ${t.length} characters (10–70 expected)` : "the page has no title", action: "write one title of 10–70 characters that names the page's subject" }; } }),
  Object.freeze({ id: "meta-description", category: "CONTENT", weight: 2, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); const d = tags(h, "meta").find((m) => /name=["']description["']/i.test(m)); const c = d ? attr(d, "content") ?? "" : ""; return c.length >= 50 && c.length <= 170 ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: c ? `the description is ${c.length} characters (50–170 expected)` : "the page has no meta description", action: "write one description of 50–170 characters" }; } }),
  Object.freeze({ id: "one-h1", category: "CONTENT", weight: 2, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); const n = tags(h, "h1").length; return n === 1 ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: `the page has ${n} h1 headings`, action: "keep exactly one h1 that states the page's subject" }; } }),
  Object.freeze({ id: "enough-text", category: "CONTENT", weight: 2, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); const w = textOf(h).split(" ").filter(Boolean).length; return w >= 300 ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: `${w} words of visible text`, action: "answer the page's question in full: at least 300 words of its own" }; } }),
  Object.freeze({ id: "canonical", category: "TECHNICAL", weight: 2, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); const c = tags(h, "link").find((l) => /rel=["']canonical["']/i.test(l)); return c && /^https:\/\//.test(attr(c, "href") ?? "") ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: "no absolute canonical link", action: "add one canonical link to the page's own https address" }; } }),
  Object.freeze({ id: "lang", category: "TECHNICAL", weight: 1, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); return /<html[^>]*\blang=["'][a-z]{2}/i.test(h) ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: "no language on the html element", action: "declare the page's language" }; } }),
  Object.freeze({ id: "viewport", category: "TECHNICAL", weight: 1, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); return tags(h, "meta").some((m) => /name=["']viewport["']/i.test(m)) ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: "no viewport meta", action: "declare a responsive viewport" }; } }),
  Object.freeze({ id: "structured-data", category: "TECHNICAL", weight: 1, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); return /<script[^>]+application\/ld\+json/i.test(h) ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: "no structured data", action: "describe the page with structured data that matches its visible content" }; } }),
  Object.freeze({ id: "image-alt", category: "ACCESSIBILITY", weight: 1, run: (e) => { const h = page(e); if (!h) return nm("a stored read of the page"); const imgs = tags(h, "img"); const bad = imgs.filter((i) => attr(i, "alt") === null).length; return bad === 0 ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: `${bad} of ${imgs.length} image(s) without alt text`, action: "give every image alt text (empty for a decorative one)" }; } }),
  Object.freeze({ id: "https-only", category: "SECURITY", weight: 2, run: (e) => { if (!e.security) return nm("a stored security read of the page"); const s = e.security.read?.status; const http = e.security.http; return s === 200 && (!http || http.redirectsToHttps !== false) ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: `the security read answered ${s ?? "no status"}`, action: "serve the page over https only" }; } }),
  Object.freeze({ id: "links-resolve", category: "LINKS", weight: 2, run: (e) => { if (!Array.isArray(e.links) || e.links.length === 0) return nm("stored link observations for the page"); const bad = e.links.filter((l) => !(Number(l.finalStatus) >= 200 && Number(l.finalStatus) < 400)); return bad.length === 0 ? { result: RESULT.PASS } : { result: RESULT.FAIL, finding: `${bad.length} of ${e.links.length} link(s) do not resolve`, action: "fix or remove each link that does not resolve" }; } }),
]);

/** Run every check on one URL's evidence. Each result names its check, category, weight and the evidence id it read. */
export function checkUrl(url, evidence, checks = CHECKS) {
  return checks.map((c) => { const r = c.run(evidence); return Object.freeze({ url, check: c.id, category: c.category, weight: c.weight, evidenceId: r.result === RESULT.NOT_MEASURED ? null : evidence.ids?.[c.category === "SECURITY" ? "security" : c.category === "LINKS" ? "links" : "page"] ?? null, ...r }); });
}

/** F68 · the score over results: PASS weight / EVALUATED weight; NOT MEASURED out of the denominator, listed by name; per category too. */
export function score(results) {
  const evaluated = results.filter((r) => r.result !== RESULT.NOT_MEASURED);
  const sum = (xs) => xs.reduce((s, r) => s + r.weight, 0);
  const pct = (xs) => (sum(xs) === 0 ? null : Math.round((100 * sum(xs.filter((r) => r.result === RESULT.PASS))) / sum(xs)));
  const cats = [...new Set(results.map((r) => r.category))].sort();
  return Object.freeze({
    score: pct(evaluated),
    numerator: sum(evaluated.filter((r) => r.result === RESULT.PASS)),
    denominator: sum(evaluated),
    denominatorRule: "the weights of the EVALUATED checks only — a NOT MEASURED check is not in it",
    notMeasured: Object.freeze(results.filter((r) => r.result === RESULT.NOT_MEASURED).map((r) => `${r.url} · ${r.check} (needs ${r.needs})`)),
    byCategory: Object.freeze(Object.fromEntries(cats.map((c) => [c, pct(evaluated.filter((r) => r.category === c))]))),
    weights: Object.freeze(Object.fromEntries(CHECKS.map((c) => [c.id, c.weight]))),
    evaluated: evaluated.length,
  });
}

/** F67 · quick or full — the SAME checkUrl over a sample or over every URL; the sample size and the skipped URLs are stated. */
export function runMode({ mode, evidenceByUrl, sample = 3 }) {
  const urls = [...evidenceByUrl.keys()].sort();
  const picked = mode === "quick" ? urls.slice(0, sample) : urls;
  const results = picked.flatMap((u) => checkUrl(u, evidenceByUrl.get(u)));
  return Object.freeze({ mode, sampleSize: picked.length, of: urls.length, skipped: Object.freeze(urls.filter((u) => !picked.includes(u))), results, ...score(results) });
}

/** F66 · findings and next actions, each tracing to its check and evidence id — failing checks only, heaviest first. */
export function findingsOf(results) {
  return results.filter((r) => r.result === RESULT.FAIL).sort((a, b) => b.weight - a.weight || a.url.localeCompare(b.url)).map((r) => Object.freeze({ url: r.url, check: r.check, weight: r.weight, finding: r.finding, action: r.action, evidenceId: r.evidenceId }));
}

/** The stored evidence of each URL: its LATEST stored page read, security read and link observations (whose source page is that URL). */
export function evidenceByUrl({ pageReads = [], securityReads = [], linkObs = [] }) {
  const m = new Map();
  const at = (u) => { if (!m.has(u)) m.set(u, { ids: {} }); return m.get(u); };
  for (const r of [...pageReads].sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)))) if (r.url && r.html) { const e = at(r.url); e.page = r; e.ids.page = r.measurement_key ?? r.read_id; }
  for (const r of [...securityReads].sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)))) if (r.url && m.has(r.url) && r.kind === "PAGE") { const e = at(r.url); e.security = r; e.ids.security = r.measurement_key; }
  for (const r of linkObs) if (r.fromUrl && m.has(r.fromUrl)) { const e = at(r.fromUrl); (e.links ??= []).push(r); e.ids.links = `link-status:${r.fromUrl}`; }
  return m;
}
