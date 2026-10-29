/**
 * RR-342 (owner GREEN, 29 Oct 2026) · the fixes from the owner's LIVE buyer test:
 *   · the buyer key REPLACES the owner licence (the app still said "Owner — unlimited"); a key pasted from anywhere is cleaned;
 *     the app's licence check sends the key in the BODY (a query string lands in the site's request logs);
 *   · the site: a signing key Vercel holds but cannot use is said by name (it was a bare 500 to every app), and /owner says so;
 *   · the Manage-plan portal's state beside its button; the test dates keep a share of the day's caps and their last run is shown;
 *   · the keyword database: months in the short shape, the 31-day clean-up; the build signs when signing.json names a signer.
 * Everything runs IN THIS PROCESS (fake Stripe, fake router, keys made for the test).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, launchVarsOf, signingKeyState, pemOf, SALES_PATHS } from "../site/app.mjs";
import { portalStatus } from "../site/billing.mjs";
import { ownerPage, datesLine } from "../site/pages.mjs";
import { makeOwnerLicence, signedLicence } from "../services/licence/service.mjs";
import { licenceState, cleanLicenceText, ownerLicenceText, verifyLicence } from "../desktop/licence.mjs";
import { memoryStore, packMonths, unpackMonths, RETAIN } from "../site/kw-store.mjs";
import { FINDER } from "../site/kw-finder.mjs";
import { CF_COLLECTOR, datesShareOf } from "../site/cf-collector.mjs";
import { readSigning, signArgs, signFile, findSigntool, TIMESTAMP } from "../desktop/sign.mjs";
import { setSigningKey, prepare } from "../site/owner-set-signing-key.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pair = () => { const k = generateKeyPairSync("ed25519"); return { PRIV: k.privateKey.export({ type: "pkcs8", format: "pem" }), PUB: k.publicKey.export({ type: "spki", format: "pem" }) }; };
const K = pair(), OTHER = pair();
const ROUTER = "fake-router-secret-for-this-test-only";
const A = "av_buyerAaaaaaaaaaaaaaaaaaaaaaa";
const NOW = Date.parse("2026-10-29T12:00:00Z");

test("RR-342 · licenceState: a stored check or an answer for ANOTHER licence never counts for this key", () => {
  const owner = makeOwnerLicence({ privateKeyPem: K.PRIV, now: NOW });
  const buyer = signedLicence({ accounts: { [A]: { plan: "visibility_1", status: "ACTIVE", periodEnd: new Date(NOW + 20 * 864e5).toISOString() } }, account: A, privateKeyPem: K.PRIV, now: NOW });
  /* the owner's last good check is still on disk; the buyer key is now the app's: offline, it is NOT the owner's unlimited plan */
  const offline = licenceState({ now: NOW, check: { reached: false }, last: { at: NOW, signed: owner }, publicKeyPem: K.PUB, account: A });
  assert.equal(offline.state, "NO_PLAN", offline.line);
  const online = licenceState({ now: NOW, check: { reached: true, signed: buyer }, last: { at: NOW, signed: owner }, publicKeyPem: K.PUB, account: A });
  assert.deepEqual([online.state, online.plan.id], ["ACTIVE", "visibility_1"]);
  const wrongAnswer = licenceState({ now: NOW, check: { reached: true, signed: owner }, last: null, publicKeyPem: K.PUB, account: A });
  assert.equal(wrongAnswer.state, "INVALID", "a signed answer for another licence was taken");
  /* positive control: without the account (the old call) the owner's stored check was taken — the very defect */
  assert.equal(licenceState({ now: NOW, check: { reached: false }, last: { at: NOW, signed: owner }, publicKeyPem: K.PUB }).plan.id, "visibility_unlimited");
});

test("RR-342 · a key pasted from anywhere: line breaks, spaces, quotes and invisible characters go; only the key stays", () => {
  for (const pasted of [`${A}\r\n`, `  "${A}"  `, `\uFEFF${A}`, `“${A}”`, `av_buyer\u200BAaaaaaaaaaaaaaaaaaaaaaa`, `Licence key: ${A}`, `${A.slice(0, 12)}\r\n${A.slice(12)}`]) assert.equal(cleanLicenceText(pasted), A, JSON.stringify(pasted));
  assert.equal(cleanLicenceText("no key here"), "");
  const owner = ownerLicenceText(makeOwnerLicence({ privateKeyPem: K.PRIV, now: NOW }));
  assert.equal(cleanLicenceText(`${owner.slice(0, 50)}\n${owner.slice(50)}\n`), owner);
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(ui, /<label>Licence key<textarea id="k1"/, "the key field is a box that takes any paste");
});

/* the sales site in this process, recording how the app asks for its licence */
const routed = (base, event) => { const body = JSON.stringify(event); const t = Math.floor(Date.now() / 1000); return fetch(`${base}/api/webhooks/stripe`, { method: "POST", headers: { "content-type": "application/json", "x-almi-router-signature": `t=${t},v1=${createHmac("sha256", ROUTER).update(`${t}.${body}`).digest("hex")}` }, body }); };
async function site(env) {
  const dir = mkdtempSync(join(tmpdir(), "rr342-")), asked = [];
  const h = createApp({ mode: "sales", env, dataDir: dir, stripeFetch: async () => new Response("{}", { status: 404 }), fetchImpl: async () => new Response("", { status: 404 }), kvFetch: async () => new Response("", { status: 500 }) });
  const srv = createServer((q, r) => { if (q.url.startsWith("/v1/licence")) asked.push({ method: q.method, url: q.url }); h(q, r); }); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${srv.address().port}`, asked, close: () => { srv.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const ENV = { ROUTER_WEBHOOK_SECRET: ROUTER, LICENCE_SIGNING_KEY: K.PRIV, LICENCE_PUBLIC_KEY: K.PUB, STRIPE_PRICE_ID_VISIBILITY_1: "price_fake1" };

test("RR-342 · THE APP: owner licence first, then a buyer key pasted with a line break → the buyer's plan shows; the key goes in the body", async () => {
  const s = await site(ENV), dir = mkdtempSync(join(tmpdir(), "rr342-app-")), keys = join(dir, "keys");
  mkdirSync(keys); writeFileSync(join(keys, "licence-public.pem"), K.PUB);
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: keys, licenceUrl: `${s.base}/`, updateChannelUrl: "http://127.0.0.1:9/" }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    await routed(s.base, { type: "checkout.session.completed", data: { object: { id: "cs_A", subscription: "sub_A", client_reference_id: A, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: A } } } });
    await routed(s.base, { type: "customer.subscription.updated", data: { object: { id: "sub_A", status: "active", current_period_end: Math.floor(NOW / 1000) + 30 * 86400 + 3e7, metadata: { product: "almi-visibility", plan: "visibility_1", almiworld_account: A }, items: { data: [{ price: { id: "price_fake1" } }] } } } });
    for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (path, o) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
    const owner = ownerLicenceText(makeOwnerLicence({ privateKeyPem: K.PRIV, now: NOW }));
    assert.match((await (await post("/api/account", { licenceKey: owner })).json()).line, /Owner — AlmiWorld/);
    const r = await (await post("/api/account", { licenceKey: `${A}\r\n` })).json();
    assert.ok(r.ok, JSON.stringify(r));
    assert.doesNotMatch(r.line, /Owner/, "the owner licence still decided after the buyer key was saved");
    assert.match((await (await fetch(`${base}/api/home`)).json()).licence, /\$30 a month — 1 product/);
    assert.ok(!JSON.parse(readFileSync(join(dir, "config.json"), "utf8")).owner, "the owner licence was kept beside the buyer key");
    assert.ok(s.asked.length > 0 && s.asked.every((a) => a.method === "POST" && !a.url.includes("account=")), JSON.stringify(s.asked));
  } finally { p.kill(); s.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("RR-342 · THE SITE: POST /v1/licence answers with the key in the body; GET still answers 1.15.1; an unusable signing key is named, never a bare 500", async () => {
  const s = await site(ENV);
  try {
    const viaPost = await fetch(`${s.base}/v1/licence`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ account: A }) });
    assert.equal(viaPost.status, 200); const j = await viaPost.json();
    assert.deepEqual([j.licence.account, j.licence.status, verifyLicence(j, K.PUB)], [A, "NO_PLAN", true]);
    assert.equal((await fetch(`${s.base}/v1/licence?account=${A}`)).status, 200, "the apps already installed (1.15.1) ask with GET");
    assert.ok(SALES_PATHS.POST.includes("/v1/licence"));
  } finally { s.close(); }
  /* the owner's case: the key reached Vercel as one line with \n written out — read again; a public key pasted there — named */
  const oneLine = K.PRIV.trim().replace(/\n/g, "\\n");
  const s2 = await site({ ...ENV, LICENCE_SIGNING_KEY: oneLine });
  try { assert.equal((await fetch(`${s2.base}/v1/licence?account=${A}`)).status, 200, "a one-line key was not read"); } finally { s2.close(); }
  const s3 = await site({ ...ENV, LICENCE_SIGNING_KEY: K.PUB });
  try { const r = await fetch(`${s3.base}/v1/licence?account=${A}`); assert.equal(r.status, 503); const t = await r.text(); assert.match(t, /LICENCE_SIGNING_KEY\) cannot be used — see \/owner/); assert.ok(!t.includes("BEGIN")); } finally { s3.close(); }
});

test("RR-342 · /owner Launch settings: 'set' is not enough — a key the site cannot read, or not the pair of the public key, is said in words", () => {
  assert.deepEqual(signingKeyState({ LICENCE_SIGNING_KEY: K.PRIV, LICENCE_PUBLIC_KEY: K.PUB }), { set: true, ok: true });
  assert.equal(signingKeyState({ LICENCE_SIGNING_KEY: K.PRIV.replace(/\n/g, " ") }).ok, true, "line breaks turned into spaces");
  assert.match(signingKeyState({ LICENCE_SIGNING_KEY: "not a key at all" }).why, /cannot read it as a private key/);
  assert.match(signingKeyState({ LICENCE_SIGNING_KEY: K.PRIV, LICENCE_PUBLIC_KEY: OTHER.PUB }).why, /not the pair of LICENCE_PUBLIC_KEY/);
  const html = ownerPage({ launch: launchVarsOf({ LICENCE_SIGNING_KEY: K.PUB, LICENCE_PUBLIC_KEY: K.PUB }) });
  assert.match(html, /<code>LICENCE_SIGNING_KEY<\/code><\/td><td>[^<]*<\/td><td><span class="err">set, but/);
  assert.ok(!html.includes(K.PUB.split("\n")[1]), "a key reached the page");
  assert.match(pemOf("abc\\ndef"), /^-----BEGIN PRIVATE KEY-----\nabcdef\n-----END PRIVATE KEY-----\n$/);
});

test("RR-342 follow-up · the loader reads a key made by make-signing-keys.mjs in every paste shape — CRLF written out, invisible characters too", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr342-keys-")), k = join(dir, "k");
  try {
    spawnSync(process.execPath, [join(REPO, "tools", "make-signing-keys.mjs"), k]);
    const priv = readFileSync(join(k, "licence-private.pem"), "utf8"), pub = readFileSync(join(k, "licence-public.pem"), "utf8");
    const shapes = [priv, priv.replace(/\n/g, "\r\n"), priv.replace(/\n/g, ""), priv.replace(/\n/g, " "), priv.trim().replace(/\n/g, "\\n"), priv.trim().replace(/\n/g, "\\r\\n"), priv.replace("-----\n", "-----\n​"), `﻿${priv}`, `"${priv.trim()}"`];
    shapes.forEach((v, i) => assert.equal(signingKeyState({ LICENCE_SIGNING_KEY: v, LICENCE_PUBLIC_KEY: pub }).ok, true, `shape ${i}`));
    assert.equal(signingKeyState({ LICENCE_SIGNING_KEY: pub, LICENCE_PUBLIC_KEY: pub }).ok, false, "a public key passed as the signing key");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("RR-342 follow-up · the owner's tool: checks the pair, then hands the key to Vercel on STDIN as one line; never prints it", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr342-set-")), k = join(dir, "k"), siteDir = join(dir, "site");
  try {
    spawnSync(process.execPath, [join(REPO, "tools", "make-signing-keys.mjs"), k]);
    mkdirSync(join(siteDir, ".vercel"), { recursive: true });
    const priv = readFileSync(join(k, "licence-private.pem"), "utf8"), calls = [], lines = [];
    const code = setSigningKey({ keysDir: k, siteDir, run: (cwd, args, input = "") => { calls.push({ cwd, args, input }); return 0; }, log: (l) => lines.push(l) });
    assert.equal(code, 0, lines.join("\n"));
    assert.deepEqual(calls.map((c) => c.args), [["env", "rm", "LICENCE_SIGNING_KEY", "production", "--yes"], ["env", "add", "LICENCE_SIGNING_KEY", "production", "--sensitive"]]);
    const sent = calls[1].input.trimEnd();
    assert.ok(!sent.includes("\n") && !sent.includes("\r"), "the key went with line breaks");
    assert.equal(signingKeyState({ LICENCE_SIGNING_KEY: sent, LICENCE_PUBLIC_KEY: readFileSync(join(k, "licence-public.pem"), "utf8") }).ok, true, "the site cannot read what the tool sends");
    const body = priv.split("\n")[1];
    assert.ok(lines.every((l) => !l.includes(body) && !l.includes("BEGIN")), "the key reached the output");
    assert.ok(calls.every((c) => c.cwd === siteDir && !c.args.join(" ").includes(body)), "the key reached a command line");
    /* a wrong pair: refused, nothing sent to Vercel */
    writeFileSync(join(k, "licence-public.pem"), generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }));
    calls.length = 0;
    assert.equal(setSigningKey({ keysDir: k, siteDir, run: (cwd, args, input) => { calls.push(args); return 0; }, log: (l) => lines.push(l) }), 2);
    assert.equal(calls.length, 0); assert.match(lines.at(-1), /not the pair of licence-public\.pem/);
    assert.equal(prepare({ privText: "nope", pubText: "nope" }).ok, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("RR-342 · the Manage-plan portal: its state read-only beside the button; the answer to a press stays there and the page opens on it", async () => {
  const KEY = "sk_live_SECRET_for_this_test_only", lists = [];
  const fetchImpl = (configs, status = 200) => async (url, o = {}) => { lists.push({ url: String(url), method: o.method ?? "GET" }); return new Response(JSON.stringify({ data: configs }), { status }); };
  assert.match((await portalStatus({ env: {} })).line, /no Stripe key/);
  assert.match((await portalStatus({ env: { STRIPE_SECRET_KEY: KEY }, fetchImpl: fetchImpl([{ id: "bpc_default", is_default: true, metadata: {} }]) })).line, /not made yet/);
  const ok = await portalStatus({ env: { STRIPE_SECRET_KEY: KEY }, fetchImpl: fetchImpl([{ id: "bpc_own1", active: true, is_default: false, metadata: { product: "almi-visibility" } }]) });
  assert.deepEqual([ok.ok, ok.id], [true, "bpc_own1"]); assert.match(ok.line, /OK — AlmiVisibility's own portal is in Stripe: bpc_own1/);
  assert.match((await portalStatus({ env: { STRIPE_SECRET_KEY: KEY }, fetchImpl: fetchImpl([], 403) })).line, /HTTP 403\) — the key needs “Customer portal: Read”/);
  assert.ok(lists.every((c) => c.method === "GET"), "a status read wrote to Stripe");
  const pressed = ownerPage({ launch: launchVarsOf({}), portal: { ok: false, line: "FAILED — Stripe refused the key (401)." }, portalPressed: true });
  assert.match(pressed, /<details open data-launch>/);
  assert.match(pressed, /action="\/owner\/portal#portal"[\s\S]*<p id="portal" role="status" class="err"><b>Manage-plan portal:<\/b> FAILED — Stripe refused the key \(401\)\./);
  for (const r of [ok, pressed]) assert.ok(!JSON.stringify(r).includes(KEY));
});

test("RR-342 · test dates: country facts leave them a share of the day's caps; their last run is one line, red when it stopped at once", () => {
  assert.deepEqual(datesShareOf({ aiUsd: 2, reads: 200 }), { aiUsd: 0.5, reads: 40 });
  assert.deepEqual(datesShareOf({ aiUsd: 0.4, reads: 8 }), { aiUsd: 0.1, reads: 2 }, "a small cap gives a quarter, never all of it");
  assert.equal(CF_COLLECTOR.aiUsdPerDay - datesShareOf({ aiUsd: CF_COLLECTOR.aiUsdPerDay, reads: CF_COLLECTOR.readsPerDay }).aiUsd > 0, true);
  assert.match(datesLine(null), /Test dates: not run yet/);
  const red = datesLine({ at: "2026-10-28T14:37:10Z", done: [], dates: 0, stoppedBy: "READS", why: "Today's 200 page reads are used — the next day continues.", reads: 0, aiUsd: 0 });
  assert.match(red, /^<p data-dates-last class="err">Test dates — last run 2026-10-28 14:37 UTC: 0 test × country tried, 0 dates kept[\s\S]*stopped: Today&#39;s 200 page reads are used|^<p data-dates-last class="err">Test dates — last run 2026-10-28 14:37 UTC: 0 test × country tried, 0 dates kept[\s\S]*stopped: Today's 200 page reads are used/);
  assert.doesNotMatch(datesLine({ at: "2026-10-28T14:37:10Z", done: ["OET · Pakistan"], dates: 3, stoppedBy: "TIME", why: "x" }), /class="err"/);
});

test("RR-342 · months in the short shape: the same figures back, in the shape every reader knows", async () => {
  const m = { "2025-11": 120, "2025-12": 90, "2026-01": 0, "2026-03": 40 };
  assert.deepEqual(packMonths(m), ["2025-11", 120, 90, 0, null, 40]);
  assert.deepEqual(unpackMonths(packMonths(m)), m);
  assert.equal(packMonths(null), null); assert.deepEqual(packMonths({ "not-a-month": 1 }), { "not-a-month": 1 }, "an unknown shape is kept as it was");
  assert.ok(JSON.stringify(packMonths(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2025-${String(i + 1).padStart(2, "0")}`, 12345])))).length < 0.6 * JSON.stringify(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`2025-${String(i + 1).padStart(2, "0")}`, 12345]))).length);
  const s = memoryStore();
  await s.saveFetch({ kind: "unit", seedKey: "q:oet", location: "PK", language: "1000", day: "2026-10-01", at: "2026-10-01T00:00:00Z", ops: 1, rows: [{ text: "oet exam", said: 120, months: m }] });
  assert.deepEqual((await s.findFetch({ seedKey: "q:oet", location: "PK", language: "1000", since: "2026-09-01" })).rows[0].months, m);
  /* an OLD-shape row (written before RR-342) is put in the short shape by packMonths(), figures unchanged */
  s._put({ keyword: "oet nursing", location: "PK", language: "1000", day: "2026-09-01", volume: 50, months: { "2025-10": 50 } });
  assert.equal(await s.packMonths({ rows: 10 }), 1); assert.equal(await s.packMonths({ rows: 10 }), 0, "packed twice");
});

test("RR-342 · the 31-day clean-up: old keyword lists and replaced figures go; the newest figure, the owner's files and recent fetches stay", async () => {
  assert.ok(RETAIN.days > FINDER.reuseDays, "the clean-up would cut what the finder still reuses");
  const s = memoryStore(), save = (seedKey, day, said, kind = "unit") => s.saveFetch({ kind, seedKey, location: "PK", language: "1000", day, at: `${day}T00:00:00Z`, ops: 1, rows: [{ text: "oet exam", said, months: null }, { text: `${seedKey} only`, said: said / 10, months: null }] });
  await save("file:abc", "2026-07-01", 70, "file");
  await save("q:a", "2026-08-01", 100); await save("q:a", "2026-09-01", 110); await save("q:b", "2026-10-25", 120);
  const before = "2026-09-28";
  const r = await s.prune({ before });
  assert.equal(r.fetchKeywords, 4, "the two old collected fetches' keyword lists");
  assert.equal((await s.findFetch({ seedKey: "q:b", location: "PK", language: "1000", since: "2026-10-01" })).rows.find((x) => x.keyword === "oet exam").volume, 120, "a recent fetch lost a figure");
  assert.equal((await s.fileKeywords({ phrases: ["oet exam"], location: "PK", language: "1000" })).rows[0].volume, 70, "the owner's file lost its figure");
  assert.equal((await s.knownKeywords(["q:a only"], { location: "PK", language: "1000" })).size, 1, "the newest figure of a keyword was removed");
  assert.equal(r.observations, 1, "the replaced figure of q:a only (100 → 110)");
  assert.deepEqual(await s.prune({ before }), { fetchKeywords: 0, observations: 0 }, "a second pass removed more");
  /* the collector runs it, and says so on its last-run line */
  const src = readFileSync(join(REPO, "site", "kw-collector.mjs"), "utf8");
  assert.match(src, /out\.tidied = \{ packed: 0, fetchKeywords: 0, observations: 0 \}/);
  assert.match(src.slice(src.indexOf("out.tidied ="), src.indexOf("const { groups } = await currentGroups")), /store\.packMonths[\s\S]*store\.prune/);
});

test("RR-342 · the Microsoft Store: once VISIBILITY_STORE_URL is set, Download points to the listing; the GitHub Setup is linked from nowhere but still answers", async () => {
  const STORE = "https://apps.microsoft.com/detail/9NTESTONLY0";
  const s = await site({ ...ENV, VISIBILITY_SETUP_URL: "https://github.com/x/almivisibility-releases/releases/latest/download/AlmiVisibility-Setup.exe", VISIBILITY_STORE_URL: STORE });
  try {
    const page = await (await fetch(`${s.base}/download`)).text();
    assert.match(page, new RegExp(`<a class="pill big" href="${STORE}" rel="noopener" data-store>Get it from the Microsoft Store</a>`));
    assert.ok(!page.includes("/download/AlmiVisibility-Setup.exe"), "the Setup link is still on the page");
    assert.ok(!/not yet code-signed/.test(page), "the unsigned-installer warning beside a Store link");
    assert.equal((await fetch(`${s.base}/download/AlmiVisibility-Setup.exe`, { redirect: "manual" })).status, 302, "the hidden fallback stopped answering");
  } finally { s.close(); }
  const s2 = await site({ ...ENV, VISIBILITY_SETUP_URL: "https://github.com/x/r/releases/latest/download/AlmiVisibility-Setup.exe", VISIBILITY_STORE_URL: "https://evil.example/app" });
  try { const page = await (await fetch(`${s2.base}/download`)).text(); assert.ok(!page.includes("evil.example") && page.includes("/download/AlmiVisibility-Setup.exe"), "a non-Store address was linked"); } finally { s2.close(); }
});

test("RR-342 · code signing: signing.json names the signer (no secret in it); signtool signs, timestamps and verifies; no file → unsigned, said", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr342-sign-"));
  try {
    assert.equal(readSigning(dir), null);
    writeFileSync(join(dir, "signing.json"), "{nope"); assert.match(readSigning(dir).why, /not JSON/);
    writeFileSync(join(dir, "signing.json"), JSON.stringify({ method: "certum", subject: "S M Nasir Uz Zaman" }));
    const c = readSigning(dir); assert.equal(c.ok, true);
    assert.deepEqual(signArgs(c.cfg, "Setup.exe"), ["sign", "/fd", "SHA256", "/tr", TIMESTAMP.certum, "/td", "SHA256", "/n", "S M Nasir Uz Zaman", "Setup.exe"]);
    assert.deepEqual(signArgs({ method: "artifact", dlib: "d.dll", metadata: "m.json" }, "x.exe").slice(-5), ["/dlib", "d.dll", "/dmdf", "m.json", "x.exe"]);
    const ran = [];
    assert.deepEqual(signFile({ cfg: c.cfg, file: "Setup.exe", signtool: "signtool.exe", run: (e, a) => ran.push(a[0]) }), { ok: true, line: "SIGNED (certum), timestamped, verified" });
    assert.deepEqual(ran, ["sign", "verify"]);
    assert.equal(signFile({ cfg: c.cfg, file: "x", signtool: "s", run: (e, a) => { if (a[0] === "verify") throw new Error("x"); } }).ok, false, "an untrusted signature passed");
    assert.match(signFile({ cfg: c.cfg, file: "x", signtool: null }).line, /signtool\.exe was not found/);
    assert.equal(findSigntool({}, { exists: (p) => p.includes("10.0.26100.0"), list: () => ["10.0.19041.0", "10.0.26100.0", "x"] }), "C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.26100.0\\x64\\signtool.exe");
    const build = readFileSync(join(REPO, "desktop", "build.mjs"), "utf8");
    assert.match(build, /readSigning\(KEYS\)[\s\S]*signFile\(\{ cfg: signing\.cfg, file: setupExe \}\)/);
    assert.match(build, /if \(signing && !signed\?\.ok\) process\.exit\(3\)/, "an asked-for signature that failed must stop the build");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
