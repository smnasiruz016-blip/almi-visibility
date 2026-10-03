/**
 * F16 C4 · THE GROUPING MECHANISM, WITH THE RULE AS A DECLARED INPUT (RR-146 §2). The machine is the engine's; the dial is the owner's.
 *
 * F16's sameness rule is an OPEN OWNER DECISION. This file chooses none. It turns an OWNER-DECLARED rule into the `sameAs` that
 * groupQuestions (public-questions.mjs) already applies, or refuses the declaration. With no declaration nothing is grouped, and the
 * missing decision is named (groupQuestions does that).
 *
 * The declaration names its method. The mechanism can carry two, and the owner may declare either, both, or neither:
 *   NORMALISED_IDENTICAL   two questions are the same only when their wordings are byte-equal after the DECLARED steps, chosen from
 *                          case · whitespace · terminal-punctuation, and nothing else;
 *   RECORDED_JUDGEMENT     two questions are the same only when a recorded judgement names that exact pair.
 * Never accepted: a similarity score, a threshold, a model, or any method not named above. A rule not declared by the owner, a rule
 * with no reference to its act, or an unknown step REFUSES. Grouping never rewrites an original; every original stays retrievable.
 */
export const METHODS = Object.freeze(["NORMALISED_IDENTICAL", "RECORDED_JUDGEMENT"]);
export const STEPS = Object.freeze({
  case: (s) => s.toLowerCase(),
  whitespace: (s) => s.replace(/\s+/g, " ").trim(),
  "terminal-punctuation": (s) => s.replace(/[?.!\s]+$/u, ""),
});

/** @returns {{ sameAs: Function|null, refusal: string|null, ruleId: string|null }} */
export function samenessFromDeclaration(decl) {
  if (decl === null || decl === undefined) return { sameAs: null, refusal: null, ruleId: null };
  if (decl.declaredBy !== "OWNER") return { sameAs: null, refusal: "SAMENESS_RULE_NOT_OWNER_DECLARED", ruleId: null };
  if (typeof decl.ruleId !== "string" || !decl.ruleId.trim() || typeof decl.authorityRef !== "string" || !decl.authorityRef.trim()) return { sameAs: null, refusal: "SAMENESS_RULE_HAS_NO_ID_OR_AUTHORITY", ruleId: null };
  const methods = Array.isArray(decl.methods) ? decl.methods : [];
  if (methods.length === 0 || methods.some((m) => !METHODS.includes(m))) return { sameAs: null, refusal: "SAMENESS_METHOD_NOT_ACCEPTED", ruleId: null };
  const steps = Array.isArray(decl.steps) ? decl.steps : [];
  if (steps.some((s) => !Object.hasOwn(STEPS, s))) return { sameAs: null, refusal: "SAMENESS_STEP_UNKNOWN", ruleId: null };
  const pairs = new Set((Array.isArray(decl.judgements) ? decl.judgements : []).filter((p) => Array.isArray(p) && p.length === 2).flatMap(([a, b]) => [`${a}\u0000${b}`, `${b}\u0000${a}`]));
  const norm = (w) => steps.reduce((s, k) => STEPS[k](s), String(w ?? ""));
  const sameAs = (a, b) =>
    (methods.includes("NORMALISED_IDENTICAL") && typeof a?.original?.wording === "string" && typeof b?.original?.wording === "string" && norm(a.original.wording) === norm(b.original.wording)) ||
    (methods.includes("RECORDED_JUDGEMENT") && pairs.has(`${a?.id}\u0000${b?.id}`));
  return { sameAs, refusal: null, ruleId: decl.ruleId };
}
