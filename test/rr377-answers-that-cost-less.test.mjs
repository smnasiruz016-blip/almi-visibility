/**
 * 🔴 RR-377 (owner, 6 Nov 2026, after his real run on 1.15.34: 479 looked for, 4 found, $4.13): better answers, less money.
 * The owner's source rule: any source, named and linked; the answer says ONLY what the source says; "registers / licenses" only when
 * the source says so; fees, scores, dates and rules true to it. Our own council data first; a contact page is never read for an answer;
 * Claude's own web search before DataForSEO, inside the Monthly AI limit; results already collected are read free; the two false answers
 * withdrawn everywhere. Everything paid is a stand-in.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findOne, findAll, refuseWhy, sourceClass, pageKind, followLinks, rankResults, ownCouncilAnswer, whoAsked, webAnswer, applyFound, foundSummary, keyOf, SOURCE_RULE, EXTRACT_SYSTEM, CONFIRM_SYSTEM } from "../desktop/answer-finder.mjs";
import { WITHDRAWN, applyWithdrawn, holdsWithdrawn, mayTakeHeld } from "../desktop/withdrawn.mjs";
import { aiWebSearch, searchRefuseWhy, publisherOf, AI_SEARCH, NOT_FOUND } from "../desktop/ai-search.mjs";
import { aiLedger, costOf, WEB_SEARCH_USD } from "../desktop/ai-coach.mjs";
import { saveBought, heldBought, allTopics, answersTopic } from "../site/almiseo.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const ON = "2026-11-06", AIOTA_Q = "How do occupational therapists register in India?", CORU_Q = "What OET score does CORU - Regulating Health and Social Care Professional ask of speech pathologists?";
const page = (url, text, links = []) => ({ ok: true, url, title: "T", text, links });
/* a stand-in AI: extract answers from the page it is given; the judge says yes unless told */
const aiStandIn = ({ found = true, answer, quotes, judge = true, calls = [] } = {}) => async (_u, o) => { const b = JSON.parse(o.body); calls.push(b); const isJudge = b.max_tokens === 800; const data = isJudge ? { fits: judge, sourceOk: judge, conflict: false, reason: "stand-in" } : { found, answer, quotes, publisher: "Some Org", kind: "other" }; return new Response(JSON.stringify({ model: b.model, stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 50 }, content: [{ type: "text", text: JSON.stringify(data) }] }), { status: 200 }); };

test("THE SOURCE RULE: any readable source may answer a truth question, named; social sites and search engines' own pages are never read", () => {
  assert.equal(sourceClass("https://www.reddit.com/r/oet/1"), "open", "a forum is a source now, named");
  assert.equal(sourceClass("https://someblog.wordpress.com/a"), "open");
  for (const u of ["https://www.facebook.com/groups/x", "https://www.google.com/search?q=x", "https://www.scribd.com/doc/1"]) assert.equal(sourceClass(u), "never", u);
  const p = page("https://blog.example/fees", "The OET fee in Kenya is USD 455 for all four parts, the centre says.");
  assert.equal(refuseWhy({ answer: "The OET fee in Kenya is USD 455 for all four parts.", quotes: ["The OET fee in Kenya is USD 455 for all four parts, the centre says."] }, { page: p }), null, "a fee from a non-official page passes when its words hold it");
  assert.match(refuseWhy({ answer: "The OET fee in Kenya is USD 460 for all four parts.", quotes: ["The OET fee in Kenya is USD 455 for all four parts, the centre says."] }, { page: p }), /460/, "a number its source's words do not hold");
  const p2 = page("https://blog.example/fees", "The OET fee in Kenya is paid at the centre. Our office opened in 455 Main Street years ago.");
  assert.match(refuseWhy({ answer: "The OET fee in Kenya is USD 455, paid at the centre.", quotes: ["The OET fee in Kenya is paid at the centre."] }, { page: p2 }), /states 455/, "a number elsewhere on the page is not the quoted words");
  assert.match(refuseWhy({ answer: "The OET fee in Kenya is paid at the centre.", quotes: ["The OET fee in Kenya is paid at the centre.", "These words were never written on that page."] }, { page: p2 }), /quoted words are not on the page/, "every quote, not one of them");
  assert.match(EXTRACT_SYSTEM, /registers" or "licenses"/); assert.match(CONFIRM_SYSTEM, /ONLY what the source's words say/); assert.doesNotMatch(read("desktop/answer-finder.mjs"), /a truth question takes official sources only|Confirm with \$\{v\.confirmWith\}/, "the old official-only rule is gone");
});

test("AIOTA: an answer that says a body registers or licenses stands only when its source's words say so", () => {
  const p = page("https://kbaiota.org/blog", "Occupational therapists complete their course at an accredited college and join the All India Occupational Therapists' Association.");
  assert.match(refuseWhy({ answer: "Occupational therapists in India register and are licensed under the All India Occupational Therapists' Association.", quotes: ["Occupational therapists complete their course at an accredited college and join the All India Occupational Therapists' Association."] }, { page: p }), /registers or licenses/);
  assert.match(searchRefuseWhy({ answer: "AIOTA licenses occupational therapists in India.", cites: [{ url: "https://x.org", text: "AIOTA is the national association of occupational therapists." }] }), /registers or licenses/);
  assert.equal(searchRefuseWhy({ answer: NOT_FOUND, cites: [] }), "no page answered it");
});

test("THE JUDGE sees every sentence the answer stands on, each checked on the page (24 refusals came from one quoted line)", async () => {
  const text = "In Ghana, applicants submit their degree certificate to the council. The council registers dietitians after a review of documents. A fee of 100 is paid online.", calls = [];
  const r = await findOne({ question: "How do dietitians register in Ghana?", cls: "truth", part: "regulator", key: "k1" }, { on: ON, key: "x", read: async (u) => page(u, text), search: async () => [{ url: "https://hefra.gov.gh/registration/dietitians", title: "Dietitians registration Ghana", snippet: "register dietitians" }], fetchImpl: aiStandIn({ answer: "Dietitians register with the council after a review of documents, and pay a fee of 100 online.", quotes: ["The council registers dietitians after a review of documents.", "A fee of 100 is paid online."], calls }) });
  assert.equal(r.ok, true, r.why); assert.equal(r.quotes.length, 2); const judge = calls.find((b) => b.max_tokens === 800); assert.deepEqual(JSON.parse(judge.messages[0].content).source.words, ["The council registers dietitians after a review of documents.", "A fee of 100 is paid online."]);
  const bad = await findOne({ question: "How do dietitians register in Ghana?", cls: "truth", part: "regulator", key: "k2" }, { on: ON, key: "x", read: async (u) => page(u, text), search: async () => [{ url: "https://hefra.gov.gh/registration/dietitians" }], fetchImpl: aiStandIn({ answer: "Dietitians register with the council after a review of documents.", quotes: ["The council approves everyone in one day, always."] }) });
  assert.equal(bad.ok, false); assert.match(bad.why, /quoted words are not on the page/);
});

test("READ THE RIGHT PAGES: a contact or home page is never given to the AI; one level of its own registration / English links is read instead", async () => {
  assert.equal(pageKind("https://nmc.org.in/contact-us"), "contact"); assert.equal(pageKind("https://www.pcpisb.gov.pk/"), "home"); assert.equal(pageKind("https://x.org/en"), "home"); assert.equal(pageKind("https://x.org/login"), "login"); assert.equal(pageKind("https://x.org/registration/overseas-applicants"), "deep");
  const contact = page("https://council.example/contact-us", "Call us. Physiotherapists register here.", [{ href: "https://council.example/registration/foreign-trained", text: "Foreign-trained registration" }, { href: "https://other.example/registration", text: "Registration elsewhere" }, { href: "https://council.example/news", text: "News" }]);
  assert.deepEqual(followLinks(contact, contact.url), ["https://council.example/registration/foreign-trained"], "same site, the registration page only");
  const asked = [], sent = []; const r = await findOne({ question: "How do physiotherapists register in Kenya?", cls: "truth", part: "regulator", key: "k3", link: "https://council.example/contact-us" }, { on: ON, key: "x", read: async (u) => { asked.push(u); return u.endsWith("contact-us") ? contact : page(u, "Foreign-trained physiotherapists register with the council by sending their degree and a letter of good standing."); }, fetchImpl: async (u, o) => { sent.push(JSON.parse(o.body)); return aiStandIn({ answer: "Foreign-trained physiotherapists register with the council by sending their degree and a letter of good standing.", quotes: ["Foreign-trained physiotherapists register with the council by sending their degree and a letter of good standing."] })(u, o); } });
  assert.equal(r.ok, true, r.why); assert.equal(r.url, "https://council.example/registration/foreign-trained"); assert.ok(!sent.some((b) => JSON.stringify(b).includes("Call us")), "the contact page never reached the AI");
  assert.deepEqual(rankResults("How do nurses register in Oman?", [{ url: "https://moh.gov.om/contact" }, { url: "https://blog.example/travel", title: "Travel tips" }, { url: "https://moh.gov.om/en/nurses-registration", title: "Nurses registration Oman" }, { url: "https://www.facebook.com/x", title: "nurses register oman" }]), ["https://moh.gov.om/en/nurses-registration", "https://blog.example/travel"], "contact and social left out; the title that matches first");
});

test("OUR OWN DATA FIRST: a council whose own page says it registers this profession answers who registers, free: no search, no AI", async () => {
  const councils = [{ country: "Kenya", people: "pharmacists", name: "Pharmacy and Poisons Board", url: "https://pharmacyboardkenya.org/registration" }, { country: "Canada", people: "nurses", name: "A", url: "https://a.ca" }, { country: "Canada", people: "nurses", name: "B", url: "https://b.ca" }];
  assert.deepEqual(whoAsked("Which council in Uganda registers vets?"), { people: "vets", place: "Uganda", how: false });
  const o = ownCouncilAnswer({ question: "How do pharmacists register in Kenya?" }, councils); assert.equal(o.answer, "Pharmacists in Kenya register with Pharmacy and Poisons Board."); assert.equal(o.url, "https://pharmacyboardkenya.org/registration");
  assert.equal(ownCouncilAnswer({ question: "Who registers nurses in Canada, and how do I register?" }, councils), null, "more than one body: not ours to choose");
  assert.equal(ownCouncilAnswer({ question: "How do physiotherapists register in India?" }, [{ country: "India", people: "physiotherapists", name: "Delhi Council for Physiotherapy and Occupational Therapy", url: "https://dcptot.example/" }]), null, "India, the United States, Canada: people register below the national level, no one body is the answer (owner's copy gave Delhi's council for all of India)");
  assert.equal(ownCouncilAnswer({ question: "How do vets register in Kenya?" }, [{ country: "Kenya", people: "vets", name: "Kenya Veterinary Association", url: "https://kva.example/" }]), null, "an association is no registrar"); assert.ok(ownCouncilAnswer({ question: "How do vets register in Kenya?" }, [{ country: "Kenya", people: "vets", name: "Kenya Veterinary Society", url: "https://kvs.example/", strict: true }])?.ok, "unless its own page says it is the regulator");
  let searched = 0, ai = 0; const r = await findOne({ question: "How do pharmacists register in Kenya?", cls: "truth", key: "k4" }, { on: ON, key: "x", read: async () => null, ownData: (row) => ownCouncilAnswer(row, councils), search: async () => { searched++; return []; }, webSearch: async () => { ai++; return null; } });
  assert.equal(r.route, "o"); assert.equal(r.ok, true); assert.equal(searched + ai, 0, "nothing paid"); assert.equal(r.rule, SOURCE_RULE);
});

test("AI WEB SEARCH: after our own data, before DataForSEO; the pages it found are read in full by the app; its money is its own line inside the AI limit", async () => {
  const order = [], resp = { model: "claude-sonnet-5-5", stop_reason: "end_turn", usage: { input_tokens: 9000, output_tokens: 100, server_tool_use: { web_search_requests: 2 } }, content: [{ type: "text", text: "I will search." }, { type: "server_tool_use", id: "s", name: "web_search", input: { query: "q" } }, { type: "web_search_tool_result", tool_use_id: "s", content: [{ type: "web_search_result", url: "https://omsb.gov.om/nurses/licensing", title: "Nurses licensing | OMSB" }] }, { type: "text", text: "Nurses in Oman are licensed by the Ministry of Health.", citations: [{ type: "web_search_result_location", url: "https://omsb.gov.om/nurses/licensing", title: "Nurses licensing | OMSB", cited_text: "Nurses in Oman are licensed by the Ministry of Health after the Prometric exam." }] }] };
  const s = await aiWebSearch({ key: "k", question: "How do nurses register in Oman?", fetchImpl: async (_u, o) => { const b = JSON.parse(o.body); assert.equal(b.model, AI_SEARCH.model); assert.equal(b.tools[0].type, AI_SEARCH.tool); assert.equal(b.tools[0].max_uses, AI_SEARCH.maxUses); return new Response(JSON.stringify(resp), { status: 200 }); } });
  assert.equal(s.answer, "Nurses in Oman are licensed by the Ministry of Health.", "only the text after the last search"); assert.equal(s.cites.length, 1); assert.deepEqual(s.results.map((x) => x.url), ["https://omsb.gov.om/nurses/licensing"]); assert.equal(s.usage.searches, 2); assert.equal(s.usage.route, "w");
  assert.equal(Number(costOf({ model: "claude-sonnet-5-5", input: 9000, output: 100, searches: 2 }).toFixed(4)), Number((9000 * 2 / 1e6 + 100 * 10 / 1e6 + 2 * WEB_SEARCH_USD).toFixed(4)), "the searches are in the bill");
  const dir = mkdtempSync(join(tmpdir(), "rr377-")); try { const L = aiLedger(join(dir, "l.json"), { cap: () => 17 }); L.add(s.usage); L.add({ model: "claude-opus-5-5", input: 500, output: 50 }); const w = L.route("w"); assert.equal(w.today.searches, 2); assert.ok(w.month.usd > 0.02 && w.month.usd < L.month().usd, "its own line, inside the month's AI total"); } finally { rmSync(dir, { recursive: true, force: true }); }
  const r = await findOne({ question: "How do nurses register in Oman?", cls: "truth", key: "k5" }, { on: ON, key: "x", read: async (u) => { order.push(`read ${u}`); return page(u, "Nurses in Oman are licensed by the Ministry of Health after the Prometric exam and a data check."); }, search: async () => { order.push("dataforseo"); return []; }, webSearch: async (row) => { order.push("ai search"); return webAnswer(row, { key: "k", search: async () => ({ answer: s.answer, cites: s.cites, results: s.results, usage: null }) }); }, fetchImpl: aiStandIn({ answer: "Nurses in Oman are licensed by the Ministry of Health after the Prometric exam.", quotes: ["Nurses in Oman are licensed by the Ministry of Health after the Prometric exam and a data check."] }) });
  assert.equal(r.ok, true, r.why); assert.equal(r.route, "w"); assert.ok(!order.includes("dataforseo"), "DataForSEO never asked when the AI web search answered"); assert.equal(order[0], "ai search"); assert.equal(r.url, "https://omsb.gov.om/nurses/licensing");
  assert.equal(publisherOf({ url: "https://omsb.gov.om/x", title: "Nurses licensing | OMSB" }), "OMSB");
  const order2 = []; const n = await findOne({ question: "How do nurses register in Oman?", cls: "truth", key: "k7" }, { on: ON, key: "x", read: async () => null, search: async () => { order2.push("dataforseo"); return []; }, webSearch: async () => { order2.push("ai search"); return { why: "no page answered it" }; } });
  assert.deepEqual(order2, ["ai search", "dataforseo"], "when the AI web search finds nothing, DataForSEO comes after it"); assert.equal(n.ok, false);
  const capped = await findOne({ question: "How do nurses register in Oman?", cls: "truth", key: "k6" }, { on: ON, key: "x", read: async () => null, webSearch: (row) => webAnswer(row, { key: "k", allowedFor: () => false, search: async () => { throw new Error("never called at the cap"); } }) });
  assert.equal(capped.stopped, "cap", "at the Monthly AI limit it stops, kept nowhere, tried again");
});

test("A QUESTION THE PER-RUN LIMIT SKIPPED, OR ONE THAT FAILED UNDER THE OLD RULES, IS LOOKED FOR AGAIN; nothing that was found is lost", async () => {
  const rows = [{ key: keyOf("Q old?"), question: "Q old?", cls: "truth" }, { key: keyOf("Q new?"), question: "Q new?", cls: "truth" }, { key: keyOf("Q later?"), question: "Q later?", cls: "truth" }, { key: keyOf("Q found?"), question: "Q found?", cls: "truth" }];
  const kept = { [rows[0].key]: { ok: false, on: ON, question: "Q old?", why: "a truth question takes official sources only" }, [rows[1].key]: { ok: false, on: ON, rule: SOURCE_RULE, question: "Q new?", why: "no page held it" }, [rows[2].key]: { ok: false, on: ON, rule: SOURCE_RULE, later: true, question: "Q later?", why: "the AI web search did its 60 questions" }, [rows[3].key]: { ok: true, on: ON, question: "Q found?", answer: "A kept answer, from before.", url: "https://x.org" } };
  const tried = []; await findAll(rows, { kept, today: ON, read: async () => null, ownData: (row) => { tried.push(row.question); return null; } });
  assert.deepEqual(tried.sort(), ["Q later?", "Q old?"]); assert.equal(kept[rows[3].key].answer, "A kept answer, from before.");
  assert.equal(foundSummary({ a: { ok: false, later: true } }).none, 0); assert.equal(foundSummary({ a: { ok: false, later: true } }, [{ key: "a" }]).notTried, 1, "counted as not looked for yet, never as no source");
  const held = { [keyOf("Q h?")]: { ok: false, question: "Q h?", why: "a truth question takes official sources only" } }; const k2 = {}; await findAll([{ key: keyOf("Q h?"), question: "Q h?", cls: "truth" }], { kept: k2, today: ON, read: async () => null, held: async () => held }); assert.notEqual(k2[keyOf("Q h?")]?.fromServer, true, "an old-rule failure from AlmiSEO Data is not taken");
});

test("WITHDRAWN: AIOTA out everywhere, CORU corrected from coru.ie; never taken back from AlmiSEO Data; a page still holding one is not ready and is never published", async () => {
  const kA = keyOf(AIOTA_Q), kC = keyOf(CORU_Q); assert.ok(WITHDRAWN[kA] && WITHDRAWN[kC]);
  const kept = { [kA]: { ok: true, on: "2026-11-05", cls: "truth", question: AIOTA_Q, answer: "Occupational therapists in India register and are licensed under the All India Occupational Therapists' Association (AIOTA), which requires completing the course.", url: "https://kbaiota.org/x" }, [kC]: { ok: true, on: "2026-11-05", cls: "truth", question: CORU_Q, answer: "CORU asks speech pathologists, who register through the Speech & Language Therapists Registration Board, for OET Speech Pathology grade B (400) in three components and B (350) in one component.", url: "https://www.coru.ie/x", name: "OET" } };
  const out = applyWithdrawn(kept, { today: ON, rule: SOURCE_RULE }); assert.equal(out.length, 2);
  assert.equal(kept[kA].ok, false); assert.equal(kept[kA].withdrawn, "2026-11-06"); assert.equal(kept[kC].name, "CORU"); assert.match(kept[kC].answer, /at least 400 in three of the four parts .* at least 350 in the fourth/); assert.equal(applyWithdrawn(kept, { today: ON }).length, 0, "once only");
  const p = { pages: [{ title: "OET for Speech Pathologists in Ireland", items: [{ question: CORU_Q, claims: [{ text: "" }] }] }] }; applyFound(p, kept); assert.match(p.pages[0].items[0].claims[0].text, /at least 400/);
  assert.equal(holdsWithdrawn("<p>…register and are licensed under the All India Occupational Therapists' Association</p>"), true); assert.equal(holdsWithdrawn("CORU asks speech pathologists, who register through the Speech &amp; Language"), true); assert.equal(holdsWithdrawn("CORU asks for at least 400 in three of the four parts"), false);
  assert.equal(mayTakeHeld(kA, { ok: true, answer: "… All India Occupational Therapists' Association …" }), false); assert.equal(mayTakeHeld(kA, { ok: true, answer: "Occupational therapists register with the national commission." }), true, "a new, true answer may come back");
  const seo = seoMemoryStore(), owner = { owner: true, account: "o" }, NOW = "2026-11-06T01:00:00.000Z";
  const saved = await saveBought({ seo, subject: "OET", answers: [{ key: kA, ok: true, on: ON, cls: "truth", question: AIOTA_Q, route: "c", answer: "They register under the All India Occupational Therapists' Association.", url: "https://kbaiota.org/x", name: "KOTA" }, { key: kC, ok: true, on: ON, cls: "truth", question: CORU_Q, route: "w", rule: SOURCE_RULE, answer: kept[kC].answer, url: kept[kC].url, name: "CORU", official: true }], lic: owner, at: NOW });
  assert.deepEqual(saved.answers, [kC], "the server refuses the withdrawn answer");
  const held = (await heldBought({ seo, subject: "OET", answers: [kA, kC], lic: owner, at: NOW })).answers; assert.equal(held[kA], undefined); assert.equal(held[kC].route, "w"); assert.equal(held[kC].rule, SOURCE_RULE);
  /* one saved before this version reached the server is never given back either */
  const oet = (await allTopics({ seo })).find((t) => t.id === "oet"); await seo.putSearches([{ topic: answersTopic(oet.id), key: kA, kind: "answer", day: ON, data: { ok: true, on: ON, question: AIOTA_Q, answer: "They register under the All India Occupational Therapists' Association.", url: "https://kbaiota.org/x" } }], { at: NOW });
  assert.equal((await heldBought({ seo, subject: "OET", answers: [kA], lic: owner, at: NOW })).answers[kA], undefined, "the server never gives it back");
  const main = read("desktop/main.mjs"); assert.match(main, /!holdsWithdrawn\(x\.html\) \/\* RR-377 item 7 \*\//, "Publish all ready skips such a page"); assert.match(main, /for \(const p of store\.list\(\)\) \{ try \{ withdrawFalse\(p\.id\)/, "from the app's first minute"); assert.match(main, /const withdrawn = withdrawFalse\(id\)/, "and before every search");
});

test("THE 167: results already collected are read first and free, never counted against the run's 500 or the day's cap", () => {
  const main = read("desktop/main.mjs"); assert.match(main, /search = capped \? async \(q\) => \{ const held = cacheNow\[`\$\{q\}\|\|`\]; if \(held\?\.ok && held\.results\?\.length\) return held\.results; if \(bought >= FINDER\.maxSearches\)/); assert.match(main, /cacheNow = l\.serpCache \?\? cacheNow;/, "what the wait collected is read in the same run");
});

test("THE PAGES SCREEN: Create SEO pages at the top; 20 pages a screen with Next / Previous; a search box and a filter", () => {
  const ui = read("desktop/ui.html"); assert.match(ui, /id="topcreatego">Create SEO pages<\/button>/); assert.match(ui, /jobs: \["create-pages"\]/); assert.match(ui, /const PER_SCREEN = 20;/); assert.match(ui, /placeholder="Search pages, e\.g\. Pakistan"/); for (const w of ["Ready", "Needs work", "Needs more answers"]) assert.ok(ui.includes(`"${w}"]`), w); assert.match(ui, /id="pageprev"/); assert.match(ui, /id="pagenext"/); assert.match(ui, /data-row data-state="\$\{d\.readyAsDraft \? "ready" : "work"\}" data-thin=/);
  const script = ui.slice(ui.indexOf("const PER_SCREEN"), ui.indexOf("async function pagesBox")); const rows = Array.from({ length: 45 }, (_, i) => ({ dataset: { title: i % 3 === 0 ? `oet in pakistan ${i}` : `oet for nurses ${i}`, state: i % 2 ? "ready" : "work", thin: i % 5 === 0 ? "1" : "0" }, style: {} })), els = {};
  const $ = (s) => els[s] ?? (els[s] = { textContent: "", innerHTML: "", scrollIntoView() {} }); const document = { querySelectorAll: () => rows }; const esc = (x) => String(x);
  const run = new Function("$", "document", "esc", `${script}; return { pageList, set: (v) => { PAGE_VIEW = v; } };`)($, document, esc);
  run.pageList(); assert.equal(rows.filter((r) => r.style.display === "").length, 20); assert.equal(els["#pagecount"].textContent, "1–20 of 45");
  run.set({ q: "pakistan", f: "all", at: 0 }); run.pageList(); assert.equal(rows.filter((r) => r.style.display === "").length, 15); assert.ok(rows.filter((r) => r.style.display === "").every((r) => r.dataset.title.includes("pakistan")));
  run.set({ q: "", f: "more", at: 0 }); run.pageList(); assert.equal(rows.filter((r) => r.style.display === "").length, 9, "needs more answers");
  run.set({ q: "", f: "all", at: 2 }); run.pageList(); assert.equal(rows.filter((r) => r.style.display === "").length, 5, "the last screen");
});
