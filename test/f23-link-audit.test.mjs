/**
 * F23 · INTERNAL AND EXTERNAL LINK AUDIT — proved under F23 Acceptance Amendment 2 (_handoffs eeb7245; RR-263): the row is standalone and
 * audits ONLY the pages the engine built — before publish and once live. No crawl batch is an input.
 *
 * One firing control per clause on constructed pages of TWO UNRELATED subjects (a pump shop and a village choir — neither is any real
 * client's field); the bounded link-status check driven with an in-process network; both entry points driven in a scratch world with no
 * egress; and the REAL test: every declared client's built and live pages, counts only. Constructed pages prove the mechanism only.
 * The production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

import * as READER from "../src/audit/link-audit-reader.mjs";
import { auditLinks, auditPage, linksOf, destinationOf, weakOf, pageLanguage, nameIsAddress, formatPart, formatPage, STATE, VERDICT, MISSING, POPULATION, LINK_STATUS_RECORD } from "../src/audit/page-links.mjs";
import { canon } from "../src/audit/link-audit-reader.mjs";
import { clientPages, storedDestinations, auditClientPages, publishedAddress, NO_ADDRESS_BASE } from "../src/audit/built-page-links.mjs";
import { planLinkCheck, checkLinks, observationRecord, liveReadRecord, pacingOf, challenged, REFUSAL, LIVE_READ_RECORD } from "../src/audit/link-status.mjs";
import { GENERIC_LINK_NAMES, LINK_NAME_AUTHORITY, WEAK, LINK_CHECK, LINK_CHECK_OWNER_CEILING, NOT_MEASURED_REASON, CHALLENGE_HEADERS } from "../config/audit/link-rules.mjs";
import { JOINED_RECORD } from "../src/page/joined-page.mjs";
import { CANCEL_RECORD } from "../src/page/built-page-needs.mjs";
import { STAMP } from "../src/page/test-exception.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { RESIGHTING_TYPE } from "../src/evidence/store.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { CONNECTOR_KINDS } from "../src/tenancy/root-registry.mjs";
import { PRODUCT_WORDS } from "../tools/product-boundary.mjs";
import { classifyEntryPoint } from "../tools/tenant-scope-census.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, DATA_ROOT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const running = (file) => readFileSync(join(REPO, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const F23_FILES = ["src/audit/page-links.mjs", "src/audit/built-page-links.mjs", "src/audit/link-status.mjs", "bin/link-audit.mjs", "bin/link-status.mjs"];

/* ── two unrelated constructed subjects ── */
const T = "tenant:fixture-a", OTHER = "tenant:fixture-b";
const SHOP = "pumps.invalid", CHOIR = "choir.invalid";
const doc = (body, lang = "en") => `<!doctype html><html${lang ? ` lang="${lang}"` : ""}><head><title>T</title></head><body>${body}</body></html>`;
const built = (body, hosts = [SHOP], more = {}) => ({ population: POPULATION.BUILT, canonical: NO_ADDRESS_BASE, html: body === null ? null : doc(body, more.lang === undefined ? "en" : more.lang), internalHosts: hosts });
const seen = (url, state, more = {}) => ({ record_type: LINK_STATUS_RECORD, tenantId: T, url, state, hops: 0, reason: null, ...more });
const audit = (pages, observations = [], opts = {}) => auditLinks({ pages, recordsOf: (u) => observations.filter((o) => canon(o.url) === u), canon, ...opts });
const a = (href, inner = "a name") => `<a href="${href}">${inner}</a>`;

/* ================= C1 ================= */

test("C1 · FIRING CONTROL: every <a href> is read once per occurrence — comments, script, style and template are not links, skipped hrefs are not links; a page with no stored body contributes none and is counted absent", () => {
  const body = `${a(`https://${SHOP}/a`)}${a(`https://${SHOP}/a`)}${a("https://elsewhere.invalid/x")}<!-- ${a("https://c.invalid/1")} --><script>${a("https://s.invalid/1")}</script><template>${a("https://t.invalid/1")}</template>${a("#top")}${a("mailto:a@b.invalid")}${a("tel:1")}`;
  const r = audit([built(body), built(null)]);
  assert.deepEqual([r.pages, r.pagesWithBody, r.absentPages, r.links, r.perPage.map((p) => [p.hasBody, p.links])], [2, 1, 1, 3, [[true, 3], [false, 0]]], "a link was dropped, counted twice, or a page with no body was silently skipped");
  assert.deepEqual(linksOf(doc(body), NO_ADDRESS_BASE).map((l) => l.to), [`https://${SHOP}/a`, `https://${SHOP}/a`, "https://elsewhere.invalid/x"]);
  assert.ok(r.incomplete && r.absent.some((x) => /1 of 2 page\(s\) have no stored body/.test(x)), "an absent body is not named");
  /* an unclosed anchor still counts its target; its name is NOT MEASURED — never guessed */
  const open = audit([built(`<a href="https://${SHOP}/open">never closed`)]);
  assert.deepEqual([open.links, open.parts.anchorName.counts.notMeasured], [1, 1]);
});

const build = (value, body, more = {}) => ({ record_type: JOINED_RECORD, measurement_key: `${JOINED_RECORD}:${value}:${more.n ?? 1}`, value, stamp: STAMP, recorded_at: more.at ?? "2026-09-01T00:00:00Z", html: doc(body), itemList: [], ...(more.record ?? {}) });

test("C1 · POPULATION · FIRING CONTROL: only the pages the engine built are read — built and not published, and live from the client's own declared host; another client's records are never read; a client with no page is 0, each population by name, and not an error; the same mechanism serves two unrelated subjects", () => {
  const shop = [
    build("pumps", a(`https://${SHOP}/fit`) + a("https://maker.invalid/spec")),
    build("valves", a(`https://${SHOP}/v`), { n: 1 }), build("valves", a(`https://${SHOP}/v2`) + a(`https://${SHOP}/v3`), { n: 2, at: "2026-09-02T00:00:00Z" }),
    build("cancelled", a(`https://${SHOP}/gone`)),
    build("live-one", a(`https://${SHOP}/old`), { record: { publishedUrl: `https://${SHOP}/guides/live-one`, publishedAt: "2026-09-03" } }),
    build("live-unread", a(`https://${SHOP}/u`), { record: { publishedUrl: `https://${SHOP}/guides/unread`, publishedAt: "2026-09-03" } }),
    build("elsewhere", a(`https://${SHOP}/e`), { record: { publishedUrl: "https://not-declared.invalid/p", publishedAt: "2026-09-03" } }),
  ];
  const decisions = [{ record_type: CANCEL_RECORD, cancelledBuild: `${JOINED_RECORD}:cancelled:1` }];
  const reads = [
    { record_type: LIVE_READ_RECORD, tenantId: T, pageId: "live-one", url: `https://${SHOP}/guides/live-one`, html: doc(a(`https://${SHOP}/live-a`) + a("/live-b") + a("https://maker.invalid/spec")) },
    { record_type: LIVE_READ_RECORD, tenantId: OTHER, pageId: "live-unread", url: `https://${SHOP}/guides/unread`, html: doc(a("https://another-clients.invalid/page")) },
  ];
  const P = clientPages({ batches: [{ batchId: "b1", builds: shop, decisions, reads }], tenantId: T, hosts: [SHOP] });
  assert.deepEqual(P.counts, { built: 2, live: 2, liveWithNoStoredRead: 1, publishedElsewhere: 1, publishedWithNoAddress: 0 });
  assert.deepEqual(P.pages.map((p) => [p.pageId, p.population, p.html === null ? null : linksOf(p.html, p.canonical).length]), [["live-one", POPULATION.LIVE, 3], ["live-unread", POPULATION.LIVE, null], ["pumps", POPULATION.BUILT, 2], ["valves", POPULATION.BUILT, 2]], "a cancelled page, a superseded build, a page on an undeclared host or another client's read is in the population");
  const R = auditClientPages({ batches: [{ batchId: "b1", builds: shop, decisions, reads, observations: [seen(`https://${SHOP}/fit`, STATE.WORKING), seen(`https://${SHOP}/v2`, STATE.WORKING, { tenantId: OTHER })] }], tenantId: T, hosts: [SHOP], canon });
  assert.deepEqual([R.audit.pages, R.audit.absentPages, R.audit.links, R.observedAddresses, R.audit.parts.internal.counts[STATE.WORKING]], [4, 1, 7, 1, 1], "another client's observation was read, or a link was lost");
  /* a live page's own address makes a relative link internal; a built page has no address — only a declared host is internal */
  assert.deepEqual([R.audit.perPage[0].internal.counts[STATE.NOT_MEASURED], R.audit.perPage[0].external.counts[STATE.NOT_MEASURED]], [2, 1]);
  assert.equal(publishedAddress({ publishedUrl: "ftp://x.invalid/a" }), null);
  /* a client with no page: 0, each population by name, never an error */
  const none = auditClientPages({ batches: [{ batchId: "b9", builds: [], decisions: [], reads: [], observations: [] }], tenantId: T, hosts: [SHOP], canon });
  assert.deepEqual([none.population, none.audit.pages, none.audit.links, none.audit.incomplete], [{ built: 0, live: 0, liveWithNoStoredRead: 0, publishedElsewhere: 0, publishedWithNoAddress: 0 }, 0, 0, false]);
  assert.deepEqual(auditClientPages({ batches: [], tenantId: T, hosts: [], canon }).audit.pages, 0);
  /* the second, unrelated subject: the same code, its own pages and its own declared host */
  const choir = auditClientPages({ batches: [{ batchId: "c1", builds: [build("rehearsals", a(`https://${CHOIR}/when`) + a(`https://${SHOP}/fit`) + a("https://hall.invalid/map", "Click here"))], decisions: [], reads: [], observations: [seen(`https://${CHOIR}/when`, STATE.WORKING, { tenantId: OTHER }), seen("https://hall.invalid/map", STATE.BROKEN, { tenantId: OTHER })] }], tenantId: OTHER, hosts: [CHOIR], canon });
  assert.deepEqual([choir.audit.links, choir.audit.parts.internal.denominator, choir.audit.parts.external.denominator, choir.audit.parts.internal.counts[STATE.WORKING], choir.audit.parts.external.counts[STATE.BROKEN], choir.audit.parts.weaklyContextual.weak, choir.audit.verdict], [3, 1, 2, 1, 1, 1, VERDICT.DISPROVED]);
});

test("C1 · NO CRAWL BATCH · CENSUS: no file of the link audit reads a crawl batch, a crawl partition or a batch or date default — a planted read is caught; the reader of a client's crawl partition is gone; the frozen contract says so", () => {
  const CRAWL = /batch-partition|readTenantPartition|readPartitionBodies|observation-batch|BATCH_ID|CRAWL_BATCH|collectionPartition|pagesFromRun|crawl-\d{4}|\b20\d\d-\d\d-\d\d\b/;
  for (const file of F23_FILES) assert.equal(CRAWL.test(running(file)), false, `${file} reads a crawl batch, or carries a batch or a date`);
  assert.equal(CRAWL.test(`${running(F23_FILES[3])}\nimport { BATCH_ID } from "../src/crawl/observation-batch.mjs";`), true, "CONTROL: a planted crawl-batch default is not caught");
  assert.equal(CRAWL.test(`${running(F23_FILES[1])}\nconst DEFAULT_DAY = "2026-09-12";`), true, "CONTROL: a planted date default is not caught");
  /* the earlier crawl-partition reader stays in its file, byte for byte (two other rows' proofs pin it) — no F23 file calls it */
  assert.ok("readClientLinkAudit" in READER, "CONTROL: the earlier reader must still be there for this census to mean anything");
  for (const file of F23_FILES) assert.equal(/readClientLinkAudit|auditLinks\b.*link-audit\.mjs|from "\.\/link-audit-reader\.mjs"[^;]*readClientLinkAudit/.test(running(file)), false, `${file} calls the crawl-partition reader`);
  assert.deepEqual([Object.keys(POPULATION), "CRAWLED" in POPULATION], [["BUILT", "LIVE"], false]);
  assert.ok(ACCEPTANCES.F23.input.includes("No page the engine did not build is read, and no crawl batch is an input."), "the frozen contract in force is not Amendment 2");
  /* the code names no product */
  for (const file of F23_FILES) assert.deepEqual(PRODUCT_WORDS.filter((w) => new RegExp(`\\b${String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(running(file))), [], `${file} carries a product word`);
});

/* ================= C2, C3 ================= */

test("C2 · FIRING CONTROL: an internal link is classed by its target's recorded status — WORKING, BROKEN, REDIRECTED with the length of its chain, BROKEN when a chain ends in an error — and a refused request is NOT MEASURED with its reason, never broken; on a built page 'internal' is the client's declared host", () => {
  const u = (p) => `https://${SHOP}/${p}`;
  const obs = [seen(u("ok"), STATE.WORKING), seen(u("gone"), STATE.BROKEN), seen(u("moved"), STATE.REDIRECTED, { hops: 2 }), seen(u("moved-gone"), STATE.BROKEN, { hops: 3 }),
    seen(u("robots"), STATE.NOT_MEASURED, { reason: NOT_MEASURED_REASON.ROBOTS_DISALLOWED }), seen(u("slow"), STATE.NOT_MEASURED, { reason: NOT_MEASURED_REASON.TIMEOUT }), seen(u("limited"), STATE.NOT_MEASURED, { reason: NOT_MEASURED_REASON.RATE_LIMITED }), seen(u("challenge"), STATE.NOT_MEASURED, { reason: NOT_MEASURED_REASON.CHALLENGED })];
  const r = audit([built(["ok", "gone", "moved", "moved-gone", "robots", "slow", "limited", "challenge", "never"].map((p) => a(u(p))).join(""))], obs);
  const i = r.parts.internal;
  assert.deepEqual([i.denominator, i.counts, i.redirects, i.notMeasuredReasons, r.parts.external.denominator, i.verdict],
    [9, { [STATE.WORKING]: 1, [STATE.REDIRECTED]: 1, [STATE.BROKEN]: 2, [STATE.NOT_MEASURED]: 5 }, { links: 1, hops: 5, longestChain: 3, ofUnknownLength: 0 },
      { [NOT_MEASURED_REASON.ROBOTS_DISALLOWED]: 1, [NOT_MEASURED_REASON.TIMEOUT]: 1, [NOT_MEASURED_REASON.RATE_LIMITED]: 1, [NOT_MEASURED_REASON.CHALLENGED]: 1, [NOT_MEASURED_REASON.NEVER_CHECKED]: 1 }, 0, VERDICT.DISPROVED]);
  /* the latest stored observation decides; a state the contract does not name is NOT MEASURED, never guessed */
  assert.deepEqual([destinationOf([seen(u("x"), STATE.BROKEN), seen(u("x"), STATE.WORKING)]).state, destinationOf([seen(u("x"), "FINE")]).state, destinationOf([]).reason, destinationOf([{ status: 200, error: null, skipped: false }]).state], [STATE.WORKING, STATE.NOT_MEASURED, NOT_MEASURED_REASON.NEVER_CHECKED, STATE.NOT_MEASURED], "a crawl record, or a state the contract does not name, was read as a status");
  /* a built page has no address: the same link is external when its host is not one the client declares */
  assert.deepEqual([audit([built(a(u("ok")), ["someone-else.invalid"])], obs).parts.external.counts[STATE.WORKING], audit([built(a(u("ok")), [])], obs).parts.internal.denominator], [1, 0]);
  /* a refused request never disproves: with only refusals the part cannot be proved, and is not disproved */
  assert.equal(audit([built(a(u("robots")))], obs).parts.internal.verdict, VERDICT.COULD_NOT_PROVE);
  assert.match(formatPart("INTERNAL", i), /redirect chains: 5 hop\(s\) in all, longest 3/);
});

test("C3 · FIRING CONTROL: an external destination with no recorded observation is NOT MEASURED — never working, broken, a pass, a failure or 0; with one it is classed exactly as an internal target", () => {
  const r = audit([built(a("https://elsewhere.invalid/x") + a("https://elsewhere.invalid/y"))]);
  const e = r.parts.external;
  assert.deepEqual([e.counts, e.verdict], [{ [STATE.WORKING]: 0, [STATE.REDIRECTED]: 0, [STATE.BROKEN]: 0, [STATE.NOT_MEASURED]: 2 }, VERDICT.COULD_NOT_PROVE]);
  const line = formatPart("EXTERNAL", e);
  assert.ok(line.includes("WORKING, REDIRECTED and BROKEN are NOT MEASURED") && !/WORKING 0|BROKEN 0/.test(line), "an unmeasured class was printed as 0");
  const measured = audit([built(a("https://elsewhere.invalid/x") + a("https://elsewhere.invalid/y"))], [seen("https://elsewhere.invalid/x", STATE.WORKING), seen("https://elsewhere.invalid/y", STATE.REDIRECTED, { hops: 1 })]).parts.external;
  assert.deepEqual([measured.counts[STATE.WORKING], measured.counts[STATE.REDIRECTED], measured.redirects.hops, measured.verdict], [1, 1, 1, VERDICT.PROVED]);
  /* another client's observations are not this client's */
  assert.equal(storedDestinations({ records: [seen("https://elsewhere.invalid/x", STATE.WORKING, { tenantId: OTHER }), seen("https://elsewhere.invalid/x", STATE.WORKING, { tenantId: undefined })], tenantId: T, canon }).size, 0);
});

/* ================= C4, C5 ================= */

test("C4 · FIRING CONTROL: a link with no accessible name is an ANCHOR PROBLEM; text, aria-label, image alt or title name it; aria-labelledby is NOT MEASURED; a present name is never judged", () => {
  const body = `<a href="/1"></a><a href="/2">text</a><a href="/3" aria-label="label"></a><a href="/4"><img src="i.png" alt="a pump"></a><a href="/5" title="t"></a><a href="/6" aria-labelledby="x">y</a>`;
  const r = audit([{ ...built(body), canonical: `https://${SHOP}/` }]);
  assert.deepEqual([r.parts.anchorName.counts, r.parts.anchorName.needsAPerson, r.parts.anchorName.verdict], [{ named: 4, nameless: 1, notMeasured: 1 }, 4, VERDICT.DISPROVED]);
  assert.equal(audit([{ ...built(`<a href="/2">text</a>`), canonical: `https://${SHOP}/` }]).parts.anchorName.verdict, VERDICT.PROVED);
});

test("C5 · FIRING CONTROL: no page of this population stands in a crawled set, so the inbound links of every page are NOT MEASURED and no page is called orphan; hidden is NOT MEASURED for every link, the missing rendered page named", () => {
  const r = audit([built(a(`https://${SHOP}/a`)), built(a(`https://${SHOP}/b`) + a(`https://${SHOP}/c`))]);
  assert.deepEqual([r.parts.orphaned, r.parts.hidden], [{ notMeasured: 2, denominator: 2, missing: MISSING.orphaned, verdict: VERDICT.COULD_NOT_PROVE }, { notMeasured: 3, denominator: 3, missing: MISSING.hidden, verdict: VERDICT.COULD_NOT_PROVE }]);
  assert.ok(!("unknown" in r.parts.orphaned) && r.absent.some((x) => x.startsWith("inbound links of 2 of 2 page(s)")) && r.absent.some((x) => x.startsWith("hidden:")));
  assert.ok(/a crawled set/.test(MISSING.orphaned) && /a rendered page/.test(MISSING.hidden));
});

/* ================= C6 ================= */

test("C6 · P1 · FIRING CONTROL: no count makes a page's links excessive — the count is reported with its denominator and has no verdict at any size", () => {
  const few = audit([built(a(`https://${SHOP}/a`))], [seen(`https://${SHOP}/a`, STATE.WORKING)]);
  const many = audit([built(Array.from({ length: 3000 }, () => a(`https://${SHOP}/a`)).join(""))], [seen(`https://${SHOP}/a`, STATE.WORKING)]);
  assert.deepEqual([few.parts.excessive, many.parts.excessive], [{ links: 1, denominator: 1, verdict: null }, { links: 3000, denominator: 1, verdict: null }]);
  assert.deepEqual([few.parts.internal.verdict, many.parts.internal.verdict, few.parts.weaklyContextual.verdict, many.parts.weaklyContextual.verdict], [VERDICT.PROVED, VERDICT.PROVED, VERDICT.PROVED, VERDICT.PROVED], "a page failed by its link count");
  assert.ok(!/threshold|maxLinks|MAX_LINKS|tooMany/i.test(running("src/audit/page-links.mjs").replace(/maxLinks: Infinity/g, "")), "a count threshold is in the audit");
});

test("C6 · P2 · FIRING CONTROL: a link is weakly contextual when its name is empty, when it is an image link with no alt text, or when its WHOLE name is a declared generic name — a declared name inside a longer name is not weak; a language with no declared names leaves that limb NOT MEASURED, by name; a link named only by a web address is counted and never weak", () => {
  const body = [`<a href="/1"></a>`, `<a href="/2"><img src="i.png"></a>`, `<a href="/3"><img src="i.png" alt=""></a>`, `<a href="/4"><img src="i.png" alt="a pump"></a>`,
    a("/5", "  Click HERE "), a("/6", "read more"), a("/7", "website"), a("/8", "Article"), a("/9", "click here to see the pump sizes"), a("/10", "our website for fitters"),
    a("/11", "here"), a("/12", "learn more"), a("/13", "https://elsewhere.invalid/p"), a("/14", "the pump size table"), `<a href="/15" aria-labelledby="x">y</a>`, `<a href="/16" aria-label="pump sizes"><img src="i.png"></a>`].join("");
  const page = { ...built(body), canonical: `https://${SHOP}/` };
  const r = audit([page]);
  const w = r.parts.weaklyContextual;
  assert.deepEqual([w.weak, w.byLimb, w.notMeasured, w.genericNotMeasured, w.denominator, w.verdict, r.parts.addressNames],
    [7, { [WEAK.EMPTY_NAME]: 1, [WEAK.IMAGE_NO_ALT]: 2, [WEAK.GENERIC_NAME]: 4 }, 1, 0, 16, VERDICT.DISPROVED, { count: 1, denominator: 16, verdict: null }]);
  const names = GENERIC_LINK_NAMES.en;
  const one = (html) => weakOf(linksOf(doc(html), `https://${SHOP}/`)[0], names);
  assert.deepEqual([one(a("/a", "here")).weak, one(a("/a", "learn more")).weak, one(a("/a", "this page")).weak, one(a("/a", "link")).weak, one(a("/a", "https://elsewhere.invalid/p")).weak, one(a("/a", "read more about valves")).weak], [null, null, null, null, null, null], "a name the declared data does not hold, a web address, or a declared name inside a longer name is weak");
  assert.deepEqual([nameIsAddress("https://elsewhere.invalid/p"), nameIsAddress("www.elsewhere.invalid"), nameIsAddress("see https://elsewhere.invalid/p"), nameIsAddress("pump sizes")], [true, true, false, false]);
  /* a page in a language with no declared names: the generic limb is NOT MEASURED for it, by name — the other two limbs still hold */
  const other = audit([{ ...built(`${a("/1", "click here")}${a("/2", "pumpen")}<a href="/3"></a><a href="/4"><img src="i.png"></a>`, [SHOP], { lang: "de" }), canonical: `https://${SHOP}/` }]).parts.weaklyContextual;
  assert.deepEqual([other.weak, other.byLimb[WEAK.GENERIC_NAME], other.notMeasured, other.genericNotMeasured, other.missing, other.verdict], [2, 0, 2, 2, MISSING.genericNames, VERDICT.DISPROVED]);
  assert.deepEqual([pageLanguage(doc("x", "en-GB")), pageLanguage(doc("x", null)), pageLanguage(doc("x", "DE"))], ["en", null, "de"]);
  assert.equal(audit([{ ...built(a("/1", "click here"), [SHOP], { lang: null }), canonical: `https://${SHOP}/` }]).parts.weaklyContextual.genericNotMeasured, 1, "a page that declares no language was judged by another language's names");
  /* names handed in for another language are used for that language only */
  assert.equal(audit([{ ...built(a("/1", "Hier klicken"), [SHOP], { lang: "de" }), canonical: `https://${SHOP}/` }], [], { genericNames: { de: ["hier klicken"] } }).parts.weaklyContextual.byLimb[WEAK.GENERIC_NAME], 1);
});

test("C6 · DATA · CENSUS: the generic link names are declared data, exactly the authority page's own examples, traced to the recorded decision — none is held in code and none names a product; a planted one is caught", () => {
  assert.deepEqual([Object.keys(GENERIC_LINK_NAMES), [...GENERIC_LINK_NAMES.en]], [["en"], ["click here", "read more", "website", "article"]]);
  assert.deepEqual([LINK_NAME_AUTHORITY.decision.by, /^[0-9a-f]{64}$/.test(LINK_NAME_AUTHORITY.page.bytesSha256), LINK_NAME_AUTHORITY.page.readOn, /^AlmiVisibility_BETA_G_DECISION_/.test(LINK_NAME_AUTHORITY.decision.path)], ["BETA_G", true, "2026-10-14", true]);
  const inCode = (src) => /["'`](click here|read more|learn more|this page|website|article|here|link)["'`]/i.test(src);
  for (const file of F23_FILES) assert.equal(inCode(running(file)), false, `${file} holds a generic link name in code`);
  assert.equal(inCode(`${running(F23_FILES[0])}\nconst GENERIC = ["click here"];`), true, "CONTROL: a planted generic name in code is not caught");
  const data = readFileSync(join(REPO, "config/audit/link-rules.mjs"), "utf8");
  assert.deepEqual(PRODUCT_WORDS.filter((w) => new RegExp(`\\b${String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(data)), [], "the declared data names a product");
});

/* ================= C7 ================= */

test("C7 · FIRING CONTROL: every count carries its denominator and is given per page; any NOT MEASURED makes the population INCOMPLETE and names what is absent; a part is DISPROVED by a broken, nameless or weak link and PROVED only when every link of it is measured; the output carries counts only", () => {
  const u = (p) => `https://${SHOP}/${p}`;
  const pages = [built(a(u("a")) + a("https://elsewhere.invalid/x", "Read more")), built(a(u("b")) + a(u("c")) + a(u("d")))];
  const r = audit(pages, [seen(u("a"), STATE.WORKING), seen(u("b"), STATE.WORKING), seen(u("c"), STATE.REDIRECTED, { hops: 1 }), seen(u("d"), STATE.WORKING), seen("https://elsewhere.invalid/x", STATE.WORKING)]);
  assert.deepEqual(r.perPage.map((p) => [p.links, p.internal.counts[STATE.WORKING] + p.internal.counts[STATE.REDIRECTED], p.external.counts[STATE.WORKING], p.weak.total]), [[2, 1, 1, 1], [3, 3, 0, 0]]);
  assert.deepEqual([r.parts.internal.verdict, r.parts.external.verdict, r.parts.anchorName.verdict, r.parts.weaklyContextual.verdict, r.parts.excessive.verdict, r.parts.addressNames.verdict, r.verdict, r.incomplete],
    [VERDICT.PROVED, VERDICT.PROVED, VERDICT.PROVED, VERDICT.DISPROVED, null, null, VERDICT.DISPROVED, true]);
  for (const p of r.perPage) assert.equal(p.internal.counts[STATE.WORKING] + p.internal.counts[STATE.REDIRECTED] + p.internal.counts[STATE.BROKEN] + p.internal.counts[STATE.NOT_MEASURED] + Object.values(p.external.counts).reduce((x, y) => x + y, 0), p.links, "a page's classes do not add up to its links");
  /* the whole is never PROVED while a limb is NOT MEASURED — hidden and inbound always are */
  const clean = audit([built(a(u("a")))], [seen(u("a"), STATE.WORKING)]);
  assert.deepEqual([clean.parts.internal.verdict, clean.verdict, clean.incomplete], [VERDICT.PROVED, VERDICT.COULD_NOT_PROVE, true]);
  assert.equal(audit([built(a(u("a"))), built(null)], [seen(u("a"), STATE.WORKING)]).parts.internal.verdict, VERDICT.COULD_NOT_PROVE, "a part read PROVED over an incomplete population");
  /* counts only: no address, host, link name or page text in what is printed */
  const printed = [...r.perPage.map((p, i) => formatPage(p, i + 1, r.perPage.length)), formatPart("INTERNAL", r.parts.internal), formatPart("EXTERNAL", r.parts.external), formatPage(auditPage({ page: built(null), recordsOf: () => [], canon }), 1, 1)].join("\n");
  assert.ok(!/https?:|\.invalid|Read more|a name/.test(printed), "the output carries an address, a host or a link name");
  assert.match(printed, /page 1 of 2 · BUILT, NOT YET PUBLISHED · language en · links 2 \(count only — never a pass or a failure\)/);
  assert.match(printed, /internal 1 of 2: WORKING 1 · REDIRECTED 0 · BROKEN 0 · NOT MEASURED 0/);
  assert.match(printed, /weak 1 of 2 \(EMPTY NAME 0 · IMAGE LINK WITH NO ALT TEXT 0 · GENERIC NAME 1\)/);
  assert.match(printed, /no stored body — its links are absent/);
});

/* ================= C8 ================= */

/** an in-process network: nothing leaves the machine; the clock moves only when the check sleeps */
const net = (routes = {}) => {
  const calls = [];
  let now = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ url, at: now, method: init.method, agent: init.headers["User-Agent"], redirect: init.redirect });
    const r = routes[url] ?? (url.endsWith("/robots.txt") ? { status: 404 } : { status: 200 });
    if (r.fail) throw Object.assign(new Error("no answer"), { name: r.fail });
    return { status: r.status, ok: r.status >= 200 && r.status < 300, headers: { get: (h) => r.headers?.[h.toLowerCase()] ?? null }, text: async () => r.body ?? "", body: { cancel: async () => {} } };
  };
  return { calls, fetchImpl, sleep: async (ms) => { now += ms; }, clock: () => now };
};
const check = (urls, routes, more = {}) => { const n = net(routes); return checkLinks({ urls, fetchImpl: n.fetchImpl, sleep: n.sleep, clock: n.clock, ...more }).then((run) => ({ run, calls: n.calls })); };
const stateOf = (run, url) => { const o = run.observations.find((x) => x.url === url); return [o.state, o.reason, o.hops]; };

test("C8 · FIRING CONTROL: the check requests only the link targets, the hops their redirects name and each host's robots file — one GET for each distinct address, never twice; at least the declared interval between two requests to one host; robots respected; a chain is followed hop by hop and its length recorded; a refused request — access refused (401, 403, 407) among them — is NOT MEASURED with its reason, never broken; a robots file answered 4xx places no restriction and one answered 5xx, timed out or unreachable disallows (RFC 9309)", async () => {
  const A = "https://a.invalid", B = "https://b.invalid";
  const urls = [`${A}/1`, `${A}/2`, `${A}/3`, `${B}/x`, `${B}/y`, "https://c.invalid/p", "https://d.invalid/q", "https://e.invalid/r", "https://f.invalid/s", "https://g.invalid/t", "https://h.invalid/u", "https://i.invalid/v", "https://j.invalid/long"];
  const routes = {
    [`${A}/2`]: { status: 301, headers: { location: "/3" } }, [`${B}/x`]: { status: 404 }, [`${B}/y`]: { status: 302, headers: { location: `${B}/z` } }, [`${B}/z`]: { status: 410 },
    "https://c.invalid/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /p\n" }, "https://d.invalid/robots.txt": { status: 500 },
    "https://e.invalid/r": { status: 429 }, "https://f.invalid/s": { status: 403, headers: { [CHALLENGE_HEADERS[0]]: "challenge" } }, "https://g.invalid/t": { fail: "AbortError" },
    "https://h.invalid/u": { status: 301 }, "https://i.invalid/v": { status: 302, headers: { location: "/w" } }, "https://i.invalid/w": { status: 302, headers: { location: "/v" } },
    ...Object.fromEntries(Array.from({ length: 7 }, (_, k) => [`https://j.invalid/${k === 0 ? "long" : `h${k}`}`, { status: 301, headers: { location: `/h${k + 1}` } }])),
  };
  const { run, calls } = await check(urls, routes);
  assert.deepEqual([stateOf(run, `${A}/1`), stateOf(run, `${A}/2`), stateOf(run, `${A}/3`), stateOf(run, `${B}/x`), stateOf(run, `${B}/y`)],
    [[STATE.WORKING, null, 0], [STATE.REDIRECTED, null, 1], [STATE.WORKING, null, 0], [STATE.BROKEN, null, 0], [STATE.BROKEN, null, 1]]);
  assert.deepEqual([stateOf(run, "https://c.invalid/p"), stateOf(run, "https://d.invalid/q"), stateOf(run, "https://e.invalid/r"), stateOf(run, "https://f.invalid/s"), stateOf(run, "https://g.invalid/t"), stateOf(run, "https://h.invalid/u"), stateOf(run, "https://i.invalid/v"), stateOf(run, "https://j.invalid/long")],
    [[STATE.NOT_MEASURED, NOT_MEASURED_REASON.ROBOTS_DISALLOWED, 0], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.ROBOTS_UNKNOWN, 0], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.RATE_LIMITED, 0], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.CHALLENGED, 0],
      [STATE.NOT_MEASURED, NOT_MEASURED_REASON.TIMEOUT, 0], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.NO_LOCATION, 1], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.REDIRECT_LOOP, 2], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.TOO_MANY_HOPS, LINK_CHECK.maxHops + 1]], "a refused request was called broken, or lost its reason");
  /* one request for each distinct address, never twice — the hop /3 was already a planned address and is asked once */
  assert.equal(new Set(calls.map((c) => c.url)).size, calls.length, "an address was requested twice");
  assert.deepEqual([calls.filter((c) => c.url === `${A}/3`).length, calls.some((c) => c.url === "https://c.invalid/p"), calls.some((c) => c.url === "https://d.invalid/q"), run.requests, run.refused], [1, false, false, calls.length, null]);
  /* only what the run may ask for: a planned address, a hop a redirect named, or a host's robots file */
  const hops = new Set([`${B}/z`, "https://i.invalid/w", ...Array.from({ length: 6 }, (_, k) => `https://j.invalid/h${k + 1}`)]);
  assert.deepEqual(calls.filter((c) => !urls.includes(c.url) && !hops.has(c.url) && !c.url.endsWith("/robots.txt")).map((c) => c.url), []);
  assert.ok(calls.every((c) => c.method === LINK_CHECK.method && c.redirect === "manual" && /Bot/.test(c.agent)), "a request was not a plain GET of the engine's own agent, or let the platform follow a redirect");
  /* paced: every two request starts to one host are at least the interval apart */
  const pacing = pacingOf(run.log);
  assert.deepEqual([pacing.underTheInterval, pacing.smallestGapMs >= LINK_CHECK.sameHostIntervalMs, pacing.gaps > 5], [0, true, true]);
  assert.equal(challenged({ headers: { get: () => null } }), false);
  /* RR-263 (beta-g): 401, 403 and 407 refuse access — NOT MEASURED, never BROKEN; a challenge is still named as one */
  const refused = await check(["https://k.invalid/a", "https://k.invalid/b", "https://k.invalid/c", "https://k.invalid/d"], { "https://k.invalid/a": { status: 401 }, "https://k.invalid/b": { status: 403 }, "https://k.invalid/c": { status: 407 }, "https://k.invalid/d": { status: 404 } });
  assert.deepEqual(["a", "b", "c", "d"].map((p) => stateOf(refused.run, `https://k.invalid/${p}`)), [[STATE.NOT_MEASURED, NOT_MEASURED_REASON.ACCESS_REFUSED, 0], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.ACCESS_REFUSED, 0], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.ACCESS_REFUSED, 0], [STATE.BROKEN, null, 0]], "a refusal of access was called broken, or a 404 was not");
  /* RFC 9309: a robots file answered 4xx places no restriction — the address IS checked; 5xx, a timeout or an unreachable host disallow every address */
  const R4 = await check(["https://r1.invalid/p", "https://r2.invalid/p", "https://r3.invalid/p", "https://r5.invalid/p", "https://rt.invalid/p", "https://ru.invalid/p", "https://rr.invalid/p"], {
    "https://r1.invalid/robots.txt": { status: 401 }, "https://r2.invalid/robots.txt": { status: 403 }, "https://r3.invalid/robots.txt": { status: 429 }, "https://r5.invalid/robots.txt": { status: 503 },
    "https://rt.invalid/robots.txt": { fail: "AbortError" }, "https://ru.invalid/robots.txt": { fail: "TypeError" }, "https://rr.invalid/robots.txt": { status: 301, headers: { location: "/elsewhere" } } });
  assert.deepEqual(["r1", "r2", "r3"].map((h) => [stateOf(R4.run, `https://${h}.invalid/p`)[0], R4.calls.some((c) => c.url === `https://${h}.invalid/p`)]), [[STATE.WORKING, true], [STATE.WORKING, true], [STATE.WORKING, true]], "a robots file answered 4xx was taken as a restriction");
  assert.deepEqual(["r5", "rt", "ru", "rr"].map((h) => [...stateOf(R4.run, `https://${h}.invalid/p`).slice(0, 2), R4.calls.some((c) => c.url === `https://${h}.invalid/p`)]), ["r5", "rt", "ru", "rr"].map(() => [STATE.NOT_MEASURED, NOT_MEASURED_REASON.ROBOTS_UNKNOWN, false]), "an unavailable robots file was taken as permission");
  assert.deepEqual(R4.run.observations.map((o) => o.robotsStatus), [401, 403, 429, 503, null, null, 301], "the robots answer's status is not recorded with the observation");
  /* the body of a client's own live page is kept only when asked for; nothing else is */
  const kept = await check([`${A}/live`, `${A}/other`], { [`${A}/live`]: { status: 200, body: doc(a("/x")) }, [`${A}/other`]: { status: 200, body: "not kept" } }, { bodiesFor: new Set([`${A}/live`]) });
  assert.deepEqual([[...kept.run.bodies.keys()], kept.run.bodies.get(`${A}/live`).includes("<a href")], [[`${A}/live`], true]);
  /* the plan: distinct web addresses only; what is not one is counted and never requested */
  const plan = planLinkCheck({ pages: [built(a(`${A}/1`) + a(`${A}/1`) + a("ftp://files.invalid/a") + a(`${B}/x`))], canon });
  assert.deepEqual([plan.urls, plan.occurrences, plan.notHttp], [[`${A}/1`, `${B}/x`], 4, 1]);
});

test("C8 · LIMIT · FIRING CONTROL: at most the declared number of requests in one run — robots files and hops count, and what is left over is NOT MEASURED with that reason; no request at all when the distinct addresses outnumber the limit; nothing is retried", async () => {
  const limits = { ...LINK_CHECK, maxRequests: 5 };
  const urls = ["https://a.invalid/1", "https://b.invalid/1", "https://c.invalid/1", "https://d.invalid/1"];
  const { run, calls } = await check(urls, {}, { limits });
  assert.deepEqual([run.requests, calls.length, run.observations.map((o) => [o.state, o.reason])], [5, 5, [[STATE.WORKING, null], [STATE.WORKING, null], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.REQUEST_LIMIT], [STATE.NOT_MEASURED, NOT_MEASURED_REASON.REQUEST_LIMIT]]], "the limit was passed, or a left-over address was called broken");
  const over = await check([...urls, "https://e.invalid/1", "https://f.invalid/1"], {}, { limits });
  assert.deepEqual([over.run.refused, over.run.requests, over.calls.length, over.run.observations.length, over.run.distinct], [REFUSAL.TOO_MANY, 0, 0, 0, 6], "a request was sent although the distinct addresses outnumber the limit");
  assert.deepEqual([LINK_CHECK.maxRequests, LINK_CHECK.sameHostIntervalMs, LINK_CHECK.method], [100, 2000, "GET"]);
  /* nothing is retried: a failed address is asked once */
  const failed = await check(["https://a.invalid/1"], { "https://a.invalid/1": { fail: "TypeError" } });
  assert.deepEqual([failed.calls.filter((c) => c.url === "https://a.invalid/1").length, stateOf(failed.run, "https://a.invalid/1")], [1, [STATE.NOT_MEASURED, NOT_MEASURED_REASON.NETWORK_ERROR, 0]]);
});

test("C8 · RECORDS · FIRING CONTROL: a measured destination is stored as an observation of what was answered — OBSERVED; a refused one is UNKNOWN, never an observation; a live page's read is kept as answered; each names its client, its day and its run", () => {
  const o = (state, more = {}) => observationRecord({ observation: { url: "https://a.invalid/1", state, reason: null, finalStatus: 200, hops: 0, chain: [], finalUrl: "https://a.invalid/1", ...more }, tenantId: T, on: "2026-09-01", run: "run-1" });
  const ok = o(STATE.WORKING), refused = o(STATE.NOT_MEASURED, { reason: NOT_MEASURED_REASON.ROBOTS_DISALLOWED, finalStatus: null });
  assert.deepEqual([ok.record_type, ok.tenantId, ok.checkedOn, ok.run, ok.method, evidenceStateOf(ok).state, evidenceStateOf(refused).state], [LINK_STATUS_RECORD, T, "2026-09-01", "run-1", "GET", "OBSERVED", "UNKNOWN"]);
  assert.notEqual(o(STATE.WORKING).measurement_key, o(STATE.BROKEN, { finalStatus: 404 }).measurement_key);
  /* a record that names no run, or no address, is placed nowhere — never by default */
  assert.deepEqual([evidenceStateOf({ ...ok, run: "" }).state, evidenceStateOf({ ...ok, url: "" }).state], [null, null]);
  const read = liveReadRecord({ pageId: "p", url: "https://a.invalid/p", html: doc("x"), tenantId: T, on: "2026-09-01", run: "run-1" });
  assert.deepEqual([read.record_type, read.html, read.bodySha256, evidenceStateOf(read).state], [LIVE_READ_RECORD, doc("x"), createHash("sha256").update(doc("x")).digest("hex"), "OBSERVED"]);
  assert.ok(CONNECTOR_KINDS.includes("LINK_DESTINATIONS"));
});

/* ================= the entry points ================= */

const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const rowsIn = (file) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type !== RESIGHTING_TYPE) : []);

test("PRODUCTION PATH · C1 C8: in a scratch world with no egress, for two unrelated subjects — the check refuses before any request when the distinct addresses outnumber the limit, makes no request without --live or without --confirm, and with both asks each distinct address once through the declared connector and stores the observations; the audit then prints each client's own pages, per page, counts only, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const SUBJECTS = [["fixture-pumps", "fixture-pump-pages", `https://${SHOP}`], ["fixture-choir", "fixture-choir-pages", `https://${CHOIR}`]];
  const W = declaredWorld({ extra: [...SUBJECTS.flatMap(([, batch, origin]) => [["RESEARCH_BATCH", batch], ["SITE_ORIGIN", origin]]), ["RESEARCH_BATCH", "fixture-too-many"]] });
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    /* the over-limit batch is reached by its subject's declared connector — its refusal can only be the limit, never the connector's reach */
    const connector = (...batches) => ({ connectorId: "link-destinations", kind: "LINK_DESTINATIONS", credential: null, reaches: batches.map((batch) => ({ resourceKind: "RESEARCH_BATCH", resourceRef: batch })) });
    for (const [subjectId, batch] of SUBJECTS) { mkdirSync(join(W.root, subjectId), { recursive: true }); reg.subjects.push({ subjectId, path: subjectId, members: [{ resourceKind: "RESEARCH_BATCH", resourceRef: batch }, ...(subjectId === "fixture-pumps" ? [{ resourceKind: "RESEARCH_BATCH", resourceRef: "fixture-too-many" }] : [])], connectors: [subjectId === "fixture-pumps" ? connector(batch, "fixture-too-many") : connector(batch)] }); }
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2) + "\n");
    const put = (batch, rows) => { mkdirSync(join(W.root, "research", batch), { recursive: true }); writeFileSync(join(W.root, "research", batch, "joined-pages.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n"); };
    put("fixture-pump-pages", [build("pumps", a(`https://${SHOP}/fit`) + a(`https://${SHOP}/fit`) + a("https://maker.invalid/spec", "Read more"))]);
    put("fixture-choir-pages", [build("rehearsals", a(`https://${CHOIR}/when`))]);
    put("fixture-too-many", [build("crowded", Array.from({ length: LINK_CHECK.maxRequests + 1 }, (_, k) => a(`https://${SHOP}/p${k}`)).join(""))]);
    const log = join(mkdtempSync(join(tmpdir(), "f23-egress-")), "egress.json");
    const env = (mode) => ({ ...W.envWith(), NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log });
    const status = (subject, batch, mode, ...extra) => spawnSync(process.execPath, ["--import", PRELOAD, "bin/link-status.mjs", ...W.argv([`--subject=${subject}`, `--research-batch=${batch}`, "--on=2026-09-01", ...extra])], { cwd: REPO, encoding: "utf8", env: env(mode) });
    const egress = () => JSON.parse(readFileSync(log, "utf8")).fetch;
    /* the distinct addresses outnumber the limit: refused before the connector opens — no request */
    const many = status("fixture-pumps", "fixture-too-many", "refuse", "--live", "--confirm");
    assert.deepEqual([many.status, /DISTINCT_ADDRESSES_OUTNUMBER_THE_REQUEST_LIMIT: 101 distinct address\(es\) against a limit of 100\. NO REQUEST WAS MADE\./.test(many.stderr), egress()], [3, true, 0], many.stdout + many.stderr);
    /* the refusal is the LIMIT's, before the connector opens: no other refusal, no requests line, nothing written */
    assert.deepEqual([/LINK_DESTINATIONS_CONNECTOR_DOES_NOT_REACH/.test(many.stderr), /requests {9}/.test(many.stdout), existsSync(join(W.root, "research", "fixture-too-many", "link-status.jsonl"))], [false, false, false], many.stdout + many.stderr);
    /* RR-271 §4: a run given a higher limit (never above the owner's ceiling) plans with it; a limit above the ceiling, or not a whole
     * number, is a usage refusal — nothing read, no request */
    const raised = status("fixture-pumps", "fixture-too-many", "refuse", `--max-requests=${LINK_CHECK_OWNER_CEILING}`);
    assert.deepEqual([raised.status, new RegExp(`at most ${LINK_CHECK_OWNER_CEILING} request\\(s\\) in this run`).test(raised.stdout), /NOT RUN — no --live/.test(raised.stdout), egress()], [0, true, true, 0], raised.stdout + raised.stderr);
    for (const bad of [`${LINK_CHECK_OWNER_CEILING + 1}`, "0", "1.5", "lots"]) {
      const r = status("fixture-pumps", "fixture-too-many", "refuse", `--max-requests=${bad}`, "--live", "--confirm");
      assert.deepEqual([r.status, /^usage:/.test(r.stderr), egress()], [2, true, 0], `--max-requests=${bad}: ${r.stdout}${r.stderr}`);
    }
    assert.deepEqual([LINK_CHECK.maxRequests, LINK_CHECK_OWNER_CEILING], [100, 300], "the default limit or the owner's ceiling moved");
    /* without --live: the plan, and no request */
    const dry = status("fixture-pumps", "fixture-pump-pages", "refuse");
    assert.deepEqual([dry.status, /plan {13}3 link occurrence\(s\) · 2 distinct address\(es\) on 2 host\(s\)/.test(dry.stdout), /NOT RUN — no --live/.test(dry.stdout), egress(), existsSync(join(W.root, "research", "fixture-pump-pages", "link-status.jsonl"))], [0, true, true, 0, false], dry.stdout + dry.stderr);
    /* a batch the declared connector does not reach is refused before any request */
    const wrong = status("fixture-choir", "fixture-pump-pages", "refuse", "--live", "--confirm");
    /* --live without --confirm: the metered connector refuses before any request (F78) — nothing is requested or written */
    const unconfirmed = status("fixture-pumps", "fixture-pump-pages", "refuse", "--live");
    assert.notEqual(unconfirmed.status, 0, unconfirmed.stdout);
    assert.deepEqual([egress(), existsSync(join(W.root, "research", "fixture-pump-pages", "link-status.jsonl"))], [0, false], "a run without --confirm made a request or wrote");
    assert.notEqual(wrong.status, 0, "a client checked another client's batch");
    assert.equal(egress(), 0);
    for (const [subject, batch, origin] of SUBJECTS) {
      /* RR-271 §4: one run is given a higher limit, and the checker counts against it */
      const limit = subject === "fixture-choir" ? 150 : 100;
      const live = status(subject, batch, "fixture", "--live", "--confirm", ...(limit === 100 ? [] : [`--max-requests=${limit}`]));
      assert.equal(live.status, 0, live.stdout + live.stderr);
      const kept = rowsIn(join(W.root, "research", batch, "link-status.jsonl"));
      const distinct = subject === "fixture-pumps" ? 2 : 1;
      assert.deepEqual([kept.length, kept.every((r) => r.record_type === LINK_STATUS_RECORD && r.tenantId === W.tenantId && r.state === STATE.WORKING && r.checkedOn === "2026-09-01"), new Set(kept.map((r) => r.url)).size], [distinct, true, distinct], live.stdout);
      assert.match(live.stdout, new RegExp(`requests {9}${distinct * 2} made of a limit of ${limit} \\(robots ${distinct} · addresses and hops ${distinct}\\)`));
      assert.match(live.stdout, /gaps under 2000 ms: 0 of \d+/);
      assert.doesNotMatch(live.stdout + live.stderr, /https?:\/\/|\.invalid/, "the check printed an address");
      const out = spawnSync(process.execPath, ["bin/link-audit.mjs", ...W.argv([`--subject=${subject}`])], { cwd: REPO, encoding: "utf8", env: W.envWith() });
      assert.equal(out.status, 0, out.stdout + out.stderr);
      const pages = subject === "fixture-pumps" ? 2 : 1;
      assert.match(out.stdout, new RegExp(`population {3}BUILT, NOT YET PUBLISHED ${pages} page\\(s\\) · LIVE 0 page\\(s\\)`));
      assert.match(out.stdout, /no crawl batch is an input/);
      if (subject === "fixture-pumps") {
        assert.ok(out.stdout.includes("      internal 2 of 3: WORKING 2 · REDIRECTED 0 · BROKEN 0 · NOT MEASURED 0") && out.stdout.includes("      external 1 of 3: WORKING 1 · REDIRECTED 0 · BROKEN 0 · NOT MEASURED 0"), out.stdout);
        assert.ok(out.stdout.includes("weak 1 of 3 (EMPTY NAME 0 · IMAGE LINK WITH NO ALT TEXT 0 · GENERIC NAME 1)"), out.stdout);
        assert.match(out.stdout, /LINK COUNT: 104 link\(s\) on 2 page\(s\) — reported, never a pass or a failure/);
      } else assert.ok(out.stdout.includes("      internal 1 of 1: WORKING 1 · REDIRECTED 0 · BROKEN 0 · NOT MEASURED 0"), out.stdout);
      assert.match(out.stdout, /ORPHANED: inbound links NOT MEASURED for \d+ of \d+ page\(s\)/);
      assert.doesNotMatch(out.stdout + out.stderr, /https?:\/\/|\.invalid|Read more/, "the audit printed an address or a link name");
      void origin;
    }
  } finally { W.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "an entry point wrote into the repository");
});

test("THE ENTRY POINTS are scoped, and the audit loads no module that can make a network, process, connector or paid call — and it fires; the check reaches the network only through the fetch it is handed", () => {
  for (const bin of ["bin/link-audit.mjs", "bin/link-status.mjs"]) { const c = classifyEntryPoint(bin, readFileSync(join(REPO, bin), "utf8")); assert.equal(c.cls, "SCOPED", `${bin}: ${c.why}`); }
  const entries = ["src/audit/page-links.mjs", "src/audit/built-page-links.mjs", "src/audit/link-status.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[2] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  assert.ok(running("bin/link-status.mjs").includes(`fetchImpl: CONNECTOR.fetch`) && running("bin/link-status.mjs").includes(`RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }))`), "the check does not fetch through the declared connector");
});

/* ================= REAL ================= */

const json = (p) => JSON.parse(readFileSync(p, "utf8"));
/** every declared client and the research batches declared to it — read from the declarations, never named here */
const realClients = () => {
  const attachments = json(join(DATA_ROOT, "tenancy", "attachments.json")).attachments;
  return json(join(DATA_ROOT, "tenancy", "tenants.json")).tenants.map((t) => {
    const mine = attachments.filter((x) => x.tenantId === t.tenantId);
    const hosts = mine.filter((x) => x.resourceKind === "SITE_ORIGIN").map((x) => new URL(x.resourceRef).host).sort();
    const batches = mine.filter((x) => x.resourceKind === "RESEARCH_BATCH").map((x) => { const dir = join(DATA_ROOT, "research", x.resourceRef); return { batchId: x.resourceRef, builds: rowsIn(join(dir, "joined-pages.jsonl")), decisions: rowsIn(join(dir, "built-page-needs.jsonl")), reads: rowsIn(join(dir, "live-pages.jsonl")), observations: rowsIn(join(dir, "link-status.jsonl")) }; });
    return { tenantId: t.tenantId, result: auditClientPages({ batches, tenantId: t.tenantId, hosts, canon }) };
  });
};

test("REAL · every declared client's built and live pages: a client with no page is 0 by name; every page's classes add up to its links; a destination with no stored observation is NOT MEASURED; the live pages are 0 until one is published; F23 is VERIFIED only when the status classes are measured on the real population", () => {
  const clients = realClients();
  assert.ok(clients.length > 0, "EMPTY real population: no declared client");
  const withPages = clients.filter((c) => c.result.audit.pages > 0);
  assert.ok(withPages.length > 0, "EMPTY real population: no declared client has a built page");
  for (const c of clients.filter((x) => x.result.audit.pages === 0)) assert.deepEqual([c.result.population.built, c.result.population.live, c.result.audit.links], [0, 0, 0]);
  const sum = (f) => withPages.reduce((n, c) => n + f(c.result), 0);
  const measuredOf = (part) => part.denominator - part.counts[STATE.NOT_MEASURED];
  for (const c of withPages) {
    const A = c.result.audit;
    for (const p of A.perPage) assert.equal(Object.values(p.internal.counts).reduce((x, y) => x + y, 0) + Object.values(p.external.counts).reduce((x, y) => x + y, 0), p.links, "a real page's classes do not add up to its links");
    assert.equal(A.perPage.reduce((n, p) => n + p.links, 0), A.links);
    for (const part of [A.parts.internal, A.parts.external]) assert.ok(Object.keys(part.notMeasuredReasons).every((r) => Object.values(NOT_MEASURED_REASON).includes(r)), "a real NOT MEASURED carries a reason the declared data does not hold");
    assert.deepEqual([A.parts.excessive.verdict, A.parts.orphaned.notMeasured, A.parts.hidden.notMeasured], [null, A.pages, A.links]);
    assert.ok(A.perPage.every((p) => p.population === POPULATION.BUILT || p.population === POPULATION.LIVE));
  }
  const live = sum((r) => r.population.live), internalMeasured = sum((r) => measuredOf(r.audit.parts.internal)), externalMeasured = sum((r) => measuredOf(r.audit.parts.external));
  const board = DECLARED.F23.state;
  console.log(`  REAL (count-only): ${JSON.stringify({ declaredClients: clients.length, clientsWithPages: withPages.length, clientsWithNone: clients.length - withPages.length, builtPages: sum((r) => r.population.built), livePages: live, links: sum((r) => r.audit.links), internal: sum((r) => r.audit.parts.internal.denominator), internalMeasured, external: sum((r) => r.audit.parts.external.denominator), externalMeasured, broken: sum((r) => r.audit.parts.internal.counts[STATE.BROKEN] + r.audit.parts.external.counts[STATE.BROKEN]), redirected: sum((r) => r.audit.parts.internal.counts[STATE.REDIRECTED] + r.audit.parts.external.counts[STATE.REDIRECTED]), weak: sum((r) => r.audit.parts.weaklyContextual.weak), namedOnlyByAnAddress: sum((r) => r.audit.parts.addressNames.count), board })}`);
  /* the frozen contract: never VERIFIED-PASS while the status classes of C2 and C3 have no measured link on the real population */
  if (board === "VERIFIED-PASS") assert.ok(internalMeasured > 0 && externalMeasured > 0, "F23 is VERIFIED-PASS while a status class has no measured link on the real population");
  assert.ok(ACCEPTANCES.F23.evidence.includes("never while the status classes of C2 and C3 have no measured link on it"));
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
