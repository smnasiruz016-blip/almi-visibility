/**
 * F49 · KNOWLEDGE GRAPH AND ENTITY-LINKING SUPPORT (acceptance _handoffs AlmiVisibility_F49_ACCEPTANCE_2026-10-18.md, RR-285 task 4).
 *
 * Firing controls on fixed records; REAL over the 12 published guides as built, the batch's recorded entity list, the engine's stored reads
 * (the Wikidata reads of 18 Oct 2026 among them) and the client's own declaration. Nothing fetched or written; the production trail is not
 * written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { resolveMention, acceptIdentifier, identifierFromRead, identify, pageMentions, pageDataMismatches, productEntity, wikidataUrlOf, RESOLVED, ID_STATE, ID_REFUSAL, MISMATCH, PRODUCT_REFUSAL } from "../src/research/entity-register.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject } from "../src/tenancy/root-registry.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { scanSource } from "../tools/product-boundary.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS"); };

const ENTS = [
  { entityId: "a", canonical: "Alpha Council (UK)", aliases: ["AC", "Alpha Council"], officialHosts: ["www.alpha.example"], wikipediaTitle: "Alpha Council" },
  { entityId: "b", canonical: "Beta Board", aliases: ["Beta Board"], officialHosts: ["beta.example"] },
  { entityId: "c", canonical: "Beta Board of Gamma", aliases: ["Beta Board"], officialHosts: ["gamma.example"] },
];

test("C1 · ONE ENTITY, ONE NAME · FIRING CONTROL: two spellings of one body are one entity; one name of two bodies is AMBIGUOUS; an unknown name is UNRESOLVED — each by name", () => {
  assert.deepEqual(resolveMention("alpha  council", ENTS), { state: RESOLVED.ONE, entityId: "a" });
  assert.deepEqual(resolveMention("AC", ENTS), { state: RESOLVED.ONE, entityId: "a" });
  assert.deepEqual(resolveMention("Beta Board", ENTS), { state: RESOLVED.TWO, name: "Beta Board", entityIds: ["b", "c"] });
  assert.deepEqual(resolveMention("Delta", ENTS), { state: RESOLVED.NONE, name: "Delta" });
  const page = { publishedUrl: "https://p.example/x", trace: [{ claimId: "k1" }], html: "<table class=\"cmp\"><caption>The result each regulator asks</caption><tr><th scope=\"row\">UK — Alpha Council</th><td>1</td></tr></table>" };
  assert.deepEqual(pageMentions(page, () => "AC").map((m) => m.name), ["AC", "Alpha Council"]);
});

test("C2 · APPROVED IDENTIFIERS ONLY · FIRING CONTROL: an identifier only from Wikidata or the body's own official site, with its read date — a blog, an aggregator or a search result is refused, named", () => {
  const e = ENTS[0];
  assert.equal(acceptIdentifier(e, { value: "https://www.alpha.example/", source: "https://www.alpha.example/x", readOn: "2026-10-15" }).identifier.scheme, "OFFICIAL_SITE");
  assert.equal(acceptIdentifier(e, { value: "Q1", source: "https://www.wikidata.org/wiki/Special:ItemByTitle/enwiki/Alpha_Council", readOn: "2026-10-18" }).identifier.scheme, "WIKIDATA");
  for (const src of ["https://blog.example/post", "https://aggregator.example/alpha", "https://search.example/?q=alpha"]) assert.equal(acceptIdentifier(e, { value: "x", source: src, readOn: "2026-10-18" }).refused, ID_REFUSAL.SOURCE, `${src} was accepted`);
  assert.equal(acceptIdentifier(e, { value: "x", source: "https://www.alpha.example/", readOn: null }).refused, ID_REFUSAL.NO_DATE);
});

test("C3 · NO IDENTIFIER IS GUESSED · FIRING CONTROL: no approved read → NO IDENTIFIER with what was checked and the date; a Wikidata item whose official website is not the body's own is never taken; a name match alone is refused", () => {
  const blocked = { url: "https://www.alpha.example/a", state: "BLOCKED", reason: "ROBOTS_DISALLOWED", readOn: "2026-10-15" };
  const wrongItem = { url: wikidataUrlOf(ENTS[0]), state: "READ", landedUrl: "https://www.wikidata.org/wiki/Q9", text: "Alpha Council official website https://other.example/", readOn: "2026-10-18" };
  const [r] = identify([ENTS[0]], [blocked, wrongItem], { on: "2026-10-18" });
  assert.equal(r.state, ID_STATE.NONE);
  assert.deepEqual(r.checked.map((c) => c.state), ["BLOCKED", "READ"]);
  assert.equal(r.on, "2026-10-18");
  assert.equal(r.line, "CHECKED_NOT_FOUND");
  const rightItem = { ...wrongItem, text: "Alpha Council official website https://www.alpha.example/" };
  assert.deepEqual(identifierFromRead(ENTS[0], rightItem), { value: "Q9", source: wrongItem.url, readOn: "2026-10-18" }, "CONTROL: the item naming the body's own site is taken");
  assert.equal(acceptIdentifier(ENTS[0], { value: "Q9", source: wrongItem.url, readOn: "2026-10-18", byName: true }).refused, ID_REFUSAL.NAME_ONLY);
});

test("C4 · SAME ON PAGE AND IN DATA · FIRING CONTROL: a sameAs that is not the entity's own identifier, or a name not on the page, is named; the entity's own is clean", () => {
  const identified = [{ entityId: "a", state: ID_STATE.IDENTIFIED, identifiers: [{ scheme: "OFFICIAL_SITE", value: "https://www.alpha.example/" }] }];
  const page = (sameAs, name = "Alpha Council") => `<p>The Alpha Council asks for B.</p><script type="application/ld+json">${JSON.stringify({ "@type": "Organization", name, sameAs })}</script>`;
  assert.deepEqual(pageDataMismatches(page("https://www.alpha.example/"), ENTS, identified), []);
  assert.deepEqual(pageDataMismatches(page("https://www.other.example/"), ENTS, identified).map((m) => m.mismatch), [MISMATCH.SAME_AS]);
  assert.deepEqual(pageDataMismatches(page("https://www.alpha.example/", "Omega Board"), ENTS, identified).map((m) => m.mismatch), [MISMATCH.NAME_NOT_ON_PAGE]);
});

test("C5 · OWN PRODUCT, OWN RECORDS · FIRING CONTROL: the product entity comes only from the client's own declaration; any other source is refused", () => {
  const p = productEntity({ kind: "OWNER_DECLARED_SUBJECT", subjectId: "s", ownerValues: { product: "Acme — tests online." }, path: "s/descriptor.json" });
  assert.deepEqual([p.canonical, p.source.kind, p.source.path], ["Acme", "CLIENT_DECLARATION", "s/descriptor.json"]);
  assert.equal(productEntity({ kind: "THIRD_PARTY_LISTING", subjectId: "s", ownerValues: { product: "Acme" }, path: "x" }).refused, PRODUCT_REFUSAL.NOT_DECLARED);
  assert.equal(productEntity(null).refused, PRODUCT_REFUSAL.NOT_DECLARED);
});

/* ── REAL ── */
const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "entities-2026-10-18.json"));
const SKIP = HERE ? false : "the declared batch is not on this machine";
const json = (f) => JSON.parse(readFileSync(join(BATCH, f), "utf8"));
const rows = (f) => readFileSync(join(BATCH, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
function real() {
  const entities = json("entities-2026-10-18.json").entities;
  const body = new Map(); for (const p of json("page-drafts.json").pages) for (const n of p.needs) for (const c of n.answer?.claims ?? []) body.set(c.claimId, c.body ?? c.source?.body ?? null);
  const pages = [...new Map(rows("joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.publishedUrl, r])).values()];
  const latest = [...new Map(rows("source-reads.jsonl").filter((r) => r.record_type === "source_page_read").map((r) => [r.url, r])).values()];
  return { entities, body, pages, latest, identified: identify(entities, latest, { on: "2026-10-18" }) };
}

test("REAL · C1: every entity mention on the 12 live guides resolves to exactly one entity of the recorded list, or is listed by name", { skip: SKIP }, () => {
  const { entities, body, pages } = real();
  assert.equal(pages.length, 12);
  const ms = pages.flatMap((p) => pageMentions(p, (id) => body.get(id))).map((m) => resolveMention(m.name, entities));
  assert.ok(ms.length > 0);
  assert.ok(ms.every((r) => r.state === RESOLVED.ONE || typeof r.name === "string"), "a mention is neither resolved nor named");
  assert.equal(new Set(entities.map((e) => e.entityId)).size, entities.length, "two entities share an id");
  console.log(`  REAL (count-only): entities ${entities.length} · mentions ${ms.length}: RESOLVED ${ms.filter((r) => r.state === RESOLVED.ONE).length} · UNRESOLVED ${ms.filter((r) => r.state === RESOLVED.NONE).length} · AMBIGUOUS ${ms.filter((r) => r.state === RESOLVED.TWO).length}`);
});

test("REAL · C2 + C3: every attached identifier names its source and read date, from the body's own site or Wikidata; every other entity is NO IDENTIFIER with what was checked — the Wikidata reads of 18 Oct 2026 BLOCKED by its robots, named", { skip: SKIP }, () => {
  const { entities, identified, latest } = real();
  const ids = identified.flatMap((x) => (x.identifiers ?? []).map((i) => ({ ...i, e: entities.find((e) => e.entityId === x.entityId) })));
  assert.ok(ids.length > 0, "no identifier attached — C2's population is empty");
  for (const i of ids) { assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(i.readOn)); const h = new URL(i.source).host; assert.ok(h === "www.wikidata.org" || i.e.officialHosts.includes(h), `${i.e.entityId}: ${h} is not an approved source`); }
  const wd = entities.map(wikidataUrlOf).map((u) => latest.find((r) => r.url === u));
  assert.equal(wd.filter(Boolean).length, entities.length, "an entity has no Wikidata read on file");
  const none = identified.filter((x) => x.state === ID_STATE.NONE);
  for (const x of none) assert.ok(x.checked.length > 0 && x.on && x.line === "CHECKED_NOT_FOUND", `${x.entityId}: NO IDENTIFIER without what was checked`);
  console.log(`  REAL (count-only): IDENTIFIED ${identified.length - none.length} · NO IDENTIFIER ${none.length} · identifiers ${ids.length} (official sites ${ids.filter((i) => i.scheme === "OFFICIAL_SITE").length}, Wikidata ${ids.filter((i) => i.scheme === "WIKIDATA").length}) · Wikidata reads ${wd.length}: ${[...new Set(wd.map((r) => `${r.state}${r.reason ? ` ${r.reason}` : ""}`))].join(", ")}`);
});

test("REAL · C4: the 12 live guides as built — every sameAs checked against its page; mismatches named, or 0", { skip: SKIP }, () => {
  const { entities, pages, identified } = real();
  const mm = pages.flatMap((p) => pageDataMismatches(p.html, entities, identified));
  assert.deepEqual(mm, [], `mismatches: ${JSON.stringify(mm)}`);
  console.log(`  REAL (count-only): pages 12 · sameAs entries ${pages.reduce((s, p) => s + (p.html.match(/"sameAs"/g) ?? []).length, 0)} · mismatches 0`);
});

test("REAL · C5: the product entity's source is the client's declaration", { skip: SKIP }, () => {
  const subject = lookupSubject(index, "almi-oet");
  const path = join(subject.dir, "descriptor.json");
  const p = productEntity({ ...JSON.parse(readFileSync(path, "utf8")), path: "almi-oet/descriptor.json" });
  assert.equal(p.source.kind, "CLIENT_DECLARATION");
  assert.ok(typeof p.canonical === "string" && p.canonical.length > 0);
  console.log(`  REAL (count-only): the product entity from ${p.source.kind} (${p.source.path})`);
});

test("ENTRY · bin/entity-register.mjs: counts by default; a bad call is a usage exit", { skip: SKIP }, () => {
  const go = (args) => spawnSync(process.execPath, ["bin/entity-register.mjs", "--subject=almi-oet", "--research-batch=rr254-test-pages-2026-10-12", ...args, "--tenant=tenant:93b991d5afa33b16ccb9166b249593b6", "--actor=actor:cc"], { cwd: REPO, encoding: "utf8" });
  const r = go(["--entities=entities-2026-10-18.json", "--on=2026-10-18"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /mentions {9}\d+ on 12 page\(s\): RESOLVED \d+/);
  assert.equal(go(["--entities=x.json", "--on=2026-10-18"]).status, 2);
});

test("the register names no product and loads no module that can make a network, process, connector or paid call — and the control fires", () => {
  const F = "src/research/entity-register.mjs";
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });
