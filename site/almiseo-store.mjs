/**
 * 🔴 RR-360 · ALMISEO DATA'S OWN STORE — the same Neon database as the keywords and the country facts (kw-store.mjs dbUrlOf; never printed);
 * its tables are made by the deployed code itself (CREATE … IF NOT EXISTS, on first use).
 *   seo_topic     ONE topic list: every product of every client, every idea the owner adds (name, seeds, countries, languages, jobs)
 *   seo_finding   ONE findings store: source link + date; the same finding is never kept twice; a changed value raises "fact changed"
 *   seo_spend     ONE spend ledger: per day and job (top pages, research); the AI's dollars stay in cf_day and are read beside it
 *   seo_account   what a client's own collecting cost this month, against the plan's limit (a hash of the account — no name, no e-mail)
 *   seo_setting   the per-plan monthly limits
 *   tp_list       Google's top results for one intent, with its date — asked ONCE, reused by every client until it is due again
 *   tp_page       the STRUCTURE of one top page (headings, questions, tables, lists, length, date) — NEVER its text
 *   tp_coverage   the coverage list and second-search questions made from them (G5, G6)
 * Two stores with ONE contract (test/rr360-*.test.mjs runs the same tests on both): seoPgStore and seoMemoryStore.
 */
export const SEO_SCHEMA = `
CREATE TABLE IF NOT EXISTS seo_topic (id text PRIMARY KEY, data jsonb NOT NULL, at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS seo_finding (id text PRIMARY KEY, topic text NOT NULL, job text NOT NULL, kind text NOT NULL, text text NOT NULL, source_url text NOT NULL, on_day date NOT NULL, value text NOT NULL, changed boolean NOT NULL DEFAULT false, review text, was text, alerted boolean NOT NULL DEFAULT false, at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS seo_finding_topic ON seo_finding (topic, changed);
CREATE TABLE IF NOT EXISTS seo_spend (day date NOT NULL, job text NOT NULL, usd numeric NOT NULL DEFAULT 0, units int NOT NULL DEFAULT 0, PRIMARY KEY (day, job));
CREATE TABLE IF NOT EXISTS seo_account (month text NOT NULL, account text NOT NULL, usd numeric NOT NULL DEFAULT 0, PRIMARY KEY (month, account));
CREATE TABLE IF NOT EXISTS seo_setting (id text PRIMARY KEY, data jsonb NOT NULL, at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS tp_list (topic text NOT NULL, intent text NOT NULL, location text NOT NULL, language text NOT NULL, day date NOT NULL, results jsonb NOT NULL, paa jsonb NOT NULL, related jsonb NOT NULL, PRIMARY KEY (topic, intent, location, language));
CREATE TABLE IF NOT EXISTS tp_page (url text PRIMARY KEY, day date NOT NULL, ok boolean NOT NULL, why text, structure jsonb);
CREATE TABLE IF NOT EXISTS tp_coverage (topic text NOT NULL, intent text NOT NULL, day date NOT NULL, coverage jsonb NOT NULL, second jsonb NOT NULL, read jsonb NOT NULL, PRIMARY KEY (topic, intent));
`;
const copy = (o) => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
const needFinding = (f) => { if (!f?.sourceUrl) throw new Error("a finding needs a source link"); if (!f?.on) throw new Error("a finding needs its date"); for (const k of ["id", "topic", "job", "kind", "text", "value"]) if (!f?.[k]) throw new Error(`a finding needs its ${k}`); if (!/^https?:\/\//.test(f.sourceUrl)) throw new Error("a finding needs a source link"); if (!/^\d{4}-\d{2}-\d{2}$/.test(f.on)) throw new Error("a finding needs its date"); };
const findRow = (r) => ({ id: r.id, topic: r.topic, job: r.job, kind: r.kind, text: r.text, sourceUrl: r.source_url ?? r.sourceUrl, on: String(r.on_day ?? r.on).slice(0, 10), value: r.value, changed: Boolean(r.changed), review: r.review ?? null, was: r.was ?? null, alerted: Boolean(r.alerted) });

export function seoPgStore({ url, Pool = null, max = 3 }) {
  let pool = null, ready = null;
  const db = async () => { if (!pool) { const P = Pool ?? (await import("pg")).default.Pool; pool = new P({ connectionString: url, max, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 }); } return pool; };
  const q = async (sql, params = []) => (await (await db()).query(sql, params)).rows;
  const ensure = () => (ready ??= (async () => { await q(SEO_SCHEMA); })().catch((e) => { ready = null; throw e; }));
  const FSEL = "SELECT id, topic, job, kind, text, source_url, on_day::text AS on_day, value, changed, review, was, alerted FROM seo_finding";
  return Object.freeze({
    kind: "postgres", ensure,
    async topics() { await ensure(); return (await q("SELECT id, data FROM seo_topic ORDER BY id")).map((r) => ({ ...r.data, id: r.id })); },
    async putTopic(t, { at }) { await ensure(); await q("INSERT INTO seo_topic (id, data, at) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, at = EXCLUDED.at", [t.id, JSON.stringify(t), at]); },
    async delTopic(id) { await ensure(); await q("DELETE FROM seo_topic WHERE id = $1", [id]); },
    /** no repeats: the same value again only moves its date; another value → "fact changed", review needed */
    async addFinding(f, { at }) {
      needFinding(f); await ensure();
      const [old] = await q("SELECT value FROM seo_finding WHERE id = $1", [f.id]);
      if (!old) { await q("INSERT INTO seo_finding (id, topic, job, kind, text, source_url, on_day, value, at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [f.id, f.topic, f.job, f.kind, f.text, f.sourceUrl, f.on, f.value, at]); return { added: true, changed: false }; }
      if (old.value === f.value) { await q("UPDATE seo_finding SET on_day = $2 WHERE id = $1", [f.id, f.on]); return { added: false, changed: false }; }
      await q("UPDATE seo_finding SET text = $2, source_url = $3, on_day = $4, value = $5, was = $6, changed = true, review = 'needed', alerted = false, at = $7 WHERE id = $1", [f.id, f.text, f.sourceUrl, f.on, f.value, old.value, at]);
      return { added: false, changed: true, was: old.value };
    },
    async findings({ topic = null, changed = null } = {}) { await ensure(); const w = [], p = []; if (topic) { p.push(topic); w.push(`topic = $${p.length}`); } if (changed !== null) { p.push(changed); w.push(`changed = $${p.length}`); } return (await q(`${FSEL}${w.length ? ` WHERE ${w.join(" AND ")}` : ""} ORDER BY on_day DESC, id`, p)).map(findRow); },
    async markAlerted(ids) { await ensure(); if (ids.length) await q("UPDATE seo_finding SET alerted = true WHERE id = ANY($1::text[])", [ids]); },
    async settleReview(id) { await ensure(); const r = await q("UPDATE seo_finding SET review = 'done', changed = false WHERE id = $1 RETURNING id", [id]); return { ok: r.length > 0 }; },
    async addSpend(day, job, { usd = 0, units = 0 }) { await ensure(); await q("INSERT INTO seo_spend (day, job, usd, units) VALUES ($1,$2,$3,$4) ON CONFLICT (day, job) DO UPDATE SET usd = seo_spend.usd + EXCLUDED.usd, units = seo_spend.units + EXCLUDED.units", [day, job, usd, units]); },
    async spend(day, job) { await ensure(); const [r] = await q("SELECT usd::float8 AS usd, units FROM seo_spend WHERE day = $1 AND job = $2", [day, job]); return r ? { usd: Number(r.usd), units: r.units } : { usd: 0, units: 0 }; },
    async spendSince(since) { await ensure(); return (await q("SELECT day::text AS day, job, usd::float8 AS usd, units FROM seo_spend WHERE day >= $1 ORDER BY day, job", [since])).map((r) => ({ day: r.day, job: r.job, usd: Number(r.usd), units: r.units })); },
    async accountSpend(month, account) { await ensure(); const [r] = await q("SELECT usd::float8 AS usd FROM seo_account WHERE month = $1 AND account = $2", [month, account]); return r ? Number(r.usd) : 0; },
    async addAccountSpend(month, account, usd) { await ensure(); await q("INSERT INTO seo_account (month, account, usd) VALUES ($1,$2,$3) ON CONFLICT (month, account) DO UPDATE SET usd = seo_account.usd + EXCLUDED.usd", [month, account, usd]); },
    async setting(id) { await ensure(); const [r] = await q("SELECT data FROM seo_setting WHERE id = $1", [id]); return r?.data ?? null; },
    async setSetting(id, data, { at }) { await ensure(); await q("INSERT INTO seo_setting (id, data, at) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, at = EXCLUDED.at", [id, JSON.stringify(data), at]); },
    async putList(l) { await ensure(); await q("INSERT INTO tp_list (topic, intent, location, language, day, results, paa, related) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (topic, intent, location, language) DO UPDATE SET day = EXCLUDED.day, results = EXCLUDED.results, paa = EXCLUDED.paa, related = EXCLUDED.related", [l.topic, l.intent, l.location, l.language, l.day, JSON.stringify(l.results), JSON.stringify(l.paa), JSON.stringify(l.related)]); },
    async lists(topic) { await ensure(); return (await q("SELECT topic, intent, location, language, day::text AS day, results, paa, related FROM tp_list WHERE topic = $1", [topic])); },
    async putPage(p) { await ensure(); await q("INSERT INTO tp_page (url, day, ok, why, structure) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (url) DO UPDATE SET day = EXCLUDED.day, ok = EXCLUDED.ok, why = EXCLUDED.why, structure = EXCLUDED.structure", [p.url, p.day, p.ok, p.why ?? null, p.structure ? JSON.stringify(p.structure) : null]); },
    async pages(urls) { await ensure(); if (!urls.length) return []; return (await q("SELECT url, day::text AS day, ok, why, structure FROM tp_page WHERE url = ANY($1::text[])", [urls])); },
    async putCoverage(c) { await ensure(); await q("INSERT INTO tp_coverage (topic, intent, day, coverage, second, read) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (topic, intent) DO UPDATE SET day = EXCLUDED.day, coverage = EXCLUDED.coverage, second = EXCLUDED.second, read = EXCLUDED.read", [c.topic, c.intent, c.day, JSON.stringify(c.coverage), JSON.stringify(c.second), JSON.stringify(c.read)]); },
    async coverage(topic) { await ensure(); return (await q("SELECT topic, intent, day::text AS day, coverage, second, read FROM tp_coverage WHERE topic = $1 ORDER BY intent", [topic])); },
    async close() { if (pool) await pool.end(); pool = null; ready = null; },
  });
}

/** the SAME contract in memory — the tests in CI */
export function seoMemoryStore() {
  const topics = new Map(), found = new Map(), spend = new Map(), acc = new Map(), set = new Map(), lists = new Map(), pages = new Map(), cov = new Map();
  return Object.freeze({
    kind: "memory", ensure: async () => {},
    async topics() { return [...topics.values()].map(copy).sort((a, b) => a.id.localeCompare(b.id)); },
    async putTopic(t) { topics.set(t.id, copy(t)); },
    async delTopic(id) { topics.delete(id); },
    async addFinding(f) {
      needFinding(f);
      const old = found.get(f.id);
      if (!old) { found.set(f.id, { ...copy(f), changed: false, review: null, was: null, alerted: false }); return { added: true, changed: false }; }
      if (old.value === f.value) { old.on = f.on; return { added: false, changed: false }; }
      found.set(f.id, { ...old, text: f.text, sourceUrl: f.sourceUrl, on: f.on, value: f.value, was: old.value, changed: true, review: "needed", alerted: false });
      return { added: false, changed: true, was: old.value };
    },
    async findings({ topic = null, changed = null } = {}) { return [...found.values()].filter((f) => (!topic || f.topic === topic) && (changed === null || f.changed === changed)).sort((a, b) => b.on.localeCompare(a.on) || a.id.localeCompare(b.id)).map(findRow); },
    async markAlerted(ids) { for (const i of ids) if (found.has(i)) found.get(i).alerted = true; },
    async settleReview(id) { const f = found.get(id); if (!f) return { ok: false }; f.review = "done"; f.changed = false; return { ok: true }; },
    async addSpend(day, job, { usd = 0, units = 0 }) { const k = `${day}|${job}`, o = spend.get(k) ?? { day, job, usd: 0, units: 0 }; spend.set(k, { ...o, usd: o.usd + usd, units: o.units + units }); },
    async spend(day, job) { const o = spend.get(`${day}|${job}`); return o ? { usd: o.usd, units: o.units } : { usd: 0, units: 0 }; },
    async spendSince(since) { return [...spend.values()].filter((x) => x.day >= since).map(copy).sort((a, b) => a.day.localeCompare(b.day) || a.job.localeCompare(b.job)); },
    async accountSpend(month, account) { return acc.get(`${month}|${account}`) ?? 0; },
    async addAccountSpend(month, account, usd) { const k = `${month}|${account}`; acc.set(k, (acc.get(k) ?? 0) + usd); },
    async setting(id) { return set.has(id) ? copy(set.get(id)) : null; },
    async setSetting(id, data) { set.set(id, copy(data)); },
    async putList(l) { lists.set(`${l.topic}|${l.intent}|${l.location}|${l.language}`, copy(l)); },
    async lists(topic) { return [...lists.values()].filter((l) => l.topic === topic).map(copy); },
    async putPage(p) { pages.set(p.url, copy(p)); },
    async pages(urls) { return urls.filter((u) => pages.has(u)).map((u) => copy(pages.get(u))); },
    async putCoverage(c) { cov.set(`${c.topic}|${c.intent}`, copy(c)); },
    async coverage(topic) { return [...cov.values()].filter((c) => c.topic === topic).map(copy).sort((a, b) => a.intent.localeCompare(b.intent)); },
    async close() {},
  });
}
