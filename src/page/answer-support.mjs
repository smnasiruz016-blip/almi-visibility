/**
 * F91 · C17 · ONE ANSWER-SOURCE RULE, BY FIELD AND CLAIM (Acceptance Amendment 3, _handoffs b8a4ea5; RTP-1 Rev 6 P14). C18: HELD means unsupported.
 *
 * An answer is judged CLAIM BY CLAIM. Each material claim records what it states, its source (name, link, the date it was read) and the RECORDED
 * finding that the source actually supports it:
 *
 *   RESPONSIBLE_BODY_RULE  a claim stating an official body's rule, policy or authoritative requirement, naming that body
 *                          → supported only by THAT body's own source                                  label RESPONSIBLE BODY
 *   PRODUCT_FACT           a fact about the product itself → the product's own declared site          label PRODUCT'S OWN SITE
 *                          (F44's capability-claim distinction is never consulted here — it never blocks this, A5)
 *   OTHER                  every other claim → a suitable related source that ACTUALLY SUPPORTS it    label SECONDARY
 *                          (never "SECONDARY VERIFIED", never official; a third party's estimate is stated only as that source's estimate)
 *
 * The label is never evidence: support is the recorded finding. A source category (for example a registry's tier) is never refused as a whole.
 * A forum reply never answers anything; research-provider answer text is never evidence; no checker or signature stands in for a source.
 * Unsupported stays UNKNOWN; a partly supported answer states the supported part and marks the rest UNKNOWN. A group is HELD only for an
 * UNSUPPORTED CENTRAL answer — never because its support is SECONDARY, nor because a non-central part is UNKNOWN (C18).
 * 🔴 Pure. It never calls the fact-registry validator (src/facts/validate.mjs) — the tier-4 rule is R4's — and it fetches nothing.
 */
export const CLAIM_KINDS = Object.freeze({ BODY_RULE: "RESPONSIBLE_BODY_RULE", PRODUCT_FACT: "PRODUCT_FACT", OTHER: "OTHER" });
export const SOURCE_KINDS = Object.freeze({ BODY: "RESPONSIBLE_BODY", PRODUCT_SITE: "PRODUCT_SITE", RELATED: "RELATED", FORUM: "FORUM_REPLY", PROVIDER_TEXT: "RESEARCH_PROVIDER_ANSWER" });
export const LABEL = Object.freeze({ BODY: "RESPONSIBLE BODY", PRODUCT: "PRODUCT'S OWN SITE", SECONDARY: "SECONDARY" });
export const SUPPORTS = "SUPPORTS";
export const ANSWER_STATES = Object.freeze({ SUPPORTED: "SUPPORTED", PARTLY: "PARTLY SUPPORTED", UNKNOWN: "UNKNOWN" });
export const CLAIM_UNKNOWN = Object.freeze({
  NO_CLAIMS: "the answer records no material claim — support is judged claim by claim (C17), so it is UNKNOWN",
  KIND: "the claim does not record what it states (a responsible body's rule, a product fact, or another claim)",
  SOURCE: "the source is not named, linked and dated (the day it was read)",
  FORUM: "a forum reply never answers anything",
  PROVIDER: "research-provider answer text is never evidence",
  CHECKER: "a checker, signature or credential never stands in for a source",
  NOT_SUPPORTED: "no recorded finding that the source actually supports the claim",
  BODY: "a claim stating a responsible body's rule, policy or requirement cites only that body's own source",
  PRODUCT: "a fact about the product itself cites the product's own declared site",
  ESTIMATE_AS_OFFICIAL: "a third party's estimate is never an official fee or a guaranteed time",
});
const CHECKER_FIELDS = /^(checked_?by|verified_?by|signature|signed_?by|credential|reviewer|approved_?by)$/i;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";
const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

/** One claim's support: SUPPORTED with its label, or UNKNOWN with the reason named. */
export function claimSupport(claim, { officialSites = [] } = {}) {
  const s = claim?.source ?? {};
  const unknown = (why) => Object.freeze({ claimId: claim?.claimId ?? null, central: claim?.central !== false, state: ANSWER_STATES.UNKNOWN, why });
  if ([claim, s].some((o) => Object.keys(o ?? {}).some((k) => CHECKER_FIELDS.test(k)))) return unknown(CLAIM_UNKNOWN.CHECKER);
  if (!Object.values(CLAIM_KINDS).includes(claim?.states)) return unknown(CLAIM_UNKNOWN.KIND);
  if (s.kind === SOURCE_KINDS.FORUM) return unknown(CLAIM_UNKNOWN.FORUM);
  if (s.kind === SOURCE_KINDS.PROVIDER_TEXT) return unknown(CLAIM_UNKNOWN.PROVIDER);
  if (!present(s.name) || !present(s.link) || !ISO_DAY.test(s.readOn ?? "")) return unknown(CLAIM_UNKNOWN.SOURCE);
  if (claim.supports?.finding !== SUPPORTS || !present(claim.supports?.ref)) return unknown(CLAIM_UNKNOWN.NOT_SUPPORTED);
  /* RR-180 (F37 C3): the claim's OWN recorded statement travels with its support, so a draft can write it — never composed here */
  const ok = (label, statedAs) => Object.freeze({ claimId: claim.claimId ?? null, central: claim.central !== false, state: ANSWER_STATES.SUPPORTED, label, statedAs, text: present(claim.text) ? claim.text.trim() : null,
    source: Object.freeze({ name: s.name, link: s.link, readOn: s.readOn }), finding: claim.supports.ref });
  if (claim.states === CLAIM_KINDS.BODY_RULE) {
    if (claim.estimate === true) return unknown(CLAIM_UNKNOWN.ESTIMATE_AS_OFFICIAL);
    if (!present(claim.body) || s.kind !== SOURCE_KINDS.BODY || s.body !== claim.body) return unknown(CLAIM_UNKNOWN.BODY);
    return ok(LABEL.BODY, `${claim.body}'s own source`);
  }
  if (claim.states === CLAIM_KINDS.PRODUCT_FACT) {
    if (s.kind !== SOURCE_KINDS.PRODUCT_SITE || !officialSites.includes(originOf(s.link))) return unknown(CLAIM_UNKNOWN.PRODUCT);
    return ok(LABEL.PRODUCT, "the product's own site");
  }
  /* OTHER: any named, linked, dated source the finding says supports it — whatever its category — labelled SECONDARY, never official */
  return ok(LABEL.SECONDARY, claim.estimate === true ? `${s.name}'s estimate — not an official fee, not a guaranteed time` : `${s.name}, a secondary source`);
}

/** One answer: each claim judged; SUPPORTED · PARTLY SUPPORTED (the rest UNKNOWN) · UNKNOWN; and whether its CENTRAL answer is supported (C18). */
export function answerSupport(answer, { officialSites = [] } = {}) {
  const claims = Array.isArray(answer?.claims) ? answer.claims : [];
  if (!claims.length) return Object.freeze({ state: ANSWER_STATES.UNKNOWN, why: CLAIM_UNKNOWN.NO_CLAIMS, centralSupported: false, claims: Object.freeze([]) });
  const judged = claims.map((c) => claimSupport(c, { officialSites }));
  const supported = judged.filter((c) => c.state === ANSWER_STATES.SUPPORTED).length;
  const central = judged.filter((c) => c.central);
  return Object.freeze({
    state: supported === judged.length ? ANSWER_STATES.SUPPORTED : supported > 0 ? ANSWER_STATES.PARTLY : ANSWER_STATES.UNKNOWN,
    centralSupported: central.length > 0 && central.every((c) => c.state === ANSWER_STATES.SUPPORTED),
    claims: Object.freeze(judged),
  });
}
