/**
 * F60 · EARNED CITATION AND DIGITAL PR OPPORTUNITIES (acceptance _handoffs AlmiVisibility_F60_ACCEPTANCE_2026-10-18.md, RR-287 task E).
 * Free data only (owner decision 3 of RR-285). Firing controls on fixtures; REAL over the client's batch: the sources its published pages'
 * verified claims cite, its stored reads (their private texts for C4, when on this machine) and its published pages. Nothing fetched, sent
 * or written; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { earnedCitations, recordedSources, unlinkedMentions, SOURCE_CLASS, DROP, STANDING } from "../src/research/earned-citations.mjs";
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

const CLAIM = (page, id, link, kind = "RESPONSIBLE_BODY", readOn = "2026-10-15") => ({ page, claimId: id, text: `fact ${id}`, source: { kind, link, readOn } });
const CLAIMS = [
  CLAIM("https://client.example/a", "c1", "https://body.example/rule"),
  CLAIM("https://client.example/b", "c2", "https://body.example/rule"),
  CLAIM("https://client.example/a", "c3", "https://related.example/post", "RELATED"),
];
const READS = [{ url: "https://body.example/rule", readOn: "2026-10-17", state: "READ" }, { url: "https://other.example/x", readOn: "2026-10-17", state: "READ" }];

test("C1 · SOURCES FROM RECORDS ONLY · FIRING CONTROL: every opportunity names a source recorded in the batch, with its URL and its latest recorded date", () => {
  const s = recordedSources({ claims: CLAIMS, reads: READS });
  assert.deepEqual(s.map((x) => [x.url, x.on, [...x.how]]), [["https://body.example/rule", "2026-10-17", ["CITED_BY_A_CLAIM", "STORED_READ"]], ["https://related.example/post", "2026-10-15", ["CITED_BY_A_CLAIM"]], ["https://other.example/x", "2026-10-17", ["STORED_READ"]]]);
  const r = earnedCitations({ claims: CLAIMS, reads: READS });
  assert.ok(r.opportunities.every((o) => s.some((x) => x.url === o.source) && /^\d{4}-\d{2}-\d{2}$/.test(o.on)), "an opportunity names a source the batch does not record, or no date");
});

test("C2 · LEGITIMATE ONLY · FIRING CONTROL: a source recorded as selling links, running a link scheme or hiding sponsorship is refused, named; a source with no recorded class is dropped — never assumed", () => {
  const classes = [{ url: "https://related.example/post", class: "SELLS_LINKS", file: "source-classes.json" }];
  const r = earnedCitations({ claims: CLAIMS, reads: READS, classes });
  assert.deepEqual(r.refused.map((x) => [x.url, x.class]), [["https://related.example/post", "SELLS_LINKS"]]);
  assert.ok(!r.opportunities.some((o) => o.source === "https://related.example/post"), "a link seller was kept");
  /* without a recorded class the same source is dropped, its reason named — never kept */
  const bare = earnedCitations({ claims: CLAIMS, reads: READS });
  assert.ok(bare.dropped.some((d) => d.url === "https://related.example/post" && d.why === DROP.NO_CLASS));
  /* CONTROL: a supplied EDITORIAL class keeps it */
  assert.ok(earnedCitations({ claims: CLAIMS, reads: READS, classes: [{ url: "https://related.example/post", class: SOURCE_CLASS.EDITORIAL, file: "f" }] }).opportunities.some((o) => o.source === "https://related.example/post"));
});

test("C3 · WHY THIS PAGE · FIRING CONTROL: each opportunity names the client page and the fact; a kept source no page answers is dropped with its reason", () => {
  const r = earnedCitations({ claims: CLAIMS, reads: READS });
  assert.deepEqual(r.opportunities.map((o) => [o.source, o.page, o.fact, o.class]), [["https://body.example/rule", "https://client.example/a", "c1", "OFFICIAL"], ["https://body.example/rule", "https://client.example/b", "c2", "OFFICIAL"]]);
  const pageless = earnedCitations({ claims: [{ ...CLAIMS[0], page: null }], reads: READS });
  assert.deepEqual(pageless.dropped.filter((d) => d.url === "https://body.example/rule").map((d) => d.why), [DROP.NO_PAGE]);
});

test("C4 · UNLINKED MENTIONS FROM SUPPLIED DATA · FIRING CONTROL: a mention comes only from a stored read's text or a supplied file; 0 is stated", () => {
  const u = unlinkedMentions({ names: ["Brandly"], reads: [{ url: "https://x.example/1", readOn: "2026-10-15", state: "READ", text: "Brandly helps." }, { url: "https://x.example/2", readOn: "2026-10-15", state: "BLOCKED" }], files: [{ url: "https://y.example/1", date: "2026-10-16", text: "via Brandly" }] });
  assert.deepEqual(u.mentions.map((m) => m.from), ["STORED_READ", "CLIENT_SUPPLIED_FILE"]);
  assert.equal(unlinkedMentions({ names: ["Brandly"], reads: [] }).state, "0 found — stated");
});

test("C5 · NOTHING SENT: every opportunity is a recommendation for the owner; the module holds no network or message call — and the control fires", () => {
  const r = earnedCitations({ claims: CLAIMS, reads: READS });
  assert.equal(r.sent, 0);
  assert.ok(r.opportunities.every((o) => o.standing === STANDING));
  const F = "src/research/earned-citations.mjs";
  assert.deepEqual(decisionCallPaths({ entries: [F] }).faults, []);
  const planted = decisionCallPaths({ entries: [F], read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === F ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  assert.deepEqual(scanSource(readFileSync(join(REPO, F), "utf8")).code, [], `${F} names a product`);
});

/* ── REAL ── */
const index = rootIndexFor(process.env);
const BATCH = join(lookupStore(index, "RESEARCH").dir, "rr254-test-pages-2026-10-12");
const HERE = existsSync(join(BATCH, "page-drafts.json")) && existsSync(join(BATCH, "page-plan-inputs-2026-10-18.json"));
const rows = (d, f) => (existsSync(join(d, f)) ? readFileSync(join(d, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);

test("REAL · the client's batch: every opportunity from a recorded source, OFFICIAL by a verified claim, with its page and fact; every other source dropped or refused by name; unlinked mentions found or 0", { skip: HERE ? false : "the declared batch is not on this machine" }, () => {
  const inputs = JSON.parse(readFileSync(join(BATCH, "page-plan-inputs-2026-10-18.json"), "utf8"));
  const published = [...new Map(rows(BATCH, "joined-pages.jsonl").filter((r) => r.record_type === "joined_page_draft" && r.publishedUrl).map((r) => [r.value, r])).values()];
  const claims = JSON.parse(readFileSync(join(BATCH, "page-drafts.json"), "utf8")).pages.flatMap((p) => p.needs.flatMap((n) => (n.answer?.claims ?? []).map((c) => ({ page: published.find((x) => x.value === p.combination?.[inputs.primary.name])?.publishedUrl ?? null, claimId: c.claimId, text: c.text, source: c.source }))));
  const PRIV = privateSourcesRoot(process.env);
  const reads = withPrivateTexts(rows(BATCH, "source-reads.jsonl"), PRIV.state === "DECLARED" ? rows(join(PRIV.dir, "research", "rr254-test-pages-2026-10-12"), "source-reads.jsonl") : [], { privateRoot: PRIV.state });
  const latest = [...new Map(reads.filter((r) => r.record_type === "source_page_read").map((r) => [r.url, r])).values()];
  const r = earnedCitations({ claims, reads: latest });
  assert.ok(r.counts.opportunities > 0, "EMPTY real population");
  assert.ok(r.opportunities.every((o) => o.class === "OFFICIAL" && o.page && o.fact && /^\d{4}-\d{2}-\d{2}$/.test(o.on)));
  assert.equal(r.counts.sources, r.counts.sourcesKept + r.counts.refused + r.counts.dropped - r.dropped.filter((d) => d.why === DROP.NO_PAGE && r.opportunities.some((o) => o.source === d.url)).length);
  /* C4: unlinked mentions of the client's own product (its declaration) in stored reads off its own site */
  const product = productEntity({ ...JSON.parse(readFileSync(join(lookupSubject(index, "almi-oet").dir, "descriptor.json"), "utf8")), path: "almi-oet/descriptor.json" });
  const own = new Set(published.map((p) => new URL(p.publishedUrl).hostname));
  const u = unlinkedMentions({ names: product.aliases, reads: latest.filter((x) => { try { return !own.has(new URL(x.url).hostname); } catch { return true; } }) });
  /* pins — re-measured on 18 Oct 2026 (RR-287) */
  assert.deepEqual({ ...r.counts }, PIN_F60);
  console.log(`  REAL (count-only): ${JSON.stringify(r.counts)} · unlinked mentions ${u.state} over ${u.readsWithText} read(s) with text (private texts ${PRIV.state}) · sent ${r.sent}`);
});

test("the production trail was not written by this file", () => { assert.equal(trailSha(), TRAIL_BEFORE); });

/* re-measured on 18 Oct 2026 (RR-287): 57 official sources (each cited by a verified claim as the responsible body's own) give 192 opportunities over the 12 published pages; 49 recorded sources carry no recorded class and are dropped, named */
const PIN_F60 = { sources: 106, opportunities: 192, sourcesKept: 57, pages: 12, refused: 0, dropped: 49, droppedNoClass: 49 };
