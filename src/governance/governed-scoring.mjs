/**
 * 🔴 F10 · C4 · THE GOVERNED SCORING ROUTE (owner ruling 1.2, _handoffs 3adb716 — D-F10-SCORER-ROUTE resolved).
 *
 * `scoreClassification` (src/heldout/lifecycle.mjs) is a MIXED writer: it records on the audit trail AND reads sealed files.
 * It is not an audit-store-only primitive and no exception of any kind is made for it. It is reached ONLY through the
 * governed mutation boundary (./governed-write.mjs executeGovernedWrite), whose arguments this module builds:
 *
 *   1 · the named actor is AUTHORISED by F04, before anything is inspected;
 *   2 · PREVALIDATION, before any attempt: a linked grant; the scorer's files unchanged since its freeze; and every sealed
 *       store the set and its key live in LOCATED — a required store that cannot be located refuses HERE, before any claim,
 *       so the one permitted run is NOT spent (ruling S: a missing store fails closed with its name and reason);
 *   3 · a durable ATTEMPTED record;
 *   4 · the mutation: the set's items read only through the lifecycle's governed readers; the frozen mechanism's output for
 *       every item; then `scoreClassification`, which CLAIMS the (set · mechanism · scorer · key) combination on the trail
 *       before any comparison, reads both sides through the recorded readers, and releases counts only; then the frozen
 *       scoring rule's verdict over those counts; then ONE release record, appended;
 *   5 · verification by inspection, and COMMITTED.
 *
 * ONE VALID RUN: the idempotency key is derived from the combination, so a retry of a committed run is ALREADY_COMMITTED and
 * runs nothing; a re-invocation after a crash reaches the claim and is refused (SCORING_ALREADY_CLAIMED); a crash between
 * ATTEMPTED and its terminal event stays EXPOSED (governed-write.mjs incompleteSagas).
 *
 * A MISSING mechanism output is passed through as missing, and the run is INVALID (ruling 1.3): it is never filled in.
 * Generic: no subject, client, host, tenant or class literal. The release carries counts, ids, hashes and codes — never an
 * item, a label, an output or a store location.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

import { deriveIdempotencyKey } from "./governed-write.mjs";
import { storeFiles } from "./sealed-store-roots.mjs";
import { scoreClassification, readHeldOutItem, readHeldOutDerivation, mechanismHash } from "../heldout/lifecycle.mjs";
import { classificationVerdict } from "../heldout/classification-rule.mjs";

export const SCORER_ID = "human-question-scorer-v1";
/** The files whose bytes ARE the scorer: the governed route, the aggregate scorer it calls, the rule and the rule's parameters. */
export const SCORER_FILES = Object.freeze(["src/governance/governed-scoring.mjs", "src/heldout/lifecycle.mjs", "src/heldout/classification-rule.mjs", "config/human-questions.mjs"]);
/** The release store: its own top-level directory, never under runs/ (a store under runs/ becomes another feature's input). */
export const RELEASE_STORE = "evaluation-releases/classification-releases.jsonl";
export const SCORING_ACTION = "RECORD_HELDOUT_EVALUATION";
const PROFILE = "VALIDATED_APPEND";
const TARGET_CLASS = "RUN_EVIDENCE";

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
/** The combination scoreClassification claims — the same derivation, so the idempotency key and the claim name one run. */
export const combinationOf = (r) => sha256([r.sealedSetId, r.mechanismHash, r.scorerHash, r.keyCommitment].join("\n"));

/** A version hash over files read from `repo`, with CRLF normalised to LF, so a checkout's line endings cannot move it. */
export function versionHash(repo, files, read = (p) => readFileSync(p)) {
  return mechanismHash(Object.fromEntries(files.map((f) => [f, Buffer.from(read(join(repo, f)).toString("utf8").replace(/\r\n/g, "\n"), "utf8")])));
}

/**
 * Build the boundary's arguments for ONE scoring run.
 *   repo             the engine root (the release store and the scorer's files are read from it)
 *   permission       the write-law result, with actorRef (F04 decides on it)
 *   audit            the governed audit context (the production trail, or the confined store in a test context)
 *   grant            an ALLOWED linked grant from requestHeldOutAccess
 *   registry         the evidence-role registry
 *   stores           { roots: { name: dir|null }, codes: { name: code } } — resolveSealedStoreRoots()
 *   currentMechanismHash   the mechanism's hash over its files NOW
 *   currentScorerHash      the scorer's hash over its files NOW
 *   outputsFor       (itemIds) → Map itemId → { classes } — the frozen mechanism, run inside the boundary
 *   protocol, rule   the frozen protocol and scoring rule
 *   occurredAt       the run's declared instant
 *   role             the grant's role; only "evaluator" may score
 */
export function governedScoring({ repo, permission, audit, grant, registry, stores, currentMechanismHash, currentScorerHash, outputsFor, protocol, rule, occurredAt, derivers = {}, role = "evaluator", releaseStore = RELEASE_STORE, trackedFiles = null }) {
  const req = grant?.request ?? {};
  const combination = combinationOf(req);
  const key = deriveIdempotencyKey({ profile: PROFILE, targetClass: TARGET_CLASS, repoRelativeTarget: releaseStore, occurrenceFingerprint: combination });
  const releasePath = join(repo, releaseStore);
  const entryOf = (id) => (registry ?? []).find((e) => e?.id === id);
  const located = Object.fromEntries(Object.entries(stores?.roots ?? {}).filter(([, d]) => d));
  const roots = { engine: repo, ...located };
  const filesOf = (r) => (r === "engine" ? (typeof trackedFiles === "function" ? trackedFiles() : []) : located[r] ? storeFiles(located[r]) : []);
  let last = null;

  const releases = () => (existsSync(releasePath) ? readFileSync(releasePath, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
  const adapter = {
    profile: PROFILE,
    describeTarget: () => ({ targetClass: TARGET_CLASS, repoRelativeTarget: releaseStore }),
    inspect: (k) => {
      const hit = releases().filter((r) => r.governedWriteKey === k);
      return hit.length === 0 ? { state: "ABSENT" } : hit.length === 1 ? { state: "COMMITTED" } : { state: "CONFLICTING", fields: "DUPLICATE_RELEASE" };
    },
    prevalidate: () => {
      const faults = [];
      if (!grant?.allowed || typeof req.keySetId !== "string" || req.keySetId === "INVALID") faults.push({ code: "NO_LINKED_GRANT" });
      if (role !== "evaluator" || (req.role ?? "evaluator") !== "evaluator") faults.push({ code: "ROLE_NOT_EVALUATOR" });
      if (typeof currentScorerHash !== "string" || currentScorerHash !== req.scorerHash) faults.push({ code: "SCORER_CHANGED_SINCE_FREEZE" });
      if (typeof outputsFor !== "function") faults.push({ code: "MECHANISM_OUTPUTS_UNAVAILABLE" });
      for (const id of [req.sealedSetId, req.keySetId]) {
        const r = entryOf(id)?.resource ?? {};
        if (r.derivation || r.root === "engine" || typeof r.root !== "string") continue;
        if (!located[r.root]) faults.push({ code: "SEALED_STORE_REQUIRED_BUT_UNLOCATED", why: `${r.root}:${stores?.codes?.[r.root] ?? "SEALED_STORE_UNDECLARED"}` });
      }
      return faults;
    },
    commit: () => {
      /* The set's items, through the lifecycle's governed readers ONLY — each read recorded before its value exists. */
      const setEntry = entryOf(req.sealedSetId);
      let items;
      if (setEntry?.resource?.derivation) items = readHeldOutDerivation({ audit, grant, currentMechanismHash, registry, derivers });
      else {
        const pre = (setEntry?.resource?.pathPrefixes ?? []).map((p) => String(p).replace(/\\/g, "/").replace(/\/?$/, "/"));
        const base = roots[setEntry?.resource?.root];
        const files = filesOf(setEntry?.resource?.root).filter((p) => pre.some((x) => p.startsWith(x)));
        items = [...new Set(files.flatMap((p) => String(readHeldOutItem({ audit, grant, currentMechanismHash, registry, root: setEntry.resource.root, base, path: p, foreignRoots: located })).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)))];
      }
      const outputs = outputsFor(items);
      const scored = scoreClassification({ audit, grant, currentMechanismHash, registry, roots, filesOf, derivers, outputs, protocol, foreignRoots: located });
      const verdict = classificationVerdict({ tables: scored.tables, declared: scored.declared, excluded: scored.excluded }, { rule, protocol });
      const record = {
        governedWriteKey: key, combination, claimEventId: scored.claimEventId, grantEventId: scored.grantEventId,
        sealedSetId: req.sealedSetId, keySetId: req.keySetId, mechanismId: req.mechanismId, mechanismHash: req.mechanismHash, scorerId: req.scorerId, scorerHash: req.scorerHash,
        declared: scored.declared, denominator: scored.denominator, excluded: { ...scored.excluded },
        tables: Object.fromEntries(Object.entries(scored.tables).map(([c, t]) => [c, { ...t }])),
        evidenceState: scored.evidenceState, untouched: scored.untouched,
        verdict: { result: verdict.result, reason: verdict.reason ?? null, denominator: verdict.denominator ?? null, assessable: verdict.assessable ?? null, classes: verdict.classes ? Object.fromEntries(Object.entries(verdict.classes).map(([c, v]) => [c, { ...v }])) : null },
        actor: String(permission?.actorRef ?? "UNNAMED"), role, occurredAt, softwareVersion: audit.softwareVersion,
      };
      /* One release per key, checked against the records already present — never a second copy of the same run. */
      if (releases().some((r) => r.governedWriteKey === key)) throw Object.assign(new Error("a release for this run already exists"), { code: "RELEASE_ALREADY_PRESENT" });
      mkdirSync(dirname(releasePath), { recursive: true });
      appendFileSync(releasePath, `${JSON.stringify(record)}\n`);
      last = record;
    },
    verify: (k) => (adapter.inspect(k).state === "COMMITTED" ? [] : [{ code: "RELEASE_ABSENT" }]),
  };
  const action = { name: SCORING_ACTION, scopeType: "GLOBAL_PRODUCT", occurredAt, occurrenceFingerprint: combination, evidenceRefs: [] };
  return Object.freeze({ permission, audit, adapter, action, idempotencyKey: key, combination, release: () => last ?? releases().find((r) => r.governedWriteKey === key) ?? null });
}
