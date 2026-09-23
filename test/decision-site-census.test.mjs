/**
 * 🔴 §5 · THE LIVE DECISION SITES RECONCILE TO A MEASURED TOTAL — AND THE REMAINDER IS ZERO.
 *
 * The figure carried into this work was 102 = "4 role adjudications + 60 sealed refusals + 38 write-gate
 * decisions". Measured, those are three different KINDS of thing: 40 code sites, 61 sealed FILES governed by one
 * registry row, and 4 registry ROWS. Adding files to rows to sites produces a number that reconciles to nothing,
 * so this census counts SITES throughout and reconciles to its own total.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { decisionSiteCensus, CLASSES, SHARED_GUARDS } from "../tools/decision-site-census.mjs";
import { census as callerCensus, auditStoreExempt } from "../tools/governed-caller-census.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";

const real = decisionSiteCensus();

test("🔴 every live decision site is classified, and the remainder is ZERO", () => {
  assert.equal(real.remainder, 0, "a decision site fell outside all five classes");
  assert.ok(real.total > 0, "an empty population makes every zero below meaningless");
  assert.equal(Object.values(real.byClass).reduce((a, b) => a + b, 0), real.total);
  for (const s of real.sites) {
    assert.ok(CLASSES.includes(s.cls), `${s.file}: class ${s.cls} is not declared`);
    assert.ok(typeof s.why === "string" && s.why.length > 20, `${s.file}: its class is asserted with no reason`);
  }
});

test("🔴 the write-gate family IS the governed-caller population — not a second list that can drift", () => {
  const governed = callerCensus().filter((c) => c.cls === "GOVERNED_STATE_CHANGE");
  const here = real.sites.filter((s) => s.family === "WRITE_GATE");
  assert.equal(here.length, governed.length);
  assert.deepEqual(here.map((s) => s.file).sort(), governed.map((c) => c.file).sort());
});

test("🔴 LIVE_AUDITED means routed — and a later recorder observation is NOT live emission", () => {
  const governed = callerCensus().filter((c) => c.cls === "GOVERNED_STATE_CHANGE");
  const routed = governed.filter((c) => c.routed).map((c) => c.file);
  /* 🔴 LIVE_AUDITED IS NOW TWO EARNED THINGS, AND NEITHER IS A LABEL. A routed caller is audited BY the boundary.
   * The audit-store caller is audited by the RECORDER — its WRITE_GATE_DECISION is emitted live, before the
   * mutation it carries — and it cannot be routed because auditing that mutation would call the store being
   * written. It earns its class from source, both conditions proved, and it stays in the denominator. */
  const exempt = auditStoreExempt(governed).map((c) => c.file);
  const live = real.sites.filter((s) => s.family === "WRITE_GATE" && s.cls === "LIVE_AUDITED").map((s) => s.file).sort();
  assert.deepEqual(live, [...routed, ...exempt].sort(), "a caller is counted LIVE_AUDITED without either reaching the boundary or earning the exemption");
  for (const f of exempt) {
    const why = real.sites.find((s) => s.file === f).why;
    assert.match(why, /WRITE_GATE_DECISION is emitted live/, `${f}: its LIVE_AUDITED class does not say how it is audited`);
  }

  /* 🔴 THE COUNT IS NOT PINNED TO A NUMBER, because routing moves it every batch. What is pinned is the
   * RELATIONSHIP: every unrouted governed caller is a DEFECT, and so is each shared guard that decides without
   * emitting. Pinning 22 here would have to be edited on every batch, and an edited number stops being evidence. */
  const unrouted = governed.filter((c) => !c.routed && !c.auditStoreExempt).length;
  const guardDefects = real.sites.filter((s) => s.family !== "WRITE_GATE" && s.cls === "DEFECT").length;
  assert.equal(real.byClass.DEFECT, unrouted + guardDefects);
});

test("🔴 every DUPLICATE_OBSERVATION is traceable to a NAMED shared guard", () => {
  const dupes = real.sites.filter((s) => s.cls === "DUPLICATE_OBSERVATION_OF_SAME_DECISION");
  assert.ok(dupes.length > 0, "nothing is classified as a duplicate — the class would be untested");
  for (const s of dupes) {
    const guard = SHARED_GUARDS[s.family];
    assert.ok(guard, `${s.file}: family ${s.family} names no shared guard`);
    assert.match(s.why, new RegExp(guard.replace(/[/.]/g, "\\$&")), `${s.file}: its reason does not name the guard it defers to`);
  }
});

test("🔴 THE TOTAL IS MEASURED, AND IT IS NOT 102 — the 102 added files to rows to sites", () => {
  const byFamily = real.sites.reduce((m, s) => ((m[s.family] = (m[s.family] ?? 0) + 1), m), {});
  /* F07 added a FOURTH family, HELDOUT (held-out access decisions, classified by execution). */
  assert.equal(real.total, byFamily.WRITE_GATE + byFamily.SEALED + byFamily.ROLE + byFamily.HELDOUT);
  /* The DATA populations, reported as data — this is where 60 and 4 came from, and neither is a count of sites. */
  const sealedRows = EVIDENCE_ROLE_REGISTRY.filter((e) => e.sealed).length;
  assert.equal(sealedRows, 1, "the 61 sealed FILES are governed by one registry row, not sixty");
  assert.ok(byFamily.SEALED > sealedRows, "the sealed rule is enforced at more sites than it has rows");
  assert.notEqual(real.total, 102);
});
