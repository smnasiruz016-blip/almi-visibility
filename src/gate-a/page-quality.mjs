/**
 * 🔴 ROW 25 — THE FOUR IN-SCOPE CHECKS, PER EXISTING PAGE, EACH REPORTED ON ITS OWN.
 *
 * Frozen v0.1 half (PASS_BOUNDARIES_SOURCE.md:324-328, restated by PASS_BOUNDARIES_AMENDMENT_1.md:107-114):
 *   INPUT     an existing page, its siblings, and the claims it makes
 *   EXPECTED  unique value, sibling overlap, verified-fact presence and source integrity each MEASURED AND REPORTED
 *             per page
 *   FAILURE   any of the four is fixture-only or absent; or a page carrying unsourced claims passes source integrity
 *   EVIDENCE  the four measures over the real corpus, each with a firing fixture and a silent clean control
 * Deferred by the same frozen text (SOURCE:326): right-to-exist, cannibalization and technical-readiness AS PRE-PUBLISH
 * GATES — they need a publish path. They are carried here as DEFERRED and are never counted as satisfied or N/A.
 *
 * ── ORDER OF DECISION ──────────────────────────────────────────────────────
 *   1. TENANCY — the page's site and the fact registry are separate RESOURCE ATTACHMENTS; the page is handed the
 *      registry's facts only when both are explicitly declared to the same subject (../tenancy/attachment.mjs).
 *      A page of another subject is INVALID_CROSS_TENANT for checks C and D — never "0 facts".
 *   2. A UNIQUE VALUE and B SIBLING OVERLAP — Gate A's own measures and thresholds, unchanged (./existing-pages.mjs).
 *   3. C VERIFIED-FACT PRESENCE — a CLAIM bound to a VERIFIED fact (./claim-binding.mjs).
 *   4. D SOURCE INTEGRITY — the bound claim's trace: claim → VERIFIED fact → the source the page cites → that source
 *      LIVE in the recorded link check. Drift, an unverified fact, or a conflicting statement FAILS. A page with no bound
 *      claim is NO_BOUND_CLAIM, which is never a pass: a page carrying unsourced claims must not pass source integrity.
 *
 * ONE PASSING CHECK NEVER HIDES ANOTHER. Every page carries all four outcomes, UNKNOWN visible.
 * This module names no product, no subject, no host and no authority.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { measureExistingPages } from "./existing-pages.mjs";
import { bindClaim, sourceKey } from "./claim-binding.mjs";
import { bindResources } from "../tenancy/attachment.mjs";
import { rootIndexFor } from "../tenancy/resolver.mjs";
import { lookupStore } from "../tenancy/root-registry.mjs";

export const DEFERRED_LIMBS = Object.freeze([
  Object.freeze({ limb: "right-to-exist", state: "DEFERRED", authority: "PASS_BOUNDARIES_SOURCE.md:326", as: "pre-publish gate — needs a publish path" }),
  Object.freeze({ limb: "cannibalization", state: "DEFERRED", authority: "PASS_BOUNDARIES_SOURCE.md:326", as: "pre-publish gate — needs a publish path" }),
  Object.freeze({ limb: "technical-readiness", state: "DEFERRED", authority: "PASS_BOUNDARIES_SOURCE.md:326", as: "pre-publish gate — needs a publish path" }),
]);

const BOUND_CLAIM = new Set(["MATCH", "DRIFT", "CONFLICTING", "ADDRESSED_UNVERIFIED"]);

/**
 * @param {object} input
 * @param {{id: string, html: string, evidenceClass: "REAL"|"FIXTURE", origin: string}[]} input.pages
 * @param {object[]} input.facts            the registry's records
 * @param {{resourceKind: string, resourceRef: string, evidenceClass: string}} input.registry
 * @param {Function} input.resolve          the production tenant resolver
 * @param {Map<string, string>} input.linkVerdicts   sourceKey → LIVE | GONE | UNKNOWN, from the recorded link check
 */
export function evaluatePageQuality({ pages, facts, registry, resolve, linkVerdicts, now = new Date() }) {
  if (typeof resolve !== "function") throw new TypeError("evaluatePageQuality needs the production resolver");
  // A and B never see a fact: they are measured on every page whatever its subject.
  const ab = new Map(measureExistingPages(pages.map((p) => ({ id: p.id, html: p.html })), [], { now }).results.map((r) => [r.id, r]));
  return pages.map((p) => {
    const m = ab.get(p.id);
    const A = m.uniqueWords === null ? { state: "UNMEASURABLE", uniqueWords: null } : { state: m.uniquePass ? "PASS" : "FAIL", uniqueWords: m.uniqueWords };
    /* B has a THIRD state: a measured overlap over fewer residual words than Gate A's NOISY_RESIDUAL_WORDS is NOISY —
     * reported with its number and its count, and never a pass (overlap.mjs, D2). A high score stays a FAIL. */
    const B = m.overlapState !== "MEASURED" ? { state: m.overlapState }
      : { state: !m.overlapPass ? "FAIL" : m.overlapNoisy ? "NOISY" : "PASS", maxOverlap: m.maxOverlap, against: m.overlapAgainst, residualWords: m.residualWords };
    const tenancy = bindResources(resolve, { resourceKind: "SITE_ORIGIN", resourceRef: p.origin, evidenceClass: p.evidenceClass }, registry);
    if (tenancy.binding !== "BOUND") {
      const s = tenancy.binding === "UNBOUND" || tenancy.binding === "UNKNOWN" ? "UNKNOWN" : "INVALID";
      return { id: p.id, evidenceClass: p.evidenceClass, group: m.group, tenancy: tenancy.binding, A, B, C: { state: s, why: tenancy.why }, D: { state: s, why: tenancy.why } };
    }
    const bindings = facts.map((f) => bindClaim(p.html, f)).filter((b) => BOUND_CLAIM.has(b.outcome));
    const verifiedMatch = bindings.filter((b) => b.outcome === "MATCH");
    const C = bindings.length === 0
      ? { state: "NO_BOUND_CLAIM", bindings }
      : { state: verifiedMatch.length ? "PRESENT" : "ADDRESSED_NOT_PRESENT", present: verifiedMatch.map((b) => b.factId), bindings };
    let D;
    if (bindings.length === 0) D = { state: "NO_BOUND_CLAIM", why: "no claim on this page binds to a fact — nothing traces, and an untraced page never passes source integrity" };
    else if (bindings.some((b) => b.outcome !== "MATCH")) D = { state: "FAIL", why: bindings.filter((b) => b.outcome !== "MATCH").map((b) => `${b.factId}: ${b.outcome}${b.differing?.length ? ` (${b.differing.join(", ")})` : ""}`).join("; ") };
    else {
      const byId = new Map(facts.map((f) => [f.id, f]));
      const verdicts = verifiedMatch.map((b) => linkVerdicts.get(sourceKey(byId.get(b.factId)?.source?.url ?? "")) ?? "UNKNOWN");
      D = verdicts.every((v) => v === "LIVE") ? { state: "PASS", why: "every bound claim matches its VERIFIED fact and traces to a LIVE cited source" }
        : verdicts.some((v) => v === "GONE") ? { state: "FAIL", why: "a bound claim's source is GONE" }
          : { state: "UNKNOWN", why: "a bound claim's source was not link-checked" };
    }
    return { id: p.id, evidenceClass: p.evidenceClass, group: m.group, tenancy: "BOUND", A, B, C, D };
  });
}

/** Every page in exactly one outcome — the §9 arithmetic. SELECTED = bound, with a claim bound to a fact. */
export function tallyPageQuality(results) {
  const t = { total: results.length, real: 0, fixture: 0, crossTenantOrInvalid: 0, unbound: 0, boundNoClaim: 0, selected: 0, PASS: 0, FAIL: 0, UNKNOWN: 0, INVALID: 0 };
  for (const r of results) {
    t[r.evidenceClass === "REAL" ? "real" : "fixture"] += 1;
    if (r.tenancy !== "BOUND") {
      if (r.C.state === "INVALID") { t.crossTenantOrInvalid += 1; t.INVALID += 1; } else { t.unbound += 1; t.UNKNOWN += 1; }
      continue;
    }
    if (r.C.state === "NO_BOUND_CLAIM") { t.boundNoClaim += 1; t.UNKNOWN += 1; continue; }
    t.selected += 1;
    const states = [r.A.state, r.B.state, r.C.state === "PRESENT" ? "PASS" : "FAIL", r.D.state];
    if (states.includes("FAIL")) t.FAIL += 1;
    else if (states.every((s) => s === "PASS")) t.PASS += 1;
    else t.UNKNOWN += 1;
  }
  t.remainder = t.total - (t.INVALID + t.UNKNOWN + t.PASS + t.FAIL);
  return t;
}

/**
 * 🔴 ROW 25's VERDICT — the frozen contract asks that each check be MEASURED AND REPORTED per page on the real corpus,
 * with a firing fixture and a silent clean control; not that pages pass. So it passes only when, on REAL pages:
 * A and B are measured on at least one page each; C reached a claim bound to a VERIFIED fact on at least one page;
 * D reported PASS or FAIL (never only NO_BOUND_CLAIM or UNKNOWN) on at least one page; no page with a non-matching
 * bound claim passed D; and the controls fired and stayed silent.
 */
export function row25Verdict({ results, controls }) {
  const real = results.filter((r) => r.evidenceClass === "REAL");
  const reasons = [];
  if (!real.some((r) => ["PASS", "FAIL"].includes(r.A.state))) reasons.push({ code: "A_NOT_MEASURED_ON_REAL", why: "unique value was measured on no real page" });
  if (!real.some((r) => ["PASS", "FAIL"].includes(r.B.state))) reasons.push({ code: "B_NOT_MEASURED_ON_REAL", why: "sibling overlap was measured on no real page" });
  if (!real.some((r) => r.tenancy === "BOUND" && (r.C.bindings ?? []).some((b) => ["MATCH", "DRIFT", "CONFLICTING"].includes(b.outcome)))) reasons.push({ code: "C_NO_REAL_BOUND_CLAIM", why: "no real page carries a claim bound to a VERIFIED fact" });
  if (!real.some((r) => ["PASS", "FAIL"].includes(r.D.state))) reasons.push({ code: "D_NOT_REPORTED_ON_REAL", why: "source integrity reached no real page's claim" });
  if (results.some((r) => r.D.state === "PASS" && (r.C.bindings ?? []).some((b) => b.outcome !== "MATCH"))) reasons.push({ code: "UNSOURCED_CLAIM_PASSED", why: "a page whose bound claim does not match passed source integrity" });
  for (const c of ["A", "B", "C", "D"]) {
    if (controls?.[c]?.fires !== true) reasons.push({ code: `${c}_FIRING_FIXTURE_MISSING`, why: `check ${c} has no firing fixture on record` });
    if (controls?.[c]?.silent !== true) reasons.push({ code: `${c}_CLEAN_CONTROL_MISSING`, why: `check ${c} has no silent clean control on record` });
  }
  return { verdict: reasons.length ? "NOT_PASS" : "PASS", reasons, deferred: DEFERRED_LIMBS };
}

/**
 * 🔴 THE CONTROLS, RUN LIVE THROUGH THE SAME FUNCTIONS — a firing fixture and a silent clean control per check.
 * Fixture pages are FIXTURE-class, attached to a fixture subject by a fixture resolver, and are never counted as real.
 * C and D are built from a real list-shaped fact (its source, locale and labels), so the control exercises the same
 * binding a real page does; the page around it is synthetic, and says so.
 */
export function liveControls({ fact }) {
  const T = "tenant:ffffffffffffffffffffffffffffffff";
  const fixtureResolve = ({ resourceRef }) => (resourceRef.startsWith("https://fixture.invalid") || resourceRef === "fixture-registry" ? { state: "RESOLVED", tenantId: T } : { state: "UNDECLARED", tenantId: null });
  const registry = { resourceKind: "FACT_REGISTRY", resourceRef: "fixture-registry", evidenceClass: "FIXTURE" };
  const words = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ");
  const shell = `<nav>${words("navitem", 60)}</nav><footer>${words("footeritem", 60)}</footer>`;
  const page = (id, body) => ({ id: `https://fixture.invalid/g/${id}`, origin: "https://fixture.invalid", evidenceClass: "FIXTURE", html: `<html><body>${shell}<main>${body}</main></body></html>` });
  const run = (pages, facts = []) => evaluatePageQuality({ pages, facts, registry, resolve: fixtureResolve, linkVerdicts: new Map([[sourceKey(fact.source.url), "LIVE"]]) });

  const ab = run([page("own", words("own", 420)), page("thin", "just a few words here"), page("twin-a", words("twin", 420)), page("twin-b", words("twin", 420))]);
  const byId = (rs, id) => rs.find((r) => r.id.endsWith(`/${id}`));
  const list = [...(String(fact.value.value).split(/\s*(?:,\s*and\s+|,|·|;|\s+and\s+)\s*/).filter(Boolean))].map((p) => p.replace(/[.]+$/, ""));
  const locale = Object.values(fact.locale ?? {}).join(" ");
  const cite = `<a href="${fact.source.url}">official page</a>`;
  const drifted = list.map((p, i) => (i === list.length - 1 ? p.replace(/(\S+)$/, "ZZ") : p));
  const cd = run([
    { ...page("clean", `${locale} ${list.join(" · ")} ${cite} ${words("clean", 400)}`) },
    { ...page("drift", `${locale} ${drifted.join(" · ")} ${cite} ${words("drift", 400)}`) },
    { ...page("filler", words("filler", 420)) },
  ], [fact]);
  return {
    A: { fires: byId(ab, "thin").A.state === "FAIL", silent: byId(ab, "own").A.state === "PASS" },
    B: { fires: byId(ab, "twin-a").B.state === "FAIL", silent: byId(ab, "own").B.state === "PASS" },
    C: { fires: byId(cd, "drift").C.state === "ADDRESSED_NOT_PRESENT", silent: byId(cd, "clean").C.state === "PRESENT" },
    D: { fires: byId(cd, "drift").D.state === "FAIL", silent: byId(cd, "clean").D.state === "PASS" },
  };
}

/**
 * Read a manifest-pinned capture of real pages from the declared CAPTURES store. It refuses rather than shortens: a
 * store that is undeclared, declared twice or unreadable, a capture absent from it, a file the manifest does not declare,
 * or a byte that disagrees with its sha256 throws.
 * 🔴 F03: the store is the CAPTURES store a root registry declares — the engine no longer probes roots for `captures/`.
 */
export function readPageCapture({ captureId, env = process.env }) {
  const store = lookupStore(rootIndexFor(env), "CAPTURES");
  if (store.state !== "DECLARED") throw new Error(`PAGE_CAPTURE_${store.state === "AMBIGUOUS" ? "AMBIGUOUS" : "UNAVAILABLE"}: the CAPTURES store is ${store.state} (${store.reason})`);
  if (typeof captureId !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(captureId)) throw new Error("PAGE_CAPTURE_INVALID: a capture id is lowercase letters, digits and hyphens only");
  const dir = join(store.dir, captureId);
  if (!existsSync(dir)) throw new Error(`PAGE_CAPTURE_UNAVAILABLE: '${captureId}' is not in the declared CAPTURES store`);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const declared = new Map((manifest.pages ?? []).map((p) => [p.file, p]));
  const onDisk = readdirSync(dir).filter((f) => f !== "manifest.json");
  for (const f of onDisk) if (!declared.has(f)) throw new Error(`PAGE_CAPTURE_INVALID: ${f} is not declared by the manifest`);
  return [...declared.values()].map((p) => {
    const bytes = readFileSync(join(dir, p.file));
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (sha !== p.sha256) throw new Error(`PAGE_CAPTURE_INVALID: ${p.file} hashes ${sha}; the manifest declares ${p.sha256}`);
    return { id: p.url, html: bytes.toString("utf8"), origin: p.origin, evidenceClass: "REAL", captured: p };
  });
}
