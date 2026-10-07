/**
 * F94 · SITE ARCHITECTURE AND INTERNAL-LINKING PLAN (acceptance _handoffs 959ae05, RR-206; approved by its hash d1f5991f…, contract
 * ec58f949…). Where ONE page F35 chose to create or improve sits in the client's existing site: its URL within a structure the site's own
 * recorded pages already use (C1), its breadcrumb trail (C2), the recorded pages that will link to it and that it will link to, each with
 * its recorded reason and its target's recorded status (C3), its place in a topic cluster — a hub a recorded page already is, a new hub
 * only on a recorded verified need, or no hub (C4) — all inside F31's completeness bound (C5).
 *
 *   C1  the path pattern is the ONE parent path every recorded page of the same need sits under, held by at least two recorded pages of the
 *       same origin (one page alone is not a structure); the proposed URL is that parent plus the page's own slug. No pattern, two patterns,
 *       no slug or an undeclared origin → NOT MEASURED, named. A proposed URL any record already holds is REFUSED as an existing page (F34's).
 *   C2  every step from the origin's root to the page is a recorded page of this tenant; a step none holds is MISSING, named, never filled.
 *       No title is given for any step: a recorded page carries no title, and none is invented.
 *   C3  the links in and out are the recorded pages of this tenant that cover the same need (F33 COVERS) and the cluster's hub, each with its
 *       reason and the recorded links it extends. A target recorded BROKEN, REDIRECTED (F23) or NOT SERVED (F31: recorded, no served state)
 *       is never planned; a target with no usable recorded status is carried NOT MEASURED. No count, quota or maximum decides how many
 *       links (the owner's rule, RR-127 §2): every eligible page is planned.
 *   C4  a hub is a recorded page of the same need that links (recorded edges) to other recorded pages of the same need — its spokes.
 *   C5  every plan carries F31's verdict and its bound. Unless the inventory is COMPLETE, nothing is claimed about pages it does not hold:
 *       "no other page covers this", "no other page links to it", "no hub exists" and "no unrecorded page holds this URL" are NOT MEASURED,
 *       a NEW hub is never proposed (one may exist unobserved), and the plan is presented as PARTIAL, never complete.
 *   C6  pure: records in, a plan out. One tenant: a page of another tenant is refused and never planned. Nothing is fetched, written,
 *       rendered, followed or published, and no provider is called.
 *   C7  the plan is returned in a shape a draft (F37) or a brief (F41) can read; F94 wires it into neither and changes no other row.
 */
import { canonicalUrl } from "../evidence/ids.mjs";
import { targetState, STATE } from "../audit/link-audit.mjs";
import { isChosenCreate, DECISION } from "./action-decision.mjs";
import { decideResolvedTenants } from "../tenancy/scope.mjs";

export const NOT_MEASURED = "NOT MEASURED";
export const STATUS = Object.freeze({ WORKING: STATE.WORKING, REDIRECTED: STATE.REDIRECTED, BROKEN: STATE.BROKEN, NOT_SERVED: "NOT SERVED", NOT_MEASURED: STATE.NOT_MEASURED });
/** C3: a planned link's target may never carry one of these. */
export const UNUSABLE = Object.freeze([STATUS.BROKEN, STATUS.REDIRECTED, STATUS.NOT_SERVED]);
export const URL_STATE = Object.freeze({ PROPOSED: "PROPOSED", RECORDED: "RECORDED", NOT_MEASURED, REFUSED_EXISTING_PAGE: "REFUSED: AN EXISTING PAGE (F34)" });
export const CLUSTER = Object.freeze({ JOINS_HUB: "JOINS_HUB", NEW_HUB: "NEW_HUB_PROPOSED", NO_HUB: "NO_HUB", NOT_MEASURED });
export const SUBJECT = Object.freeze({ NEW_PAGE: "NEW_PAGE", EXISTING_PAGE: "EXISTING_PAGE" });
/** F35's actions that improve an existing page (as against keeping, ending or replacing it). */
export const IMPROVING_ACTIONS = Object.freeze(["ADD SECTION", "FIX", "REFRESH", "LINK"]);
/** C4: the two records a NEW hub may stand on. */
export const HUB_NEED_KINDS = Object.freeze(["F35_CHOSEN_GROUPED_NEED", "REGISTERED_NEED_VALUE"]);
export const COMPLETE = "COMPLETE";
export const STANDING = "a plan only — F94 writes nothing to any site, fetches nothing, calls no provider and publishes nothing; whether F37's draft or F41's brief reads it is decided by their own acceptances, never by F94";

const canon = (u) => { try { return canonicalUrl(String(u)); } catch { return null; } };
const present = (s) => typeof s === "string" && s.trim() !== "";
/* F02: whether a record is this run's tenant's is the ONE tenant decision's, never a comparison made here */
const sameTenant = (a, b) => decideResolvedTenants(a, b).allowed === true;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** "https://h/a/b" → { origin: "https://h", parent: "/a", segments: ["a", "b"] } (canonical form: no trailing slash). */
function partsOf(url) {
  const c = canon(url);
  if (!c) return null;
  const u = new URL(c);
  const segments = u.pathname.split("/").filter(Boolean);
  /* the root has no parent: it is never a sibling in a pattern */
  return { url: c, origin: u.origin, segments, parent: segments.length ? `/${segments.slice(0, -1).join("/")}`.replace(/^\/$/, "/") : null };
}
const join = (origin, path) => canon(`${origin}${path === "/" ? "" : path}/`) ?? null;

/** C3: one target's status from its RECORDED observations — F23's class, and NOT SERVED for a target recorded with no served state. */
export function targetStatus(recs) {
  const list = recs ?? [];
  if (list.length && list.every((r) => r && !r.skipped && !Number.isInteger(r.status) && present(r.error))) return STATUS.NOT_SERVED;
  return targetState(list);
}

/** Which page F94 is placing: a grouped need F35 chose CREATE, or an existing page F35 chose to improve; anything else is refused. */
export function subjectOf({ decision, slug = null, pageId = null, need = null }) {
  if (isChosenCreate(decision)) return { kind: SUBJECT.NEW_PAGE, needId: decision.subject.needId, slug, need, ref: `F35:CREATE:${decision.subject.needId}` };
  const chosen = decision?.decision === DECISION.CHOSEN ? (decision.actions ?? []).map((a) => a.action) : [];
  const improves = chosen.some((a) => IMPROVING_ACTIONS.includes(a));
  if (improves && decision.subject?.kind === "EXISTING_PAGE" && present(pageId) && decision.subject.pageId === pageId) return { kind: SUBJECT.EXISTING_PAGE, pageId, need, ref: `F35:${chosen.join("+")}:${pageId}` };
  if (improves && decision.subject?.kind === "GROUPED_NEED" && present(pageId) && (decision.actions ?? []).some((a) => (a.evidence ?? []).includes(pageId))) return { kind: SUBJECT.EXISTING_PAGE, pageId, need, ref: `F35:${chosen.join("+")}:${decision.subject.needId}` };
  return null;
}

/**
 * One page's plan, from ONE tenant's records. Pure.
 * @param {object} input
 * @param {string} input.tenantId
 * @param {{ decision: object, slug?: string, pageId?: string, need?: string }} input.subject
 * @param {{ pageId: string, tenantId: string, url: string, covers: string[] }[]} input.pages   recorded pages, with F33's COVERS values
 * @param {string[]} input.recordedUrls      every other URL a record of this tenant holds (sitemap-listed, linked) — for C1's collision check
 * @param {{ fromPageId: string, toUrl: string, ref: string }[]} input.edges   recorded links between this tenant's pages
 * @param {(url: string) => object[]} input.recordsOf   the recorded observations of a URL (F23's target records)
 * @param {{ state: string, bound: string, basis?: object }|null} input.completeness   F31's verdict
 * @param {{ kind: string, need: string, ref: string }[]} input.hubNeeds   recorded verified needs a NEW hub may stand on
 * @param {string[]} input.origins   the site origins declared to this tenant
 */
export function planSite({ tenantId, subject: given, pages = [], recordedUrls = [], edges = [], recordsOf = () => [], completeness = null, hubNeeds = [], origins = [] }) {
  const subject = subjectOf(given ?? {});
  const bound = boundOf(completeness);
  if (!subject) return Object.freeze({ feature: "F94", tenantId, planned: false, why: "not a page F35 chose to create or improve — F94 places nothing else", bound });
  const complete = bound.state === COMPLETE;
  const refused = [];
  const own = [];
  for (const p of pages) {
    if (!sameTenant(p?.tenantId, tenantId)) { refused.push({ pageId: p?.pageId ?? null, why: "ANOTHER TENANT'S PAGE — never read into this plan (C6)" }); continue; }
    const at = partsOf(p.url);
    if (!at) { refused.push({ pageId: p.pageId, why: "NO RECORDED URL" }); continue; }
    own.push({ ...p, url: at.url, at });
  }
  const byUrl = new Map(own.map((p) => [p.url, p]));
  const self = subject.kind === SUBJECT.EXISTING_PAGE ? own.find((p) => p.pageId === subject.pageId) ?? null : null;
  if (subject.kind === SUBJECT.EXISTING_PAGE && !self) return Object.freeze({ feature: "F94", tenantId, planned: false, why: "the page F35 chose to improve is not a recorded page of this tenant", bound, refused });
  const needs = subject.kind === SUBJECT.NEW_PAGE ? [subject.need].filter(present) : (self.covers ?? []);
  const peers = own.filter((p) => p !== self && needs.some((n) => (p.covers ?? []).includes(n)));
  const coverRef = (p) => `F33:COVERS:${p.pageId}:${needs.filter((n) => (p.covers ?? []).includes(n)).join("+")}`;
  const statusOf = (url) => targetStatus(recordsOf(url));

  /* ── C4 · the cluster: a hub is a peer whose recorded links reach other peers (its spokes) ── */
  const spokesOf = (h) => [...new Set(edges.filter((e) => e.fromPageId === h.pageId).map((e) => byUrl.get(canon(e.toUrl))).filter((t) => t && t !== h && peers.includes(t)))];
  const hubs = peers.map((h) => ({ h, spokes: spokesOf(h) })).filter((x) => x.spokes.length > 1);
  let cluster;
  if (!needs.length) cluster = { state: CLUSTER.NOT_MEASURED, missing: "no recorded need for this page — no cluster can be read (F33)", evidence: [subject.ref] };
  else if (hubs.length === 1) cluster = { state: CLUSTER.JOINS_HUB, need: needs, hub: { pageId: hubs[0].h.pageId, url: hubs[0].h.url }, evidence: [coverRef(hubs[0].h), ...hubs[0].spokes.map((s) => `edge:${hubs[0].h.pageId}->${s.pageId}`)] };
  else if (hubs.length > 1) cluster = { state: CLUSTER.NOT_MEASURED, need: needs, missing: `more than one recorded page is a hub of this need (${hubs.map((x) => x.h.pageId).join(", ")}) — which one is not recorded`, evidence: hubs.map((x) => coverRef(x.h)) };
  else if (!complete) cluster = { state: CLUSTER.NOT_MEASURED, need: needs, missing: `no recorded hub among the pages this ${bound.state} inventory holds — an unobserved page may already be this need's hub; a COMPLETE inventory is needed to decide (C5)`, evidence: [`F31:${bound.state}`] };
  else {
    const record = hubNeeds.find((r) => HUB_NEED_KINDS.includes(r?.kind) && needs.includes(r.need) && present(r.ref));
    cluster = record
      ? { state: CLUSTER.NEW_HUB, need: needs, hubNeed: { kind: record.kind, need: record.need, ref: record.ref }, evidence: [record.ref, `F31:${COMPLETE}`] }
      : { state: CLUSTER.NO_HUB, need: needs, missing: "no recorded verified need for a hub (a grouped need F35 chose, or a registered need value) — no hub is created", evidence: [`F31:${COMPLETE}`] };
  }

  /* ── C1 · the URL ── */
  let url;
  if (subject.kind === SUBJECT.EXISTING_PAGE) url = { state: URL_STATE.RECORDED, url: self.url, readFrom: [self.pageId] };
  else {
    /* the pattern is read from the cluster's spokes: a hub sits ABOVE its spokes, so it is never one of the pattern's pages */
    const spokes = peers.filter((p) => !hubs.some((x) => x.h === p));
    const parents = [...new Set(spokes.map((p) => `${p.at.origin}${p.at.parent}`))];
    const missing = !present(subject.slug) || !SLUG.test(subject.slug) ? "the page's slug (its compiled spec, F91 C19)"
      : !spokes.length ? "a recorded page of the same need to read a path pattern from"
      : parents.length > 1 ? `one path pattern — the recorded pages of this need sit under ${parents.length} different paths`
      : null;
    const [origin, parent] = parents.length === 1 ? [spokes[0].at.origin, spokes[0].at.parent] : [null, null];
    const siblings = origin ? own.filter((p) => p.at.origin === origin && p.at.parent === parent) : [];
    const why = missing ?? (siblings.length < 2 ? "a structure the site uses — one recorded page under this path is not a pattern" : !origins.map(canon).filter(Boolean).map((o) => new URL(o).origin).includes(origin) ? "an origin declared to this tenant for the pattern's pages" : null);
    if (why) url = { state: URL_STATE.NOT_MEASURED, url: null, missing: why, readFrom: [] };
    else {
      const proposed = canon(`${origin}${parent === "/" ? "" : parent}/${subject.slug}`);
      const holder = byUrl.get(proposed) ?? null;
      const listed = recordedUrls.map(canon).includes(proposed);
      url = holder || listed
        ? { state: URL_STATE.REFUSED_EXISTING_PAGE, url: null, existingPage: holder ? holder.pageId : null, existingUrl: proposed, why: "a recorded page already holds this URL — that is an existing page (F34's), never a new one", readFrom: siblings.map((p) => p.pageId) }
        : { state: URL_STATE.PROPOSED, url: proposed, pattern: `${parent === "/" ? "" : parent}/{slug}`, readFrom: siblings.map((p) => p.pageId), unique: complete ? true : NOT_MEASURED };
    }
  }

  /* ── C2 · the breadcrumb ── */
  let breadcrumb;
  const at = url.url ? partsOf(url.url) : null;
  if (!at) breadcrumb = { state: NOT_MEASURED, missing: "the page's URL (C1)", steps: [] };
  else {
    const steps = [];
    for (let i = 0; i < at.segments.length; i += 1) {
      const stepUrl = join(at.origin, `/${at.segments.slice(0, i).join("/")}`);
      const p = byUrl.get(stepUrl);
      steps.push(p ? { pageId: p.pageId, url: p.url, ref: `F31:PAGE:${p.pageId}` } : { pageId: null, url: stepUrl, state: "MISSING", why: "no recorded page of this tenant holds this step" });
    }
    steps.push(subject.kind === SUBJECT.EXISTING_PAGE ? { pageId: self.pageId, url: self.url, ref: `F31:PAGE:${self.pageId}` } : { pageId: null, url: url.url, ref: subject.ref, planned: true });
    breadcrumb = { state: steps.some((s) => s.state === "MISSING") ? "INCOMPLETE TRAIL" : "RECORDED", steps, missingSteps: steps.filter((s) => s.state === "MISSING").map((s) => s.url) };
  }

  /* ── C3 · the links in and out ── */
  const linked = [...peers, ...(cluster.hub ? [byUrl.get(cluster.hub.url)].filter((h) => h && !peers.includes(h)) : [])];
  const reasonOf = (p) => (cluster.hub?.pageId === p.pageId ? { kind: "CLUSTER_HUB", ref: cluster.evidence[0] } : { kind: "SAME_NEED", need: needs.filter((n) => (p.covers ?? []).includes(n)), ref: coverRef(p) });
  const extendsFrom = (p) => edges.filter((e) => e.fromPageId === p.pageId && linked.some((q) => q !== p && q.url === canon(e.toUrl))).map((e) => e.ref);
  const selfStatus = self ? statusOf(self.url) : STATUS.NOT_MEASURED;
  const linksIn = [], linksOut = [], notPlanned = [];
  for (const p of linked) {
    const reason = reasonOf(p);
    const inStatus = selfStatus;
    if (UNUSABLE.includes(inStatus)) notPlanned.push({ direction: "IN", pageId: p.pageId, status: inStatus, why: `the target (this page) is recorded ${inStatus}` });
    else linksIn.push({ pageId: p.pageId, url: p.url, reason, extends: extendsFrom(p), targetStatus: inStatus });
    const outStatus = statusOf(p.url);
    if (UNUSABLE.includes(outStatus)) notPlanned.push({ direction: "OUT", pageId: p.pageId, status: outStatus, why: `the target is recorded ${outStatus}` });
    else linksOut.push({ pageId: p.pageId, url: p.url, reason, extends: self ? edges.filter((e) => e.fromPageId === self.pageId && canon(e.toUrl) === p.url).map((e) => e.ref) : [], targetStatus: outStatus });
  }

  /* ── C5 · what may be claimed ── */
  const claims = {
    noOtherPageCovers: complete ? peers.length === 0 : NOT_MEASURED,
    noOtherPageLinksIn: complete ? !edges.some((e) => self && canon(e.toUrl) === self.url && !linked.some((q) => q.pageId === e.fromPageId)) : NOT_MEASURED,
    noHubExists: complete ? hubs.length === 0 : NOT_MEASURED,
    urlUnique: url.state === URL_STATE.PROPOSED ? url.unique : NOT_MEASURED,
  };
  const notMeasured = Object.entries(claims).filter(([, v]) => v === NOT_MEASURED).map(([k]) => k);
  return Object.freeze({
    feature: "F94", tenantId, planned: true,
    subject: { kind: subject.kind, ref: subject.ref, pageId: subject.pageId ?? null, needId: subject.needId ?? null, need: needs },
    url, breadcrumb, cluster, linksIn, linksOut, notPlanned, refused, claims, notMeasured, bound,
    complete,
    presentedAs: complete ? "PLAN OVER A COMPLETE INVENTORY" : `PARTIAL PLAN — the inventory is ${bound.state}: nothing is claimed about pages it does not hold`,
    standing: STANDING,
  });
}

/** C5: F31's verdict and its bound, carried whole; a missing verdict is UNKNOWN with that named — never COMPLETE by default. */
export function boundOf(v) {
  if (!v || !present(v.state)) return Object.freeze({ state: "UNKNOWN", text: "no completeness verdict recorded (F31)", counts: null });
  const c = v.basis?.counts ?? null;
  return Object.freeze({ state: v.state, text: present(v.bound) ? v.bound : "no bound recorded (F31)", counts: c ? Object.freeze({ observed: c.observations, listedTotal: c.listedTotal, listedUnobserved: c.listedUnobserved, linked: c.linked, linkedUnobserved: c.linkedUnobserved }) : null });
}

/**
 * Every way a plan breaks its acceptance, read from the plan and the same records. A plan with any fault is refused, never recorded.
 * @returns {{ code: string, clause: string, detail?: string }[]}
 */
export function planFaults(plan, { tenantId, pages = [], recordedUrls = [], origins = [], recordsOf = () => [], hubNeeds = [] } = {}) {
  const f = [];
  const add = (clause, code, detail) => f.push({ clause, code, ...(detail ? { detail } : {}) });
  if (!plan?.planned) return f;
  const own = new Map(pages.filter((p) => sameTenant(p?.tenantId, tenantId)).map((p) => [canon(p.url), p]));
  const ownIds = new Set([...own.values()].map((p) => p.pageId));
  const complete = plan.bound?.state === COMPLETE;
  /* C1 */
  const u = plan.url ?? {};
  if (u.state === URL_STATE.PROPOSED) {
    if (!u.readFrom?.length) add("C1", "URL_WITHOUT_ITS_PATTERN_PAGES");
    if (own.has(canon(u.url)) || recordedUrls.map(canon).includes(canon(u.url))) add("C1", "URL_COLLIDES_WITH_A_RECORDED_PAGE");
    if (!origins.map(canon).filter(Boolean).map((o) => new URL(o).origin).includes(partsOf(u.url)?.origin)) add("C1", "URL_ON_ANOTHER_ORIGIN");
    if (!(u.readFrom ?? []).every((id) => ownIds.has(id))) add("C1", "PATTERN_READ_FROM_AN_UNRECORDED_PAGE");
  }
  /* C2 */
  for (const s of plan.breadcrumb?.steps ?? []) {
    if (s.planned || s.state === "MISSING") continue;
    if (!ownIds.has(s.pageId) || own.get(canon(s.url))?.pageId !== s.pageId) add("C2", "BREADCRUMB_STEP_NOT_A_RECORDED_PAGE", s.url);
    if ("title" in s) add("C2", "BREADCRUMB_STEP_TITLE_INVENTED", s.url);
  }
  if ((plan.breadcrumb?.steps ?? []).some((s) => s.state === "MISSING") && plan.breadcrumb.state !== "INCOMPLETE TRAIL") add("C2", "MISSING_STEP_HIDDEN");
  /* C3 */
  for (const [dir, list] of [["IN", plan.linksIn ?? []], ["OUT", plan.linksOut ?? []]]) {
    for (const l of list) {
      if (!ownIds.has(l.pageId) || own.get(canon(l.url))?.pageId !== l.pageId) add("C3", "LINK_TO_A_PAGE_NOT_RECORDED_FOR_THIS_TENANT", `${dir}:${l.pageId}`);
      if (!present(l.reason?.ref)) add("C3", "LINK_WITHOUT_A_RECORDED_REASON", `${dir}:${l.pageId}`);
      const recorded = dir === "OUT" ? targetStatus(recordsOf(l.url)) : plan.subject.kind === SUBJECT.EXISTING_PAGE ? targetStatus(recordsOf(plan.url.url)) : STATUS.NOT_MEASURED;
      if (UNUSABLE.includes(recorded) || UNUSABLE.includes(l.targetStatus)) add("C3", "LINK_TO_A_BROKEN_REDIRECTED_OR_NOT_SERVED_TARGET", `${dir}:${l.pageId}`);
      if (recorded === STATUS.NOT_MEASURED && l.targetStatus !== STATUS.NOT_MEASURED) add("C3", "UNMEASURED_TARGET_REPORTED_AS_WORKING", `${dir}:${l.pageId}`);
    }
  }
  /* C4 */
  const c = plan.cluster ?? {};
  if (!c.evidence?.length) add("C4", "CLUSTER_WITHOUT_EVIDENCE");
  if (c.state === CLUSTER.JOINS_HUB && !ownIds.has(c.hub?.pageId)) add("C4", "HUB_IS_NOT_A_RECORDED_PAGE");
  if (c.state === CLUSTER.NEW_HUB && !hubNeeds.some((r) => HUB_NEED_KINDS.includes(r?.kind) && r.ref === c.hubNeed?.ref && present(r.ref) && (c.need ?? []).includes(r.need))) add("C4", "NEW_HUB_WITHOUT_A_RECORDED_VERIFIED_NEED");
  /* C5 */
  if (!plan.bound || !present(plan.bound.state) || !present(plan.bound.text)) add("C5", "BOUND_MISSING");
  if (!complete) {
    for (const [k, v] of Object.entries(plan.claims ?? {})) if (v !== NOT_MEASURED) add("C5", "CLAIM_BEYOND_AN_INCOMPLETE_INVENTORY", k);
    if (plan.complete !== false || !/^PARTIAL PLAN/.test(plan.presentedAs ?? "")) add("C5", "PARTIAL_PLAN_PRESENTED_AS_COMPLETE");
    if (c.state === CLUSTER.NEW_HUB || c.state === CLUSTER.NO_HUB) add("C5", "HUB_DECIDED_ON_AN_INCOMPLETE_INVENTORY");
  }
  /* C6 */
  if (!sameTenant(plan.tenantId, tenantId)) add("C6", "PLAN_FOR_ANOTHER_TENANT");
  return f;
}
