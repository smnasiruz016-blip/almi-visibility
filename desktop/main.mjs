#!/usr/bin/env node
/**
 * 🔴 THE DOWNLOADABLE VISIBILITY — THE APP (RR-298 C). It runs on the client's OWN computer: a local server bound to 127.0.0.1 only, shown in
 * its own window by the launcher (never a hosted dashboard). Its data lives in the client's data folder (--data), apart from the program
 * folder, so an update or an uninstall never touches it unless the client chooses.
 *   FIRST RUN, one step at a time: 1 the product · 2 search data (the 3 options) · 3 languages · 4 articles per day · 5 publish mode ·
 *   6 the AI connection (the client's own key, by NAME only — a key value is refused) · 7 Start.
 *   THEN: reports, the pages and articles preview, approvals, the monthly report, the plan and licence, updates.
 * The plan is enforced (products per plan; NEW work paused when the licence says so — nothing is ever deleted).
 *   node desktop/main.mjs --data=<dir> [--install=<program dir>] [--port=0]
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { licenceState, mayAddProduct, plansView, PLANS } from "./licence.mjs";
import { checkForUpdate, downloadUpdate, installUpdate } from "./updater.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";
import { STEPS, checkStep } from "./setup.mjs";
import { articleSettings, settingsView, PUBLISH_MODE } from "../src/page/articles.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const DATA = arg("data");
if (!DATA) { console.error("usage: node desktop/main.mjs --data=<dir>"); process.exit(1); }
const INSTALL = arg("install", join(HERE, "..", ".."));
const VERSION = existsSync(join(HERE, "..", "version.txt")) ? readFileSync(join(HERE, "..", "version.txt"), "utf8").trim() : "0.0.0-dev";
mkdirSync(DATA, { recursive: true });
const STATE_FILE = join(DATA, "state.json");
const load = () => (existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : { setup: {}, products: [], licence: { last: null }, started: false });
const save = (s) => { writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify(s, null, 1)); renameSync(`${STATE_FILE}.tmp`, STATE_FILE); };
const keyPem = (name) => { const f = join(HERE, "keys", name); return existsSync(f) ? readFileSync(f, "utf8") : null; };
const CONFIG = existsSync(join(DATA, "config.json")) ? JSON.parse(readFileSync(join(DATA, "config.json"), "utf8")) : {};
const LICENCE_URL = CONFIG.licenceUrl ?? "https://licence.almiworld.com/";   // DEFERRED: not deployed until the owner's GREEN
const UPDATE_URL = CONFIG.updateChannelUrl ?? "https://updates.almiworld.com/"; // DEFERRED: not deployed until the owner's GREEN

async function licenceNow(s) {
  let check = { reached: false };
  try { const r = await fetch(new URL(`v1/licence?account=${encodeURIComponent(CONFIG.account ?? s.setup.account ?? "unset")}`, LICENCE_URL), { signal: AbortSignal.timeout(4000) }); if (r.ok) check = { reached: true, signed: await r.json() }; } catch {}
  const st = licenceState({ now: Date.now(), check, last: s.licence.last, publicKeyPem: keyPem("licence-public.pem") });
  if (st.last) s.licence.last = st.last;
  return st;
}

const page = () => readFileSync(join(HERE, "ui.html"), "utf8");
let updateFound = null;
const server = createServer((req, res) => {
  const send = (code, obj, type = "application/json") => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(type === "application/json" ? JSON.stringify(obj) : obj); };
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    try {
      const u = new URL(req.url, "http://127.0.0.1");
      const s = load();
      const json = () => (body ? JSON.parse(body) : {});
      if (req.method === "GET" && u.pathname === "/") return send(200, page(), "text/html; charset=utf-8");
      if (req.method === "GET" && u.pathname === "/api/state") return send(200, { version: VERSION, steps: STEPS, setup: s.setup, started: s.started, products: s.products, plans: plansView(), languages: LANGUAGES, articleSettings: settingsView(articleSettings({ articlesPerDay: s.setup.articlesPerDay?.perDay ?? 1, publishMode: s.setup.publishMode?.mode ?? PUBLISH_MODE.AUTO_AFTER_GATES })) });
      if (req.method === "POST" && u.pathname === "/api/setup") {
        const { id, value } = json();
        const why = checkStep(id, value);
        if (why) return send(400, { refused: why });
        if (id === "start") { if (STEPS.slice(0, 6).some((x) => !s.setup[x.id])) return send(400, { refused: "Answer every step first." }); s.started = true; }
        else s.setup[id] = value;
        save(s);
        return send(200, { ok: true });
      }
      if (req.method === "POST" && u.pathname === "/api/products") {
        const st = await licenceNow(s); save(s);
        const may = mayAddProduct(st, s.products.length);
        if (!may.ok) return send(403, { refused: may.line, licence: st.line });
        const p = json(); s.products.push({ name: p.name, site: p.site, added: new Date().toISOString() }); save(s);
        return send(200, { ok: true, line: may.line });
      }
      if (req.method === "GET" && u.pathname === "/api/licence") { const st = await licenceNow(s); save(s); return send(200, { state: st.state, line: st.line, mayStartNewWork: st.mayStartNewWork, plan: st.plan?.words ?? null, plans: PLANS.map((p) => p.words) }); }
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
      if (req.method === "GET" && u.pathname === "/api/views") return send(200, {
        reports: s.started ? ["Your first report appears after the first day's work."] : ["Finish the setup to start."],
        preview: (s.preview ?? []).length ? s.preview : ["No page or article yet — they appear here before they go live."],
        approvals: (s.approvals ?? []).length ? s.approvals : [s.setup.publishMode?.mode === PUBLISH_MODE.REVIEW_FIRST ? "Nothing waits for your approval yet." : "Publishing is automatic after the gates — nothing waits for you."],
        monthly: ["The monthly report appears at the end of your first month: bad news first, then what was made and refreshed, your search data, and next month's topics."],
      });
      if (req.method === "POST" && u.pathname === "/api/quit") { send(200, { ok: true }); return setTimeout(() => process.exit(0), 200); }
      send(404, { refused: "not found" });
    } catch (e) { send(500, { refused: e.message }); }
  });
});
server.listen(Number(arg("port", "0")), "127.0.0.1", () => {
  writeFileSync(join(DATA, "run.json"), JSON.stringify({ port: server.address().port, pid: process.pid, version: VERSION }));
});
