/**
 * 🔴 RR-328 B · THE COUNTRY FACTS DATABASE — the same Neon database as the keywords (kw-store.mjs dbUrlOf: DATABASE_URL, else POSTGRES_URL;
 * never printed). Its tables are made by the deployed code itself (CREATE … IF NOT EXISTS, on first use) — nothing is run against it from a
 * developer's computer.
 *   cf_fact     one fact of one country (and profession), by its KEY: what it says (value), its source page and the day it was read, and
 *               its status — "confirmed" (the collector read the source page itself and found it there), "unconfirmed" (proposed, not
 *               found on its page — NEVER shown on a page), and the owner's own: "approved", "edited" (his value wins), "rejected"
 *   cf_history  every change of every fact, never deleted (who, when, the status and the value then)
 *   cf_task     the collector's work per (country, task): finished on which day, tries — finished work is not done again until it is due
 *   cf_day      today's spend: the AI's dollars, the page reads, the web searches (the daily caps)
 * THE OWNER'S WORD WINS: a fact he approved, edited or rejected is never changed by the collector again (its new proposal is kept in the
 * history only). No personal data: countries, organisations, official addresses and pages.
 * Two stores with ONE contract (test/rr328-*.test.mjs runs the same tests on both): pgStore (production; locally on a throwaway Postgres)
 * and memoryStore (the tests in CI).
 */
export const CF_SCHEMA = `
CREATE TABLE IF NOT EXISTS cf_fact (key text PRIMARY KEY, country text NOT NULL, profession text, part text NOT NULL, kind text NOT NULL, value jsonb NOT NULL, source_url text, source_title text, read_on date, status text NOT NULL, by_who text NOT NULL, ai_written boolean NOT NULL DEFAULT false, proposed_by text NOT NULL, why text, at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS cf_fact_country ON cf_fact (country);
CREATE TABLE IF NOT EXISTS cf_history (id bigserial PRIMARY KEY, key text NOT NULL, at timestamptz NOT NULL, status text NOT NULL, value jsonb, by_who text NOT NULL, note text);
CREATE TABLE IF NOT EXISTS cf_task (country text NOT NULL, task text NOT NULL, day date NOT NULL, state text NOT NULL, tries int NOT NULL, note text, PRIMARY KEY (country, task));
CREATE TABLE IF NOT EXISTS cf_day (day date PRIMARY KEY, ai_usd numeric NOT NULL DEFAULT 0, reads int NOT NULL DEFAULT 0, searches int NOT NULL DEFAULT 0);
`;
export const STATUS = Object.freeze({ confirmed: "confirmed", unconfirmed: "unconfirmed", approved: "approved", edited: "edited", rejected: "rejected" });
/* what a page may show — never an unconfirmed or rejected fact */
export const SHOWN = Object.freeze(["confirmed", "approved", "edited"]);
export const OWNER_DECIDED = Object.freeze(["approved", "edited", "rejected"]);
const ACTIONS = { approve: "approved", edit: "edited", reject: "rejected" };

const row = (r) => ({ key: r.key, country: r.country, profession: r.profession ?? null, part: r.part, kind: r.kind, value: r.value, sourceUrl: r.source_url ?? r.sourceUrl ?? null, sourceTitle: r.source_title ?? r.sourceTitle ?? null, readOn: r.read_on ? String(r.read_on).slice(0, 10) : r.readOn ?? null, status: r.status, by: r.by_who ?? r.by, aiWritten: Boolean(r.ai_written ?? r.aiWritten), proposedBy: r.proposed_by ?? r.proposedBy, why: r.why ?? null, at: r.at ? new Date(r.at).toISOString() : null });
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
  const SEL = "SELECT key, country, profession, part, kind, value, source_url, source_title, read_on::text AS read_on, status, by_who, ai_written, proposed_by, why, at FROM cf_fact";
  return Object.freeze({
    kind: "postgres", ensure,
    async facts({ country = null } = {}) { await ensure(); return (country ? await q(`${SEL} WHERE country = $1 ORDER BY key`, [country]) : await q(`${SEL} ORDER BY country, key`)).map(row); },
    async fact(key) { await ensure(); const [r] = await q(`${SEL} WHERE key = $1`, [key]); return r ? row(r) : null; },
    /** the collector's fact — refused (kept in the history only) when the owner has decided this key */
    async putFact(f, { at }) {
      checkFact(f);
      return tx(async (x) => {
        const [old] = await x("SELECT status, by_who, value, source_url FROM cf_fact WHERE key = $1 FOR UPDATE", [f.key]);
        if (old && OWNER_DECIDED.includes(old.status)) { await x("INSERT INTO cf_history (key, at, status, value, by_who, note) VALUES ($1,$2,$3,$4,$5,$6)", [f.key, at, f.status, JSON.stringify(f.value), "collector", `not applied — the owner ${old.status} this fact`]); return { saved: false, why: `the owner ${old.status} it` }; }
        if (old && old.status === f.status && canon(old.value) === canon(f.value) && old.source_url === (f.sourceUrl ?? null)) return { saved: false, why: "unchanged" };
        await x(`INSERT INTO cf_fact (key, country, profession, part, kind, value, source_url, source_title, read_on, status, by_who, ai_written, proposed_by, why, at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'collector',$11,$12,$13,$14)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, source_url = EXCLUDED.source_url, source_title = EXCLUDED.source_title, read_on = EXCLUDED.read_on, status = EXCLUDED.status, by_who = 'collector', ai_written = EXCLUDED.ai_written, proposed_by = EXCLUDED.proposed_by, why = EXCLUDED.why, at = EXCLUDED.at`,
          [f.key, f.country, f.profession ?? null, f.part, f.kind, JSON.stringify(f.value), f.sourceUrl ?? null, f.sourceTitle ?? null, f.readOn ?? null, f.status, Boolean(f.aiWritten), f.proposedBy, f.why ?? null, at]);
        await x("INSERT INTO cf_history (key, at, status, value, by_who, note) VALUES ($1,$2,$3,$4,'collector',$5)", [f.key, at, f.status, JSON.stringify(f.value), f.why ?? null]);
        return { saved: true };
      });
    },
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
    async tasks() { await ensure(); return new Map((await q("SELECT country, task, day::text AS day, state, tries, note FROM cf_task")).map((r) => [`${r.country}|${r.task}`, { day: r.day, state: r.state, tries: r.tries, note: r.note }])); },
    async setTask(country, task, { day, state, note = null }) { await ensure(); await q("INSERT INTO cf_task (country, task, day, state, tries, note) VALUES ($1,$2,$3,$4,1,$5) ON CONFLICT (country, task) DO UPDATE SET day = EXCLUDED.day, state = EXCLUDED.state, tries = cf_task.tries + 1, note = EXCLUDED.note", [country, task, day, state, note]); },
    async spend(day) { await ensure(); const [r] = await q("SELECT ai_usd::float8 AS ai, reads, searches FROM cf_day WHERE day = $1", [day]); return { aiUsd: r ? Number(r.ai) : 0, reads: r?.reads ?? 0, searches: r?.searches ?? 0 }; },
    async addSpend(day, { aiUsd = 0, reads = 0, searches = 0 }) { await ensure(); await q("INSERT INTO cf_day (day, ai_usd, reads, searches) VALUES ($1,$2,$3,$4) ON CONFLICT (day) DO UPDATE SET ai_usd = cf_day.ai_usd + EXCLUDED.ai_usd, reads = cf_day.reads + EXCLUDED.reads, searches = cf_day.searches + EXCLUDED.searches", [day, aiUsd, reads, searches]); },
    async close() { if (pool) await pool.end(); pool = null; ready = null; },
  });
}

/** the SAME contract in memory — for the tests that run where nothing is installed (CI) */
export function cfMemoryStore() {
  const facts = new Map(), hist = [], tasks = new Map(), days = new Map();
  const copy = (o) => JSON.parse(JSON.stringify(o));
  return Object.freeze({
    kind: "memory", ensure: async () => {},
    async facts({ country = null } = {}) { return [...facts.values()].filter((f) => !country || f.country === country).sort((a, b) => a.country.localeCompare(b.country) || a.key.localeCompare(b.key)).map(copy); },
    async fact(key) { return facts.has(key) ? copy(facts.get(key)) : null; },
    async putFact(f, { at }) {
      checkFact(f);
      const old = facts.get(f.key);
      if (old && OWNER_DECIDED.includes(old.status)) { hist.push({ key: f.key, at, status: f.status, value: copy(f.value), by: "collector", note: `not applied — the owner ${old.status} this fact` }); return { saved: false, why: `the owner ${old.status} it` }; }
      if (old && old.status === f.status && canon(old.value) === canon(f.value) && old.sourceUrl === (f.sourceUrl ?? null)) return { saved: false, why: "unchanged" };
      facts.set(f.key, row({ ...copy(f), sourceUrl: f.sourceUrl ?? null, by: "collector", at }));
      hist.push({ key: f.key, at, status: f.status, value: copy(f.value), by: "collector", note: f.why ?? null });
      return { saved: true };
    },
    async decide(key, { action, value = null, at }) {
      const status = ACTIONS[action]; if (!status) throw new Error(`no such action: ${action}`);
      const old = facts.get(key); if (!old) return { ok: false, why: "No such fact." };
      const v = action === "edit" ? copy(value) : old.value;
      facts.set(key, { ...old, status, value: v, by: "owner", at: new Date(at).toISOString() });
      hist.push({ key, at, status, value: copy(v), by: "owner", note: null });
      return { ok: true, status };
    },
    async history(key) { return hist.filter((h) => h.key === key).map((h) => ({ ...copy(h), at: new Date(h.at).toISOString() })).map(({ key: _k, ...h }) => h); },
    async tasks() { return new Map([...tasks.entries()].map(([k, v]) => [k, { ...v }])); },
    async setTask(country, task, { day, state, note = null }) { const k = `${country}|${task}`, o = tasks.get(k); tasks.set(k, { day, state, tries: (o?.tries ?? 0) + 1, note }); },
    async spend(day) { const d = days.get(day); return d ? { ...d } : { aiUsd: 0, reads: 0, searches: 0 }; },
    async addSpend(day, { aiUsd = 0, reads = 0, searches = 0 }) { const d = days.get(day) ?? { aiUsd: 0, reads: 0, searches: 0 }; days.set(day, { aiUsd: d.aiUsd + aiUsd, reads: d.reads + reads, searches: d.searches + searches }); },
    async close() {},
  });
}
