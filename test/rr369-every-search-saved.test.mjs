/**
 * 🔴 RR-369 · every bought result reaches AlmiSEO Data (the real route, the real handler, the real store contract); nothing is bought twice; pages first; the facts and wordings of 3 Nov.
 * The money rule's cause is pinned as measured: the owner's four batches of 139,633 / 134,925 / 139,488 / 10,558 bytes against the route's 64,000.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateKeyPairSync, sign } from "node:crypto";
import { batches, listBatches, unsaved, uploadBought, askServerFirst, sendLists, savedCounts, emptySaved, UPLOAD } from "../desktop/search-store.mjs";
import { almiSeoClient, searchCounts } from "../desktop/almiseo.mjs";
import { licenceBytes, OWNER } from "../desktop/licence.mjs";
import { LICENCE_HEADER } from "../desktop/keyword-service.mjs";
import { createApp } from "../site/app.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { saveBought, heldBought, BOUGHT, allTopics, ENV_NAMES } from "../site/almiseo.mjs";
import { runTopPages } from "../site/top-pages.mjs";
import { queueSearches, searchGoogle, searchPages, serpKey, autoKey, serpTask } from "../desktop/serp.mjs";
import { correctedCouncils, councilFacts, officesThatAsk, asksLine, COUNCIL_CORRECTIONS } from "../desktop/council-truth.mjs";
import { partsMissing, offTopic } from "../desktop/page-quality.mjs";
import { applyPairQuestions, usableFacts, examPlan } from "../desktop/exam-plan.mjs";
import { Readable } from "node:stream";

const NOW = "2026-11-03T20:00:00.000Z", DAY = "2026-11-03", OWNER_LIC = { owner: true, account: "av_owner", plan: "owner" };
const answer = (n) => ({ ok: true, cost: 0.0006, at: NOW, results: Array.from({ length: 10 }, (_, i) => ({ url: `https://site${i}.example/${n}/${"x".repeat(60)}`, title: `Result ${i} of ${n}`, snippet: "s".repeat(170), rank: i + 1 })), paa: [`What is ${n}?`], related: [`${n} near me`] });
const manyAnswers = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [serpKey(`OET search ${i}`), answer(i)]));
const world = async () => { const seo = seoMemoryStore(); return { seo, topic: (await allTopics({ seo })).find((t) => t.id === "oet") }; };

/* a client on the real handler's own saveBought/heldBought, with the size limit the real route has */
const localClient = (seo, { lic = OWNER_LIC, down = false, oldServer = false } = {}) => ({
  sent: [],
  async saveBought(b) { this.sent.push(JSON.stringify(b).length); if (down) throw new Error("no"); if (oldServer) return { ok: false, status: 404, why: "AlmiSEO Data answered 404." }; if (JSON.stringify(b).length > BOUGHT.maxBody) return { ok: false, status: 413, why: "AlmiSEO Data answered 413." }; return saveBought({ seo, ...b, lic, at: NOW }); },
  async heldBought(b) { if (down) throw new Error("no"); if (oldServer) return { ok: false, status: 404 }; return heldBought({ seo, ...b, lic, at: NOW }); },
});

test("THE CAUSE: a batch is cut by its bytes, under the limit of the route it goes to; 50 lists of the owner's size no longer pass 64,000", () => {
  const list = (i) => ({ intent: `OET for page ${i}`, on: DAY, read: [], paa: [], related: [], coverage: Array.from({ length: 12 }, (_, k) => `topic ${k} ${"y".repeat(200)}`), second: [], blueprint: null });
  const lists = Array.from({ length: 156 }, (_, i) => list(i)), cut = listBatches(lists);
  assert.ok(cut.length >= 4, "more batches than the old four"); for (const b of cut) assert.ok(Buffer.byteLength(JSON.stringify({ subject: "OET", lists: b })) < 64000, "each under the route's 64,000");
  assert.equal(cut.flat().length, 156, "none dropped");
  const app = readFileSync(new URL("../site/app.mjs", import.meta.url), "utf8"); assert.match(app, /: 64000;/, "the limit this test is measured against still stands for the old route");
  const rows = Object.values(manyAnswers(900)); for (const b of batches(rows)) assert.ok(Buffer.byteLength(JSON.stringify(b)) <= UPLOAD.maxBytes);
  assert.ok(UPLOAD.maxBytes < BOUGHT.maxBody, "a batch stays under the new route's own limit");
});

test("EVERY KIND of bought result goes up: searches, Reddit, Quora, a council's, autocomplete, top pages; only as the server names it back is it saved; a second send sends nothing", async () => {
  const w = await world(), c = localClient(w.seo), saved = emptySaved();
  const ledger = { spent: [], serpCache: { ...manyAnswers(3), [serpKey("OET for Nurses reddit")]: answer("r"), [serpKey("OET for Nurses quora")]: answer("q"), [serpKey("dietitians registration council Pakistan")]: answer("c"), [autoKey("oet in", "Ghana")]: { ok: true, phrases: ["oet in ghana"], at: NOW }, [serpKey("no results")]: { ok: true, empty: true, results: [], paa: [], related: [], at: NOW } } };
  const tops = { "https://t.example/a": { on: DAY, headings: ["Fees", "Why?"], blocks: { tables: 1, words: 300, faqs: 1, via: "on-page" } }, "https://t.example/refused": { on: DAY, headings: null, blocks: null } };
  const r = await uploadBought({ client: c, ledger, tops, saved, subjectOf: () => "OET", now: NOW });
  assert.deepEqual([r.left, r.confirmed], [0, 10]); assert.equal(await w.seo.searchCount("oet"), 8); assert.equal(await w.seo.pageCount(), 2);
  const held = await w.seo.searches("oet", [autoKey("oet in", "Ghana"), serpKey("no results"), serpKey("OET for Nurses reddit")]); assert.equal(held.length, 3);
  assert.deepEqual(held.find((x) => x.kind === "auto").data.phrases, ["oet in ghana"]); assert.equal(held.find((x) => x.key === serpKey("no results")).data.empty, true);
  assert.equal(held.find((x) => x.key === serpKey("OET for Nurses reddit")).data.results[0].title, "Result 0 of r", "a title is kept: Reddit's and Quora's questions are read from it");
  assert.equal(JSON.stringify(held).includes("snippet"), false, "no snippet travels");
  const sent = c.sent.length, again = await uploadBought({ client: c, ledger, tops, saved, subjectOf: () => "OET", now: NOW }); assert.deepEqual([again.sent, c.sent.length], [0, sent], "bought once, sent once");
});

test("NEVER SILENTLY DROPPED: a server that is down, refuses, or names back only some: what it did not name stays and goes on the next try; the counts say so", async () => {
  const w = await world(), saved = emptySaved(), ledger = { spent: [], serpCache: manyAnswers(5) };
  const r1 = await uploadBought({ client: localClient(w.seo, { down: true }), ledger, saved, subjectOf: () => "OET", now: NOW });
  assert.equal(r1.left, 5); assert.equal(Object.keys(saved.searches).length, 0); assert.match(savedCounts({ ledger, saved }).line, /5 still to send \(the app keeps trying\)/); assert.equal(saved.lastOk, null);
  /* the server takes the small question and fails on the batch: it stays, and is counted as left */
  const failing = { saveBought: async (b) => (b.searches?.length ? { ok: false, status: 503, why: "busy" } : { ok: true, confirmed: [] }) }, rb = await uploadBought({ client: failing, ledger, saved, subjectOf: () => "OET", now: NOW }); assert.equal(rb.left, 5, "a failed batch is not forgotten"); assert.equal(rb.why, "busy");
  /* the server not updated yet */
  const r2 = await uploadBought({ client: localClient(w.seo, { oldServer: true }), ledger, saved, subjectOf: () => "OET", now: NOW }); assert.equal(r2.left, 5); assert.match(r2.why, /404/);
  /* names back only two */
  let first = true; const partial = { saveBought: async (b) => { if (!b.searches?.length) return { ok: true, confirmed: [] }; if (!first) return { ok: true, confirmed: b.searches.map((x) => x.key) }; first = false; return { ok: true, confirmed: b.searches.slice(0, 2).map((x) => x.key) }; } };
  const r3 = await uploadBought({ client: partial, ledger, saved, subjectOf: () => "OET", now: NOW }); assert.deepEqual([r3.confirmed, r3.left], [2, 3]); assert.equal(savedCounts({ ledger, saved }).searches, 2, "saved = named back");
  const r4 = await uploadBought({ client: partial, ledger, saved, subjectOf: () => "OET", now: NOW }); assert.deepEqual([r4.confirmed, r4.left], [3, 0]); assert.equal(savedCounts({ ledger, saved }).waiting, 0);
  /* a list that failed stays on disk */
  const box = { lists: { a: { intent: "a", on: DAY }, b: { intent: "b", on: DAY } } }; assert.equal((await sendLists({ client: { saveSearches: async () => ({ ok: false, why: "413" }) }, subject: "OET", outbox: box })).left, 2); assert.equal((await sendLists({ client: { saveSearches: async (x) => ({ ok: true, saved: x.lists.length, kept: 0 }) }, subject: "OET", outbox: box })).left, 0); assert.equal(box.done.a, DAY);
  assert.equal((await sendLists({ client: { saveSearches: async () => ({ ok: true, saved: 0, kept: 0 }) }, subject: "OET", outbox: { lists: { c: { intent: "c", on: DAY } } } })).left, 1, "a batch the server did not confirm stays");
});

test("ASKED FIRST: what the server holds comes free, into the ledger, marked saved, and is never sent back; a server that cannot answer buys nothing new; a server not updated yet changes nothing", async () => {
  const w = await world(), seller = localClient(w.seo), key = serpKey("OET for Nurses from Kenya"); await uploadBought({ client: seller, ledger: { serpCache: { [key]: answer("k") } }, saved: emptySaved(), subjectOf: () => "OET", now: NOW });
  const ledger = { spent: [] }, saved = emptySaved(), got = await askServerFirst({ client: seller, subject: "OET", keys: [key, serpKey("not held")], ledger, saved });
  assert.deepEqual([got.ok, got.reused], [true, 1]); assert.equal(ledger.serpCache[key].fromServer, true); assert.equal(ledger.spent.length, 0); assert.equal(unsaved({ ledger, saved }).searches.length, 0, "it is not sent back"); assert.equal(unsaved({ ledger: { serpCache: { [key]: { ...answer("k"), fromServer: true } } }, saved: emptySaved() }).searches.length, 0, "even with the saved file lost");
  assert.equal((await askServerFirst({ client: localClient(w.seo, { down: true }), subject: "OET", keys: [serpKey("x")], ledger, saved })).ok, false);
  const old = await askServerFirst({ client: localClient(w.seo, { oldServer: true }), subject: "OET", keys: [serpKey("x")], ledger, saved }); assert.deepEqual([old.ok, old.noRoute], [true, true]);
  /* no buying when it cannot be asked */
  let posts = 0; const fetchImpl = async () => { posts++; return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20100, id: "t", cost: 0.0006 }] }) }; };
  const out = await searchPages({ pages: [{ kind: "topic", title: "OET fee" }], ledger: { spent: [] }, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, queue: { maxMs: 0, everyMs: 0 }, askFirst: async () => ({ ok: false, why: "no answer" }), noReads: true }); assert.equal(posts, 0, "not one search bought"); assert.match(out.notes.join(" "), /could not be asked first/);
  const heldLedger = { spent: [] }; await searchPages({ pages: [{ kind: "topic", title: "OET fee" }], ledger: heldLedger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, queue: { maxMs: 0, everyMs: 0 }, retry: { times: 0 }, askFirst: async (keys) => { for (const k of keys) (heldLedger.serpCache ??= {})[k] = { ...answer("h"), fromServer: true }; return { ok: true }; }, noReads: true }); assert.equal(posts, 0, "all held: not one bought"); assert.equal(heldLedger.spent.length, 0);
});

test("THE REAL ROUTE: over HTTP, the licence checked, a big batch taken, a key answered; another client's subject refused; an outside client is sent none back (ruling 2); the old route's limit stands", async () => {
  const pair = generateKeyPairSync("ed25519"), pub = pair.publicKey.export({ type: "spki", format: "pem" }), seo = seoMemoryStore(), env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "x", LICENCE_PUBLIC_KEY: pub, CRON_SECRET: "x".repeat(20), OWNER_ACCESS_KEY: "k".repeat(30) };
  const handler = createApp({ mode: "sales", env, kvFetch: async () => ({ ok: true, status: 200, json: async () => [] }), kwStore: memoryStore(), cfStore: cfMemoryStore(), seoStore: seo, dataDir: "." });
  const signedOf = (lic) => ({ licence: lic, signature: sign(null, licenceBytes(lic), pair.privateKey).toString("base64") });
  const AT = new Date().toISOString(), owner = signedOf({ account: "av_owner_x", kind: OWNER.kind, licensee: OWNER.licensee, plan: OWNER.plan, status: "ACTIVE", periodEnd: null, issuedAt: AT }), client = signedOf({ account: "av_client_x", plan: "visibility_5", status: "ACTIVE", periodEnd: new Date(Date.now() + 864e6).toISOString(), issuedAt: AT });
  /* the handler, in process */
  const fetchImpl = async (url, init = {}) => { const u = new URL(url), body = init.body ?? "", req = Readable.from(body ? [Buffer.from(body)] : []); req.method = init.method ?? "GET"; req.url = `${u.pathname}${u.search}`; req.headers = { ...Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])), host: u.host }; let status = 0, out = ""; await new Promise((ok) => handler(req, { writeHead: (c) => { status = c; }, setHeader: () => {}, end: (x) => { out = String(x ?? ""); ok(); } })); return { ok: status < 400, status, json: async () => JSON.parse(out) }; };
  const own = almiSeoClient({ siteUrl: "https://x.example/", signed: owner, fetchImpl }), big = Object.entries(manyAnswers(300)).map(([k, v]) => ({ key: k, on: DAY, results: v.results, paa: v.paa, related: v.related }));
  assert.ok(JSON.stringify(big).length > 64000, "this batch would have been refused");
  const r = await own.saveBought({ subject: "OET", searches: big }); assert.equal(r.ok, true, r.why); assert.equal(r.confirmed.length, 300); assert.equal(r.held.searches, 300);
  const h = await own.heldBought({ subject: "OET", keys: [big[0].key, "nope||"] }); assert.deepEqual(Object.keys(h.searches), [big[0].key]);
  const other = almiSeoClient({ siteUrl: "https://x.example/", signed: client, fetchImpl }); assert.equal((await other.saveBought({ subject: "OET", searches: big.slice(0, 1) })).status, 403);
  await other.register({ subject: "pet insurance" }); const reg = await other.saveBought({ subject: "pet insurance", searches: big.slice(0, 1) }); assert.equal(reg.ok, true, reg.why); const back = await other.heldBought({ subject: "pet insurance", keys: [big[0].key] }); assert.deepEqual(back.searches, {}, "ruling 2");
  assert.equal(await seo.searchCount("oet"), 300);
  /* the old route keeps its limit */
  const tooBig = await fetchImpl("https://x.example/v1/almiseo/saved", { method: "POST", headers: { "content-type": "application/json", [LICENCE_HEADER]: "x" }, body: JSON.stringify({ pad: "x".repeat(66000) }) }).catch((e) => e); assert.equal(tooBig.status, 413);
  assert.ok(JSON.stringify(big).length < BOUGHT.maxBody);
});

test("THE SERVER COLLECTOR reuses what an app bought: not one search paid for it; the same list the next month is bought again", async () => {
  const w = await world(), topicIntent = "OET for Nurses in Kenya"; await w.seo.putTopic({ ...w.topic, intents: [topicIntent], owner: "almiworld", jobs: ["top-pages"] }, { at: NOW });
  await saveBought({ seo: w.seo, subject: "OET", searches: [{ key: serpKey(topicIntent), on: DAY, results: [{ url: "https://t.example/a", title: "A" }], paa: ["Q?"], related: [] }], pages: [{ url: "https://t.example/a", on: DAY, headings: ["Fees"], blocks: { tables: 0, words: 300 } }], lic: OWNER_LIC, at: NOW });
  let posts = 0; const fetchImpl = async () => { posts++; return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 20100, id: "x", cost: 0.0006 }] }) }; };
  const cf = cfMemoryStore(), env = { [ENV_NAMES.topPagesOn]: "1", [ENV_NAMES.dfsLogin]: "l", [ENV_NAMES.dfsPassword]: "p" }, reader = { requests: () => 0, raw: async () => null };
  const r = await runTopPages({ seo: w.seo, cf, env, reader, fetchImpl, now: () => Date.parse(NOW) }); assert.equal(r.reused, 1, JSON.stringify(r)); assert.equal(posts, 0, "not one search paid"); assert.equal(r.reads, 0, "its top page already read");
  assert.equal((await w.seo.lists("oet")).find((l) => l.intent === topicIntent)?.results[0].url, "https://t.example/a");
  assert.ok((await w.seo.coverage("oet")).find((c) => c.intent === topicIntent));
  /* a page's whole heading, the app's search of its subject */
  const heading = "OET in Kenya: fee, centres and councils"; await w.seo.putTopic({ ...w.topic, intents: [heading], owner: "almiworld", jobs: ["top-pages"] }, { at: NOW }); await saveBought({ seo: w.seo, subject: "OET", searches: [{ key: serpKey("OET in Kenya"), on: DAY, results: [], paa: [], related: [] }], lic: OWNER_LIC, at: NOW });
  posts = 0; const again = await runTopPages({ seo: w.seo, cf, env, reader, fetchImpl, now: () => Date.parse(NOW) + 1000 }); assert.equal(posts, 0, JSON.stringify(again)); assert.equal(again.reused, 1);
});

test("NEVER PAID TWICE: an answer with many redirect links is used as it is and not bought again (REPLACES RR-366); a month later it may be", async () => {
  const redirects = { ok: true, cost: 0.0006, at: NOW, results: [{ url: "https://google.com/goto?url=a" }, { url: "https://google.com/goto?url=b" }, { url: "https://real.example/" }], paa: ["Why?"], related: [] }, ledger = { spent: [], serpCache: { [serpKey("OET x")]: redirects } };
  let posts = 0; const fetchImpl = async () => { posts++; return { json: async () => ({ status_code: 20000, tasks: [] }) }; };
  await queueSearches({ wanted: [{ key: serpKey("OET x"), q: "OET x", task: serpTask("OET x") }], settings: { on: true }, ledger, login: "l", password: "p", fetchImpl, now: NOW }); assert.equal(posts, 0);
  const g = await searchGoogle({ keyword: "OET x", settings: { on: true }, ledger, login: "l", password: "p", fetchImpl, now: NOW, wait: false }); assert.equal(g.ok, true); assert.equal(g.cached, true);
  const pages = [{ kind: "origin-profession", title: "OET x" }], out = await searchPages({ pages, ledger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, queue: { maxMs: 0, everyMs: 0 }, retry: { times: 0 }, readHtml: async () => "<h2>Fees</h2>" }); assert.equal(out.read, 1, "the page reads what it paid for"); assert.ok(!pages[0].serpWhy);
  posts = 0; await queueSearches({ wanted: [{ key: serpKey("OET x"), q: "OET x", task: serpTask("OET x") }], settings: { on: true }, ledger, login: "l", password: "p", fetchImpl, now: "2026-12-20T00:00:00.000Z" }); assert.equal(posts, 1, "a month later");
});

test("PAGES FIRST: the quick pass reads no site, waits on no queue, polls once; what is kept is used; a top page already read counts", async () => {
  let reads = 0, gets = 0, posts = 0; const fetchImpl = async (u) => { if (/task_post/.test(u)) { posts++; return { json: async () => ({ status_code: 20000, tasks: Array.from({ length: 100 }, (_, i) => ({ status_code: 20100, id: `t${posts}-${i}`, cost: 0.0006 })) }) }; } gets++; return { json: async () => ({ status_code: 20000, tasks: [{ status_code: 40602 }] }) }; };
  const ledger = { spent: [], serpCache: { [serpKey("OET kept")]: answer("kept") } }, tops = { [answer("kept").results[0].url]: { on: DAY, headings: ["Fees"], blocks: { tables: 1 } } }, pages = [{ kind: "topic", title: "OET kept" }, { kind: "topic", title: "OET new" }, { kind: "country", country: "Ghana", title: "OET in Ghana" }, { kind: "country", country: "Kenya", title: "OET in Kenya" }], t0 = Date.now();
  const out = await searchPages({ pages, ledger, settings: { on: true }, login: "l", password: "p", now: NOW, subject: "OET", fetchImpl, queue: { maxMs: 0, everyMs: 0 }, retry: { times: 0 }, noReads: true, topCache: { get: (u) => tops[u] ?? null, set: () => assert.fail("a quick pass writes no reading down") }, readHtml: async () => { reads++; return "x"; }, sleep: async () => assert.fail("it never sleeps") });
  assert.equal(reads, 0); assert.ok(Date.now() - t0 < 3000); assert.ok(gets <= Object.keys(ledger.pending ?? {}).length, `one collecting pass, not one per page: ${gets}`); assert.ok(Object.keys(ledger.pending).length >= 3, "posted and kept"); assert.equal(pages[0].topRead.length, 1); assert.equal(pages[0].searchedOn, undefined, "its list is not sent until its top results are read"); assert.equal(out.of, 4);
  const src = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8"); assert.match(src, /const first = await pass\(pagesFirst,/); assert.match(src, /googleLater\(id,/); assert.match(src, /label: "Improving your pages with Google's results"/); assert.match(src, /if \(!quick\) await saveSearches\(id, searchedPages\)/); assert.match(src, /!quick && exam && examProduct/, "no repair round holds the first pages"); assert.match(src, /const young = \(\) => Object\.values\(ledger\.pending/, "an answer late from an earlier run holds nothing up"); assert.match(src, /applyPairQuestions\(exam, [^\n]*await factsStep\(exam, false, step\); savePlan\(id, exam\);/, "real questions survive a repair round");
});

test("THE LINE: saved is what the server named back; what is on its way, and what is still coming, is said", () => {
  const c = searchCounts({ routes: { saved: 108, browser: 0, none: 0 }, paid: { reused: 96, bought: 944, cost: 0.46 }, saved: 938, waiting: 6, coming: 12, later: 59 });
  assert.equal(c.line, "Searches: 938 saved in AlmiSEO Data (confirmed by the server), 204 reused free, 944 bought ($0.46). 6 still on their way to AlmiSEO Data; the app keeps trying. 12 of Google's answers still coming: the pages improve by themselves when they arrive.");
  assert.match(searchCounts({ saved: 1, later: 2 }).line, /2 pages will be checked tomorrow/);
});

const PEOPLE = { nursing: "nurses", pharmacy: "pharmacists", medicine: "doctors" };
test("PART 3: India: state councils register; INC's and PCI's own addresses and roles; the association is never shown as registering", () => {
  const collector = [{ part: "home-council", country: "India", profession: "pharmacy", councilName: "Indian Pharmacist Association", text: "Indian Pharmacist Association registers pharmacists in India.", link: "https://ipa-india.in", on: DAY }, { part: "home-council", country: "India", profession: "nursing", councilName: "Indian Nursing Council", text: "Indian Nursing Council registers nurses in India — https://www.indiannursingcouncil.org.", link: "https://www.indiannursingcouncil.org/", on: "2026-10-26" }, { part: "home-council", country: "India", profession: "dentistry", councilName: "National Dental Commission", text: "x", link: "https://ndc.example", on: DAY }];
  const { facts } = councilFacts(correctedCouncils(collector), { "India|nursing|Indian Nursing Council": { ok: false, why: "unread", page: "https://www.indiannursingcouncil.org/", on: DAY } }, { inPlace: (c) => c, peopleOf: (p) => PEOPLE[p] ?? p, today: DAY }), line = (p) => facts.find((f) => f.country === "India" && f.profession === p && f.part === "home-council");
  const inc = line("nursing"); assert.match(inc.text, /^Nurses in India register with their State Nursing Council\./); assert.match(inc.text, /8th Floor, NBCC Center, Plot No\. 2, Community Center, Okhla Phase-I, New Delhi 110020/); assert.match(inc.text, /\+91-11-66616800/); assert.match(inc.text, /nodalofficer\.inc@gov\.in/); assert.match(inc.text, /https:\/\/indiannursingcouncil\.org/); assert.equal(inc.link, "https://indiannursingcouncil.org/pio-details"); assert.doesNotMatch(JSON.stringify(inc), /www\.indiannursing/); assert.doesNotMatch(inc.text, /Indian Nursing Council registers/);
  const pci = line("pharmacy"); assert.match(pci.text, /^State Pharmacy Councils register pharmacists in India \(Pharmacy Act, section 32\(2\)\)/); assert.match(pci.text, /Ministry of Health and Family Welfare/); assert.match(pci.text, /https:\/\/pci\.gov\.in/); assert.equal(pci.link, "https://pci.nic.in/GenInfo_LatestNews.html"); assert.equal(facts.some((f) => /Indian Pharmacist Association/.test(f.text ?? "")), false);
  assert.ok(facts.some((f) => f.country === "India" && f.profession === "dentistry" && /National Dental Commission/.test(f.text)), "another profession's row is left alone, by the correction (RR-371: never checked, it says no 'registers')"); assert.equal(COUNCIL_CORRECTIONS.every((r) => /^2026-11-0[34]$/.test(r.on) && /^https:/.test(r.link)), true);
});

test("PART 3 wording: a body's own page gives the score: plain words, never \"not confirmed yet\"; a body whose role is truly not stated keeps it", () => {
  const research = { pharmacy: [{ kind: "score", country: "New Zealand", regulator: { name: "Pharmacy Council of New Zealand" }, answer: [{ text: "In New Zealand: Pharmacy Council of New Zealand accepts OET: A or B in each of the four sub-tests.", fact: { link: "https://pharmacycouncil.org.nz/x", readOn: DAY } }] }] };
  const off = { part: "home-council", office: true, profession: "pharmacy", country: "New Zealand", councilName: "Pharmacy Council of New Zealand", text: "Office … Whether it is the registering body is not confirmed yet.", link: "https://a.example", on: DAY }, lone = { ...off, councilName: "A Different Body" };
  const [a, b] = officesThatAsk([off, lone], research, { peopleOf: (p) => PEOPLE[p] ?? p }); assert.equal(a.text, "Pharmacy Council of New Zealand (official page) asks pharmacists: A or B in each of the four sub-tests."); assert.equal(a.link, "https://pharmacycouncil.org.nz/x"); assert.match(b.text, /not confirmed yet/);
  assert.equal(asksLine({ name: "Singapore Pharmacy Council", people: "pharmacists", scoreText: "In Singapore: Singapore Pharmacy Council names OET on its own page among the English tests it accepts — Listening 350 · Reading 350 · Writing 350 · Speaking 350." }), "Singapore Pharmacy Council (official page) asks pharmacists: Listening 350 · Reading 350 · Writing 350 · Speaking 350.");
  assert.equal(asksLine({ name: "A Board", people: "radiographers", scoreText: "In New Zealand: A Board accepts OET as evidence of English language proficiency, August 2024; next review 2026." }).startsWith("A Board (official page): "), true, "not a score: its own sentence, whole");
});

test("PART 4: no question of our writing; a real one with a verified answer is taken; none: the page stays, marked for the collector, and it is not a missing part", () => {
  const src = readFileSync(new URL("../desktop/exam-plan.mjs", import.meta.url), "utf8"); assert.doesNotMatch(src, /`Can \$\{people\} from/, "the written question is gone");
  const page = (x) => ({ kind: "origin-profession", country: "Nepal", profession: "pharmacy", title: "OET for Pharmacists from Nepal", questionsWanted: true, items: [], ...x });
  const plan = { pages: [page({ paa: ["How much does OET cost in Nepal?", "Can a nurse from Nepal take OET?", "How long does OET for pharmacists in Germany take?"] }), page({ title: "none", paa: [] })] };
  const claim = { claimId: "a", text: "OET's own page says.", link: "https://oet.com/x", readOn: DAY };
  applyPairQuestions(plan, { subject: "OET", ctxFor: () => ({ subjectFacts: { fee: { claimId: "fee", text: "The fee is AUD 587.", link: "https://oet.com/fee", readOn: DAY } } }) }); void claim;
  assert.equal(plan.questionsWanted.some((w) => w.title === "none"), true); assert.equal(plan.pages[1].questionsWanted, true);
  const html = `<main><section id="x--council"></section></main>`; assert.equal(partsMissing(html, "origin-profession", { questionsWanted: true }).some((m) => /questions people/.test(m)), false); assert.equal(partsMissing(html, "origin-profession", {}).some((m) => /questions people/.test(m)), true);
});

test("PART 5: every corrected line reaches the page's facts, the honest ones too; nurses' and doctors' lines stand before a country's list is cut at twelve; a country with no question, and a profession with no question or an unread score, carry an honest line and block nothing", () => {
  const kept = usableFacts(correctedCouncils([])); assert.equal(kept.length, COUNCIL_CORRECTIONS.filter((r) => !r.stepsOnly).length, "none dropped"); assert.ok(kept.some((f) => /Iranian Nursing Organization's own page could not be read on 2026-11-03; this is still being looked for\./.test(f.text)));
  assert.equal(correctedCouncils([{ part: "home-council", country: "Chile", profession: "dentistry", text: "x" }])[0].corrected, true, "corrected rows first");
  const F = (key, text) => ({ claimId: `s-${key}`, fact: key, text, link: "https://oet.com/x", readOn: DAY, source: "OET", official: true });
  const research = { nursing: [{ kind: "score", country: "Canada", question: "What OET score does a provincial college in Canada ask of nurses?", answer: null, partial: { text: "A college accepts OET; its page ties no score to a sub-test.", link: "https://c.example", on: DAY, source: "C" }, searched: [] }, { kind: "score", country: "Malta", question: "What OET score does a board in Malta ask of nurses?", answer: null, searched: [{ body: "B", why: "not searched yet" }] }] };
  const p = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Iran"], research, facts: [], subjectFacts: { scale: F("scale", "OET's own page: each sub-test is reported on a scale from 0 to 500.") }, maxCountries: 50, searchedOn: NOW }), hub = p.pages.find((x) => x.kind === "profession"), c = p.pages.find((x) => x.kind === "country");
  assert.deepEqual(hub.open, [], "a partial line and an unread score block nothing"); assert.ok(hub.items.some((i) => /^questionsa\d/.test(i.part) && /No question from nurses/.test(i.claims[0].text)));
  assert.ok(c.items.some((i) => /^questionsa\d/.test(i.part) && /No question from people in Iran/.test(i.claims[0].text)));
  assert.equal(c.open.includes("Iran: the questions people there ask, with answers"), false);
});

test("PART 5: a list of the professions is about no one of them; one other profession's line stays off topic", () => {
  const t = { kind: "profession", people: ["radiographers", "radiography"], otherPeople: [["nurses", "nursing"], ["doctors", "medicine"], ["dentists", "dentistry"], ["pharmacists", "pharmacy"]] };
  assert.equal(offTopic("OET's own page: OET is made for 12 healthcare professions: medicine, nursing, dentistry, pharmacy, and others.", t), null); assert.match(offTopic("Nurses need a B in each part.", t), /about nurses/);
});
