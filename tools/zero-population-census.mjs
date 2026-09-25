#!/usr/bin/env node
/**
 * 🔴 F04 · AMENDMENT 1 · THE FIVE-FAMILY CENSUS — the approved real-action population of every high-risk family, MEASURED.
 *
 *   node tools/zero-population-census.mjs [--check] [--json]
 *
 * Owner ruling _handoffs 4bf7b1d (decision c) · F04 Acceptance Amendment 1 (68bd208, contract ff793319…). READ-ONLY.
 *
 * A high-risk family has an authorised real-action population only when at least one CURRENT, separately owner-approved real
 * action exists (ruling §1). Code, a guard, a refused attempt, a fixture, a stand-in or an unused capability creates none (§2).
 * So the population is read from the three places a real action would leave a trace — never assumed from their absence:
 *   · the approval registry        config/governance/approvals.jsonl (computed state)       → APPROVED_REAL_ACTION · INVALID_OR_EXPIRED_APPROVAL
 *   · the committed audit trail    audit-trail/events.jsonl (decisions, governed writes,     → REFUSED_REAL_ATTEMPT · authorised executions
 *                                  and the tenant-scope refusals of this family's entry points)
 *   · the production tree          tools/authorisation-census.mjs sites + direct authorise( calls → production action sites
 * The CONFINED CONTROLS that reach each family's authorised branch are declared below, by test name. They are counted in their
 * own column and NEVER in the real population (ruling §3; Amendment 1: "exclude that control from the real population").
 *
 * THE ROUTE per family: ZERO_APPROVED only when the measured approved population is 0; otherwise REAL_POPULATION_REQUIRED
 * (an existing approval cannot be hidden). THE REOPEN TRIGGER: a family pinned zero-approved in ACCEPTANCES.F04 that now
 * measures an approved real action names REOPEN_F04 — the first future approved real action forces an F04 re-sit (§3).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { ACTIONS } from "../config/governance/authorisation.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { actionEntry, readApprovals } from "../src/governance/authorisation.mjs";
import { authorisationCensus } from "./authorisation-census.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const ZERO_ROUTE_FAMILIES = Object.freeze(["SPEND", "EXPORT", "VERIFICATION", "PUBLISH", "CONNECTED_PROPERTY_CHANGE"]);
/** Families whose real authorised and refused populations exist — the zero route never applies to them (ruling §5). */
export const REAL_POPULATION_FAMILIES = Object.freeze(["RESEARCH", "APPROVAL", "MERGE"]);
export const CLASSES = Object.freeze(["APPROVED_REAL_ACTION", "REFUSED_REAL_ATTEMPT", "CONFINED_CONTROL", "NO_REQUEST", "INVALID_OR_EXPIRED_APPROVAL"]);

/** The confined controls that reach each family's authorised branch — test names; counted apart, never as real. */
export const CONFINED_CONTROLS = Object.freeze({
  SPEND: ["EXPECTED · fail closed BEFORE money is committed", "AMEND · confined control reaches the authorised branch · SPEND"],
  EXPORT: ["AMEND · confined control reaches the authorised branch · EXPORT"],
  VERIFICATION: ["AMEND · confined control reaches the authorised branch · VERIFICATION"],
  PUBLISH: ["AMEND · confined control reaches the authorised branch · PUBLISH"],
  CONNECTED_PROPERTY_CHANGE: ["AMEND · confined control reaches the authorised branch · CONNECTED_PROPERTY_CHANGE"],
});

const readTrail = () => readFileSync(join(REPO, "audit-trail/events.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const isLive = (a, now) => !a.revoked && !(a.oneUse && a.consumed) && !(a.expiresAt && a.expiresAt <= now);

/** Direct authorise( call sites in production code naming a literal action — the ones the write-site census cannot see. */
export function directDecisionSites({ files = null, read = null } = {}) {
  const list = files ?? execFileSync("git", ["-C", REPO, "ls-files", "src", "bin", "subjects"], { encoding: "utf8" }).split("\n").filter((f) => /\.mjs$/.test(f) && f !== "src/governance/authorisation.mjs");
  const text = read ?? ((f) => readFileSync(join(REPO, f), "utf8"));
  const sites = [];
  for (const file of list) {
    const src = text(file).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
    for (const m of src.matchAll(/\bauthorise\(\s*\{[^}]*?action:\s*"([A-Z][A-Z0-9_]+)"/g)) sites.push({ file, action: m[1], line: src.slice(0, m.index).split("\n").length });
  }
  return sites;
}

/**
 * The census. Every input may be handed in, so a positive control can plant an approval, a trail event or a site and watch
 * the zero move; by default each is the real one.
 */
export function zeroPopulationCensus({ approvals = null, trail = null, writeSites = null, decisionSites = null, entryPoints = null, entryText = null, now = new Date().toISOString(), pinned = ACCEPTANCES.F04?.zeroApprovedFamilies ?? [] } = {}) {
  const reg = approvals ?? readApprovals();
  const events = trail ?? readTrail();
  const sitesW = writeSites ?? (() => { const c = authorisationCensus(); return [...c.entries, ...c.libraries].flatMap((e) => e.sites.flatMap((s) => s.names.map((n) => ({ file: e.file, action: n })))); })();
  const sitesD = decisionSites ?? directDecisionSites();
  const entryFamily = new Map(); // entry point → the families it acts in
  for (const s of [...sitesW, ...sitesD]) { const f = actionEntry(s.action)?.family; if (f) entryFamily.set(s.file, new Set([...(entryFamily.get(s.file) ?? []), f])); }
  /* A decision site inside a library (src/) acts for every production entry point that imports it — the paid gate decides
   * CALL_PAID_PROVIDER for bin/paid-provider-controls.mjs. Found 25 Sep: without this, that entry point's real attempt was
   * not attributed to SPEND and the family read 0 refusals. */
  const libSites = sitesD.filter((s) => s.file.startsWith("src/"));
  if (libSites.length) {
    const entries = entryPoints ?? execFileSync("git", ["-C", REPO, "ls-files", "bin", "subjects"], { encoding: "utf8" }).split("\n").filter((f) => /\.mjs$/.test(f));
    const text = entryText ?? ((f) => readFileSync(join(REPO, f), "utf8"));
    for (const ep of entries) {
      const src = text(ep);
      for (const s of libSites) if (src.includes(`/${s.file}"`) || src.includes(`"../${s.file}"`)) { const f = actionEntry(s.action)?.family; entryFamily.set(ep, new Set([...(entryFamily.get(ep) ?? []), f])); }
    }
  }
  const entryOf = (e) => (/^run:([^:]+\.mjs):/.exec(String(e.correlationId ?? "")) ?? [])[1] ?? null;

  const rows = ZERO_ROUTE_FAMILIES.map((family) => {
    const inFamily = (action) => actionEntry(action)?.family === family;
    const approvalRecords = [...reg.approvals.values()].filter((a) => inFamily(a.action));
    const approved = approvalRecords.filter((a) => isLive(a, now));
    const invalid = approvalRecords.filter((a) => !isLive(a, now));
    const decisions = events.filter((e) => e.eventType === "AUTHORISATION_DECISION" && inFamily(e.action));
    const scopeRefusals = events.filter((e) => e.eventType === "REFUSAL" && entryFamily.get(entryOf(e))?.has(family));
    const refused = [...decisions.filter((e) => e.outcome === "REFUSED"), ...scopeRefusals];
    const executions = events.filter((e) => e.eventType === "GOVERNED_WRITE" && inFamily(e.action) && e.metadata?.governedWritePhase === "COMMITTED");
    const allowedDecisions = decisions.filter((e) => e.outcome === "ALLOWED");
    const sites = [...new Set([...sitesW, ...sitesD].filter((s) => inFamily(s.action)).map((s) => `${s.file}#${s.action}`))];
    const realRequests = decisions.length + scopeRefusals.length;
    const by = {
      APPROVED_REAL_ACTION: approved.length,
      REFUSED_REAL_ATTEMPT: refused.length,
      CONFINED_CONTROL: (CONFINED_CONTROLS[family] ?? []).length,
      NO_REQUEST: realRequests === 0 && approved.length === 0 ? 1 : 0,
      INVALID_OR_EXPIRED_APPROVAL: invalid.length,
    };
    /* the real population reconciles: every real request is a refusal or an authorised decision; every authorised
     * execution rests on an approved action; every approval record is live or invalid. Controls are outside it. */
    const remainder = (realRequests - refused.length - allowedDecisions.length) + (approvalRecords.length - approved.length - invalid.length) + (executions.length > approved.length ? executions.length - approved.length : 0);
    const route = approved.length === 0 ? "ZERO_APPROVED" : "REAL_POPULATION_REQUIRED";
    return {
      family, registeredActions: Object.values(ACTIONS).filter((e) => e.family === family).length,
      productionActionSites: sites.length, sites, realRequests, approvedRequests: approved.length, refusedRealAttempts: refused.length,
      refusedByGate: { F04: decisions.filter((e) => e.outcome === "REFUSED").length, F02_SCOPE: scopeRefusals.length },
      approvalRecords: approvalRecords.length, authorisedExecutions: executions.length, confinedControls: by.CONFINED_CONTROL,
      by, remainder, route, reopen: pinned.includes(family) && route !== "ZERO_APPROVED" ? "REOPEN_F04" : null,
    };
  });
  const misapplied = REAL_POPULATION_FAMILIES.filter((f) => pinned.includes(f));
  return { rows, misapplied, reopen: rows.filter((r) => r.reopen).map((r) => r.family), remainder: rows.reduce((n, r) => n + r.remainder, 0) };
}

if (process.argv[1]?.endsWith("zero-population-census.mjs")) {
  const c = zeroPopulationCensus();
  if (process.argv.includes("--json")) console.log(JSON.stringify(c, null, 2));
  else {
    console.log("F04 · FIVE-FAMILY CENSUS (Amendment 1) — the approved real-action population, measured");
    for (const r of c.rows) console.log(`  ${r.family.padEnd(26)} sites ${r.productionActionSites} · real requests ${r.realRequests} · approved ${r.approvedRequests} · refused ${r.refusedRealAttempts} (F04 ${r.refusedByGate.F04} · F02 ${r.refusedByGate.F02_SCOPE}) · approvals ${r.approvalRecords} · executions ${r.authorisedExecutions} · controls ${r.confinedControls} · remainder ${r.remainder} · ${r.route}${r.reopen ? " · REOPEN_F04" : ""}`);
    console.log(`  misapplied to a real-population family: ${c.misapplied.length} · reopen required: ${c.reopen.length} · remainder ${c.remainder}`);
  }
  if (process.argv.includes("--check") && (c.remainder !== 0 || c.misapplied.length || c.reopen.length)) process.exit(1);
}
