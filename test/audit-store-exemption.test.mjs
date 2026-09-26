/**
 * 🔴 §2 · THE AUDIT-STORE EXEMPTION IS EARNED FROM SOURCE, NEVER DECLARED.
 *
 * One entry point cannot be routed through the governed-write boundary: the one whose mutation IS the audit
 * store. Routing it would make the audit system recursively audit its own persistence, and it would hit the
 * boundary's own AUDIT_STORE_TARGET_FORBIDDEN fence.
 *
 * The owner ruling exempts that write BY NAME, and adds that "infrastructure" is not a word any future write may
 * claim for itself. So there is no list to join and no flag to set: a caller earns the class only by satisfying
 * BOTH conditions, read from its own source —
 *
 *   A · every mutation it makes targets the declared audit-store implementation, and nothing else;
 *   B · it emits its WRITE_GATE_DECISION through the live recorder BEFORE that mutation.
 *
 * Every negative below is a STAND-IN injected as a fixed input. Nothing is written into bin/, the git index is
 * untouched, and no binary runs, so none of this can reach the production trail.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { census, bypasses, auditStoreExempt, auditStoreInternalWrite, writeSitesOf } from "../tools/governed-caller-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const real = census();

/** A stand-in entry point, built from parts so this file is not itself read as one. */
const standIn = ({ gateBeforeMutation = true, auditTargetOnly = true, extraWrite = null }) => {
  /* The REAL shape: the decision is built as a candidate draft and handed to the same live recorder call that
   * performs the mutation, so it cannot be omitted while the mutation happens. An earlier draft of this stand-in
   * wrote `store.append(writeGateEvent(...))`, which is itself a write site and therefore failed condition A — the
   * stand-in was unrealistic, not the rule wrong. */
  const gate = "  const drafts = [{ family: \"D\", draft: writeGateEvent({ permission, target: \"local\", action: \"WRITE_AUDIT_TRAIL_STORE\" }) }];";
  const mutation = "  const result = recordCandidates({ store, candidates, corpus: CORPUS });";
  /* 24 Sep 2026 (owner ruling on audit-store-only primitives): the call site must now PROVE what it calls and what it
   * hands in — the primitive imported from its registered module, and the store constructed from this entry point's
   * own root. The stand-in carries both, as every real caller does; without them it would earn nothing, and every
   * negative control below would pass for the wrong reason. */
  const body = [
    "import { dirname, join } from \"node:path\";",
    "import { fileURLToPath } from \"node:url\";",
    "import { recordCandidates, writeGateEvent } from \"../src/audit-trail/recorder.mjs\";",
    "import { productionAuditStore } from \"../src/audit-trail/wiring.mjs\";",
    "import { writePermission, announceWritePermission, LOCAL } from \"../src/write-law.mjs\";",
    "const REPO = join(dirname(fileURLToPath(import.meta.url)), \"..\");",
    "const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));",
    "const store = productionAuditStore({ repo: REPO });",
    ...(gateBeforeMutation ? [gate] : []),
    auditTargetOnly ? mutation : "  writeFileSync(out, body, \"utf8\");",
    ...(extraWrite ? [extraWrite] : []),
    ...(gateBeforeMutation ? [] : [gate]),
    "",
  ].join("\n");
  return [{ file: "bin/zz-stand-in.mjs", text: body }];
};

const classOf = (sources) => {
  const rows = census({ sources });
  const row = rows.find((r) => r.file === "bin/zz-stand-in.mjs");
  return { row, exempt: row.auditStoreExempt, bypass: bypasses(rows).length };
};

test("🔴 POSITIVE · bin/audit-trail.mjs earns the exemption, and BOTH conditions are proved separately", () => {
  const row = real.find((r) => r.file === "bin/audit-trail.mjs");
  assert.ok(row, "the audit-trail entry point is not in the census at all");
  assert.equal(row.cls, "GOVERNED_STATE_CHANGE", "it must stay a governed state change; the exemption is not a reclassification");
  assert.equal(row.auditStoreExempt, true);
  assert.equal(row.routed, false, "a routed caller is never also exempt");

  const e = row.exemption;
  assert.equal(e.conditionA, true, "A: it writes something that is not the audit store");
  assert.equal(e.targetsOnlyAuditStore, true);
  assert.equal(e.constructsAuditStore, true);
  assert.equal(e.conditionB, true, "B: no live write-gate event precedes the mutation");
  assert.ok(e.gateLine > 0 && e.gateLine < e.firstMutation, `the write-gate event is at ${e.gateLine}, the mutation at ${e.firstMutation}`);
});

test("🔴 IT STAYS VISIBLE — the exemption never shrinks the denominator", () => {
  const governed = real.filter((r) => r.cls === "GOVERNED_STATE_CHANGE");
  const routed = governed.filter((r) => r.routed).length;
  const exempt = auditStoreExempt(real).length;
  const bypass = bypasses(real).length;
  assert.equal(routed + exempt + bypass, governed.length, "routed + exempt + bypassing does not sum to the governed population");
  assert.ok(exempt >= 1);
  /* Named, not merely counted: a reader can see WHICH caller carries it. */
  /* Two since 23 September: F07's bin/heldout-evaluation.mjs writes ONLY audit events (access decisions, freezes,
   * its own write-gate decisions) and earns the exemption by the same two derived conditions — never by a list. */
  /* One since 26 September: F10 routed bin/heldout-evaluation.mjs's scoring run through the boundary, so it is BOUNDARY_ROUTED
   * (its primitive sites remain checked audit-store sites) and no longer carries the caller exemption. */
  assert.deepEqual(auditStoreExempt(real).map((r) => r.file), ["bin/audit-trail.mjs"]);
  for (const r of auditStoreExempt(real)) assert.ok(r.exemption.conditionA && r.exemption.conditionB, `${r.file} is exempt without BOTH derived conditions`);
});

test("🔴 CONTROL · condition A removed — a caller that writes ANY non-audit target cannot claim it", () => {
  const c = classOf(standIn({ auditTargetOnly: false }));
  assert.equal(c.exempt, false, "a caller writing a plain file earned the audit-store exemption");
  assert.equal(c.row.exemption.conditionA, false);
  assert.equal(c.bypass, 1, "and it is counted as a bypass, not quietly excused");
});

test("🔴 CONTROL · condition A removed the other way — an audit write PLUS one ordinary write still fails", () => {
  const c = classOf(standIn({ extraWrite: "  writeFileSync(other, payload, \"utf8\");" }));
  assert.equal(c.exempt, false, "one non-audit target was enough to be forgiven");
  assert.equal(c.row.exemption.targetsOnlyAuditStore, false);
});

test("🔴 CONTROL · condition B removed — no live write-gate event at all", () => {
  const source = standIn({});
  source[0].text = source[0].text.split("\n").filter((l) => !l.includes("writeGateEvent(")).join("\n");
  const c = classOf(source);
  assert.equal(c.exempt, false, "a caller that records no decision earned the exemption");
  assert.equal(c.row.exemption.conditionB, false);
});

test("🔴 CONTROL · condition B inverted — the write-gate event AFTER the mutation is not before it", () => {
  const c = classOf(standIn({ gateBeforeMutation: false }));
  assert.equal(c.exempt, false, "the decision was recorded after the mutation and still counted");
  assert.equal(c.row.exemption.conditionB, false);
  assert.ok(c.row.exemption.gateLine > c.row.exemption.firstMutation);
});

test("🔴 CONTROL · an ORDINARY governed writer cannot claim it — checked against every real caller", () => {
  const AUDIT_ONLY = new Set(["bin/audit-trail.mjs", "bin/heldout-evaluation.mjs"]);
  for (const r of real.filter((x) => x.cls === "GOVERNED_STATE_CHANGE" && !AUDIT_ONLY.has(x.file))) {
    assert.equal(r.auditStoreExempt, false, `${r.file} claims the audit-store exemption and is not the audit store`);
  }
  /* And the derivation really can say yes, so the loop above is not a check that cannot fail. */
  assert.equal(classOf(standIn({})).exempt, true, "a well-formed stand-in does NOT earn it — the rule can no longer say yes");
});

test("🔴 the exemption is DERIVED — there is no declaration for a caller to set on itself", () => {
  const source = readFileSync(new URL("../tools/governed-caller-census.mjs", import.meta.url), "utf8");
  const sites = writeSitesOf(readFileSync(new URL("../bin/audit-trail.mjs", import.meta.url), "utf8"));
  assert.ok(sites.length > 0, "the audit-trail caller has no write site — the exemption would be vacuous");
  /* auditStoreInternalWrite reads only the source and its sites; it takes no flag, list or declaration. */
  assert.equal(auditStoreInternalWrite(readFileSync(new URL("../bin/audit-trail.mjs", import.meta.url), "utf8"), sites).exempt, true);
  /* 🔴 THE FIRST DRAFT OF THIS ASSERTION MATCHED THE CENSUS'S OWN SENTENCE saying it has no allowlist — a guard
   * tripping on prose about itself, for the third time in this work. The text was fixed, never the rule: the claim
   * is now made structurally. The derivation takes a source and its sites, and nothing else; there is no parameter
   * a caller could fill and no export naming a set of forgiven files. */
  assert.equal(auditStoreInternalWrite.length, 2, "the derivation takes more than the source and its sites");
  assert.ok(!/export const \w*EXEMPT\w*(FILES|LIST|CALLERS)\b/.test(source), "the census exports a set of exempt files");
  assert.ok(!/\bnew Set\(\[[^\]]*bin\//.test(source), "the census carries a hard-coded set of bin paths");
});
