/**
 * DETECTOR A — A PUBLIC CLAIM AGAINST THE DATA OR CODE THAT PRODUCES IT.
 *
 * A surface tells a reader something takes one of a set of values. Somewhere behind it, a producer
 * — a table, a constant, a function's branches — decides which values can actually occur. This
 * compares the two sets.
 *
 * 🔴 IT COMPARES SETS, NOT PROSE. The caller extracts both sides into declared value sets; this
 * module never reads a sentence and guesses what it promised. Guessing is how a detector comes to
 * fire on a synonym and stay silent on a real defect.
 *
 * Two directions, and they are different faults:
 *   OVER-PROMISED   a value the surface offers that the producer can never produce
 *   UNDER-DECLARED  a value the producer can produce that no surface admits
 * Both are reported; only the first is scored as the class this exists for, but hiding the second
 * would mean a detector that quietly knows more than it says.
 */
import { finding, clean, unknown } from "./outcome.mjs";

const DETECTOR = "claim-vs-producer";

const asSet = (v) => new Set((v ?? []).map((x) => String(x)));

/**
 * @param {object} input
 * @param {{id:string, locator:string, statedValues:string[]}[]} input.claims   public/rendered surfaces
 * @param {{id:string, locator:string, producedValues:string[]}[]} input.producers  the data or code behind them
 * @param {Record<string,string[]>} input.bindings  claim id -> producer ids that supply it
 */
export function detectClaimVsProducer({ claims, producers, bindings } = {}) {
  const out = [];
  if (!Array.isArray(claims) || !Array.isArray(producers) || bindings === undefined || bindings === null) {
    /* 🔴 NO PERMISSIVE DEFAULT. An absent side is not an empty side: treating a missing producer
     * list as "produces nothing" would make every claim look over-promised, and treating a missing
     * claim list as "claims nothing" would make every registry look clean. Both are lies. */
    return [unknown({
      detector: DETECTOR,
      subject: "(input)",
      reasonCode: "INPUT_ABSENT",
      detail: `claims=${Array.isArray(claims) ? claims.length : "absent"} producers=${Array.isArray(producers) ? producers.length : "absent"} bindings=${bindings ? "present" : "absent"}`,
    })];
  }

  const byId = new Map(producers.map((p) => [p.id, p]));
  for (const c of claims) {
    const bound = bindings[c.id];
    if (!Array.isArray(bound) || bound.length === 0) {
      out.push(unknown({ detector: DETECTOR, subject: c.id, reasonCode: "EVIDENCE_INCOMPLETE", detail: `no producer is bound to this claim, so its values cannot be compared with anything` }));
      continue;
    }
    const missingProducers = bound.filter((id) => !byId.has(id));
    if (missingProducers.length > 0) {
      out.push(unknown({ detector: DETECTOR, subject: c.id, reasonCode: "INPUT_ABSENT", detail: `bound producer(s) not supplied: ${missingProducers.join(", ")}` }));
      continue;
    }
    const stated = asSet(c.statedValues);
    if (stated.size === 0) {
      out.push(unknown({ detector: DETECTOR, subject: c.id, reasonCode: "EVIDENCE_INCOMPLETE", detail: "the claim declares no values, so there is nothing to compare" }));
      continue;
    }
    const produced = new Set();
    for (const id of bound) for (const v of asSet(byId.get(id).producedValues)) produced.add(v);
    if (produced.size === 0) {
      out.push(unknown({ detector: DETECTOR, subject: c.id, reasonCode: "EVIDENCE_INCOMPLETE", detail: `the bound producer(s) ${bound.join(", ")} declare no values` }));
      continue;
    }

    const overPromised = [...stated].filter((v) => !produced.has(v));
    const underDeclared = [...produced].filter((v) => !stated.has(v));
    const where = `${c.locator ?? c.id} <- ${bound.map((id) => byId.get(id).locator ?? id).join(", ")}`;

    if (overPromised.length > 0) {
      out.push(finding({
        detector: DETECTOR,
        subject: c.id,
        defectClass: "claim-not-supported-by-producer",
        evidence: [
          `stated: ${[...stated].sort().join(", ")}`,
          `produced: ${[...produced].sort().join(", ")}`,
          `stated but never produced: ${overPromised.sort().join(", ")}`,
          where,
        ],
        summary: `the surface states ${overPromised.length} value(s) the producing data or code never produces`,
      }));
      continue;
    }
    out.push(clean({
      detector: DETECTOR,
      subject: c.id,
      checked: [
        `stated: ${[...stated].sort().join(", ")}`,
        `produced: ${[...produced].sort().join(", ")}`,
        underDeclared.length ? `produced but not stated (not this class): ${underDeclared.sort().join(", ")}` : "every produced value is stated",
        where,
      ],
      summary: "every stated value is one the producer can produce",
    }));
  }
  return out;
}
