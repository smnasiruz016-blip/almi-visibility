/**
 * 🔴 F10 · ONE SABOTAGE PER REQUIRED FIRING (command _handoffs 991eb9e §4 C2) AND PER CLAUSE LIMB OF THE FROZEN ACCEPTANCE (504dbb9).
 *
 *   node test/helpers/f10-sabotage.mjs [--only=F10-S1,…] [--out=<file>]
 *
 * Each sabotage removes or bends ONE branch (an anchor that occurs exactly once), proves the bytes changed (LANDED), runs its
 * NAMED test, and requires it RED for the INTENDED reason — an assertion message of that test, never a test name; then restores
 * the file byte-for-byte. The shared harness (f08-sabotage.mjs) fails a sabotage that does not land or whose named test never
 * ran, and never targets the production audit trail.
 *
 *   REQUIRED FIRINGS   cross-tenant access S1 S2 S3 · missing store S4 S5 · wrong key S6 · missing output S7 · explicit negative
 *                      S8 · duplicate scoring S9 · retry and crash S10 · census omission S11 · payload leakage S12 · D below 80 S13
 *   FURTHER LIMBS      untraceable output S14 · the neutrality control S15 · changed source S16 · synthetic config outside a
 *                      test context S17 · a dropped exclusion rule S18 · retired set not applied S19 · the C7 reopen trigger S20 ·
 *                      a scorer changed since freeze S21 · an unassessable class assessed S22 · one assessable class passes S23
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f10-human-question-discovery.test.mjs";
const PART = "src/discovery/search-console-partition.mjs";
const POP = "src/discovery/human-question-population.mjs";
const MECH = "src/discovery/human-questions.mjs";
const ROUTE = "src/governance/governed-scoring.mjs";
const LIFE = "src/heldout/lifecycle.mjs";
const RULE = "src/heldout/classification-rule.mjs";
const STORES = "src/governance/sealed-store-roots.mjs";
const FIX = "src/governance/synthetic-sealed-fixture.mjs";
const CENSUS = "tools/scorer-caller-census.mjs";
const HQC = "tools/human-question-census.mjs";
const N = {
  scope: "F10 · C1 · the shared store is never read whole",
  planted: "F10 · C1 · a planted cross-tenant stand-in",
  families: "F10 · C1 · each owner-authorised exclusion family",
  changed: "F10 · C1 · a changed, re-methoded or missing source observation",
  untrace: "F10 · C2 · an untraceable item",
  rule: "F10 · C6 · the rule's firing controls",
  prodCensus: "F10 · C3 · the PRODUCTION census over an isolated synthetic store",
  fixture: "F10 · C3 · a synthetic configuration is refused outside",
  happy: "F10 · C4 · one synthetic run through the governed route",
  missingStore: "F10 · C4 · a required store that cannot be located",
  wrongKey: "F10 · C4 · a wrong key yields no result",
  oneRun: "F10 · C4 · exactly ONE valid run per combination",
  crash: "F10 · C4 · a crash after the claim",
  missingOut: "F10 · C5 · a MISSING output INVALIDATES the run",
  negative: "F10 · C5 · an EXPLICIT, VALID negative",
  callers: "F10 · C4 · the caller census finds every production call",
  c7: "F10 · C7 · REAL · no tracked store carries a sequence field",
  neutral: "F10 · C8 · the files F10 adds or changes",
};

export function f10Sabotages() {
  return [
    { id: "F10-S1", what: "cross-tenant: a decision made for one tenant opens another tenant's partition", file: PART, test: T, named: N.scope,
      from: "  if (decision.source.resourceRefDigest !== refDigest(\"REQUESTED_TENANT\", tenantId)) {", to: "  if (false) {",
      expect: /a decision for one tenant opened another tenant's partition/ },
    { id: "F10-S2", what: "cross-tenant: the reader returns every tenant's partition, not the requested one", file: PART, test: T, named: N.planted,
      from: "  const mine = new Set(p.partitions.get(tenantId) ?? []);", to: "  const mine = new Set([...p.partitions.values()].flat());",
      expect: /a planted row of another tenant reached the requesting tenant/ },
    { id: "F10-S3", what: "whole store: a read for no tenant is not refused", file: PART, test: T, named: N.scope,
      from: "  if (typeof tenantId !== \"string\" || tenantId === \"\") throw new SearchConsolePartitionRefused(\"NO_TENANT_REQUESTED\"", to: "  if (false) throw new SearchConsolePartitionRefused(\"NO_TENANT_REQUESTED\"",
      expect: /a read for no tenant was not refused/ },
    { id: "F10-S4", what: "missing store: the route no longer refuses an unlocated required store before the claim", file: ROUTE, test: T, named: N.missingStore,
      from: "        if (!located[r.root]) faults.push(", to: "        if (false) faults.push(",
      expect: /a missing store was not refused by name/ },
    { id: "F10-S5", what: "missing store: the census reports a required unlocated store but does not fail it", file: STORES, test: T, named: N.prodCensus,
      from: "fails: requiredBy > 0 && !located });", to: "fails: false });",
      expect: /a required but unlocated store did not fail the census/ },
    { id: "F10-S6", what: "wrong key: a key changed after the grant is scored", file: LIFE, test: T, named: N.wrongKey,
      from: "  if (keyCommitment(keyBytes) !== req.keyCommitment) invalid(\"KEY_CHANGED_SINCE_GRANT\");", to: "  // sabotaged: the key's commitment is not re-checked",
      expect: /a changed key yielded a result/ },
    { id: "F10-S7", what: "missing output counted as an ordinary false negative (the draft-v2 E5 error)", test: T, named: N.missingOut,
      edits: [
        { file: LIFE, from: "  if (items.some((i) => !outputs.has(i))) invalid(\"INPUT_MISSING\");", to: "  // sabotaged: a missing output is not refused" },
        { file: LIFE, from: "    const said = new Set(outputs.get(i).classes);", to: "    const said = new Set(outputs.get(i)?.classes ?? []);" },
      ],
      expect: /a missing output yielded a result/ },
    { id: "F10-S8", what: "explicit negative: an abstention is dropped from D instead of counting as a negative", file: LIFE, test: T, named: N.negative,
      from: "    const said = new Set(outputs.get(i).classes);", to: "    const said = new Set(outputs.get(i).classes);\n    if (said.size === 0) { denominator -= 1; continue; }",
      expect: /an explicit negative against a positive key was not counted as a false negative/ },
    { id: "F10-S9", what: "duplicate scoring: the idempotency key is not stable across attempts, so a retry of a committed run runs again", test: T, named: N.oneRun,
      edits: [
        { file: ROUTE, from: "  const combination = combinationOf(req);", to: "  const combination = combinationOf(req);\n  const NONCE = sha256(String(Math.random()));" },
        { file: ROUTE, from: "repoRelativeTarget: releaseStore, occurrenceFingerprint: combination });", to: "repoRelativeTarget: releaseStore, occurrenceFingerprint: NONCE });" },
        { file: ROUTE, from: "occurredAt, occurrenceFingerprint: combination, evidenceRefs: [] };", to: "occurredAt, occurrenceFingerprint: NONCE, evidenceRefs: [] };" },
      ],
      expect: /a retry of a committed run ran again/ },
    { id: "F10-S10", what: "retry after a crash: a claimed combination can be claimed again", file: LIFE, test: T, named: N.crash,
      from: "  if (eventsOf(audit).some((e) => e.action === LINKED_ACTIONS.CLAIMED && e.metadata.combination === combination))", to: "  if (false)",
      expect: /a re-invocation after a crash produced a result/ },
    { id: "F10-S11", what: "census omission: any file's call counts as the governed route", file: CENSUS, test: T, named: N.callers,
      from: "        : file === GOVERNED_ROUTE_MODULE && (kind === \"CALL\" || kind === \"IMPORT\") ? \"GOVERNED_ROUTE\"", to: "        : (kind === \"CALL\" || kind === \"IMPORT\") ? \"GOVERNED_ROUTE\"",
      expect: /a planted direct call was not found/ },
    { id: "F10-S12", what: "payload leakage: the release carries the set's item identities", file: ROUTE, test: T, named: N.happy,
      from: "        governedWriteKey: key, combination, claimEventId: scored.claimEventId,", to: "        governedWriteKey: key, combination, leaked: items, claimEventId: scored.claimEventId,",
      expect: /an item identity crossed out of the boundary/ },
    { id: "F10-S13", what: "denominator below 80 is scored as a rate", file: RULE, test: T, named: N.rule,
      from: "  if (D < rule.minDenominator) return invalid(\"DENOMINATOR_BELOW_MINIMUM\", { denominator: D });", to: "  // sabotaged: no minimum denominator",
      expect: /D = 79 was reported as a rate/ },
    { id: "F10-S14", what: "an item without source rows gets an entry (an untraceable output)", file: MECH, test: T, named: N.untrace,
      from: "    if (!Array.isArray(it.sourceRowIds) || it.sourceRowIds.length === 0 ||", to: "    if (false ||",
      expect: /an untraceable output was emitted/ },
    { id: "F10-S15", what: "the neutrality scan stops looking for hosts, tenants and labels — its control must fire", file: T, test: T, named: N.neutral,
      from: "    for (const h of [...terms.hosts, ...terms.tenants, ...terms.labels]) if (t.includes(h)) hits.push(file);", to: "    for (const h of []) if (t.includes(h)) hits.push(file);",
      expect: /CONTROL: a planted host was not found/ },
    { id: "F10-S16", what: "a changed source observation is used (the C1 reopen trigger removed)", file: PART, test: T, named: N.changed,
      from: "  if (o.content_sha256 !== source.contentSha256) throw", to: "  if (false) throw",
      expect: /a changed source observation was used/ },
    { id: "F10-S17", what: "a synthetic configuration is honoured outside a verified test context", file: FIX, test: T, named: N.fixture,
      from: "  if (!inVerifiedTestContext(env)) throw", to: "  if (false) throw",
      expect: /a synthetic fixture was honoured outside a test context/ },
    { id: "F10-S18", what: "an owner-authorised exclusion rule is no longer applied (PAYMENT)", file: POP, test: T, named: N.families,
      from: "rules.find((r) => r.re.test(String(query)))", to: "rules.find((r) => r.name !== \"PAYMENT\" && r.re.test(String(query)))",
      expect: /the planted PAYMENT stand-in was not removed by its own rule/ },
    { id: "F10-S19", what: "the retired population is not applied", file: POP, test: T, named: N.families,
      from: "    pool = pool.filter((it) => { if (retired.has(norm(it.query)))", to: "    pool = pool.filter((it) => { if (false)",
      expect: /operator, retired or a duplicate rule did not fire on its stand-in/ },
    { id: "F10-S20", what: "the C7 reopen trigger never fires", file: HQC, test: T, named: N.c7,
      from: "    if (keys.some((k) => wanted.has(k))) hits.push(", to: "    if (false) hits.push(",
      expect: /a planted sequence field did not fire the reopen trigger/ },
    { id: "F10-S21", what: "a scorer changed since its freeze reaches scoring", file: ROUTE, test: T, named: N.oneRun,
      from: "      if (typeof currentScorerHash !== \"string\" || currentScorerHash !== req.scorerHash) faults.push(", to: "      if (false) faults.push(",
      expect: /a scorer changed since its freeze reached scoring/ },
    { id: "F10-S22", what: "a class below the assessable threshold is assessed", file: RULE, test: T, named: N.rule,
      from: "    if (positives < rule.minPositives || negatives < rule.minNegatives) {", to: "    if (false) {",
      expect: /a rare class was assessed below its threshold/ },
    { id: "F10-S23", what: "one assessable class is enough for a result", file: RULE, test: T, named: N.rule,
      from: "assessable.length < rule.minAssessableClasses ? \"UNKNOWN\"", to: "false ? \"UNKNOWN\"",
      expect: /one assessable class was reported as a result/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const all = f10Sabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F10 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F10 SABOTAGE EVIDENCE — one defect per required firing and per clause limb", head }));
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
