/**
 * 🔴 RR-369 (owner's run on 1.15.22: "Searches: 6 saved in AlmiSEO Data, 204 reused free, 944 bought"; R13: bought once, saved on the server, reused free by every run, the server collector and every client).
 * WHY ONLY 6: the app sent its page lists 50 at a time, about 139,000 bytes; the server takes 64,000 from anyone (site/app.mjs). Three batches were answered 413 and thrown away without a word; the last batch held the 6. And only the page lists were ever sent: no Reddit, Quora or council search, no autocomplete, no top page.
 * NOW, for every bought result:
 *   · a batch is cut by its BYTES, under the route's own limit;
 *   · a result counts as saved ONLY when the server names it back. What it does not name stays on the list and is sent again: on the run's end, on opening the app, every few minutes while anything is left;
 *   · nothing already held is bought: the server is asked first. A server that cannot answer buys nothing this run (no new search is worth paying twice); a server without the route yet answers 404 and changes nothing;
 *   · the backfill is this same list: what was bought before is simply not on the "saved" list yet.
 * Pure but for the client handed in.
 */
export const SAVED_FILE = "almiseo-saved.json", OUTBOX_FILE = "almiseo-outbox.json";
export const UPLOAD = Object.freeze({ maxBytes: 800000, maxRows: 400, listBytes: 60000, retryMs: 5 * 60e3 });
export const emptySaved = () => ({ searches: {}, pages: {}, lists: 0, reused: 0, lastOk: null, lastTry: null, lastWhy: null, server: null });
const kindOf = (key) => (String(key).startsWith("auto|") ? "auto" : "serp");
const day = (x) => (/^\d{4}-\d{2}-\d{2}/.test(String(x ?? "")) ? String(x).slice(0, 10) : null);
/** the day a search was bought: its own date; before dates were kept, the ledger's row */
const firstDays = (ledger) => { const out = new Map(); for (const r of ledger?.spent ?? []) if (r.q && r.ok !== false) { const d = day(r.on); if (d && !out.has(r.q)) out.set(r.q, d); } return out; };
const qOf = (key) => { const p = String(key).split("|"); return p[0] === "auto" ? p[1] : p[0]; };
/** one kept answer as it travels: what a later run needs, never a snippet of a page's text */
export const searchRow = (key, c, on = null) => ({ key, kind: kindOf(key), on: day(c.at) ?? on, ...(c.empty ? { empty: true } : {}), results: (c.results ?? []).map((r) => ({ url: r.url, title: r.title ?? "", rank: r.rank ?? null })), paa: c.paa ?? [], related: c.related ?? [], phrases: c.phrases ?? [] });
export const pageRow = (url, t) => ({ url, on: day(t.on), headings: t.headings ?? null, blocks: t.blocks ?? null });
/** what was bought and the server has not named back */
export function unsaved({ ledger = {}, tops = {}, saved = emptySaved() }) {
  const days = firstDays(ledger);
  return { searches: Object.entries(ledger.serpCache ?? {}).filter(([k, c]) => !saved.searches?.[k] && !c.fromServer).map(([k, c]) => searchRow(k, c, days.get(qOf(k)) ?? null)), pages: Object.entries(tops ?? {}).filter(([u, t]) => !saved.pages?.[u] && !t.fromServer).map(([u, t]) => pageRow(u, t)) };
}
/** rows → batches under the byte limit; one row alone never passes it (a kept answer holds ten results at most) */
export function batches(rows, { maxBytes = UPLOAD.maxBytes, maxRows = UPLOAD.maxRows, sizeOf = (r) => Buffer.byteLength(JSON.stringify(r)) } = {}) {
  const out = []; let now = [], size = 0;
  for (const r of rows) { const n = sizeOf(r) + 1; if (now.length && (size + n > maxBytes || now.length >= maxRows)) { out.push(now); now = []; size = 0; } now.push(r); size += n; }
  if (now.length) out.push(now);
  return out;
}
/**
 * Everything still unsaved goes up. `subjectOf(row)` says whose it is. A batch not answered stays for the next try: saved only moves on what the server named. → { sent, confirmed, left, why }
 * `save(saved)` after each batch, so a run that dies keeps what was confirmed.
 */
export async function uploadBought({ client, ledger, tops = {}, saved, subjectOf, save = () => {}, now = new Date().toISOString() }) {
  const u = unsaved({ ledger, tops, saved }), groups = new Map(), put = (subject, side, row) => { const g = groups.get(subject) ?? { searches: [], pages: [] }; g[side].push(row); groups.set(subject, g); };
  let left = 0, why = null, confirmed = 0, sent = 0, stop = false;
  for (const r of u.searches) { const s = subjectOf(r); if (s) put(s, "searches", r); else left++; }
  for (const r of u.pages) { const s = subjectOf(r); if (s) put(s, "pages", r); else left++; }
  saved.lastTry = now;
  for (const [subject, g] of groups) {
    /* a tiny question first: a server without this route yet, or refusing this subject, is told apart before any large batch is sent */
    const hello = stop ? null : await client.saveBought({ subject, searches: [], pages: [] }).catch(() => ({ ok: false, why: "AlmiSEO Data did not answer." }));
    if (!hello?.ok) { left += g.searches.length + g.pages.length; if (hello) { why = hello.why ?? "AlmiSEO Data did not answer."; if (hello.status !== 403 && hello.status !== 404) stop = true; saved.lastWhy = why; save(saved); } continue; }
    for (const [side, rows] of [["searches", g.searches], ["pages", g.pages]]) {
      for (const b of batches(rows)) {
        if (stop) { left += b.length; continue; }
        sent += b.length;
        const r = await client.saveBought({ subject, [side]: b }).catch(() => ({ ok: false, why: "AlmiSEO Data did not answer." }));
        if (!r?.ok) { left += b.length; why = r?.why ?? "AlmiSEO Data did not answer."; if (r?.status !== 403 && r?.status !== 404) stop = true; /* a server that cannot take this now cannot take the next one either; a subject that is not this licence's is only that subject's */ saved.lastWhy = why; save(saved); continue; }
        const named = new Set(side === "searches" ? r.confirmed ?? [] : r.pages ?? []), mark = saved[side];
        for (const x of b) { const id = side === "searches" ? x.key : x.url; if (named.has(id)) { mark[id] = now; confirmed++; } else { left++; why ??= "AlmiSEO Data did not confirm every row."; } }
        if (r.held) saved.server = { ...r.held, on: now };
        saved.lastOk = now; saved.lastWhy = why; save(saved);
      }
    }
  }
  if (!sent && !left) saved.lastWhy = null;
  save(saved);
  return { sent, confirmed, left, why };
}
/**
 * Before buying. `keys` not kept here → the ones the server holds go into the ledger, free, and are marked saved (they are). → { ok, reused, found, cannotAsk }
 * ok false = it could not answer: the caller buys nothing new this run. No route yet (404 from a server not deployed yet) is ok: the server simply holds nothing.
 */
export async function askServerFirst({ client, subject, keys = [], urls = [], ledger, tops = null, saved, perCall = UPLOAD.maxRows, now = new Date().toISOString() }) {
  const need = keys.filter((k) => !ledger.serpCache?.[k] && !ledger.pending?.[k]), needUrls = urls.filter((u) => !tops?.[u]); let reused = 0, topsReused = 0;
  if (!need.length && !needUrls.length) return { ok: true, reused, topsReused };
  for (let i = 0; i < Math.max(need.length, needUrls.length); i += perCall) {
    const r = await client.heldBought({ subject, keys: need.slice(i, i + perCall), urls: needUrls.slice(i, i + perCall) }).catch(() => ({ ok: false }));
    if (!r?.ok) { if (r?.status === 404 || r?.status === 403) return { ok: true, reused, topsReused, noRoute: r.status === 404 }; return { ok: false, reused, topsReused, why: r?.why ?? "AlmiSEO Data did not answer." }; }
    for (const [k, v] of Object.entries(r.searches ?? {})) { (ledger.serpCache ??= {})[k] = { ok: true, ...(v.empty ? { empty: true } : {}), results: v.results ?? [], paa: v.paa ?? [], related: v.related ?? [], ...(v.kind === "auto" ? { phrases: v.phrases ?? [] } : {}), cost: 0, at: `${v.on}T00:00:00.000Z`, fromServer: true }; saved.searches[k] = now; reused++; }
    for (const [u, v] of Object.entries(r.pages ?? {})) if (tops) { tops[u] = { on: v.on, headings: v.headings, blocks: v.blocks, fromServer: true }; saved.pages[u] = now; topsReused++; }
  }
  saved.reused = (saved.reused ?? 0) + reused + topsReused;
  return { ok: true, reused, topsReused };
}
/* ── a finished page's list (the route the collector's plan reads): cut under the 64,000 bytes that route takes; kept on disk until the server has answered ── */
export const listBatches = (lists, { maxBytes = UPLOAD.listBytes } = {}) => batches(lists, { maxBytes, maxRows: 50 });
export async function sendLists({ client, subject, outbox, save = () => {} }) {
  let confirmed = 0, why = null;
  for (const b of listBatches(Object.values(outbox.lists ?? {}))) {
    const r = await client.saveSearches({ subject, lists: b }).catch(() => ({ ok: false, why: "AlmiSEO Data did not answer." }));
    if (!r?.ok) { why = r?.why ?? "AlmiSEO Data did not answer."; break; }
    if (Number(r.saved ?? 0) + Number(r.kept ?? 0) !== b.length) { why = "AlmiSEO Data did not confirm every list."; break; }
    for (const l of b) { delete outbox.lists[l.intent]; (outbox.done ??= {})[l.intent] = l.on; }
    confirmed += b.length; save(outbox);
  }
  return { confirmed, left: Object.keys(outbox.lists ?? {}).length, why };
}
/** the true counts for the screen and for the file: "saved" only as the server said */
export function savedCounts({ ledger = {}, tops = {}, saved = emptySaved(), lists = 0 }) {
  const u = unsaved({ ledger, tops, saved }), searches = Object.keys(saved.searches ?? {}).length, pages = Object.keys(saved.pages ?? {}).length, waiting = u.searches.length + u.pages.length + lists;
  return { searches, pages, saved: searches + pages, waiting, kept: Object.keys(ledger.serpCache ?? {}).length, topsKept: Object.keys(tops ?? {}).length, server: saved.server ?? null, lastOk: saved.lastOk ?? null, why: saved.lastWhy ?? null, line: `AlmiSEO Data: ${searches.toLocaleString("en-US")} searches and ${pages.toLocaleString("en-US")} top pages confirmed by the server${waiting ? `; ${waiting.toLocaleString("en-US")} still to send (the app keeps trying)${saved.lastWhy ? `: ${saved.lastWhy}` : ""}` : ""}.` };
}
