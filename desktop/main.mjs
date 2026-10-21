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
import { STEPS, checkStep, webAddress, stepsFor, CHOICES, HOWTO, recommended } from "./setup.mjs";
import { readSite, addressOpens } from "./site-read.mjs";
import { scoreCard, foundInfo, fixForMe } from "./product-check.mjs";
import { googleConnect, importExport } from "./google-connect.mjs";
import { seoPages, articleOfDay, socialFor, monthReport } from "./seo-pages.mjs";
import { menuFor, seoCheck, aeoCheck, geoCheck, linksCheck, languagesCheck } from "./features.mjs";
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

/* ── RR-307 · act at once: the check, the score card, what was found, the feature cards, Google, delete ── */
const GOOGLE = googleConnect({ keys: KEYS, config: CONFIG });
const allowLocal = CONFIG.testAllowLocalSites === true; // TESTS ONLY: a stand-in site on this computer
const pfile = (id, name) => join(store.dirOf(id), name);
const pread = (id, name, d = null) => { try { return JSON.parse(readFileSync(pfile(id, name), "utf8")); } catch { return d; } };
const pwrite = (id, name, obj) => { writeFileSync(`${pfile(id, name)}.tmp`, JSON.stringify(obj)); renameSync(`${pfile(id, name)}.tmp`, pfile(id, name)); };
const hasWebsite = (s) => Boolean(s.product?.site) && !/youtube\.com/i.test(s.product.site) && s.setup?.goal?.hasWebsite !== false;
const checking = new Map(); // product id → a running check (one at a time per product)
/** CHECK NOW: read the site (robots obeyed) and/or the confirmed YouTube channel; keep the facts (never the pages' HTML) and the score card */
async function checkProduct(id) {
  if (checking.has(id)) return checking.get(id);
  const run = (async () => {
    const s = store.read(id), on = new Date().toISOString();
    let site = null, youtube = null;
    if (hasWebsite(s)) { try { site = await readSite({ url: s.product.site, allowLocal, on }); } catch (e) { site = { ok: false, why: "the site could not be read now" }; } }
    if (s.setup?.youtube?.confirmed) { try { const r = await YT.read(id); youtube = { confirmed: true, videos: r.videos, check: (await import("../src/video/youtube.mjs")).channelCheck(r.videos, {}) }; } catch (e) { youtube = { why: `YouTube could not be read now (${safeWhy(e)})` }; } }
    else if (s.setup?.youtube?.handle) youtube = { why: "Not measured — confirm your YouTube channel first (YouTube settings)" };
    const card = scoreCard({ site, youtube, on });
    if (site?.ok) { const { pageReads, ...keep } = site; pwrite(id, "site-read.json", keep); }
    pwrite(id, "check.json", card);
    return card;
  })().finally(() => checking.delete(id));
  checking.set(id, run);
  return run;
}
const searchConsoleOf = (id) => pread(id, "search-console.json");
function contextOf(id) {
  const s = store.read(id), site = pread(id, "site-read.json"), sc = searchConsoleOf(id), files = (() => { try { return JSON.parse(readFileSync(pfile(id, "search-data-files.json"), "utf8")); } catch { return []; } })();
  return { s, site, sc, files, ctx: { hasSite: hasWebsite(s), siteRead: site, youtubeConfirmed: Boolean(s.setup?.youtube?.confirmed), youtubeKey: KEYS.status(KEY_NAMES.youtube).saved, searchConsole: Boolean(sc), files: files.length > 0, drafts: Boolean(pread(id, "pages.json")?.drafts?.length), check: pread(id, "check.json"), aiKey: AI_PROVIDERS.some((p) => KEYS.status(p.keyName).saved) } };
}
/** the product's to-do: steps skipped, sources missing */
function todoOf(id) {
  const { s, ctx } = contextOf(id);
  const steps = stepsFor(s.setup);
  /* a source already connected another way (Search Console data, a confirmed channel) is not a to-do */
  const done = { searchData: Boolean(searchConsoleOf(id)) || ctx.files, youtube: ctx.youtubeConfirmed, aiConnection: ctx.aiKey };
  const skipped = steps.filter((x) => x.optional && !done[x.id] && (s.setup[x.id]?.skipped || !s.setup[x.id])).map((x) => ({ what: x.title, action: x.id }));
  const yt = s.setup?.youtube?.handle && !ctx.youtubeConfirmed ? [{ what: "Confirm your YouTube channel", action: "youtube" }] : [];
  return [...skipped, ...yt];
}

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
        /* RR-307 E3: the address must really open (never a "www." added) — or the client says to save it anyway */
        if (c.saveAnyway !== true) { const o = await addressOpens(c.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
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
        /* RR-307 D1: the two plain questions come first — what to grow, and whether there is a website; the website is asked only then */
        const goal = p.goal ?? null;
        if (goal && checkStep("goal", goal)) return send(400, { refused: checkStep("goal", goal) });
        const needsSite = !goal || goal.hasWebsite === true;
        p.site = p.site ? webAddress(p.site) : null;
        if (!p.name?.trim() || (needsSite && !p.site)) return send(400, { refused: needsSite ? "Give the product's name and its website (for example shop.almiworld.com)." : "Give the product's name." });
        if (p.site && p.saveAnyway !== true && !/youtube\.com/i.test(p.site)) { const o = await addressOpens(p.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
        const made = store.create({ name: p.name.trim(), site: p.site ? p.site.trim() : null });
        if (goal) { const st2 = store.read(made.id); st2.setup.goal = { grow: goal.grow, hasWebsite: goal.hasWebsite }; store.write(made.id, st2); }
        /* RR-307 A1: the check starts the moment the product is added — the client carries on with setup meanwhile */
        if (p.site) checkProduct(made.id).catch(() => {});
        return send(200, { ok: true, product: productCard(store.read(made.id)), checking: Boolean(p.site) });
      }
      /* one product's own work: only through its own id, only in its own folder */
      const m = /^\/api\/products\/([^/]+)\/(state|setup|views)$/.exec(u.pathname);
      if (m) {
        const id = decodeURIComponent(m[1]);
        let s;
        try { s = store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
        if (req.method === "GET" && m[2] === "state") return send(200, { id, product: s.product, steps: stepsFor(s.setup), choices: CHOICES, howTo: HOWTO, recommended: Object.fromEntries(STEPS.map((x) => [x.id, recommended(x.id, s.setup)])), setup: s.setup, started: s.started, languages: LANGUAGES, articleSettings: settingsView(articleSettings({ articlesPerDay: s.setup.articlesPerDay?.perDay ?? 1, publishMode: s.setup.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES })) });
        if (req.method === "POST" && m[2] === "setup") {
          const st = await licenceNow();
          if (!st.mayStartNewWork) return send(403, { refused: st.line });
          let { id: step, value } = json();
          if (step === "product" && value && webAddress(value.site)) value.site = webAddress(value.site);
          if (step === "product" && value && !value.site) value.site = s.setup?.goal?.hasWebsite === false ? (s.product?.site && /youtube\.com/i.test(s.product.site) ? s.product.site : null) : value.site;
          /* RR-307 E3: a changed website must really open (or "save anyway") */
          if (step === "product" && value?.site && value.site !== s.product?.site && value.saveAnyway !== true && !/youtube\.com/i.test(value.site)) { const o = await addressOpens(value.site, { allowLocal }); if (!o.ok) return send(400, { refused: `${o.why}${o.suggestion ? ` Did you mean ${o.suggestion}?` : ""}`, suggestion: o.suggestion ?? null, canSaveAnyway: true }); }
          if (step === "product" && value) delete value.saveAnyway;
          /* RR-306 A2: an optional step skipped — "not now"; it can be changed later from the product's Settings */
          if (value?.skipped === true) { if (!STEPS.find((x) => x.id === step)?.optional) return send(400, { refused: "This step cannot be skipped." }); value = { skipped: true }; }
          const why = checkStep(step, value);
          if (why) return send(400, { refused: why });
          /* RR-306 A3: a pasted key goes to Windows' secure store; the product's setup keeps only which key it uses */
          const keep = (name, key) => { if (!String(key ?? "").trim()) return null; const r = KEYS.set(name, key); return r.ok ? null : r.why; };
          if (!value?.skipped && step === "aiConnection" && value.provider) { const p = AI_PROVIDERS.find((x) => x.id === value.provider); const bad = keep(p.keyName, value.key); if (bad) return send(400, { refused: bad }); value = { provider: p.id, keyName: p.keyName }; }
          if (!value?.skipped && step === "searchData") { if (Number(value.option) === 1) { const bad = keep(KEY_NAMES.search, value.key); if (bad) return send(400, { refused: bad }); } value = { option: Number(value.option) }; }
          if (step === "youtube" && !value?.skipped && value.handle) { const bad = keep(KEY_NAMES.youtube, value.key); if (bad) return send(400, { refused: bad }); const r = YT.saveSettings(id, { handle: value.handle }); if (!r.ok) return send(400, { refused: r.why }); s = store.read(id); }
          else if (step === "start") { const open = stepsFor(s.setup).filter((x) => x.id !== "start" && !s.setup[x.id]); if (open.length) return send(400, { refused: `Answer these first: ${open.map((x) => x.title).join(", ")}.` }); s.started = true; }
          else s.setup[step] = step === "youtube" ? { skipped: true } : value;
          const siteChanged = step === "product" && (value.site ?? null) !== (s.product?.site ?? null);
          if (step === "product") s.product = { name: value.name, site: value.site ?? null };
          store.write(id, s);
          /* RR-307 A1: a new or changed website is checked at once */
          if (siteChanged && value.site) checkProduct(id).catch(() => {});
          return send(200, { ok: true });
        }
        if (req.method === "GET" && m[2] === "views") return send(200, {
          /* RR-307 A1: no "first report after the first day" — the check is made at once, on the product's Overview */
          reports: pread(id, "check.json") ? [`Last check: ${String(pread(id, "check.json").on).slice(0, 10)} — ${pread(id, "check.json").gauge} (${pread(id, "check.json").word}). Open the Overview for the details.`] : ["No check yet — press \"Check my product now\" on the Overview."],
          preview: (pread(id, "pages.json")?.drafts ?? []).length ? pread(id, "pages.json").drafts.map((p) => `Draft: ${p.title} — ${p.url}`) : ["No page or article yet. They appear here as drafts when you press \"Create SEO pages\"."],
          approvals: (s.approvals ?? []).length ? s.approvals : [s.setup.publishMode?.mode === PUBLISH_MODE.REVIEW_FIRST ? "Nothing waits for your approval yet." : "Publishing is automatic after the gates — nothing waits for you."],
          monthly: ["The monthly report appears at the end of the first month: bad news first, then what was made and refreshed, the search data, and next month's topics."],
          youtube: await YT.lines(id),
        });
      }
      /* ── RR-307 · the product's Overview, Check now, Fix it for me, the feature cards, Google, delete ── */
      { const r = /^\/api\/products\/([^/]+)\/(overview|check|fix|feature\/[a-z-]+|google\/start|google\/site|google\/export|delete)$/.exec(u.pathname);
        if (r) {
          const id = decodeURIComponent(r[1]);
          try { store.read(id); } catch (e) { return send(e.code === "NOT_A_PRODUCT_ID" ? 400 : 404, { refused: e.message }); }
          const { s, site, sc, files, ctx } = contextOf(id);
          if (r[2] === "overview" && req.method === "GET") {
            const yt = ctx.youtubeConfirmed ? await YT.advice(id).catch(() => null) : null;
            return send(200, { checking: checking.has(id), card: ctx.check, found: foundInfo({ site, youtube: yt?.state === "READY" ? yt : null, files, searchConsole: sc, keys: { ai: ctx.aiKey }, on: new Date().toISOString() }), menu: menuFor(ctx), todo: todoOf(id), google: { ...GOOGLE.status(), site: sc?.site ?? null, kind: sc?.kind ?? null, window: sc?.window ?? null }, howTo: HOWTO });
          }
          if (r[2] === "check" && req.method === "POST") return send(200, { ok: true, card: await checkProduct(id) });
          if (r[2] === "fix" && req.method === "POST") { if (!site) return send(400, { refused: "Check your product first." }); return send(200, { items: fixForMe(json().id, site) }); }
          if (r[2] === "delete" && req.method === "POST") { if (json().confirm !== true) return send(400, { refused: "Say yes to delete." }); const where = store.remove(id); return send(200, { ok: true, line: `${s.product?.name} was deleted. Its data was moved to ${where} — it can be put back from there.` }); }
          if (r[2] === "google/start" && req.method === "POST") { const g = GOOGLE.start(`http://127.0.0.1:${server.address().port}/oauth/google`); if (g.ok) CONFIG.googlePendingProduct = id; return send(g.ok ? 200 : 400, g.ok ? g : { refused: g.why }); }
          if (r[2] === "google/site" && req.method === "POST") { const q = await GOOGLE.queries(json().site); if (!q) return send(400, { refused: "Google did not give the searches for that site — press Connect again." }); pwrite(id, "search-console.json", q); return send(200, { ok: true, line: `Connected ✓ — ${q.queries.length} searches read from Google Search Console (${q.window}).` }); }
          if (r[2] === "google/export" && req.method === "POST") { const x = importExport(json().files ?? [], { exportedOn: new Date().toISOString().slice(0, 10), source: `${s.product?.name} Search Console` }); if (!x.ok) return send(400, { refused: x.why }); pwrite(id, "search-console.json", x.data); return send(200, { ok: true, line: x.line }); }
          if (r[2].startsWith("feature/") && req.method === "POST") {
            const f = r[2].slice(8);
            const need = menuFor(ctx).cards.find((c) => c.id === f)?.needs ?? [{ what: "a feature this version has" }];
            if (need.length && f !== "keywords" && f !== "google") return send(200, { needs: need });
            const yt = ctx.youtubeConfirmed ? await YT.advice(id).catch(() => null) : null;
            const ytData = yt?.state === "READY" ? yt : null;
            if (f === "check") return send(200, { card: await checkProduct(id) });
            if (f === "seo-check") return send(200, { result: seoCheck(site, ctx.check) });
            if (f === "aeo") return send(200, { result: aeoCheck(site) });
            if (f === "geo") return send(200, { result: geoCheck(site) });
            if (f === "links") return send(200, { result: linksCheck(site) });
            if (f === "languages") return send(200, { result: languagesCheck(site, s.setup?.languages?.codes ?? []) });
            if (f === "keywords") return send(200, { found: foundInfo({ site, youtube: ytData, files, searchConsole: sc, keys: { ai: ctx.aiKey }, on: new Date().toISOString() }) });
            if (f === "youtube") return send(200, { open: "youtube" });
            if (f === "google") return send(200, { open: "google" });
            if (f === "seo-pages" || f === "articles") {
              const pages = seoPages({ site, searchConsole: sc, files, youtube: ytData, on: new Date().toISOString() });
              pwrite(id, "pages.json", pages);
              if (f === "seo-pages") return send(200, { pages: { ...pages, drafts: pages.drafts.map(({ html, ...d }) => d) } });
              const made = pread(id, "articles.json", []);
              const a = articleOfDay({ pages, earlier: made.map((x) => x.url), day: new Date().toISOString().slice(0, 10) });
              if (a.url) pwrite(id, "articles.json", [...made, { url: a.url, title: a.title, day: a.day }]);
              return send(200, { article: a.url ? { ...a, html: undefined, publishMode: s.setup?.publishMode?.mode ?? null } : a });
            }
            if (f === "social") { const p = pread(id, "pages.json"); const d = p?.drafts?.[0]; return send(200, { social: socialFor(d, p?.plan?.find((x) => x.kind === "NEW" && d?.title === x.question) ?? p?.plan?.find((x) => x.kind === "NEW")) }); }
            if (f === "monthly") { const rep = monthReport({ product: s.product?.name, month: new Date().toISOString().slice(0, 7), drafts: pread(id, "pages.json")?.drafts ?? [], searchRecord: sc?.record ?? null, youtube: ytData ? { connected: true, lines: ytData.report } : null }); return send(200, { report: { lines: rep.lines, attention: rep.attention } }); }
            return send(404, { refused: "not a feature of this version" });
          }
        } }
      /* a draft page, opened in the app to read (never published) */
      { const r = /^\/api\/products\/([^/]+)\/draft$/.exec(u.pathname);
        if (r && req.method === "GET") { const id = decodeURIComponent(r[1]); try { store.read(id); } catch (e) { return send(400, { refused: e.message }); } const d = (pread(id, "pages.json")?.drafts ?? []).find((x) => x.url === u.searchParams.get("url")); return d ? send(200, d.html, "text/html; charset=utf-8") : send(404, { refused: "no such draft" }); } }
      /* RR-307 E1: Google sends the browser back here after the client signed in — the access is kept, then the site is picked in the app */
      if (req.method === "GET" && u.pathname === "/oauth/google") {
        const r = await GOOGLE.finish({ code: u.searchParams.get("code"), state: u.searchParams.get("state"), error: u.searchParams.get("error") });
        const pid = CONFIG.googlePendingProduct ?? "";
        return send(200, `<!doctype html><meta charset="utf-8"><title>AlmiVisibility</title><body style="font:16px system-ui;padding:40px"><h2>${r.ok ? "Signed in to Google ✓" : "Not connected"}</h2><p>${r.ok ? "Go back to AlmiVisibility and pick your site." : String(r.why).replace(/</g, "&lt;")}</p><p><a href="/#google=${encodeURIComponent(pid)}">Back to AlmiVisibility</a></p></body>`, "text/html; charset=utf-8");
      }
      if (req.method === "GET" && u.pathname === "/api/google/sites") { const sites = await GOOGLE.sites(); return send(sites ? 200 : 400, sites ? { sites } : { refused: "Not signed in to Google — press Connect." }); }
      if (req.method === "POST" && u.pathname === "/api/google/client") { const v = json(); if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(String(v.clientId ?? "").trim())) return send(400, { refused: "That is not a Google sign-in client id (it ends with .apps.googleusercontent.com)." }); const k = KEYS.set("GOOGLE_CLIENT_SECRET", v.secret); if (!k.ok) return send(400, { refused: k.why }); CONFIG.googleClientId = String(v.clientId).trim(); saveConfig(); return send(200, { ok: true, status: GOOGLE.status() }); }
      if (req.method === "POST" && u.pathname === "/api/google/signout") { GOOGLE.signOut(); return send(200, { ok: true }); }
      if (req.method === "GET" && u.pathname === "/api/choices") return send(200, CHOICES);
      /* RR-307 G1: the home screen asks too — the cards in general (a product is picked first) */
      if (req.method === "GET" && u.pathname === "/api/menu") return send(200, menuFor({ hasSite: false, siteRead: null, youtubeConfirmed: false, youtubeKey: KEYS.status(KEY_NAMES.youtube).saved, searchConsole: false, files: false, drafts: false, check: null, aiKey: false }));
      /* RR-307 D6: the first-run tour, shown once until closed */
      if (req.method === "GET" && u.pathname === "/api/tour") return send(200, { show: CONFIG.tourSeen !== true });
      if (req.method === "POST" && u.pathname === "/api/tour") { CONFIG.tourSeen = true; saveConfig(); return send(200, { ok: true }); }
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
