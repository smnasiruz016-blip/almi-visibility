/**
 * RR-330 · the Questions collector, the official-source answers, and why councils and rules stayed at 0.
 *   A the questions people really ask: a question's form; a comment's questions without anything personal; the owner's lines; same meaning
 *     → one group, its key kept from run to run; what a page may carry; Reddit OFF
 *   B one country: keywords + YouTube (a stand-in for the official API) + the owner's own → groups → each answer checked on an official
 *     page (or "general guidance" with no number); YouTube's words kept 30 days at most and never a page's words; nothing asked twice
 *   C councils and rules: a missing certificate in an official site's chain completed as a browser does (verification kept; a self-signed
 *     site never read); the pages that could not be read named in the next day's search
 *   D /owner/countries: the questions panel, the owner's paste box (due at once), the first 15 countries' progress and ETA
 * Every name, site, address and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import tls from "node:tls";
import { isQuestionForm, questionsInComment, ownerLines, groupQuestions, pageable, REDDIT, signatureOf } from "../desktop/real-questions.mjs";
import { collectQuestions, CF_QUESTIONS } from "../site/cf-questions.mjs";
import { chainFetch, CHAIN } from "../site/chain-fetch.mjs";
import { cfMemoryStore, cfPgStore } from "../site/cf-store.mjs";
import { runCountryFacts } from "../site/cf-collector.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { createApp } from "../site/app.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { BRANDS } from "../site/kw-finder.mjs";

const ON = "2026-10-27", T0 = Date.parse(`${ON}T10:00:00Z`);
const SUBJECT = { name: "OET", site: "https://oet.example" };
const PK = { code: "PK", name: "Pakistan" };

/* ── A ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("A · RR-330: a question's form (the owner's list: how / what / can / is / when / where / which / why / fee / near me); a comment's questions with nothing personal kept; the owner's lines", () => {
  for (const q of ["how to prepare for oet", "oet fee in pakistan", "oet centre near me", "can i take oet at home", "is oet accepted in ireland", "when do oet results come out", "what is a good oet score?"]) assert.ok(isQuestionForm(q), q);
  for (const k of ["oet centre lahore", "e2 oet", "oet books pdf"]) assert.equal(isQuestionForm(k), false, k);
  const qs = questionsInComment("Hi sir, can I take OET at home from Lahore? Great video. Call me on +92 300 1234567 or mail x.y@mail.example — see www.my-site.example @someone how long are results valid?");
  assert.deepEqual(qs, ["can I take OET at home from Lahore?", "how long are results valid?"]);
  assert.ok(!qs.join(" ").match(/\+92|mail\.example|my-site|@someone|Hi sir/), "nothing personal kept");
  const inside = questionsInComment("@ali_k can I send the form to x.y@mail.example or www.form.example before Friday?");
  assert.equal(inside.length, 1); assert.doesNotMatch(inside[0], /@|www\.|mail\.example/, "a question's own words lose their personal parts too");
  assert.deepEqual(ownerLines("1. Can I give OET from Lahore?\n- How do I get a good standing letter?\n\nok"), ["Can I give OET from Lahore?", "How do I get a good standing letter?"]);
  assert.equal(REDDIT.on, false); assert.match(REDDIT.why, /written approval for any commercial use/);
});

test("A · RR-330: same meaning → ONE group (the need first, then most content words); a group keeps its key on the next run; YouTube's words are never the group's question; what a page may carry", () => {
  const items = [{ text: "oet fee in pakistan", source: "keywords", volume: 880 }, { text: "how much is oet exam fee", source: "keywords", volume: 300 }, { text: "can i take oet at home", source: "keywords", volume: 120 },
    { text: "can I take OET at home from Lahore?", source: "youtube" }, { text: "How do I get a good standing letter for the nursing council?", source: "owner" }, { text: "Can I give OET from Lahore?", source: "owner" }, { text: "e2 oet fee", source: "keywords", volume: 9000 }, { text: "fee for ielts", source: "keywords", volume: 500 }];
  const g = groupQuestions(items, { subject: "OET", country: "Pakistan", skip: BRANDS });
  const by = Object.fromEntries(g.map((x) => [x.id, x]));
  assert.deepEqual(Object.keys(by).sort(), ["fees", "home", "other questions", "other questions~council-good-letter"].sort(), JSON.stringify(Object.keys(by)));
  assert.equal(by.fees.count, 2, "two ways of asking the fee are one question"); assert.equal(by.fees.volume, 1180);
  assert.deepEqual(by.home.sources, { keywords: 1, youtube: 1, owner: 0, gsc: 0 }); assert.equal(by.home.question, "can i take oet at home", "the search's words, never the comment's");
  assert.equal(by["other questions"].question, "Can I give OET from Lahore?", "the owner's line needs no subject word");
  assert.ok(!g.some((x) => /ielts|e2/.test(JSON.stringify(x))), "another test's search, a brand's name: not a question about OET");
  assert.deepEqual(signatureOf("how much is oet exam fee in pakistan", { subject: "OET", country: "Pakistan" }), ["fee", "test"]);
  /* the next run: different words first — the old keys stay (the answer and the owner's word stay with them) */
  const again = groupQuestions([{ text: "what is the oet fee", source: "keywords", volume: 5000 }, ...items], { subject: "OET", country: "Pakistan", skip: BRANDS, known: g.map((x) => ({ id: x.id, need: x.need, sig: x.sig })) });
  assert.ok(again.find((x) => x.id === "fees").count === 3 && !again.some((x) => x.id.startsWith("fees~")), "joined its old group");
  const kept = groupQuestions(items, { subject: "OET", country: "Pakistan", skip: BRANDS, known: [{ id: "fees~an-old-key", need: "fees", sig: ["fee"] }] });
  assert.deepEqual([kept.find((x) => x.id === "fees~an-old-key")?.count, kept.some((x) => x.id === "fees")], [2, false], "an old group's key is kept, whatever key a new run would give");
  assert.equal(pageable(by.home, { kind: "official", shown: true }), true); assert.equal(pageable(by.home, { kind: "guidance", shown: true }), false, "guidance is shown, never a page's reason");
  assert.equal(pageable({ volume: 10, count: 1, sources: { owner: 0 } }, { kind: "official", shown: true }), false, "asked too little");
  assert.equal(pageable(by["other questions"], { kind: "official", shown: true }), true, "the owner's own question counts");
});

/* ── B ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const PAGES = {
  "https://oet.example/test/oet-test-at-home": { title: "OET@Home", text: "Test fee: AUD $587. OET@Home is offered in countries where a test venue is not yet available, from your own computer." },
  "https://oet.example/results": { title: "Results", text: "Results are released about 17 business days after the test date, on the OET results page." },
  "https://council.gov.zz/good-standing": { title: "Good standing", text: "To receive a letter of good standing, a registered nurse applies to the council with a copy of the registration card and the address of the foreign council." },
};
const reader = () => { let n = 0; return { read: async (u) => { n++; const p = PAGES[u]; return p ? { ok: true, url: u, title: p.title, h1: null, text: p.text, checkedOn: ON } : { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, requests: () => n }; };
function answersAi() {
  const calls = [];
  const ai = async ({ prompt, schema, search }) => {
    calls.push({ prompt, search });
    const ids = [...prompt.matchAll(/^- ([a-z~ -]+): /gm)].map((m) => m[1]);
    const A = { home: { kind: "official", question: "Can I take OET at home?", answer: "Yes. OET@Home lets you take OET from your own computer where no test venue is open yet.", quote: "OET@Home is offered in countries where a test venue is not yet available", sourceUrl: "https://oet.example/test/oet-test-at-home" },
      dates: { kind: "official", question: "When do results come out?", answer: "Results come about 16 business days after the test.", quote: "Results are released about 17 business days after the test date", sourceUrl: "https://oet.example/results" },
      requirements: { kind: "official", question: "Is OET accepted in Ireland?", answer: "Yes, every council in the world accepts OET.", quote: "OET is accepted by every council and every university in the whole world today", sourceUrl: "https://oet.example/results" },
      validity: { kind: "official", question: "How long are results valid?", answer: "They are valid for a long time.", quote: "OET results stay valid for as long as the organisation accepts them in its rules", sourceUrl: "https://someones-blog.example/oet-validity" },
      preparation: { kind: "guidance", question: "How do I prepare?", answer: "Practise with OET's own sample tests under timed conditions and review each answer.", quote: "", sourceUrl: "" },
      "other questions": { kind: "guidance", question: "Can I take it in Lahore?", answer: "Yes, there are venues in 3 cities.", quote: "", sourceUrl: "" },
      "other questions~council-good-letter": { kind: "official", question: "How do I get a good standing letter?", answer: "Apply to the nursing council with a copy of your registration card and the address of the foreign council.", quote: "a registered nurse applies to the council with a copy of the registration card and the address of the foreign council", sourceUrl: "https://council.gov.zz/good-standing" } };
    assert.ok(schema.properties.answers.items.properties.kind, "the official-answer question");
    return { ok: true, usd: 0.07, searches: 4, data: { answers: ids.filter((id) => A[id]).map((id) => ({ group: id, ...A[id] })) } };
  };
  return { ai, calls };
}
async function kwDb() {
  const s = memoryStore();
  await s.saveFetch({ kind: "collector", seedKey: "seed:PK", location: "PK", language: "en", day: ON, at: `${ON}T01:00:00Z`, period: "2025-10-01..2026-09-30", ops: 1,
    rows: [["oet fee in pakistan", 880], ["how much is oet exam fee", 300], ["can i take oet at home", 120], ["how long is oet valid", 70], ["when do oet results come out", 90], ["how to prepare for oet", 90], ["is oet accepted in ireland", 60], ["e2 oet", 9000], ["oet centre lahore", 300]].map(([text, said]) => ({ text, said })) });
  return s;
}
function standInYouTube(comments = [{ text: "Hi sir, can I take OET at home from Lahore? my number is +92 300 1234567" }, { text: "great video" }]) {
  const calls = { search: 0, comments: 0 };
  return { calls, set: (c) => { comments = c; }, api: { state: "READY", searchTopic: async (q, o) => { calls.search++; assert.equal(o.regionCode, "PK"); assert.match(q, /^OET exam$/); return [{ videoId: "vid1" }, { videoId: "vid2" }]; }, comments: async (id) => { calls.comments++; return id === "vid1" ? comments : []; } } };
}
const FEE = { value: { line: "AUD 587 — about 114,200 PKR (the open rate of 2026-10-27), not an official price", rate: null }, readOn: ON, sourceUrl: "https://oet.example/test/oet-test-at-home", sourceTitle: "OET@Home" };
async function oneCountry({ store, kw, yt, A, today = ON, aiOn = true }) {
  await store.putQuestions({ product: "oet", country: "Pakistan", source: "owner", items: [{ text: "How do I get a good standing letter for the nursing council?" }, { text: "Can I give OET from Lahore?" }], at: `${ON}T09:00:00Z` });
  const put = (f) => store.putFact({ proposedBy: "official", aiWritten: false, ...f }, { at: `${today}T10:00:00Z` });
  return collectQuestions({ country: "Pakistan", location: PK, subject: "OET", subjectSite: SUBJECT.site, skip: BRANDS, fee: FEE, lines: ["the OET fee: AUD 587"], bodies: [] },
    { store, kwStore: kw, env: {}, reader: reader(), room: () => true, askOne: A.ai, put, today, at: () => `${today}T10:00:00Z`, youtube: yt.api, aiOn });
}

test("B · RR-330: one country — keywords, YouTube and the owner's questions grouped; the fee from its fact; each official answer CHECKED on its page (address official, quote there, every number there); guidance with no number; the counts", async () => {
  const store = cfMemoryStore(), kw = await kwDb(), yt = standInYouTube(), A = answersAi();
  const r = await oneCountry({ store, kw, yt, A });
  assert.equal(r.state, "done", r.note);
  assert.deepEqual(r.stats.sources, { keywords: 7, youtube: 1, owner: 2, gsc: 0 }); assert.equal(r.stats.asked, 10); assert.equal(r.stats.groups, 8);
  assert.equal(A.calls.length, 1, "ONE AI question for the country"); assert.equal(A.calls[0].search, true, "it searches for the official page");
  const f = async (id) => store.fact(`question|Pakistan|${id.replace(/ /g, "-")}`);
  const fee = await f("fees"); assert.equal(fee.status, "confirmed"); assert.equal(fee.aiWritten, false); assert.match(fee.value.answer, /^OET costs AUD 587 in Pakistan \(OET's own page/); assert.equal(fee.value.pageable, true);
  const home = await f("home"); assert.equal(home.status, "confirmed"); assert.equal(home.value.answerKind, "official"); assert.equal(home.value.pageable, true); assert.equal(home.sourceUrl, "https://oet.example/test/oet-test-at-home");
  assert.equal(home.value.question, "can i take oet at home"); assert.equal(home.value.sources.youtube, 1);
  const dates = await f("dates"); assert.equal(dates.status, "unconfirmed"); assert.match(dates.why, /states 16, which its source page does not/);
  const val = await f("validity"); assert.equal(val.status, "unconfirmed"); assert.match(val.why, /not official/);
  const req = await f("requirements"); assert.equal(req.status, "unconfirmed"); assert.match(req.why, /the quoted words are not on its source page/, "an official page that does not say it");
  const prep = await f("preparation"); assert.equal(prep.status, "confirmed"); assert.equal(prep.value.answerKind, "guidance"); assert.match(prep.value.label, /general guidance/); assert.equal(prep.value.pageable, false);
  const oth = await f("other questions"); assert.equal(oth.status, "unconfirmed"); assert.match(oth.why, /states 3, which no confirmed fact says — general guidance may state no number/);
  const gs = await f("other questions~council-good-letter"); assert.equal(gs.status, "confirmed"); assert.equal(gs.value.pageable, true, "the owner's own question, answered on the council's page");
  assert.equal(r.stats.pageable, 3);
  /* YouTube's words: in their own table for 30 days, never in a fact, never anything personal */
  const all = JSON.stringify(await store.facts());
  assert.doesNotMatch(all, /OET at home from Lahore|\+92|Hi sir|vid1/, "a comment's words never reach a fact");
  assert.deepEqual((await store.questions({ product: "oet", country: "Pakistan", source: "youtube" })).map((q) => q.text), ["can I take OET at home from Lahore?"]);
  assert.deepEqual(yt.calls, { search: 1, comments: 2 });
});

test("B · RR-330: nothing asked twice — the same day no AI and no YouTube; YouTube again after a week; a comment's words deleted after 30 days; no AI key → the fee only, said plainly", async () => {
  const store = cfMemoryStore(), kw = await kwDb(), yt = standInYouTube(), A = answersAi();
  await oneCountry({ store, kw, yt, A });
  const again = await oneCountry({ store, kw, yt, A });
  assert.equal(A.calls.length, 1, "answers of the last 30 days are not asked again"); assert.deepEqual(yt.calls, { search: 1, comments: 2 }, "YouTube once a week a country"); assert.equal(again.state, "done");
  yt.set([]);
  const later = new Date(T0 + 31 * 864e5).toISOString().slice(0, 10);
  await oneCountry({ store, kw, yt, A, today: later });
  assert.equal(yt.calls.search, 2, "read again after a week");
  assert.equal((await store.questions({ product: "oet", country: "Pakistan", source: "youtube" })).length, 0, "YouTube's rule: a comment's words are kept 30 days at most");
  const s2 = cfMemoryStore(), r = await oneCountry({ store: s2, kw, yt: standInYouTube(), A: answersAi(), aiOn: false });
  assert.equal(r.state, "waiting"); assert.match(r.note, /the AI is not connected yet \(ANTHROPIC_API_KEY\) — only the fee questions are answered/);
  assert.equal((await s2.fact("question|Pakistan|fees")).status, "confirmed");
  assert.equal(CF_QUESTIONS.rawDays, 30);
});

/* ── C ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const tlsError = (code) => Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error(code), { code }) });
test("C · RR-330: an official site's missing chain certificate is fetched from the address its own certificate names, and the page asked again WITH FULL VERIFICATION; a self-signed site, a POST, a private issuer address: never", async () => {
  const issuerPem = tls.rootCertificates[0], seen = [];
  const base = async (url, init = {}) => { const u = String(url); seen.push(u); if (u.startsWith("https://council.gov.zz")) throw tlsError("UNABLE_TO_VERIFY_LEAF_SIGNATURE"); if (u.startsWith("https://selfsigned.gov.zz")) throw tlsError("DEPTH_ZERO_SELF_SIGNED_CERT"); if (u === "http://issuer.example/ca.crt") return new Response(issuerPem, { status: 200 }); return new Response("ok", { status: 200 }); };
  const asked = [];
  /* every site here names a usable issuer address — so each refusal below is its own rule's, not another's */
  const f = chainFetch(base, { peerCert: async () => ({ infoAccess: { "CA Issuers - URI": ["http://issuer.example/ca.crt"] } }), request: async (u, o) => { asked.push({ u: String(u), o }); return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } }); }, allowed: async (u) => !/^http:\/\/10\./.test(u), roots: ["ROOT-A"] });
  const r = await f("https://council.gov.zz/robots.txt", { method: "GET", headers: { "User-Agent": "AlmiVisibility" } });
  assert.equal(r.status, 200); assert.match(await r.text(), /Allow: \//);
  assert.equal(asked.length, 1); assert.deepEqual(asked[0].o.ca, ["ROOT-A", new (await import("node:crypto")).X509Certificate(issuerPem).toString()], "the trusted roots plus the issuer the site's own certificate names");
  assert.equal(asked[0].o.headers["user-agent"], "AlmiVisibility");
  await f("https://council.gov.zz/contact"); assert.equal(seen.filter((u) => u === "http://issuer.example/ca.crt").length, 1, "the issuer fetched once a site");
  await assert.rejects(() => f("https://selfsigned.gov.zz/robots.txt"), /fetch failed/, "a self-signed site is never read");
  await assert.rejects(() => f("https://council.gov.zz/form", { method: "POST" }), /fetch failed/, "only a GET");
  const g = chainFetch(async (url) => { if (String(url).startsWith("http://10.0.0.1/")) return new Response(issuerPem, { status: 200 }); throw tlsError("UNABLE_TO_GET_ISSUER_CERT_LOCALLY"); }, { peerCert: async () => ({ infoAccess: { "CA Issuers - URI": ["http://10.0.0.1/ca.crt"] } }), request: async () => assert.fail("asked again"), allowed: async (u) => !/^http:\/\/10\./.test(u) });
  await assert.rejects(() => g("https://other.gov.zz/"), /fetch failed/, "an issuer at a private address is never fetched");
  /* the only unverified connection only LOOKS at the certificate; every read verifies */
  const src = readFileSync(new URL("../site/chain-fetch.mjs", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal(src.match(/rejectUnauthorized: false/g)?.length, 1); assert.match(src, /getPeerCertificate\(false\); s\.destroy\(\)/); assert.match(src, /rejectUnauthorized: true/);
  assert.deepEqual([...CHAIN.codes], ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "UNABLE_TO_GET_ISSUER_CERT"]);
});

test("C · RR-330: a council or rule page that could not be read is NAMED in the next day's search, so another official page is given (the cause of most of the 0s)", async () => {
  const clock = { t: T0 }, prompts = [];
  const rd = { read: async (u) => ({ ok: false, url: u, why: "its robots.txt could not be read (robots.txt could not be read: fetch failed) — not read now, tried again on the next run", checkedOn: ON }), sitemapOf: async () => ({ ok: true, urls: [] }), raw: async () => null, requests: () => 0 };
  const ai = async ({ prompt, schema }) => { prompts.push({ kind: schema.properties.councils ? "councils" : schema.properties.rules ? "rules" : "other", prompt });
    if (schema.properties.councils) return { ok: true, usd: 0.1, searches: 2, data: { councils: [{ profession: "nursing", name: "Invented Nursing Council", nameType: "council", website: "https://inc.zz", address: "1 Invented Road", sourceUrl: "https://inc.zz/contact" }] } };
    if (schema.properties.rules) return { ok: true, usd: 0.1, searches: 2, data: { rules: [{ kind: "attestation", rule: "Documents are attested first.", quote: "All documents must be attested by the ministry before they are sent abroad", sourceUrl: "https://mofa.gov.zz/attestation" }] } };
    return { ok: true, usd: 0, searches: 0, data: { answers: [] } }; };
  const store = cfMemoryStore(), run = () => runCountryFacts({ store, reader: rd, ai, env: { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", COUNTRY_FACTS_AI_USD_PER_DAY: "10" }, now: () => clock.t, budgetMs: 1e9, countries: ["Pakistan"], subject: SUBJECT, products: ["oet"] });
  await run();
  assert.equal((await store.fact("council|Pakistan|nursing")).status, "unconfirmed");
  assert.doesNotMatch(prompts.find((p) => p.kind === "councils").prompt, /could NOT be opened/, "the first day names nothing");
  clock.t += 864e5; await run();
  const c2 = prompts.filter((p) => p.kind === "councils")[1]?.prompt ?? "";
  assert.match(c2, /These pages could NOT be opened by our program[^\n]*https:\/\/inc\.zz\/contact[^\n]*Give a DIFFERENT official page/);
  clock.t += 31 * 864e5; await run();
  assert.match(prompts.filter((p) => p.kind === "rules").at(-1).prompt, /could NOT be opened[^\n]*https:\/\/mofa\.gov\.zz\/attestation/, "the rules too, when they are asked again");
});

/* ── the store's questions: memory, and real Postgres when ALMIV_TEST_PG_URL names a throwaway one on this computer ─────────────── */
const PG_URL = process.env.ALMIV_TEST_PG_URL ?? "", PG_MODULE = process.env.ALMIV_TEST_PG_MODULE ?? "";
const pgOk = /^postgres(ql)?:\/\/[^@]*@127\.0\.0\.1:\d+\//.test(PG_URL) && PG_MODULE;
const STORES = [["memory", async () => cfMemoryStore()], ...(pgOk ? [["postgres", async () => { const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default; const p = new Pool({ connectionString: PG_URL }); await p.query("DROP TABLE IF EXISTS cf_fact, cf_history, cf_task, cf_day, cf_photo, cf_question CASCADE"); await p.end(); return cfPgStore({ url: PG_URL, Pool }); }]] : [])];
for (const [name, make] of STORES) {
  test(`B · RR-330 the store's questions (${name}): the same question twice is one row; the newest first; one source or all; a comment's words deleted by their date; no other source`, async () => {
    const s = await make();
    try {
      assert.deepEqual(await s.putQuestions({ product: "oet", country: "Pakistan", source: "youtube", items: [{ text: "Can I take OET at home?", ref: "v1" }, { text: "can i take oet at home?", ref: "v2" }], at: `${ON}T01:00:00Z` }), { added: 1 }, "the same words, another case: one question");
      assert.deepEqual(await s.putQuestions({ product: "oet", country: "Pakistan", source: "owner", items: [{ text: "How do I get a good standing letter?" }], at: `${ON}T02:00:00Z` }), { added: 1 });
      assert.deepEqual(await s.putQuestions({ product: "oet", country: "Pakistan", source: "owner", items: [{ text: "How do I get a good standing letter?" }], at: `${ON}T03:00:00Z` }), { added: 0 });
      assert.deepEqual((await s.questions({ product: "oet", country: "Pakistan" })).map((q) => [q.source, q.text]), [["owner", "How do I get a good standing letter?"], ["youtube", "Can I take OET at home?"]]);
      assert.equal((await s.questions({ product: "oet", country: "Pakistan", source: "youtube" }))[0].ref, "v2", "the latest reading's video");
      assert.equal(await s.dropQuestions({ source: "youtube", before: `${ON}T01:30:00Z` }), 1); assert.equal(await s.dropQuestions({ source: "youtube", before: `${ON}T01:30:00Z` }), 0);
      assert.equal((await s.questions({ product: "oet", country: "Pakistan" })).length, 1, "the owner's question stays");
      assert.equal((await s.questions({ product: "cv", country: "Pakistan" })).length, 0, "another product's are its own");
      await assert.rejects(() => s.putQuestions({ product: "oet", country: "Pakistan", source: "reddit", items: [{ text: "x" }], at: ON }), /no such question source: reddit/);
    } finally { await s.close(); }
  });
}

/* ── D ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
function fakeKv() {
  const m = new Map();
  const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) });
  return { fetchImpl, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) };
}
test("D · RR-330: /owner/countries — the first 15 countries' progress and ETA first; a country's questions (asked, groups, a page may carry); the owner pastes his questions, one a line, due at once; never without his cookie", async () => {
  const store = cfMemoryStore(), K = fakeKv(), env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", OWNER_ACCESS_KEY: OWNER_KEY, CRON_SECRET: "cron-secret-for-tests-1234", ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000" };
  await store.putFact({ key: "question|Pakistan|home", country: "Pakistan", part: "questions", kind: "question", value: { group: "home", intent: "home", sig: ["home"], question: "can i take oet at home", answer: "Yes …", answerKind: "official", count: 2, volume: 120, sources: { keywords: 1, youtube: 1, owner: 0 }, pageable: true }, sourceUrl: "https://oet.example/x", readOn: ON, status: "confirmed", proposedBy: "ai", aiWritten: true }, { at: `${ON}T10:00:00Z` });
  await store.setTask("Pakistan", "questions", { day: ON, state: "done", note: "n", tried: { stats: { asked: 9, groups: 7, pageable: 3, sources: { keywords: 6, youtube: 1, owner: 2 }, youtube: "1 questions under 2 videos (1 new)" } } });
  const app = createApp({ mode: "public-lite", env, kvFetch: K.fetchImpl, kwStore: memoryStore(), cfStore: store, cfReader: reader(), cfAi: async () => ({ ok: false, why: "not used" }), now: () => T0 });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, T0).split(";")[0];
  const req = async (p, { method = "GET", form = null, owner = true } = {}) => { const r = await fetch(base + p, { method, redirect: "manual", headers: { ...(owner ? { cookie } : {}), ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, body: form ? new URLSearchParams(form).toString() : undefined }); return { status: r.status, text: await r.text() }; };
  try {
    const top = (await req("/owner/countries")).text;
    assert.match(top, /<b>First 15 countries: \d+% done<\/b> · fee 0\/15 · questions 1\/15 · centres 0\/15 · councils 0\/15 \(a council for 0 of 180 professions\) · rules 0\/15/);
    assert.match(top, /15 still to try in full — every part tried once by about 2026-\d\d-\d\d at today's caps \(an estimate until 3 countries are measured\)/);
    assert.ok(top.indexOf("First 15 countries") < top.indexOf("All 197 countries, in the queue's order"), "the first 15 first");
    const pk = (await req("/owner/countries?c=Pakistan")).text;
    assert.match(pk, /<summary>Questions people ask \(1 groups\)<\/summary><p><b>9<\/b> questions asked \(keywords 6 · YouTube 1 · yours 2\) · <b>7<\/b> groups · <b>3<\/b> a page may carry<\/p>/);
    assert.match(pk, /<li><b>can i take oet at home<\/b> — 2 asked, 120 searches a month · official answer · <b>a page may carry it<\/b><\/li>/);
    assert.match(pk, /Reddit: off \(its terms do not allow our commercial use without Reddit's approval\)/);
    assert.match(pk, /councils 0 of 12 professions/);
    const saved = await req("/owner/countries/questions", { method: "POST", form: { country: "Pakistan", text: "Can I give OET from Lahore?\n2) How do I get a good standing letter?\n" } });
    assert.equal(saved.status, 200); assert.match(saved.text, /Saved 2 questions \(2 new\) for Pakistan — grouped and answered on the collector's next run\./);
    assert.deepEqual((await store.questions({ product: "oet", country: "Pakistan", source: "owner" })).map((q) => q.text).sort(), ["Can I give OET from Lahore?", "How do I get a good standing letter?"]);
    assert.equal((await store.tasks()).get("Pakistan|questions").state, "retry", "due at the next run");
    assert.match((await req("/owner/countries?c=Pakistan")).text, /Can I give OET from Lahore\? <span class="fine">\(yours\)<\/span>/);
    assert.equal((await req("/owner/countries/questions", { method: "POST", form: { country: "Atlantis", text: "x y z q?" } })).status, 400);
    assert.equal((await req("/owner/countries/questions", { method: "POST", form: { country: "Pakistan", text: "  " } })).status, 400);
    assert.equal((await req("/owner/countries/questions", { method: "POST", form: { country: "Pakistan", text: "Can I?" }, owner: false })).status, 403);
  } finally { await new Promise((r) => srv.close(r)); }
});
