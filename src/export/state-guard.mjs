/**
 * 🔴 AN EXPORT MAY NEVER UPGRADE A STATE.
 *
 * ── WHY THIS IS A RUNTIME GUARD AND NOT A CONVENTION ────────────────────────
 *
 * Every state in this system exists to keep two things apart that a careless
 * reader would merge: FORBIDDEN from ZERO, UNKNOWN from COMPLETE, "we did not
 * look" from "we looked and found nothing".
 *
 * A serialiser is the exact place that distinction dies. `JSON.stringify` will
 * happily turn a `null` into a `0` if some intermediate `?? 0` was added to
 * make a total add up, and nothing downstream can tell. By the time it is a
 * file on somebody's disk, the finding has changed and the evidence that it
 * changed is gone.
 *
 * So the guard runs on the way OUT, on the real payload, and it throws.
 *
 * ── WHAT IT CANNOT CATCH, STATED PLAINLY ────────────────────────────────────
 *
 * ⚠️ It sees a state field paired with a count field. It cannot detect a state
 * that was rewritten upstream before the exporter ever saw it — if something
 * turned FORBIDDEN into ZERO in the query layer, this passes. It guards the
 * boundary, not the whole pipeline.
 */

/**
 * States whose companion count MUST stay null. Both directions of the rule are
 * here so the table is the single statement of it.
 */
export const STATE_NEVER_UPGRADES = Object.freeze({
  FORBIDDEN: { countMustBe: null, because: "a 403 says nothing about the site; 0 would be a number nobody counted" },
  NOT_QUERIED: { countMustBe: null, because: "we did not look; 0 would claim we did" },
});

/** Field names that carry a count alongside a state. */
const COUNT_FIELDS = Object.freeze(["rowCount", "urlsFetched", "impressions", "clicks", "count"]);

/**
 * Walk a payload and throw if any object carries a protected state with a
 * non-null count.
 */
export function assertNoUpgrade(payload, path = "$") {
  if (payload === null || typeof payload !== "object") return payload;

  if (Array.isArray(payload)) {
    payload.forEach((v, i) => assertNoUpgrade(v, `${path}[${i}]`));
    return payload;
  }

  const state = payload.state ?? payload.authState;
  const rule = state ? STATE_NEVER_UPGRADES[state] : undefined;
  if (rule) {
    for (const field of COUNT_FIELDS) {
      if (!(field in payload)) continue;
      if (payload[field] !== rule.countMustBe) {
        throw new Error(
          `export refused at ${path}: state is ${state} but ${field} is ${JSON.stringify(payload[field])}. ` +
            `${rule.because}. An export may never upgrade a state.`,
        );
      }
    }
  }

  for (const [k, v] of Object.entries(payload)) {
    if (k === "_provenance") continue;
    assertNoUpgrade(v, `${path}.${k}`);
  }
  return payload;
}
