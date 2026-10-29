/**
 * 🔴 RR-328 B · THE COUNTRY FACTS DATABASE — the same Neon database as the keywords (kw-store.mjs dbUrlOf: DATABASE_URL, else POSTGRES_URL;
 * never printed). Its tables are made by the deployed code itself (CREATE … IF NOT EXISTS, on first use) — nothing is run against it from a
 * developer's computer.
 *   cf_fact     one fact of one country (and profession), by its KEY: what it says (value), its source page and the day it was read, and
 *               its status — "confirmed" (the collector read the source page itself and found it there), "unconfirmed" (proposed, not
 *               found on its page — NEVER shown on a page), and the owner's own: "approved", "edited" (his value wins), "rejected"
 *   cf_history  every change of every fact, never deleted (who, when, the status and the value then)
 *   cf_task     the collector's work per (country, task): finished on which day, tries — finished work is not done again until it is due;
 *               for the councils, the names already tried per profession while it is still "searching" (RR-328 addition, rule R1)
 *   cf_day      today's spend: the AI's dollars, the page reads, the web searches (the daily caps)
 *   cf_question RR-330: questions people asked that are not keywords — YouTube comments' questions (30 days at most) and the owner's own
 * THE OWNER'S WORD WINS: a fact he approved, edited or rejected is never changed by the collector again (its new proposal is kept in the
 * history only). No personal data: countries, organisations, official addresses and pages.
 * Two stores with ONE contract (test/rr328-*.test.mjs runs the same tests on both): pgStore (production; locally on a throwaway Postgres)
 * and memoryStore (the tests in CI).
 */
import { createHash } from "node:crypto";
import { normText } from "../desktop/country-facts.mjs";

export const CF_SCHEMA = `
CREATE TABLE IF NOT EXISTS cf_fact (key text PRIMARY KEY, country text NOT NULL, profession text, part text NOT NULL, kind text NOT NULL, value jsonb NOT NULL, source_url text, source_title text, read_on date, status text NOT NULL, by_who text NOT NULL, ai_written boolean NOT NULL DEFAULT false, proposed_by text NOT NULL, why text, at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS cf_fact_country ON cf_fact (country);
CREATE TABLE IF NOT EXISTS cf_history (id bigserial PRIMARY KEY, key text NOT NULL, at timestamptz NOT NULL, status text NOT NULL, value jsonb, by_who text NOT NULL, note text);
CREATE TABLE IF NOT EXISTS cf_task (country text NOT NULL, task text NOT NULL, day date NOT NULL, state text NOT NULL, tries int NOT NULL, note text, tried jsonb, PRIMARY KEY (country, task));
ALTER TABLE cf_task ADD COLUMN IF NOT EXISTS tried jsonb;
CREATE TABLE IF NOT EXISTS cf_day (day date PRIMARY KEY, ai_usd numeric NOT NULL DEFAULT 0, reads int NOT NULL DEFAULT 0, searches int NOT NULL DEFAULT 0);
ALTER TABLE cf_fact ADD COLUMN IF NOT EXISTS product text NOT NULL DEFAULT 'oet';
CREATE INDEX IF NOT EXISTS cf_fact_product ON cf_fact (product, country);
CREATE TABLE IF NOT EXISTS cf_photo (id text PRIMARY KEY, country text NOT NULL, type text NOT NULL, bytes bytea NOT NULL, at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS cf_question (product text NOT NULL, country text NOT NULL, source text NOT NULL, id text NOT NULL, text text NOT NULL, ref text, at timestamptz NOT NULL, PRIMARY KEY (product, country, source, id));
ALTER TABLE cf_question ADD COLUMN IF NOT EXISTS clicks int, ADD COLUMN IF NOT EXISTS impressions int;
CREATE TABLE IF NOT EXISTS cf_article (id text PRIMARY KEY, product text NOT NULL, kind text NOT NULL, title text NOT NULL, body jsonb NOT NULL, status text NOT NULL, why text, by_who text NOT NULL, at timestamptz NOT NULL);
`;
/* RR-330 · the questions people asked that are not keywords: "youtube" (a comment's question, its words kept 30 days at most — YouTube's
 * rule for API data — then deleted by the collector) and "owner" (pasted on /owner, kept). A question's id is its words' fingerprint, so the
 * same question saved twice is one row. */
/* RR-331: "gsc" — the searches that ask something on our own sites (Search Console), with their clicks and impressions */
export const QUESTION_STORE = Object.freeze({ sources: Object.freeze(["youtube", "owner", "gsc"]), maxPerCountry: 400 });
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== undefined ? Math.round(Number(v)) : null);
const qid = (text) => createHash("sha256").update(normText(text)).digest("hex").slice(0, 20);
/* RR-329 D (rule R9): "owner" — a fact the owner supplied himself, dated; shown first, never changed by the collector */
export const STATUS = Object.freeze({ confirmed: "confirmed", unconfirmed: "unconfirmed", approved: "approved", edited: "edited", rejected: "rejected", owner: "owner" });
/* what a page may show — never an unconfirmed or rejected fact */
export const SHOWN = Object.freeze(["confirmed", "approved", "edited", "owner"]);
export const OWNER_DECIDED = Object.freeze(["approved", "edited", "rejected", "owner"]);
/* RR-329 D: a photo the owner adds (a test centre's notice, a fee board …) — small, so two months fit the free database */
export const PHOTO = Object.freeze({ maxBytes: 1_500_000, types: Object.freeze(["image/jpeg", "image/png", "image/webp"]) });
const ACTIONS = { approve: "approved", edit: "edited", reject: "rejected" };
/* RR-334 · an article draft: "draft" until the owner's Approve or Reject — then the collector never changes it (a new draft needs his Reject) */
export const ARTICLE_STATUS = Object.freeze({ draft: "draft", approved: "approved", rejected: "rejected" });
const ARTICLE_ACTIONS = { approve: "approved", reject: "rejected", reopen: "draft" };
const artRow = (r) => ({ id: r.id, product: r.product, kind: r.kind, title: r.title, body: r.body, status: r.status, why: r.why ?? null, by: r.by_who ?? r.by, at: r.at ? new Date(r.at).toISOString() : null });

const row = (r) => ({ key: r.key, product: r.product ?? "oet", country: r.country, profession: r.profession ?? null, part: r.part, kind: r.kind, value: r.value, sourceUrl: r.source_url ?? r.sourceUrl ?? null, sourceTitle: r.source_title ?? r.sourceTitle ?? null, readOn: r.read_on ? String(r.read_on).slice(0, 10) : r.readOn ?? null, status: r.status, by: r.by_who ?? r.by, aiWritten: Boolean(r.ai_written ?? r.aiWritten), proposedBy: r.proposed_by ?? r.proposedBy, why: r.why ?? null, at: r.at ? new Date(r.at).toISOString() : null });
/* the same value, whatever order its keys come back in (Postgres jsonb keeps its own order) */
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v ?? null));
const checkFact = (f) => { for (const k of ["key", "country", "part", "kind", "status", "proposedBy"]) if (!f[k]) throw new Error(`a country fact needs its ${k}`); if (!STATUS[f.status]) throw new Error(`no such status: ${f.status}`); };

/** the facts on Postgres. `Pool` is pg's (handed in, or loaded from the `pg` package on first use) */
export function cfPgStore({ url, Pool = null, max = 3 }) {
  let pool = null, ready = null;
  const db = async () => { if (!pool) { const P = Pool ?? (await import("pg")).default.Pool; pool = new P({ connectionString: url, max, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 }); } return pool; };
  const q = async (sql, params = []) => (await (await db()).query(sql, params)).rows;
  const ensure = () => (ready ??= (async () => { await q(CF_SCHEMA); })().catch((e) => { ready = null; throw e; }));
  const tx = async (fn) => { await ensure(); const c = await (await db()).connect(); try { await c.query("BEGIN"); const out = await fn((s, p = []) => c.query(s, p).then((r) => r.rows)); await c.query("COMMIT"); return out; } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); } };
  const SEL = "SELECT key, product, country, profession, part, kind, value, source_url, source_title, read_on::text AS read_on, status, by_who, ai_written, proposed_by, why, at FROM cf_fact";
  return Object.freeze({
    kind: "postgres", ensure,
    async facts({ country = null } = {}) { await ensure(); return (country ? await q(`${SEL} WHERE country = $1 ORDER BY key`, [country]) : await q(`${SEL} ORDER BY country, key`)).map(row); },
    async fact(key) { await ensure(); const [r] = await q(`${SEL} WHERE key = $1`, [key]); return r ? row(r) : null; },
    /** the collector's fact — refused (kept in the history only) when the owner has decided this key */
    async putFact(f, { at }) {
      checkFact(f);
      return tx(async (x) => {
        const [old] = await x("SELECT status, by_who, value, source_url, why FROM cf_fact WHERE key = $1 FOR UPDATE", [f.key]);
        if (old && OWNER_DECIDED.includes(old.status)) { await x("INSERT INTO cf_history (key, at, status, value, by_who, note) VALUES ($1,$2,$3,$4,$5,$6)", [f.key, at, f.status, JSON.stringify(f.value), "collector", `not applied — the owner ${old.status} this fact`]); return { saved: false, why: `the owner ${old.status} it` }; }
        /* RR-329: a new reason is a change (a page gone, then read again, must not stay "gone") */
        if (old && old.status === f.status && canon(old.value) === canon(f.value) && old.source_url === (f.sourceUrl ?? null) && (old.why ?? null) === (f.why ?? null)) return { saved: false, why: "unchanged" };
        await x(`INSERT INTO cf_fact (key, country, profession, part, kind, value, source_url, source_title, read_on, status, by_who, ai_written, proposed_by, why, at, product) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$15,$11,$12,$13,$14,$16)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, source_url = EXCLUDED.source_url, source_title = EXCLUDED.source_title, read_on = EXCLUDED.read_on, status = EXCLUDED.status, by_who = EXCLUDED.by_who, ai_written = EXCLUDED.ai_written, proposed_by = EXCLUDED.proposed_by, why = EXCLUDED.why, at = EXCLUDED.at, product = EXCLUDED.product`,
          [f.key, f.country, f.profession ?? null, f.part, f.kind, JSON.stringify(f.value), f.sourceUrl ?? null, f.sourceTitle ?? null, f.readOn ?? null, f.status, Boolean(f.aiWritten), f.proposedBy, f.why ?? null, at, f.status === "owner" ? "owner" : "collector", f.product ?? "oet"]);
        await x("INSERT INTO cf_history (key, at, status, value, by_who, note) VALUES ($1,$2,$3,$4,$5,$6)", [f.key, at, f.status, JSON.stringify(f.value), f.status === "owner" ? "owner" : "collector", f.why ?? null]);
        return { saved: true };
      });
    },
    /** RR-329 D · the owner's own fact ("Add what I know") — a new key every time, never refused, never changed by the collector */
    async supply(f, { at }) { checkFact({ ...f, status: "owner", proposedBy: "owner" }); return this.putFact({ ...f, status: "owner", proposedBy: "owner", aiWritten: false }, { at }); },
    async putPhoto({ id, country, type, bytes, at }) { await ensure(); await q("INSERT INTO cf_photo (id, country, type, bytes, at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING", [id, country, type, bytes, at]); },
    async photo(id) { await ensure(); const [r] = await q("SELECT type, bytes FROM cf_photo WHERE id = $1", [id]); return r ? { type: r.type, bytes: Buffer.from(r.bytes) } : null; },
    /** the owner's word: approve | edit (his value) | reject — it wins over the collector from then on */
    async decide(key, { action, value = null, at }) {
      const status = ACTIONS[action]; if (!status) throw new Error(`no such action: ${action}`);
      return tx(async (x) => {
        const [old] = await x("SELECT value FROM cf_fact WHERE key = $1 FOR UPDATE", [key]); if (!old) return { ok: false, why: "No such fact." };
        const v = action === "edit" ? value : old.value;
        await x("UPDATE cf_fact SET status = $2, value = $3, by_who = 'owner', at = $4 WHERE key = $1", [key, status, JSON.stringify(v), at]);
        await x("INSERT INTO cf_history (key, at, status, value, by_who, note) VALUES ($1,$2,$3,$4,'owner',NULL)", [key, at, status, JSON.stringify(v)]);
        return { ok: true, status };
      });
    },
    async history(key) { await ensure(); return (await q("SELECT at, status, value, by_who, note FROM cf_history WHERE key = $1 ORDER BY id", [key])).map((r) => ({ at: new Date(r.at).toISOString(), status: r.status, value: r.value, by: r.by_who, note: r.note })); },
    async tasks() { await ensure(); return new Map((await q("SELECT country, task, day::text AS day, state, tries, note, tried FROM cf_task")).map((r) => [`${r.country}|${r.task}`, { day: r.day, state: r.state, tries: r.tries, note: r.note, tried: r.tried ?? null }])); },
    async setTask(country, task, { day, state, note = null, tried = null }) { await ensure(); await q("INSERT INTO cf_task (country, task, day, state, tries, note, tried) VALUES ($1,$2,$3,$4,1,$5,$6) ON CONFLICT (country, task) DO UPDATE SET day = EXCLUDED.day, state = EXCLUDED.state, tries = cf_task.tries + 1, note = EXCLUDED.note, tried = EXCLUDED.tried", [country, task, day, state, note, tried ? JSON.stringify(tried) : null]); },
    async spend(day) { await ensure(); const [r] = await q("SELECT ai_usd::float8 AS ai, reads, searches FROM cf_day WHERE day = $1", [day]); return { aiUsd: r ? Number(r.ai) : 0, reads: r?.reads ?? 0, searches: r?.searches ?? 0 }; },
    /** RR-329 C · the spend of every day since `since` (the owner's day and month) */
    async spendSince(since) { await ensure(); return (await q("SELECT day::text AS day, ai_usd::float8 AS ai, reads, searches FROM cf_day WHERE day >= $1 ORDER BY day", [since])).map((r) => ({ day: r.day, aiUsd: Number(r.ai), reads: r.reads, searches: r.searches })); },
    async addSpend(day, { aiUsd = 0, reads = 0, searches = 0 }) { await ensure(); await q("INSERT INTO cf_day (day, ai_usd, reads, searches) VALUES ($1,$2,$3,$4) ON CONFLICT (day) DO UPDATE SET ai_usd = cf_day.ai_usd + EXCLUDED.ai_usd, reads = cf_day.reads + EXCLUDED.reads, searches = cf_day.searches + EXCLUDED.searches", [day, aiUsd, reads, searches]); },
    /** RR-330 · questions asked (YouTube, the owner) — the same question twice is one row; → how many are new */
    async putQuestions({ product = "oet", country, source, items, at }) {
      if (!QUESTION_STORE.sources.includes(source)) throw new Error(`no such question source: ${source}`);
      await ensure(); let n = 0;
      for (const x of items.slice(0, QUESTION_STORE.maxPerCountry)) { const r = await q("INSERT INTO cf_question (product, country, source, id, text, ref, at, clicks, impressions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (product, country, source, id) DO UPDATE SET at = EXCLUDED.at, ref = EXCLUDED.ref, clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions RETURNING (xmax = 0) AS fresh", [product, country, source, qid(x.text), String(x.text), x.ref ?? null, at, num(x.clicks), num(x.impressions)]); if (r[0]?.fresh) n++; }
      return { added: n };
    },
    async questions({ product = "oet", country, source = null }) { await ensure(); return (await q(`SELECT source, text, ref, at, clicks, impressions FROM cf_question WHERE product = $1 AND country = $2${source ? " AND source = $3" : ""} ORDER BY at DESC, id`, source ? [product, country, source] : [product, country])).map((r) => ({ source: r.source, text: r.text, ref: r.ref, at: new Date(r.at).toISOString(), clicks: r.clicks ?? null, impressions: r.impressions ?? null })); },
    /** RR-333 D · every question asked about a product, any country (AlmiVisibility has no country pages) */
    async productQuestions(product) { await ensure(); return (await q("SELECT country, source, text, impressions FROM cf_question WHERE product = $1", [product])).map((r) => ({ country: r.country, source: r.source, text: r.text, impressions: r.impressions ?? null })); },
    /** YouTube's rule: a comment's words older than `before` are deleted → how many */
    async dropQuestions({ source, before }) { await ensure(); return (await q("DELETE FROM cf_question WHERE source = $1 AND at < $2 RETURNING id", [source, before])).length; },
    /** RR-334 · the collector's draft — refused when the owner already approved or rejected that article */
    async putArticle(a, { at }) {
      return tx(async (x) => {
        const [old] = await x("SELECT status, body FROM cf_article WHERE id = $1 FOR UPDATE", [a.id]);
        if (old && old.status !== "draft") return { saved: false, why: `the owner ${old.status} it` };
        if (old && canon(old.body) === canon(a.body)) return { saved: false, why: "unchanged" };
        await x("INSERT INTO cf_article (id, product, kind, title, body, status, why, by_who, at) VALUES ($1,$2,$3,$4,$5,'draft',$6,'collector',$7) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, why = EXCLUDED.why, at = EXCLUDED.at", [a.id, a.product, a.kind, a.title, JSON.stringify(a.body), a.why ?? null, at]);
        return { saved: true };
      });
    },
    async articles({ product = null } = {}) { await ensure(); return (await q(`SELECT id, product, kind, title, body, status, why, by_who, at FROM cf_article${product ? " WHERE product = $1" : ""} ORDER BY product, kind, id`, product ? [product] : [])).map(artRow); },
    async decideArticle(id, { action, at }) { const status = ARTICLE_ACTIONS[action]; if (!status) throw new Error(`no such action: ${action}`); await ensure(); const r = await q("UPDATE cf_article SET status = $2, by_who = 'owner', at = $3 WHERE id = $1 RETURNING id", [id, status, at]); return r.length ? { ok: true, status } : { ok: false, why: "No such article." }; },
    /** RR-344 · where an approved article was published (the blog post's id, link, day) — kept in its body, never changing its words */
    async markPublished(id, published) { await ensure(); const r = await q("UPDATE cf_article SET body = jsonb_set(body, '{published}', $2::jsonb) WHERE id = $1 AND status = 'approved' RETURNING id", [id, JSON.stringify(published)]); return { ok: r.length > 0 }; },
    async close() { if (pool) await pool.end(); pool = null; ready = null; },
  });
}

/** the SAME contract in memory — for the tests that run where nothing is installed (CI) */
export function cfMemoryStore() {
  const facts = new Map(), hist = [], tasks = new Map(), days = new Map(), photos = new Map(), asked = new Map(), arts = new Map();
  const copy = (o) => JSON.parse(JSON.stringify(o));
  return Object.freeze({
    kind: "memory", ensure: async () => {},
    async facts({ country = null } = {}) { return [...facts.values()].filter((f) => !country || f.country === country).sort((a, b) => a.country.localeCompare(b.country) || a.key.localeCompare(b.key)).map(copy); },
    async fact(key) { return facts.has(key) ? copy(facts.get(key)) : null; },
    async putFact(f, { at }) {
      checkFact(f);
      const old = facts.get(f.key);
      if (old && OWNER_DECIDED.includes(old.status)) { hist.push({ key: f.key, at, status: f.status, value: copy(f.value), by: "collector", note: `not applied — the owner ${old.status} this fact` }); return { saved: false, why: `the owner ${old.status} it` }; }
      if (old && old.status === f.status && canon(old.value) === canon(f.value) && old.sourceUrl === (f.sourceUrl ?? null) && (old.why ?? null) === (f.why ?? null)) return { saved: false, why: "unchanged" };
      const by = f.status === "owner" ? "owner" : "collector";
      facts.set(f.key, row({ ...copy(f), product: f.product ?? "oet", sourceUrl: f.sourceUrl ?? null, by, at }));
      hist.push({ key: f.key, at, status: f.status, value: copy(f.value), by, note: f.why ?? null });
      return { saved: true };
    },
    async supply(f, { at }) { checkFact({ ...f, status: "owner", proposedBy: "owner" }); return this.putFact({ ...f, status: "owner", proposedBy: "owner", aiWritten: false }, { at }); },
    async putPhoto({ id, country, type, bytes, at }) { if (!photos.has(id)) photos.set(id, { country, type, bytes: Buffer.from(bytes), at }); },
    async photo(id) { const p = photos.get(id); return p ? { type: p.type, bytes: Buffer.from(p.bytes) } : null; },
    async decide(key, { action, value = null, at }) {
      const status = ACTIONS[action]; if (!status) throw new Error(`no such action: ${action}`);
      const old = facts.get(key); if (!old) return { ok: false, why: "No such fact." };
      const v = action === "edit" ? copy(value) : old.value;
      facts.set(key, { ...old, status, value: v, by: "owner", at: new Date(at).toISOString() });
      hist.push({ key, at, status, value: copy(v), by: "owner", note: null });
      return { ok: true, status };
    },
    async history(key) { return hist.filter((h) => h.key === key).map((h) => ({ ...copy(h), at: new Date(h.at).toISOString() })).map(({ key: _k, ...h }) => h); },
    async tasks() { return new Map([...tasks.entries()].map(([k, v]) => [k, copy(v)])); },
    async setTask(country, task, { day, state, note = null, tried = null }) { const k = `${country}|${task}`, o = tasks.get(k); tasks.set(k, { day, state, tries: (o?.tries ?? 0) + 1, note, tried: tried ? copy(tried) : null }); },
    async spend(day) { const d = days.get(day); return d ? { ...d } : { aiUsd: 0, reads: 0, searches: 0 }; },
    async spendSince(since) { return [...days.entries()].filter(([d]) => d >= since).sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => ({ day, ...d })); },
    async addSpend(day, { aiUsd = 0, reads = 0, searches = 0 }) { const d = days.get(day) ?? { aiUsd: 0, reads: 0, searches: 0 }; days.set(day, { aiUsd: d.aiUsd + aiUsd, reads: d.reads + reads, searches: d.searches + searches }); },
    async putQuestions({ product = "oet", country, source, items, at }) {
      if (!QUESTION_STORE.sources.includes(source)) throw new Error(`no such question source: ${source}`);
      let n = 0;
      for (const x of items.slice(0, QUESTION_STORE.maxPerCountry)) { const k = `${product}|${country}|${source}|${qid(x.text)}`, old = asked.get(k); if (!old) n++; asked.set(k, { product, country, source, text: old?.text ?? String(x.text), ref: x.ref ?? null, at: new Date(at).toISOString(), clicks: num(x.clicks), impressions: num(x.impressions) }); }
      return { added: n };
    },
    async questions({ product = "oet", country, source = null }) { return [...asked.entries()].filter(([, v]) => v.product === product && v.country === country && (!source || v.source === source)).sort((a, b) => b[1].at.localeCompare(a[1].at) || a[0].localeCompare(b[0])).map(([, v]) => ({ source: v.source, text: v.text, ref: v.ref, at: v.at, clicks: v.clicks ?? null, impressions: v.impressions ?? null })); },
    async productQuestions(product) { return [...asked.values()].filter((v) => v.product === product).map((v) => ({ country: v.country, source: v.source, text: v.text, impressions: v.impressions ?? null })); },
    async dropQuestions({ source, before }) { let n = 0; for (const [k, v] of asked) if (v.source === source && v.at < new Date(before).toISOString()) { asked.delete(k); n++; } return n; },
    async putArticle(a, { at }) {
      const old = arts.get(a.id);
      if (old && old.status !== "draft") return { saved: false, why: `the owner ${old.status} it` };
      if (old && canon(old.body) === canon(a.body)) return { saved: false, why: "unchanged" };
      arts.set(a.id, { id: a.id, product: a.product, kind: a.kind, title: a.title, body: copy(a.body), status: "draft", why: a.why ?? null, by: "collector", at: new Date(at).toISOString() });
      return { saved: true };
    },
    async articles({ product = null } = {}) { return [...arts.values()].filter((a) => !product || a.product === product).sort((a, b) => a.product.localeCompare(b.product) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)).map(copy); },
    async decideArticle(id, { action, at }) { const status = ARTICLE_ACTIONS[action]; if (!status) throw new Error(`no such action: ${action}`); const a = arts.get(id); if (!a) return { ok: false, why: "No such article." }; arts.set(id, { ...a, status, by: "owner", at: new Date(at).toISOString() }); return { ok: true, status }; },
    async markPublished(id, published) { const a = arts.get(id); if (!a || a.status !== "approved") return { ok: false }; arts.set(id, { ...a, body: { ...a.body, published: copy(published) } }); return { ok: true }; },
    async close() {},
  });
}
