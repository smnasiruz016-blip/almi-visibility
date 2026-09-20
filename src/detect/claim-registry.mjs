/**
 * DETECTOR B — AN EXTERNAL-AUTHORITY CLAIM AGAINST THE SOURCE REGISTRY.
 *
 * A page states something an outside body decides — a threshold, a rule, a requirement. The
 * registry is where the evidence for such a claim is supposed to live. This asks whether it does.
 *
 * ── 🔴 THE TWO ABSENCES, AND WHY CONFUSING THEM IS THE WHOLE DEFECT ─────────────────────────────
 *
 * "No evidence" has two completely different causes, and they demand opposite answers:
 *
 *   THE REGISTRY WAS READ, and holds nothing for this claim
 *       → FINDING. The claim is unsupported. This is the class.
 *
 *   THE REGISTRY COULD NOT BE READ at all — absent, unparseable, not supplied
 *       → UNKNOWN. We have measured nothing. Reporting FINDING here would be claiming a fact
 *         about the world from a fact about our own reach, which is LAW-ABSENT-1 exactly.
 *
 * A detector that collapses these answers the wrong question under examination: it will call every
 * claim unsupported the moment a path is wrong, and score as though it had found something.
 *
 * 🔴 AND A THIRD STATE THE PAIR ABOVE HIDES: the registry is readable, holds a record for this
 * claim, and that record DISAGREES with it. That is not this class — this class is *absence* — so
 * it is reported as its own defect class rather than silently folded into "unsupported".
 */
import { finding, clean, unknown } from "./outcome.mjs";

const DETECTOR = "claim-vs-source-registry";

const norm = (v) => String(v ?? "").trim().toLowerCase();

/**
 * @param {object} input
 * @param {{id:string, locator:string, authority:string, predicate:string, statedValue:*}[]} input.claims
 * @param {object} input.registry  `{ readable: boolean, unreadableReason?: string, records: [{authority, predicate, value}] }`
 */
export function detectClaimVsRegistry({ claims, registry } = {}) {
  if (!Array.isArray(claims)) {
    return [unknown({ detector: DETECTOR, subject: "(input)", reasonCode: "INPUT_ABSENT", detail: "no claim list was supplied" })];
  }

  /* 🔴 READABILITY IS DECLARED BY THE CALLER AND IS NOT INFERRED FROM EMPTINESS. An empty registry
   * that WAS read is a real measurement — every claim in it is unsupported. An unreadable registry
   * is no measurement at all. Inferring one from the other is the exact confusion this guards. */
  const readable = registry?.readable;
  if (readable !== true) {
    const why = registry === undefined || registry === null
      ? "no registry was supplied"
      : registry.unreadableReason ?? `registry.readable is ${JSON.stringify(readable)} — it must be declared true before absence can mean anything`;
    return claims.map((c) => unknown({
      detector: DETECTOR, subject: c.id, reasonCode: "REGISTRY_UNREADABLE",
      detail: `${why}. Absence of evidence is unmeasured while the registry cannot be read`,
    }));
  }
  if (!Array.isArray(registry.records)) {
    return claims.map((c) => unknown({
      detector: DETECTOR, subject: c.id, reasonCode: "INPUT_UNREADABLE",
      detail: "the registry declares itself readable but carries no records array",
    }));
  }

  const out = [];
  for (const c of claims) {
    if (!c?.authority || !c?.predicate) {
      out.push(unknown({ detector: DETECTOR, subject: c?.id ?? "(unnamed claim)", reasonCode: "EVIDENCE_INCOMPLETE", detail: "the claim does not declare both an authority and a predicate, so no registry lookup is defined" }));
      continue;
    }
    const matches = registry.records.filter((r) => norm(r.authority) === norm(c.authority) && norm(r.predicate) === norm(c.predicate));
    const where = `${c.locator ?? c.id} · authority=${c.authority} predicate=${c.predicate}`;

    if (matches.length === 0) {
      out.push(finding({
        detector: DETECTOR, subject: c.id,
        defectClass: "authority-claim-without-registry-evidence",
        evidence: [
          where,
          `registry READ: ${registry.records.length} record(s) available`,
          `records matching this authority+predicate: 0`,
          `stated value: ${JSON.stringify(c.statedValue)}`,
        ],
        summary: "the page states a claim decided by an outside authority, and the registry — which was read — holds no evidence for it",
      }));
      continue;
    }
    const agreeing = matches.filter((r) => norm(r.value) === norm(c.statedValue));
    if (agreeing.length === 0) {
      /* Reported as its own class: the registry HAS evidence, and it disagrees. Not this class's
       * absence, and not silence either. */
      out.push(finding({
        detector: DETECTOR, subject: c.id,
        defectClass: "authority-claim-contradicted-by-registry",
        evidence: [
          where,
          `stated: ${JSON.stringify(c.statedValue)}`,
          `registry holds: ${matches.map((m) => JSON.stringify(m.value)).join(", ")}`,
        ],
        summary: "the registry holds evidence for this claim and it does not agree with the stated value",
      }));
      continue;
    }
    out.push(clean({
      detector: DETECTOR, subject: c.id,
      checked: [where, `registry READ: ${registry.records.length} record(s)`, `matching record(s): ${matches.length}`, `agreeing record(s): ${agreeing.length}`],
      summary: "the claim is supported by at least one agreeing registry record",
    }));
  }
  return out;
}
