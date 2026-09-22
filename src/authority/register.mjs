/**
 * 🔴 F05 · THE CURRENT AUTHORITY REGISTER (22 September 2026). Acceptance: the F05 owner ruling committed in the
 * governance repository at 5868599 (sha256 035ae68d…1f70; pinned in config/fboard/acceptances.mjs).
 *
 * For an EXACT proposition and a requested scope, return exactly one CURRENT applicable authority — or an explicit
 * ABSENT, OPEN_CONFLICT or INVALID. Never a default, never permission from absence or conflict. Generic: it knows no
 * subject, product or client; a record is data.
 *
 * THE RULES, IN ORDER:
 *   1. the request must name a proposition and a scope — an absent one is INVALID, never "normal" or "global";
 *   2. a malformed record is INVALID and takes no further part (its audit line says why);
 *   3. only records of the EXACT proposition are candidates;
 *   4. SCOPE IS NEVER WIDENED: a record applies only when its scope is a prefix of the requested scope (it covers the
 *      request). A narrow record does not apply to a sibling or to the wider scope above it;
 *   5. precedence is compared only where lawfully comparable: applicable records from different issuer classes are
 *      INCOMPARABLE → OPEN_CONFLICT;
 *   6. the newest applicable record (effectiveFrom, then issuedAt — declared authority fields only) is CURRENT;
 *   7. every older applicable record is SUPERSEDED — DO NOT APPLY;
 *   8. superseded records are preserved, with their hashes — nothing is deleted;
 *   9. two newest records that disagree (different contentHash) → OPEN_CONFLICT; older records still do not apply;
 *  10. nothing applicable → ABSENT;
 *  11. NEVER file order, filename, lexical id or convenience as a tiebreak — a tie is a tie, and a disagreeing tie is a
 *      conflict (the audit trail is sorted by id for READING only, after every decision is made);
 *  12. a record sourced from a historical board's status is not authority — INVALID;
 *  13. every candidate gets a disposition and a reason.
 */
export const OUTCOMES = Object.freeze(["CURRENT", "ABSENT", "OPEN_CONFLICT", "INVALID"]);
export const STORED_STATUSES = Object.freeze(["CURRENT", "SUPERSEDED", "OPEN_CONFLICT", "NOT_APPLICABLE"]);
export const DISPOSITIONS = Object.freeze(["CURRENT", "SUPERSEDED", "OPEN_CONFLICT", "NOT_APPLICABLE", "INVALID"]);
export const FIELDS = Object.freeze(["authorityId", "propositionId", "scope", "issuer", "issuedAt", "effectiveFrom", "sourceRef", "status", "supersedes", "supersededBy", "contentHash", "recordedAt"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const nonEmpty = (s) => typeof s === "string" && s.trim() !== "";

/** Every reason a record is malformed. [] means well-formed. */
export function recordFaults(r) {
  const f = [];
  if (!r || typeof r !== "object") return ["NOT_A_RECORD"];
  for (const k of FIELDS) if (!Object.hasOwn(r, k)) f.push(`MISSING_${k}`);
  if (!nonEmpty(r.authorityId)) f.push("NO_AUTHORITY_ID");
  if (!nonEmpty(r.propositionId)) f.push("NO_PROPOSITION");
  if (!Array.isArray(r.scope) || r.scope.length === 0 || r.scope.some((s) => !nonEmpty(s) || s.includes("*"))) f.push("SCOPE_ABSENT_OR_WILDCARD");
  if (!nonEmpty(r.issuer?.class)) f.push("ISSUER_UNDECLARED");
  if (!DAY.test(r.issuedAt ?? "")) f.push("ISSUED_AT_UNDECLARED");
  if (!DAY.test(r.effectiveFrom ?? "")) f.push("EFFECTIVE_FROM_UNDECLARED");
  if (DAY.test(r.issuedAt ?? "") && DAY.test(r.effectiveFrom ?? "") && r.effectiveFrom < r.issuedAt) f.push("EFFECTIVE_BEFORE_ISSUED");
  if (r.sourceRef?.kind === "HISTORICAL_BOARD_STATE") f.push("HISTORICAL_BOARD_STATE_IS_NOT_AUTHORITY");
  else if (r.sourceRef?.kind !== "GOVERNANCE_RECORD" || !nonEmpty(r.sourceRef?.path) || !nonEmpty(r.sourceRef?.commit)) f.push("SOURCE_UNDECLARED");
  if (!STORED_STATUSES.includes(r.status)) f.push("STATUS_UNKNOWN");
  if (!Array.isArray(r.supersedes) || !Array.isArray(r.supersededBy)) f.push("SUPERSESSION_UNDECLARED");
  if (!HEX64.test(r.contentHash ?? "")) f.push("CONTENT_HASH_MALFORMED");
  if (!nonEmpty(r.recordedAt)) f.push("RECORDED_AT_UNDECLARED");
  return f;
}

/** Does a record's scope cover the requested scope? Prefix equality only — never widening, never similarity. */
export const covers = (recordScope, requested) => recordScope.length <= requested.length && recordScope.every((s, i) => s === requested[i]);

/**
 * Resolve an exact proposition for a requested scope. `now` (YYYY-MM-DD) decides whether a record is yet effective.
 * Returns { outcome, request, authority, candidates } — `authority` is null unless CURRENT.
 */
export function resolve({ records, propositionId, scope, now }) {
  const request = { propositionId, scope, now };
  const bad = [];
  if (!nonEmpty(propositionId)) bad.push("REQUEST_HAS_NO_PROPOSITION");
  if (!Array.isArray(scope) || scope.length === 0 || scope.some((s) => !nonEmpty(s) || s.includes("*"))) bad.push("REQUEST_HAS_NO_SCOPE");
  if (!DAY.test(now ?? "")) bad.push("REQUEST_HAS_NO_DATE");
  if (bad.length) return { outcome: "INVALID", request, authority: null, reasons: bad, candidates: [] };

  const lines = [];
  const applicable = [];
  for (const r of records || []) {
    if (!r || r.propositionId !== propositionId) continue;
    const faults = recordFaults(r);
    if (faults.length) { lines.push({ authorityId: r.authorityId ?? null, disposition: "INVALID", reason: faults.join(", ") }); continue; }
    if (!covers(r.scope, scope)) { lines.push({ authorityId: r.authorityId, disposition: "NOT_APPLICABLE", reason: `scope [${r.scope.join(" / ")}] does not cover [${scope.join(" / ")}] — never widened` }); continue; }
    if (r.effectiveFrom > now) { lines.push({ authorityId: r.authorityId, disposition: "NOT_APPLICABLE", reason: `not effective until ${r.effectiveFrom}` }); continue; }
    applicable.push(r);
  }
  const finish = (outcome, authority) => ({
    outcome, request, authority,
    // sorted for READING only — every decision above was made without it
    candidates: lines.sort((a, b) => String(a.authorityId).localeCompare(String(b.authorityId))),
  });
  if (applicable.length === 0) return finish("ABSENT", null);

  const classes = new Set(applicable.map((r) => r.issuer.class));
  if (classes.size > 1) {
    for (const r of applicable) lines.push({ authorityId: r.authorityId, disposition: "OPEN_CONFLICT", reason: `issuer classes ${[...classes].sort().join(" · ")} are not lawfully comparable` });
    return finish("OPEN_CONFLICT", null);
  }
  const key = (r) => `${r.effectiveFrom} ${r.issuedAt}`;
  const newest = applicable.reduce((m, r) => (key(r) > m ? key(r) : m), "");
  const top = applicable.filter((r) => key(r) === newest);
  const older = applicable.filter((r) => key(r) !== newest);
  for (const r of older) lines.push({ authorityId: r.authorityId, disposition: "SUPERSEDED", reason: `SUPERSEDED — DO NOT APPLY: a newer applicable authority (effective ${top[0].effectiveFrom}) governs this proposition in this scope` });
  const contents = new Set(top.map((r) => r.contentHash));
  if (contents.size > 1) {
    for (const r of top) lines.push({ authorityId: r.authorityId, disposition: "OPEN_CONFLICT", reason: `${top.length} equally new applicable authorities disagree — unresolved; no fallback to an older one` });
    return finish("OPEN_CONFLICT", null);
  }
  for (const r of top) lines.push({ authorityId: r.authorityId, disposition: "CURRENT", reason: top.length > 1 ? `one of ${top.length} records with identical content (${r.contentHash.slice(0, 12)}) — the same authority, recorded twice` : "the newest applicable authority" });
  return finish("CURRENT", { authorityIds: top.map((r) => r.authorityId).sort(), contentHash: top[0].contentHash, effectiveFrom: top[0].effectiveFrom, sourceRefs: top.map((r) => r.sourceRef) });
}

/** Permission comes ONLY from a CURRENT authority. ABSENT, OPEN_CONFLICT and INVALID never permit, pass or default. */
export const permits = (result) => result?.outcome === "CURRENT" && result.authority !== null;
export function requireCurrent(result) {
  if (!permits(result)) throw new Error(`NO_CURRENT_AUTHORITY: ${result?.outcome ?? "no result"} for ${result?.request?.propositionId ?? "?"} — nothing may be applied, passed or defaulted`);
  return result.authority;
}
