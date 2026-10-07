/**
 * 🔴 RR-206 · R7 — F94 · SITE ARCHITECTURE AND INTERNAL-LINKING PLAN (acceptance _handoffs 959ae05, approved by its hash d1f5991f…,
 * contract ec58f949…).
 *
 * ONE TEST PER EVIDENCE LINE of the frozen acceptance (C1–C7 and [ALL]); each FAILURE limb has its sabotage in
 * test/helpers/rr206-sabotage.mjs, naming the test it turns red. FIXTURE PAGES ONLY (RR-177): a fixture tenant on a fixture origin, its
 * completeness decided by F31's own function and its decisions by F35's. The ONE real read is C5's count-only control on the recorded
 * inventory SHAPES — page and observation records, edges, sitemap records and declarations; no page body is read and no page's content is
 * used. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { planSite, planFaults, targetStatus, boundOf, STATUS, URL_STATE, CLUSTER, SUBJECT, NOT_MEASURED, COMPLETE, STANDING } from "../src/page/site-plan.mjs";
import { readClientSitePlans, placementSubjects } from "../src/page/site-plan-evidence.mjs";
import { decideGroupedNeed, DECISION } from "../src/page/action-decision.mjs";
import { scopeCompleteness } from "../src/crawl/scope-completeness.mjs";
import { canonicalUrl } from "../src/evidence/ids.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { readTenantPartition, readPartitionEdges } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { declaredScope } from "../src/page/existing-page-population.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PLAN = "src/page/site-plan.mjs", EVID = "src/page/site-plan-evidence.mjs";
const code = (f) => readFileSync(join(REPO, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const canon = (u) => canonicalUrl(u);

/* ---- the fixture site: one tenant, one origin; a hub (/guides) with two spokes of the need "renewal" ---- */
const A = "https://site-plan-fixture.invalid", B = "https://another-origin.invalid";
const T = "tenant:rr206-fixture", T2 = "tenant:rr206-other";
const ON = "2026-10-07", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const pg = (pageId, path, covers = [], tenantId = T) => ({ pageId, tenantId, url: `${A}${path}`, covers });
const ROOT = pg("p-root", "/"), GUIDES = pg("p-guides", "/guides", ["renewal"]), TIME = pg("p-time", "/guides/renewal-time", ["renewal"]);
const FORM = pg("p-form", "/guides/renewal-form", ["renewal"]), CONTACT = pg("p-contact", "/contact");
const PAGES = [ROOT, GUIDES, TIME, FORM, CONTACT];
const edge = (from, path) => ({ fromPageId: from, toUrl: `${A}${path}`, ref: `edge:${from}->${path}` });
const HUB_EDGES = [edge("p-guides", "/guides/renewal-time"), edge("p-guides", "/guides/renewal-form")];
const EDGES = [...HUB_EDGES, edge("p-time", "/guides/renewal-form"), edge("p-root", "/guides")];
const served = (pages, over = {}) => { const m = new Map(pages.map((p) => [canon(p.url), [{ status: 200, error: null, skipped: false }]])); for (const [u, r] of Object.entries(over)) m.set(canon(u), r); return (u) => m.get(canon(u)) ?? []; };

/* ---- completeness by F31's own function, over fixture records ---- */
const obs = (id, url) => ({ record_type: "observation", observation_id: id, observed_at: AT, value: { requested_url: url, final_url: url, status: 200, redirect_chain: [], truncated: false } });
function verdict(pages, extraListed = []) {
  const urls = pages.map((p) => p.url);
  const observations = urls.map((u, i) => obs(`o${i}`, u));
  const listed = [...urls, ...extraListed];
  const sitemaps = [{ record_type: "observation", observation_id: "sm", observed_at: AT, value: { origin: A, urls: listed, coverageState: "COMPLETE", childrenSkipped: 0, urlsTotal: listed.length, urlsStored: listed.length } }];
  return scopeCompleteness({ origins: [A], observations, sitemaps, edges: [], freshnessRule: { freshnessDays: 30 }, now: NOW });
}
const COMPLETE_V = verdict(PAGES);
const INCOMPLETE_V = verdict(PAGES, [`${A}/guides/never-observed`]);

/* ---- F35's own decision: a grouped need it chose to CREATE (the production function) ---- */
const CREATE = decideGroupedNeed({
  need: { needId: "need:renewal-fees", pageCandidate: JSON.stringify([["topic", "renewal"]]), questions: 1, tier: "OBSERVED", centralSupported: true },
  coverage: { coverage: "NONE", measurement_key: "coverage:renewal-fees", pages: [] },
  rightToExist: { outcome: "ESTABLISHED", reason: "rte:renewal-fees", parts: {} },
  duplication: { state: "NO_COMPARISON_PAGE", ref: "no comparison page (D1)" },
});
/** an existing page F35 chose to improve (F35's decision shape: CHOSEN, a FIX action) */
const improve = (pageId) => ({ subject: { kind: "EXISTING_PAGE", pageId }, decision: DECISION.CHOSEN, actions: [{ action: "FIX", standing: "RECOMMENDATION", rule: "fixture", evidence: [`fixture:${pageId}`] }], missing: [] });

const NEW = { decision: CREATE, slug: "renewal-fees", need: "renewal" };
function plan({ subject = NEW, pages = PAGES, edges = EDGES, recordedUrls = [], recordsOf = served(pages), completeness = COMPLETE_V, hubNeeds = [], origins = [A] } = {}) {
  return planSite({ tenantId: T, subject, pages, recordedUrls, edges, recordsOf, completeness, hubNeeds, origins });
}
const faults = (p, { pages = PAGES, recordedUrls = [], origins = [A], recordsOf = served(pages), hubNeeds = [] } = {}) => planFaults(p, { tenantId: T, pages, recordedUrls, origins, recordsOf, hubNeeds }).map((f) => f.code);
const ids = (list) => list.map((x) => x.pageId).sort();
const clone = (p) => JSON.parse(JSON.stringify(p));

test("FIXTURE · F35 chose CREATE for the fixture need (the production decision), and F31 decides the two fixture inventories COMPLETE and INCOMPLETE", () => {
  assert.equal(CREATE.decision, DECISION.CHOSEN, JSON.stringify(CREATE.missing));
  assert.deepEqual(CREATE.actions.map((a) => a.action), ["CREATE"]);
  assert.deepEqual([COMPLETE_V.state, INCOMPLETE_V.state], ["COMPLETE", "INCOMPLETE"]);
});

/* ================= C1 ================= */
test("T94-C1 · F94 C1 THE URL: a site with a recorded path pattern gets a URL that follows it, naming the pages it was read from; no pattern leaves it NOT MEASURED naming the missing input; the obvious URL already recorded is refused as an existing page; no proposed URL is on another origin", () => {
  const p = plan();
  assert.deepEqual([p.url.state, p.url.url, p.url.pattern], [URL_STATE.PROPOSED, `${A}/guides/renewal-fees`, "/guides/{slug}"]);
  assert.deepEqual(p.url.readFrom.sort(), ["p-form", "p-time"], "the URL does not name the recorded pages its pattern was read from");
  assert.deepEqual(faults(p), []);
  /* controls: no pattern — one page under the path, no page of the need, two different paths, no slug, an undeclared origin */
  const one = plan({ pages: [ROOT, TIME, CONTACT], edges: [] });
  const none = plan({ subject: { ...NEW, need: "visas" } });
  const two = plan({ pages: [...PAGES, pg("p-help", "/help/renewal-help", ["renewal"])] });
  const noSlug = plan({ subject: { ...NEW, slug: null } });
  const undeclared = plan({ origins: [B] });
  for (const [x, why] of [[one, /one recorded page under this path is not a pattern/], [none, /a recorded page of the same need/], [two, /2 different paths/], [noSlug, /slug/], [undeclared, /an origin declared to this tenant/]]) {
    assert.deepEqual([x.url.state, x.url.url], [URL_STATE.NOT_MEASURED, null], "a missing pattern was filled by default");
    assert.match(x.url.missing, why);
  }
  /* control: the obvious URL is already a recorded page, or a recorded (sitemap-listed) URL — refused, never proposed */
  const taken = plan({ subject: { ...NEW, slug: "renewal-time" } });
  assert.deepEqual([taken.url.state, taken.url.url, taken.url.existingPage], [URL_STATE.REFUSED_EXISTING_PAGE, null, "p-time"]);
  const listed = plan({ subject: { ...NEW, slug: "renewal-new" }, recordedUrls: [`${A}/guides/renewal-new`] });
  assert.deepEqual([listed.url.state, listed.url.url], [URL_STATE.REFUSED_EXISTING_PAGE, null]);
  /* census: no proposed URL in this battery is on another origin, and every one follows its pattern under the pages it names */
  const battery = [p, one, none, two, noSlug, undeclared, taken, listed, plan({ subject: { ...NEW, slug: "renewal-dates" } })];
  for (const x of battery.filter((y) => y.url.state === URL_STATE.PROPOSED)) {
    assert.equal(new URL(x.url.url).origin, A, "a proposed URL is on another origin");
    for (const id of x.url.readFrom) assert.ok(x.url.url.startsWith(`${new URL(PAGES.find((q) => q.pageId === id).url).href.replace(/\/[^/]*$/, "")}/`), "the URL does not follow the pattern of the pages it names");
  }
  /* the validator refuses each C1 failure, planted */
  const at = (url, extra = {}) => ({ ...clone(p), url: { ...p.url, url, ...extra } });
  assert.ok(faults(at(`${B}/guides/renewal-fees`)).includes("URL_ON_ANOTHER_ORIGIN"));
  assert.ok(faults(at(`${A}/guides/renewal-time`)).includes("URL_COLLIDES_WITH_A_RECORDED_PAGE"));
  assert.ok(faults(at(p.url.url, { readFrom: [] })).includes("URL_WITHOUT_ITS_PATTERN_PAGES"));
  assert.ok(faults(at(p.url.url, { readFrom: ["p-invented"] })).includes("PATTERN_READ_FROM_AN_UNRECORDED_PAGE"));
});

/* ================= C2 ================= */
test("T94-C2 · F94 C2 THE BREADCRUMB: every step of the fixture trail is a recorded page; a missing middle step is named as missing and never invented", () => {
  const p = plan();
  assert.equal(p.breadcrumb.state, "RECORDED");
  assert.deepEqual(p.breadcrumb.steps.map((s) => s.pageId), ["p-root", "p-guides", null]);
  assert.deepEqual(p.breadcrumb.steps.map((s) => s.url), [`${A}/`, `${A}/guides`, `${A}/guides/renewal-fees`]);
  assert.equal(p.breadcrumb.steps.at(-1).planned, true);
  assert.ok(p.breadcrumb.steps.every((s) => !("title" in s)), "a breadcrumb step carries a title no record holds");
  assert.deepEqual(faults(p), []);
  /* control: /guides is not a recorded page — the step is MISSING, named, and nothing fills it */
  const gap = plan({ pages: [ROOT, TIME, FORM, CONTACT], edges: [] });
  assert.equal(gap.url.state, URL_STATE.PROPOSED);
  assert.deepEqual(gap.breadcrumb.steps[1], { pageId: null, url: `${A}/guides`, state: "MISSING", why: "no recorded page of this tenant holds this step" });
  assert.deepEqual([gap.breadcrumb.state, gap.breadcrumb.missingSteps], ["INCOMPLETE TRAIL", [`${A}/guides`]]);
  assert.deepEqual(faults(gap, { pages: [ROOT, TIME, FORM, CONTACT] }), []);
  /* the validator refuses each C2 failure, planted */
  const step = (fn) => { const x = clone(p); fn(x.breadcrumb); return faults(x); };
  assert.ok(step((b) => { b.steps[1].pageId = "p-invented"; }).includes("BREADCRUMB_STEP_NOT_A_RECORDED_PAGE"));
  assert.ok(step((b) => { b.steps[1].title = "Guides"; }).includes("BREADCRUMB_STEP_TITLE_INVENTED"));
  const hidden = clone(gap); hidden.breadcrumb.state = "RECORDED";
  assert.ok(faults(hidden, { pages: [ROOT, TIME, FORM, CONTACT] }).includes("MISSING_STEP_HIDDEN"));
});

/* ================= C3 ================= */
test("T94-C3 · F94 C3 THE LINKS: fixture links in and out, each a recorded page with its recorded reason; a broken and a redirected target are never planned, one with no recorded status is carried NOT MEASURED; another tenant's page is refused; no count or maximum decides the number of links", () => {
  const p = plan();
  assert.deepEqual([ids(p.linksIn), ids(p.linksOut)], [["p-form", "p-guides", "p-time"], ["p-form", "p-guides", "p-time"]]);
  for (const l of [...p.linksIn, ...p.linksOut]) assert.ok(typeof l.reason?.ref === "string" && l.reason.ref !== "", `${l.pageId} carries no recorded reason`);
  assert.deepEqual(p.linksOut.map((l) => [l.pageId, l.reason.kind]).sort(), [["p-form", "SAME_NEED"], ["p-guides", "CLUSTER_HUB"], ["p-time", "SAME_NEED"]]);
  assert.match(p.linksOut.find((l) => l.pageId === "p-time").reason.ref, /^F33:COVERS:p-time:renewal$/);
  assert.deepEqual(p.linksIn.find((l) => l.pageId === "p-time").extends, ["edge:p-time->/guides/renewal-form"], "the recorded link a planned link extends is not named");
  assert.ok(p.linksOut.every((l) => l.targetStatus === STATUS.WORKING) && p.linksIn.every((l) => l.targetStatus === STATUS.NOT_MEASURED));
  assert.ok(![...p.linksIn, ...p.linksOut].some((l) => l.pageId === "p-contact"), "a page with no recorded reason is linked");
  assert.deepEqual(faults(p), []);
  /* controls: broken, redirected, not served, no recorded status */
  const recs = served(PAGES, { [FORM.url]: [{ status: 404 }], [TIME.url]: [{ status: 301 }], [GUIDES.url]: [] });
  const s = plan({ recordsOf: recs });
  assert.deepEqual(s.notPlanned.map((n) => [n.pageId, n.status]).sort(), [["p-form", STATUS.BROKEN], ["p-time", STATUS.REDIRECTED]]);
  assert.deepEqual(s.linksOut.map((l) => [l.pageId, l.targetStatus]), [["p-guides", STATUS.NOT_MEASURED]], "a target with no recorded status was reported other than NOT MEASURED");
  assert.equal(targetStatus([{ status: null, error: "connection reset", skipped: false }]), STATUS.NOT_SERVED);
  const ns = plan({ recordsOf: served(PAGES, { [FORM.url]: [{ status: null, error: "connection reset", skipped: false }] }) });
  assert.deepEqual(ns.notPlanned.map((n) => [n.pageId, n.status]), [["p-form", STATUS.NOT_SERVED]]);
  assert.deepEqual(faults(s, { recordsOf: recs }), []);
  /* an existing page recorded BROKEN is never the target of a planned link in */
  const brokenSelf = plan({ subject: { decision: improve("p-time"), pageId: "p-time" }, recordsOf: served(PAGES, { [TIME.url]: [{ status: 500 }] }) });
  assert.deepEqual([brokenSelf.linksIn.length, brokenSelf.notPlanned.filter((n) => n.direction === "IN").length], [0, 2]);
  /* control: another tenant's page, planted among this tenant's — refused, never linked */
  const planted = pg("p-other", "/guides/renewal-other", ["renewal"], T2);
  const o = plan({ pages: [...PAGES, planted] });
  assert.deepEqual(o.refused.map((r) => r.pageId), ["p-other"]);
  assert.ok(![...o.linksIn, ...o.linksOut].some((l) => l.pageId === "p-other"), "another tenant's page is linked");
  /* census: no count decides — 40 spokes of the need, all 40 planned (plus the hub); and no limit in the links code */
  const many = Array.from({ length: 40 }, (_, i) => pg(`p-s${i}`, `/guides/renewal-${i}`, ["renewal"]));
  const big = plan({ pages: [...PAGES, ...many] });
  assert.equal(big.linksOut.length, 43, "the number of links was capped");
  const section = (readFileSync(join(REPO, PLAN), "utf8").split("C3 · the links in and out")[1]?.split("C5 · what may be claimed")[0] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(section.length > 0, "the links section was not found");
  const LIMIT = /\.slice\(|\b(MAX|LIMIT|QUOTA|CAP)\w*|\.length\s*[<>]=?\s*\d|\.length\s*===?\s*[1-9]/;
  assert.doesNotMatch(section, LIMIT, "a count, quota or maximum decides the links");
  assert.match("for (const p of linked.slice(0, 5)) {", LIMIT, "the census cannot see a planted limit");
  /* the validator refuses each C3 failure, planted */
  const tamper = (fn, opts) => { const x = clone(p); fn(x); return faults(x, opts); };
  assert.ok(tamper((x) => { x.linksOut[0].reason = null; }).includes("LINK_WITHOUT_A_RECORDED_REASON"));
  assert.ok(tamper((x) => { x.linksOut.push({ pageId: "p-other", url: planted.url, reason: { ref: "x" }, targetStatus: STATUS.WORKING }); }).includes("LINK_TO_A_PAGE_NOT_RECORDED_FOR_THIS_TENANT"));
  assert.ok(tamper(() => {}, { recordsOf: recs }).includes("LINK_TO_A_BROKEN_REDIRECTED_OR_NOT_SERVED_TARGET"));
  assert.ok(tamper((x) => { x.linksOut.forEach((l) => { l.targetStatus = STATUS.WORKING; }); }, { recordsOf: served(PAGES, { [GUIDES.url]: [] }) }).includes("UNMEASURED_TARGET_REPORTED_AS_WORKING"));
});

/* ================= C4 ================= */
test("T94-C4 · F94 C4 THE CLUSTER: a fixture page joins the existing hub; a new hub with a recorded verified need is proposed naming that record; with no verified need no hub is created", () => {
  const p = plan();
  assert.deepEqual([p.cluster.state, p.cluster.hub.pageId], [CLUSTER.JOINS_HUB, "p-guides"]);
  assert.deepEqual(p.cluster.evidence, ["F33:COVERS:p-guides:renewal", "edge:p-guides->p-time", "edge:p-guides->p-form"]);
  /* no recorded hub (no hub edges), COMPLETE inventory */
  const flat = { edges: [edge("p-time", "/guides/renewal-form")] };
  const need = { kind: "REGISTERED_NEED_VALUE", need: "renewal", ref: "registered-need:renewal" };
  const n = plan({ ...flat, hubNeeds: [need] });
  assert.deepEqual([n.cluster.state, n.cluster.hubNeed, n.cluster.hub], [CLUSTER.NEW_HUB, need, undefined]);
  assert.ok(n.cluster.evidence.includes("registered-need:renewal"), "the new hub does not name its record");
  assert.deepEqual(faults(n, { hubNeeds: [need] }), []);
  const f35 = { kind: "F35_CHOSEN_GROUPED_NEED", need: "renewal", ref: "F35:need:renewal-hub" };
  assert.equal(plan({ ...flat, hubNeeds: [f35] }).cluster.state, CLUSTER.NEW_HUB);
  /* controls: no verified need — none, another need's, an unknown kind, an empty ref */
  for (const hubNeeds of [[], [{ ...need, need: "visas" }], [{ ...need, kind: "A_GUESS" }], [{ ...need, ref: "" }]]) {
    const x = plan({ ...flat, hubNeeds });
    assert.deepEqual([x.cluster.state, x.cluster.hub, x.cluster.hubNeed], [CLUSTER.NO_HUB, undefined, undefined], "a hub was created with no recorded verified need");
  }
  /* the validator refuses each C4 failure, planted */
  const t = (fn, opts) => { const x = clone(p); fn(x.cluster); return faults(x, opts); };
  assert.ok(t((c) => { c.hub.pageId = "p-invented"; }).includes("HUB_IS_NOT_A_RECORDED_PAGE"));
  assert.ok(t((c) => { c.evidence = []; }).includes("CLUSTER_WITHOUT_EVIDENCE"));
  assert.ok(t((c) => { c.state = CLUSTER.NEW_HUB; c.hubNeed = { ...need }; }, { hubNeeds: [] }).includes("NEW_HUB_WITHOUT_A_RECORDED_VERIFIED_NEED"));
});

/* ================= C5 ================= */
/** count-only, records only: one declared tenant's completeness verdict and its recorded structure — no page body is read */
function realShape(resolve, tenantId) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve });
  const sm = readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve });
  const raw = readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds });
  const declared = declaredScope({ tenantId });
  const v = scopeCompleteness({ origins: declared.origins, observations: part.records.filter((r) => r.record_type === "observation"), sitemaps: sm.records.filter((r) => r.record_type === "observation"), edges: raw, freshnessRule: declared.freshnessRule, now: new Date() });
  const pageOf = new Map();
  const pages = part.records.filter((r) => r.record_type === "page").map((r) => { for (const o of r.observations ?? []) pageOf.set(o, r.page_id); return { pageId: r.page_id, tenantId, url: r.canonical_url, covers: [] }; });
  const edges = raw.map((e) => ({ fromPageId: pageOf.get(e.from_observation_id), toUrl: e.to, ref: "edge" })).filter((e) => e.fromPageId);
  return { v, pages, edges, origins: declared.origins };
}
test("T94-C5 · F94 C5 THE BOUND: the real-structure control — every real tenant's completeness is INCOMPLETE or UNKNOWN, so every real plan carries its bound and decides nothing that needs completeness; a COMPLETE fixture decides the same parts; a claim of 'no other page covers this' on an INCOMPLETE fixture is refused", () => {
  /* REAL (count-only, records only): every declared tenant with a site origin */
  const resolve = createTenantResolver();
  const tenants = (readDeclarations().tenants ?? []).map((t) => t.tenantId).filter((id) => declaredScope({ tenantId: id }).origins.length > 0);
  assert.ok(tenants.length > 0, "no real tenant was read — the control would prove nothing");
  const tally = {};
  let realPlans = 0;
  for (const id of tenants) {
    const r = realShape(resolve, id);
    tally[r.v.state] = (tally[r.v.state] ?? 0) + 1;
    assert.ok(["INCOMPLETE", "UNKNOWN"].includes(r.v.state), `a real tenant's inventory is ${r.v.state}`);
    if (!r.pages.length) continue;
    const subject = { decision: improve(r.pages[0].pageId), pageId: r.pages[0].pageId };
    const x = planSite({ tenantId: id, subject, pages: r.pages, edges: r.edges, recordsOf: () => [], completeness: r.v, origins: r.origins });
    realPlans += 1;
    assert.deepEqual([x.planned, x.complete, x.bound?.state], [true, false, r.v.state]);
    assert.match(x.presentedAs, /^PARTIAL PLAN — the inventory is (INCOMPLETE|UNKNOWN)/);
    assert.ok(typeof x.bound?.text === "string" && x.bound.text.length > 0 && x.bound.counts, "a real plan lacks its bound");
    assert.deepEqual(Object.values(x.claims), [NOT_MEASURED, NOT_MEASURED, NOT_MEASURED, NOT_MEASURED], "a completeness-dependent part was decided on a real inventory");
    assert.notEqual(x.cluster.state, CLUSTER.NEW_HUB);
    assert.notEqual(x.cluster.state, CLUSTER.NO_HUB);
    assert.deepEqual(planFaults(x, { tenantId: id, pages: r.pages, origins: r.origins }), []);
  }
  assert.equal(tally.COMPLETE ?? 0, 0);
  assert.ok(realPlans > 0, "no real plan was made — the control would prove nothing");
  console.log(`  REAL (count-only, records only): ${tenants.length} tenant(s) · ${Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ")} · ${realPlans} real-structure plan(s), every one PARTIAL with its bound`);

  /* the same world, COMPLETE then INCOMPLETE */
  const need = { kind: "REGISTERED_NEED_VALUE", need: "renewal", ref: "registered-need:renewal" };
  const flat = { edges: [edge("p-time", "/guides/renewal-form")], hubNeeds: [need] };
  const c = plan(), cn = plan(flat);
  assert.deepEqual([c.complete, c.presentedAs, c.notMeasured], [true, "PLAN OVER A COMPLETE INVENTORY", []]);
  assert.deepEqual(c.claims, { noOtherPageCovers: false, noOtherPageLinksIn: true, noHubExists: false, urlUnique: true });
  assert.deepEqual(cn.claims.noHubExists, true);
  assert.equal(cn.cluster.state, CLUSTER.NEW_HUB);
  const i = plan({ completeness: INCOMPLETE_V }), inn = plan({ ...flat, completeness: INCOMPLETE_V });
  assert.deepEqual([i.complete, i.bound?.state, i.bound?.counts?.listedUnobserved, typeof i.bound?.text], [false, "INCOMPLETE", 1, "string"]);
  assert.match(i.presentedAs, /^PARTIAL PLAN — the inventory is INCOMPLETE: nothing is claimed about pages it does not hold$/);
  assert.deepEqual(i.claims, { noOtherPageCovers: NOT_MEASURED, noOtherPageLinksIn: NOT_MEASURED, noHubExists: NOT_MEASURED, urlUnique: NOT_MEASURED });
  assert.deepEqual([inn.cluster.state, inn.cluster.hubNeed], [CLUSTER.NOT_MEASURED, undefined], "a new hub was proposed on an INCOMPLETE inventory");
  assert.match(inn.cluster.missing, /an unobserved page may already be this need's hub/);
  assert.deepEqual([faults(i), faults(inn, { hubNeeds: [need] })], [[], []]);
  /* no verdict at all is UNKNOWN, named — never COMPLETE by default */
  assert.deepEqual([boundOf(null).state, boundOf(null).text], ["UNKNOWN", "no completeness verdict recorded (F31)"]);
  assert.equal(plan({ completeness: null }).complete, false);
  /* controls: on the INCOMPLETE plan, a claim of "no other page covers this", a presentation as complete, a missing bound, a decided hub */
  const t = (fn, opts) => { const x = clone(i); fn(x); return faults(x, opts); };
  assert.ok(t((x) => { x.claims.noOtherPageCovers = true; }).includes("CLAIM_BEYOND_AN_INCOMPLETE_INVENTORY"), "'no other page covers this' on an INCOMPLETE inventory was not refused");
  assert.ok(t((x) => { x.complete = true; x.presentedAs = "PLAN OVER A COMPLETE INVENTORY"; }).includes("PARTIAL_PLAN_PRESENTED_AS_COMPLETE"));
  assert.ok(t((x) => { delete x.bound; }).includes("BOUND_MISSING"));
  assert.ok(t((x) => { x.cluster.state = CLUSTER.NO_HUB; }).includes("HUB_DECIDED_ON_AN_INCOMPLETE_INVENTORY"));
});

/* ================= C6 ================= */
test("T94-C6 · F94 C6 ONE TENANT, READ-ONLY: F94's path loads no network, process, provider or connector module and writes no store; in a two-tenant fixture world a run reads only its own tenant", () => {
  for (const m of [PLAN, EVID]) assert.deepEqual(decisionCallPaths({ entries: [m] }).faults, [], `${m} can call out`);
  const planted = decisionCallPaths({ entries: [PLAN], read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === PLAN ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  const WRITES = /from "node:fs"|writeFileSync|appendFileSync|createWriteStream|createJsonlStore|\.append\(|recordDecision|recordPartition|publish\(|ai-providers|connectors\.mjs/;
  for (const m of [PLAN, EVID]) assert.doesNotMatch(code(m), WRITES, `${m} writes, records or reaches a provider`);
  assert.match('import { writeFileSync } from "node:fs";', WRITES, "the census cannot see a planted write");
  assert.ok(code(EVID).includes(`${"read"}ExistingPagePopulation({ scope: { tenantId }, resolve, env, now })`), "F31's reader is handed a scope that can record");
  /* the pure plan: two tenants' pages handed in together — only the run's own tenant is planned */
  const mixed = [...PAGES, ...PAGES.map((p) => ({ ...p, pageId: `${p.pageId}-b`, tenantId: T2 }))];
  const p = plan({ pages: mixed });
  assert.deepEqual(p.refused.map((r) => r.pageId).sort(), PAGES.map((q) => `${q.pageId}-b`).sort());
  assert.ok([...p.linksIn, ...p.linksOut, ...p.breadcrumb.steps].every((l) => !String(l.pageId).endsWith("-b")), "another tenant's page is in the plan");
  /* the reader: a two-tenant fixture store; every read asks for the run's own tenant only */
  const W = twoTenantWorld();
  const r = readClientSitePlans({ tenantId: T, actionEvidence: { compiled: { forConstruction: [{ decision: CREATE, slug: "renewal-fees" }] } }, values: ["renewal"], io: W.io });
  assert.equal(r.fault, null);
  assert.deepEqual([...new Set(W.asked)], [T], "a read asked for another tenant");
  assert.deepEqual([r.plans.length, r.refused.length], [1, 0], JSON.stringify(r.refused.map((x) => x.faults ?? x.why)));
  assert.ok(r.plans[0].linksOut.length > 0 && r.plans[0].linksOut.every((l) => l.pageId.startsWith("a-")), "the run planned another tenant's page");
  assert.equal(r.plans[0].standing, STANDING);
});

/** a fixture store holding two tenants' records; its readers return only the asked tenant's, and log every ask */
function twoTenantWorld() {
  const asked = [];
  const world = {};
  for (const [tenant, prefix] of [[T, "a"], [T2, "b"]]) {
    const paths = ["/", "/guides", "/guides/renewal-time", "/guides/renewal-form"];
    const records = [], html = [];
    paths.forEach((path, i) => {
      const id = `${prefix}-${i}`, o = `${prefix}-o${i}`;
      records.push({ record_type: "page", page_id: id, canonical_url: `${A}${path}`, observations: [o] });
      records.push({ record_type: "observation", observation_id: o, observed_at: AT, value: { requested_url: `${A}${path}`, final_url: `${A}${path}`, status: 200 } });
      html.push({ pageId: id, html: i ? "<article><h1>Renewal guide</h1><p>Renewal steps.</p></article>" : "<article><h1>Home</h1></article>" });
    });
    world[tenant] = { records, observationIds: records.filter((r) => r.record_type === "observation").map((r) => r.observation_id), html, edges: [{ from_observation_id: `${prefix}-o1`, to: `${A}/guides/renewal-time` }, { from_observation_id: `${prefix}-o1`, to: `${A}/guides/renewal-form` }] };
  }
  const io = {
    partition: ({ batchId, tenantId }) => { asked.push(tenantId); return batchId === BATCH_ID ? { records: world[tenantId].records, observationIds: world[tenantId].observationIds } : { records: [], observationIds: [] }; },
    edges: ({ observationIds }) => Object.values(world).flatMap((w) => w.edges).filter((e) => observationIds.includes(e.from_observation_id)),
    population: ({ tenantId }) => { asked.push(tenantId); return { population: { pages: world[tenantId].html, completeness: COMPLETE_V }, fault: null }; },
    origins: ({ tenantId }) => { asked.push(tenantId); return [A]; },
  };
  return { io, asked };
}

/* ================= C7 ================= */
const OTHER_ROWS = Object.freeze({
  "src/page/draft-render.mjs": "9eabd5524fd1c866239e532a31acefeaa1d9a02d8c86be19497d4fafcc37af36",
  "src/page/content-brief.mjs": "5771c6955fcc621430391b9c34a525a74673e81a3ff4d3b05cf429d358ad5c06",
  "src/page/content-brief-evidence.mjs": "b1af103909fa3ef4782686380c4d1c5e14c473f5e73e1080f29fb1c06c37abe6",
  "bin/build-page.mjs": "8f9329026462d6d3b634ae3c7d927b922543c6b525b9781445a9e55687e3eb23",
  "src/crawl/batch-partition.mjs": "94c5fdcf901e80df57cfa528f1deaca4ffe17a5e7ed8826045558d6fa55af434",
  "src/crawl/scope-completeness.mjs": "836378e2c90f8c0a945450fe39c845dffe3a85bf9100210806eaf86206b9cb55",
  "src/crawl/scope-inventory.mjs": "b86e203845542a456fa0f49b83adeb4ea4063069f481f0b353dae5277d0bd758",
  "src/page/existing-page-population.mjs": "6177a0b989b192b1e24bf310acaa07f6f9c4e8a36d85efcb9de0188670b28525",
  "src/page/need-coverage.mjs": "75b88c1578530598b848a137ab73b66316d095a0eba5fe1966ff5bb4050e6b30",
  "src/page/action-decision.mjs": "74a70c37571842c4fde1ad7392f5442c0f0bd778ac0cccd1e0d7c4c057c8e2c8",
  "src/page/action-evidence.mjs": "fa87018736e057e786f78e396e512f41318b3c3dc78095bc389081fcc9eaec67",
  "src/audit/link-audit.mjs": "ff1361bc9339d7cb811208c24d05fcd3f255567e7e8e20202ac9ada6e91a4206",
  "src/audit/link-audit-reader.mjs": "714a7d9107a490f259219369d9aa0094d159ad3468e9b5fb587e5e81f4c12c75",
});
const lfSha = (f) => createHash("sha256").update(readFileSync(join(REPO, f), "utf8").replace(/\r\n/g, "\n")).digest("hex");
const mjsUnder = (dir) => readdirSync(join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? mjsUnder(`${dir}/${e.name}`) : e.name.endsWith(".mjs") ? [`${dir}/${e.name}`] : []));
test("T94-C7 · F94 C7 A PLAN OTHERS MAY READ: F94's change set touches no other row's code; the plan's recorded shape is read back in the shape F37 and F41 document, without changing either", () => {
  /* census: the other rows' modules F94 reads or could wire into are byte-for-byte as at base a08db7a5 (LF-normalised) */
  for (const [f, sha] of Object.entries(OTHER_ROWS)) assert.equal(lfSha(f), sha, `${f} changed — F94 changes no other row's code`);
  /* census: nothing in src/, bin/ or tools/ but F94's own reader and entry point imports F94 — the plan is wired into no draft and no brief */
  const importers = ["src", "bin", "tools"].flatMap(mjsUnder).filter((f) => ![EVID, "bin/site-plan.mjs"].includes(f) && /site-plan(-evidence)?\.mjs["']/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(importers, [], "another row's code reads F94's plan");
  /* the plan, read back in F37's documented `links` shape (its JSDoc) and F41's `links` evidence shape */
  const p = plan();
  const doc = readFileSync(join(REPO, "src/page/draft-render.mjs"), "utf8").match(/links\?: \{ ([^|]+) \}\|null/)[1];
  const f37Keys = [...doc.matchAll(/(\w+)\??: /g)].map((m) => m[1]);
  assert.deepEqual(f37Keys, ["completeness", "out", "pageId", "url", "title", "inboundFrom", "pageId", "selfUrl", "ref"], "F37's documented links shape moved");
  const asDraft = { completeness: p.bound.state, out: p.linksOut.map(({ pageId, url }) => ({ pageId, url })), inboundFrom: p.linksIn.map(({ pageId }) => ({ pageId })), selfUrl: p.url.url, ref: p.subject.ref };
  assert.deepEqual(Object.keys(asDraft), ["completeness", "out", "inboundFrom", "selfUrl", "ref"]);
  assert.ok(asDraft.out.length && asDraft.inboundFrom.length && asDraft.selfUrl, "the plan does not hold what a draft reads");
  const asBrief = { completeness: p.bound.state, targets: p.linksOut.map((l) => l.url), ref: p.subject.ref };
  assert.match(readFileSync(join(REPO, "src/page/content-brief.mjs"), "utf8"), /e\.links\.completeness === "COMPLETE" && e\.links\.targets\?\.length/, "F41's documented links shape moved");
  assert.deepEqual([asBrief.completeness, asBrief.targets.length > 0], [COMPLETE, true]);
  /* every part of the plan carries its evidence */
  assert.ok(p.url.readFrom.length && p.breadcrumb.steps.every((s) => s.ref || s.state === "MISSING") && p.cluster.evidence.length && [...p.linksIn, ...p.linksOut].every((l) => l.reason.ref));
  assert.match(p.standing, /whether F37's draft or F41's brief reads it is decided by their own acceptances, never by F94/);
});

/* ================= [ALL] ================= */
test("T94-ALL · F94 [ALL]: no proof reads a page body, the 27 pages set aside or a real run's plan; a run reports only the plans it produced — the census fires on a planted real read", () => {
  const REAL = /readPartitionBodies|readExistingPagePopulation|\bREADERS\b|readSiteRecords\(|readClientActionEvidence\(|readClientBriefs\(|first-real-crawl|spawnSync|execFileSync/;
  const src = readFileSync(new URL(import.meta.url), "utf8").replace(/const REAL = [^\n]*\n/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, REAL, "an F94 proof reads a page body or a real run's output");
  assert.match(`const p = ${"read"}ExistingPagePopulation({ scope });`, REAL, "the census cannot see a planted real read");
  for (const call of src.match(/readClientSitePlans\([^;]*;/g) ?? []) assert.match(call, /io: W\.io/, "a proof runs F94's reader on real data");
  assert.doesNotMatch(code(PLAN), /from "node:|readFileSync|fetch\(/, "the plan reads a file or fetches");
  /* a run's summary is taken only from the plans it produced: a refused plan is never counted as a plan */
  const W = twoTenantWorld();
  const r = readClientSitePlans({ tenantId: T, actionEvidence: { compiled: { forConstruction: [{ decision: CREATE, slug: "renewal-fees" }, { decision: CREATE, slug: "renewal-time" }] }, pages: [improve("a-not-recorded")] }, values: ["renewal"], io: W.io });
  assert.deepEqual([r.plans.length, r.refused.length], [2, 1], "the page F35 chose to improve, which no record holds, was not refused");
  assert.deepEqual([r.summary.plans, r.summary.refused, r.summary.url], [2, 1, { [URL_STATE.PROPOSED]: 1, [URL_STATE.REFUSED_EXISTING_PAGE]: 1 }], "a refused plan was counted as a plan");
  assert.equal(r.summary.linksOut, r.plans.reduce((n, x) => n + x.linksOut.length, 0));
  const bad = readClientSitePlans({ tenantId: T, actionEvidence: { compiled: { forConstruction: [{ decision: { ...CREATE, decision: DECISION.CANNOT_DECIDE }, slug: "renewal-fees" }] } }, values: ["renewal"], io: W.io });
  assert.deepEqual([bad.plans.length, bad.summary.plans], [0, 0], "a subject F35 did not choose was planned or counted");
  assert.deepEqual(placementSubjects({ actionEvidence: { pages: [improve("x")] } }).map((s) => s.pageId), ["x"]);
});

test("R94-BOARD · F94 moves only through the production validator and the audit trail: frozen and started under its own acceptance, VERIFIED-PASS only with a REAL VERIFIED event, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F94;
  assert.deepEqual(row.events.slice(0, 2).map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  assert.equal(row.events[0].ruling.commit, "959ae05cfb056c3cc22c2fedf70a5542bfeb281c");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F94" && e.occurredAt.startsWith("2026-10-07")), "F94's movement is not in the trail");
  if (row.state === "VERIFIED-PASS") {
    const v = row.events.find((e) => e.kind === "VERIFIED");
    assert.equal(v.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
