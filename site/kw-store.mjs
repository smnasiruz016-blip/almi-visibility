/**
 * 🔴 RR-326 B · THE KEYWORD DATABASE — Neon (Postgres) on Vercel, by the connection NAME the Neon integration gives the project
 * (DATABASE_URL, else POSTGRES_URL); never printed or logged. The schema is made by the deployed code itself (CREATE … IF NOT EXISTS, on
 * first use) — nothing is run against it from a developer's computer.
 *   kw_fetch          one request's worth of keywords: what was asked (seed key), where (location), in which language, on which day —
 *                     UNIQUE per (seed key, location, language, day): the same thing is never collected twice in a day
 *   kw_observation    a keyword's Google figures for one location, language and DAY — a later day adds a row ONLY when a figure CHANGED
 *                     (RR-333: Google's figures are 12-month averages it updates monthly; an unchanged re-fetch stored the same row
 *                     again every day — the database's main growth); the old ones stay (history). A reader takes the newest figure
 *                     on or before the day it asks for; "today" counts the keywords FETCHED today (kw_fetch_keyword).
 *   kw_fetch_keyword  which keywords a fetch returned (the finder serves a search from it)
 *   kw_group_keyword  which product / category / YouTube niche a keyword was collected for, per location, and its last day
 *   kw_seed_list      the owner's editable seed list (site/kw-seeds.mjs)
 * RR-342 (owner: "~110 MB a day … the RR-333 fix is not enough"): a keyword's 12 months are stored in the SHORT shape ["2025-11", 120, 90, …]
 * (the first month, then one figure a month) and handed back to every reader in the old shape {"2025-11": 120, …}; old rows are put in
 * the short shape a batch at a time (packMonths). prune() drops, past RETAIN.days, the keyword list of a collected fetch (the finder
 * reuses a fetch for FINDER.reuseDays only) and an observation that a NEWER one on or before the cut-off replaces — the newest figure of
 * every keyword, and everything of the owner's files, always stay.
 * No personal data: no address, no visitor, no account — only words, places, numbers and dates.
 * Two stores with ONE contract (test/rr326-*.test.mjs runs the same tests on both): pgStore (production; locally on a throwaway Postgres)
 * and memoryStore (the tests in CI, which installs nothing). `pg` is loaded only when the database is used.
 */
export const DB_NAMES = Object.freeze(["DATABASE_URL", "POSTGRES_URL"]);
/* RR-342: the clean-up's cut-off (days, more than FINDER.reuseDays) and its batch sizes — one collector run spends at most a quarter of its time here */
export const RETAIN = Object.freeze({ days: 31, fetches: 50, rows: 10000, batches: 10 });
const nextMonth = (k) => { const [y, m] = k.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; };
/** RR-342 · {"2025-11": 120, "2025-12": 90} → ["2025-11", 120, 90]; a missing month in between is a null (every stored figure is a number) */
export function packMonths(m) {
  if (Array.isArray(m)) return m;
  if (!m || typeof m !== "object") return null;
  const ks = Object.keys(m).filter((k) => /^\d{4}-(0[1-9]|1[0-2])$/.test(k)).sort();
  if (!ks.length || ks.length !== Object.keys(m).length) return Object.keys(m).length ? m : null; // an unknown shape is kept as it was
  const out = [ks[0]];
  for (let k = ks[0]; k <= ks.at(-1); k = nextMonth(k)) out.push(Number.isFinite(m[k]) ? m[k] : null);
  return out;
}
/** RR-342 · the short shape back into the shape every reader knows */
export function unpackMonths(m) {
  if (!Array.isArray(m)) return m ?? null;
  const out = {}; let k = m[0];
  for (const v of m.slice(1)) { if (v !== null) out[k] = v; k = nextMonth(k); }
  return Object.keys(out).length ? out : null;
}
export const dbUrlOf = (env = process.env) => { for (const n of DB_NAMES) if (/^postgres(ql)?:\/\//.test(env[n] ?? "")) return env[n]; return null; };

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS kw_seed_list (id int PRIMARY KEY, text text NOT NULL, updated_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS kw_fetch (id bigserial PRIMARY KEY, unit_id text, kind text NOT NULL, grp text, seed_key text NOT NULL, location text NOT NULL, language text NOT NULL, day date NOT NULL, at timestamptz NOT NULL, period text, ops int NOT NULL, keywords int NOT NULL, UNIQUE (seed_key, location, language, day));
CREATE TABLE IF NOT EXISTS kw_observation (keyword text NOT NULL, location text NOT NULL, language text NOT NULL, day date NOT NULL, avg_monthly_searches bigint, months jsonb, period text, at timestamptz NOT NULL, PRIMARY KEY (keyword, location, language, day));
CREATE TABLE IF NOT EXISTS kw_fetch_keyword (fetch_id bigint NOT NULL REFERENCES kw_fetch(id), keyword text NOT NULL, PRIMARY KEY (fetch_id, keyword));
CREATE TABLE IF NOT EXISTS kw_group_keyword (grp text NOT NULL, keyword text NOT NULL, location text NOT NULL, last_day date NOT NULL, PRIMARY KEY (grp, keyword, location));
CREATE INDEX IF NOT EXISTS kw_observation_day ON kw_observation (day);
CREATE TABLE IF NOT EXISTS kw_creator_research (platform text NOT NULL, niche text NOT NULL, location text NOT NULL, day date NOT NULL, data jsonb NOT NULL, PRIMARY KEY (platform, niche, location));
`; // RR-348 c: kw_creator_research — the creator AI research (and YouTube's titles and tags), one row per platform × niche × country, the newest

const clean = (rows) => { const m = new Map(); for (const r of rows) { const k = String(r.text ?? "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " "); if (k && k.length <= 200 && !m.has(k)) m.set(k, { keyword: k, volume: Number.isFinite(r.said) ? r.said : null, months: r.months ?? null }); } return [...m.values()]; };

/** the database on Postgres. `Pool` is pg's (handed in, or loaded from the `pg` package on first use) */
export function pgStore({ url, Pool = null, max = 3 }) {
  let pool = null, ready = null;
  const db = async () => { if (!pool) { const P = Pool ?? (await import("pg")).default.Pool; pool = new P({ connectionString: url, max, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 }); } return pool; };
  const q = async (sql, params = []) => (await (await db()).query(sql, params)).rows;
  const ensure = () => (ready ??= (async () => { await q(SCHEMA); })().catch((e) => { ready = null; throw e; }));
  const tx = async (fn) => { await ensure(); const c = await (await db()).connect(); try { await c.query("BEGIN"); const out = await fn((s, p = []) => c.query(s, p).then((r) => r.rows)); await c.query("COMMIT"); return out; } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); } };
  return Object.freeze({
    kind: "postgres", ensure,
    /* RR-348 c · the creator settings (kw_seed_list row 3), the research, and the counts for the owner's Creators tab */
    async creatorSettings() { await ensure(); const [r] = await q("SELECT text FROM kw_seed_list WHERE id = 3"); try { return r ? JSON.parse(r.text) : null; } catch { return null; } },
    async setCreatorSettings(s, at) { await ensure(); await q("INSERT INTO kw_seed_list (id, text, updated_at) VALUES (3, $1, $2) ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at", [JSON.stringify(s), at]); },
    async creatorDays() { await ensure(); return new Map((await q("SELECT platform, niche, location, day::text AS day FROM kw_creator_research")).map((r) => [`${r.platform}|${r.niche}|${r.location}`, r.day])); },
    async saveCreatorResearch({ platform, niche, location, day, data }) { await ensure(); await q("INSERT INTO kw_creator_research (platform, niche, location, day, data) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (platform, niche, location) DO UPDATE SET day = EXCLUDED.day, data = EXCLUDED.data", [platform, niche, location, day, JSON.stringify(data)]); },
    async creatorResearch({ platform, niche, location = null }) { await ensure(); const [r] = await q("SELECT location, day::text AS day, data FROM kw_creator_research WHERE platform = $1 AND niche = $2 ORDER BY (location = $3) DESC, day DESC LIMIT 1", [platform, niche, location ?? ""]); return r ? { ...r.data, location: r.location, on: r.day } : null; },
    async creatorCounts() { await ensure();
      const research = await q("SELECT platform, niche, location, day::text AS day, (data ? 'youtube') AS yt FROM kw_creator_research ORDER BY platform, niche, location");
      const keywords = await q("SELECT f.grp, f.location, count(fk.keyword)::int AS keywords, max(f.day)::text AS day FROM kw_fetch f JOIN kw_fetch_keyword fk ON fk.fetch_id = f.id WHERE f.grp LIKE 'creator:%' GROUP BY 1, 2");
      return { research, keywords }; },
    async seedList() { await ensure(); const [r] = await q("SELECT text, updated_at::text AS at FROM kw_seed_list WHERE id = 1"); return r ? { text: r.text, at: r.at } : null; },
    async setSeedList(text, at) { await ensure(); await q("INSERT INTO kw_seed_list (id, text, updated_at) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at", [text, at]); },
    /** RR-334 · the AI's keyword ideas per product (the owner's templates b and d), as JSON in row 2 of the same table */
    async seedIdeas() { await ensure(); const [r] = await q("SELECT text FROM kw_seed_list WHERE id = 2"); try { return r ? JSON.parse(r.text) : {}; } catch { return {}; } },
    async setSeedIdeas(ideas, at) { await ensure(); await q("INSERT INTO kw_seed_list (id, text, updated_at) VALUES (2, $1, $2) ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at", [JSON.stringify(ideas), at]); },
    /** which of these seed keys (at a location and language) were fetched on or after `since` — Map "seedKey|location|language" → last day */
    async fetchedSince(since) { await ensure(); const rs = await q("SELECT seed_key, location, language, max(day)::text AS day FROM kw_fetch WHERE day >= $1 GROUP BY 1, 2, 3", [since]); return new Map(rs.map((r) => [`${r.seed_key}|${r.location}|${r.language}`, r.day])); },
    /** one fetch and its keywords, in one transaction; the same (seed key, location, language, day) a second time stores NOTHING */
    async saveFetch(f) {
      const rows = clean(f.rows);
      return tx(async (x) => {
        const [ins] = await x("INSERT INTO kw_fetch (unit_id, kind, grp, seed_key, location, language, day, at, period, ops, keywords) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (seed_key, location, language, day) DO NOTHING RETURNING id",
          [f.unitId ?? null, f.kind, f.group ?? null, f.seedKey, f.location, f.language, f.day, f.at, f.period ?? null, f.ops, rows.length]);
        if (!ins) return { duplicate: true, stored: 0 };
        if (rows.length) {
          const k = rows.map((r) => r.keyword), v = rows.map((r) => r.volume), m = rows.map((r) => (r.months ? JSON.stringify(packMonths(r.months)) : null)); // RR-342: the short shape
          await x("INSERT INTO kw_observation (keyword, location, language, day, avg_monthly_searches, months, period, at) SELECT t.k, $4, $5, $6, t.v, t.m::jsonb, $7, $8 FROM unnest($1::text[], $2::bigint[], $3::text[]) AS t(k, v, m) WHERE NOT EXISTS (SELECT 1 FROM (SELECT p.avg_monthly_searches, p.months FROM kw_observation p WHERE p.keyword = t.k AND p.location = $4 AND p.language = $5 AND p.day < $6 ORDER BY p.day DESC LIMIT 1) l WHERE l.avg_monthly_searches IS NOT DISTINCT FROM t.v AND l.months IS NOT DISTINCT FROM t.m::jsonb) ON CONFLICT (keyword, location, language, day) DO UPDATE SET avg_monthly_searches = EXCLUDED.avg_monthly_searches, months = EXCLUDED.months, period = EXCLUDED.period, at = EXCLUDED.at",
            [k, v, m, f.location, f.language, f.day, f.period ?? null, f.at]);
          await x("INSERT INTO kw_fetch_keyword (fetch_id, keyword) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING", [ins.id, k]);
          if (f.group) await x("INSERT INTO kw_group_keyword (grp, keyword, location, last_day) SELECT $1, unnest($2::text[]), $3, $4 ON CONFLICT (grp, keyword, location) DO UPDATE SET last_day = GREATEST(kw_group_keyword.last_day, EXCLUDED.last_day)", [f.group, k, f.location, f.day]);
        }
        return { duplicate: false, stored: rows.length };
      });
    },
    /** the newest fetch of a seed key at a location and language, on or after `since`, with its keywords' figures of that day */
    async findFetch({ seedKey, location, language, since }) {
      await ensure();
      const [f] = await q("SELECT id, day::text AS day, period, at::text AS at FROM kw_fetch WHERE seed_key = $1 AND location = $2 AND language = $3 AND day >= $4 ORDER BY day DESC LIMIT 1", [seedKey, location, language, since]);
      if (!f) return null;
      const rows = await q("SELECT o.keyword, o.avg_monthly_searches::text AS volume, o.months FROM kw_fetch_keyword fk JOIN LATERAL (SELECT * FROM kw_observation x WHERE x.keyword = fk.keyword AND x.location = $2 AND x.language = $3 AND x.day <= $4 ORDER BY x.day DESC LIMIT 1) o ON true WHERE fk.fetch_id = $1 ORDER BY o.avg_monthly_searches DESC NULLS LAST, o.keyword", [f.id, location, language, f.day]);
      return { day: f.day, period: f.period, rows: rows.map((r) => ({ keyword: r.keyword, volume: r.volume === null ? null : Number(r.volume), months: unpackMonths(r.months) })) };
    },
    /* RR-326 I · the owner's Keyword Planner files (kw-import.mjs) */
    /** was this file (its bytes' key) stored already — with any country or day? */
    async fileSeen(seedKey) { await ensure(); return (await q("SELECT 1 FROM kw_fetch WHERE seed_key = $1 LIMIT 1", [seedKey])).length > 0; },
    /** which of these keywords the database already holds at a location and language (any day) */
    async knownKeywords(keywords, { location, language }) { await ensure(); if (!keywords.length) return new Set(); return new Set((await q("SELECT DISTINCT keyword FROM kw_observation WHERE location = $1 AND language = $2 AND keyword = ANY($3::text[])", [location, language, keywords])).map((r) => r.keyword)); },
    /** keywords put under a product / category, per location (the last day kept) */
    async addGroupKeywords(grp, keywords, location, day) { await ensure(); if (keywords.length) await q("INSERT INTO kw_group_keyword (grp, keyword, location, last_day) SELECT $1, unnest($2::text[]), $3, $4 ON CONFLICT (grp, keyword, location) DO UPDATE SET last_day = GREATEST(kw_group_keyword.last_day, EXCLUDED.last_day)", [grp, keywords, location, day]); },
    /** the files' keywords holding one of these phrases (every word, whole words, any order) at a location — each keyword's newest file figure */
    async fileKeywords({ phrases, location, language, limit = 2000 }) {
      await ensure();
      const res = phrases.map((p) => String(p).split(" ").filter(Boolean).map((w) => `(?=.*\\m${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\M)`).join("")).filter(Boolean);
      if (!res.length) return null;
      const rows = await q(`SELECT * FROM (SELECT DISTINCT ON (o.keyword) o.keyword, o.avg_monthly_searches::text AS volume, o.months, o.day::text AS day, o.period FROM kw_observation o JOIN kw_fetch_keyword fk ON fk.keyword = o.keyword JOIN kw_fetch f ON f.id = fk.fetch_id AND f.kind = 'file' AND f.location = o.location AND f.language = o.language AND o.day <= f.day WHERE o.location = $1 AND o.language = $2 AND o.keyword ~ ANY($3::text[]) ORDER BY o.keyword, o.day DESC) x ORDER BY (volume IS NULL), volume::bigint DESC, keyword LIMIT $4`, [location, language, res, limit]);
      if (!rows.length) return null;
      return { day: rows.map((r) => r.day).sort().at(-1), period: rows.find((r) => r.period)?.period ?? null, rows: rows.map((r) => ({ keyword: r.keyword, volume: r.volume === null ? null : Number(r.volume), months: unpackMonths(r.months) })) };
    },
    /** RR-342 · up to `rows` old observations put in the short months shape (same figures); the number changed */
    async packMonths({ rows = RETAIN.rows } = {}) {
      await ensure();
      const old = await q("SELECT keyword, location, language, day::text AS day, months FROM kw_observation WHERE jsonb_typeof(months) = 'object' LIMIT $1", [rows]);
      if (!old.length) return 0;
      await q("UPDATE kw_observation o SET months = t.m::jsonb FROM unnest($1::text[], $2::text[], $3::text[], $4::date[], $5::text[]) AS t(k, l, g, d, m) WHERE o.keyword = t.k AND o.location = t.l AND o.language = t.g AND o.day = t.d",
        [old.map((r) => r.keyword), old.map((r) => r.location), old.map((r) => r.language), old.map((r) => r.day), old.map((r) => { const p = packMonths(r.months); return p ? JSON.stringify(p) : null; })]);
      return old.length;
    },
    /** RR-342 · the clean-up before `before` (one batch): a collected fetch's keyword list, and observations a newer one on or before the
     *  cut-off replaces — never the newest, never a keyword of the owner's files, never a kw_fetch row (fetchedSince and fileSeen read them) */
    async prune({ before, fetches = RETAIN.fetches, rows = RETAIN.rows }) {
      await ensure();
      const [a] = await q("WITH f AS (SELECT id FROM kw_fetch WHERE kind <> 'file' AND day < $1 AND EXISTS (SELECT 1 FROM kw_fetch_keyword k WHERE k.fetch_id = kw_fetch.id) ORDER BY day LIMIT $2), d AS (DELETE FROM kw_fetch_keyword WHERE fetch_id IN (SELECT id FROM f) RETURNING 1) SELECT count(*)::int AS n FROM d", [before, fetches]);
      const [b] = await q("WITH w AS (SELECT DISTINCT fk.keyword, f.location, f.language FROM kw_fetch f JOIN kw_fetch_keyword fk ON fk.fetch_id = f.id WHERE f.kind = 'file'), old AS (SELECT o.ctid FROM kw_observation o WHERE o.day < $1 AND EXISTS (SELECT 1 FROM kw_observation n WHERE n.keyword = o.keyword AND n.location = o.location AND n.language = o.language AND n.day > o.day AND n.day <= $1) AND NOT EXISTS (SELECT 1 FROM w WHERE w.keyword = o.keyword AND w.location = o.location AND w.language = o.language) LIMIT $2), d AS (DELETE FROM kw_observation WHERE ctid IN (SELECT ctid FROM old) RETURNING 1) SELECT count(*)::int AS n FROM d", [before, rows]);
      return { fetchKeywords: a?.n ?? 0, observations: b?.n ?? 0 };
    },
    /** RR-328 B · every keyword the database holds at a location (any source), each with its newest figure — the country's own searches */
    async keywordsAt({ location, language, limit = 3000 }) {
      await ensure();
      const rows = await q("SELECT * FROM (SELECT DISTINCT ON (keyword) keyword, avg_monthly_searches::text AS volume, day::text AS day, period FROM kw_observation WHERE location = $1 AND language = $2 ORDER BY keyword, day DESC) x ORDER BY (volume IS NULL), volume::bigint DESC, keyword LIMIT $3", [location, language, limit]);
      return rows.map((r) => ({ keyword: r.keyword, volume: r.volume === null ? null : Number(r.volume), day: r.day, period: r.period }));
    },
    /** RR-329 F · the whole database's size in MB (Postgres' own count) — the collector stops before the plan's limit */
    async sizeMb() { await ensure(); const [r] = await q("SELECT pg_database_size(current_database())::float8 / 1048576 AS mb"); return Math.round(Number(r.mb) * 10) / 10; },
    /** the owner's page: totals, today, per group (keywords, countries, last refresh), per location */
    async counts(day) {
      await ensure();
      const [t] = await q("SELECT count(DISTINCT keyword)::int AS keywords, count(*)::int AS observations, 0 AS today FROM kw_observation"); t.today = (await q("SELECT count(DISTINCT fk.keyword)::int AS n FROM kw_fetch_keyword fk JOIN kw_fetch f ON f.id = fk.fetch_id WHERE f.day = $1", [day]))[0]?.n ?? 0;
      const groups = await q("SELECT grp, count(DISTINCT keyword)::int AS keywords, count(DISTINCT keyword) FILTER (WHERE last_day = $1)::int AS today, count(DISTINCT location)::int AS locations, max(last_day)::text AS last FROM kw_group_keyword GROUP BY grp ORDER BY grp", [day]);
      const locs = await q("SELECT o.location, count(DISTINCT o.keyword)::int AS keywords, (SELECT count(DISTINCT fk.keyword)::int FROM kw_fetch_keyword fk JOIN kw_fetch f ON f.id = fk.fetch_id WHERE f.day = $1 AND f.location = o.location) AS today FROM kw_observation o GROUP BY o.location ORDER BY o.location", [day]);
      const fetches = await q("SELECT kind, count(*)::int AS n, coalesce(sum(ops), 0)::int AS ops FROM kw_fetch WHERE day = $1 GROUP BY kind", [day]);
      return { ...t, groups, locations: locs, fetchesToday: Object.fromEntries(fetches.map((r) => [r.kind, { fetches: r.n, ops: r.ops }])) };
    },
    /** RR-333 D · the keywords collected for some groups (a product, our Search Console), each with its newest figure per location */
    async groupKeywords(groups) { await ensure(); return (await q("SELECT gk.keyword, gk.location, o.avg_monthly_searches::text AS volume, gk.grp FROM kw_group_keyword gk LEFT JOIN LATERAL (SELECT avg_monthly_searches FROM kw_observation x WHERE x.keyword = gk.keyword AND x.location = gk.location ORDER BY x.day DESC LIMIT 1) o ON true WHERE gk.grp = ANY($1::text[])", [groups])).map((r) => ({ keyword: r.keyword, location: r.location, volume: r.volume === null ? null : Number(r.volume), group: r.grp })); },
    /** RR-333 · what takes the room: the biggest tables (their own size with indexes), in MB — for /owner */
    async tableSizes() { await ensure(); return (await q("SELECT relname AS name, round(pg_total_relation_size(relid) / 1048576.0, 1)::float8 AS mb, n_live_tup::bigint AS rows FROM pg_catalog.pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 8")).map((r) => ({ name: r.name, mb: Number(r.mb), rows: Number(r.rows) })); },
    async close() { if (pool) await pool.end(); pool = null; ready = null; },
  });
}

/** the SAME contract in memory — for the tests that run where nothing is installed (CI) */
export function memoryStore({ sizeMb = null } = {}) {
  let list = null, nextId = 1, ideas = {};
  const creator = { settings: null, rows: new Map() }; // RR-348 c
  const fetches = new Map(), obs = new Map(), fk = new Map(), gk = new Map();
  const fkey = (f) => `${f.seedKey}|${f.location}|${f.language}|${f.day}`;
  const newestAt = (keyword, location, language, day, before = false) => { let best = null; for (const o of obs.values()) if (o.keyword === keyword && o.location === location && o.language === language && (before ? o.day < day : o.day <= day) && (!best || o.day > best.day)) best = o; return best; };
  const fetchedOn = (day) => { const ids = new Map([...fetches.values()].filter((f) => f.day === day).map((f) => [f.id, f])); return [...fk.values()].filter((x) => ids.has(x.id)).map((x) => ({ keyword: x.keyword, location: ids.get(x.id).location })); };
  return Object.freeze({
    kind: "memory", ensure: async () => {},
    /* RR-348 c · the creator settings, research and counts — the same contract */
    async creatorSettings() { return creator.settings ? JSON.parse(JSON.stringify(creator.settings)) : null; },
    async setCreatorSettings(s) { creator.settings = JSON.parse(JSON.stringify(s)); },
    async creatorDays() { return new Map([...creator.rows.values()].map((r) => [`${r.platform}|${r.niche}|${r.location}`, r.day])); },
    async saveCreatorResearch({ platform, niche, location, day, data }) { creator.rows.set(`${platform}|${niche}|${location}`, { platform, niche, location, day, data: JSON.parse(JSON.stringify(data)) }); },
    async creatorResearch({ platform, niche, location = null }) { const rs = [...creator.rows.values()].filter((r) => r.platform === platform && r.niche === niche).sort((a, b) => (b.location === location) - (a.location === location) || b.day.localeCompare(a.day)); return rs[0] ? { ...rs[0].data, location: rs[0].location, on: rs[0].day } : null; },
    async creatorCounts() {
      const research = [...creator.rows.values()].map((r) => ({ platform: r.platform, niche: r.niche, location: r.location, day: r.day, yt: Boolean(r.data.youtube) }));
      const m = new Map(); for (const f of fetches.values()) if (String(f.group ?? "").startsWith("creator:")) { const k = `${f.group}|${f.location}`, o = m.get(k) ?? { grp: f.group, location: f.location, keywords: 0, day: f.day }; o.keywords += [...fk.values()].filter((x) => x.id === f.id).length; if (f.day > o.day) o.day = f.day; m.set(k, o); }
      return { research, keywords: [...m.values()] }; },
    /* RR-333: the newest figure on or before a day (an unchanged figure is not stored again); the keywords fetched on a day */
    async seedList() { return list ? { ...list } : null; },
    async setSeedList(text, at) { list = { text, at }; },
    async seedIdeas() { return JSON.parse(JSON.stringify(ideas)); },
    async setSeedIdeas(x) { ideas = JSON.parse(JSON.stringify(x)); },
    async fetchedSince(since) { const m = new Map(); for (const f of fetches.values()) if (f.day >= since) { const k = `${f.seedKey}|${f.location}|${f.language}`; if (!m.has(k) || m.get(k) < f.day) m.set(k, f.day); } return m; },
    async saveFetch(f) {
      if (fetches.has(fkey(f))) return { duplicate: true, stored: 0 };
      const rows = clean(f.rows), id = nextId++;
      fetches.set(fkey(f), { id, kind: f.kind, group: f.group ?? null, seedKey: f.seedKey, location: f.location, language: f.language, day: f.day, period: f.period ?? null, ops: f.ops });
      for (const r of rows) {
        const prev = newestAt(r.keyword, f.location, f.language, f.day, true);
        const pm = packMonths(r.months); // RR-342: the short shape, as on Postgres
        if (!prev || prev.volume !== r.volume || JSON.stringify(prev.months ?? null) !== JSON.stringify(pm ?? null)) obs.set(`${r.keyword}|${f.location}|${f.language}|${f.day}`, { keyword: r.keyword, location: f.location, language: f.language, day: f.day, volume: r.volume, months: pm, period: f.period ?? null });
        fk.set(`${id}|${r.keyword}`, { id, keyword: r.keyword });
        if (f.group) { const k = `${f.group}|${r.keyword}|${f.location}`, o = gk.get(k); gk.set(k, { grp: f.group, keyword: r.keyword, location: f.location, last: o && o.last > f.day ? o.last : f.day }); }
      }
      return { duplicate: false, stored: rows.length };
    },
    async findFetch({ seedKey, location, language, since }) {
      const f = [...fetches.values()].filter((x) => x.seedKey === seedKey && x.location === location && x.language === language && x.day >= since).sort((a, b) => b.day.localeCompare(a.day))[0];
      if (!f) return null;
      const rows = [...fk.values()].filter((x) => x.id === f.id).map((x) => newestAt(x.keyword, location, language, f.day)).filter(Boolean)
        .map((o) => ({ keyword: o.keyword, volume: o.volume, months: unpackMonths(o.months) })).sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1) || a.keyword.localeCompare(b.keyword));
      return { day: f.day, period: f.period, rows };
    },
    async fileSeen(seedKey) { return [...fetches.values()].some((f) => f.seedKey === seedKey); },
    async knownKeywords(keywords, { location, language }) { const have = new Set([...obs.values()].filter((o) => o.location === location && o.language === language).map((o) => o.keyword)); return new Set(keywords.filter((k) => have.has(k))); },
    async addGroupKeywords(grp, keywords, location, day) { for (const kw of keywords) { const k = `${grp}|${kw}|${location}`, o = gk.get(k); gk.set(k, { grp, keyword: kw, location, last: o && o.last > day ? o.last : day }); } },
    async fileKeywords({ phrases, location, language, limit = 2000 }) {
      const tests = phrases.map((p) => String(p).split(" ").filter(Boolean).map((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u"))).filter((t) => t.length);
      if (!tests.length) return null;
      const files = [...fetches.values()].filter((f) => f.kind === "file" && f.location === location && f.language === language), best = new Map();
      for (const f of files) for (const x of fk.values()) {
        if (x.id !== f.id || !tests.some((t) => t.every((r) => r.test(x.keyword)))) continue;
        const o = newestAt(x.keyword, location, language, f.day); if (o && (!best.has(o.keyword) || best.get(o.keyword).day < o.day)) best.set(o.keyword, o);
      }
      const rows = [...best.values()].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1) || a.keyword.localeCompare(b.keyword)).slice(0, limit);
      if (!rows.length) return null;
      return { day: rows.map((r) => r.day).sort().at(-1), period: rows.find((r) => r.period)?.period ?? null, rows: rows.map((o) => ({ keyword: o.keyword, volume: o.volume, months: unpackMonths(o.months) })) };
    },
    /* RR-342 · the same packing and clean-up as on Postgres (and `_put` stores an OLD-shape row, as rows written before RR-342 are — tests only) */
    async packMonths({ rows = RETAIN.rows } = {}) { let n = 0; for (const o of obs.values()) { if (n >= rows) break; if (o.months && !Array.isArray(o.months)) { o.months = packMonths(o.months); n++; } } return n; },
    async prune({ before, fetches: nf = RETAIN.fetches, rows = RETAIN.rows }) {
      const ids = new Set([...fetches.values()].filter((f) => f.kind !== "file" && f.day < before && [...fk.values()].some((x) => x.id === f.id)).sort((a, b) => a.day.localeCompare(b.day)).slice(0, nf).map((f) => f.id));
      let a = 0, b = 0; for (const [k, x] of fk) if (ids.has(x.id)) { fk.delete(k); a++; }
      const byId = new Map([...fetches.values()].map((f) => [f.id, f]));
      const kept = new Set([...fk.values()].filter((x) => byId.get(x.id)?.kind === "file").map((x) => `${x.keyword}|${byId.get(x.id).location}|${byId.get(x.id).language}`));
      for (const [k, o] of [...obs]) {
        if (b >= rows) break;
        if (o.day >= before || kept.has(`${o.keyword}|${o.location}|${o.language}`)) continue;
        if ([...obs.values()].some((n) => n.keyword === o.keyword && n.location === o.location && n.language === o.language && n.day > o.day && n.day <= before)) { obs.delete(k); b++; }
      }
      return { fetchKeywords: a, observations: b };
    },
    _put(o) { obs.set(`${o.keyword}|${o.location}|${o.language}|${o.day}`, { period: null, ...o }); },
    async keywordsAt({ location, language, limit = 3000 }) {
      const best = new Map(); for (const o of obs.values()) if (o.location === location && o.language === language && (!best.has(o.keyword) || best.get(o.keyword).day < o.day)) best.set(o.keyword, o);
      return [...best.values()].sort((a, b) => (a.volume === null) - (b.volume === null) || (b.volume ?? 0) - (a.volume ?? 0) || a.keyword.localeCompare(b.keyword)).slice(0, limit).map((o) => ({ keyword: o.keyword, volume: o.volume, day: o.day, period: o.period }));
    },
    /* the tests hand a size in (a number, or a function of what is held) */
    async groupKeywords(groups) { return [...gk.values()].filter((x) => groups.includes(x.grp)).map((x) => { let best = null; for (const o of obs.values()) if (o.keyword === x.keyword && o.location === x.location && (!best || o.day > best.day)) best = o; return { keyword: x.keyword, location: x.location, volume: best?.volume ?? null, group: x.grp }; }); },
    async sizeMb() { return typeof sizeMb === "function" ? sizeMb({ observations: obs.size, fetches: fetches.size }) : sizeMb; },
    async counts(day) {
      const o = [...obs.values()], d = (xs) => new Set(xs).size;
      const groups = [...new Set([...gk.values()].map((x) => x.grp))].sort().map((g) => { const xs = [...gk.values()].filter((x) => x.grp === g); return { grp: g, keywords: d(xs.map((x) => x.keyword)), today: d(xs.filter((x) => x.last === day).map((x) => x.keyword)), locations: d(xs.map((x) => x.location)), last: xs.map((x) => x.last).sort().at(-1) }; });
      const locations = [...new Set(o.map((x) => x.location))].sort().map((l) => ({ location: l, keywords: d(o.filter((x) => x.location === l).map((x) => x.keyword)), today: d(fetchedOn(day).filter((x) => x.location === l).map((x) => x.keyword)) }));
      const fd = [...fetches.values()].filter((f) => f.day === day), kinds = [...new Set(fd.map((f) => f.kind))];
      return { keywords: d(o.map((x) => x.keyword)), observations: o.length, today: d(fetchedOn(day).map((x) => x.keyword)), groups, locations,
        fetchesToday: Object.fromEntries(kinds.map((k) => [k, { fetches: fd.filter((f) => f.kind === k).length, ops: fd.filter((f) => f.kind === k).reduce((s, f) => s + f.ops, 0) }])) };
    },
    async close() {},
  });
}
