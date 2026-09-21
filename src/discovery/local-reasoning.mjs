/**
 * 🔴 ROW 4 — LOCAL REASONING, RESEARCHED FROM PUBLIC SOURCES AND KEPT APART FROM LOCAL PHRASING.
 *
 * Row 4's EXPECTED clause asks that local phrasing AND reasoning be researched. Query rows show phrasing only: they carry
 * the words a person typed and where Search Console placed them, never why. Reasoning therefore comes from INDEPENDENT
 * PUBLIC EVIDENCE — an authority's own words about how the same goal is understood, constrained, prioritised or
 * expressed in a locality (owner ruling, 21 September 2026, `REASONING: reasoning-evidence-required`).
 *
 * ── WHAT THIS MODULE IS, AND WHAT IT IS NOT ────────────────────────────────
 *
 * It JUDGES stored reasoning records against the phrasing goals row 4 already builds. It never writes a record, never
 * reads a network, and never interprets a source: every stored proposition is the source's own words, read in a
 * browser, and a record that cannot show where its words came from is refused, not softened.
 *
 * It names no product, no client, no host and no country. A locality is whatever the phrasing population calls it.
 *
 * ── THE OUTCOMES — the owner's letters, used exactly as committed at _handoffs a732a07 ──
 *
 *   A  SAME WORDING · SAME REASON, POSITIVELY EVIDENCED     (finding nothing is K, never A)
 *   B  DIFFERENT WORDING · SAME REASON, POSITIVELY EVIDENCED
 *   C  DIFFERENT WORDING · DIFFERENT SUPPORTED REASON
 *   D  DIFFERENT WORDING · REASON UNKNOWN
 *   E  DIFFERENT REASON · NO SEPARATE URL JUSTIFIED          ┐ the URL axis, reported beside
 *   F  DIFFERENT REASON · SEPARATE USEFUL CONTENT JUSTIFIED  ┘ the group letter, never instead of it
 *   G  SOURCE UNAVAILABLE OR UNLAWFUL — a refusal by the source
 *   H  CROSS-TENANT EVIDENCE — INVALID, never UNKNOWN, never PASS
 *   I  CONFLICTING — two lawful sources disagree; never resolved by preferring one
 *   J  SAME WORDING · DIFFERENT SUPPORTED REASON
 *   K  SAME WORDING · REASON UNKNOWN
 *   L  WORDING VARIES, BUT NOT BY LOCALITY
 *   M  NOT_READ — the source answered, our tooling could not read it; never a finding about the source
 *
 * ── 🔴 COUNTRY IS A RESEARCH LENS, NEVER AN AUTOMATIC URL AXIS ─────────────
 *
 * A supported difference may justify different USEFUL CONTENT (F). It never produces a URL, a route or a candidate:
 * `separateUrl` is `NOT_RECOMMENDED` on every group this module returns, and a record that asks for anything else is
 * refused. Row 4's FAILURE limb (a) is measured on this engine's own construction, acceptance and recommendation
 * behaviour (owner ruling addendum 1); this module must never be the path that makes it MET.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { subjectRoots } from "../subject-roots.mjs";
import { partitionRowsByDeclaredHost } from "../tenancy/row-partition.mjs";

/** Where public-source readings live in an external root. Deliberately NOT `observations/`: those are the estate's own captures. */
export const RESEARCH_DIR = "research";
export const REASONING_BATCH_ID = "local-reasoning-2026-09-21";
export const REASONING_FILE = "records.jsonl";

/**
 * Read one reasoning batch from the declared external roots. 🔴 IT REFUSES RATHER THAN SHORTENS: a batch in no root, in
 * two roots, with no manifest, or whose bytes do not match the manifest's sha256 throws — an empty list would read as
 * "nothing was researched", which is the one answer this row may not guess.
 */
export function readReasoningBatch({ batchId = REASONING_BATCH_ID, env = process.env } = {}) {
  const found = subjectRoots(env).filter((r) => r.kind === "external").map((r) => join(r.path, RESEARCH_DIR, batchId)).filter((d) => existsSync(d));
  if (found.length === 0) throw new Error(`REASONING_BATCH_UNAVAILABLE: '${batchId}' is in no declared external root`);
  if (found.length > 1) throw new Error(`REASONING_BATCH_AMBIGUOUS: '${batchId}' is in ${found.length} roots at once: ${found.join(" and ")}`);
  const dir = found[0];
  let manifest;
  try { manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")); } catch (e) { throw new Error(`REASONING_BATCH_INVALID: manifest.json at ${dir} is not readable JSON: ${e.message}`); }
  const declared = (manifest.files ?? []).find((f) => f.name === REASONING_FILE);
  if (!declared) throw new Error(`REASONING_BATCH_INVALID: the manifest does not declare ${REASONING_FILE}`);
  const text = readFileSync(join(dir, REASONING_FILE), "utf8");
  const got = createHash("sha256").update(text, "utf8").digest("hex");
  if (got !== declared.sha256) throw new Error(`REASONING_BATCH_INVALID: ${REASONING_FILE} hashes ${got}; the manifest declares ${declared.sha256}`);
  const records = text.split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l));
  if (records.length !== manifest.recordCounts?.[REASONING_FILE]) throw new Error(`REASONING_BATCH_INVALID: ${records.length} records; the manifest declares ${manifest.recordCounts?.[REASONING_FILE]}`);
  return { batchId, locator: [RESEARCH_DIR, batchId, REASONING_FILE].join("/"), sha256: got, manifest, records };
}

/** The owner's outcome vocabulary. Letters are never renumbered or redefined. */
export const OUTCOMES = Object.freeze({
  A: "SAME WORDING · SAME REASON, POSITIVELY EVIDENCED",
  B: "DIFFERENT WORDING · SAME REASON, POSITIVELY EVIDENCED",
  C: "DIFFERENT WORDING · DIFFERENT SUPPORTED REASON",
  D: "DIFFERENT WORDING · REASON UNKNOWN",
  E: "DIFFERENT REASON · NO SEPARATE URL JUSTIFIED",
  F: "DIFFERENT REASON · SEPARATE USEFUL CONTENT JUSTIFIED",
  G: "SOURCE UNAVAILABLE OR UNLAWFUL",
  H: "CROSS-TENANT EVIDENCE",
  I: "CONFLICTING — two or more lawful sources disagree",
  J: "SAME WORDING · DIFFERENT SUPPORTED REASON",
  K: "SAME WORDING · REASON UNKNOWN",
  L: "WORDING VARIES, BUT NOT BY LOCALITY",
  M: "NOT_READ — the source responded but our tooling could not read it",
});

/** The letters a GROUP ends in. E and F are the URL axis, reported beside the group letter. */
export const GROUP_OUTCOMES = Object.freeze(["A", "B", "C", "D", "G", "H", "I", "J", "K", "L", "M"]);

/** The letters that rest on SUPPORTED reasoning in every locality — the only ones that can evidence row 4. */
export const SUPPORTED_OUTCOMES = Object.freeze(["A", "B", "C", "J"]);

/** How a source read ended. A hang is NOT_READ (M); a refusal is REFUSED (G). They are never the same. */
export const READ_STATES = Object.freeze(["READ", "NOT_READ", "REFUSED"]);

/** A source's standing. Only a primary source can stand in a record; a secondary one may only LOCATE a primary. */
export const SOURCE_TIERS = Object.freeze(["PRIMARY_OFFICIAL"]);

/** How a stored proposition was read. WebFetch output is never a citation (owner law, §5B). */
export const READ_METHODS = Object.freeze(["BROWSER_RENDERED_TEXT"]);

export const EVIDENCE_CLASSES = Object.freeze(["REAL", "FIXTURE"]);

export const USEFUL_CONTENT = Object.freeze(["SUPPORTED", "NOT_SUPPORTED", "UNKNOWN"]);

/** The only separate-URL value a record may carry. A difference justifies content, never automatically a URL. */
export const SEPARATE_URL = "NOT_RECOMMENDED";

/** The method a stored public-source reading carries. */
export const READ_METHOD = "public.source.read";

/** Hosts and methods that are the phrasing population itself — they can never be a source of reasoning. */
const PHRASING_METHOD = /^gsc\./;

export const REFUSALS = Object.freeze({
  MISSING_FIELD: "MISSING_FIELD",
  MALFORMED_FIELD: "MALFORMED_FIELD",
  NO_SOURCE: "NO_SOURCE",
  NO_PROVENANCE: "NO_PROVENANCE",
  WORDING_AS_REASON: "WORDING_AS_REASON",
  URL_REQUESTED: "URL_REQUESTED",
});

const isNonEmpty = (v) => typeof v === "string" && v.trim() !== "";
const goalKeyOf = (wordings) => [...wordings].sort().join(" | ");

/**
 * Refuse a reasoning record that cannot stand. Returns [] for a lawful record, else one refusal per defect.
 * 🔴 NO DEFAULTS: an absent field is a refusal, never a quieter reading.
 */
export function reasoningRecordErrors(record, { wordingsSeen = new Set() } = {}) {
  const errs = [];
  const refuse = (code, why) => errs.push({ code, why });
  if (record?.record_type !== "observation" || record?.method !== READ_METHOD) refuse(REFUSALS.MALFORMED_FIELD, `a reasoning record is an observation with method ${READ_METHOD}`);
  if (!isNonEmpty(record?.observation_id)) refuse(REFUSALS.MISSING_FIELD, "observation_id is required");
  const v = record?.value;
  if (!v || typeof v !== "object") { refuse(REFUSALS.MISSING_FIELD, "value is required"); return errs; }
  if (!Array.isArray(v.goal?.wordings) || v.goal.wordings.length === 0 || !v.goal.wordings.every(isNonEmpty)) refuse(REFUSALS.MISSING_FIELD, "goal.wordings is required");
  if (!isNonEmpty(v.locality)) refuse(REFUSALS.MISSING_FIELD, "locality is required");
  if (!isNonEmpty(v.tenantId)) refuse(REFUSALS.MISSING_FIELD, "tenantId is required — a tenant is declared, never assumed");
  if (!EVIDENCE_CLASSES.includes(v.evidenceClass)) refuse(REFUSALS.MISSING_FIELD, `evidenceClass must be one of ${EVIDENCE_CLASSES.join(", ")}`);
  if (v.separateUrl !== SEPARATE_URL) refuse(REFUSALS.URL_REQUESTED, `separateUrl is "${v.separateUrl}" — country is a research lens; a record may only carry ${SEPARATE_URL}`);
  if (!USEFUL_CONTENT.includes(v.usefulContent?.difference)) refuse(REFUSALS.MISSING_FIELD, `usefulContent.difference must be one of ${USEFUL_CONTENT.join(", ")}`);

  const r = v.reasoning;
  if (!r || typeof r !== "object") { refuse(REFUSALS.MISSING_FIELD, "reasoning is required"); return errs; }
  if (!READ_STATES.includes(r.readState)) refuse(REFUSALS.MISSING_FIELD, `reasoning.readState must be one of ${READ_STATES.join(", ")}`);

  const s = r.source;
  if (!s || !isNonEmpty(s.url)) { refuse(REFUSALS.NO_SOURCE, "reasoning.source.url is required — a reason with no source is not evidence"); return errs; }
  if (PHRASING_METHOD.test(s.method ?? "") || /search\.google\.com\/search-console/.test(s.url)) {
    refuse(REFUSALS.WORDING_AS_REASON, "the source is the phrasing population itself — query wording is never its own reasoning source");
  }
  if (r.readState !== "READ") return errs; // an unread or refused source carries no proposition, by design

  for (const k of ["authority", "retrievedOn", "sourceDate"]) if (!isNonEmpty(s[k])) refuse(REFUSALS.NO_PROVENANCE, `reasoning.source.${k} is required ("not stated" is a value; absence is not)`);
  if (!SOURCE_TIERS.includes(s.tier)) refuse(REFUSALS.NO_PROVENANCE, `reasoning.source.tier must be one of ${SOURCE_TIERS.join(", ")} — a secondary source may locate a primary, never replace it`);
  if (!READ_METHODS.includes(s.readMethod)) refuse(REFUSALS.NO_PROVENANCE, `reasoning.source.readMethod must be one of ${READ_METHODS.join(", ")}`);
  if (!Array.isArray(r.propositions) || r.propositions.length === 0 || !r.propositions.every((p) => isNonEmpty(p?.text) && isNonEmpty(p?.url))) {
    refuse(REFUSALS.NO_PROVENANCE, "reasoning.propositions must hold the source's own words, each with the URL it was read at");
  }
  for (const p of r.propositions ?? []) {
    if (isNonEmpty(p?.text) && wordingsSeen.has(p.text.trim().toLowerCase())) refuse(REFUSALS.WORDING_AS_REASON, `proposition "${p.text}" is a query wording — wording is never its own reason`);
  }
  if (!r.finding || !isNonEmpty(r.finding.claim) || typeof r.finding.holds !== "boolean") refuse(REFUSALS.MISSING_FIELD, "reasoning.finding needs a claim and a boolean holds");
  if (!isNonEmpty(r.derivation)) refuse(REFUSALS.MISSING_FIELD, "reasoning.derivation is required — how the finding follows from the propositions");
  if (!isNonEmpty(r.explains)) refuse(REFUSALS.MISSING_FIELD, "reasoning.explains is required — what the finding does and does not explain");
  return errs;
}

/**
 * Resolve each goal to ONE declared tenant through the query×page pull: the landing page of every row for the goal's
 * wordings is resolved by the owner's SITE_ORIGIN declaration for that exact origin. Never from a name, a path or content.
 * Returns { state: RESOLVED|UNDECLARED|AMBIGUOUS|UNMAPPED, tenantId, origins }.
 */
export function goalTenancy({ goals, queryPageRows, resolve }) {
  if (typeof resolve !== "function") throw new TypeError("goalTenancy: a tenant resolver is required — tenancy is declared, never assumed");
  const byQuery = new Map();
  for (const r of queryPageRows ?? []) {
    if (!byQuery.has(r.query)) byQuery.set(r.query, []);
    byQuery.get(r.query).push(r);
  }
  const out = new Map();
  for (const g of goals) {
    const rows = g.wordings.flatMap((w) => byQuery.get(w.original) ?? []);
    const unmapped = g.wordings.some((w) => !(byQuery.get(w.original) ?? []).length);
    /* 🔴 THE SHARED TENANCY LAYER DECIDES, NOT THIS MODULE: the same partition row 6 uses, resolving each stored host
     * through the owner's declared SITE_ORIGIN attachments. Only a RESOLVED declaration attributes. */
    const part = partitionRowsByDeclaredHost({ rows, resolve });
    const tenants = Object.keys(part.byTenant);
    let state;
    if (unmapped) state = "UNMAPPED";
    else if (part.rejected.length || part.unreadable.length) state = "UNDECLARED";
    else if (tenants.length !== 1) state = "AMBIGUOUS";
    else state = "RESOLVED";
    out.set(g.goal, { state, tenantId: state === "RESOLVED" ? tenants[0] : null, hosts: part.hosts.map((h) => h.host).sort() });
  }
  return out;
}

/** A DIFFERENT_WORDING group is locality-attributable only when no locality uses more than one of its wordings. */
export function wordingsByLocality(goal) {
  const byLoc = new Map();
  for (const w of goal.wordings) for (const c of w.countries) {
    if (!byLoc.has(c.country)) byLoc.set(c.country, new Set());
    byLoc.get(c.country).add(w.original);
  }
  return byLoc;
}

/**
 * Owner ruling (21 Sep 2026, G13 decision, clause 4): singular/plural ALONE is not locality-attributable on the
 * present evidence. A group whose every link is a row-3 VARIANT of the plural form is L.
 */
const pluralOnly = (goal) => (goal.links ?? []).length > 0 && goal.links.every((l) => l.relation === "VARIANT" && l.form === "plural");

/**
 * Judge every goal against the stored reasoning records. Deterministic; reads nothing.
 *
 * Each group ends in exactly ONE group letter. Each locality member ends in exactly one member state:
 * EVALUATED (a READ, lawful record) · UNKNOWN (no record, or unread) · NOT_APPLICABLE (the group is L) · INVALID
 * (refused, cross-tenant or conflicting).
 */
export function judgeReasoning({ goals, records, tenancy }) {
  const wordingsSeen = new Set(goals.flatMap((g) => g.wordings.map((w) => w.original.toLowerCase())));
  const refused = [];
  const lawful = [];
  for (const rec of records ?? []) {
    const errs = reasoningRecordErrors(rec, { wordingsSeen });
    if (errs.length) refused.push({ observation_id: rec?.observation_id ?? null, errors: errs, goalKey: Array.isArray(rec?.value?.goal?.wordings) ? goalKeyOf(rec.value.goal.wordings) : null, locality: rec?.value?.locality ?? null });
    else lawful.push(rec);
  }
  const byGoalKey = new Map();
  for (const rec of lawful) {
    const k = goalKeyOf(rec.value.goal.wordings);
    if (!byGoalKey.has(k)) byGoalKey.set(k, []);
    byGoalKey.get(k).push(rec);
  }
  const goalKeys = new Set(goals.map((g) => goalKeyOf(g.wordings.map((w) => w.original))));
  const orphans = [...byGoalKey.keys()].filter((k) => !goalKeys.has(k));

  const groups = goals.map((g) => {
    const key = goalKeyOf(g.wordings.map((w) => w.original));
    const recs = byGoalKey.get(key) ?? [];
    const refusedHere = refused.filter((x) => x.goalKey === key);
    const t = tenancy.get(g.goal) ?? { state: "UNMAPPED", tenantId: null };
    const byLoc = wordingsByLocality(g);
    const members = [...byLoc.keys()].sort().map((locality) => {
      const rows = g.wordings.flatMap((w) => w.countries.filter((c) => c.country === locality));
      const mine = recs.filter((r) => r.value.locality === locality);
      return { locality, wordings: [...byLoc.get(locality)].sort(), rows: rows.length, impressions: rows.reduce((n, c) => n + (c.impressions || 0), 0), records: mine, refused: refusedHere.filter((x) => x.locality === locality) };
    });

    const verdict = (letter, reasonCode, memberState) => ({
      goal: g.goal,
      kind: g.kind,
      wordings: g.wordings.map((w) => w.original),
      tenancy: t,
      outcome: letter,
      outcomeMeaning: OUTCOMES[letter],
      reasonCode,
      members: members.map((m) => {
        const read = m.records.filter((r) => r.value.reasoning.readState === "READ");
        return {
          locality: m.locality,
          wordings: m.wordings,
          rows: m.rows,
          impressions: m.impressions,
          phrasing: "RECORDED",
          reasoning: read.length ? read.map((r) => ({ claim: r.value.reasoning.finding.claim, holds: r.value.reasoning.finding.holds, observation_id: r.observation_id })) : null,
          readStates: m.records.map((r) => r.value.reasoning.readState),
          state: memberState(m, read),
        };
      }),
      urlAxis: urlAxisOf(letter, recs),
      separateUrl: SEPARATE_URL,
    });

    // 1 · tenancy — a group whose own scope is not declared cannot be judged; cross-tenant evidence is INVALID
    if (t.state !== "RESOLVED") return verdict("H", `GOAL_TENANCY_${t.state}`, () => "INVALID");
    if (recs.some((r) => r.value.tenantId !== t.tenantId)) return verdict("H", "INVALID_CROSS_TENANT", () => "INVALID");

    // 2 · wording that varies within a locality is not local phrasing
    if (g.kind === "DIFFERENT_WORDING" && (members.some((m) => m.wordings.length > 1) || pluralOnly(g))) {
      return verdict("L", members.some((m) => m.wordings.length > 1) ? "WORDING_VARIES_WITHIN_A_LOCALITY" : "PLURAL_ONLY_NOT_LOCALITY_ATTRIBUTABLE", () => "NOT_APPLICABLE");
    }

    // 3 · a record that was refused stands for nothing, and its member cannot evaluate
    const memberState = (m, read) => {
      if (m.refused.length) return "INVALID";
      if (read.length) return "EVALUATED";
      return "UNKNOWN";
    };

    // 4 · conflicting lawful readings within one locality — never a silent pick
    const conflicted = members.filter((m) => {
      const read = m.records.filter((r) => r.value.reasoning.readState === "READ");
      return new Set(read.map((r) => `${r.value.reasoning.finding.claim}\u0000${r.value.reasoning.finding.holds}`)).size > 1;
    });
    if (conflicted.length) return verdict("I", "CONFLICTING_SOURCES", (m) => (conflicted.includes(m) ? "INVALID" : memberState(m, m.records.filter((r) => r.value.reasoning.readState === "READ"))));

    // 5 · every locality must carry a READ, lawful record — else the group is not researched
    const readOf = (m) => m.records.filter((r) => r.value.reasoning.readState === "READ");
    const unresearched = members.filter((m) => readOf(m).length === 0 || m.refused.length);
    if (unresearched.length) {
      /* 🔴 G and M are claims about EVERY unresearched locality, never about one of them. A single refusal among
       * localities nobody tried is not "the source refused"; a single hang is not "the tooling failed here". */
      const all = (state) => unresearched.every((m) => m.records.some((r) => r.value.reasoning.readState === state));
      if (all("REFUSED")) return verdict("G", "SOURCE_REFUSED", memberState);
      if (all("NOT_READ")) return verdict("M", "SOURCE_NOT_READ", memberState);
      return verdict(g.kind === "SAME_WORDING" ? "K" : "D", "REASONING_NOT_EVIDENCED_IN_EVERY_LOCALITY", memberState);
    }

    // 6 · every locality is evidenced — same reason, or different
    const findings = new Set(members.map((m) => { const f = readOf(m)[0].value.reasoning.finding; return `${f.claim}\u0000${f.holds}`; }));
    if (g.kind === "SAME_WORDING") return verdict(findings.size === 1 ? "A" : "J", findings.size === 1 ? "SAME_REASON_EVIDENCED" : "DIFFERENT_REASON_EVIDENCED", memberState);
    return verdict(findings.size === 1 ? "B" : "C", findings.size === 1 ? "SAME_REASON_EVIDENCED" : "DIFFERENT_REASON_EVIDENCED", memberState);
  });

  return { groups, refused, orphans };
}

/** E or F — the URL axis. Only a supported DIFFERENT reason reaches it; a URL is never recommended either way. */
function urlAxisOf(letter, recs) {
  if (letter !== "C" && letter !== "J") return null;
  const supported = recs.length > 0 && recs.every((r) => r.value.usefulContent.difference === "SUPPORTED");
  return supported ? "F" : "E";
}

/**
 * 🔴 ROW 4's VERDICT OVER A JUDGED POPULATION.
 *
 * VERIFIED-PASS needs, over a REAL non-empty population: at least one group whose every locality carries a READ,
 * primary-source reasoning record (a SUPPORTED outcome), no cross-tenant or refused record anywhere, and limb (a)
 * NOT MET across construction, acceptance and recommendation. Coverage is EXISTENCE: the frozen EVIDENCE clause names
 * "the local-wording records and their sources" and no quantifier, and the owner's standing instruction is not to
 * require every group to have a known answer. Every other group stays visible as it is — UNKNOWN is never evidence.
 */
export function row4Verdict({ judged, limbA }) {
  const reasons = [];
  const complete = judged.groups.filter((g) => SUPPORTED_OUTCOMES.includes(g.outcome) && g.members.every((m) => m.state === "EVALUATED" && (m.reasoning ?? []).length > 0));
  /* 🔴 A FIXTURE IS A CONTROL, NEVER EVIDENCE. A group counts only when every record it rests on is REAL; an untagged
   * group (withEvidenceClasses was never applied) counts as nothing, not as real. */
  const realOnly = complete.filter((g) => Array.isArray(g._evidenceClasses) && g._evidenceClasses.length > 0 && g._evidenceClasses.every((c) => c === "REAL"));
  if (judged.refused.length) reasons.push({ code: "REFUSED_RECORDS_PRESENT", why: `${judged.refused.length} reasoning record(s) were refused — a refused record is never quietly dropped` });
  if (judged.orphans.length) reasons.push({ code: "ORPHAN_RECORDS", why: `records name goal(s) the phrasing population does not hold: ${judged.orphans.join("; ")}` });
  if (judged.groups.some((g) => g.outcome === "H")) reasons.push({ code: "INVALID_TENANCY", why: "a group's evidence is cross-tenant or its scope is undeclared" });
  if (!limbA || limbA.construction !== 0 || limbA.acceptance !== 0 || limbA.recommendation !== 0) reasons.push({ code: "LIMB_A_NOT_PROVED_NOT_MET", why: "limb (a) must be measured 0 across construction, acceptance and recommendation" });
  if (realOnly.length === 0) reasons.push({ code: "NO_COMPLETE_REAL_GROUP", why: "no group has READ, primary-source reasoning evidence in every locality from REAL records" });
  return { verdict: reasons.length ? "NOT_PASS" : "PASS", reasons, completeGroups: realOnly.map((g) => g.goal) };
}

/** Tag each judged group with the evidence classes of the records it rests on (REAL or FIXTURE), counted, never mixed. */
export function withEvidenceClasses(judged, records) {
  const byId = new Map((records ?? []).map((r) => [r.observation_id, r.value?.evidenceClass]));
  for (const g of judged.groups) {
    const ids = g.members.flatMap((m) => (m.reasoning ?? []).map((x) => x.observation_id));
    Object.defineProperty(g, "_evidenceClasses", { value: ids.map((id) => byId.get(id)), enumerable: false });
  }
  return judged;
}

/** Every group in exactly one letter, every member in exactly one state — with the remainder. */
export function tallyReasoning(judged) {
  const letters = Object.fromEntries(GROUP_OUTCOMES.map((l) => [l, 0]));
  const members = { EVALUATED: 0, UNKNOWN: 0, NOT_APPLICABLE: 0, INVALID: 0 };
  let memberTotal = 0;
  for (const g of judged.groups) {
    letters[g.outcome] += 1;
    for (const m of g.members) { members[m.state] += 1; memberTotal += 1; }
  }
  const urlAxis = { E: judged.groups.filter((g) => g.urlAxis === "E").length, F: judged.groups.filter((g) => g.urlAxis === "F").length };
  const groupSum = Object.values(letters).reduce((a, b) => a + b, 0);
  const memberSum = Object.values(members).reduce((a, b) => a + b, 0);
  return { groups: judged.groups.length, letters, groupRemainder: judged.groups.length - groupSum, members, memberTotal, memberRemainder: memberTotal - memberSum, urlAxis };
}
