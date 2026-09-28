/**
 * F77 · one PROCESS of a concurrency proof (test/f77-idempotency-retry-recovery.test.mjs). Not a test file and not a sabotage.
 *
 *   node test/helpers/f77-concurrent-writer.mjs <mode> <dir> <startAtMs> [<label>]
 *     mode "governed-write"  the SAME governed write (same bytes, same action) into <dir>
 *     mode "append-distinct" one audit event whose identity carries <label>
 *     mode "append-same"     one audit event with a fixed identity
 *
 * Every process spins to a common start instant so the calls genuinely overlap, then prints ONE line: its outcome. It touches
 * only the confined scratch directory it is given — never the production trail.
 */
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { executeGovernedWrite } from "../../src/governance/governed-write.mjs";
import { stagedReplaceAdapter } from "../../src/governance/durability-adapters.mjs";
import { createAuditStore } from "../../src/audit-trail/store.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [mode, dir, startAt, label = "x"] = process.argv.slice(2);
const rel = (p) => p.slice(REPO.length).split("\\").join("/");
const store = createAuditStore({ eventsPath: join(dir, "e.jsonl"), headPath: join(dir, "h.json") });
const OCCURRED = "2026-09-28T21:00:00Z";
while (Date.now() < Number(startAt)) { /* a common start instant */ }
try {
  if (mode === "governed-write") {
    const audit = { store, actor: "engine", actorType: "ENGINE", softwareVersion: "engine:test", correlationId: "run:f77-concurrency", authorityRef: { propositionId: "P-TEST", scope: ["TEST"] }, authorityHash: "d".repeat(64) };
    const adapter = stagedReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(join(dir, "one.txt")), targetClass: "REPOSITORY_FILE", bytes: "once\n" });
    /* TEST DOUBLE around the real adapter: preparation is SLOWED so every process has inspected "not committed" before any
     * commits — the race window a slow disk or a loaded machine opens. Without the saga lock this must double-commit; with it,
     * the waiters inspect after the commit. Measured: without the slowdown the window was too narrow to show the defect. */
    const realPrepare = adapter.prepare.bind(adapter);
    adapter.prepare = (...a) => { const t = Date.now(); while (Date.now() - t < 300) { /* slow preparation */ } return realPrepare(...a); };
    const r = executeGovernedWrite({ permission: { mayWrite: true, reason: "TEST", actorRef: "actor:cc" }, audit, adapter, action: { name: "WRITE_FACTS_CENSUS", label: "f77", scopeType: "GLOBAL_PRODUCT", occurredAt: OCCURRED, occurrenceFingerprint: adapter.occurrenceFingerprint, evidenceRefs: [] } });
    console.log(r.outcome);
  } else {
    const draft = {
      eventType: "GOVERNED_WRITE", action: "F77_CONCURRENCY_PROBE", outcome: "RECORDED", reasonCode: "F77_PROBE", occurredAt: OCCURRED,
      actor: "engine", actorType: "ENGINE", scopeType: "GLOBAL_PRODUCT", tenantId: null, subjectId: null,
      authorityRef: { propositionId: "P-TEST", scope: ["TEST"] }, authorityHash: "d".repeat(64), softwareVersion: "engine:test",
      evidenceRefs: [], correlationId: "run:f77", migration: false,
      /* the store's identity subject: distinct per process for "append-distinct", one value for "append-same" */
      metadata: { identitySubject: mode === "append-same" ? "same" : label },
    };
    const r = store.append(draft);
    console.log(r.status);
  }
} catch (e) {
  console.log(`THREW ${e?.code ?? e?.name ?? "Error"}`);
}
