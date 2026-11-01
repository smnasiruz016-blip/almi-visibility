/**
 * 🔴 RR-359 (the owner's FIRST real run with Google's results, 1 Nov 2026, on 1.15.11 — "88 searches, $0.4000") — 1.15.12:
 *   1 one product's subject and data never flow into another: "almiworld youtube" made OET pages (its subject was guessed from the first
 *     capital-letter word of its description; the keyword service was asked for OET into ITS database). Its own subject only; none → asked.
 *   2 G5's coverage list holds only the topic's real subtopics and questions — never menus, comments, forms, ads, brand claims, code,
 *     bare names or past years; same-meaning items merged; covered by meaning; the ⚠️ names at most a few, in plain words.
 *   3 G7: the GMC's own page states its OET grade ("at least a grade 'B' in each testing area") — it was refused (403) once, and the
 *     sentence was not read. A refused read is tried again; "a grade in each" is that grade for all four; the council's own page is found
 *     through Google's results when its addresses give no score.
 *   4 DataForSEO's "Internal SE Server Error": the search is tried again with a pause; a failed search is never booked as a cost.
 *   5 the real price per search (Quora was "site:quora.com …" — five times the price) in the estimate and in Test the connection.
 *   6 the API login is NOT the e-mail; the API password's 24 hours.
 *   7 Start here on the first screen; every screen says what it is for and offers its next step.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { productSubject } from "../desktop/action-plan.mjs";
import { ownDb, askedSubjectOf } from "../desktop/keyword-service.mjs";
import { cleanCoverage, recleanCoverage, coversByMeaning, junkWhy } from "../desktop/coverage.mjs";
import { COUNTRIES } from "../desktop/world.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { subtestResults, officialReader } from "../desktop/official.mjs";
import { readRegulator } from "../desktop/regulator-read.mjs";
import { searchMissing } from "../desktop/research.mjs";
import { searchGoogle, searchPages, realPrice, runEstimate, quoraSearch, tryAgain, plainSerpWhy } from "../desktop/serp.mjs";
import { HOWTO } from "../desktop/setup.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(REPO, p), "utf8");
const UI = read("desktop/ui.html"), MAIN = read("desktop/main.mjs");
const ON = "2026-11-01";
const ok = (items, cost = 0.002) => ({ status_code: 20000, tasks: [{ status_code: 20000, cost, result: [{ items }] }] });
const INTERNAL = { status_code: 20000, tasks: [{ status_code: 40101, status_message: "Internal SE Server Error.", cost: 0.002 }] }; // the owner's ledger: 14 of these
const answer = (j) => ({ json: async () => j });

test("RR-359 · 1 · a product's OWN subject — never guessed from a list of other products, never \"OET\" by default; another subject's data set aside", async () => {
  /* the owner's two products, as his state.json has them */
  const youtube = { product: { name: "almiworld youtube", site: "https://almiworld.com/" }, setup: { product: { name: "almiworld youtube", site: "https://almiworld.com/", what: "AlmiWorld (almiworld.com) — a family of online products for people preparing for language exams and careers abroad: OET, IELTS, PTE, TOEFL, CELPIP, DET and national language tests, plus AlmiCV (CV builder) and AlmiStudy." } } };
  const oet = { product: { name: "AlmiOET", site: "https://almioet.almiworld.com" }, setup: { product: { name: "AlmiOET", what: "AI-powered OET preparation for all 12 healthcare professions: Reading, Listening, Writing and Speaking practice." } } };
  assert.equal(productSubject(youtube), null, "almiworld youtube has no subject of its own — it is asked, never \"OET\"");
  assert.equal(productSubject(oet), "OET", "AlmiOET's own name and address carry OET");
  assert.equal(productSubject({ ...youtube, setup: { product: { ...youtube.setup.product, subject: "AlmiWorld tutorials" } } }), "AlmiWorld tutorials", "the subject the client set wins");
  assert.equal(productSubject({ product: { name: "Smile Dental" }, setup: { product: { what: "A dental clinic in Leeds" } } }), "Smile Dental", "a name written as a name is its own subject");
  /* the keyword database: another subject's answers are not this product's */
  const db = { v: 1, files: { a: { name: 'AlmiWorld keyword service — "OET", All locations', source: "svc" }, b: { name: "keyword-planner-mine.csv", source: "file" } }, keywords: { oet: { text: "oet", files: ["a"], now: {} }, "youtube tutorials": { text: "youtube tutorials", files: ["b"], now: {} }, both: { text: "both", files: ["a", "b"], now: {} } } };
  assert.equal(askedSubjectOf(db.files.a), "OET");
  const mine = ownDb(db, "AlmiWorld tutorials");
  assert.deepEqual(Object.keys(mine.keywords).sort(), ["both", "youtube tutorials"], "the OET-only keyword is set aside");
  assert.deepEqual(mine.setAside, { files: 1, keywords: 1, subjects: ["OET"] });
  assert.equal(ownDb(db, "OET"), db, "AlmiOET keeps all of its own");
  /* no "OET" default anywhere in the app's code */
  for (const f of readdirSync(join(REPO, "desktop")).filter((n) => n.endsWith(".mjs"))) assert.doesNotMatch(read(`desktop/${f}`), /subject = "OET"|\?\? "OET"/, f);
  assert.doesNotMatch(UI, /\?\? "OET"/, "the page-count screen");
  /* THE APP: the owner's case — a product with no subject of its own holding OET drafts, an OET plan and OET keywords */
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr359-subject-")), st = productStore(dir);
  st.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  const a = st.create({ name: "almiworld youtube", site: "https://fixture.invalid" }); const s1 = st.read(a.id); s1.started = true;
  s1.setup.product = { name: "almiworld youtube", site: "https://fixture.invalid", what: youtube.setup.product.what, cta: { label: "Try it free", href: "https://fixture.invalid/signup" } }; st.write(a.id, s1);
  const pd = join(dir, "products", a.id);
  writeFileSync(join(pd, "pages.json"), JSON.stringify({ drafts: [{ url: "https://fixture.invalid/oet-for-doctors", title: "OET for Doctors", readyAsDraft: false }] /* as the owner's file: no subject, no exam-plan mark */ }));
  writeFileSync(join(pd, "auto-plan.json"), JSON.stringify({ on: "2026-11-01T05:27:38Z", pages: [{ kind: "profession", title: "OET for Doctors", questions: [] }] }));
  writeFileSync(join(pd, "keyword-db.json"), JSON.stringify(db));
  writeFileSync(join(pd, "check.json"), JSON.stringify({ on: `${ON}T05:05:00Z`, score: 50, areas: [], pagesRead: 1 }));
  writeFileSync(join(pd, "site-read.json"), JSON.stringify({ ok: true, origin: "https://fixture.invalid", on: `${ON}T05:05:00Z`, pages: [{ url: "https://fixture.invalid/", title: "Fixture", h1: "Fixture", h2: [], qa: [], facts: ["Fixture tutorials for every product."], lead: [], prices: [], text: "Fixture tutorials" }], shell: { header: "<header data-site-shell>x</header>", footer: "<footer data-site-shell>x</footer>", style: "<link data-site-style>" } }));
  const kp = generateKeyPairSync("ed25519"); writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", tourSeen: true, testOffline: true, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }) }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const call = async (u, o) => { const r = await fetch(root + u, o ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) } : {}); return { ...(await r.json()), http: r.status }; };
    const ov = await call(`/api/products/${a.id}/overview`);
    assert.equal(ov.subject, null, JSON.stringify(ov).slice(0, 600)); assert.match(ov.noSubject, /^First, say what this product is about/);
    assert.match(ov.setAside?.line ?? "", /^Set aside: 1 page drafts and a plan of 1 pages made earlier for "another subject"/, "the OET drafts and plan are not this product's");
    assert.ok(!existsSync(join(pd, "pages.json")) && !existsSync(join(pd, "auto-plan.json")), "moved aside");
    assert.ok(readdirSync(pd).some((n) => /^pages-set-aside-\d{4}-\d{2}-\d{2}T[\d-]+\.json$/.test(n)) && readdirSync(pd).some((n) => /^auto-plan-set-aside-/.test(n)), "never deleted");
    assert.match(ov.setAside.line, /Nothing was deleted: they are in the product's folder \(pages-set-aside-[\dT-]+\.json, auto-plan-set-aside-[\dT-]+\.json\)\./);
    const run = await call(`/api/products/${a.id}/jobs`, { jobs: ["create-pages"] });
    assert.deepEqual([run.http, run.needsSubject, run.needsCta], [400, true, false], JSON.stringify(run)); assert.match(run.refused, /^First, say what this product is about/);
    const kw = await call(`/api/products/${a.id}/feature/keywords`, {});
    const phrases = (kw.found?.phrases ?? []).map((x) => x.text);
    assert.ok(phrases.includes("youtube tutorials") && phrases.includes("both"), JSON.stringify(kw).slice(0, 400)); // its own keywords are read
    assert.ok(!phrases.includes("oet"), "the OET keyword asked for another subject is not this product's");
    /* the subject set in Settings → Your product */
    const set = await call(`/api/products/${a.id}/setup`, { id: "product", value: { name: "almiworld youtube", site: "https://fixture.invalid", what: youtube.setup.product.what, subject: "AlmiWorld tutorials" } });
    assert.equal(set.http, 200, JSON.stringify(set));
    const ov2 = await call(`/api/products/${a.id}/overview`);
    assert.deepEqual([ov2.subject, ov2.noSubject], ["AlmiWorld tutorials", null]);
    assert.equal(st.read(a.id).setup.product.cta?.label, "Try it free", "the offer button kept");
    const long = await call(`/api/products/${a.id}/setup`, { id: "product", value: { name: "almiworld youtube", site: "https://fixture.invalid", what: "x", subject: "A long sentence about what this product does for people." } });
    assert.equal(long.http, 400, "a subject is a short name");
  } finally { p.kill(); await new Promise((r) => setTimeout(r, 300)); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  /* the screens: the field, the ask, the set-aside line */
  assert.ok(UI.includes('<input id=f7 maxlength=40 placeholder="for example: OET" value="${esc(S.setup.product?.subject ?? "")}">') && UI.includes('...($("#f7") ? { subject: $("#f7").value } : {})'));
  assert.ok(UI.includes("if (r.needsSubject) return ($(\"#jobrep\").innerHTML") && UI.includes('<div class="warn" id="nosubject">') && UI.includes('<div class="warn" id="setaside">'));
});

test("RR-359 · 2 · G5's coverage list holds ONLY the topic's real subtopics and questions; covered by meaning; the ⚠️ names a few, in plain words", () => {
  const title = "OET in Pakistan: fee, centres and councils", now = `${ON}T12:00:00Z`;
  /* the owner's run: realistic top pages full of menus, comments, forms and ads */
  const junk = ["Home", "Menu", "Thank you!", "Leave a Reply Cancel reply", "Recent Posts", "Priya Sharma says:", "March 3, 2024 at 10:15 am", "25% OFF on OET coaching", "OET Score Guarantee", "' + escapeHtml(title) + '", "Which Degree do you wish to pursue?", "Brooklyn Review is the best online OET coaching in India", "Pakistan", "Lahore", "OET on Paper Dates 2024", "Contact Us", "Quick Links"];
  const results = [
    { url: "https://coach-a.example/oet-pakistan", headings: [...junk, "OET fees in Pakistan", "How to book OET in Pakistan", "OET test centres in Pakistan", "Performance of our students"] },
    { url: "https://blog-b.example/oet", headings: [...junk, "OET Fee in Pakistan (2026)", "Booking the OET", "Test centres in Pakistan", "Which council registers nurses in Pakistan?"] },
    { url: "https://coach-a.example/other", headings: ["Our toppers", "OET fees"] }];
  const dropped = [];
  const cov = cleanCoverage({ results, paa: ["How much is the OET price?", "When can I book an OET test in 2026?"], title, now, names: COUNTRIES, dropped });
  const topics = cov.map((c) => c.topic);
  for (const j of junk) assert.ok(!topics.some((t) => t.toLowerCase() === j.replace(/[:!]$/, "").toLowerCase()), `junk kept: ${j}`);
  assert.deepEqual(topics, ["How much is the OET price?", "When can I book an OET test in 2026?", "OET test centres in Pakistan", "Which council registers nurses in Pakistan?"], JSON.stringify(cov));
  assert.ok(!topics.includes("Performance of our students"), "one site's own heading is no subtopic");
  assert.deepEqual(cov.map((c) => c.from), ["people also ask", "people also ask", "2 top results", "a reader's question"]);
  /* each junk heading has its reason */
  const why = (t) => junkWhy(t, { now, names: COUNTRIES });
  assert.deepEqual([why("Leave a Reply Cancel reply"), why("Priya Sharma says:"), why("25% OFF on OET coaching"), why("Brooklyn Review is the best online OET coaching in India"), why("' + escapeHtml(title) + '"), why("Which Degree do you wish to pursue?"), why("Lahore"), why("OET on Paper Dates 2024")],
    ["navigation, a footer or a comment box", "a comment, an author or a date line", "an ad, a price or an offer", "a brand's claim about itself", "a piece of the page's code", "a form field", "a bare name, not a subtopic", "dated in a past year"]);
  assert.equal(why("OET test dates in 2026"), null, "this year is not stale");
  /* the walk on the owner's data: Google's own "People also ask" held a brand's praise and a contact box */
  assert.deepEqual([why("Why is Brooklyn Review the top online OET Coaching institute in India?"), why("Need help with?"), why("Top tips for OET Writing")], ["a brand's claim about itself", "navigation, a footer or a comment box", null]);
  /* "covered" by meaning: fees = cost = price, register = book, centres = venue */
  assert.equal(coversByMeaning("The OET fee in Pakistan is AUD 587, paid when you book.", "How much is the OET price?", { title }), true);
  assert.equal(coversByMeaning("You can sit OET at a venue in Lahore or Karachi.", "OET test centres in Pakistan", { title }), true);
  assert.equal(coversByMeaning("The OET fee in Pakistan is AUD 587.", "Which council registers nurses in Pakistan?", { title }), false);
  /* a list kept by the owner's run (before RR-359) is cleaned again at the check — his "OET in Pakistan" list, 18 items → 5 */
  const before = ["What is the OET Exam?", "OET on Paper Dates 2024", "OET on Computer Test Dates 2024", "How to Register for the OET Exam?", "Exam Pattern:", "Eligibility Criteria:", "Fees:", "Test duration:", "OET Scores:", "Performance of Indian Students in the OET Exam:", "OET Test Preparation Tips", "Which Countries Accept the OET Exam:", "Recent Posts", "Leave a Reply Cancel reply"].map((t) => ({ topic: t, seenOn: 1, urls: ["https://edulaunchers.com/blogs/oet-exam/"] }));
  const paa = ["How much is the OET price?", "Is OET difficult than IELTS?", "How long does it take to get OET results?", "When can I book an OET Test in 2026?"].map((t) => ({ topic: t, urls: [], paa: true }));
  assert.deepEqual(recleanCoverage([...before, ...paa], { title, now, names: COUNTRIES }).map((c) => c.topic), ["How much is the OET price?", "When can I book an OET Test in 2026?", "Is OET difficult than IELTS?", "How long does it take to get OET results?", "Which Countries Accept the OET Exam"]);
  /* THE CHECK: a draft's ⚠️ never names junk — at most 5 real subtopics, in plain words */
  const pg = (path, fact) => ({ url: `https://prep.example${path}`, title: "Prep", h1: "Prep", h2: [], qa: [], facts: [fact], lead: [], prices: [] });
  const site = { ok: true, origin: "https://prep.example", readOn: ON, robotsTxt: null, sitemapUrls: null, shell: { from: "https://prep.example", head: "<style>x</style>", header: "<header>h</header>", footer: "<footer>f</footer>" }, pages: [pg("/", "The OET takes about three hours."), pg("/oet", "The OET takes about three hours, in one sitting.")] };
  const plan = [{ kind: "topic", title: "How long does OET take", items: [{ part: "topic", question: "How long does OET take?", claims: [{ claimId: "c1", text: "The OET takes about three hours.", link: "https://prep.example/oet", readOn: ON, source: "prep.example", official: true }] }],
    coverage: [...junk.map((t) => ({ topic: t, seenOn: 2, urls: ["https://a.example/1", "https://b.example/2"] })), { topic: "OET results time", seenOn: 2, urls: ["https://a.example/1", "https://b.example/2"] }], second: [{ question: "How long are OET results valid?", why: "people also ask it, and the best result does not answer it" }] }];
  const d = seoPages({ site, on: `${ON}T10:00:00Z`, pagePlan: plan, max: 1 }).drafts[0], H = d.gates.find((g) => g.gate === "H");
  const line = H.failing.find((x) => x.startsWith("Not covered yet")) ?? "";
  assert.match(line, /^Not covered yet — what readers also look for: /);
  for (const j of junk) assert.ok(!line.includes(j), `the ⚠️ names junk: ${j} — ${line}`);
  assert.ok(line.split(";").length <= 5, line);
});

test("RR-359 · 3 · G7: a council's own page answers its score — a refused read tried again, \"a grade in each\" read as all four, the page found through Google's results", async () => {
  /* the shape of the GMC's own sentence (own words): one grade for EACH testing area */
  const raw = "We accept OET for doctors. Your certificate must show that you reached at least a grade &lsquo;B&rsquo; in each testing area (speaking, listening, reading and writing) at one sitting.", text = raw.replace(/&lsquo;|&rsquo;/g, "'");
  assert.deepEqual(subtestResults(text, "OET"), ["Listening B · Reading B · Writing B · Speaking B"]);
  assert.deepEqual(subtestResults("OET is accepted with a score of 350 or above in each sub-test.", "OET"), ["Listening 350 · Reading 350 · Writing 350 · Speaking 350"]);
  /* the council's site refuses a read now and then (the GMC's security check) — tried again, the SAME reader name */
  let hits = 0; const uas = new Set();
  const PAGE = `<html><head><title>Using your OET certificate</title></head><body><main><h1>Using your OET certificate</h1><p>${raw}</p></main></body></html>`; // as the page writes it: &lsquo;B&rsquo;
  const srv = createServer((q, r) => { uas.add(q.headers["user-agent"]); if (q.url === "/robots.txt") { r.writeHead(403); return r.end(); }
    if (q.url === "/oet-page") { hits++; if (hits === 1) { r.writeHead(403, { "content-type": "text/html" }); return r.end("<title>Security Check</title>"); } r.writeHead(200, { "content-type": "text/html" }); return r.end(PAGE); }
    r.writeHead(403, { "content-type": "text/html" }); r.end("<title>Security Check</title>"); });
  await new Promise((res) => srv.listen(0, "127.0.0.1", res));
  const o = `http://127.0.0.1:${srv.address().port}`, rd = () => officialReader({ allowLocal: true, on: ON, paceMs: 0 });
  try {
    const page = { body: "General Medical Council", listId: "gmc", grade: { listening: "B", reading: "B", writing: "B", speaking: "B" }, record: { officialUrl: `${o}/oet-page` }, website: `${o}/` };
    const r = await readRegulator({ page, subject: "OET", reader: rd() });
    assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(hits, 2, "read again after the 403");
    assert.equal(r.claims.find((c) => c.fact === "scores")?.text, "General Medical Council names OET on its own page among the English tests it accepts — Listening B · Reading B · Writing B · Speaking B.");
    assert.equal(uas.size, 1, "the same reader name every time — never around the check");
    /* its own addresses give no score → its own page found through Google's results (another site's page is never read) */
    hits = 1; // the page now answers at once
    const q = { kind: "score", country: "United Kingdom", question: "What OET score does GMC in the United Kingdom ask of doctors?", answer: null, partial: null, how: null, searched: [], also: [], regulator: { name: "General Medical Council", short: "GMC", record: { officialUrl: `${o}/blocked` }, website: `${o}/` } };
    const cache = new Map(), asked = [];
    await searchMissing({ questions: [q], subject: "OET", reader: rd(), cache: { get: (u) => cache.get(u) ?? null, set: (u, v) => cache.set(u, v) }, budget: { left: 6 }, now: `${ON}T12:00:00Z`, findPages: async (b) => { asked.push(b.short); return ["https://copy-site.example/gmc-oet", `${o}/oet-page`]; } });
    assert.deepEqual(asked, ["GMC"]);
    assert.ok(q.answer, JSON.stringify(q.searched)); assert.match(q.answer[0].text, /Listening B · Reading B · Writing B · Speaking B/);
    assert.equal(q.how, "read on General Medical Council's own page (found through Google's results)");
    assert.ok(!q.searched.some((x) => /copy-site/.test(x.url ?? "")), "another site's copy is never read");
    /* the owner's research-reads.json keeps the GMC's 403 of his run (no hour) — read again now, never kept as a failure for 30 days */
    const q2 = { kind: "score", country: "United Kingdom", question: "What OET score does GMC in the United Kingdom ask of doctors?", answer: null, partial: null, how: null, searched: [], also: [], regulator: { name: "General Medical Council", short: "GMC", record: { officialUrl: `${o}/oet-page` }, website: `${o}/` } };
    const kept = new Map([[`${o}/oet-page`, { on: ON, ok: false, url: `${o}/oet-page`, why: "the page answered 403", scores: null }]]);
    await searchMissing({ questions: [q2], subject: "OET", reader: rd(), cache: { get: (u) => kept.get(u) ?? null, set: (u, v) => kept.set(u, v) }, budget: { left: 6 }, now: `${ON}T12:00:00Z` });
    assert.equal(q2.how, "read on General Medical Council's own page", JSON.stringify(q2.searched));
    /* the app hands Google's results to it with the client's switch on */
    assert.ok(MAIN.includes("for (const prof of Object.keys(out)) await searchMissing({ questions: out[prof], subject, reader: rd ?? { on: new Date().toISOString().slice(0, 10) }, cache, budget, findPages })"));
  } finally { srv.close(); }
});

test("RR-359 · 4 · DataForSEO's server error: tried again with a pause; a failed search is never booked as a cost", async () => {
  const seq = [INTERNAL, INTERNAL, ok([{ type: "organic", url: "https://a.example/1", title: "OET for doctors" }])], pauses = [];
  const ledger = { spent: [] };
  const r = await searchGoogle({ keyword: "OET for Podiatrists", settings: { on: true }, ledger, login: "l", password: "p", fetchImpl: async () => answer(seq.shift()), sleep: async (ms) => pauses.push(ms), retry: { times: 2, pauseMs: 1000 } });
  assert.equal(r.ok, true); assert.equal(r.tries, 3);
  assert.deepEqual(pauses, [1000, 2000], "a pause that grows");
  assert.deepEqual(ledger.spent.map((x) => [x.ok, x.cost, x.code ?? null]), [[false, 0, 40101], [false, 0, 40101], [true, 0.002, null]], "every search sent is in the ledger; a failed one costs $0");
  /* still failing after the tries: said, and nothing charged */
  const l2 = { spent: [] };
  const r2 = await searchGoogle({ keyword: "site:quora.com OET", settings: { on: true }, ledger: l2, login: "l", password: "p", fetchImpl: async () => answer(INTERNAL), sleep: async () => {}, retry: { times: 2, pauseMs: 0 } });
  assert.equal(r2.ok, false); assert.match(r2.why, /Internal SE Server Error.*Tried 3 times, with a pause; nothing was charged\./);
  assert.equal(l2.spent.reduce((t, x) => t + x.cost, 0), 0);
  /* a refusal of the login is never tried again */
  const l3 = { spent: [] }; let n = 0;
  await searchGoogle({ keyword: "x", settings: { on: true }, ledger: l3, login: "l", password: "p", fetchImpl: async () => { n++; return answer({ status_code: 40100, status_message: "You are not authorized" }); }, sleep: async () => {} });
  assert.equal(n, 1); assert.equal(tryAgain({ ok: false, code: 40100, stop: true }), false);
  /* the run's line says it */
  const asked = []; const pages = [{ title: "OET for Podiatrists" }];
  const seq2 = [INTERNAL, ok([{ type: "organic", url: "https://a.example/1", title: "t" }]), ok([]), ok([])];
  const out = await searchPages({ pages, ledger: { spent: [] }, settings: { on: true }, login: "l", password: "p", now: `${ON}T05:09:49Z`, fetchImpl: async (u, init) => { asked.push(JSON.parse(init.body)[0].keyword); return answer(seq2.shift()); }, sleep: async () => {}, retry: { times: 2, pauseMs: 0 } });
  assert.equal(out.read, 1); assert.match(out.line, / 1 tried again after DataForSEO failed; 1 failed search charged nothing\./);
  assert.equal(out.cost, 0.006);
});

test("RR-359 · 5 · the REAL price per search in the estimate and in Test the connection; Quora without a search operator", async () => {
  assert.equal(quoraSearch("OET for Nurses"), "OET for Nurses quora", "no site: operator — DataForSEO charges 5× for one");
  /* the owner's ledger: plain searches at $0.002, his "site:quora.com" ones at $0.01 */
  const ledger = { spent: [...Array(5)].map((_, i) => ({ on: `${ON}T05:09:49Z`, cost: 0.002, q: `t${i}`, ok: true })).concat([{ on: `${ON}T05:09:49Z`, cost: 0.01, q: "site:quora.com t", ok: true }, { on: `${ON}T05:09:49Z`, cost: 0, q: "t", ok: false, code: 40101 }]), serpCache: { "OET for Nurses||": { ok: true } } };
  const pr = realPrice(ledger);
  assert.deepEqual([pr.price, pr.from], [0.002, "what DataForSEO charged you (your last 5 searches)"]);
  assert.equal(realPrice({ spent: [] }).from, "DataForSEO's list price (no search of yours yet)");
  const e = runEstimate({ titles: ["OET for Nurses", "OET for Doctors"], ledger, price: pr.price });
  assert.deepEqual([e.searches, e.cached], [5, 1]);
  assert.equal(e.line, "One run for 2 pages: 5 searches × $0.0020 ≈ $0.01 (1 already kept — free). A search DataForSEO fails is tried again and costs nothing.");
  /* the run asks Quora without the operator */
  const asked = [];
  await searchPages({ pages: [{ title: "OET for Nurses" }], ledger: { spent: [] }, settings: { on: true }, login: "l", password: "p", fetchImpl: async (u, init) => { asked.push(JSON.parse(init.body)[0].keyword); return answer(ok([{ type: "organic", url: "https://a.example/1", title: "t" }])); } });
  assert.deepEqual(asked, ["OET for Nurses", "OET for Nurses reddit", "OET for Nurses quora"]);
  /* the screens */
  assert.ok(UI.includes('<li id="sdprice">A search costs <b>$${Number(D.pricePerSearch).toFixed(4)}</b> — ${esc(D.priceFrom ?? "DataForSEO\'s list price")}.</li>${D.estimate?.line ? `<li id="sdestimate">${esc(D.estimate.line)}</li>` : ""}'));
  assert.ok(UI.includes("const D = await get(`/api/search-data${P ? `?product=${encodeURIComponent(P)}` : \"\"}`)"));
  assert.ok(MAIN.includes("The real price per search: $${realPrice(ledger).price.toFixed(4)} — ${realPrice(ledger).from}."));
});

test("RR-359 · 6 + 7 · the API login is not the e-mail; Start here; every screen says what it is for and offers its next step", () => {
  assert.match(HOWTO.dataForSeo, /app\.dataforseo\.com\/api-access/); assert.match(HOWTO.dataForSeo, /it is not your sign-in e-mail/);
  assert.match(HOWTO.dataForSeo, /for 24 hours after you register; after that it is sent to you by e-mail, or you reset it on that same page/);
  assert.doesNotMatch(HOWTO.dataForSeo, /is the e-mail of your DataForSEO account/);
  assert.ok(!UI.includes("(the account's e-mail)"), "the old label");
  assert.ok(UI.includes('"DataForSEO login for apps — copy it from app.dataforseo.com/api-access (it is not your sign-in e-mail)"'));
  assert.match(plainSerpWhy(40100, "x"), /copy the "API login" shown there \(not your sign-in e-mail\)/);
  /* Start here: the six steps, the first one a button */
  const steps = /const START_STEPS = (\[.*\]);\n/.exec(UI)?.[1]; assert.ok(steps);
  assert.deepEqual(JSON.parse(steps).map((x) => x[0]), ["Open your product", "Overview", "Tick what you want", "Choose", "Press Start", "Pages and articles"]);
  assert.ok(UI.includes("${nav}${startHereHtml(H)}<div class=\"card company\">") && UI.includes('id="startopen"'));
  /* every screen: its line at the top and its next step at the bottom */
  const guide = UI.slice(UI.indexOf("const SCREEN_GUIDE = {"), UI.indexOf("function guideBars("));
  const screens = [...new Set([...UI.matchAll(/here\("([a-zA-Z]+)"/g)].map((m) => m[1]))].filter((n) => n !== "work");
  assert.ok(screens.length >= 17, String(screens));
  for (const n of screens) assert.match(guide, new RegExp(`\\b${n}: \\{ line: "`), `screen ${n} says what it is for`);
  const tabs = [...UI.slice(UI.indexOf("const TABS = {"), UI.indexOf("};", UI.indexOf("const TABS = {"))).matchAll(/^\s+"?([A-Z][A-Za-z ]+)"?: "/gm)].map((m) => m[1]);
  assert.deepEqual(tabs, ["Overview", "Pages and articles", "Approvals", "YouTube", "Monthly report"]);
  for (const t of tabs) assert.ok(guide.includes(`"work:${t}": { line: "`), `tab ${t}`);
  assert.ok(UI.includes('<div id="nextbar" class="nextbar"></div>') && UI.includes("guideBars(name, args); // RR-359"));
  assert.ok(UI.includes('nb.innerHTML = next ? `<p><button type="button" class="ghost" id="nextstep">${esc(next.label)}</button></p>` : "";'));
});
