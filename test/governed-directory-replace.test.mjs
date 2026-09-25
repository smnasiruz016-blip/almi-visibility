/**
 * 🔴 F08 · PROFILE 3 · STAGED_DIRECTORY_REPLACE — the whole-directory replace an external tool fills (§4, 23 Sep 2026).
 *
 * Every reachable outcome is driven here against a stand-in directory under .test-scratch and a confined audit store
 * — never the production trail, never the real corpus. The external tool is a stand-in `populate`; the renames that
 * must fail are made to fail by an injected primitive, because a real EPERM cannot be summoned on demand.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import {
  executeGovernedWrite, PROFILES, RULED_PROFILES, RETURNED_OUTCOMES, DISCOVERED_STATES, DECLARED_UNREACHABLE,
} from "../src/governance/governed-write.mjs";
import { stagedDirectoryReplaceAdapter, TEMP_MARKER } from "../src/governance/durability-adapters.mjs";
import { createAuditStore, isoSeconds } from "../src/audit-trail/store.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const scratch = () => { mkdirSync(join(REPO, ".test-scratch"), { recursive: true }); return mkdtempSync(join(REPO, ".test-scratch", "gdr-")); };
const rel = (p) => p.slice(REPO.length).split("\\").join("/");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const OCCURRED = isoSeconds(Date.now());
const FP = sha("declared artifact identity");
const storeAt = (d) => createAuditStore({ eventsPath: join(d, "e.jsonl"), headPath: join(d, "h.json") });
const ctx = (d) => ({ store: storeAt(d), actor: "engine", actorType: "ENGINE", softwareVersion: "engine:test", correlationId: "run:gdr-test", authorityRef: { propositionId: "P-TEST", scope: ["TEST"] }, authorityHash: "d".repeat(64) });
/* F04 (25 Sep 2026): the boundary now AUTHORISES before it acts. These mechanics tests perform a REGISTERED action
 * (config/governance/authorisation.mjs) as the declared automation actor — the executor CC is in every real run — so the
 * saga under test is reached; an unregistered name would be refused as ACTION_UNSUPPORTED, which F04's own tests prove. */
const REGISTERED = "WRITE_FACTS_CENSUS";
const act = () => ({ name: REGISTERED, scopeType: "GLOBAL_PRODUCT", occurredAt: OCCURRED, occurrenceFingerprint: FP, evidenceRefs: [] });
const ALLOWED = { mayWrite: true, reason: "TEST", actorRef: "actor:cc" };
const tree = (dir) => Object.fromEntries(readdirSync(dir).sort().map((n) => [n, sha(readFileSync(join(dir, n)))]));

/** A live target holding OLD content, and an adapter that would replace it with NEW content. */
function setup({ populate, validate, rename } = {}) {
  const dir = scratch();
  const target = join(dir, "corpus");
  mkdirSync(target);
  writeFileSync(join(target, "old.html"), "old body\n");
  const adapter = stagedDirectoryReplaceAdapter({
    repo: REPO, repoRelativeTarget: rel(target), targetClass: "RUN_EVIDENCE", occurrenceFingerprint: FP,
    populate: populate ?? ((d) => { writeFileSync(join(d, "a.html"), "new a\n"); writeFileSync(join(d, "b.html"), "new b\n"); }),
    validate, rename,
  });
  return { dir, target, adapter, audit: ctx(dir) };
}
/* F04: the boundary records its AUTHORISATION_DECISION before the saga begins. These tests assert the saga's own
 * events; P-D1 separately asserts the decision precedes it. */
const allEvents = (dir) => storeAt(dir).readAll().events;
const events = (dir) => allEvents(dir).filter((e) => e.eventType === "GOVERNED_WRITE");
const siblings = (dir) => readdirSync(dir).filter((n) => n !== "e.jsonl" && n !== "h.json" && n !== "corpus");

test("P49c · the THIRD profile is accounted on its own — 4 returned · 3 discovered · 1 unreachable — and never folded into the ruling's 12", () => {
  assert.deepEqual([...PROFILES], ["STAGED_REPLACE", "VALIDATED_APPEND", "STAGED_DIRECTORY_REPLACE"]);
  assert.ok(!RULED_PROFILES.includes("STAGED_DIRECTORY_REPLACE"), "the added profile must not be read as part of the owner ruling");
  const p = "STAGED_DIRECTORY_REPLACE";
  assert.deepEqual([...RETURNED_OUTCOMES[p]], ["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "RECOVERY_REQUIRED"]);
  assert.deepEqual(DISCOVERED_STATES[p].map((d) => d.state), ["PREPARED", "RETIRED", "TARGET_ABSENT"]);
  for (const d of DISCOVERED_STATES[p]) assert.ok(d.owner && d.how.length > 40, `${d.state} has no named owner that says what it does`);
  const u = DECLARED_UNREACHABLE.filter((x) => x.profile === p);
  assert.equal(u.length, 1);
  assert.equal(u[0].outcome, "ALREADY_COMMITTED");
  assert.match(u[0].measurement, /EXTERNAL tool/);
  assert.ok(!RETURNED_OUTCOMES[p].includes("ALREADY_COMMITTED"), "a DECLARED-UNREACHABLE outcome is listed as returnable");
  assert.equal(RETURNED_OUTCOMES[p].length + DISCOVERED_STATES[p].length + u.length, 8, "8 accounted, remainder 0");
});

test("P-D1 · a successful replace: ATTEMPTED before the tool runs, then exactly ONE terminal COMMITTED, and the target is the staged tree", () => {
  const order = [];
  const { dir, target, adapter, audit } = setup({ populate: (d) => { order.push(`populate after ${events(dir).length} event(s)`); writeFileSync(join(d, "a.html"), "new a\n"); } });
  try {
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() });
    assert.equal(r.outcome, "COMMITTED");
    assert.deepEqual(order, ["populate after 1 event(s)"], "the external tool ran before ATTEMPTED was durable");
    const ev = events(dir);
    assert.deepEqual(ev.map((e) => e.metadata.governedWritePhase), ["ATTEMPTED", "COMMITTED"]);
    assert.deepEqual(allEvents(dir).map((e) => e.eventType), ["AUTHORISATION_DECISION", "GOVERNED_WRITE", "GOVERNED_WRITE"], "the authorisation decision precedes the saga");
    assert.equal(ev[1].parentEventId, ev[0].eventId);
    assert.deepEqual(Object.keys(tree(target)), ["a.html"], "the old tree survived beside the new one");
    assert.deepEqual(siblings(dir), [], "a staging or retired directory was left behind after a clean commit");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D2 · a REFUSED decision runs NO tool, touches nothing, and appends exactly one REFUSED event", () => {
  let ran = 0;
  const { dir, target, adapter, audit } = setup({ populate: () => { ran += 1; } });
  try {
    const before = tree(target);
    const r = executeGovernedWrite({ permission: { mayWrite: false, reason: "DRY_RUN" }, audit, adapter, action: act() });
    assert.equal(r.outcome, "REFUSED");
    assert.equal(ran, 0, "the external tool ran on a refused decision");
    assert.deepEqual(tree(target), before);
    assert.deepEqual(events(dir).map((e) => e.metadata.governedWritePhase), ["REFUSED"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D3 · the tool FAILS mid-way: FAILED_BEFORE_COMMIT, the old target byte-identical, the half-filled staging discarded", () => {
  const { dir, target, adapter, audit } = setup({ populate: (d) => { writeFileSync(join(d, "partial.html"), "half"); const e = new Error("download died"); e.code = "EDOWNLOAD"; throw e; } });
  try {
    const before = tree(target);
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() });
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT");
    assert.deepEqual(tree(target), before, "a failed download changed the live target");
    assert.deepEqual(siblings(dir), [], "the half-filled staging directory was left behind");
    const t = events(dir).at(-1);
    assert.equal(t.reasonCode, "GOVERNED_WRITE_PREPARE_FAILED");
    assert.notEqual(t.outcome, "APPLIED", "a failed download was recorded as applied");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D4 · validation REFUSES the staged tree (and an EMPTY one): FAILED_BEFORE_COMMIT, the live target never touched", () => {
  for (const [label, opts, code] of [
    ["validator fault", { validate: () => [{ code: "BODIES_DO_NOT_HASH", why: "stand-in" }] }, "BODIES_DO_NOT_HASH"],
    ["empty download", { populate: () => {} }, "PREPARED_EMPTY"],
  ]) {
    const { dir, target, adapter, audit } = setup(opts);
    try {
      const before = tree(target);
      const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() });
      assert.equal(r.outcome, "FAILED_BEFORE_COMMIT", label);
      assert.ok(r.faults.some((f) => f.code === code), `${label}: expected ${code}, got ${r.faults.map((f) => f.code)}`);
      assert.deepEqual(tree(target), before, `${label}: the live target changed`);
      assert.deepEqual(siblings(dir), [], `${label}: the rejected staging directory was left behind`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test("P-D5 · the second rename fails and the ROLLBACK succeeds: FAILED_BEFORE_COMMIT, and the old target is back byte-identical", () => {
  let calls = 0;
  const rename = (a, b) => { calls += 1; if (calls === 2) { const e = new Error("locked"); e.code = "EPERM"; throw e; } renameSync(a, b); };
  const { dir, target, adapter, audit } = setup({ rename });
  try {
    const before = tree(target);
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() });
    assert.equal(r.outcome, "FAILED_BEFORE_COMMIT");
    assert.equal(calls, 3, "aside, in (failed), back — the rollback did not run");
    assert.deepEqual(tree(target), before, "the rolled-back target is not the old target");
    assert.deepEqual(siblings(dir), []);
    assert.equal(events(dir).at(-1).reasonCode, "GOVERNED_WRITE_COMMIT_FAILED");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D6 · the ROLLBACK ALSO fails: RECOVERY_REQUIRED — never FAILED, never COMMITTED — and the next write is its owner", () => {
  let calls = 0;
  const rename = (a, b) => { calls += 1; if (calls >= 2) { const e = new Error("locked"); e.code = "EPERM"; throw e; } renameSync(a, b); };
  const { dir, target, adapter, audit } = setup({ rename });
  try {
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() });
    assert.equal(r.outcome, "RECOVERY_REQUIRED");
    assert.equal(existsSync(target), false, "the target was reported absent but exists");
    const t = events(dir).at(-1);
    assert.equal(t.metadata.governedWritePhase, "RECOVERY_REQUIRED");
    assert.equal(t.outcome, "INDETERMINATE");
    assert.equal(t.reasonCode, "GOVERNED_WRITE_TARGET_ABSENT_AFTER_FAILED_ROLLBACK");
    assert.ok(siblings(dir).some((n) => n.startsWith("corpus.governed-retired-")), "the RETIRED copy is not on disk to be discovered");

    // THE OWNER: the next governed write to the same target discards RETIRED and PREPARED by name and commits fresh.
    writeFileSync(join(dir, "unrelated-sibling.txt"), "not ours");
    const next = stagedDirectoryReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(target), targetClass: "RUN_EVIDENCE", occurrenceFingerprint: FP, populate: (d) => writeFileSync(join(d, "fresh.html"), "fresh\n") });
    const r2 = executeGovernedWrite({ permission: ALLOWED, audit: { ...audit, correlationId: "run:gdr-test-2" }, adapter: next, action: act() });
    assert.equal(r2.outcome, "COMMITTED");
    assert.deepEqual(Object.keys(tree(target)), ["fresh.html"]);
    assert.deepEqual(siblings(dir), ["unrelated-sibling.txt"], "the owner removed an unrelated file, or left its own behind");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D7 · an ABANDONED staging directory (a crashed download) is discarded by name — never adopted as the target", () => {
  const { dir, target, adapter, audit } = setup();
  try {
    const abandoned = join(dir, `corpus${TEMP_MARKER}dir-99999-deadbeef`);
    mkdirSync(abandoned);
    writeFileSync(join(abandoned, "half.html"), "never finished");
    const r = executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() });
    assert.equal(r.outcome, "COMMITTED");
    assert.equal(existsSync(abandoned), false, "an abandoned staging directory survived its owner");
    assert.ok(!Object.keys(tree(target)).includes("half.html"), "an abandoned staging directory was adopted into the target");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D8 · BINARY bytes survive the replace exactly — CR, LF and NUL are never normalised", () => {
  const raw = Buffer.from([0x0d, 0x0a, 0x00, 0xff, 0x0d, 0x0a, 0x41]);
  const { dir, target, adapter, audit } = setup({ populate: (d) => writeFileSync(join(d, "body.br"), raw) });
  try {
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit, adapter, action: act() }).outcome, "COMMITTED");
    assert.ok(readFileSync(join(target, "body.br")).equals(raw), "the committed bytes are not the fetched bytes");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("P-D9 · the target is confined BENEATH the repository — the repository root and an outside path are refused before anything runs", () => {
  let ran = 0;
  for (const bad of ["..", "."]) {
    const dir = scratch();
    try {
      const adapter = stagedDirectoryReplaceAdapter({ repo: REPO, repoRelativeTarget: bad, targetClass: "RUN_EVIDENCE", occurrenceFingerprint: FP, populate: () => { ran += 1; } });
      const r = executeGovernedWrite({ permission: ALLOWED, audit: ctx(dir), adapter, action: act() });
      assert.equal(r.outcome, "FAILED_BEFORE_COMMIT", `target ${bad}`);
      assert.ok(r.faults.some((f) => f.code === "TARGET_OUTSIDE_REPOSITORY"), `target ${bad} was not refused as outside the repository`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  assert.equal(ran, 0, "the external tool ran for a target outside the repository");
});

test("P-D10 · ALREADY_COMMITTED is DECLARED-UNREACHABLE here: a repeat of a committed replace RE-PREPARES and re-validates — it never claims it", () => {
  let fetched = 0;
  const populate = (d) => { fetched += 1; writeFileSync(join(d, "a.html"), "same bytes\n"); };
  const { dir, target, audit } = setup();
  try {
    const mk = () => stagedDirectoryReplaceAdapter({ repo: REPO, repoRelativeTarget: rel(target), targetClass: "RUN_EVIDENCE", occurrenceFingerprint: FP, populate });
    const first = mk();
    assert.equal(executeGovernedWrite({ permission: ALLOWED, audit, adapter: first, action: act() }).outcome, "COMMITTED");
    // Even with the target holding exactly these bytes, inspection before preparation cannot know it.
    assert.deepEqual(mk().inspect(), { state: "ABSENT" });
    const again = executeGovernedWrite({ permission: ALLOWED, audit: { ...audit, correlationId: "run:gdr-repeat" }, adapter: mk(), action: act() });
    assert.equal(again.outcome, "COMMITTED", "a repeat returned something other than a fresh, validated commit");
    assert.equal(fetched, 2, "the repeat did not re-prepare");
    assert.ok(!events(dir).some((e) => e.metadata.governedWritePhase === "ALREADY_COMMITTED"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
