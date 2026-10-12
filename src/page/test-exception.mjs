/**
 * 🔴 THE ONE-TIME TEST EXCEPTION — "treat the existing pages as not existing", SUPPLIED FROM OUTSIDE the verified decision functions
 * (the owner, RR-253 C3 and answer 6: `_handoffs` AlmiVisibility_OWNER_DECISION_2026-10-12_RR-253_ANSWERS_C1_TO_C5.md and
 * …_ANSWERS_TO_THE_BUILD_STOP.md).
 *
 * F33, F34 and F35 are NOT changed and are not asked to allow anything: each already takes the existing-page population as an argument.
 * This module returns an EMPTY population recorded COMPLETE — and it does so ONLY when handed the committed owner record that orders the
 * exception. Without that record it throws; it has no default. Everything built under it carries STAMP, and is evidence for no row.
 *
 * Pure. Reads nothing, writes nothing. Names no product, tenant or page.
 */
export const STAMP = "TEST — never published";
const COMMIT = /^[0-9a-f]{40}$/;
const present = (v) => typeof v === "string" && v.trim() !== "";

/** `<repo>:<path>@<commit>` → the record, or null. */
export function parseExceptionRecord(text) {
  const m = /^([^:@\s]+):([^@\s]+)@([0-9a-f]{40})$/.exec(String(text ?? ""));
  return m ? Object.freeze({ repo: m[1], path: m[2], commit: m[3] }) : null;
}

/**
 * @param {{ tenantId: string, record: { repo: string, path: string, commit: string } }} input
 * @returns {{ population: object, stamp: string, exception: object }}
 */
export function testException({ tenantId, record }) {
  if (!present(tenantId)) throw new TypeError("TEST_EXCEPTION_NAMES_NO_TENANT");
  if (!record || !present(record.repo) || !present(record.path) || !COMMIT.test(record.commit ?? "")) throw new TypeError("TEST_EXCEPTION_WITHOUT_ITS_COMMITTED_OWNER_RECORD");
  const exception = Object.freeze({ kind: "ONE_TIME_TEST_EXCEPTION", record: Object.freeze({ ...record }), scope: STAMP, effect: "the tenant's existing pages are treated as not existing, for this run only" });
  return Object.freeze({
    population: Object.freeze({ tenantId, coverageState: "COMPLETE", pages: Object.freeze([]), inventory: Object.freeze({ pages: Object.freeze([]) }), exception }),
    stamp: STAMP,
    exception,
  });
}
