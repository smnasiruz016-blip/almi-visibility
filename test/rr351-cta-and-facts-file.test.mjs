/**
 * 🔴 RR-351 (owner, 31 Oct 2026 — AlmiOET is the app's first real project):
 *   1 · the product's OWN offer button (words + link) in Settings → Your product; no page is made or published without it, every draft carries it
 *   2 · the product's description stays editable in the same step (its offer words come from the owner)
 *   3 · "Add official facts file": only a fact whose quote AND numbers were proved on its official page goes on a page; every other one shows
 *       "check the official page" with its link, never its value
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ctaFrom, ctaOfSetup, checkStep, NO_CTA } from "../desktop/setup.mjs";
import { verifiedFact, readFactsFile, addFactsFile, factsOfStore, officialClaimsOf, countryLinesOf, factsFileView, keyOf } from "../desktop/facts-file.mjs";
import { withCta, ctaRow } from "../desktop/seo-pages.mjs";
import { localContent } from "../desktop/local-pages.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const ok = { key: "fee", value: "AUD 587 for the full test.", url: "https://example.org/fees", quote: "The full test costs AU$587 for all four parts.", accessed: "2026-10-31", verdict: "VERIFIED", numbersMissing: [] };
const FILE = { countries: [
  { country: "Pakistan", facts: [ok,
    { ...ok, key: "rule", value: "Bring a national ID card.", quote: "A valid national ID card is needed on the day of the test.", url: "https://example.org/rules" },
    { ...ok, key: "rate", value: "AUD 1 = PKR 193.32 on 30 Sep 2026.", verdict2: "NUMBERS_UNPROVEN", url: "https://bank.example.org/rates" },
    { key: "venues", value: "", url: "https://example.org/venues", quote: "", accessed: "2026-10-31", verdict: "CHECK_OFFICIAL", note: "the page returned 403" }] },
  { country: "United Kingdom", facts: [
    { ...ok, key: "regulator:nursing", value: "NMC: Listening B (350+).", quote: "OET B (350 or above) for listening and reading.", url: "https://nmc.example.org/oet" },
    { ...ok, key: "regulator:speech and language therapy", value: "1800 total, no element below 400.", quote: "Speech and Language 1800 with no elements below 400", url: "https://hcpc.example.org/oet", verdict: "QUOTE_NOT_FOUND" },
    { ...ok, key: "regulator:pharmacy", value: "B in each.", url: "https://gphc.example.org/oet", numbersMissing: undefined }] },
] };

test("RR-351 · the offer button: both words and link, or neither; a full web address; kept with the product; the description is still required", () => {
  assert.deepEqual(ctaFrom({}), {});
  assert.deepEqual(ctaFrom({ ctaLabel: "  Try free for 48 hours — then $12/month ", ctaHref: "https://almioet.almiworld.com/signup" }), { cta: { label: "Try free for 48 hours — then $12/month", href: "https://almioet.almiworld.com/signup" } });
  assert.match(ctaFrom({ ctaLabel: "Try free", ctaHref: "" }).refused, /both its words and its link/);
  assert.match(ctaFrom({ ctaLabel: "", ctaHref: "https://x.example/signup" }).refused, /both its words and its link/);
  assert.match(ctaFrom({ ctaLabel: "Try", ctaHref: "javascript:alert(1)" }).refused, /full web address/);
  assert.match(ctaFrom({ ctaLabel: "x".repeat(81), ctaHref: "https://x.example/" }).refused, /3 to 80/);
  assert.match(ctaFrom({ ctaLabel: "<b>Try</b>", ctaHref: "https://x.example/" }).refused, /< or >/);
  assert.match(checkStep("product", { name: "P", site: "https://x.example", what: "Practice.", ctaLabel: "Try", ctaHref: "" }), /both its words/);
  assert.equal(checkStep("product", { name: "P", site: "https://x.example", what: "Practice.", ctaLabel: "Try free", ctaHref: "https://x.example/signup" }), null);
  assert.match(checkStep("product", { name: "P", site: "https://x.example", what: " ", ctaLabel: "Try free", ctaHref: "https://x.example/signup" }), /what it does/);
  assert.equal(ctaOfSetup({}), null); assert.equal(ctaOfSetup({ product: { cta: { label: "Try", href: "/signup" } } }), null, "a relative link is not a button");
  assert.deepEqual(ctaOfSetup({ product: { cta: { label: "Try", href: "https://x.example/signup" } } }), { label: "Try", href: "https://x.example/signup" });
  assert.match(NO_CTA, /Settings → Your product/);
});

test("RR-351 · every draft carries the button: before 'Last updated', else before </main> or </body>; escaped", () => {
  const cta = { label: 'Try "free" & see', href: "https://x.example/signup?a=1&b=2" };
  assert.equal(ctaRow(cta), '<p class="cta-row" data-cta><a class="cta" href="https://x.example/signup?a=1&amp;b=2">Try &quot;free&quot; &amp; see</a></p>');
  assert.equal(withCta('<main><h1>T</h1><p class="updated" data-last-updated="x">Last updated</p></main>', cta), `<main><h1>T</h1>${ctaRow(cta)}<p class="updated" data-last-updated="x">Last updated</p></main>`);
  assert.equal(withCta("<body><main><h1>T</h1></main></body>", cta), `<body><main><h1>T</h1>${ctaRow(cta)}</main></body>`);
  assert.equal(withCta("<body><h1>T</h1></body>", cta), `<body><h1>T</h1>${ctaRow(cta)}</body>`);
  const src = readFileSync(join(REPO, "desktop", "seo-pages.mjs"), "utf8");
  assert.ok(src.includes('if (cta?.label && cta?.href) built = built.map((b) => (/data-cta>/.test(b.html) ? b : { ...b, html: withCta(b.html, cta) }));'));
  assert.ok(src.indexOf("withCta(b.html, cta)") < src.indexOf("const gated = built.length ? allGates("), "the gates read the page WITH its button");
  const pseo = readFileSync(join(REPO, "desktop", "pseo.mjs"), "utf8");
  assert.ok(!pseo.includes("on ${cta.label}"), "a step never prints the button's offer words as a site name");
});

test("RR-351 · a fact is VERIFIED only when its quote AND its numbers were proved (verdict2 and numbersMissing count too)", () => {
  assert.equal(verifiedFact(ok), true);
  assert.equal(verifiedFact({ ...ok, verdict2: "VERIFIED" }), true);
  assert.equal(verifiedFact({ ...ok, verdict2: "NUMBERS_UNPROVEN" }), false);
  assert.equal(verifiedFact({ ...ok, numbersMissing: ["587"] }), false);
  assert.equal(verifiedFact({ ...ok, numbersMissing: undefined }), false, "a file that does not say its numbers were checked");
  assert.equal(verifiedFact({ ...ok, verdict: "CHECK_OFFICIAL" }), false);
  assert.equal(verifiedFact({ ...ok, quote: "" }), false);
  assert.equal(verifiedFact({ ...ok, url: "http://example.org/fees" }), false, "an official page over https only");
  assert.equal(verifiedFact({ ...ok, accessed: "31 Oct" }), false);
  assert.deepEqual(keyOf("regulator:speech and language therapy"), { part: "councils", profession: "speech pathology", label: "The regulator for speech and language therapy" });
  assert.equal(keyOf("population"), null);
});

test("RR-351 · reading a facts file: verified facts carry their value; the rest ONLY 'check the official page' and the link — never their value", () => {
  const r = readFactsFile(`\uFEFF${JSON.stringify(FILE)}`, { name: "uk-pk.verified.json" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.counts, { all: 7, verified: 3, check: 4, skipped: 0 });
  const unproved = r.facts.filter((f) => !f.verified);
  for (const f of unproved) { assert.match(f.text, /: check the official page$/); assert.ok(!/\d/.test(f.text), `no number of an unproved fact: ${f.text}`); assert.ok(f.link.startsWith("https://")); }
  assert.deepEqual(unproved.map((f) => f.why), ["a number in it was not found on the official page", "not read: the page returned 403", "its quote was not found on the official page", "the file does not say its numbers were checked"]);
  assert.equal(readFactsFile("not json").refused, "facts.json cannot be read — it is not a facts file.");
  assert.match(readFactsFile(JSON.stringify({ items: [] }), { name: "x.json" }).refused, /no "countries" list/);
  assert.deepEqual(readFactsFile(JSON.stringify({ countries: [{ country: "X", facts: [{ ...ok, key: "population" }] }] })).skipped, ['X: "population" is not a fact Visibility knows']);
  /* the same file name again REPLACES its facts; another file is kept */
  let store = addFactsFile(null, r, { on: "2026-10-31T20:00:00Z" });
  const again = readFactsFile(JSON.stringify({ countries: [FILE.countries[0]] }), { name: "uk-pk.verified.json" });
  store = addFactsFile(store, again, { on: "2026-10-31T21:00:00Z" });
  store = addFactsFile(store, readFactsFile(JSON.stringify({ countries: [{ country: "India", facts: [ok] }] }), { name: "in.json" }), { on: "2026-10-31T21:05:00Z" });
  assert.deepEqual(store.files.map((f) => [f.file, f.counts.all]), [["uk-pk.verified.json", 4], ["in.json", 1]]);
  assert.equal(factsOfStore(store).length, 5);
  /* the pages' official answers: VERIFIED only, with page and date */
  const claims = officialClaimsOf(store);
  assert.deepEqual(Object.keys(claims).sort(), ["India", "Pakistan"]);
  assert.deepEqual(claims.Pakistan.map((c) => c.text), ["AUD 587 for the full test.", "Bring a national ID card."]);
  for (const c of Object.values(claims).flat()) { assert.equal(c.official, true); assert.match(c.readOn, /^\d{4}-\d{2}-\d{2}$/); assert.ok(c.link.startsWith("https://")); }
  /* a country page: only a RULE fills its part; the fee read in AUD is shown, never counted as "the fee in its own currency" */
  const lines = countryLinesOf(store).Pakistan;
  assert.deepEqual(lines.owner.map((o) => o.key), ["country|Pakistan|file-fee", "country|Pakistan|rules"]);
  assert.deepEqual(lines.checkOfficial.map((x) => x.label), ["The exchange rate", "Test centres"]);
  const v = factsFileView(store); assert.deepEqual(v.files.map((f) => [f.file, f.verified, f.check]), [["uk-pk.verified.json", 2, 2], ["in.json", 1, 0]]); assert.equal(v.notShown.length, 2);
});

test("RR-351 · a country page prints the unproved facts as 'check the official page' with the link, and the file's own facts with their note", () => {
  const p = { kind: "country", country: "Pakistan", venue: true, cities: [{ city: "Lahore" }], centres: { link: "https://example.org/venues", on: "2026-10-31" }, fee: "AUD 587 — about 113,000 PKR", councils: [], rules: [], answered: [],
    own: [{ part: "file-fee", text: "AUD 587 for the full test.", link: "https://example.org/fees", on: "2026-10-31", note: "read on its official page" }],
    checkOfficial: [{ label: "The exchange rate", link: "https://bank.example.org/rates", on: "2026-10-31" }], whereTitle: "Where to take OET" };
  const c = localContent(p, { subject: "OET", fit: (xs) => xs.filter(Boolean).join(" "), cta: null });
  const own = c.sections.find((s) => s.heading === "AlmiWorld's own checks"), chk = c.sections.find((s) => s.heading === "Check on the official page");
  assert.deepEqual(own.lines, [{ text: "AUD 587 for the full test.", link: "https://example.org/fees", on: "2026-10-31", note: "read on its official page" }]);
  assert.deepEqual(chk.lines, [{ text: "The exchange rate: check the official page before you book or apply.", link: "https://bank.example.org/rates", on: "2026-10-31", note: null }]);
});

test("RR-351 · THE APP: no page without the offer button (refused, sent to Settings); the button and the description saved in Settings; a facts file added, its counts shown", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr351-app-"));
  const st = productStore(dir); st.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  st.create({ name: "Fixture", site: "https://fixture.invalid" }); const id = st.list()[0].id;
  /* the owner's licence (the same set-up as rr308's app()): a setup answer needs a licence that may start new work */
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}/api/products/${id}`;
    const call = async (u, o, method = "POST") => { const r = await fetch(base + u, method === "GET" ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(o) }); return { status: r.status, j: await r.json() }; };
    for (const f of ["seo-pages", "articles"]) { const r = await call(`/feature/${f}`, {}); assert.deepEqual([r.status, r.j.needsCta, r.j.refused], [400, true, NO_CTA], f); }
    assert.equal((await call("/count/make", {})).status, 400);
    /* Settings → Your product: the description and the button, saved; a later save without the button fields keeps it */
    const what = "Online practice for the OET. Try free for 48 hours — then $12/month.";
    const save = await call("/setup", { id: "product", value: { name: "Fixture", site: "https://fixture.invalid", saveAnyway: true, what, ctaLabel: "Try free for 48 hours — then $12/month", ctaHref: "https://fixture.invalid/signup" } });
    assert.equal(save.status, 200, JSON.stringify(save.j));
    let s = (await call("/state", null, "GET")).j.setup.product;
    assert.deepEqual([s.what, s.cta], [what, { label: "Try free for 48 hours — then $12/month", href: "https://fixture.invalid/signup" }]);
    assert.ok(!("ctaLabel" in s) && !("ctaHref" in s));
    assert.equal((await call("/setup", { id: "product", value: { name: "Fixture", site: "https://fixture.invalid", saveAnyway: true, what } })).status, 200);
    assert.deepEqual((await call("/state", null, "GET")).j.setup.product.cta, { label: "Try free for 48 hours — then $12/month", href: "https://fixture.invalid/signup" });
    const half = await call("/setup", { id: "product", value: { name: "Fixture", site: "https://fixture.invalid", saveAnyway: true, what, ctaLabel: "Try", ctaHref: "" } });
    assert.deepEqual([half.status, /both its words/.test(half.j.refused)], [400, true]);
    /* with the button set, the refusal is gone (the next need — a site read — answers instead) */
    const after = await call("/feature/seo-pages", {}); assert.notEqual(after.j.needsCta, true);
    /* "Add official facts file" */
    assert.deepEqual((await call("/facts-file", null, "GET")).j, { files: [], notShown: [] });
    const bad = await call("/facts-file", { name: "x.json", text: "{}" }); assert.deepEqual([bad.status, /no "countries" list/.test(bad.j.refused)], [400, true]);
    const add = await call("/facts-file", { name: "C:\\folder\\uk-pk.verified.json", text: JSON.stringify(FILE) });
    assert.equal(add.status, 200, JSON.stringify(add.j));
    assert.match(add.j.line, /^uk-pk\.verified\.json: 3 facts proved on their official page go on your pages; 4 not proved show only "check the official page" with the link\./);
    const stored = JSON.parse(readFileSync(join(st.dirOf(id), "facts-file.json"), "utf8"));
    assert.deepEqual(stored.files.map((f) => [f.file, f.counts.verified, f.counts.check]), [["uk-pk.verified.json", 3, 4]]);
    assert.ok(!existsSync(join(st.dirOf(id), "official.json")), "the read store of official pages is never written with the file's facts");
  } finally { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
});

test("RR-351 · the UI: the button's two fields in Your product; the facts-file box; a refusal sends the client to Settings; the Setup carries the module", () => {
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.ok(ui.includes("<label>The button's words<input id=f4 maxlength=80"));
  assert.ok(ui.includes('...($("#f4") ? { ctaLabel: $("#f4").value, ctaHref: $("#f5").value } : {})'));
  assert.ok(ui.includes('if (r.needsCta) return (box.innerHTML = `<div class="card"><h3>First, your offer button</h3>'));
  assert.ok(ui.includes('<button class="ghost" id="ffile">Add official facts file</button>') && ui.includes('if ($("#ffile")) $("#ffile").onclick = factsFileBox;'));
  assert.ok(ui.includes('accept=".json,application/json" multiple'));
  assert.ok(readFileSync(join(REPO, "desktop", "build.mjs"), "utf8").includes('"facts-file.mjs"'));
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
  assert.ok(!main.includes("Try a free ${aboutOf(s)"), "the made-up button is gone");
  for (const m of ['if (!ctaOf(store.read(id))) return { ok: false, needsCta: true, why: NO_CTA };', 'if (!/data-cta>/.test(d.html ?? "")) return { ok: false, needsCta: true,', 'if (!ctaOf(s)) return { refused: NO_CTA, needsCta: true };']) assert.ok(main.includes(m), m);
  assert.equal((main.match(/seoPages\(\{[^\n]*cta: ctaOf\(/g) ?? []).length, 7 /* RR-356: + the repair round; RR-360: + a product of any kind judged again with its coverage */, "every page made carries the client's button");
});
