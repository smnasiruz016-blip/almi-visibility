/**
 * 🔴 RR-417 · THE AUTOPILOT RUNNER FAILED EVERY DAY FROM 22 NOV 2026: "84ddfd: stopped (Unexpected token 'T', "The free s"... is not valid JSON)".
 * The cause: owner-google-sign-in.mjs replaced CRON_SECRET (vercel env add --force) on 22 Nov; the at-rest key of every saved autopilot
 * product and client key is derived from it (site/autopilot-server.mjs sealKey) → open() threw on /runner/autopilot/<key>/secrets → the
 * site's catch-all answered the FREE SCORE's plain-text sentence → the runner parsed it as JSON.
 * These tests rebuild that state — a product sealed under an OLD CRON_SECRET, served by the REAL site app under the NEW one — and drive the
 * REAL runner (runDue) against it. No network beyond 127.0.0.1, no production, no keys.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { apMemoryStore, productKey, sealKey, seal, LOCKED_LINE } from "../site/autopilot-server.mjs";
import { runDue, answerOf } from "../desktop/autopilot-runner.mjs";
import { encode, chunksOf } from "../desktop/autopilot-sync.mjs";

const OLD = { CRON_SECRET: "o".repeat(43) }, NEW = { CRON_SECRET: "n".repeat(43) }, RUNNER = "r".repeat(40);
const j = (o) => Buffer.from(JSON.stringify(o));

/** a product as the app left it: its keys and its bundle sealed with the at-rest key of `env` */
async function keep(store, { account = "acct-1", product, env, last = null }) {
  const key = productKey(account, product), k = sealKey(env), parts = chunksOf(encode({ [`products/${product}/a.json`]: "{\"x\":1}" }));
  for (let n = 0; n < parts.length; n++) await store.putChunk(key, 1, n, seal(k, parts[n]));
  await store.put({ key, account, product, mode: "autopilot", version: 1, chunks: parts.length, size: 1, secrets: seal(k, j({ ANTHROPIC_API_KEY: "sk-ant-secret-1234567890" })), names: ["ANTHROPIC_API_KEY"], last });
  return key;
}
async function site(store, env = NEW) {
  const { createApp } = await import("../site/app.mjs");
  const handle = createApp({ mode: "public-lite", env: { ...env, AUTOPILOT_RUNNER_KEY: RUNNER }, apStore: store, kvFetch: async () => { throw new Error("no kv"); } });
  const srv = createServer((q, s) => handle(q, s)); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${srv.address().port}/`, close: () => new Promise((r) => srv.close(r)) };
}
const H = { "x-autopilot-runner": RUNNER };

test("1 · THE 22 NOV STATE, THE REAL RUNNER: a product sealed under the old CRON_SECRET is NOT handed out, it is said (a warning with its code only), and the run ends ok — never 'Unexpected token'", async () => {
  const store = apMemoryStore(), key = await keep(store, { product: "almioet", env: OLD }), s = await site(store);
  try {
    const lines = [], out = await runDue({ server: s.url, runnerKey: RUNNER, log: (l) => lines.push(l) });
    const said = lines.join("\n");
    assert.doesNotMatch(said, /Unexpected token|not valid JSON|stopped/, said);
    assert.match(said, new RegExp(`^::warning::${key.slice(0, 6)}: LOCKED — the server cannot read its saved copy and keys \\(sealed with an older server key\\)`, "m"));
    assert.doesNotMatch(said, /almioet|sk-ant/, "a product's name or key reached the public job log");
    assert.deepEqual(out, [{ key, ok: true, locked: true }]); assert.equal(out.some((x) => !x.ok), false, "the job would exit 1");
    /* the client is told where they look: the product's last cycle (the app, the phone page) — once per version, never a lease */
    const row = await store.get(key); assert.equal(row.lease_until ?? null, null, "a locked product was leased"); assert.equal(row.last.locked, 1); assert.equal(row.last.steps[0].line, LOCKED_LINE);
    /* asked directly, the runner's routes answer JSON, never the free score's sentence */
    for (const p of [`runner/autopilot/${key}/secrets`, `runner/autopilot/${key}/state?n=0`]) { const r = await fetch(new URL(p, s.url), { headers: H }), t = await r.text(); assert.equal(r.status, 409, p); assert.equal(JSON.parse(t).locked, true); assert.doesNotMatch(t, /free score/); }
  } finally { await s.close(); }
});

test("2 · A PRODUCT SEALED WITH TODAY'S KEY STILL RUNS: handed out, its keys and its copy read back", async () => {
  const store = apMemoryStore(), key = await keep(store, { product: "almipte", env: NEW }), s = await site(store);
  try {
    const due = await (await fetch(new URL("runner/autopilot/due", s.url), { headers: H })).json(); assert.deepEqual(due.due.map((d) => d.key), [key]); assert.deepEqual(due.locked, []);
    const keys = await answerOf(await fetch(new URL(`runner/autopilot/${key}/secrets`, s.url), { headers: H }), "keys"); assert.equal(keys.keys.ANTHROPIC_API_KEY, "sk-ant-secret-1234567890");
    assert.equal((await fetch(new URL(`runner/autopilot/${key}/state?n=0`, s.url), { headers: H })).status, 200);
  } finally { await s.close(); }
});

test("3 · THE WAY BACK: the app sees LOCKED (no key names it cannot prove), types its keys again (the old unreadable ones replaced, not a 503), sends its copy as the next version → handed to the runner again", async () => {
  const { apHandle } = await import("../site/autopilot-server.mjs");
  const store = apMemoryStore(), key = await keep(store, { product: "almioet", env: OLD }), lic = { ok: true, account: "acct-1" };
  const call = (o) => apHandle({ query: new URLSearchParams(), raw: Buffer.alloc(0), headers: {}, env: { ...NEW, AUTOPILOT_RUNNER_KEY: RUNNER }, store, lic, ...o });
  const info = await call({ method: "GET", path: "/v1/autopilot/almioet" });
  assert.equal(info.status, 200); assert.deepEqual(info.json.keys, [], "the app was told keys are kept that the server cannot read"); assert.deepEqual({ keys: info.json.locked.keys, bundle: info.json.locked.bundle }, { keys: true, bundle: true }); assert.equal(info.json.locked.why, LOCKED_LINE);
  assert.equal((await call({ method: "GET", path: "/v1/autopilot/almioet/state", query: new URLSearchParams({ n: "0" }) })).status, 409, "the app's pull of a locked copy");
  const typed = await call({ method: "POST", path: "/v1/autopilot/almioet", raw: j({ keys: { ANTHROPIC_API_KEY: "sk-ant-new-0987654321" } }) });
  assert.equal(typed.status, 200); assert.deepEqual(typed.json.keys, ["ANTHROPIC_API_KEY"]);
  const parts = chunksOf(encode({ "products/almioet/a.json": "{\"x\":2}" }));
  for (let n = 0; n < parts.length; n++) assert.equal((await call({ method: "POST", path: "/v1/autopilot/almioet/state", query: new URLSearchParams({ version: "2", n: String(n), of: String(parts.length) }), raw: parts[n] })).status, 200);
  assert.equal((await call({ method: "GET", path: "/v1/autopilot/almioet" })).json.locked, undefined, "still locked after the app sent everything again");
  const due = await call({ method: "GET", path: "/runner/autopilot/due", headers: H, lic: null }); assert.deepEqual(due.json.due.map((d) => d.key), [key]);
  const keys = await call({ method: "GET", path: `/runner/autopilot/${key}/secrets`, headers: H, lic: null }); assert.equal(keys.json.keys.ANTHROPIC_API_KEY, "sk-ant-new-0987654321");
});

test("4 · THE RUNNER NAMES WHAT IT GOT: a plain-text page is 'the server answered 503 (not JSON)', a locked answer is 'sealed with an older server key' — and a machine route that throws answers JSON", async () => {
  await assert.rejects(answerOf(new Response("The free score is not available just now.", { status: 503 }), "keys"), /the server answered 503 \(not JSON\) for the keys/);
  await assert.rejects(answerOf(new Response(JSON.stringify({ ok: false, locked: true }), { status: 409 }), "keys"), (e) => e.locked === true && /sealed with an older server key/.test(e.message));
  /* a store that breaks: the site's catch-all — JSON for /runner and /v1, the free score's sentence stays for people's pages */
  const broken = { ...apMemoryStore(), all: async () => { throw new Error("db down"); }, get: async () => { throw new Error("db down"); } }, s = await site(broken);
  try {
    const r = await fetch(new URL("runner/autopilot/due", s.url), { headers: H }); assert.equal(r.status, 503); assert.match(r.headers.get("content-type"), /application\/json/); assert.equal((await r.json()).ok, false);
    const lines = []; const out = await runDue({ server: s.url, runnerKey: RUNNER, log: (l) => lines.push(l) }); assert.deepEqual(out, [{ ok: false }]); assert.match(lines.join("\n"), /did not answer the runner \(503\)/);
  } finally { await s.close(); }
});
