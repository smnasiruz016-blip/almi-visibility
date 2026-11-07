/**
 * 🔴 RR-386 §2.4 · AUTOPILOT WHILE THE CLIENT'S COMPUTER IS OFF — the AlmiSEO Data server's part. The cycle itself runs in a runner
 * (desktop/autopilot-runner.mjs: the app, headless, on a scheduled GitHub Actions job — a cycle can take longer than the 300 s a Vercel
 * function may run); this server only KEEPS, under lock:
 *   ap_product  one row per product of an account: its mode, the product's data (a bundle, version-numbered), the client's keys for the
 *               runner (typed once in the app; ENCRYPTED; never shown again, never sent back to the app), the runner's lease, the last
 *               cycle, the weekly report
 *   ap_chunk    the bundle in chunks (a Vercel request carries at most 4.5 MB)
 * Everything at rest is AES-256-GCM with a key derived (HKDF) from AUTOPILOT_KEY, else CRON_SECRET — no new secret to type; rotating
 * that secret makes the saved bundles unreadable (said in the owner's notes). The app reaches it with its licence (/v1/autopilot/…); the
 * runner with AUTOPILOT_RUNNER_KEY (/runner/autopilot/…), the one value the owner sets in Vercel and in GitHub. Nothing here logs a key,
 * a bundle or a product's data.
 */
import { createHash, createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

export const AP_SCHEMA = `
CREATE TABLE IF NOT EXISTS ap_product (key text PRIMARY KEY, account text NOT NULL, product text NOT NULL, mode text NOT NULL DEFAULT 'review', version int NOT NULL DEFAULT 0, chunks int NOT NULL DEFAULT 0, size int NOT NULL DEFAULT 0, secrets bytea, names jsonb NOT NULL DEFAULT '[]', email text, lease_until timestamptz, lease_by text, last jsonb, weekly jsonb, weekly_sent date, at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS ap_chunk (key text NOT NULL, version int NOT NULL, n int NOT NULL, data bytea NOT NULL, PRIMARY KEY (key, version, n));
`;
export const AP_LIMITS = Object.freeze({ chunkBytes: 4_400_000, maxChunks: 40, leaseMs: 6 * 3600 * 1000, dueMs: 23 * 3600 * 1000 });
export const SECRET_NAMES = Object.freeze(["ANTHROPIC_API_KEY", "GITHUB_TOKEN", "DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD", "VERCEL_BYPASS", "PAGESPEED_API_KEY"]);
export const productKey = (account, product) => createHash("sha256").update(`almivisibility-autopilot|${account}|${product}`).digest("hex").slice(0, 32);

/** the at-rest key: HKDF of AUTOPILOT_KEY, else CRON_SECRET; null when neither is set (the feature then says it is not connected) */
export function sealKey(env) { const s = String(env.AUTOPILOT_KEY ?? env.CRON_SECRET ?? ""); return s.length >= 16 ? Buffer.from(hkdfSync("sha256", s, "almivisibility-autopilot", "at-rest-v1", 32)) : null; }
export const seal = (key, buf) => { const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key, iv), body = Buffer.concat([c.update(buf), c.final()]); return Buffer.concat([iv, c.getAuthTag(), body]); };
export const open = (key, buf) => { const b = Buffer.from(buf), d = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]); };
export const runnerAllowed = (env, header) => { const s = String(env.AUTOPILOT_RUNNER_KEY ?? ""), got = String(header ?? ""); return s.length >= 24 && got.length === s.length && timingSafeEqual(Buffer.from(got), Buffer.from(s)); };

/** the store: Postgres (Neon) and a memory twin for the tests — ONE contract */
export function apPgStore({ url, Pool = null }) {
  let pool = null, ready = null;
  const db = async () => { if (!pool) { const P = Pool ?? (await import("pg")).default.Pool; pool = new P({ connectionString: url, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000 }); } return pool; };
  const q = async (sql, p = []) => (await (await db()).query(sql, p)).rows, ensure = () => (ready ??= q(AP_SCHEMA).catch((e) => { ready = null; throw e; }));
  return Object.freeze({
    async get(key) { await ensure(); return (await q("SELECT key, account, product, mode, version, chunks, size, secrets, names, email, lease_until, lease_by, last, weekly, weekly_sent::text AS weekly_sent, at FROM ap_product WHERE key = $1", [key]))[0] ?? null; },
    async put(row) { await ensure(); await q(`INSERT INTO ap_product (key, account, product, mode, version, chunks, size, secrets, names, email, lease_until, lease_by, last, weekly, weekly_sent, at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now()) ON CONFLICT (key) DO UPDATE SET mode=$4, version=$5, chunks=$6, size=$7, secrets=$8, names=$9, email=$10, lease_until=$11, lease_by=$12, last=$13, weekly=$14, weekly_sent=$15, at=now()`, [row.key, row.account, row.product, row.mode, row.version, row.chunks, row.size, row.secrets ?? null, JSON.stringify(row.names ?? []), row.email ?? null, row.lease_until ?? null, row.lease_by ?? null, row.last ? JSON.stringify(row.last) : null, row.weekly ? JSON.stringify(row.weekly) : null, row.weekly_sent ?? null]); },
    async all() { await ensure(); return q("SELECT key, account, product, mode, version, chunks, lease_until, last, at FROM ap_product"); },
    async putChunk(key, version, n, data) { await ensure(); await q("INSERT INTO ap_chunk (key, version, n, data) VALUES ($1,$2,$3,$4) ON CONFLICT (key, version, n) DO UPDATE SET data = $4", [key, version, n, data]); },
    async chunk(key, version, n) { await ensure(); return (await q("SELECT data FROM ap_chunk WHERE key = $1 AND version = $2 AND n = $3", [key, version, n]))[0]?.data ?? null; },
    async dropOld(key, keep) { await ensure(); await q("DELETE FROM ap_chunk WHERE key = $1 AND version <> $2", [key, keep]); },
  });
}
export function apMemoryStore() {
  const rows = new Map(), chunks = new Map();
  return Object.freeze({
    async get(key) { return rows.get(key) ? { ...rows.get(key) } : null; }, async put(row) { rows.set(row.key, { ...row, at: new Date() }); }, async all() { return [...rows.values()].map((r) => ({ ...r })); },
    async putChunk(key, version, n, data) { chunks.set(`${key}|${version}|${n}`, Buffer.from(data)); }, async chunk(key, version, n) { return chunks.get(`${key}|${version}|${n}`) ?? null; },
    async dropOld(key, keep) { for (const k of [...chunks.keys()]) { const [a, v] = k.split("|"); if (a === key && Number(v) !== keep) chunks.delete(k); } },
  });
}

const view = (r) => r && { mode: r.mode, version: r.version, chunks: r.chunks, size: r.size, keys: r.names ?? [], lease: r.lease_until && Date.parse(r.lease_until) > Date.now() ? { by: r.lease_by, until: new Date(r.lease_until).toISOString() } : null, last: r.last ?? null, weekly: r.weekly ?? null };
/**
 * The routes. lic: the app's checked licence ({ ok, account } — site/kw-service.mjs checkLicence) for /v1; the runner's header for /runner.
 * → null when the path is not ours; else { status, json } or { status, bytes, headers }
 */
export async function apHandle({ method, path, query, raw, headers, env, store, lic, now = Date.now(), sendWeekly = null }) {
  const v1 = /^\/v1\/autopilot\/([A-Za-z0-9_-]{1,64})(\/state)?$/.exec(path), rn = /^\/runner\/autopilot\/(due|([0-9a-f]{32})\/(state|secrets|done))$/.exec(path);
  if (!v1 && !rn) return null;
  const key0 = sealKey(env); if (!store || !key0) return { status: 503, json: { ok: false, why: "Autopilot on our server is not connected yet (the database or its key is missing)." } };
  const json = () => { try { return JSON.parse(raw.toString("utf8") || "{}"); } catch { return {}; } };
  if (v1) {
    if (!lic?.ok) return { status: lic?.status ?? 401, json: { ok: false, why: lic?.why ?? "Your licence was not sent." } };
    const key = productKey(lic.account, v1[1]); let row = await store.get(key);
    if (!v1[2]) {
      if (method === "GET") return { status: 200, json: { ok: true, ...(view(row) ?? { mode: "review", version: 0, chunks: 0, keys: [] }) } };
      if (method !== "POST") return { status: 405, json: { ok: false } };
      const b = json(); row ??= { key, account: lic.account, product: v1[1], mode: "review", version: 0, chunks: 0, size: 0, names: [] };
      if (b.mode === "autopilot" || b.mode === "review") row.mode = b.mode;
      if (b.email !== undefined) row.email = String(b.email ?? "").trim().slice(0, 200) || null;
      if (b.keys && typeof b.keys === "object") { const was = row.secrets ? JSON.parse(open(key0, row.secrets).toString("utf8")) : {}; for (const [k, v] of Object.entries(b.keys)) { if (!SECRET_NAMES.includes(k)) continue; const s = String(v ?? "").trim(); if (s) was[k] = s; else delete was[k]; } row.secrets = seal(key0, Buffer.from(JSON.stringify(was))); row.names = Object.keys(was).sort(); }
      await store.put(row); return { status: 200, json: { ok: true, ...view(row) } };
    }
    /* the bundle, in chunks: POST ?version=&n=&of= (the last chunk makes the version current), GET ?n= */
    if (method === "POST") {
      const version = Number(query.get("version")), n = Number(query.get("n")), of = Number(query.get("of"));
      if (!row) return { status: 409, json: { ok: false, why: "Turn autopilot on first." } };
      if (row.lease_until && Date.parse(row.lease_until) > now && row.lease_by !== "app") return { status: 423, json: { ok: false, why: "A cycle is running on our server now: your changes are sent when it ends." } };
      if (!(version === row.version + 1) || !(n >= 0 && n < of && of <= AP_LIMITS.maxChunks) || raw.length > AP_LIMITS.chunkBytes) return { status: 400, json: { ok: false, why: `Send version ${row.version + 1}, chunk by chunk.` } };
      await store.putChunk(key, version, n, seal(key0, raw));
      if (n === of - 1) { for (let i = 0; i < of; i++) if (!(await store.chunk(key, version, i))) return { status: 400, json: { ok: false, why: `Chunk ${i} is missing.` } }; Object.assign(row, { version, chunks: of, size: Number(query.get("size")) || 0 }); await store.put(row); await store.dropOld(key, version); }
      return { status: 200, json: { ok: true, version: n === of - 1 ? version : row.version } };
    }
    if (method === "GET") { if (!row?.version) return { status: 404, json: { ok: false, why: "Nothing kept yet." } }; const n = Number(query.get("n") ?? 0), c = await store.chunk(key, row.version, n); return c ? { status: 200, bytes: open(key0, c), headers: { "x-version": String(row.version), "x-chunks": String(row.chunks) } } : { status: 404, json: { ok: false } }; }
    return { status: 405, json: { ok: false } };
  }
  /* the runner */
  if (!runnerAllowed(env, headers["x-autopilot-runner"])) return { status: 401, json: { ok: false } };
  if (rn[1] === "due") { const out = []; for (const r of await store.all()) { if (r.mode !== "autopilot" || !r.version || (r.lease_until && Date.parse(r.lease_until) > now) || (r.last?.on && now - Date.parse(r.last.on) < AP_LIMITS.dueMs)) continue; const full = await store.get(r.key); full.lease_until = new Date(now + AP_LIMITS.leaseMs).toISOString(); full.lease_by = "runner"; await store.put(full); out.push({ key: r.key, product: r.product, version: r.version, chunks: r.chunks }); } return { status: 200, json: { ok: true, due: out } }; }
  const key = rn[2], row = await store.get(key); if (!row) return { status: 404, json: { ok: false } };
  if (rn[3] === "secrets") return { status: 200, json: { ok: true, keys: row.secrets ? JSON.parse(open(key0, row.secrets).toString("utf8")) : {} } };
  if (rn[3] === "state" && method === "GET") { const c = await store.chunk(key, row.version, Number(query.get("n") ?? 0)); return c ? { status: 200, bytes: open(key0, c), headers: { "x-version": String(row.version), "x-chunks": String(row.chunks) } } : { status: 404, json: { ok: false } }; }
  if (rn[3] === "state" && method === "POST") { const version = Number(query.get("version")), n = Number(query.get("n")), of = Number(query.get("of")); if (!(version === row.version + 1) || !(n >= 0 && n < of && of <= AP_LIMITS.maxChunks) || raw.length > AP_LIMITS.chunkBytes) return { status: 400, json: { ok: false } }; await store.putChunk(key, version, n, seal(key0, raw)); if (n === of - 1) { Object.assign(row, { version, chunks: of, size: Number(query.get("size")) || 0 }); await store.put(row); await store.dropOld(key, version); } return { status: 200, json: { ok: true } }; }
  if (rn[3] === "done") { const b = json(); row.last = b.cycle ? { on: b.cycle.on, ok: b.cycle.ok, usd: b.cycle.usd, where: "server", steps: (b.cycle.steps ?? []).map((s) => ({ name: s.name, ok: s.ok, line: String(s.line ?? "").slice(0, 300) })) } : row.last; row.lease_until = null; row.lease_by = null;
    if (b.weekly?.text && b.weekly.on && row.weekly?.on !== b.weekly.on) { row.weekly = b.weekly; if (row.email && sendWeekly) { const sent = await sendWeekly({ to: row.email, text: b.weekly.text }).catch(() => null); if (sent?.ok) row.weekly_sent = new Date(now).toISOString().slice(0, 10); } }
    await store.put(row); return { status: 200, json: { ok: true } }; }
  return { status: 405, json: { ok: false } };
}
