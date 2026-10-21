/* RR-299 · auto-refresh on REAL data (a CHANGED recheck carries its new verbatim value, or "new value not readable"), the sunrise look,
 * and the products home screen with each product's data apart. Nothing is fetched, written outside a temp folder, or published. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import { newValueOf, withNewValues, recheckFacts, NEW_VALUE, READ_STATE } from "../src/facts/source-reader.mjs";
import { refreshPlan } from "../src/page/refresh.mjs";
import { productStore, productCard, PRODUCT_ID, insideProducts } from "../desktop/products.mjs";
import { resolve as resolvePath } from "node:path";
import { licenceState, licenceBytes, planLimitLine } from "../desktop/licence.mjs";
import { SUNRISE, readable, cssVariables } from "../desktop/theme.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/* ---- A · the new value of a CHANGED fact ---- */
test("A · NEW VALUE (pure): the quotation still there → SAME; its words with new numbers, found once → READ (value follows, condition kept); not found or found twice → NOT_READABLE", () => {
  const q = "IELTS on computer Islamabad 75,600";
  assert.equal(newValueOf({ quotation: q, value: "PKR 75,600", text: `Fees: ${q} Book Now` }).state, NEW_VALUE.SAME);
  const r = newValueOf({ quotation: q, value: "PKR 75,600", text: "Fees: IELTS on computer Islamabad 79,900 Book Now" });
  assert.deepEqual([r.state, r.value, r.quotation], [NEW_VALUE.READ, "PKR 79,900", "IELTS on computer Islamabad 79,900"]);
  /* a dash or spacing change does not hide the value */
  assert.equal(newValueOf({ quotation: "Fee (in PKR) – Effective from 9 June 2026", value: "9 June 2026", text: "Fee (in PKR) - Effective from 16 June 2027" }).value, "16 June 2027");
  assert.match(newValueOf({ quotation: q, value: "PKR 75,600", text: "the page was rebuilt" }).reason, /^new value not readable — the quotation's words are not in the re-read text$/);
  assert.match(newValueOf({ quotation: q, value: "PKR 75,600", text: `${q.replace("75,600", "1")} and ${q.replace("75,600", "2")}` }).reason, /match 2 places/);
  /* a shown value with a number its quotation does not hold (e.g. a condition) is never re-written */
  assert.equal(newValueOf({ quotation: "a score of 1400", value: "1400 with no part below 300", text: "a score of 1500" }).state, NEW_VALUE.NOT_READABLE);
});

test("A · THE RECHECK RECORDS IT, AND THE REFRESH USES IT (pure): a CHANGED fact carries newValue; READ rebuilds with the new value and card; NOT_READABLE changes no page", async () => {
  const [r] = await recheckFacts({ facts: [{ factId: "claim:k", link: "https://s.example/a", quotations: ["The fee is WB$120 per sitting."], value: "WB$120", pages: ["p"] }], readOf: async () => ({ state: READ_STATE.READ, text: "The fee is WB$135 per sitting.", sha256: "x", route: "ENGINE_PACED_PATH" }), on: "2026-10-20" });
  assert.deepEqual([r.state, r.newValue.state, r.newValue.value], ["CHANGED", "READ", "WB$135"]);
  const pages = [{ url: "https://s.example/p", items: [{ claims: [{ claimId: "k", text: "It costs WB$120.", link: "https://s.example/a", readOn: "2026-10-01" }] }] }];
  const plan = refreshPlan({ rechecks: [{ record_type: "fact_recheck", ...r }], pages });
  assert.deepEqual([plan.changes.length, plan.changes[0].newClaim.text, plan.changes[0].newClaim.cardValue, plan.changes[0].newClaim.readOn], [1, "It costs WB$135.", "WB$135", "2026-10-20"]);
  const nr = refreshPlan({ rechecks: [{ record_type: "fact_recheck", factId: "claim:k", state: "CHANGED", newValue: { state: "NOT_READABLE", reason: "new value not readable — x" } }], pages });
  assert.deepEqual([nr.changes.length, nr.reported[0].reason], [0, "NEW_VALUE_NOT_READABLE"]);
  /* a stored CHANGED recheck is completed from the STORED re-read (matched by sha256); with no stored text it stays not readable */
  const done = withNewValues({ rechecks: [{ state: "CHANGED", factId: "claim:k", pageSha256: "abc" }], reads: [{ sha256: "abc", text: "The fee is WB$140 per sitting." }], quotationOf: () => "The fee is WB$120 per sitting." });
  assert.equal(done[0].newValue.value, "140");
  assert.match(withNewValues({ rechecks: [{ state: "CHANGED", factId: "claim:k", pageSha256: "zzz" }], reads: [], quotationOf: () => "q 1" })[0].newValue.reason, /re-read page text is not stored/);
});

const PRIVATE = "C:/Projects/almi-visibility-sources/research/rr254-test-pages-2026-10-12/source-reads.jsonl";
const DATA = "C:/Projects/almi-visibility-data/research/rr254-test-pages-2026-10-12";
test("A · REAL: the 4 stored CHANGED rechecks, from the STORED page text (no outside read) — 3 fees carry their value (unchanged), the 2020-21 snapshot is \"new value not readable\"", { skip: existsSync(PRIVATE) && existsSync(DATA) ? false : "the stored page texts are not on this machine" }, () => {
  const rows = (f) => readFileSync(f, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const q = new Map(JSON.parse(readFileSync(join(DATA, "page-drafts.json"), "utf8")).pages.flatMap((p) => p.needs.flatMap((n) => n.answer.claims.map((c) => [`claim:${c.claimId}`, c.quotation]))));
  for (const s of JSON.parse(readFileSync(join(DATA, "historical-snapshots-2026-10-17.json"), "utf8")).snapshots ?? []) q.set(`snapshot:${s.snapshotId}`, s.quotation);
  /* the 4 rechecks of RR-299 are those read on or before 17 Oct 2026 (RR-302 C3 read the British Council page again on 20 Oct: one more) */
  const done = withNewValues({ rechecks: rows(join(DATA, "fact-rechecks.jsonl")).filter((r) => r.state === "CHANGED" && r.readOn <= "2026-10-17"), reads: rows(PRIVATE), quotationOf: (id) => q.get(id) ?? null });
  assert.deepEqual(done.map((r) => [r.factId, r.newValue.state, r.newValue.value ?? null]), [
    ["claim:n-cheaper-ielts-1", "SAME", "75,600"], ["claim:n-cheaper-ielts-2", "SAME", "76,240"], ["claim:n-cheaper-ielts-3", "SAME", "72,000"], ["snapshot:bc-pk-ielts-fee-2020-21", "NOT_READABLE", null]]);
});

/* ---- B · the sunrise look ---- */
test("B · SUNRISE: AlmiWorld's own colours, every painted pair readable (WCAG AA); the page takes its colours from the same table; the maker's logo on every screen", () => {
  assert.deepEqual([SUNRISE.cream, SUNRISE.peach, SUNRISE.coral, SUNRISE.sunrise, SUNRISE.ink, SUNRISE.teal, SUNRISE.night, SUNRISE.gold], ["#FFFBF5", "#FFE8D6", "#FF7A6B", "#F4A340", "#1A1A2E", "#0D9488", "#14110D", "#D4A24C"]);
  for (const r of readable()) assert.equal(r.ok, true, `${r.what}: ${r.ratio} < ${r.min}`);
  const ui = readFileSync(join(REPO, "desktop/ui.html"), "utf8");
  assert.ok(ui.includes("/*SUNRISE*/") && cssVariables().includes("--coral:#FF7A6B"));
  for (const v of ui.match(/var\(--([a-z]+)\)/gi).map((x) => x.slice(6, -1))) assert.ok(v in SUNRISE || v === "font", `the page uses --${v}, which is not a sunrise colour`);
  assert.match(ui, /<header><img class="maker" src="\/brand\/almiworld-logo\.png" alt="AlmiWorld — live beautifully">/);
  assert.ok(existsSync(join(REPO, "desktop/brand/almiworld-logo.png")) && existsSync(join(REPO, "installer/almiworld.ico")));
  assert.match(readFileSync(join(REPO, "installer/Setup.cs"), "utf8"), /GetManifestResourceStream\("almiworld-logo\.png"\)/);
});

/* ---- C · the products home screen ---- */
test("C · PRODUCTS: each product in its own folder, read and written only through its own id; an id that would leave the products folder is REFUSED; the plan limit in plain words", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr299-products-"));
  try {
    const st = productStore(dir);
    const a = st.create({ name: "Widgetry Prep (test project)", site: "https://prep.widgetry.example" });
    const b = st.create({ name: "Widgetry Jobs (second test product)", site: "https://jobs.widgetry.example" });
    st.write(a.id, { ...st.read(a.id), setup: { ...st.read(a.id).setup, languages: { codes: ["en", "ar"] } }, started: true });
    assert.equal(st.read(b.id).setup.languages, undefined, "B sees A's answer");
    assert.notEqual(st.dirOf(a.id), st.dirOf(b.id));
    /* RR-307 D1: a product counts only the steps that fit its answers (with no answer yet to "What do you want to grow?": goal, product, AI assistant) */
    assert.deepEqual(st.list().map((p) => productCard(p).state), ["Set up — working", "Setting up (1 of 3 steps answered)"]);
    for (const bad of ["..", "../company", "a/../../x", "C:\\x", "", "A", "-x", "x".repeat(41)]) assert.throws(() => st.dirOf(bad), (e) => e.code === "NOT_A_PRODUCT_ID", bad);
    assert.ok(PRODUCT_ID.test(a.id) && PRODUCT_ID.test(b.id));
    /* the second guard, alone: a resolved folder outside (or equal to) the products folder is never a product folder */
    for (const bad of ["..", "../company", ".", "../products-x"]) assert.equal(insideProducts(st.root, resolvePath(st.root, bad)), false, bad);
    assert.equal(insideProducts(st.root, resolvePath(st.root, a.id)), true);
    const k = generateKeyPairSync("ed25519"), pub = k.publicKey.export({ type: "spki", format: "pem" });
    const lic = (plan) => { const l = { account: "a", plan, status: "ACTIVE", periodEnd: new Date(Date.now() + 9e8).toISOString(), issuedAt: new Date().toISOString() }; return licenceState({ now: Date.now(), check: { reached: true, signed: { licence: l, signature: sign(null, licenceBytes(l), k.privateKey).toString("base64") } }, publicKeyPem: pub }); };
    assert.equal(planLimitLine(lic("visibility_1"), 1), "Your plan allows 1 product. Choose a bigger plan to add more.");
    assert.equal(planLimitLine(lic("visibility_5"), 2), "Your plan allows 5 products — 2 added.");
    assert.equal(planLimitLine(lic("visibility_unlimited"), 7), "Your plan allows unlimited products (7 added).");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
