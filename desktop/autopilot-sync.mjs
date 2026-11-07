/**
 * 🔴 RR-386 §2.4 · ONE PRODUCT, TWO PLACES: the client's app and our server's runner work on the same product's data. This packs it
 * (the product's folder + the app's money ledgers: ONE budget, ONE count), sends it in chunks (a Vercel request carries at most 4.5 MB),
 * takes it back, and joins the two sides when both changed since they last met:
 *   · a file changed on one side only → that side's file;
 *   · both changed, both JSON objects → joined key by key (a verdict, an answer, a check PAID FOR on either side is kept: paid work is
 *     never done twice); the app's own copy wins on the same key;
 *   · the money ledgers → added: base + (app − base) + (server − base), per day and route, so no spend is counted twice or lost;
 *   · anything else → the app's own copy.
 * Text files only (every file of a product is JSON or text). No key or token is ever in a bundle: keys live in the client's secure store,
 * or — for the runner — sealed on the server apart from the bundle.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";

export const APP_FILES = Object.freeze(["ai-usage.json", "dataforseo-ledger.json", "almiseo-saved.json", "licence.json", "company.json", "config.json"]);
const LEDGERS = new Set(["ai-usage.json"]), UNIONS = new Set(["dataforseo-ledger.json"]);
/* the app's settings that travel (the client's own choices); nothing else of config.json leaves the computer */
const CONFIG_KEYS = Object.freeze(["account", "owner", "aiMonthlyCapUSD", "dataForSeo", "googleCanSubmit"]);
export const CHUNK = 3_500_000;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

/** the product's folder and the app's files → { files: { path: text } } (paths with "/") */
export function packFiles(dataDir, id) {
  const files = {};
  for (const p of walk(join(dataDir, "products", id))) { if (!/\.(?:json|txt|md|csv|html)$/i.test(p)) continue; files[relative(dataDir, p).replace(/\\/g, "/")] = readFileSync(p, "utf8"); }
  for (const n of APP_FILES) { const p = join(dataDir, n); if (!existsSync(p)) continue; let t = readFileSync(p, "utf8"); if (n === "config.json") { try { const c = JSON.parse(t); t = JSON.stringify(Object.fromEntries(CONFIG_KEYS.filter((k) => k in c).map((k) => [k, c[k]]))); } catch { continue; } } files[n] = t; }
  return files;
}
export const hashesOf = (files) => Object.fromEntries(Object.entries(files).map(([k, v]) => [k, sha(v)]));
/** files → disk (only the paths a bundle may hold; the app's config is joined, never replaced) */
export function unpackFiles(dataDir, id, files) {
  const own = join(dataDir, "products", id);
  for (const [k, v] of Object.entries(files)) {
    const p = join(dataDir, k); if (!(p.startsWith(own) || APP_FILES.includes(k)) || k.includes("..")) continue;
    if (k === "config.json") { let c = {}; try { c = JSON.parse(readFileSync(p, "utf8")); } catch { c = {}; } let x = {}; try { x = JSON.parse(v); } catch { x = {}; } for (const key of CONFIG_KEYS) if (key in x) c[key] = x[key]; writeFileSync(p, JSON.stringify(c, null, 2)); continue; }
    mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, v);
  }
}
export const encode = (files, meta = {}) => gzipSync(Buffer.from(JSON.stringify({ v: 1, meta, files })), { level: 6 });
export const decode = (buf) => JSON.parse(gunzipSync(buf).toString("utf8"));
export const chunksOf = (buf) => { const out = []; for (let i = 0; i < buf.length; i += CHUNK) out.push(buf.subarray(i, i + CHUNK)); return out.length ? out : [Buffer.alloc(0)]; };

/** numbers added (a + b − base), objects key by key; the rest from b (the newer) */
export function addLedgers(base, a, b) {
  if (typeof a === "number" || typeof b === "number") return (Number(a) || 0) + (Number(b) || 0) - (Number(base) || 0);
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) { const out = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = k in a && k in b ? addLedgers(base?.[k], a[k], b[k]) : k in a ? a[k] : b[k]; return out; }
  return b ?? a;
}
const joinObjects = (app, server) => { if (Array.isArray(app) && Array.isArray(server)) { const seen = new Set(app.map((x) => JSON.stringify(x))); return [...app, ...server.filter((x) => !seen.has(JSON.stringify(x)))]; } if (app && server && typeof app === "object" && typeof server === "object") { const out = { ...server }; for (const [k, v] of Object.entries(app)) out[k] = k in server && v && typeof v === "object" && !Array.isArray(v) && server[k] && typeof server[k] === "object" ? { ...server[k], ...v } : Array.isArray(v) && Array.isArray(server[k]) ? joinObjects(v, server[k]) : v; return out; } return app; };
/**
 * the three-way join. base: { hashes, ledgers: { name: text } } from when the two last met; app, server: { path: text }
 * → { files, from: { app, server, joined } }
 */
export function joinBundles({ base, app, server }) {
  const out = {}, from = { app: 0, server: 0, joined: 0, same: 0 }, bh = base?.hashes ?? {};
  for (const k of new Set([...Object.keys(app), ...Object.keys(server)])) {
    const a = app[k], s = server[k], ha = a === undefined ? null : sha(a), hs = s === undefined ? null : sha(s), hb = bh[k] ?? null;
    if (ha === hs) { if (a !== undefined) out[k] = a; from.same++; continue; }
    if (hs === hb) { if (a !== undefined) out[k] = a; from.app++; continue; } /* only the app changed it */
    if (ha === hb) { if (s !== undefined) out[k] = s; from.server++; continue; } /* only the server changed it */
    if (a === undefined || s === undefined) { out[k] = a ?? s; from.joined++; continue; }
    let A, S; try { A = JSON.parse(a); S = JSON.parse(s); } catch { out[k] = a; from.app++; continue; }
    if (LEDGERS.has(k)) { let B = {}; try { B = JSON.parse(base?.ledgers?.[k] ?? "{}"); } catch { B = {}; } out[k] = JSON.stringify(addLedgers(B, A, S)); }
    else if (UNIONS.has(k)) out[k] = JSON.stringify({ ...S, ...A, spent: joinObjects(A.spent ?? [], S.spent ?? []), serpCache: { ...(S.serpCache ?? {}), ...(A.serpCache ?? {}) } });
    else out[k] = JSON.stringify(joinObjects(A, S));
    from.joined++;
  }
  return { files: out, from };
}
export const baseOf = (files) => ({ hashes: hashesOf(files), ledgers: Object.fromEntries([...LEDGERS].filter((n) => files[n] !== undefined).map((n) => [n, files[n]])) });

/** a client of the server's autopilot routes: base = the server address; auth = headers (the app's licence, or the runner's key) */
export function apClient({ base, headers, fetchImpl = fetch, prefix = "/v1/autopilot" }) {
  const url = (p) => new URL(p, base).href;
  const call = async (method, p, body = null, type = "application/json") => { const r = await fetchImpl(url(p), { method, headers: { ...headers, ...(body ? { "content-type": type } : {}) }, ...(body ? { body } : {}), signal: AbortSignal.timeout(120000) }); return r; };
  const jsonOf = async (r) => { const j = await r.json().catch(() => ({})); return { status: r.status, ...j }; };
  return {
    info: async (product) => jsonOf(await call("GET", `${prefix}/${product}`)),
    set: async (product, body) => jsonOf(await call("POST", `${prefix}/${product}`, JSON.stringify(body))),
    /** RR-387 B3: the one-time phone link (shown once in the app; also sent to the report e-mail) */
    phone: async (product) => jsonOf(await call("POST", `${prefix}/${product}/phone`, "{}")),
    /** the whole bundle → { version, files, meta } or null */
    async pull(product, { statePath = `${prefix}/${product}/state` } = {}) {
      const first = await call("GET", `${statePath}?n=0`); if (first.status === 404) return null; if (!first.ok) throw new Error(`the server answered ${first.status}`);
      const version = Number(first.headers.get("x-version")), of = Number(first.headers.get("x-chunks")), parts = [Buffer.from(await first.arrayBuffer())];
      for (let n = 1; n < of; n++) { const r = await call("GET", `${statePath}?n=${n}`); if (!r.ok) throw new Error(`chunk ${n}: the server answered ${r.status}`); parts.push(Buffer.from(await r.arrayBuffer())); }
      const d = decode(Buffer.concat(parts)); return { version, files: d.files, meta: d.meta ?? {} };
    },
    /** a new version (the server's version + 1), chunk by chunk */
    async push(product, version, files, meta = {}, { statePath = `${prefix}/${product}/state` } = {}) {
      const buf = encode(files, meta), parts = chunksOf(buf);
      for (let n = 0; n < parts.length; n++) { const r = await call("POST", `${statePath}?version=${version}&n=${n}&of=${parts.length}&size=${buf.length}`, parts[n], "application/octet-stream"); if (!r.ok) { const j = await jsonOf(r); throw Object.assign(new Error(j.why ?? `the server answered ${r.status}`), { status: r.status }); } }
      return { version, bytes: buf.length, chunks: parts.length };
    },
  };
}
export const SYNC_FILE = "autopilot-sync.json"; // per product: { version, base } — when the app and the server last met
export const resetDir = (d) => { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); };
