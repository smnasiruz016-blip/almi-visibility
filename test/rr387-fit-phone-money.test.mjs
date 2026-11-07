/**
 * RR-387 (owner, 7 Nov 06:05): every shown answer answers its own question (the strict check, hidden from the page AND its FAQ data);
 * the Search Console sign-in says every step; autopilot is turned OFF from a phone while the computer is off (a one-time link whose
 * secret never rides in a URL the server sees); a runner that stops mid-cycle still hands back what it spent. Nothing leaves this machine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fitKey, fitRowsOf, fitJudgeAll, hideUnfit, faqQuestions, FIT_SYSTEM, SHIPPED } from "../desktop/answer-fit.mjs";
import { visibleQa } from "../desktop/page-law.mjs";
import { faqDiff } from "../desktop/site-scan.mjs";
import { asPublishedGuarded, oldestLastChecked } from "../desktop/publish.mjs";
import { apHandle, apMemoryStore, productKey, PHONE_PAGE, PHONE_JS } from "../site/autopilot-server.mjs";
import { runOne, runDue } from "../desktop/autopilot-runner.mjs";
import { encode, decode, chunksOf } from "../desktop/autopilot-sync.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const qa = (q, as) => `<details data-need-id="${fitKey(q, "")}"><summary>${q}</summary>${as.map(([a, d]) => `<p>${a} <a class="src" href="https://src.example/x">S</a><span class="src"> · checked ${d}</span></p>`).join("")}</details>`;
const faq = (rows) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: rows.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
const page = () => `<!doctype html><html><head><title>t</title>${faq([["What is OET Speaking?", "A role-play. Islamabad, Karachi and Lahore have venues."], ["Can I apply offline?", "Book online on oet.com."]])}</head><body><main><h1>x</h1><p class="checked" data-last-checked="2026-11-05">Last checked 2026-11-05</p>${qa("What is OET Speaking?", [["A role-play.", "2026-11-05"], ["Islamabad, Karachi and Lahore have venues.", "2026-11-01"]])}${qa("Can I apply offline?", [["Book online on oet.com.", "2026-11-04"]])}<a data-cta>Go</a></main></body></html>`;

test("1 · A1 THE STRICT CHECK: an answer judged 'does not answer its question' leaves the page AND its FAQ data; a question with nothing left goes; the FAQ data stays equal to what is shown; 'Last checked' follows the facts left", () => {
  const bad = new Set([fitKey("What is OET Speaking?", "Islamabad, Karachi and Lahore have venues."), fitKey("Can I apply offline?", "Book online on oet.com.")]);
  const out = hideUnfit(page(), (q, a) => bad.has(fitKey(q, a)));
  assert.deepEqual(visibleQa(out).map((x) => [x.q, x.answers.map((a) => a.words)]), [["What is OET Speaking?", ["A role-play."]]]);
  assert.deepEqual(faqQuestions(out), ["What is OET Speaking?"]); assert.equal(faqDiff(out).length, 0, "FAQ data = shown");
  assert.match(oldestLastChecked(out), /Last checked 2026-11-05/, "the oldest fact LEFT is 11-05 (the 11-01 one left the page)");
  assert.equal(hideUnfit(page(), () => false), page(), "nothing judged unfit: the page is untouched");
  assert.equal(fitRowsOf(page()).length, 3); assert.equal(fitKey("What  is OET?", "A test."), fitKey("what is oet?", "a test"), "one pair, one key, however it is spaced");
  assert.match(FIT_SYSTEM, /BOTH parts answered/); assert.match(FIT_SYSTEM, /only the online steps under "Can I apply offline\?"/);
  assert.ok(SHIPPED.fail > 0 && SHIPPED.pass > 0, "the owner's live pages were judged (lists/answer-fit.json)");
});
test("2 · A1 the check costs little and stops at the cap: question and answers only, never a source page; verdicts by the pair itself", async () => {
  const sent = []; const fx = async (_u, init) => { const b = JSON.parse(init.body), rows = JSON.parse(b.messages[0].content); sent.push(rows); return new Response(JSON.stringify({ usage: { input_tokens: 100, output_tokens: 20 }, content: [{ type: "text", text: JSON.stringify({ verdicts: rows.map((r) => ({ i: r.i, fits: !/venues/.test(r.answer), reason: "x" })) }) }] }), { status: 200 }); };
  const rows = fitRowsOf(page()), t = await fitJudgeAll({ key: "k", rows, fetchImpl: fx, base: "http://127.0.0.1:9" });
  assert.equal(t.judged, 3); assert.equal(t.failed, 1); assert.ok(!JSON.stringify(sent).includes("src.example"), "no source page or link is sent");
  let n = 0; const capped = await fitJudgeAll({ key: "k", rows, fetchImpl: fx, base: "http://127.0.0.1:9", batch: 1, side: 1, allowed: () => n++ < 1 }); assert.equal(capped.judged, 1); assert.equal(capped.why, "cap");
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), pub = readFileSync(join(REPO, "desktop", "publish.mjs"), "utf8");
  assert.match(main, /if \(!quick\) \{ const f = await fitStep\(id, pages\.drafts\)/, "every NEW pair is judged in the app's own runs");
  assert.match(pub, /let h = oldestLastChecked\(hideUnfit\(html\)\);/, "the guard hides before it counts (a page below 6 goes noindex)");
});
test("3 · B1 THE SIGN-IN SAYS EVERY STEP, in Google's own words: the token step's error, a sign-in this app did not start, no refresh token", async () => {
  const { googleConnect } = await import("../desktop/google-connect.mjs");
  const keys = { get: (n) => (n === "GOOGLE_CLIENT_SECRET" ? "s" : null), set: () => ({ ok: true }) };
  const g = googleConnect({ keys, config: { googleClientId: "id" }, fetchImpl: async () => new Response(JSON.stringify({ error: "redirect_uri_mismatch", error_description: "Bad Request" }), { status: 400 }) });
  const { url } = g.start("http://127.0.0.1:5000/oauth/google"), state = new URL(url).searchParams.get("state");
  const r = await g.finish({ code: "c", state }); assert.equal(r.step, "exchange"); assert.match(r.why, /Google said: Bad Request \(400, redirect_uri_mismatch\)/); assert.match(r.why, /type "Desktop app"/);
  const lost = await g.finish({ code: "c", state: "never-started" }); assert.equal(lost.step, "state"); assert.match(lost.why, /this app did not start that sign-in/);
  const g2 = googleConnect({ keys, config: { googleClientId: "id" }, fetchImpl: async () => new Response(JSON.stringify({ access_token: "a", expires_in: 3600 }), { status: 200 }) }), s2 = new URL(g2.start("http://127.0.0.1:5000/oauth/google").url).searchParams.get("state");
  const nr = await g2.finish({ code: "c", state: s2 }); assert.equal(nr.step, "refresh");
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(main, /gsLog\(\{ \.\.\.gsRead\(\), callback: new Date\(\)\.toISOString\(\), hadCode:/); assert.match(main, /signin: gsRead\(\)/); assert.match(ui, /Google sent you back: /);
  assert.doesNotMatch(main.slice(main.indexOf("const GS_FILE"), main.indexOf("const GS_FILE") + 400), /code\b(?!:)|refresh_token|secret/, "no code, token or secret written");
});

const env = { CRON_SECRET: "c".repeat(32), AUTOPILOT_RUNNER_KEY: "r".repeat(32) }, lic = { ok: true, account: "acct-1" };
const call = (store, o) => apHandle({ env, store, headers: {}, query: new URLSearchParams(), raw: Buffer.alloc(0), origin: "https://srv.example", ...o });
const j = (o) => Buffer.from(JSON.stringify(o));
test("4 · B3 FROM THE PHONE, COMPUTER OFF: a one-time link (its secret in the #fragment, posted in the body), the last cycle and the week, OFF — the runner then takes nothing; a wrong or old link is refused", async () => {
  const store = apMemoryStore(), key = productKey("acct-1", "almioet");
  await call(store, { method: "POST", path: "/v1/autopilot/almioet", lic, raw: j({ mode: "autopilot", email: "o@example.invalid" }) });
  const buf = encode({ "products/almioet/a.json": "{}" }); await call(store, { method: "POST", path: "/v1/autopilot/almioet/state", lic, query: new URLSearchParams({ version: "1", n: "0", of: "1" }), raw: chunksOf(buf)[0] });
  const mails = []; const L = await call(store, { method: "POST", path: "/v1/autopilot/almioet/phone", lic, sendWeekly: async (m) => { mails.push(m); return { ok: true }; } });
  assert.equal(L.status, 200); assert.match(L.json.link, /^https:\/\/srv\.example\/autopilot#k=[0-9a-f]{32}&t=[\w-]{20,}$/); assert.equal(L.json.mailed, true); assert.ok(mails[0].text.includes(L.json.link));
  const t = new URL(L.json.link).hash.match(/t=([\w-]+)/)[1]; assert.ok(!(await store.get(key)).phone.hash.includes(t), "only a hash is kept");
  /* the computer is off: only the server and the phone */
  const page = await call(store, { method: "GET", path: "/autopilot" }); assert.match(page.html, /<script src="\/autopilot\/page\.js"><\/script>/); assert.doesNotMatch(page.html, /<script>/, "no inline script (the site's CSP)");
  assert.match(PHONE_JS, /location\.hash/); assert.match(PHONE_JS, /history\.replaceState/); assert.match(PHONE_JS, /method:"POST"/); assert.doesNotMatch(PHONE_JS, /\?t=|&t=" ?\+/, "the secret never goes into a URL");
  assert.equal((await call(store, { method: "POST", path: "/autopilot/view", raw: j({ k: key, t: "wrong-token-xxxxxxxxxxxxxxxx" }) })).status, 403);
  const v = await call(store, { method: "POST", path: "/autopilot/view", raw: j({ k: key, t }) }); assert.equal(v.json.mode, "autopilot");
  const off = await call(store, { method: "POST", path: "/autopilot/off", raw: j({ k: key, t }) }); assert.equal(off.json.mode, "review");
  assert.deepEqual((await call(store, { method: "GET", path: "/runner/autopilot/due", headers: { "x-autopilot-runner": env.AUTOPILOT_RUNNER_KEY } })).json.due, [], "OFF: the runner takes nothing");
  const L2 = await call(store, { method: "POST", path: "/v1/autopilot/almioet/phone", lic }); assert.equal((await call(store, { method: "POST", path: "/autopilot/view", raw: j({ k: key, t }) })).status, 403, "a new link replaces the old one"); assert.ok(L2.json.link);
  assert.equal((await call(store, { method: "GET", path: "/runner/autopilot/ping", headers: { "x-autopilot-runner": env.AUTOPILOT_RUNNER_KEY } })).json.ok, true); assert.equal((await call(store, { method: "GET", path: "/runner/autopilot/ping" })).status, 401);
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"); assert.match(main, /if \(info\.mode === "review" && st0\.mode === MODES\.AUTO && st0\.server\?\.on\)/, "the app follows when it next opens");
});

test("5 · B4 THE RUNNER'S MONEY: a cycle stopped mid-way (out of time) still hands back its ledger — what it spent reaches the client's one budget", async () => {
  const r = await runOne({ item: { product: "p" }, keys: {}, files: { "products/p/a.json": "{}" }, main: join(REPO, "test", "helpers", "stuck-app.mjs"), maxMs: 1500, pollMs: 200 });
  assert.equal(r.ok, false); assert.equal(r.cycle.stopped, true); assert.equal(JSON.parse(r.files["ai-usage.json"]).days["2026-11-08"].usd, 0.42, "the spend made before the stop is handed back");
  /* and runDue sends it to the server, as the next version, with the cycle that says it stopped */
  const store = apMemoryStore(), key = productKey("acct-1", "p"); await call(store, { method: "POST", path: "/v1/autopilot/p", lic, raw: j({ mode: "autopilot" }) });
  await call(store, { method: "POST", path: "/v1/autopilot/p/state", lic, query: new URLSearchParams({ version: "1", n: "0", of: "1" }), raw: chunksOf(encode({ "products/p/a.json": "{}" }))[0] });
  const srv = createServer((req, res) => { let b = []; req.on("data", (c) => b.push(c)); req.on("end", async () => { const u = new URL(req.url, "http://x"), o = await apHandle({ method: req.method, path: u.pathname, query: u.searchParams, raw: Buffer.concat(b), headers: req.headers, env, store, lic: null }); res.writeHead(o.status, { "content-type": o.bytes ? "application/octet-stream" : "application/json", ...(o.headers ?? {}) }); res.end(o.bytes ?? JSON.stringify(o.json)); }); });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  try {
    const out = await runDue({ server: `http://127.0.0.1:${srv.address().port}/`, runnerKey: env.AUTOPILOT_RUNNER_KEY, log: () => {}, main: join(REPO, "test", "helpers", "stuck-app.mjs"), maxMs: 1500, pollMs: 200 });
    assert.equal(out[0].ok, false); const row = await store.get(key); assert.equal(row.version, 2, "the stopped run's folder came back as version 2");
    const back = decode(await (async () => { const { open, sealKey } = await import("../site/autopilot-server.mjs"); return open(sealKey(env), await store.chunk(key, 2, 0)); })()); assert.equal(JSON.parse(back.files["ai-usage.json"]).days["2026-11-08"].usd, 0.42);
    assert.equal(row.lease_until, null, "the lease is given back");
    const refused = await runDue({ server: `http://127.0.0.1:${srv.address().port}/`, runnerKey: "x".repeat(32), log: () => {} }); assert.deepEqual(refused, [{ ok: false, refused: true }], "a wrong runner key is said, not hidden");
  } finally { srv.close(); }
});
