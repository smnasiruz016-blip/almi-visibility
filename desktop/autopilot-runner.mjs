#!/usr/bin/env node
/**
 * 🔴 RR-386 §2.4 · THE RUNNER: the autopilot cycle while the client's computer is OFF. Run on a schedule (.github/workflows/autopilot.yml,
 * once a day) — or by hand. For every product our server says is due (site/autopilot-server.mjs, which leases it for 6 hours):
 *   1. takes the product's data and the keys the client typed for it (sealed on the server; held in this process's memory only);
 *   2. starts the app itself, headless, on a fresh folder (desktop/main.mjs --data=<tmp> --port=0): the SAME code and the SAME cycle as
 *      the client's own app, with the same caps and the same Monthly AI limit (the ledgers travel with the data: one budget, one count);
 *   3. runs one cycle (POST …/autopilot/run, wait) and stops the app by its PID;
 *   4. sends the data back as the next version and the cycle's report (the server e-mails the weekly report).
 * It prints nothing about a product but a short code (the logs of a public repository's job are public): no name, no page, no key.
 *   AUTOPILOT_SERVER=https://… AUTOPILOT_RUNNER_KEY=… node desktop/autopilot-runner.mjs [--max-hours=5]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { apClient, unpackFiles, packFiles } from "./autopilot-sync.mjs";
import { TARGETS } from "./publish.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const code = (key) => String(key).slice(0, 6);
export const keyEnvFor = (product, keys, conn) => {
  const ID = String(product).toUpperCase().replace(/[^A-Z0-9]/g, "_"), env = {};
  if (keys.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = keys.ANTHROPIC_API_KEY;
  if (keys.DATAFORSEO_LOGIN && keys.DATAFORSEO_PASSWORD) { env.DATAFORSEO_LOGIN = keys.DATAFORSEO_LOGIN; env.DATAFORSEO_PASSWORD = keys.DATAFORSEO_PASSWORD; }
  if (keys.PAGESPEED_API_KEY) env.PAGESPEED_API_KEY = keys.PAGESPEED_API_KEY;
  if (keys.VERCEL_BYPASS) env[`VERCEL_BYPASS_${ID}`.slice(0, 64)] = keys.VERCEL_BYPASS;
  const k = TARGETS.find((t) => t.id === conn?.kind)?.keyName; if (k && keys.GITHUB_TOKEN) env[`${k}_${ID}`.slice(0, 64)] = keys.GITHUB_TOKEN;
  return env;
};
/** one product's cycle, the app started headless on its own folder → { ok, cycle, weekly, files }
 * 🔴 RR-387 B4: whatever happens (the app does not start, the cycle runs out of time, an error), the folder is packed AFTER the app is stopped
 * and handed back — its money ledger holds every AI call made so far, so the client's one budget never loses a spend */
export async function runOne({ item, keys, files, node = process.execPath, main = join(HERE, "main.mjs"), maxMs = 5 * 3600e3, pollMs = 10000, extraConfig = {}, baseEnv = process.env }) {
  const dir = mkdtempSync(join(tmpdir(), "av-runner-")), product = item.product;
  let child = null, result = { ok: false, why: "the run did not start" };
  const stop = async () => { if (child && child.exitCode === null) { child.kill(); await new Promise((res) => { const t = setTimeout(res, 15000); child.once("exit", () => { clearTimeout(t); res(); }); }); } };
  try {
    unpackFiles(dir, product, files);
    const cfgFile = join(dir, "config.json"); let cfg = {}; try { cfg = JSON.parse(readFileSync(cfgFile, "utf8")); } catch { cfg = {}; }
    /* the runner's app: its own timers off (it does ONE cycle when asked), no browser, nothing opened */
    writeFileSync(cfgFile, JSON.stringify({ ...cfg, weeklyFirstMs: 2147483647, autopilotFirstMs: 2147483647, almiSeoFirstMs: 2147483647, collectWaiting: false, autopilotLocal: true, secretsFromEnvOnly: true, ...extraConfig }, null, 2));
    let conn = null; try { conn = JSON.parse(readFileSync(join(dir, "products", product, "publish.json"), "utf8")); } catch { conn = null; }
    const env = Object.fromEntries(Object.entries(baseEnv).filter(([k]) => !/^(AUTOPILOT_RUNNER_KEY|AUTOPILOT_SERVER)$/.test(k) && !/_API_KEY$|_TOKEN$|PASSWORD|_LOGIN$|_BYPASS/.test(k)));
    child = spawn(node, [main, `--data=${dir}`, "--port=0"], { stdio: "ignore", env: { ...env, ...keyEnvFor(product, keys, conn) } });
    for (let i = 0; i < 300 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    if (!existsSync(join(dir, "run.json"))) { result = { ok: false, why: "the app did not start" }; return result; }
    const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    /* started, then watched: one request may not wait a whole cycle (an HTTP client gives up on headers after 300 s — the first real proof) */
    const base = `${url}/api/products/${encodeURIComponent(product)}/autopilot`, t0 = Date.now();
    const s = await fetch(`${base}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ where: "runner" }), signal: AbortSignal.timeout(60000) }).then((x) => x.json()).catch((e) => ({ ok: false, line: String(e?.message ?? e) }));
    if (!s.started) { result = { ok: false, why: s.line ?? s.refused ?? "the cycle did not start" }; return result; }
    let cycle = null;
    while (Date.now() - t0 < maxMs) { await new Promise((r) => setTimeout(r, pollMs)); const a = await fetch(base, { signal: AbortSignal.timeout(60000) }).then((x) => x.json()).catch(() => null); if (a && !a.busy) { const c = a.cycle; if (c?.done && Date.parse(c.on) >= t0 - 5000) { cycle = c; break; } } }
    if (!cycle) cycle = { on: new Date(t0).toISOString(), ok: false, usd: 0, stopped: true, steps: [{ name: "Time", ok: false, line: `The cycle did not finish in ${Math.round((maxMs / 3600e3) * 10) / 10} hours: it was stopped; what it spent is kept, and it goes on at the next run.` }] };
    let weekly = null; try { weekly = JSON.parse(readFileSync(join(dir, "products", product, "autopilot-weekly.json"), "utf8")); } catch { weekly = null; }
    result = { ok: Boolean(cycle.done), cycle, weekly }; return result;
  } catch (e) { result = { ok: false, why: String(e?.message ?? e).slice(0, 120) }; return result; }
  finally {
    await stop(); /* the app first, so its ledger is on disk as it stopped */
    try { result.files = packFiles(dir, product); } catch { /* nothing to hand back */ }
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

/** every due product, one after the other */
export async function runDue({ server, runnerKey, log = console.log, ...o }) {
  const headers = { "x-autopilot-runner": runnerKey }, base = server, c = apClient({ base, headers, prefix: "/runner/autopilot" });
  /* 🔴 RR-387 B5: a refused key is said, never hidden as "nothing is due" */
  const res = await fetch(new URL("/runner/autopilot/due", base), { headers, signal: AbortSignal.timeout(60000) }).catch((e) => ({ status: 0, why: String(e?.message ?? e) }));
  if (res.status === 401) { log("The server REFUSED the runner's key (401): AUTOPILOT_RUNNER_KEY in GitHub is not the value in Vercel."); return [{ ok: false, refused: true }]; }
  if (res.status !== 200) { log(`The server did not answer the runner (${res.status || res.why}).`); return [{ ok: false }]; }
  const due = await res.json().catch(() => ({ due: [] }));
  const out = [];
  for (const item of due.due ?? []) {
    const statePath = `/runner/autopilot/${item.key}/state`;
    try {
      const keys = (await fetch(new URL(`/runner/autopilot/${item.key}/secrets`, base), { headers, signal: AbortSignal.timeout(60000) }).then((r) => r.json())).keys ?? {};
      const got = await c.pull(item.key, { statePath }); if (!got) { log(`${code(item.key)}: nothing kept`); continue; }
      const r = await runOne({ item, keys, files: got.files, ...o });
      if (r.files) await c.push(item.key, got.version + 1, r.files, { from: "runner", on: new Date().toISOString(), stopped: !r.ok }, { statePath }); /* B4: a run that stopped too: its spend is in the ledger it hands back */
      await fetch(new URL(`/runner/autopilot/${item.key}/done`, base), { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ cycle: r.cycle ?? { on: new Date().toISOString(), ok: false, usd: 0, steps: [{ name: "Start", ok: false, line: r.why ?? "the cycle did not run" }] }, weekly: r.weekly }), signal: AbortSignal.timeout(60000) });
      const steps = r.cycle?.steps ?? []; log(`${code(item.key)}: cycle ${r.ok ? "ran" : "did not run"}; ${steps.filter((s) => s.ok).length} of ${steps.length} steps ok`);
      out.push({ key: item.key, ok: r.ok, steps: steps.length });
    } catch (e) {
      const why = String(e?.message ?? e).replace(/https?:\/\/\S+/g, "<address>").slice(0, 80); log(`${code(item.key)}: stopped (${why})`); out.push({ key: item.key, ok: false });
      /* the lease is given back, said: the app and the next run are never locked out for 6 hours by a run that stopped */
      await fetch(new URL(`/runner/autopilot/${item.key}/done`, base), { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ cycle: { on: new Date().toISOString(), ok: false, usd: 0, steps: [{ name: "Runner", ok: false, line: `The run stopped: ${why}. It goes on at the next run.` }] } }), signal: AbortSignal.timeout(60000) }).catch(() => null);
    }
  }
  if (!out.length) log("No product is due.");
  return out;
}

/** 🔴 RR-387 B5 · does the server accept this runner's key? Without printing it, and with NO cycle: the side-effect-free ping (an older server
 * without it: the due list's answer only — nothing is run, and nothing is due while no product has autopilot on) */
export async function checkKey({ server, runnerKey, log = console.log, fetchImpl = fetch }) {
  const headers = { "x-autopilot-runner": runnerKey };
  let r = await fetchImpl(new URL("/runner/autopilot/ping", server), { headers, signal: AbortSignal.timeout(60000) }).catch(() => null);
  let how = "ping";
  if (r?.status === 404) { r = await fetchImpl(new URL("/runner/autopilot/due", server), { headers, signal: AbortSignal.timeout(60000) }).catch(() => null); how = "due list (older server; nothing is run)"; }
  const ok = r?.status === 200, line = ok ? `The server ACCEPTS the runner's key (${how}): GitHub and Vercel hold the same value.` : r?.status === 401 ? `The server REFUSES the runner's key (${how}): GitHub and Vercel hold DIFFERENT values.` : `The server did not answer (${r?.status ?? "no answer"}).`;
  log(line); return { ok, status: r?.status ?? 0, how };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = process.env.AUTOPILOT_SERVER, runnerKey = process.env.AUTOPILOT_RUNNER_KEY, hours = Number((process.argv.find((a) => a.startsWith("--max-hours=")) ?? "").split("=")[1]) || 5;
  if (!server || !runnerKey) { console.log("Not set up: AUTOPILOT_SERVER and AUTOPILOT_RUNNER_KEY are needed (nothing ran)."); process.exit(process.argv.includes("--check") ? 1 : 0); }
  if (process.argv.includes("--check")) { const c = await checkKey({ server, runnerKey }); process.exit(c.ok ? 0 : 1); }
  const r = await runDue({ server, runnerKey, maxMs: hours * 3600e3 }); process.exit(r.some((x) => !x.ok) ? 1 : 0);
}
