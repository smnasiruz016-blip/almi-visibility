#!/usr/bin/env node
/**
 * 🔴 THE DOWNLOADABLE VISIBILITY — THE APP (RR-298 C; RR-299 C: the products home screen). It runs on the client's OWN computer: a local
 * server bound to 127.0.0.1 only, shown in its own window by the launcher (never a hosted dashboard). Its data lives in the client's data
 * folder (--data), apart from the program folder, so an update or an uninstall never touches it unless the client chooses.
 *   FIRST SCREEN (RR-299): the client's company — its name, its main website, its own logo if they add one — and below it its products,
 *   each with its own name and address and its state. "+ Add a product" opens that product's setup (the seven steps); picking a product
 *   opens its own work. The plan limit is said here in plain words. Each product's data stays in its own folder (desktop/products.mjs).
 *   EVERY SCREEN carries the maker's logo (AlmiWorld, "live beautifully") in its header; the client's logo never replaces it.
 *   node desktop/main.mjs --data=<dir> [--install=<program dir>] [--port=0]
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { PILOT_CHANNELS } from "../config/youtube/pilot-channels.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { licenceState, mayAddProduct, plansView, PLANS, planLimitLine, readOwnerLicenceText, isOwnerLicence, verifyLicence } from "./licence.mjs";
import { checkForUpdate, downloadUpdate, installUpdate } from "./updater.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";
import { STEPS, checkStep, webAddress } from "./setup.mjs";
import { productStore, productCard } from "./products.mjs";
import { cssVariables } from "./theme.mjs";
import { articleSettings, settingsView, PUBLISH_MODE } from "../src/page/articles.mjs";
import { keyStore, windowsBackend, memoryBackend, KEY_NAMES, AI_PROVIDERS } from "./secrets.mjs";
import { youtubeApp } from "./youtube-app.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data");
if (!DATA) { console.error("usage: node desktop/main.mjs --data=<dir>"); process.exit(1); }
const INSTALL = arg("install", join(HERE, "..", ".."));
const VERSION = existsSync(join(HERE, "..", "version.txt")) ? readFileSync(join(HERE, "..", "version.txt"), "utf8").trim() : "0.0.0-dev";
mkdirSync(DATA, { recursive: true });
const store = productStore(DATA);
const LICENCE_FILE = join(DATA, "licence.json");
const licenceLast = () => (existsSync(LICENCE_FILE) ? JSON.parse(readFileSync(LICENCE_FILE, "utf8")).last : null);
const saveLicence = (last) => { writeFileSync(`${LICENCE_FILE}.tmp`, JSON.stringify({ last })); renameSync(`${LICENCE_FILE}.tmp`, LICENCE_FILE); };
const CONFIG = existsSync(join(DATA, "config.json")) ? JSON.parse(readFileSync(join(DATA, "config.json"), "utf8")) : {};
/* the public keys the app trusts: shipped with it (desktop/keys), or a test folder named in the data folder's config (tests only) */
const keyPem = (name) => { const f = join(CONFIG.keysDir ?? join(HERE, "keys"), name); return existsSync(f) ? readFileSync(f, "utf8") : null; };
/* RR-303 F: the licence check and the update channel are the site's own (almivisibility.almiworld.com, not live until the owner's GREEN) */
const LICENCE_URL = CONFIG.licenceUrl ?? "https://almivisibility.almiworld.com/";
const UPDATE_URL = CONFIG.updateChannelUrl ?? "https://almivisibility.almiworld.com/updates/";
const saveConfig = () => { writeFileSync(join(DATA, "config.json.tmp"), JSON.stringify(CONFIG, null, 1)); renameSync(join(DATA, "config.json.tmp"), join(DATA, "config.json")); };
/* RR-303 A: the licence key a purchase shows (av_…); kept in the app's own config, never shown back or logged */
export const LICENCE_KEY = /^av_[A-Za-z0-9_-]{20,64}$/;

async function licenceNow() {
  let check = { reached: false };
  try { const r = await fetch(new URL(`v1/licence?account=${encodeURIComponent(CONFIG.account ?? "unset")}`, LICENCE_URL), { signal: AbortSignal.timeout(4000) }); if (r.ok) check = { reached: true, signed: await r.json() }; } catch {}
  const st = licenceState({ now: Date.now(), check, last: licenceLast(), publicKeyPem: keyPem("licence-public.pem"), owner: CONFIG.owner ?? null });
  if (st.last) saveLicence(st.last);
  return st;
}
const limitLine = planLimitLine;

const page = () => readFileSync(join(HERE, "ui.html"), "utf8").replace("/*SUNRISE*/", cssVariables());
let updateFound = null;
/* RR-306 A3: the client's own keys — pasted in the app, kept in Windows' secure store (Credential Manager); this computer's settings by NAME
 * as a fallback. A memory store only for tests (config testSecretsInMemory) — nothing persists there. */
const KEYS = keyStore({ backend: CONFIG.testSecretsInMemory === true ? memoryBackend() : process.platform === "win32" ? windowsBackend() : null, env: process.env });
const KEY_ALLOWED = new Set([KEY_NAMES.youtube, KEY_NAMES.search, ...AI_PROVIDERS.map((p) => p.keyName)]);
/* RR-306 B + C: the product's YouTube — the right channel, always, and advice (desktop/youtube-app.mjs) */
const YT = youtubeApp({ store, dataDir: DATA, keys: KEYS, config: CONFIG });
/* a YouTube or key error says what happened in plain words — never a URL (the key travels in one) */
const safeWhy = (e) => (/answered HTTP \d+/.exec(String(e?.message))?.[0] ? `YouTube ${/answered HTTP \d+/.exec(String(e.message))[0]}` : "no answer from YouTube");

const server = createServer((req, res) => {
  const send = (code, obj, type = "application/json") => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(type === "application/json" ? JSON.stringify(obj) : obj); };
  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 6_000_000) req.destroy(); });
  req.on("end", async () => {
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      const json = () => (body ? JSON.parse(body) : {});
      /* RR-306: the app answers its own window only — a POST sent by another website (its Origin header) is refused (keys are saved here) */
      if (req.method === "POST" && req.headers.origin && req.headers.origin !== `http://127.0.0.1:${server.address().port}`) return send(403, { refused: "not from this app" });
      if (req.method === "GET" && u.pathname === "/") return send(200, page(), "text/html; charset=utf-8");
      if (req.method === "GET" && u.pathname === "/brand/almiworld-logo.png") return send(200, readFileSync(join(HERE, "brand", "almiworld-logo.png")), "image/png");
      if (req.method === "GET" && u.pathname === "/company-logo") { const c = store.company(); const f = c?.logoFile ? join(DATA, c.logoFile) : null; return f && existsSync(f) ? send(200, readFileSync(f), "image/png") : send(404, { refused: "no company logo" }); }
      /* the home screen: the company, its products, the plan limit */
      if (req.method === "GET" && u.pathname === "/api/home") {
        const st = await licenceNow();
        const products = store.list();
        return send(200, { version: VERSION, company: store.company(), products: products.map(productCard), licence: st.line, limit: limitLine(st, products.length), plans: plansView(), mayAdd: mayAddProduct(st, products.length).ok, accountSet: Boolean(CONFIG.account) });
      }
      if (req.method === "POST" && u.pathname === "/api/company") {
        const c = json();
        /* RR-305 B1: "www.almiworld.com" and "almiworld.com" are accepted; https:// is added */
        c.site = webAddress(c.site);
        if (!c.name?.trim() || !c.site) return send(400, { refused: "Give your company's name and its main website (for example almiworld.com)." });
        let logoFile = store.company()?.logoFile ?? null;
        if (typeof c.logoPng === "string" && c.logoPng.startsWith("data:image/png;base64,")) { logoFile = "company-logo.png"; writeFileSync(join(DATA, logoFile), Buffer.from(c.logoPng.slice(22), "base64")); }
        store.setCompany({ name: c.name.trim(), site: c.site.trim(), logoFile });
        return send(200, { ok: true });
      }
      if (req.method === "POST" && u.pathname === "/api/products") {
        const st = await licenceNow();
        const count = store.list().length;
        const may = mayAddProduct(st, count);
        if (!may.ok) return send(403, { refused: limitLine(st, count), licence: st.line });
        const p = json();
        p.site = webAddress(p.site);
        if (!p.name?.trim() || !p.site) return send(400, { refused: "Give the product's name and its own address (for example shop.almiworld.com)." });
        return send(200, { ok: true, product: productCard(store.create({ name: p.name.trim(), site: p.site.trim() })) });
      }
      /* one product's own work: only through its own id, only in its own folder */
      const m = /^\/api\/products\/([^/]+)\/(state|setup|views)$/.exec(u.pathname);
      if (m) {
        const id = decodeURIComponent(m[1]);
        let s;
        try { s = store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
        if (req.method === "GET" && m[2] === "state") return send(200, { id, product: s.product, steps: STEPS, setup: s.setup, started: s.started, languages: LANGUAGES, articleSettings: settingsView(articleSettings({ articlesPerDay: s.setup.articlesPerDay?.perDay ?? 1, publishMode: s.setup.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES })) });
        if (req.method === "POST" && m[2] === "setup") {
          const st = await licenceNow();
          if (!st.mayStartNewWork) return send(403, { refused: st.line });
          let { id: step, value } = json();
          if (step === "product" && value && webAddress(value.site)) value.site = webAddress(value.site);
          /* RR-306 A2: an optional step skipped — "not now"; it can be changed later from the product's Settings */
          if (value?.skipped === true) { if (!STEPS.find((x) => x.id === step)?.optional) return send(400, { refused: "This step cannot be skipped." }); value = { skipped: true }; }
          const why = checkStep(step, value);
          if (why) return send(400, { refused: why });
          /* RR-306 A3: a pasted key goes to Windows' secure store; the product's setup keeps only which key it uses */
          const keep = (name, key) => { if (!String(key ?? "").trim()) return null; const r = KEYS.set(name, key); return r.ok ? null : r.why; };
          if (!value?.skipped && step === "aiConnection" && value.provider) { const p = AI_PROVIDERS.find((x) => x.id === value.provider); const bad = keep(p.keyName, value.key); if (bad) return send(400, { refused: bad }); value = { provider: p.id, keyName: p.keyName }; }
          if (!value?.skipped && step === "searchData") { if (Number(value.option) === 1) { const bad = keep(KEY_NAMES.search, value.key); if (bad) return send(400, { refused: bad }); } value = { option: Number(value.option) }; }
          if (step === "youtube" && !value?.skipped && value.handle) { const bad = keep(KEY_NAMES.youtube, value.key); if (bad) return send(400, { refused: bad }); const r = YT.saveSettings(id, { handle: value.handle }); if (!r.ok) return send(400, { refused: r.why }); s = store.read(id); }
          else if (step === "start") { if (STEPS.filter((x) => x.id !== "start").some((x) => !s.setup[x.id])) return send(400, { refused: "Answer every step first." }); s.started = true; }
          else s.setup[step] = step === "youtube" ? { skipped: true } : value;
          if (step === "product") s.product = { name: value.name, site: value.site };
          store.write(id, s);
          return send(200, { ok: true });
        }
        if (req.method === "GET" && m[2] === "views") return send(200, {
          reports: s.started ? ["Your first report appears after the first day's work."] : ["Finish the setup to start."],
          preview: (s.preview ?? []).length ? s.preview.map((p) => `${p.title} — ${p.url}`) : ["No page or article yet — they appear here before they go live."],
          approvals: (s.approvals ?? []).length ? s.approvals : [s.setup.publishMode?.mode === PUBLISH_MODE.REVIEW_FIRST ? "Nothing waits for your approval yet." : "Publishing is automatic after the gates — nothing waits for you."],
          monthly: ["The monthly report appears at the end of the first month: bad news first, then what was made and refreshed, the search data, and next month's topics."],
          youtube: await YT.lines(id),
        });
      }
      /* RR-303 A: the licence key from a purchase — saved, never echoed */
      if (req.method === "POST" && u.pathname === "/api/account") {
        const { licenceKey } = json();
        /* RR-304: the owner licence (avo_…) — kept only when THIS copy's public key verifies it */
        if (String(licenceKey ?? "").trim().startsWith("avo_")) {
          const signed = readOwnerLicenceText(licenceKey);
          if (!signed || !isOwnerLicence(signed.licence) || !verifyLicence(signed, keyPem("licence-public.pem"))) return send(400, { refused: "This owner licence could not be verified by this copy of Visibility — it was made with a different signing key, or the text is incomplete." });
          CONFIG.owner = signed; CONFIG.account = signed.licence.account; saveConfig();
          const st = await licenceNow();
          return send(200, { ok: true, line: st.line });
        }
        if (!LICENCE_KEY.test(String(licenceKey ?? "").trim())) return send(400, { refused: "That is not a licence key. It starts with av_ — copy it from the page shown after you bought your plan." });
        CONFIG.account = String(licenceKey).trim(); saveConfig();
        const st = await licenceNow();
        return send(200, { ok: true, line: st.line });
      }
      /* RR-306 A3: the client's keys — status only (never the key), save (pasted), remove */
      if (req.method === "GET" && u.pathname === "/api/keys") return send(200, { where: KEYS.where, available: KEYS.available, keys: Object.fromEntries([...KEY_ALLOWED].map((n) => [n, KEYS.status(n)])), aiProviders: AI_PROVIDERS });
      { const k = /^\/api\/keys\/([A-Z][A-Z0-9_]{2,63})(\/remove)?$/.exec(u.pathname);
        if (k && req.method === "POST") {
          if (!KEY_ALLOWED.has(k[1])) return send(400, { refused: "not a key this app uses" });
          if (k[2]) { KEYS.remove(k[1]); return send(200, { ok: true, status: KEYS.status(k[1]) }); }
          const r = KEYS.set(k[1], json().key);
          return r.ok ? send(200, { ok: true, status: KEYS.status(k[1]) }) : send(400, { refused: r.why });
        } }
      /* RR-303 D + RR-306 B/C: YouTube settings, the channel lookup and confirmation, the research, the advice, search-data files */
      { const y = /^\/api\/products\/([^/]+)\/youtube(?:\/(lookup|confirm|research|advice|file))?$/.exec(u.pathname);
        if (y) {
          const yid = decodeURIComponent(y[1]);
          try { store.read(yid); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          try {
            if (!y[2] && req.method === "GET") return send(200, { ...YT.settings(yid), pilots: PILOT_CHANNELS });
            if (!y[2] && req.method === "POST") { const r = YT.saveSettings(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "lookup" && req.method === "POST") return send(200, await YT.lookup(yid, json().handle));
            if (y[2] === "confirm" && req.method === "POST") { const r = await YT.confirm(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "research" && req.method === "POST") { const r = await YT.research(yid); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
            if (y[2] === "advice" && req.method === "GET") return send(200, await YT.advice(yid));
            if (y[2] === "file" && req.method === "POST") { const r = YT.addFile(yid, json()); return send(r.ok ? 200 : 400, r.ok ? r : { refused: r.why }); }
          } catch (e) { return send(502, { refused: `YouTube could not be reached now (${safeWhy(e)}). Nothing was changed.` }); }
        } }
      if (req.method === "GET" && u.pathname === "/api/licence") { const st = await licenceNow(); return send(200, { state: st.state, line: st.line, mayStartNewWork: st.mayStartNewWork, plan: st.plan?.words ?? null, plans: PLANS.map((p) => p.words) }); }
      if (req.method === "GET" && u.pathname === "/api/update") { const r = await checkForUpdate({ channelUrl: UPDATE_URL, current: VERSION, publicKeyPem: keyPem("update-public.pem") }); updateFound = r.manifest ?? null; return send(200, { state: r.state, line: r.line }); }
      if (req.method === "POST" && u.pathname === "/api/update/install") {
        const { agree } = json();
        if (!updateFound) return send(400, { refused: "check for an update first" });
        const d = await downloadUpdate({ channelUrl: UPDATE_URL, manifest: updateFound, dataDir: DATA, publicKeyPem: keyPem("update-public.pem") });
        if (!d.ok) return send(400, { refused: d.why });
        const r = installUpdate({ agreed: agree === true, verified: true, file: d.file, launcher: join(INSTALL, "AlmiVisibility.exe"), quiet: CONFIG.quietUpdate === true });
        if (!r.ok) return send(400, { refused: r.why });
        send(200, { ok: true, line: `Installing ${d.version} — Visibility restarts by itself; your data is kept.` });
        return setTimeout(() => process.exit(0), 300);
      }
      if (req.method === "POST" && u.pathname === "/api/quit") { send(200, { ok: true }); return setTimeout(() => process.exit(0), 200); }
      send(404, { refused: "not found" });
    } catch (e) { send(500, { refused: e.message }); }
  });
});
server.listen(Number(arg("port", "0")), "127.0.0.1", () => {
  writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid, version: VERSION }));
});
