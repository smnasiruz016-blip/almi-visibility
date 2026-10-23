/**
 * RR-318 — WEBSITE TO TOP CLASS, PART 1 + 2 (owner, 23 Oct 2026; his live test on AlmiOET with 1.4.4 and a real Search Console):
 *   A  "Write better with AI" for every website text, with the YouTube truth guard (templates stay when the AI invents);
 *   B  the 7 findings: written descriptions · FAQ answers whole, without source lines · the real Organization name and logo · duplicates merged
 *      by the gate · new-page answers from the right country and the OFFICIAL body · Connected ✓ at the top, the Connect card gone · FAQ truth;
 *   C  "How many pages can I make?": dimensions → the reality filter on official pages → the honest advice → the drafts;
 *   D  Search Console power: rank tracking, opportunities, alerts; the Generative AI report said plainly.
 * Everything runs on this computer: stand-in official sites, a stand-in Google and a stand-in AI. No real browser is opened.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { readPage } from "../desktop/site-read.mjs";
import { writtenDescriptions, cleanAnswer, siteNameOf, organizationLd, newPageDescription, FAQ_TRUTH, wholeSentences } from "../desktop/web-text.mjs";
import { fixForMe } from "../desktop/product-check.mjs";
import { seoPages, sameNeed, answersFromSite } from "../desktop/seo-pages.mjs";
import { countriesIn, originsIn, destinationsIn } from "../desktop/world.mjs";
import { officialReader, itemOnSubjectSite, officialClaims, bodiesIn } from "../desktop/official.mjs";
import { realityFilter, advise, listFromFile, professionOf, professionPagesOf } from "../desktop/page-count.mjs";
import { searchPower, mergeHistory, rankTracking, opportunities, alerts, GENAI } from "../desktop/search-power.mjs";
import { writeWebWithAI, webMaterial, judgeWeb } from "../desktop/web-ai.mjs";
import { menuFor } from "../desktop/features.mjs";
import { googleConnect } from "../desktop/google-connect.mjs";
import { webModelFetch, webModelReply } from "./support/web-model-standin.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
const ON = "2026-10-23";

/* the owner's AlmiOET, as its pages are built: an FAQ answer with its source link, its "· checked" stamp, a comparison table and "Also asked" */
const LONG = "For an OET taken on or after 23 April 2026, Ahpra's National Boards ask for at least 350 in Listening, 360 in Reading, 350 in Writing and 360 in Speaking. The Medical Council of Ireland asks for a pass in OET Medicine with at least grade B in each module, in a single sitting within the last two years. The Medical Council of New Zealand asks doctors for at least 350 in Speaking, Listening and Reading and 300 in Writing in the OET Medicine.";
const FAQ_HTML = `<html><head><title>OET for Doctors 2026: Score, Fees &amp; Writing Samples</title></head><body><main><h1>OET for Doctors 2026: Score, Fees &amp; Writing Samples</h1><h2>Key facts</h2><h2>Questions and answers</h2>
<details><summary>What OET score do doctors need?</summary>
<p data-claim-id="1">For an OET taken on or after 23 April 2026, Ahpra's National Boards ask for at least 350 in Listening, 360 in Reading, 350 in Writing and 360 in Speaking. <a class="src" href="https://www.ahpra.gov.au/x">Source: Ahpra — Transition arrangements, April 2026 (PDF)</a><span class="src"> · checked 2026-10-16</span></p>
<p data-claim-id="2">The Medical Council of Ireland asks for a pass in OET Medicine with at least grade B in each module, in a single sitting within the last two years. <a class="src" href="https://www.medicalcouncil.ie/x">Source: Medical Council of Ireland — English language requirements</a><span class="src"> · checked 2026-10-15</span></p>
<p data-claim-id="3">The Medical Council of New Zealand asks doctors for at least 350 in Speaking, Listening and Reading and 300 in Writing in the OET Medicine. <a class="src" href="https://www.mcnz.org.nz/x">Source: Medical Council of New Zealand — English language policy</a><span class="src"> · checked 2026-10-15</span></p>
<table class="cmp"><caption>The OET result each regulator asks of doctors</caption><tr><th>Ireland — Medical Council of Ireland</th><td>at least grade B <a class="src" href="https://www.medicalcouncil.ie/x">Source: Medical Council of Ireland</a></td></tr></table>
<p class="also">Also asked: What OET score do doctors need in New Zealand? · What OET score do doctors need in Ireland?</p></details>
<details><summary>How is the Occupational English Test scored?</summary><p>Each sub-test is scored from 0 to 500 with a likely grade — A, B, C+ or C, or no letter at all where OET publishes no band; we do not convert your practice into an official score. Source: OET — Results and scoring · checked 2026-10-15</p></details>
</main></body></html>`;

/* ══ B2 · FAQ answers whole, never cut, no source lines ══ */
test("B2 · FAQ ANSWERS are never cut mid-word and never carry 'Source …', '· checked …', 'Also asked' or the comparison table — the sources stay on the page", () => {
  const p = readPage(FAQ_HTML, "https://almioet.test/guides/oet-for-doctors");
  const a = p.qa.find((x) => x.q === "What OET score do doctors need?").a;
  assert.equal(a, LONG, "the answer is not the page's whole answer, without its source lines");
  assert.ok(a.length > 400, "an answer over the old 400-character cut");
  const b = p.qa.find((x) => /scored/.test(x.q)).a;
  assert.match(b, /we do not convert your practice into an official score\.$/, "the second answer was cut");
  for (const x of p.qa) assert.doesNotMatch(x.a, /Source:|checked 20\d\d|Also asked|each regulator asks/, x.a);
  assert.equal(cleanAnswer("Yes, online. Source: OET — The OET Test · checked 2026-10-15 Also asked: Is it hard?"), "Yes, online.");
  assert.equal(wholeSentences("One two three. Four five six seven.", 20), "One two three.");
  assert.equal(wholeSentences("A sentence that is far too long to fit.", 10), null, "a text shorter than its first sentence must say so, never cut it");
  /* the page's own structured data is read FIRST — its clean answer, not the open/close text */
  const ld = readPage(`<html><body><script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Is OET hard?","acceptedAnswer":{"@type":"Answer","text":"It tests the English of your own profession."}}]}</script><details><summary>Is OET hard?</summary>It tests the English. Source: X · checked 2026-10-15</details></body></html>`, "https://x.test/");
  assert.deepEqual(ld.qa.map((x) => [x.a, x.from]), [["It tests the English of your own profession.", "structured data"]]);
});

/* the owner's site, as the app read it on 23 Oct (titles, headings — no HTML kept) */
const SITE = { ok: true, origin: "https://almioet.almiworld.com", readOn: `${ON}T01:22:28Z`, design: { siteName: "OET Practice Test — Clear or Borderline | AlmiOET", logo: null, menu: ["Home"] }, robots: { found: true }, sitemap: { found: true }, brokenLinks: [],
  pages: [
    { url: "https://almioet.almiworld.com/", title: "OET Practice Test — Clear or Borderline | AlmiOET", description: "OET practice on the real 0–500 scale with a grade of A, B, C+ or C per sub-test — see if you're Clear or Borderline before exam day. All 12 healthcare professions. Original material.", h1: "Practise the OET for healthcare with honest AI feedback.", h2: ["An honest estimate, not a fake score", "The four OET sub-tests", "All 12 healthcare professions", "Honest scoring on the real scale", "Simple, honest pricing", "Common questions"], lead: ["OET publishes no conversion from practice, so anyone promising you a precise number from practice is guessing."], facts: [], qa: [{ q: "What grade do I need?", a: "Most regulators ask for a B in each sub-test.", from: "structured data" }], structuredTypes: ["FAQPage"], noindex: false },
    { url: "https://almioet.almiworld.com/guides/oet-for-doctors", title: "OET for Doctors 2026: Score, Fees & Writing Samples", description: null, h1: "OET for Doctors 2026: Score, Fees & Writing Samples", h2: ["Key facts", "Questions and answers"], lead: [], facts: ["The UK's HCPC asks for at least grade B in each OET sub-test."], qa: [{ q: "What OET score do doctors need?", a: `${LONG} Source: Ahpra · checked 2026-10-16`, from: "an open/close answer on the page" }], structuredTypes: [], noindex: false },
    { url: "https://almioet.almiworld.com/pricing", title: "Pricing — 7-day free trial · AlmiOET", description: "AlmiOET Pro — $12/month, cancel anytime.", h1: "Pricing", h2: [], lead: ["Students practise all four sub-tests with honest feedback."], facts: [], qa: [], structuredTypes: [], noindex: false },
  ] };

/* ══ B1 · written descriptions ══ */
test("B1 · META DESCRIPTIONS are WRITTEN — what the reader gets on the page (its heading and what its sections cover) — complete, at most 160, never a body sentence lifted ('…anyone promising you a precise number from practice is guessing')", () => {
  const items = fixForMe("meta-description", SITE);
  const home = items.find((x) => x.page === "https://almioet.almiworld.com/");
  assert.equal(home.options[0].text, "Practise the OET for healthcare with honest AI feedback. Inside: an honest estimate, not a fake score; the four OET sub-tests; all 12 healthcare professions.");
  assert.equal(home.options[1].text, "OET practice on the real 0–500 scale with a grade of A, B, C+ or C per sub-test — see if you're Clear or Borderline before exam day.", "the present description kept to its complete sentences");
  const docs = items.find((x) => /oet-for-doctors/.test(x.page)).options;
  assert.equal(docs[0].text, "OET for Doctors 2026: Score, Fees & Writing Samples. 1 question answered, each with its official source — for example: What OET score do doctors need?");
  for (const o of items.flatMap((x) => x.options)) { assert.ok(o.text.length <= 160, o.text); assert.match(o.text, /[.!?]$/); assert.doesNotMatch(o.text, /guessing|…/); }
  /* a heading of sections that say nothing ("Key facts") is never "what the reader gets" */
  assert.doesNotMatch(docs.map((o) => o.text).join(" "), /Key facts|Questions and answers/);
});

/* ══ B3 · Organization ══ */
test("B3 · ORGANIZATION: the site's real name (what its page titles share — AlmiOET, never a page title) and its logo only when one was found, said plainly when not", () => {
  assert.equal(siteNameOf(SITE), "AlmiOET");
  const o = organizationLd(SITE);
  assert.deepEqual(o.ld, { "@context": "https://schema.org", "@type": "Organization", name: "AlmiOET", url: "https://almioet.almiworld.com" });
  assert.doesNotMatch(o.from, /logo/, "\"from your logo\" claimed without a logo");
  assert.match(o.note, /^No logo was found on your site's home page/);
  const withLogo = organizationLd({ ...SITE, design: { ...SITE.design, logo: "https://almioet.almiworld.com/logo.png" } });
  assert.equal(withLogo.ld.logo, "https://almioet.almiworld.com/logo.png"); assert.match(withLogo.from, /the logo on your home page/); assert.equal(withLogo.note, null);
  const blocks = fixForMe("structured-data", SITE);
  assert.match(blocks[0].paste, /"name": "AlmiOET"/); assert.doesNotMatch(blocks[0].paste, /Clear or Borderline/);
  /* FAQ markup for the page without it; whole answers, no source lines; with what it does today */
  const faq = blocks.find((b) => b.kind === "faq");
  assert.equal(faq.page, "https://almioet.almiworld.com/guides/oet-for-doctors");
  assert.ok(faq.paste.includes(LONG.slice(-60)), "the FAQ answer was cut"); assert.doesNotMatch(faq.paste, /Source:|checked 2026/);
  assert.equal(faq.note, FAQ_TRUTH);
  assert.match(FAQ_TRUTH, /^Google stopped showing FAQ rich results on 7 May 2026/); assert.doesNotMatch(FAQ_TRUTH.replace("does not make them show in Google", ""), /(show|shows|appear|appears)/, "FAQ markup offered as showing in Google");
  assert.ok(!blocks.some((b) => b.kind === "faq" && b.page === "https://almioet.almiworld.com/"), "FAQ markup offered for a page that already carries it");
});

/* ══ B4 · the sameness gate ══ */
test("B4 · DUPLICATES MERGED BY THE GATE: one need per country the person goes to and subject — 'OET Requirements for Ireland' + 'OET Score for Ireland' is ONE page; where they come from never splits", () => {
  assert.ok(sameNeed("oet requirements for ireland", "oet score for ireland"));
  assert.ok(sameNeed("oet for nurses in new zealand", "oet nz"));
  assert.ok(sameNeed("oet for pakistani nurses in the uk", "oet uk"), "the country a person comes from split a question");
  assert.ok(!sameNeed("avbc australia", "oet for australia") && sameNeed("avbc australia", "oet for australia", "OET"), "with the subject known, a search about the same country is a section of its page (the proof found AVBC Australia as a second page)");
  assert.ok(!sameNeed("oet score for ireland", "oet score for canada"));
  assert.ok(!sameNeed("nursing jobs in ireland", "doctor salary in ireland"), "two subjects in one country merged");
  assert.deepEqual(countriesIn("oet nz"), ["New Zealand"]); assert.deepEqual(countriesIn("OET for us"), [], "'us' is a word, not the United States");
  assert.deepEqual(countriesIn("oet score for dubai"), ["United Arab Emirates"]);
  assert.deepEqual(originsIn("Pakistani nurses going from India to the UK"), ["Pakistan", "India"]);
  assert.deepEqual(destinationsIn("from Brazil to Ireland"), ["Ireland"]);
  const sc = { kind: "CONNECTED", window: "2026-07-22 to 2026-10-20", queries: [{ query: "oet requirements for ireland", impressions: 1 }, { query: "oet score for ireland", impressions: 1 }, { query: "oet for nurses in new zealand", impressions: 18 }, { query: "oet nz", impressions: 2 }] };
  const official = { Ireland: [{ claimId: "o1", text: "OET's own page for Ireland says OET is recognised or accepted there.", link: "https://oet.test/ireland", readOn: ON, source: "OET — its page for Ireland", official: true, body: "OET" }], "New Zealand": [{ claimId: "o2", text: "OET's own page for New Zealand says OET is recognised or accepted there.", link: "https://oet.test/nz", readOn: ON, source: "OET — its page for New Zealand", official: true, body: "OET" }] };
  const p = seoPages({ site: SITE, searchConsole: sc, on: `${ON}T00:00:00Z`, official });
  const qs = p.plan.map((r) => r.question);
  assert.equal(qs.filter((q) => /ireland/i.test(q)).length, 1, `two pages for Ireland: ${qs.join(" · ")}`);
  assert.equal(qs.filter((q) => /new zealand|nz/i.test(q)).length, 1);
  const nz = p.plan.find((r) => /New Zealand/.test(r.question));
  assert.equal(nz.question, "OET for Nurses in New Zealand"); assert.deepEqual(nz.alsoAsked, ["OET NZ"]);
});

/* ══ B5 + B6 · the right country, the official body ══ */
test("B5 + B6 · NEW-PAGE ANSWERS: never a line about another country (the Ireland page got the UK's HCPC line); the OFFICIAL answers first, each with its body and date; the description WRITTEN from them", () => {
  const a = answersFromSite("oet score for ireland", SITE);
  assert.ok(a.every((x) => /Ireland/.test(x.text)), a.map((x) => x.text).join(" | "));
  assert.ok(!a.some((x) => /HCPC/.test(x.text)));
  assert.ok(a.every((x) => !/Source:|checked 2026/.test(x.text)), "a source line inside an answer");
  assert.deepEqual(answersFromSite("oet for nurses in new zealand", { ...SITE, pages: [SITE.pages[2]] }), [], "the NZ page took 'Students practise all four sub-tests'");
  const official = { Ireland: [{ claimId: "o1", text: "Medical Council of Ireland names OET on its own page among the English tests it accepts — the results it names with OET: grade B.", link: "https://www.medicalcouncil.ie/x", readOn: ON, source: "Medical Council of Ireland — its own page", official: true, body: "Medical Council of Ireland" }] };
  const p = seoPages({ site: SITE, searchConsole: { kind: "CONNECTED", window: "w", queries: [{ query: "is oet accepted in ireland", impressions: 3 }] }, on: `${ON}T00:00:00Z`, official });
  const row = p.plan.find((r) => /Ireland/.test(r.question));
  assert.equal(row.kind, "NEW"); assert.equal(row.answers[0].body, "Medical Council of Ireland");
  assert.equal(newPageDescription(row.question, row.answers, "AlmiOET"), "Is OET accepted in Ireland? The answer from Medical Council of Ireland's own page (checked 2026-10-23), and how to prepare with AlmiOET.");
  assert.equal(newPageDescription("OET in Chad", [], "AlmiOET"), null, "a description made up with no answer behind it");
});

/* ══ the stand-in official site ══ */
function officialSite() {
  const P = (body, title = "XTEST") => `<html><head><title>${title}</title></head><body><nav>Home Menu</nav><main>${body}</main><footer>© XTEST</footer></body></html>`;
  let base = "";
  const pages = {
    "/recognition/ireland": P("<h1>XTEST for Ireland</h1><p>Take your healthcare career to Ireland with the XTEST, recognised by key regulators nationwide. The Nursing Board of Ireland (NBI), the Irish Medical Board (IMB) and the Dental Council of Ireland are a few organisations that accept the XTEST.</p>", "Ireland | XTEST"),
    "/recognition/canada": P("<h1>XTEST for Canada</h1><p>XTEST is recognised by healthcare regulators in Canada.</p>", "Canada | XTEST"),
    "/recognition/pakistan": P("<h1>XTEST in Pakistan</h1><p>Book your XTEST at a test centre in Pakistan.</p>", "Pakistan | XTEST"),
    "/post/story-brazil": P("<h1>Ana's story</h1><p>Ana, a nurse from Brazil, passed the XTEST required to work in Ireland.</p>"),
    "/post/results-india": P("<h1>Faster results</h1><p>Nurses in India now get faster results from XTEST, the trusted English test.</p>"),
    "/samples/paper/nursing": P("<h1>XTEST Nursing sample</h1><p>The XTEST for nursing.</p>"), "/samples/paper/medicine": P("<h1>XTEST Medicine sample</h1><p>The XTEST for medicine.</p>"),
    "/samples/paper/dentistry": P("<h1>XTEST Dentistry</h1><p>XTEST.</p>"), "/samples/paper/pharmacy": P("<h1>XTEST Pharmacy</h1><p>XTEST.</p>"), "/samples/paper/dietetics": P("<h1>XTEST Dietetics</h1><p>XTEST.</p>"),
    "/board/english": P("<h1>English language requirements</h1><p>The Nursing Board of Ireland accepts the XTEST with grade B in each sub-test, or 350 in each.</p>", "English language | Nursing Board of Ireland"),
    "/board/other": P("<h1>English requirements</h1><p>We accept IELTS with 7 in each band.</p>", "English | Other Board"),
    "/private/rules": P("<p>XTEST accepted.</p>"),
    "/uni/a": P("<h1>Admissions</h1><p>International applicants may show English with the XTEST.</p>"), "/uni/b": P("<h1>Admissions</h1><p>Apply online.</p>"),
  };
  const reads = [];
  const srv = createServer((q, r) => {
    reads.push(q.url);
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nDisallow: /private/\n"); }
    if (q.url === "/sitemap.xml") { r.writeHead(200, { "content-type": "application/xml" }); return r.end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(pages).filter((p) => !/^\/(board|uni|private)/.test(p)).map((p) => `<url><loc>${base}${p}</loc></url>`).join("")}</urlset>`); }
    if (pages[q.url]) { r.writeHead(200, { "content-type": "text/html" }); return r.end(pages[q.url]); }
    r.writeHead(404); r.end();
  });
  return { reads, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}

test("B6 · THE OFFICIAL READER: robots obeyed (a disallowed page is never read), public addresses only, the subject's own page keeps a country only when the SAME sentence says it is recognised there (never 'from Brazil', never 'the trusted test'); a body's own page answers only when it names the subject — else 'the official page, checked <date>, does not say this'", async () => {
  const s = officialSite(); const base = await s.listen();
  try {
    const rd = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    const sm = await rd.sitemapOf(`${base}/`);
    assert.equal(sm.urls.length, 10);
    const k = (c) => itemOnSubjectSite({ item: c, subject: "XTEST", subjectName: "XTEST", sitemapUrls: sm.urls, reader: rd });
    const ie = await k("Ireland");
    assert.deepEqual([ie.kept, ie.source.url, ie.checkedOn], [true, `${base}/recognition/ireland`, ON]);
    assert.deepEqual(ie.bodies, ["Nursing Board of Ireland", "Irish Medical Board", "Dental Council of Ireland"]);
    assert.equal((await k("Canada")).kept, true);
    for (const c of ["Pakistan", "Brazil", "India", "Chad"]) assert.equal((await k(c)).kept, false, `${c} kept`);
    const r = await officialClaims({ country: "Ireland", subject: "XTEST", subjectName: "XTEST", kept: ie, reader: rd, bodyPages: [{ url: `${base}/board/english`, body: "Nursing Board of Ireland" }, { url: `${base}/board/other`, body: "Other Board" }, { url: `${base}/private/rules`, body: "Hidden Board" }] });
    assert.deepEqual(r.claims.map((c) => c.text), ["XTEST's own page for Ireland says XTEST is recognised or accepted there, and names Nursing Board of Ireland, Irish Medical Board, Dental Council of Ireland.", "Nursing Board of Ireland names XTEST on its own page among the English tests it accepts — the results it names with XTEST: grade B, 350."]);
    assert.ok(r.claims.every((c) => c.official && c.readOn === ON && c.link.startsWith(base)));
    assert.deepEqual(r.notSaid.map((n) => n.line), [`The official page of Other Board, checked ${ON}, does not say this.`, `The official page of Hidden Board could not be read on ${ON} (its robots.txt asks us not to read it — not read).`]);
    assert.ok(!s.reads.includes("/private/rules"), "a page robots.txt disallows was read");
    /* never a private address outside tests */
    const real = officialReader({ paceMs: 0, resolve: async () => [{ address: "10.0.0.5", family: 4 }] });
    assert.equal((await real.read("https://intranet.example/")).ok, false);
    assert.deepEqual(bodiesIn("the Dental Council of Ireland Veterinary Council of Ireland The Pharmaceutical Society of Ireland, and the Ministry of Education. Under"), [{ name: "Dental Council of Ireland", short: null }, { name: "Veterinary Council of Ireland", short: null }, { name: "Pharmaceutical Society of Ireland", short: null }, { name: "Ministry of Education", short: null }]);
  } finally { s.close(); }
});

/* ══ C · how many pages ══ */
test("C · HOW MANY PAGES: the chosen dimensions filtered by REALITY on official pages (each kept item with its page and date), then the honest advice — not 197 × N near-identical pages but one page per country with a section per profession", async () => {
  const s = officialSite(); const base = await s.listen();
  try {
    const rd = officialReader({ allowLocal: true, paceMs: 0, on: `${ON}T10:00:00Z` });
    const roles = listFromFile("roles.json", JSON.stringify([{ name: "Registered Nurse", aliases: ["RN"] }, { name: "Pharmacy Technician" }, { name: "Doctor" }, { name: "Software Engineer" }, { name: "Dietitian" }, { name: "Dental Assistant" }])).items;
    const unis = listFromFile("u.json", JSON.stringify([{ name: "Uni A", country: { name: "Ireland" }, subjectSlugs: ["medicine-health-sciences"], admissionsUrl: `${base}/uni/a` }, { name: "Uni B", country: { name: "Ireland" }, subjectSlugs: ["medicine-health-sciences"], admissionsUrl: `${base}/uni/b` }, { name: "Uni C", country: { name: "Brazil" }, subjectSlugs: ["medicine-health-sciences"], admissionsUrl: `${base}/uni/a` }, { name: "Uni D", country: { name: "Canada" }, subjectSlugs: ["law"], admissionsUrl: `${base}/uni/a` }])).items;
    const subjects = [{ name: "medicine-health-sciences" }, { name: "law" }];
    const r = await realityFilter({ dims: ["countries", "roles", "subjects", "universities"], lists: { roles, subjects, universities: unis }, subject: "XTEST", subjectSite: `${base}/`, reader: rd });
    assert.equal(r.ok, true);
    assert.deepEqual(r.dims.countries.kept.map((k) => k.name), ["Canada", "Ireland"]);
    assert.equal(r.dims.countries.candidates, 197);
    assert.ok(r.dims.countries.kept.every((k) => k.source.url.startsWith(base) && k.checkedOn === ON));
    assert.match(r.dims.countries.dropped.find((d) => d.name === "Chad").why, /has no page for it/);
    assert.deepEqual(r.dims.roles.kept.map((k) => [k.name, k.profession]), [["Registered Nurse", "nursing"], ["Doctor", "medicine"], ["Dietitian", "dietetics"]]);
    assert.ok(["Pharmacy Technician", "Dental Assistant", "Software Engineer"].every((n) => r.dims.roles.dropped.some((d) => d.name === n)), "a support role counted as the profession");
    assert.deepEqual(r.dims.subjects.kept.map((k) => k.name), ["medicine-health-sciences"]);
    assert.deepEqual([r.dims.universities.inScope, r.dims.universities.kept.map((k) => k.name), r.dims.universities.dropped.map((d) => d.why)], [2, ["Uni A"], [`its own page, checked ${ON}, does not say this`]]);
    const a = advise(r, { demand: [{ text: "oet score for ireland" }] });
    assert.equal(a.verdict, "BETTER"); assert.equal(a.number, 2); assert.equal(a.line, "No — better this way: 2 pages, one per country.");
    assert.match(a.why, /^Not 9,456 pages \(197 countries × 6 professions \/ job roles × 2 subjects × 4 universities\)/);
    assert.match(a.why, /scaled content abuse/); assert.match(a.sameness, /comes from never splits a question/);
    const ie = a.pages.find((p) => p.item === "Ireland");
    assert.deepEqual(ie.sections.map((x) => [x.dim, x.items]), [["professions / job roles", ["nursing", "medicine", "dietetics"]], ["subjects", ["medicine-health-sciences"]], ["universities", ["Uni A"]]]);
    assert.deepEqual(ie.searched, ["oet score for ireland"]);
    /* one dimension, few kept: "Yes — possible and good" */
    const one = await realityFilter({ dims: ["countries"], lists: {}, subject: "XTEST", subjectSite: `${base}/`, reader: rd });
    assert.equal(advise(one).line, "Yes — possible and good: 2 pages.");
    /* an official site that cannot be read keeps NOTHING */
    const none = await realityFilter({ dims: ["countries"], lists: {}, subject: "XTEST", subjectSite: "http://127.0.0.1:9/", reader: rd });
    assert.equal(none.ok, false); assert.match(none.why, /keeps nothing it cannot check on an official page/);
    assert.equal(professionPagesOf([`${base}/post/a-b`, `${base}/x`]).length, 0);
    assert.equal(professionOf("Veterinary Nurse", [{ slug: "nursing" }])?.slug, "nursing");
    /* the proof found these on the real list: "physician" is not inside "physical"; an oral surgeon is a dentist before a surgeon is a doctor */
    const P3 = [{ slug: "medicine" }, { slug: "dentistry" }, { slug: "physiotherapy" }];
    assert.deepEqual(["Physical Therapist", "Oral Surgeon", "Neurosurgeon", "General Surgeon"].map((n) => professionOf(n, P3)?.slug ?? null), ["physiotherapy", "dentistry", "medicine", "medicine"]);
  } finally { s.close(); }
});

/* ══ D · Search Console power ══ */
const W = (to, rows) => ({ from: to, to, rows });
const HISTORY = { site: "sc-domain:x.test", on: ON, weeks: [
  W("2026-09-01", [{ query: "oet for nurses in new zealand", page: "https://x.test/nz", clicks: 4, impressions: 30, position: 9.0 }, { query: "oet score for ireland", page: "https://x.test/ie", clicks: 3, impressions: 10, position: 4.0 }]),
  W("2026-09-08", [{ query: "oet for nurses in new zealand", page: "https://x.test/nz", clicks: 3, impressions: 25, position: 12.0 }, { query: "oet score for ireland", page: "https://x.test/ie", clicks: 3, impressions: 12, position: 4.2 }]),
  W("2026-09-15", [{ query: "oet for nurses in new zealand", page: "https://x.test/nz", clicks: 2, impressions: 20, position: 11.0 }, { query: "oet score for ireland", page: "https://x.test/ie", clicks: 2, impressions: 9, position: 4.1 }]),
  W("2026-09-22", [{ query: "oet for nurses in new zealand", page: "https://x.test/nz", clicks: 1, impressions: 18, position: 10.0 }, { query: "oet score for ireland", page: "https://x.test/ie", clicks: 0, impressions: 8, position: 9.5 }, { query: "is oet accepted in canada", page: "https://x.test/", clicks: 0, impressions: 1, position: 31 }]),
] };
test("D · SEARCH CONSOLE POWER: rank tracking week by week with the trend; opportunities at position 8–20 with ready text; alerts for a phrase that dropped and a page losing clicks; the Generative AI report said plainly (Google's API does not offer it)", async () => {
  const t = rankTracking(HISTORY);
  const nz = t.rows.find((r) => /new zealand/.test(r.query)), ie = t.rows.find((r) => /ireland/.test(r.query)), ca = t.rows.find((r) => /canada/.test(r.query));
  assert.deepEqual(nz.byWeek, [9, 12, 11, 10]); assert.equal(nz.trend, "better");
  assert.equal(ie.trend, "worse"); assert.equal(ca.trend, "new");
  assert.match(nz.line, /^"oet for nurses in new zealand" → \/nz: position 10 \(was 11\) — 93 impressions, 10 clicks in 4 weeks$/);
  const o = opportunities(HISTORY, { siteName: "AlmiOET" });
  assert.deepEqual(o.map((x) => [x.query, x.position]), [["oet for nurses in new zealand", 10.5]]);
  assert.equal(o[0].ready[0].text, "OET for Nurses in New Zealand | AlmiOET");
  const al = alerts(HISTORY);
  assert.ok(al.some((a) => a.kind === "PHRASE_DROP" && a.query === "oet score for ireland" && /^Refresh \/ie:/.test(a.refresh)));
  assert.ok(!al.some((a) => a.query === "is oet accepted in canada"), "a new phrase is no drop");
  const eight = { ...HISTORY, weeks: [...["08-04", "08-11", "08-18", "08-25"].map((d) => W(`2026-${d}`, [{ query: "q", page: "https://x.test/p", clicks: 5, impressions: 50, position: 3 }])), ...["09-01", "09-08", "09-15", "09-22"].map((d) => W(`2026-${d}`, [{ query: "q", page: "https://x.test/p", clicks: 1, impressions: 50, position: 3 }]))] };
  assert.ok(alerts(eight).some((a) => a.kind === "CLICKS_FALL" && /fell from 20 to 4/.test(a.line)));
  const p = searchPower(HISTORY, { siteName: "AlmiOET" });
  assert.equal(p.genai.available, false); assert.match(p.genai.line, /is not yet given by Google to other programs/); assert.doesNotMatch(p.genai.line, /API/); assert.match(p.genai.line, /Search Console → Performance → Generative AI/);
  assert.equal(GENAI.checkedOn, "2026-10-23");
  assert.equal(p.thin, null, "133 impressions called few");
  assert.match(searchPower({ weeks: [W("2026-09-22", [{ query: "oet nz", page: "https://x.test/", clicks: 0, impressions: 2, position: 14 }])] }).thin, /^Few searches so far: 2 impressions in 1 weeks?. Positions from so few searches move a lot/);
  const m = mergeHistory({ weeks: [W("2026-09-01", []), W("2026-09-08", [])] }, { site: "s", on: ON, weeks: [W("2026-09-08", [{ query: "a" }]), W("2026-09-15", [])] });
  assert.deepEqual(m.weeks.map((w) => [w.to, w.rows.length]), [["2026-09-01", 0], ["2026-09-08", 1], ["2026-09-15", 0]]);
  /* google-connect reads the whole window in ONE request through Google's own Search Analytics service (day, phrase, page; web) and puts
   * it into weeks — a week's position is the days' positions weighted by their impressions (Google's own figures) */
  const asked = [];
  const g = googleConnect({ keys: { get: (n) => (n === "GOOGLE_REFRESH_TOKEN" || n === "GOOGLE_CLIENT_SECRET" ? "x" : null) }, config: { googleClientId: "id.apps.googleusercontent.com", googleTestEndpoints: { auth: "http://127.0.0.1:9/a", token: "http://127.0.0.1:9/t", api: "http://127.0.0.1:9/api/" } }, now: () => Date.parse(`${ON}T12:00:00Z`),
    fetchImpl: async (u, init) => { if (/\/t$/.test(u)) return new Response(JSON.stringify({ access_token: "a", expires_in: 3600 })); asked.push(JSON.parse(init.body)); return new Response(JSON.stringify({ rows: [{ keys: ["2026-10-20", "oet nz", "https://x.test/nz"], clicks: 1, impressions: 1, position: 10 }, { keys: ["2026-10-18", "oet nz", "https://x.test/nz"], clicks: 0, impressions: 3, position: 14 }, { keys: ["2026-10-05", "oet nz", "https://x.test/nz"], clicks: 0, impressions: 2, position: 20.04 }, { keys: ["2026-09-01", "old", "https://x.test/"], clicks: 0, impressions: 1, position: 3 }] })); } });
  const perf = await g.performance("sc-domain:x.test", { weeks: 3 });
  assert.equal(asked.length, 1); assert.deepEqual(asked[0].dimensions, ["date", "query", "page"]); assert.equal(asked[0].type, "web");
  assert.deepEqual([asked[0].startDate, asked[0].endDate], ["2026-09-30", "2026-10-20"]);
  assert.deepEqual(perf.weeks.map((w) => w.to), ["2026-10-06", "2026-10-13", "2026-10-20"]);
  assert.deepEqual(perf.weeks.map((w) => w.rows.map((r) => [r.query, r.impressions, r.position])), [[["oet nz", 2, 20]], [], [["oet nz", 4, 13]]], "the week's position is not the impression-weighted average of its days");
});

/* ══ A · the website's AI writing ══ */
const PAGE = SITE.pages[0];
test("A · WRITE BETTER WITH AI for the website: a fact sheet per page; WRITTEN options within their length; an invented place or person is NEVER shown — retried once, then the ready options stay with one plain line; a form slip is never shown", async () => {
  const material = webMaterial({ kind: "meta description", page: PAGE, siteName: "AlmiOET", origin: SITE.origin, present: "x" });
  assert.match(material, /^WHAT TO WRITE: a meta description/); assert.match(material, /PAGE SECTION HEADINGS: An honest estimate/);
  const clean = await writeWebWithAI({ provider: "anthropic", key: "k", kind: "meta description", material, siteName: "AlmiOET", fetchImpl: webModelFetch() });
  assert.equal(clean.ok, true); assert.equal(clean.outcome, "shown clean"); assert.equal(clean.options.length, 3);
  for (const o of clean.options) { assert.ok(o.text.length >= 110 && o.text.length <= 160, `${o.text.length}: ${o.text}`); assert.match(o.text, /[.!?]$/); assert.equal(o.byAI, true); }
  /* the AI invents a place and a person in every option, every time: nothing invented is shown — the templates stay, said plainly */
  const faqMat = webMaterial({ kind: "FAQ answer", page: PAGE, siteName: "AlmiOET", origin: SITE.origin, question: "What grade do I need?", present: "What grade do I need?\nMost regulators ask for a B." });
  const f = webModelFetch({ mode: "invent" });
  const inv = await writeWebWithAI({ provider: "anthropic", key: "k", kind: "FAQ answer", material: faqMat, siteName: "AlmiOET", fetchImpl: f });
  assert.deepEqual([inv.ok, inv.fallback, inv.outcome, inv.options], [false, true, "templates instead", undefined]);
  assert.equal(inv.why, "Your AI's options named something that is not on this page or in its official sources (e.g. Paris) — the ready options above are from your own pages.");
  assert.equal(f.count(), 2, "the doubtful options were not sent back once (or were sent more than once)");
  /* invents once; told what to avoid, it drops it: shown, and the invention never */
  const once = await writeWebWithAI({ provider: "anthropic", key: "k", kind: "FAQ answer", material: faqMat, siteName: "AlmiOET", fetchImpl: webModelFetch({ mode: "invent-once" }) });
  assert.equal(once.ok, true); assert.ok(once.options.every((o) => !/Paris|Sara/.test(o.text)));
  const long = await writeWebWithAI({ provider: "anthropic", key: "k", kind: "meta description", material, siteName: "AlmiOET", fetchImpl: webModelFetch({ mode: "too-long" }) });
  assert.equal(long.ok, false); assert.equal(long.fallback, true);
  assert.deepEqual(judgeWeb({ text: "Practise for the OET in Paris with Dr Sara Khan.", names: ["Dr Sara Khan"] }, material, "FAQ answer").hidden, ["Paris", "Dr Sara Khan"]);
  assert.equal(judgeWeb({ text: "Practise the OET for healthcare with honest AI feedback, in all four sub-tests and for every profession." }, material, "meta description").state, "FORM", "a description under 110 characters");
  assert.equal(judgeWeb({ text: "The OET for 12 healthcare professions: honest scoring on the real scale, all four sub-tests and simple, honest pricing, explained for you." }, material, "meta description").state, "CLEAN");
  assert.match(judgeWeb({ text: "The OET for 13 healthcare professions: honest scoring on the real scale, all four sub-tests and simple, honest pricing, explained for you." }, material, "meta description").check[0], /^Check: 13/);
  assert.match((await writeWebWithAI({ provider: "openai", key: "k", kind: "title", material, siteName: "x" })).why, /Anthropic \(Claude\) key/);
  /* a new page's opening answer from the official facts only */
  const np = webMaterial({ kind: "new page", page: null, siteName: "AlmiOET", origin: SITE.origin, question: "Is OET accepted in Ireland?", official: [{ text: "Medical Council of Ireland names OET on its own page.", body: "Medical Council of Ireland", readOn: ON }] });
  assert.match(np, /OFFICIAL FACTS \(read by Visibility on each body's own page/);
  const npr = await writeWebWithAI({ provider: "anthropic", key: "k", kind: "new page", material: np, siteName: "AlmiOET", fetchImpl: webModelFetch() });
  assert.equal(npr.ok, true); assert.match(npr.options[0].text, /^Medical Council of Ireland names OET on its own page\./);
  assert.ok(webModelReply({ system: "", messages: [{ content: "WHAT TO WRITE: a page title (x)\nPAGE MAIN HEADING: Pricing\nSITE NAME: AlmiOET" }] }).content[0].text.includes("Pricing | AlmiOET"));
});

/* ══ B7 + the screens ══ */
test("B7 + SCREENS · Connected ✓ with the number of searches at the TOP, the Connect card gone once connected; every website text has 'Write better with AI'; 'How many pages can I make for this product?' on every product; the two new screens", () => {
  assert.ok(menuFor({ hasSite: true, searchConsole: true, searchConsoleKind: "CONNECTED" }).cards.every((c) => c.id !== "google"), "the Connect card still shows once connected");
  assert.ok(menuFor({ hasSite: true, searchConsole: false }).cards.some((c) => c.id === "google"));
  assert.deepEqual(menuFor({ hasSite: true, searchConsole: false }).cards.find((c) => c.id === "search-power").needs, [{ what: "Google Search Console, connected", action: "google" }]);
  assert.equal(menuFor({ hasSite: true }).cards.find((c) => c.id === "page-count").title, "How many pages can I make for this product?");
  assert.match(UI, /\$\("#ov"\)\.innerHTML = `\$\{gscBar\}\$\{S\.started/, "the connection is not said at the top of the Overview");
  assert.match(UI, /<b>Connected ✓ — \$\{G\.searches\} search\$\{G\.searches === 1 \? "" : "es"\} read<\/b>/);
  assert.match(UI, /if \(x\.ok\) setTimeout\(googleScreen, 600\);/, "after picking the site, the Google screen is not drawn again with Connected ✓ at the top");
  assert.match(UI, /<button class="alt" id="pcbtn">How many pages can I make for this product\?<\/button>/);
  assert.match(UI, /data-aiw="\$\{esc\(k\)\}"/); assert.match(UI, /\.replace\(">Copy<", ">Use this one<"\)/);
  assert.match(UI, /note\(msg, `\$\{r\.refused\}\$\{r\.aiCost \? ` \$\{r\.aiCost\}` : ""\}`, r\.fallback \? "info" : "err"\)/, "the templates-instead line is shown as an error");
  assert.match(UI, /\$\{r\.note \? `<p class="meta">\$\{esc\(r\.note\)\}<\/p>` : ""\}\$\{aiwBtn\(r\)\}/, "a block's note (FAQ truth, no logo) is not shown");
  assert.match(UI, /async function pageCountScreen\(\) \{\n  if \(!\(await here\("pageCountScreen"\)\)\) return;/);
  assert.match(UI, /<h3>Generative AI performance \(AI Overviews, AI Mode\)<\/h3>/);
});

/* ══ the app, end to end, on stand-ins ══ */
async function app(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr318-app-"));
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, testOfficialPaceMs: 0, keysDir: dir, downloadsDir: join(dir, "downloads"), weeklyFirstMs: 2147483647, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", ...extra }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { url, dir, post, get, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
function clientSite() {
  let base = "";
  const page = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title></head><body><nav><a href="/">Home</a> <a href="/guides">Guides</a></nav><main>${b}</main></body></html>`;
  const srv = createServer((q, r) => {
    const h = (s) => { r.writeHead(200, { "content-type": "text/html" }); r.end(s); };
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); }
    if (q.url === "/") return h(page("XTEST Practice — Honest | XPrep", "<h1>Practise the XTEST with honest feedback.</h1><h2>The four sub-tests</h2><h2>All professions</h2><h2>Simple pricing</h2><p>XPrep gives you original practice for every part of the XTEST.</p>"));
    if (q.url === "/guides") return h(page("Guides | XPrep", "<h1>Guides</h1><h2>Is XTEST accepted in Ireland?</h2><p>Yes, the XTEST is accepted in Ireland by the Nursing Board of Ireland.</p>"));
    r.writeHead(404); r.end();
  });
  return { listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
test("IN THE APP · How many pages (count → advice → drafts answered from the official pages), Search Console positions read week by week, and the website's AI writing with the cost counted — all on stand-ins", async () => {
  const off = officialSite(), offBase = await off.listen(), cs = clientSite(), csBase = await cs.listen();
  /* a stand-in Google (token + Search Analytics) and a stand-in AI, on one server */
  let gWeeks = 0;
  const g = createServer((q, r) => { let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
    if (q.url === "/token") { r.writeHead(200, { "content-type": "application/json" }); return r.end(JSON.stringify({ access_token: "a", expires_in: 3600, refresh_token: "standin-refresh", scope: "https://www.googleapis.com/auth/webmasters.readonly" })); }
    if (/searchAnalytics/.test(q.url)) { gWeeks++; r.writeHead(200, { "content-type": "application/json" }); return r.end(JSON.stringify({ rows: [{ keys: [new Date(Date.now() - 4 * 864e5).toISOString().slice(0, 10), "xtest for nurses in ireland", `${csBase}/guides`], clicks: 0, impressions: 3, position: 9 }] })); }
    if (q.url === "/v1/messages") { r.writeHead(200, { "content-type": "application/json" }); return r.end(JSON.stringify(webModelReply(JSON.parse(b), { mode: "invent" }))); }
    r.writeHead(404); r.end(); }); });
  await new Promise((res) => g.listen(0, "127.0.0.1", res)); const gBase = `http://127.0.0.1:${g.address().port}`;
  const a = await app({ googleTestEndpoints: { auth: `${gBase}/auth`, token: `${gBase}/token`, api: `${gBase}/` }, googleClientId: "id.apps.googleusercontent.com", aiApiBase: gBase });
  try {
    await a.post("/api/company", { name: "X", site: csBase });
    const made = await a.post("/api/products", { name: "XPrep", site: csBase });
    const id = made.product.id;
    let o; for (let i = 0; i < 200; i++) { o = await a.get(`/api/products/${id}/overview`); if (!o.checking && o.card) break; await new Promise((r) => setTimeout(r, 150)); }
    /* C: refused without a subject; then the count runs, and the advice comes from the official pages */
    assert.match((await a.post(`/api/products/${id}/count`, { dims: ["countries"] })).refused, /^Say what your product is about/);
    const c = await a.post(`/api/products/${id}/count`, { dims: ["countries", "roles"], subject: "XTEST", site: `${offBase}/`, files: [{ dim: "roles", name: "roles.txt", base64: Buffer.from("Registered Nurse\nDoctor\nPilot\n").toString("base64") }] });
    assert.equal(c.running, true);
    let st; for (let i = 0; i < 200; i++) { st = await a.get(`/api/products/${id}/count`); if (!st.running && st.last) break; await new Promise((r) => setTimeout(r, 150)); }
    assert.deepEqual(st.last.result.dims.countries.kept.map((k) => k.name), ["Canada", "Ireland"]);
    assert.equal(st.last.advice.line, "No — better this way: 2 pages, one per country.");
    assert.equal(st.subject, "XTEST");
    const mk = await a.post(`/api/products/${id}/count/make`, {});
    assert.equal(mk.ok, true, mk.refused);
    const off2 = await a.get(`/api/products/${id}/official`);
    assert.match(off2.claims.Ireland[0].text, /^XTEST's own page for Ireland says XTEST is recognised or accepted there/);
    const pubs = await a.get(`/api/products/${id}/publish`);
    assert.ok(pubs.drafts.some((d) => /Ireland/.test(d.title)), `no draft for Ireland: ${pubs.drafts.map((d) => d.title).join(" · ")}`);
    /* D: positions need a connection; then 8 weeks read from Google's own service */
    assert.match((await a.post(`/api/products/${id}/search/read`, {})).refused, /^Connect Google Search Console first/);
    writeFileSync(join(a.dir, "products", id, "search-console.json"), JSON.stringify({ kind: "CONNECTED", on: ON, window: "2026-07-22 to 2026-10-20", site: "sc-domain:x.test", queries: [{ query: "xtest for nurses in ireland", clicks: 0, impressions: 3 }] }));
    /* the client signs in to Google (the stand-in): Visibility's own start, Google sends the browser back with a one-time code */
    assert.equal((await a.post("/api/google/client", { clientId: "id.apps.googleusercontent.com", secret: "standin-secret" })).ok, true);
    const gs = await a.post(`/api/products/${id}/google/start`, {});
    const state = new URL(gs.url).searchParams.get("state");
    assert.equal((await fetch(`${a.url}/oauth/google?code=one-time&state=${encodeURIComponent(state)}`)).status, 200);
    const sr = await a.post(`/api/products/${id}/search/read`, {});
    assert.equal(sr.ok, true, sr.refused); assert.equal(gWeeks, 1, "more than one request for the positions");
    assert.equal(sr.power.tracking.rows[0].byWeek.length, 13); assert.equal(sr.power.genai.available, false);
    const ov = await a.get(`/api/products/${id}/overview`);
    assert.deepEqual([ov.google.kind, ov.google.searches], ["CONNECTED", 1]); assert.ok(!ov.menu.cards.some((x) => x.id === "google"));
    /* A: the AI writes; it invents every time → the templates stay, said plainly; the cost is counted */
    assert.match((await a.post(`/api/products/${id}/web/write`, { kind: "meta description", page: `${csBase}/` })).refused, /^Connect your AI key first/);
    const st2 = await a.get(`/api/products/${id}/state`); void st2;
    await a.post(`/api/products/${id}/setup`, { id: "aiConnection", value: { provider: "anthropic", key: "sk-ant-standin-not-a-real-key" } });
    const w = await a.post(`/api/products/${id}/web/write`, { kind: "FAQ answer", page: `${csBase}/guides`, question: "Is XTEST accepted in Ireland?", present: "Is XTEST accepted in Ireland?\nYes." });
    assert.equal(w.fallback, true); assert.match(w.refused, /\(e\.g\. Paris\) — the ready options above are from your own pages\.$/);
    assert.match(w.aiCost, /2 requests?/);
  } finally { a.close(); off.close(); cs.close(); g.close(); }
});
