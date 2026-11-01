/**
 * 🔴 RR-357 (owner's real run on 1.15.9) — 1.15.10:
 *   1 Search results data, ONE place: plain steps, the client's own DataForSEO login and password (Windows' secure store), "Test the
 *     connection" (one search, its cost), the switch, the caps (a day never more than $1), the spend — and no second copy anywhere
 *   2 one picture of what can cost money   3 navigation on "Your products"   4 never two products for one website
 *   5 the cards' real counts   6 the article follows the client's choice (R1), saved the moment it is picked   7 Settings shows saved answers
 *   8 a score only tied to its sub-test, a state board said as one
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { destOf, todayNotice } from "../desktop/article-dest.mjs";
import { scoresTied, placeOf, professionQuestions, searchMissing } from "../desktop/research.mjs";
import { cardOf } from "../desktop/exam-plan.mjs";
import { subtestResults } from "../desktop/official.mjs";
import { plainWhy } from "../desktop/plain-words.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
const ANSWER = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: "organic", url: "https://a.example/x", title: "A result", description: "…" }, { type: "people_also_ask", items: [{ title: "A question?" }] }] }] }] };

async function app() {
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr357-app-")), st = productStore(dir);
  st.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  const a = st.create({ name: "Fixture", site: "https://fixture.invalid" }); const s1 = st.read(a.id); s1.started = true; s1.created = "2026-10-01T00:00:00Z"; st.write(a.id, s1);
  /* a second product for the SAME website, made before this rule (as the owner's "almioet-2") */
  const b = st.create({ name: "Fixture copy", site: "https://www.fixture.invalid/" }); const s2 = st.read(b.id); s2.created = "2026-10-02T00:00:00Z"; st.write(b.id, s2);
  writeFileSync(join(dir, "products", a.id, "pages.json"), JSON.stringify({ drafts: [{ url: "u1", title: "One", readyAsDraft: true }, { url: "u2", title: "Two", readyAsDraft: false }, { url: "u3", title: "Three", readyAsDraft: true }] }));
  writeFileSync(join(dir, "products", a.id, "published.json"), JSON.stringify([{ url: "u1", state: "LIVE", live: "https://fixture.invalid/one/" }]));
  writeFileSync(join(dir, "products", a.id, "articles.json"), JSON.stringify([{ url: "u3", title: "Three", day: "2026-11-01" }]));
  const serp = createServer((q, r) => { let t = ""; q.on("data", (c) => (t += c)); q.on("end", () => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify(ANSWER)); }); });
  await new Promise((res) => serp.listen(0, "127.0.0.1", res));
  const kp = generateKeyPairSync("ed25519"); writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  /* NO plan: the publish choice must still be saved (R1) */
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", serpTestUrl: `http://127.0.0.1:${serp.address().port}/`, tourSeen: true }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const call = async (u, o, method = "POST") => { const r = await fetch(root + u, method === "GET" ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(o) }); return { status: r.status, j: await r.json() }; };
  return { dir, ids: [a.id, b.id], call, stop: async () => { p.kill(); serp.close(); await new Promise((r) => setTimeout(r, 300)); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("RR-357 · 1 + 2 · Search results data in ONE place: the client's own login, a test search with its cost, the switch, a day never more than $1; what can cost money", async () => {
  const A = await app();
  try {
    const off = (await A.call("/api/search-data", null, "GET")).j;
    assert.deepEqual([off.on, off.capDay, off.keysSaved, off.spentToday], [false, 1, false, 0], "OFF by default, $1 a day");
    assert.match(off.howTo, /Dashboard → "API Access"/);
    assert.match((await A.call("/api/search-data", { on: true })).j.refused, /Save your DataForSEO API login and API password first/);
    assert.match((await A.call("/api/search-data/test", {})).j.refused, /Save your DataForSEO API login and API password first/);
    for (const [k, v] of [["DATAFORSEO_LOGIN", "client@example.test"], ["DATAFORSEO_PASSWORD", "fixture-pass"]]) assert.equal((await A.call(`/api/keys/${k}`, { key: v })).status, 200);
    const t = await A.call("/api/search-data/test", { keyword: "fixture" });
    assert.equal(t.j.ok, true, JSON.stringify(t.j)); assert.match(t.j.line, /^Connected ✓ — Google's results for "fixture" were read: 1 results, 1 "People also ask" questions\. This search cost \$0\.0020\.$/);
    assert.ok(!JSON.stringify(t.j).includes("fixture-pass") && !JSON.stringify(t.j).includes("client@example.test"), "the login is never shown");
    assert.equal(t.j.spentToday, 0.002);
    assert.match((await A.call("/api/search-data", { capDay: 5 })).j.refused, /never more than \$1 a day/);
    const on = (await A.call("/api/search-data", { on: true, capDay: 0.5, capMonth: 10 })).j;
    assert.deepEqual([on.on, on.capDay, on.capMonth], [true, 0.5, 10]);
    /* no second copy: the keyword screen's old switch points here */
    const second = await A.call(`/api/products/${A.ids[0]}/keywords/dfs`, { on: false }); assert.deepEqual([second.status, second.j.open], [409, "search-data"]);
    /* 2 · one picture of what can cost money */
    const sp = (await A.call("/api/spend", null, "GET")).j;
    assert.deepEqual(sp.rows.map((r) => r.what), ["Search results data (your own DataForSEO account)", "Your AI (your own key)"]);
    assert.match(sp.line, /^What can cost you money: Search results data \(your own DataForSEO account\) — on, cap \$0\.5 a day, \$10 a month, today \$0\.0020 · Your AI/);
  } finally { await A.stop(); }
  for (const s of ["dataforseo.com", "$1 free credit", "the smallest top-up is $50", "Test the connection", "Switch search results data on", "Spent today:", "What can cost you money", 'id="sdtab">Search results data</button>', 'id="sdset" type="button">Search results data (paid, your own DataForSEO account) →</button>', 'id="spendline"'])
    assert.ok(UI.includes(s), s);
  assert.ok(!UI.includes('id="serpon"') && !UI.includes('id="dfson"'), "ONE place only");
  /* found in the built app: the money had lost its $ sign — every amount on the screen carries it */
  for (const s of ["A search costs about <b>$${D.pricePerSearch}</b>", "(US$, at most $${D.maxDay})", "<b>Spent today:</b> $${D.spentToday.toFixed(4)}", "<b>this month:</b> $${D.spentMonth.toFixed(4)}"]) assert.ok(UI.includes(s), s);
});

test("RR-357 · 3 + 4 + 5 · navigation on Your products; never a second product for one website; the cards' real numbers", async () => {
  const A = await app();
  try {
    const h = (await A.call("/api/home", null, "GET")).j, first = h.products.find((p) => p.id === A.ids[0]), copy = h.products.find((p) => p.id === A.ids[1]);
    assert.deepEqual([first.pages, first.ready, first.published, first.articles], [3, 2, 1, 1], "made, ready, published, articles — from the product's own files");
    assert.deepEqual([first.sameSiteAs, copy.sameSiteAs], [null, "Fixture"], "the later copy is said, with the one to keep");
    const dup = await A.call("/api/products", { name: "Again", site: "https://fixture.invalid", goal: { grow: "website", hasWebsite: true }, saveAnyway: true, addAnyway: true });
    assert.deepEqual([dup.status, dup.j.duplicate?.name], [409, "Fixture"], "\"add anyway\" no longer adds a second one");
  } finally { await A.stop(); }
  assert.ok(UI.includes('<nav id="homenav" class="pact"><b>Go to:</b>') && UI.includes('id="navhelp"') && UI.includes('id="navupd"') && UI.includes('$("#navupd").onclick = () => checkUpdates(true);'));
  assert.ok(UI.includes("Pages: ${p.pages} made · ${p.ready ?? 0} ready · ${p.published ?? 0} published · Articles: ${p.articles}") && !UI.includes("Pages ${p.pages} · Articles ${p.articles}"));
  assert.ok(!UI.includes("Add a second one anyway"));
});

test("RR-357 · 6 + 7 · the article follows the client's choice (R1), saved when picked, even with no plan; Settings shows the saved answers", async () => {
  assert.equal(destOf({ go: "site-auto" }, "REVIEW_FIRST"), "site-approve", "a saved 'automatic' never outvotes Show me before publishing");
  assert.equal(destOf({ go: "site-approve" }, "AUTO_AFTER_GATES"), "site-auto");
  assert.equal(destOf({ go: "export" }, "AUTO_AFTER_GATES"), "export");
  assert.doesNotMatch(todayNotice({ go: destOf({ go: "site-auto" }, "REVIEW_FIRST"), today: { url: "u", title: "T" }, connected: true }).line, /published by itself/);
  const A = await app();
  try {
    const r = await A.call(`/api/products/${A.ids[0]}/setup`, { id: "publishMode", value: { mode: "REVIEW_FIRST" } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal((await A.call(`/api/products/${A.ids[0]}/state`, null, "GET")).j.setup.publishMode.mode, "REVIEW_FIRST");
    assert.equal((await A.call(`/api/products/${A.ids[0]}/setup`, { id: "languages", value: { codes: ["en"] } })).status, 403, "other steps still need the plan");
  } finally { await A.stop(); }
  assert.ok(UI.includes('document.querySelectorAll("#jobs input[name=appr]").forEach((r) => (r.onchange = async () => { const x = await post(`/api/products/${encodeURIComponent(P)}/setup`, { id: "publishMode"'));
  assert.ok(UI.includes("const savedAnswer = (id) =>") && UI.includes('choiceList("grow", S.choices.grow, savedAnswer("goal")?.grow, null)') && UI.includes("✓ Your saved answer is selected below — change it, or press Next."));
});

test("RR-357 · 8 · a score is shown only tied to its sub-test; a page that does not tie them shows no number, linked; a state board is said as one", async () => {
  assert.equal(scoresTied("Alabama Board of Nursing names OET on its own page among the English tests it accepts — the results it names with OET: 340, 320, 350, 360."), false);
  for (const t of ["NMC accepts OET: Listening B (350+), Reading B (350+), Writing C+ (300+), Speaking B (350+).", "minimum 350 in Reading, Listening and Speaking; minimum 300 in Writing", "1400 total with no element below 300", "minimum B in Listening, Reading, Writing and Speaking", "A or B in each of the four sub-tests"]) assert.equal(scoresTied(t), true, t);
  assert.deepEqual(subtestResults("We accept OET: a minimum of 350 in Listening, Reading and Speaking and 300 in Writing.", "OET"), ["Listening 350 · Reading 350 · Writing 300 · Speaking 350"]);
  assert.deepEqual(placeOf("United States", "Alabama Board of Nursing"), { part: "Alabama", label: "the United States — Alabama (state board)" });
  assert.equal(placeOf("Australia", "AHPRA").label, "Australia");
  const q = professionQuestions({ subject: "OET", prof: "nursing", destinations: [{ country: "United States", regulator: { name: "Alabama Board of Nursing", website: "https://abn.example" }, also: [] }] });
  assert.equal(q[0].question, "What OET score does a state board in the United States ask of nurses?", "one state is not the whole country");
  await searchMissing({ questions: q, subject: "OET", reader: { on: "2026-11-01" }, cache: { get: () => ({ on: "2026-11-01", ok: true, url: "https://abn.example/x", scores: { text: "Alabama Board of Nursing names OET on its own page among the English tests it accepts — the results it names with OET: 340, 320, 350, 360.", link: "https://abn.example/x", readOn: "2026-11-01" } }), set: () => {} }, budget: { left: 1 } });
  assert.equal(q[0].answer, null, "no number without its sub-test");
  assert.equal(q[0].partial.text, "In the United States — Alabama (state board): Alabama Board of Nursing names OET on its own page among the English tests it accepts; the page does not say which score is for which sub-test — see its page.");
  assert.ok(!/\b3[2-6]0\b/.test(q[0].partial.text) && q[0].partial.link === "https://abn.example/x");
  assert.equal(cardOf("Nursing Council of New Zealand accepts OET: minimum 350 in Reading, Listening and Speaking; minimum 300 in Writing.", "New Zealand"), "New Zealand — R/L/S 350 · W 300");
  assert.equal(cardOf("NMBI accepts OET (Nursing): Writing C+ (300), the other three B (350).", "Ireland"), "Ireland — Writing C+ (300) · others B (350)");
  /* the Pages screen names the open questions (found in the built app: it said "one of the five checks") */
  assert.equal(plainWhy({ readyAsDraft: false, gates: [{ gate: "H", words: "answers its whole intent", pass: false, failing: ["Open questions: What OET score does a state board in the United States ask of nurses?."] }] }), "Open questions: What OET score does a state board in the United States ask of nurses?.");
});
