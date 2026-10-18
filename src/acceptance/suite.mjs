/**
 * 🔴 F86 · INDEPENDENT ACCEPTANCE AND PORTABILITY SUITE (acceptance _handoffs 903f361, AlmiVisibility_F86_ACCEPTANCE_2026-10-17.md, RR-283).
 *
 * One entry (test/helpers/f86-acceptance-suite.mjs) runs every part below and prints PASS / FAIL per part (C1); the same entry runs again in
 * a fresh sibling clone with only the declared data (C2, RR-247's method). The parts:
 *
 *   DEFECTS_CAUGHT        C3 · a fixed sample of sabotage limbs across rows, each run alone by its own harness — each must turn its named
 *                         test red and be restored (PROVED), residue 0
 *   NEUTRAL_AND_ISOLATED  C4 · the existing neutrality, isolation and scope censuses, each holding its own planted controls (a planted
 *                         name, a planted cross-tenant read) that must be red — they run as they are, every test must pass
 *   REAL_POPULATION       C5 · the real-population tests on the declared data — every one must run (none skipped) and pass, and each
 *                         file's counts line ("REAL … count-only") is carried into the report
 *
 * This module holds the declaration and the verdicts only. Pure: no file, process or network. Names no product, host or tenant.
 */
export const VERDICT = Object.freeze({ PASS: "PASS", FAIL: "FAIL" });

export const PARTS = Object.freeze([
  Object.freeze({ id: "DEFECTS_CAUGHT", clause: "C3", kind: "LIMBS", limbs: Object.freeze([
    Object.freeze({ harness: "test/helpers/f54-sabotage.mjs", limb: "F5", row: "F54" }),
    Object.freeze({ harness: "test/helpers/f42-sabotage.mjs", limb: "G2", row: "F42" }),
    Object.freeze({ harness: "test/helpers/f46-sabotage.mjs", limb: "S8", row: "F46" }),
    Object.freeze({ harness: "test/helpers/rr282-batch-append-sabotage.mjs", limb: "W1", row: "F08" }),
  ]) }),
  Object.freeze({ id: "NEUTRAL_AND_ISOLATED", clause: "C4", kind: "TESTS", files: Object.freeze([
    "test/product-boundary.test.mjs", "test/client-neutrality.test.mjs", "test/f02-tenant-isolation.test.mjs", "test/f09-cross-client-portability.test.mjs",
  ]) }),
  Object.freeze({ id: "REAL_POPULATION", clause: "C5", kind: "TESTS", counts: true, files: Object.freeze([
    "test/f54-answer-readiness.test.mjs", "test/f42-draft-repair.test.mjs", "test/f46-citation-audit.test.mjs", "test/rr283-decision-3.test.mjs",
    "test/f62-applicability.test.mjs", "test/f62-assessment.test.mjs", "test/f10-built-pages.test.mjs",
  ]) }),
]);

/** The counts line(s) a real-population test prints. */
export const countsIn = (out) => [...String(out ?? "").matchAll(/^\s*(REAL\d? \([^\n]*count-only[^\n]*)$/gm)].map((m) => m[1].trim());
/** node --test's own totals from one run's output. */
export function totalsOf(out) {
  const n = (k) => Number(new RegExp(`^ℹ ${k} (\\d+)$`, "m").exec(String(out ?? ""))?.[1] ?? NaN);
  return { tests: n("tests"), pass: n("pass"), fail: n("fail"), skipped: n("skipped"), cancelled: n("cancelled"), todo: n("todo") };
}

/**
 * One part's verdict from its runs. TESTS: each file's run must exit 0 with tests > 0, fail 0, skipped 0, cancelled 0, todo 0; a counted part
 * also needs a counts line from every file. LIMBS: each limb's run must report it PROVED with residue 0 and the trail unchanged.
 * A part with nothing run is a FAIL — never a pass by absence.
 */
export function partVerdict(part, runs) {
  const why = [];
  if (!Array.isArray(runs) || runs.length === 0) why.push("nothing ran");
  if (part.kind === "TESTS") {
    if ((runs ?? []).length !== part.files.length) why.push(`${(runs ?? []).length} of ${part.files.length} file(s) ran`);
    for (const r of runs ?? []) {
      const t = totalsOf(r.out);
      if (r.exit !== 0) why.push(`${r.file}: exit ${r.exit}`);
      if (!(t.tests > 0)) why.push(`${r.file}: no test ran`);
      if (t.fail > 0 || t.cancelled > 0) why.push(`${r.file}: ${t.fail} failed, ${t.cancelled} cancelled`);
      if (t.skipped > 0 || t.todo > 0) why.push(`${r.file}: ${t.skipped} skipped, ${t.todo} todo — a skipped test is not a pass`);
      if (part.counts && countsIn(r.out).length === 0) why.push(`${r.file}: no counts line`);
    }
  } else {
    if ((runs ?? []).length !== part.limbs.length) why.push(`${(runs ?? []).length} of ${part.limbs.length} limb(s) ran`);
    for (const r of runs ?? []) {
      const out = String(r.out ?? "");
      if (r.exit !== 0) why.push(`${r.limb}: exit ${r.exit}`);
      if (!new RegExp(`^${r.limb} .*· PROVED$`, "m").test(out)) why.push(`${r.limb}: not PROVED`);
      if (!/· residue 0 ·/.test(out) || !/unchanged true/.test(out)) why.push(`${r.limb}: residue left, or the production trail moved`);
    }
  }
  return Object.freeze({ part: part.id, clause: part.clause, verdict: why.length ? VERDICT.FAIL : VERDICT.PASS, why: Object.freeze(why) });
}

/** The suite's verdict: PASS only when every declared part ran and passed. */
export function suiteVerdict(verdicts) {
  const missing = PARTS.filter((p) => !(verdicts ?? []).some((v) => v.part === p.id)).map((p) => p.id);
  const failed = (verdicts ?? []).filter((v) => v.verdict !== VERDICT.PASS).map((v) => v.part);
  return Object.freeze({ verdict: missing.length || failed.length ? VERDICT.FAIL : VERDICT.PASS, missing: Object.freeze(missing), failed: Object.freeze(failed) });
}

/** C2 · a clone run passes only when it finished, its suite passed, and it changed no tracked file of the clone. */
export function cloneVerdict({ finished, exit, suite, trackedChanged }) {
  const why = [!finished ? "the clone run did not finish" : null, exit !== 0 ? `exit ${exit}` : null, suite !== VERDICT.PASS ? `the suite in the clone: ${suite ?? "none"}` : null, trackedChanged ? "a tracked file of the clone changed" : null].filter(Boolean);
  return Object.freeze({ verdict: why.length ? VERDICT.FAIL : VERDICT.PASS, why: Object.freeze(why) });
}

/** The report: one line per part, its verdict and why, then the counts the real-population part carried. */
export function report({ where, head, verdicts, counts = [] }) {
  const s = suiteVerdict(verdicts);
  return [
    `F86 · INDEPENDENT ACCEPTANCE SUITE · ${where} · head ${head}`,
    ...PARTS.map((p) => { const v = verdicts.find((x) => x.part === p.id); return `  ${p.id.padEnd(22)}${p.clause} · ${v ? v.verdict : "FAIL"}${v?.why?.length ? ` — ${v.why.join("; ")}` : v ? "" : " — did not run"}`; }),
    ...counts.map((c) => `    ${c}`),
    `  SUITE                 ${s.verdict}${s.failed.length || s.missing.length ? ` — failed ${s.failed.join(", ") || "none"} · missing ${s.missing.join(", ") || "none"}` : ""}`,
  ];
}
