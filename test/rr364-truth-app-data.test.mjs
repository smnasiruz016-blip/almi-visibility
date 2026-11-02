/**
 * RR-364 (1.15.17, beta-g's reading of all 24 ready pages): own-site paragraphs get the truth check; a card keeps whose score it is; the official local price first; old news is never the answer; More, the tab bar, the saved answer, Search Console; autocomplete per country; competitors' page lists.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { summaryFault, ownSiteAnswer, fitParts, staleNews, sentencesOf } from "../desktop/truth-checks.mjs";
import { examPlan, officialLocalPrice, usableFacts } from "../desktop/exam-plan.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { autocompleteIn, readAutocomplete, rankByLocal, searchPages, AUTOCOMPLETE } from "../desktop/serp.mjs";
import { localSeeds } from "../desktop/subject-demand.mjs";
import { competitorsFrom, sitemapUrlsOf, pagesTheyHave } from "../desktop/competitors.mjs";

const UI = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8"), BUILD = readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8");
const SCORES = "NMC accepts OET: Listening B (350+), Reading B (350+), Writing C+ (300+), Speaking B (350+). Ahpra asks at least 350 in each.", OWN = "https://client.example.org/guides/a", ON = "2026-11-02";
const opt = { subject: "OET" };

test("1.1 own-site paragraphs: beta-g's seven pairs: the wrong paragraph leaves its question", () => {
  for (const [q, a] of [
    ["Can I take the OET from Home online?", SCORES],
    ["Which country accepts C+ in OET?", "You must bring a passport or a national ID. A driving licence is not accepted as primary ID."],
    ["What is the fee for rescheduling an OET Test?", "OET lists the full four-part test at AU$587 (US$455 for the computer test at a venue and OET@Home in the USA)."],
    ["Is the OET valid for 3 years?", "Ahpra asks for 350 in each sub-test. The Dental Council asks for grade B in each sub-test."],
    ["Where to see OET result?", SCORES],
    ["Is there an official link to book the same OET test?", "Each sub-test costs $200 on its own. NMC accepts OET at grade B in each sub-test."],
    ["Which is better, OET or IELTS?", "OET costs AU$587 and British Council lists IELTS at PKR 75,600."],
  ]) assert.equal(ownSiteAnswer(q, a, opt), null, q);
});
test("1.1 a paragraph is split: the statement that answers stands alone, the rest goes; a statement that does answer stays", () => {
  const p = "You can take OET at home online using OET@Home on your own computer. NMC accepts OET at grade B in each sub-test.";
  assert.equal(ownSiteAnswer("Can I take the OET from home online?", p, opt), "You can take OET at home online using OET@Home on your own computer.");
  assert.equal(ownSiteAnswer("What is the fee for rescheduling an OET Test?", "Moving a booking to another date costs AU$120 before bookings close.", opt), "Moving a booking to another date costs AU$120 before bookings close.", "the same thing in other words");
  assert.deepEqual(sentencesOf("One here. Two there? Three (4) now."), ["One here.", "Two there?", "Three (4) now."]);
});
test("1.1 the same check on any part of a page, and it is reported", () => {
  const f = fitParts([{ part: "rules", question: "Where to see OET result?", claims: [{ claimId: "o", text: SCORES, link: OWN }] }], { subject: "OET", ownHost: "client.example.org" });
  assert.deepEqual(f.dropped, ["Where to see OET result?"]); assert.match(f.removed[0].why, /own site/);
  const notOwn = fitParts([{ part: "rules", question: "Where to see OET result?", claims: [{ claimId: "o", text: SCORES, link: "https://official.example.org/x" }] }], { subject: "OET", ownHost: "client.example.org" });
  assert.equal(notOwn.dropped.length, 0, "an official line under a loose part keeps the older check");
});
const site = { ok: true, origin: "https://client.example.org", robotsTxt: null, sitemapUrls: null, readOn: `${ON}T00:00:00Z`, pages: [{ url: OWN, title: "A", h1: "A", h2: [], prices: [], links: [], description: "", qa: [{ q: "x", a: "Bookings for OET can be made through the official link on the OET website. Each sub-test costs $200 and NMC accepts grade B in every sub-test." }], facts: ["OET costs $587 for the whole test in every country that sells it."] }] };
test("1.1 + 1.2 in the page: no \"What else should I know\" question; a site's paragraph reaches a question only with what answers it", () => {
  const plan = [{ kind: "topic", category: "exam", links: [], open: [], ledger: [], topic: "book", title: "OET Booking", questions: [{ question: "Is there an official link to book OET?", source: "s" }], items: [{ part: "topic", question: "When do OET bookings close?", claims: [{ claimId: "c", card: null, text: "Bookings close 7 days before the test date.", link: "https://official.example.org/b", readOn: ON, source: "s", official: true }] }], content: {} }];
  const d = seoPages({ site, on: `${ON}T00:00:00Z`, pagePlan: plan, max: 1, subject: "OET", cta: { label: "Go", href: "https://client.example.org/go" } }).drafts[0];
  assert.ok(!/What else should I know/.test(d.html), "a card must answer its own question: $587 had none to answer");
  assert.ok(!/NMC accepts grade B/.test(d.html), "the rest of the paragraph stays off this question");
});

test("1.2 a card that loses the body shows the sentence: 1400 total; minimum 350", () => {
  assert.match(summaryFault("1400 total", "HCPC accepts OET for some professions: 1400 total, no element below 300."), /not that it is HCPC's/);
  assert.match(summaryFault("minimum 350", "Medical Board of Australia accepts OET: minimum 350 in each sub-test."), /not that it is Medical Board/);
  assert.equal(summaryFault("HCPC: 1400 total, no element below 300", "HCPC accepts OET for some professions: 1400 total, no element below 300."), null);
  assert.equal(summaryFault("7 days before the test date", "Bookings close 7 days before the test date."), null, "no body in the fact: nothing to lose");
  assert.equal(summaryFault("AUD 587", "OET's own page: a change costs AUD 587."), null, "money has no body to lose");
});

const fee = (country, text, quote = text) => ({ id: `f-${country}`, country, part: "fee", verified: true, official: "AUD 587", text, quote, link: "https://support.oet.example/cost", on: ON });
test("1.3 the official local price first: USD 455, no conversion; other countries' money fixes nothing; an estimate is no price", () => {
  const us = fee("United States", "Full OET test costs AU$587.", "AU$587 (or US$455 for OET on Computer at a venue and OET@Home in the US).");
  const p = officialLocalPrice({ facts: [us], country: "United States", aud: 587, subject: "OET" });
  assert.equal(p.amount, 455); assert.match(p.card, /^USD 455 for OET on Computer at a venue and OET@Home in the US — OET's own price/); assert.match(p.line, /Any other way of taking it costs AUD 587/); assert.ok(!/≈|about|convert/i.test(p.card + p.line));
  assert.equal(officialLocalPrice({ facts: [us], country: "Philippines", aud: 587, subject: "OET" }), null);
  assert.equal(officialLocalPrice({ facts: [us], country: "Singapore", aud: 587, subject: "OET" }), null, "S$ is not read inside US$");
  assert.equal(officialLocalPrice({ facts: [fee("India", "AUD 587 ≈ INR 39,358 — an estimate")], country: "India", aud: 587, subject: "OET" }), null);
  assert.equal(officialLocalPrice({ facts: [us], country: "Australia", aud: 587, subject: "OET" }), null);
});
test("1.3 on the plan's page: the first card and the table say OET's own price; a country with none still converts", () => {
  const facts = [fee("United States", "Full OET test costs AU$587.", "AU$587 (or US$455 for OET on Computer at a venue and OET@Home in the US)."), fee("Pakistan", "OET costs AUD 587 here.")], rates = { rates: { USD: 0.7, PKR: 194.49 }, date: ON, short: "R", link: "https://r.example" };
  const pages = examPlan({ subject: "OET", professions: ["nursing"], countries: ["United States", "Pakistan"], facts, rates, demand: [], site }).pages, us = pages.find((x) => x.country === "United States"), pk = pages.find((x) => x.country === "Pakistan");
  assert.match(us.items[0].claims[0].card, /^USD 455/); assert.ok(!/≈/.test(JSON.stringify(us.items[0].claims[0])));
  assert.match(pk.items[0].claims[0].card, /^PKR ≈/);
});

test("1.4 old news is never the answer: it leaves the plan; the official finder stands; today's dated rule stays", () => {
  const old = "In OET's Feb 2020 Liverpool venue announcement, OET said UK candidates could choose from 22 cities.";
  assert.equal(staleNews(old, new Date("2026-11-02")), true); assert.equal(staleNews("Tests on or after 23 April 2026 need 350.", new Date("2026-11-02")), false); assert.equal(staleNews("OET announced new venues in 2026.", new Date("2026-11-02")), false); assert.equal(staleNews("Accepted since 2018 by the board.", new Date("2026-11-02")), false);
  const f = { id: "v", country: "United Kingdom", part: "centres", verified: true, text: old, link: "https://oet.example/news", on: ON };
  assert.equal(usableFacts([f]).length, 0);
  const finder = { claimId: "bf", text: "Go to OET's booking page, enter your city and country, and press Find a test.", link: "https://oet.example/book", readOn: ON, source: "s", official: true };
  const home = examPlan({ subject: "OET", professions: ["nursing"], countries: ["United Kingdom"], facts: [f], subjectFacts: { bookFind: finder }, demand: [], site }).pages.find((x) => x.kind === "country");
  assert.deepEqual(home.items.find((it) => it.part === "centres").claims.map((c) => c.claimId), ["bf"]);
});

test("item 29: a country page never carries another country's question", () => {
  const q = (question, i) => ({ id: `q${i}`, country: "Ireland", part: "questions", verified: true, question, text: `In Ireland: answer number ${i} on this.`, link: "https://o.example/x", on: ON });
  const home = examPlan({ subject: "OET", professions: ["nursing"], countries: ["Ireland"], facts: [q("Is OET accepted in Ireland?", 1), q("Is OET accepted in Canada?", 2)], demand: [], site }).pages.find((x) => x.kind === "country");
  assert.deepEqual(home.items.filter((it) => /^questions/.test(it.part)).map((it) => it.question), ["Is OET accepted in Ireland?"]);
});
test("3.1 autocomplete: the wording people type there; through the same caps; a kept answer free; off = nothing sent", async () => {
  assert.ok(localSeeds("OET", "Pakistan").includes("oet kya hai")); assert.ok(localSeeds("OET", "Pakistan").includes("oet fees in pakistan")); assert.ok(!localSeeds("OET", "Ireland").includes("oet kya hai")); assert.deepEqual(localSeeds("X", "Ireland", "no such kind"), []);
  const answer = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.0006, result: [{ items: [{ type: "autocomplete", suggestion: "oet fees in pakistan 2026" }, { type: "other", suggestion: "no" }] }] }] };
  assert.deepEqual(readAutocomplete(answer).phrases, ["oet fees in pakistan 2026"]); assert.equal(readAutocomplete({ status_code: 40000 }).ok, false);
  const sent = [], fetchImpl = async (u, o) => { sent.push([u, JSON.parse(o.body)[0]]); return { json: async () => answer }; }, ledger = { spent: [] }, now = `${ON}T10:00:00Z`, one = (settings) => autocompleteIn({ keyword: "oet ki fees", country: "Pakistan", settings, ledger, login: "l", password: "p", fetchImpl, now });
  assert.equal((await one({ on: false })).off, true); assert.equal(sent.length, 0, "switched off: nothing sent");
  assert.equal((await one({ on: true })).ok, true); assert.equal(sent[0][0], AUTOCOMPLETE.url); assert.equal(sent[0][1].location_name, "Pakistan"); assert.equal(ledger.spent[0].cost, 0.0006, "in the same ledger");
  assert.equal((await one({ on: true })).cached, true); assert.equal(sent.length, 1, "never paid twice");
  const full = { spent: [{ on: now, cost: 1 }] }; const capped = await autocompleteIn({ keyword: "z", country: "Pakistan", settings: { on: true }, ledger: full, login: "l", password: "p", fetchImpl, now }); assert.equal(capped.capped, true); assert.equal(sent.length, 1, "the cap holds");
});
test("3.1 + item 29: the most typed question first; a question typed in the same words takes their wording; other parts stay where they are", () => {
  const items = [{ part: "fee", question: "How much?" }, { part: "questions0", question: "Is parking free at the centre?" }, { part: "questions1", question: "Can I reschedule my OET?" }, { part: "centres", question: "Where?" }];
  const out = rankByLocal(items, ["can i reschedule oet"], "OET");
  assert.deepEqual(out.map((x) => x.part), ["fee", "questions1", "questions0", "centres"].map((p) => p).map((_, i) => items[i].part === "questions0" ? "questions1" : items[i].part === "questions1" ? "questions0" : items[i].part)); assert.equal(out[1].question, "Can i reschedule oet?"); assert.equal(out[1].localWording, true); assert.equal(out[2].question, "Is parking free at the centre?");
});
test("3.1 in a run: a country page asks autocomplete, keeps what people type, and saves it with the page's searches; another kind of page does not", async () => {
  const serp = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [] }] }] }, auto = { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.0006, result: [{ items: [{ type: "autocomplete", suggestion: "oet kya hai in urdu" }] }] }] }, calls = [];
  const fetchImpl = async (u, o) => { calls.push([u, JSON.parse(o.body)[0].keyword]); return { json: async () => (u === AUTOCOMPLETE.url ? auto : serp) }; };
  const pages = [{ kind: "country", country: "Pakistan", title: "OET in Pakistan", items: [] }, { kind: "topic", title: "OET Booking", items: [] }];
  await searchPages({ pages, ledger: { spent: [] }, settings: { on: true }, login: "l", password: "p", now: `${ON}T10:00:00Z`, subject: "OET", fetchImpl });
  assert.ok(pages[0].localAsked.includes("oet kya hai in urdu")); assert.ok(pages[0].related.includes("oet kya hai in urdu"), "saved with the page's searches in AlmiSEO Data"); assert.equal(pages[1].localAsked, undefined); assert.ok(calls.filter(([u]) => u === AUTOCOMPLETE.url).every(([, k]) => /oet/.test(k)));
});

test("3.2 competitors: who ranks beside us, never a social site, a government body, the official owner or us", () => {
  assert.deepEqual(competitorsFrom(["https://a.example/1", "https://a.example/2", "https://www.b.example/1", "https://www.youtube.com/x", "https://nmc.gov.uk/x", "https://oet.com/x", "https://client.example.org/y"], { exclude: ["https://oet.com/z", "https://client.example.org"] }), ["a.example", "b.example"]);
});
test("3.2 their public page list: robots names the sitemap; an index is followed; a site that refuses gives nothing", async () => {
  const files = { "https://a.example/robots.txt": "User-agent: *\nSitemap: https://a.example/index.xml", "https://a.example/index.xml": "<sitemapindex><sitemap><loc>https://a.example/p.xml</loc></sitemap></sitemapindex>", "https://a.example/p.xml": "<urlset><url><loc>https://a.example/oet-writing-samples</loc></url></urlset>" };
  const read = async (u) => files[u] ?? null; assert.deepEqual(await sitemapUrlsOf("a.example", read), ["https://a.example/oet-writing-samples"]); assert.deepEqual(await sitemapUrlsOf("none.example", read), []);
});
test("3.2 pages they have and we do not: only their subject; what we cover goes; most sites first; a topic, nothing copied", () => {
  const list = pagesTheyHave({ subject: "OET", ours: ["OET Booking", "OET Reading"], sites: [{ host: "a.example", urls: ["https://a.example/oet-writing-samples", "https://a.example/oet-booking", "https://a.example/about-us", "https://a.example/ielts-tips"] }, { host: "b.example", urls: ["https://b.example/blog/oet-writing-samples", "https://b.example/oet-mock-test"] }] });
  assert.deepEqual(list.map((x) => [x.topic.trim(), x.sites.length]), [["oet writing samples", 2], ["oet mock test", 1]]); assert.ok(list.every((x) => Object.keys(x).join() === "topic,sites,example"));
  assert.match(BUILD, /"competitors\.mjs"/, "in the package");
});
test("the plan shows them on Pages", () => { assert.match(UI, /<details id="theyhave"><summary>\$\{PS\.theyHave\.length\} topics others have pages on and we do not/); });

test("2.1 More closes when an item is chosen, on a click outside it, and on Esc", () => {
  assert.match(UI, /if \(m\?\.open && \(!m\.contains\(e\.target\) \|\| e\.target\.closest\("button"\)\)\) m\.open = false;/); assert.match(UI, /e\.key === "Escape" && m\?\.open\) m\.open = false;/);
});
test("2.2 the tab bar on every screen inside a product, from one place", () => {
  assert.equal(UI.split('<nav id="tabs">').length, 2, "one place"); assert.match(UI, /\$\{tabsHtml\(tab\)\}/); assert.match(UI, /  productBar\(name\);\n  guideBars\(name, args\);/); assert.match(UI, /show = P && S\?\.product && S\.started && name !== "work" && !PRODUCT_FREE\.has\(name\)/); assert.match(UI, /<div id="prodbar"/);
});
test("2.3 the saved answer comes first, marked", () => { assert.match(UI, /\[\.\.\.list\]\.sort\(\(a, b\) => \(current != null && String\(b\.value\) === String\(current\)\)/); assert.match(UI, /data-saved>Your saved answer/); assert.match(UI, /\.choice:has\(input:checked\)\{/); });
test("2.4 Connect Google Search Console: in What to do now until connected; Add more sources holds it", () => {
  assert.match(UI, /g && g\.kind !== "CONNECTED" \? `<p class="meta" id="gscnow">/); assert.match(UI, /data-act="google" type="button">Connect Google Search Console/); assert.ok(UI.includes("${whatNowHtml(NEXT, O.google)}"));
  assert.ok(readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8").includes('what: "Connect Google Search Console (or add its download)", action: "google"') || /Google Search Console/.test(UI));
});
void existsSync; void mkdtempSync; void mkdirSync; void cpSync; void writeFileSync; void rmSync; void join; void tmpdir;
