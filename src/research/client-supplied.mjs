/**
 * 🔴 F28 · F65 · F84 · F95 · WHAT THE CLIENT SUPPLIES, READ ONLY UNDER ITS RECORDED CONSENT (acceptances _handoffs
 * AlmiVisibility_F28/F65/F84/F95_ACCEPTANCE_2026-10-19.md, RR-291; owner answer Q3: "read ONLY files the client supplies under a recorded
 * consent; never connect to their analytics or server").
 *
 * One gate for every supplied file (consentGate): a file is read only when the client's manifest names it with a consent record — who gave it,
 * the words they agreed to, the day — and its kind; otherwise it is REFUSED, named, and not one row of it is read. No supplied file of a kind
 * reads NOT MEASURED, never 0. Then one reader per kind:
 *   F28 · a server log: crawler visits by crawler (from the log line's own user agent), wasted URLs (visited but not in the sitemap, or an error
 *         status) and sitemap URLs never visited;
 *   F65 · a review export: count, recency, themes (the export's own theme field, or NOT MEASURED) and response state — and no code path here
 *         writes, posts or solicits a review;
 *   F84 · an outcome export: visits, leads or sales per page, as exported;
 *   F95 · a file of questions the client's customers asked: each kept in its original wording with its date, counted apart from public,
 *         research and owned search evidence.
 * Pure. Generic: it names no client, product or host.
 */
export const KINDS = Object.freeze({ SERVER_LOG: "SERVER_LOG", REVIEW_EXPORT: "REVIEW_EXPORT", OUTCOME_EXPORT: "OUTCOME_EXPORT", CUSTOMER_QUESTIONS: "CUSTOMER_QUESTIONS" });
export const NOT_MEASURED = "NOT MEASURED";
const present = (v) => typeof v === "string" && v.trim() !== "";

/** The consent gate: the supplied files of `kind` the manifest names WITH a consent record; every other one refused, named. */
export function consentGate(manifest, kind) {
  const files = (manifest?.files ?? []).filter((f) => f?.kind === kind);
  const admitted = [], refused = [];
  for (const f of files) {
    const c = f.consent;
    const ok = c && present(c.givenBy) && present(c.text) && /^\d{4}-\d{2}-\d{2}/.test(c.on ?? "") && present(f.file);
    (ok ? admitted : refused).push(ok ? f : { file: f.file ?? "(unnamed)", reason: "NO_CONSENT_RECORD" });
  }
  return Object.freeze({ kind, state: files.length === 0 ? NOT_MEASURED : admitted.length ? "READ" : "REFUSED", admitted, refused });
}

/* ── F28 · a server log in the common/combined format ── */
const LOG_LINE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(?:GET|HEAD|POST) (\S+)[^"]*" (\d{3}) \S+(?: "[^"]*" "([^"]*)")?/;
/** The crawlers a log line names in its OWN user agent — declared tokens, matched as written; anything else is not a crawler visit. */
export const CRAWLER_TOKENS = Object.freeze(["Googlebot", "bingbot", "DuckDuckBot", "YandexBot", "Baiduspider", "Applebot", "GPTBot", "ClaudeBot", "PerplexityBot", "CCBot", "OAI-SearchBot"]);
export function crawlerReport(logText, sitemapUrls) {
  const sitemapPaths = new Set((sitemapUrls ?? []).map((u) => { try { return new URL(u).pathname; } catch { return String(u); } }));
  const visits = {}, wasted = new Map(), visited = new Set();
  let lines = 0, unparsed = 0;
  for (const raw of String(logText ?? "").split(/\r?\n/)) {
    if (!raw.trim()) continue;
    lines += 1;
    const m = LOG_LINE.exec(raw);
    if (!m) { unparsed += 1; continue; }
    const [, , , path, status, ua = ""] = m;
    const bot = CRAWLER_TOKENS.find((t) => ua.includes(t));
    if (!bot) continue;
    visits[bot] = (visits[bot] ?? 0) + 1;
    const p = path.split("?")[0];
    visited.add(p);
    if (!sitemapPaths.has(p) || Number(status) >= 400) wasted.set(p, Number(status) >= 400 ? `HTTP ${status}` : "not in the sitemap");
  }
  const unfound = [...sitemapPaths].filter((p) => !visited.has(p)).sort();
  return Object.freeze({ lines, unparsed, visits, wasted: Object.freeze([...wasted].map(([path, why]) => ({ path, why }))), unfound: Object.freeze(unfound) });
}

/* ── F65 · a review export ── */
export function reviewSummary(rows, { on }) {
  const dated = rows.filter((r) => /^\d{4}-\d{2}-\d{2}/.test(r.date ?? ""));
  const latest = dated.map((r) => r.date.slice(0, 10)).sort().pop() ?? null;
  const themes = rows.some((r) => Array.isArray(r.themes)) ? rows.flatMap((r) => r.themes ?? []).reduce((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {}) : NOT_MEASURED;
  const answered = rows.filter((r) => r.response === true || present(r.response)).length;
  return Object.freeze({ count: rows.length, latest, daysSinceLatest: latest && on ? Math.round((Date.parse(on) - Date.parse(latest)) / 86_400_000) : null, themes, responded: answered, unanswered: rows.length - answered });
}

/**
 * F65 C2 · the census: any code that writes, posts, submits, sends, solicits, requests or asks for a review — by a call name, an option, an
 * address or a message — is a review write path. A file may say it does none in a comment: comments are not code, and are skipped.
 */
const REVIEW_WRITE = /\b(post|write|submit|send|solicit|request|ask|create|leave|publish|reply)[\w-]*\s*(?:[\w-]+\s*){0,2}\breviews?\b|\breviews?[\w-]*\s*(?:\.|\s)\s*(?:post|create|submit|write|publish|reply)\b|\/reviews?\/(?:new|create|submit|reply)\b|\brequest-?review\b/i;
export function reviewWritersCensus(files) {
  /* a comment, or a declared pattern line (const NAME = /…/flags;), is not a write path */
  return files.filter((f) => String(f.text).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/^\s*const [A-Z_]+ = \/.*\/[a-z]*;\s*$/.test(l)).some((l) => REVIEW_WRITE.test(l.replace(/([a-z])([A-Z])/g, "$1 $2")))).map((f) => f.path);
}

/* ── F84 · an outcome export: visits, leads or sales per page, as exported ── */
export function outcomesByPage(rows) {
  const m = {};
  for (const r of rows) { if (!present(r.page)) continue; const o = (m[r.page] ??= { visits: 0, leads: 0, sales: 0 }); for (const k of ["visits", "leads", "sales"]) o[k] += Number(r[k]) || 0; }
  return m;
}

/* ── F95 · questions the client's customers asked ── */
export const CLIENT_RECEIVED = "CLIENT_RECEIVED_QUESTION";
export function intakeQuestions(rows, { file, consent }) {
  const kept = [], refused = [];
  for (const r of rows) {
    if (!present(r.question) || !/^\d{4}-\d{2}-\d{2}/.test(r.date ?? "")) { refused.push({ row: r, reason: "NO_WORDING_OR_DATE" }); continue; }
    /* the wording is kept exactly as supplied — not trimmed, not corrected */
    kept.push(Object.freeze({ kind: CLIENT_RECEIVED, original: r.question, date: r.date.slice(0, 10), file, consentOn: consent.on }));
  }
  return Object.freeze({ kept, refused });
}
/** F95 C2 · the evidence counts by kind — client-received questions are their own kind and never join another's count. */
export function evidenceCounts({ publicQuestions = 0, researchDerived = 0, ownedSearch = 0, clientReceived = [] }) {
  return Object.freeze({ PUBLIC: publicQuestions, RESEARCH_DERIVED: researchDerived, OWNED_SEARCH: ownedSearch, [CLIENT_RECEIVED]: clientReceived.length });
}
