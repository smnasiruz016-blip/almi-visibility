/**
 * F16 · C8–C14 · THE COLLECTION LIMB (Acceptance Amendment 1, _handoffs 45a1cbf; RR-155 §3) — SEPARATE from the read-back limb, and
 * SEPARATELY GATED. The read-back limb (bin/public-questions.mjs, src/research/public-questions*.mjs) still fetches, renders, harvests,
 * buys and writes nothing; this module holds no transport either — its caller injects one, and only bin/collect-public-questions.mjs does.
 *
 *   PREFLIGHT  (C9) before the FIRST request, every condition is checked and every failure is named:
 *              the subject is declared and the plan belongs to it, its tenant and its batch · the source has a VALID decision record
 *              whose issuer is declared · the source's own recorded terms admit this read, storage and attribution · an EXACT bounded plan ·
 *              the credential is PRESENT (by presence only — its value is never read here) · a FRESH owner GREEN names that exact plan.
 *   THE GREEN  an OWNER-issued, CURRENT governance record whose committed text carries, for this plan, the block
 *                  OWNER GREEN v1 / plan: <the plan's sha256> / requests: <n> / END OWNER GREEN
 *              It is STALE when it predates the plan, FOR ANOTHER PLAN when its hash differs, and SPENT once a run under it has passed
 *              preflight — a GREEN is never reused, ever.
 *   BOUNDED    (C10) the plan's request count is the collector's cap, counted by the code; a quota, a backoff, a rate limit or a source
 *              refusal stops the run and is recorded; nothing is retried.
 *   LEADS      (C11) every search hit is a LEAD, kept apart; only the original question, rechecked (currency, licence, attribution),
 *              relevant to the subject's declared profile, in scope and not a duplicate, becomes an observed public_question — by the
 *              existing adapter boundary and lead intake, never a second implementation.
 *   ZERO       (C13) a run that admits no question records ZERO and ends. A source refusal is NOT zero: what was retrieved is NOT MEASURED.
 * Generic: it names no product, tenant, exam, host or source.
 */
import { createHash } from "node:crypto";
import { resolve } from "../authority/register.mjs";
import { admitSource } from "./source-adapter.mjs";
import { intakeFromPlan } from "./lead-intake.mjs";
import { NOT_MEASURED, RECORD_TYPE } from "./public-questions.mjs";

export const COLLECTION_RUN = "collection_run";
export const PLAN_KIND = "PUBLIC_QUESTION_COLLECTION_PLAN";
export const OBSERVER_TYPE = "SOURCE_ADAPTER_OBSERVED";
/** RR-156 §4: the HARD STOP in code — one search and one recheck at most, whatever a plan or a GREEN says. */
export const COLLECTION_REQUEST_CEILING = 2;
export const OUTCOMES = Object.freeze({ REFUSED: "REFUSED_BEFORE_ANY_REQUEST", STOPPED: "STOPPED_BY_REFUSAL", COMPLETED: "COMPLETED" });
const PLAN_FIELDS = Object.freeze(["schemaVersion", "kind", "planId", "subject", "tenantId", "researchBatch", "adapter", "site", "query", "language", "pagesize", "requests", "relevanceProfileSha256", "keeps", "retention", "declaredOn"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** The hash a GREEN names: of the plan file's bytes, line endings normalised to LF. */
export const planSha256 = (bytes) => sha256(String(bytes).replace(/\r\n/g, "\n"));
export const fileSha256 = planSha256;

/** An EXACT bounded plan for THIS subject, tenant and batch — every field present and in shape, nothing more. */
export function planRefusals(plan, { subject, batch, tenantDecidedAllowed }) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return ["PLAN_ABSENT"];
  const r = [];
  for (const k of Object.keys(plan)) if (!PLAN_FIELDS.includes(k)) r.push("PLAN_NOT_EXACT:UNKNOWN_FIELD");
  for (const k of PLAN_FIELDS) if (!Object.hasOwn(plan, k)) r.push(`PLAN_NOT_EXACT:${k}`);
  if (r.length) return r;
  if (plan.schemaVersion !== 1 || plan.kind !== PLAN_KIND) r.push("PLAN_NOT_EXACT:kind");
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(plan.planId)) r.push("PLAN_NOT_EXACT:planId");
  for (const k of ["adapter", "site", "language", "retention"]) if (!present(plan[k])) r.push(`PLAN_NOT_EXACT:${k}`);
  if (!plan.query || typeof plan.query !== "object" || Object.keys(plan.query).join() !== "q" || !present(plan.query.q)) r.push("PLAN_NOT_EXACT:query");
  if (!Number.isInteger(plan.pagesize) || plan.pagesize < 1 || plan.pagesize > 100) r.push("PLAN_NOT_EXACT:pagesize");
  if (!Number.isInteger(plan.requests) || plan.requests < 1) r.push("PLAN_NOT_EXACT:requests");
  else if (plan.requests > COLLECTION_REQUEST_CEILING) r.push("PLAN_EXCEEDS_REQUEST_CEILING");
  if (!HEX64.test(plan.relevanceProfileSha256 ?? "")) r.push("PLAN_NOT_EXACT:relevanceProfileSha256");
  if (!Array.isArray(plan.keeps) || plan.keeps.length === 0 || !plan.keeps.every(present)) r.push("PLAN_NOT_EXACT:keeps");
  if (!DAY.test(plan.declaredOn ?? "")) r.push("PLAN_NOT_EXACT:declaredOn");
  if (plan.subject !== subject) r.push("PLAN_NOT_THIS_SUBJECTS");
  /* the plan's tenant is related to this run ONLY through the one scope decision (src/tenancy/scope.mjs), made by the caller: the batch is
   * decided for the tenant the plan names — a batch belongs to exactly one tenant, so another tenant is refused there */
  if (tenantDecidedAllowed !== true) r.push("PLAN_NOT_THIS_TENANTS");
  if (plan.researchBatch !== batch) r.push("PLAN_NOT_THIS_BATCH");
  return r;
}

/** Every OWNER GREEN block in a record's committed text: [{ plan, requests }]. A malformed block is no GREEN at all. */
export function declaredGreens(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n").map((l) => l.trim());
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== "OWNER GREEN v1") continue;
    const plan = /^plan: ([0-9a-f]{64})$/.exec(lines[i + 1] ?? "")?.[1];
    const requests = /^requests: ([1-9]\d{0,3})$/.exec(lines[i + 2] ?? "")?.[1];
    if (plan && requests && lines[i + 3] === "END OWNER GREEN") out.push({ plan, requests: Number(requests) });
  }
  return out;
}

/** The GREEN for THIS plan: owner-issued, CURRENT, its committed text verified, naming this plan and its bound, not stale, not spent. */
export function greenRefusals({ greenId, records, textOf, planSha, plan, spent, now }) {
  if (!present(greenId)) return ["GREEN_ABSENT"];
  const rec = (records ?? []).find((r) => r.authorityId === greenId);
  if (!rec) return ["GREEN_NOT_IN_THE_REGISTER"];
  const r = [];
  if (rec.issuer?.class !== "OWNER") r.push("GREEN_NOT_OWNER_ISSUED");
  const res = resolve({ records, propositionId: rec.propositionId, scope: rec.scope, now });
  if (res.outcome !== "CURRENT" || !res.authority.authorityIds.includes(greenId)) r.push("GREEN_NOT_CURRENT");
  const text = textOf(rec);
  if (text === null) return [...r, "GREEN_TEXT_NOT_VERIFIED"];
  const blocks = declaredGreens(text);
  const mine = blocks.find((b) => b.plan === planSha);
  if (blocks.length === 0) r.push("GREEN_NAMES_NO_PLAN");
  else if (!mine) r.push("GREEN_NAMES_ANOTHER_PLAN");
  else if (mine.requests !== plan?.requests) r.push("GREEN_BOUND_DIFFERS_FROM_PLAN");
  if (DAY.test(plan?.declaredOn ?? "") && rec.issuedAt < plan.declaredOn) r.push("GREEN_PREDATES_THE_PLAN");
  if (spent.has(greenId)) r.push("GREEN_ALREADY_SPENT");
  return r;
}

/** C9 · every condition, every failure named. `ok` only when the list is empty. */
export function preflight({ subjectDeclared, connectorDeclared, plan, planCheck, planSha = null, withdrawn = [], records, sourceDecision, decl, credentialPresent, green, relevanceSha, now }) {
  const r = [];
  if (!subjectDeclared) r.push("SUBJECT_NOT_DECLARED");
  /* RR-156 §2: a withdrawn plan is DEAD — refused whatever GREEN names it */
  if (planSha !== null && withdrawn.some((w) => w.planSha256 === planSha)) r.push("PLAN_WITHDRAWN");
  r.push(...planCheck);
  if (plan && relevanceSha !== plan.relevanceProfileSha256) r.push("RELEVANCE_PROFILE_IS_NOT_THE_PLANS");
  if (!connectorDeclared) r.push("QUESTION_SOURCE_CONNECTOR_UNDECLARED");
  const d = sourceDecision ? resolve({ records, propositionId: sourceDecision.propositionId, scope: sourceDecision.scope, now }) : null;
  const issuers = d?.outcome === "CURRENT" ? d.authority.authorityIds.map((id) => records.find((x) => x.authorityId === id)?.issuer?.class ?? null) : [];
  if (d?.outcome !== "CURRENT" || issuers.length === 0 || issuers.some((c) => !present(c))) r.push("SOURCE_DECISION_NOT_VALID");
  r.push(...admitSource(decl).refusals.map((x) => `SOURCE_TERMS:${x}`));
  if (!credentialPresent) r.push("CREDENTIAL_ABSENT");
  r.push(...green);
  return { ok: r.length === 0, refusals: [...new Set(r)] };
}

/** One bounded run through the source's own collector: the plan's request count IS the cap. */
export async function runCollection({ collect, transport, clock, plan }) {
  return collect({ transport, clock, cap: Math.min(plan.requests, COLLECTION_REQUEST_CEILING), site: plan.site, q: plan.query.q, language: plan.language, pagesize: plan.pagesize });
}

/** The run's items through the existing boundary: leads apart, questions only as the boundary admits them. A source refusal is NOT MEASURED. */
export function intakeOf({ run, adapter, plan, subject, origin, relevance, existingQuestionIds, dataPurpose }) {
  if (!run.recorded) return { leads: [], questions: [], refused: {}, retrieved: NOT_MEASURED };
  const retrieval = adapter.retrievalFrom(run.recorded, run.recheck);
  return intakeFromPlan({ plan, decl: adapter.DECLARATION, retrieval, subject, origin, relevance, existingQuestionIds, dataPurpose });
}

/** The run record — every request counted, every refusal, the zero. Counts and codes only: no wording, no reference, no credential. */
export function runRecord({ plan, planSha, greenId, preflightRefusals = [], run = null, intake = null, at }) {
  const outcome = preflightRefusals.length ? OUTCOMES.REFUSED : run?.stoppedBy ? OUTCOMES.STOPPED : OUTCOMES.COMPLETED;
  const questions = intake ? intake.questions.length : 0;
  const retrieved = intake?.retrieved ?? NOT_MEASURED;
  const id = sha256(JSON.stringify([plan?.planId ?? null, planSha ?? null, greenId ?? null, at])).slice(0, 32);
  return Object.freeze({
    record_type: COLLECTION_RUN, run_id: id, measurement_key: `${COLLECTION_RUN}:${id}`, recorded_at: at,
    value: Object.freeze({
      plan_id: plan?.planId ?? null, planSha256: planSha ?? null, green: greenId ?? null, outcome,
      preflightRefusals: [...preflightRefusals],
      requests: Object.freeze({ cap: plan?.requests ?? null, sent: run?.tally?.sent ?? 0, refusedByGovernor: { ...(run?.tally?.refused ?? {}) } }),
      stoppedBy: run?.stoppedBy ?? null,
      retrieved,
      leads: intake ? intake.leads.length : 0,
      observedQuestions: retrieved === NOT_MEASURED ? NOT_MEASURED : questions,
      zero: outcome === OUTCOMES.COMPLETED && retrieved !== NOT_MEASURED && questions === 0,
      refusedItems: { ...(intake?.refused ?? {}) },
      observerType: OBSERVER_TYPE,
      sample: "SAMPLE — one bounded run of one plan on one source; never every question in the world",
    }),
  });
}

/** A GREEN is SPENT once a run under it passed preflight — whatever that run then returned. */
export const spentGreens = (runs) => new Set((runs ?? []).filter((x) => x?.record_type === COLLECTION_RUN && x.value?.outcome !== OUTCOMES.REFUSED && present(x.value?.green)).map((x) => x.value.green));

/** Count-only report lines. Zero says zero and that the run ends; a refusal says NOT MEASURED, never zero. */
export function reportLines(rec) {
  const v = rec.value;
  const lines = [
    `SAMPLE — not a census of the world's questions · one bounded run · observer type ${v.observerType}, never a person`,
    `outcome ${v.outcome} · requests sent ${v.requests.sent} of cap ${v.requests.cap ?? "NOT DECLARED"}${v.stoppedBy ? ` · stopped by ${v.stoppedBy}` : ""}`,
  ];
  if (v.outcome === OUTCOMES.REFUSED) return [...lines, `REFUSED before any request: ${v.preflightRefusals.join(" · ")} — no request was issued`];
  lines.push(`leads ${v.leads} — search hits, kept apart, never questions and never counted with them`);
  if (v.observedQuestions === NOT_MEASURED) lines.push("observed questions NOT MEASURED — the source refused; a refusal is not zero, and nothing is retried or routed around");
  else if (v.outcome === OUTCOMES.STOPPED) lines.push(`observed questions ${v.observedQuestions} — the run was STOPPED by ${v.stoppedBy}: not a completed zero, and nothing is retried`);
  else if (v.zero) lines.push("observed questions 0 — ZERO IS THE ANSWER: recorded, and the run ends; nothing widened, re-queried, sent to another source or filled with a lead");
  else lines.push(`observed questions ${v.observedQuestions}`);
  const refused = Object.entries(v.refusedItems).map(([k, n]) => `${k} ${n}`).join(" · ");
  lines.push(`items refused: ${refused || "none"}`);
  return lines;
}
export { RECORD_TYPE };
