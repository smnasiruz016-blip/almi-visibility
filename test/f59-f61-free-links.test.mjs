/**
 * F59 · Backlink profile (acceptance _handoffs AlmiVisibility_F59_ACCEPTANCE_2026-10-18.md) and F61 · Brand mention monitoring (acceptance
 * _handoffs AlmiVisibility_F61_ACCEPTANCE_2026-10-18.md), RR-287 task F — the clauses provable on today's 0 links: F59 C1–C3, F61 C1–C3.
 * F59 C4–C6 and F61 C4 wait, each named. Free data only (owner decision 3 of RR-285). Firing controls on fixtures; REAL over the client's
 * own Search Console export of 18 Oct 2026, its queries and its stored reads. Nothing fetched or written; the production trail is not written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { linkExports, admitLinks, linkProfile, newAndLost, LINK_SOURCE, LINK_REFUSAL, WAITS as LINK_WAITS } from "../src/research/backlinks.mjs";
import { brandMentions, mentionsOverTime, MENTION, MENTION_SOURCE, WAITS as MENTION_WAITS } from "../src/research/brand-mentions.mjs";
import { productEntity } from "../src/research/entity-register.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { withPrivateTexts, privateSourcesRoot } from "../src/facts/private-texts.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const EXPORT = (on, rows, extra = {}) => ({ record_type: "search_console_export", export_id: `e-${on}`, exportedOn: on, window: { from: "2026-06-01", to: on }, links: { files: 2, rows }, files: { queries: "q", links1: "a", links2: "b" }, ...extra });
const LINK = (from, on, over = {}) => ({ source: LINK_SOURCE.EXPORT, file: "links1", exportedOn: on, window: { from: "2026-06-01", to: on }, from, to: "https://client.example/x", anchor: "a guide", ...over });

test("F59 C1 · FROM THE CLIENT'S OWN EXPORT · FIRING CONTROL: a link from any other source, or without its file, date or window, is refused, named", () => {
  const r = admitLinks([LINK("https://a.example/p", "2026-10-18"), LINK("https://b.example/p", "2026-10-18", { source: "A_PAID_TOOL" }), LINK("https://c.example/p", "2026-10-18", { file: "" }), LINK("https://d.example/p", "2026-10-18", { exportedOn: null }), LINK("https://e.example/p", "2026-10-18", { window: null })]);
  assert.equal(r.admitted.length, 1);
  assert.deepEqual(r.refused.map((x) => x.refused), [LINK_REFUSAL.OTHER_SOURCE, LINK_REFUSAL.NO_FILE, LINK_REFUSAL.NO_DATE, LINK_REFUSAL.NO_WINDOW]);
  assert.deepEqual(linkExports([EXPORT("2026-10-18", 0), { record_type: "search_phrase" }]).map((e) => [e.exportedOn, e.files.length, e.rows]), [["2026-10-18", 2, 0]]);
});

test("F59 C2 · ZERO IS A RESULT · FIRING CONTROL: an export with no link rows reads 0 links on its date — never NOT MEASURED; rows counted but not recorded are a fault, never 0", () => {
  const zero = linkProfile({ exports: linkExports([EXPORT("2026-10-18", 0)]), links: [] });
  assert.deepEqual([zero.measured, zero.dates[0].links, zero.dates[0].state, zero.faults.length], [true, 0, "0 links on 2026-10-18 — a result, not a gap", 0]);
  const lost = linkProfile({ exports: linkExports([EXPORT("2026-10-18", 3)]), links: [] });
  assert.equal(lost.faults.length, 1, "3 counted rows with none recorded read as 0");
  assert.deepEqual([linkProfile({ exports: [], links: [] }).measured, linkProfile({ exports: [], links: [] }).missing], [false, "a Links export of the client's own"]);
});

test("F59 C3 · REFERRING DOMAINS AND ANCHORS · FIRING CONTROL: links grouped by referring domain, each anchor kept as exported", () => {
  const p = linkProfile({ exports: linkExports([EXPORT("2026-10-18", 3)]), links: [LINK("https://www.a.example/1", "2026-10-18", { anchor: "OET guide" }), LINK("https://a.example/2", "2026-10-18", { anchor: "here" }), LINK("https://b.example/1", "2026-10-18", { anchor: "" })] });
  assert.deepEqual(p.dates[0].domains.map((d) => [d.domain, d.links, [...d.anchors]]), [["a.example", 2, ["OET guide", "here"]], ["b.example", 1, [""]]]);
  assert.equal(p.faults.length, 0);
});

test("F59 C4 · NEW AND LOST WAIT FOR A SECOND EXPORT: one export date is NOT MEASURED, the missing export named; two give gained and lost", () => {
  assert.deepEqual({ ...newAndLost({ exports: linkExports([EXPORT("2026-10-18", 0)]), links: [] }) }, { measured: false, missing: LINK_WAITS.C4 });
  const two = newAndLost({ exports: linkExports([EXPORT("2026-09-18", 1), EXPORT("2026-10-18", 1)]), links: [LINK("https://a.example/1", "2026-09-18"), LINK("https://b.example/1", "2026-10-18")] });
  assert.deepEqual([two.gained.length, two.lost.length], [1, 1]);
});

const PRODUCT = { entityId: "product:p1", canonical: "Brandly", aliases: ["Brandly"] };
const ENTITIES = [{ entityId: "other-body", canonical: "Exam Board", aliases: ["Exam Board", "EB"] }];
test("F61 C1 + C2 · FROM THE CLIENT'S OWN DATA, LINKED AND UNLINKED APART · FIRING CONTROL: each mention traced to its source and date; a link row is LINKED, a query or a read UNLINKED; one without a date is not a mention", () => {
  const m = brandMentions({ product: PRODUCT, entities: ENTITIES,
    links: [{ from: "https://a.example/p", exportedOn: "2026-10-18", anchor: "Brandly guide", file: "links1" }],
    queries: [{ phrase: "brandly oet nursing", date: "2026-10-18" }, { phrase: "oet nursing", date: "2026-10-18" }, { phrase: "brandly login", date: null }],
    reads: [{ url: "https://r.example/x", readOn: "2026-10-15", state: "READ", text: "Courses by Brandly and others." }, { url: "https://r.example/y", readOn: "2026-10-15", state: "READ", text: "Nothing here." }, { url: "https://r.example/z", readOn: "2026-10-15", state: "BLOCKED" }] });
  assert.deepEqual(m.mentions.map((x) => [x.source, x.class]), [[MENTION_SOURCE.LINKS, MENTION.LINKED], [MENTION_SOURCE.QUERY, MENTION.UNLINKED], [MENTION_SOURCE.READ, MENTION.UNLINKED]]);
  assert.deepEqual([m.counts.LINKED, m.counts.UNLINKED, m.counts.untraced], [1, 2, 1]);
  assert.ok(m.mentions.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.on)));
  /* 0 is stated as 0 */
  const none = brandMentions({ product: PRODUCT, entities: ENTITIES });
  assert.deepEqual([none.measured, none.counts.mentions, none.counts.LINKED], [true, 0, 0]);
  assert.equal(brandMentions({ product: null }).measured, false);
});

test("F61 C3 · THE INTENDED ENTITY, NOT A NAMESAKE · FIRING CONTROL: a name another entity also carries is listed apart, named — never counted as the client", () => {
  const namesake = [...ENTITIES, { entityId: "brandly-ltd", canonical: "Brandly Ltd", aliases: ["Brandly"] }];
  const m = brandMentions({ product: PRODUCT, entities: namesake, queries: [{ phrase: "brandly reviews", date: "2026-10-18" }] });
  assert.deepEqual([m.counts.mentions, m.counts.namesakes], [0, 1], "a namesake was counted as the client");
  assert.deepEqual([...m.namesakes[0].alsoNames], ["brandly-ltd"]);
  /* CONTROL: without the namesake the same query is the client's */
  assert.equal(brandMentions({ product: PRODUCT, entities: ENTITIES, queries: [{ phrase: "brandly reviews", date: "2026-10-18" }] }).counts.mentions, 1);
});

test("F61 C1 · THE CLIENT'S OWN SITE IS NOT A PUBLIC MENTION · FIRING CONTROL: a stored read of the client's own site naming its brand is listed apart, never counted", () => {
  const reads = [{ url: "https://www.client.example/pricing", readOn: "2026-10-18", state: "READ", text: "Brandly pricing" }, { url: "https://r.example/x", readOn: "2026-10-15", state: "READ", text: "Brandly is cited here." }];
  const m = brandMentions({ product: PRODUCT, entities: ENTITIES, reads, ownHosts: ["client.example"] });
  assert.deepEqual([m.counts.mentions, m.counts.ownSite, m.mentions[0].where], [1, 1, "https://r.example/x"]);
  /* CONTROL: without the client's own hosts, both would count */
  assert.equal(brandMentions({ product: PRODUCT, entities: ENTITIES, reads }).counts.mentions, 2);
});

test("F61 C4 · OVER TIME WAITS FOR A SECOND EXPORT, named", () => {
  assert.deepEqual({ ...mentionsOverTime({ exportDates: ["2026-10-18"] }) }, { measured: false, missing: MENTION_WAITS.C4, exports: 1 });
});

/* ── REAL ── */
const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "search-console-exports.jsonl")) && existsSync(join(BATCH, "entities-2026-10-18.json"));
const rows = (d, f) => (existsSync(join(d, f)) ? readFileSync(join(d, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);

test("REAL · F59 C1–C3 on the client's own export of 18 Oct 2026: 2 Links files, 0 rows → 0 links, 0 domains, stated; C4–C6 wait, named", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const records = rows(BATCH, "search-console-exports.jsonl");
  const exports = linkExports(records);
  const p = linkProfile({ exports, links: records.filter((r) => r.record_type === "search_console_link") });
  assert.deepEqual(p.dates.map((d) => [d.exportedOn, d.files, d.links, d.domains.length]), [["2026-10-18", 2, 0, 0]]);
  assert.deepEqual([p.faults.length, p.refused.length], [0, 0]);
  assert.equal(newAndLost({ exports, links: [] }).measured, false);
  console.log(`  REAL F59 (count-only): exports ${exports.length} · ${p.dates.map((d) => d.state).join("; ")} · domains 0 · C4 waits: ${LINK_WAITS.C4} · C5 waits: ${LINK_WAITS.C5} · C6 waits: ${LINK_WAITS.C6}`);
});

test("REAL · F61 C1–C3 on the client's own data: every mention traced, LINKED 0, the rest UNLINKED, namesakes apart; C4 waits, named", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const subject = lookupSubject(index, "almi-oet");
  const descriptor = join(subject.dir, "descriptor.json");
  const product = productEntity({ ...JSON.parse(readFileSync(descriptor, "utf8")), path: "almi-oet/descriptor.json" });
  const entities = JSON.parse(readFileSync(join(BATCH, "entities-2026-10-18.json"), "utf8")).entities;
  const PRIV = privateSourcesRoot(process.env);
  const reads = withPrivateTexts(rows(BATCH, "source-reads.jsonl"), PRIV.state === "DECLARED" ? rows(join(PRIV.dir, "research", "rr254-test-pages-2026-10-12"), "source-reads.jsonl") : [], { privateRoot: PRIV.state });
  const latest = [...new Map(reads.filter((r) => r.record_type === "source_page_read").map((r) => [r.url, r])).values()];
  const queries = rows(BATCH, "search-console-exports.jsonl").filter((r) => r.record_type === "search_phrase").map((r) => ({ phrase: r.phrase, date: r.date ?? r.observedOn ?? String(r.recorded_at ?? "").slice(0, 10) }));
  const own = [...new Set(rows(BATCH, "joined-pages.jsonl").filter((r) => r.publishedUrl).map((r) => new URL(r.publishedUrl).hostname))];
  assert.ok(own.length > 0, "the client's own site is unknown — its pages would count as public mentions");
  const m = brandMentions({ product, entities, links: [], queries, reads: latest, ownHosts: own });
  assert.equal(m.measured, true);
  assert.equal(m.counts.LINKED, 0, "a LINKED mention without a link row");
  assert.equal(m.counts.untraced, 0, "a mention without its source or date");
  assert.ok(m.mentions.every((x) => x.class === MENTION.UNLINKED));
  /* pins — re-measured on 18 Oct 2026 (RR-287): no public mention of the brand in the client's own data; its own site's 2 pages listed apart */
  assert.deepEqual([m.counts.mentions, m.counts.LINKED, m.counts.UNLINKED, m.counts.namesakes, m.counts.ownSite], PIN_F61);
  console.log(`  REAL F61 (count-only, private texts ${PRIV.state}): product entity ${product.entityId ? "declared" : "absent"} · queries ${queries.length} · reads ${latest.length} · ${JSON.stringify(m.counts)} · C4 waits: ${MENTION_WAITS.C4}`);
});

test("the F59 and F61 modules name no product and load no module that can make a network, process, connector or paid call — and the control fires", () => {
  for (const F of ["src/research/backlinks.mjs", "src/research/brand-mentions.mjs"]) {
    assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
    assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
    const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
    assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  }
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });

const PIN_F61 = PRIVATE_DECLARED() ? [0, 0, 0, 0, 2] : [0, 0, 0, 0, 0];
function PRIVATE_DECLARED() { return privateSourcesRoot(process.env).state === "DECLARED"; }
