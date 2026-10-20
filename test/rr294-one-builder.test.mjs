/* RR-294 · the ONE page builder, the fee in rupees, a key fact held to its verbatim quote, and the five gates as build-page's acceptance step.
 * Pure tests on fixtures, plus the stored TEST DATA where this machine holds it. Nothing is written, fetched or published. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { keyFactCards, faqOf, asksForCurrency, sameMeaning } from "../src/page/joined-page.mjs";
import { guideItemsByValue, buildGuides, asPublished } from "../src/page/one-builder.mjs";
import { acceptByPageGates, costGate, AI_SEARCH_BOTS, PAGE_ONE } from "../src/page/page-gates.mjs";
import { GUIDANCE } from "../config/guidance/guidance-read.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ON = "2026-10-19";
const item = (needId, wording, claims) => ({ needId, heading: { wording }, questions: [{ questionId: `q-${needId}`, wording }], claims, statements: [] });
const claim = (claimId, text, extra = {}) => ({ claimId, text, link: "https://body.example/a", source: "A body", readOn: "2026-10-15", ...extra });

test("D · RR-295 SAME MEANING: a key fact in words of the same meaning as its verbatim quote is SHOWN; a changed or dropped number, unit or condition is REFUSED, named", () => {
  const card = (value, quote, text = value) => keyFactCards({ facts: [{ page: "p", claimId: "k1", value }], items: [item("n1", "Q?", [claim("k1", text)])], quotationOf: () => quote });
  /* the owner's three examples (decision 2): each is the source's meaning in other words — shown */
  for (const [v, q] of [["45 minutes", "45 mins in duration"], ["about 20 minutes", "Approximately 20 minutes"], ["grade B (350)", "A minimum of Grade B (Minimum Score of 350) in all components"], ["grade B (350)", "B (350 or above)"]]) assert.equal(card(v, q).cards.length, 1, `${v} | ${q}`);
  /* the beta-g safeguard — FIRING CONTROLS: a dropped condition, a changed number, a dropped unit, a dropped "about" — each refused with its reason */
  for (const [v, q, why] of [["1400", "Dietary 1400 with no elements below 300", /no part below 300/], ["1400 with no part below 250", "Dietary 1400 with no elements below 300", /not in the source/], ["20", "Approximately 20 minutes", /unit "minutes"/], ["20 minutes", "Approximately 20 minutes", /"about"/], ["AU$578", "costs AU$587", /not in the source/]]) {
    const r = card(v, q);
    assert.equal(r.cards.length, 0, v);
    assert.equal(r.refused[0].code, "KEY_FACT_VALUE_IS_NOT_IN_ITS_VERBATIM_QUOTATION");
    assert.match(r.refused[0].why, why, v);
  }
  /* the condition kept, in its own words — shown */
  assert.equal(card("1400 with no part below 300", "Dietary 1400 with no elements below 300", "an OET score of 1400 in their own test, with no element below 300").cards.length, 1);
  assert.equal(sameMeaning("1800", "1800 with no elements below 400").same, false);
});

test("PKR · a question asked in rupees is answered in rupees first, in the page AND in its FAQ data; any other answer's FAQ stays the source's words", () => {
  const conv = [{ claimId: "f1", text: "OET fee AU$587 (≈ PKR 113,833). The rupee figure is an estimate from the RBA and SBP rates of 2026-10-14, not an OET price.", to: "PKR" }];
  const rupees = item("n1", "What is the OET fee for doctors in Pakistan in rupees?", [claim("f1", "It costs AU$587.")]);
  const plain = item("n2", "What is the OET fee?", [claim("f1", "It costs AU$587.")]);
  assert.equal(asksForCurrency(rupees.heading.wording, conv), true);
  assert.equal(asksForCurrency(plain.heading.wording, conv), false);
  const [a, b] = faqOf([rupees, plain], conv);
  assert.ok(a.answer.startsWith("OET fee AU$587 (≈ PKR 113,833)"), a.answer);
  assert.equal(b.answer, "It costs AU$587.");
});

const BATCH = "rr254-test-pages-2026-10-12";
const DIR = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
const HERE = existsSync(join(DIR, "joined-pages.jsonl"));
test("REAL · the doctors' guide rebuilt by the ONE builder: the fee card shows its rupee estimate, the rupee question leads with PKR, the FAQ data carries it", { skip: HERE ? false : "the stored test data is not on this machine" }, () => {
  const rows = readFileSync(join(DIR, "joined-pages.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const json = (f) => JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const guides = guideItemsByValue(rows);
  const quotation = new Map(json("page-drafts.json").pages.flatMap((p) => p.needs.flatMap((n) => n.answer.claims.map((c) => [c.claimId, c.quotation ?? null]))));
  const medicine = new Map([...guides].filter(([v]) => v === "medicine"));
  assert.equal(medicine.size, 1);
  const [g] = buildGuides({ guides: medicine, keyFacts: json("key-facts.json"), rates: json("conversion-rates.json"), quotationOf: (id) => quotation.get(id) ?? null, design: null, stamp: "TEST", on: ON });
  const fee = g.cards.find((c) => /AU\$587/.test(c.value));
  assert.ok(fee, "the fee card is shown (its value is in its verbatim quote)");
  assert.match(g.html, /data-conversion-of="[^"]+">\(about PKR [\d,]+; rate: /);
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(g.html)[1]);
  const rupeeQ = (ld.mainEntity ?? []).find((q) => /rupees/i.test(q.name));
  assert.ok(rupeeQ && /PKR/.test(rupeeQ.acceptedAnswer.text), "the rupee question's FAQ answer is in rupees");
  /* the page as it would go live: canonical, no test stamp */
  const live = asPublished(g.html, "https://x.example/guides/oet-for-doctors");
  assert.ok(live.includes('rel="canonical"') && !/content="noindex/.test(live));
});

/* ---- C · the gates are build-page's acceptance step -------------------------------------------------------------------------- */
const ROBOTS = `User-agent: *\nAllow: /\n\n${AI_SEARCH_BOTS.map((b) => `User-agent: ${b}`).join("\n")}\nAllow: /\n`;
const CARD = `<ul class="cards"><li class="card" data-claim-id="c1"><span class="v">V</span><a class="src" href="https://body.example/a">Source</a><span> · Checked 2026-10-15</span></li></ul>`;
const pageHtml = (slug, other, { card = CARD, desc = `About ${slug} itself` } = {}) => `<html><head><title>Page ${slug}</title><meta name="description" content="${desc}"><meta name="robots" content="noindex, nofollow"></head><body><h1>Page ${slug}</h1>${card}<p data-claim-id="c-${slug}">answer ${slug} one two three</p><a href="https://site.example/${other}/">${other}</a></body></html>`;
const candidate = (slug, other, opts) => ({ slug, verdict: "ACCEPTED", html: pageHtml(slug, other, opts), rejects: [], trace: [{ needId: `n-${slug}`, claimId: `c-${slug}`, text: `answer ${slug} one two three`, link: "https://body.example/a", readOn: "2026-10-15" }] });
const OPTS = (cs) => ({ guidance: GUIDANCE, on: ON, cost: costGate({ entry: { recorded_at: "a", money: { amountState: "ZERO_BY_TARIFF", amount: 0 }, requests: 0 }, startedAt: "b", budget: { money: 0, requests: 0 } }), urlOf: (c) => `https://site.example/${c.slug}/`,
  itemsOf: (c) => c.trace.map((t) => ({ needId: t.needId, heading: { wording: t.needId }, claims: [t] })),
  site: { robotsTxt: ROBOTS, sitemapUrls: cs.map((c) => `https://site.example/${c.slug}/`), serve: (p) => ({ status: cs.some((c) => `/${c.slug}` === p.replace(/\/$/, "")) ? 200 : 404 }) } });

test("C · build-page's acceptance step: two good pages pass; FIRING CONTROL: a page with no key-fact card is REFUSED, its HTML withdrawn, the failing check named", () => {
  const good = [candidate("a", "b"), candidate("b", "a")];
  const ok = acceptByPageGates(good, OPTS(good));
  assert.deepEqual(ok.map((c) => [c.verdict, c.pageGates]), [["ACCEPTED", "PASS"], ["ACCEPTED", "PASS"]], JSON.stringify(ok.map((c) => c.rejects)));
  const bad = [candidate("a", "b", { card: "" }), candidate("b", "a")];
  const r = acceptByPageGates(bad, OPTS(bad));
  assert.equal(r[0].verdict, "REFUSED");
  assert.equal(r[0].html, null, "nothing of a refused page can be written");
  assert.ok(r[0].rejects.some((x) => x.part === "pageGates" && /no key-fact card with its source and checked date/.test(x.reason)), JSON.stringify(r[0].rejects));
  assert.equal(r[1].verdict, "ACCEPTED");
  /* a candidate construction refused is never judged — and stays refused */
  const pre = acceptByPageGates([{ ...candidate("a", "b"), verdict: "REFUSED", html: null }, candidate("b", "a")], OPTS(good));
  assert.equal(pre[0].verdict, "REFUSED");
});

test("C · bin/build-page.mjs runs the gates on the one builder's pages BEFORE its write loop, and PAGE-1 is SATISFIED in code", () => {
  const src = readFileSync(join(REPO, "bin/build-page.mjs"), "utf8");
  const gate = src.indexOf("const results = acceptByPageGates(candidates,");
  assert.ok(gate > 0 && gate < src.indexOf("for (const c of results)") && gate < src.indexOf("executeGovernedWrite("), "the acceptance step comes before every write");
  assert.equal(PAGE_ONE.state, "SATISFIED");
  assert.deepEqual([...PAGE_ONE.missingGateFamilies], []);
});
