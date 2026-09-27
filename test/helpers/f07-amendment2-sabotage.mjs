/**
 * 🔴 F07 · AMENDMENT 2 — ONE SABOTAGE PER MATERIAL OBLIGATION, derived from the frozen amendment (governance 051feb9).
 *
 *   node test/helpers/f07-amendment2-sabotage.mjs [--only=F7B-S1,…] [--out=<file>]
 *
 * Each sabotage replaces ONE anchor that occurs exactly once, proves the bytes changed (LANDED), runs its NAMED test, and
 * requires it RED for the INTENDED reason — an assertion message of that test, never a test name; then restores the file
 * byte-for-byte. The shared harness (f08-sabotage.mjs) fails a sabotage that does not land or whose named test never ran,
 * and never targets the production audit trail.
 *
 *   LINKED GRANT     the link is not checked · substituted key content accepted · a crossed tenant scope accepted ·
 *                    an unfrozen scorer bound · the registry's pair law dropped                      → F7B-S1…S4, S15
 *   GOVERNED READ    the value read before its ACCESS · the ACCESS never recorded · the key side outside the grant ·
 *                    a derived set read unrecorded · a climbing path into a sealed store unrefused  → F7B-S5…S7, S20, S14
 *   AGGREGATE SCORE  a re-invocation allowed · the claim not recorded · a missing key row accepted · a duplicate row
 *                    accepted · an item identity released · a key changed after the grant scored · a missing output
 *                    accepted                                                                         → F7B-S8…S12, S17, S18
 *   COMPLETE CENSUS  label vocabulary reported as a leak · an unreadable store reported as zero files · an unlocatable
 *                    store reported located · the production evaluator ignores the linked fields  → F7B-S13, S16, S19, S21
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runSabotages, renderEvidence } from "./f08-sabotage.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const T = "test/f07-amendment2-marking-key.test.mjs";
const LIFE = "src/heldout/lifecycle.mjs";
const C1 = "F07A2 · C1 · the grant FAILS CLOSED";
const READ = "F07A2 · C2 · every read of either side";
const SCORE_IN = "F07A2 · C3 · missing, partial, duplicate";
const ONE_RUN = "F07A2 · C3 · exactly ONE valid run";

export function f07Amendment2Sabotages() {
  return [
    { id: "F7B-S1", what: "the grant does not check that the key is linked to the set", file: LIFE, test: T, named: C1,
      from: '  if (k.linkedSet !== setEntry.id) return "MARKING_KEY_NOT_LINKED";', to: "  // sabotaged: the link is not checked",
      expect: /the link is missing: expected MARKING_KEY_NOT_LINKED/ },
    { id: "F7B-S2", what: "substituted key CONTENT is accepted — the key commitment is not checked at grant", file: LIFE, test: T, named: C1,
      from: '  if (k.contentHash !== r.keyCommitment) return "MARKING_KEY_COMMITMENT_MISMATCH";', to: "  // sabotaged: the key commitment is not checked",
      expect: /substituted key content: expected MARKING_KEY_COMMITMENT_MISMATCH/ },
    { id: "F7B-S3", what: "a pair spanning different tenant scopes is granted", file: LIFE, test: T, named: C1,
      from: '  if (!sameTenantScope(k, setEntry)) return "PAIR_CROSSES_TENANTS";', to: "  // sabotaged: tenant scopes are not compared",
      expect: /the pair crosses tenants: expected PAIR_CROSSES_TENANTS/ },
    { id: "F7B-S4", what: "a linked grant binds a scorer that was never frozen", file: LIFE, test: T, named: C1,
      from: "  if (linked && !trail.some(", to: "  if (false && linked && !trail.some(",
      expect: /a grant bound a scorer that was never frozen/ },
    { id: "F7B-S5", what: "the value is read BEFORE its ACCESS is recorded", file: LIFE, test: T, named: READ,
      from: '  emit(audit, { action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: v.entryId === grant.request.keySetId',
      to: '  const early = read(join(base, path)); void early;\n  emit(audit, { action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: v.entryId === grant.request.keySetId',
      expect: /was read before its ACCESS was recorded/ },
    { id: "F7B-S6", what: "the read's ACCESS is never recorded", file: LIFE, test: T, named: READ,
      from: '  emit(audit, { action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: v.entryId === grant.request.keySetId',
      to: '  (() => {})({ action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: v.entryId === grant.request.keySetId',
      expect: /was read before its ACCESS was recorded/ },
    { id: "F7B-S7", what: "a linked grant no longer covers its marking key — the evaluator cannot lawfully read the key", file: LIFE, test: T, named: READ,
      from: "  const sides = [grant.request.sealedSetId, grant.request.keySetId].filter(", to: "  const sides = [grant.request.sealedSetId].filter(",
      expect: /ITEM_OUTSIDE_GRANTED_SET/ },
    { id: "F7B-S8", what: "a re-invocation of a claimed combination is allowed", file: LIFE, test: T, named: ONE_RUN,
      from: "  if (eventsOf(audit).some((e) => e.action === LINKED_ACTIONS.CLAIMED && e.metadata.combination === combination))", to: "  if (false)",
      expect: /a second run of the same combination was allowed/ },
    { id: "F7B-S9", what: "the claim is not recorded before the run — a crash or a retry can manufacture a second result", file: LIFE, test: T, named: ONE_RUN,
      from: "  const claim = emit(audit, { action: LINKED_ACTIONS.CLAIMED,", to: '  const claim = ((x) => ({ event: { eventId: "0".repeat(32) } }))({ action: LINKED_ACTIONS.CLAIMED,',
      expect: /a second run of the same combination was allowed|the crashed run had not claimed its combination first/ },
    { id: "F7B-S10", what: "a declared item with no key row is accepted (partial key)", file: LIFE, test: T, named: SCORE_IN,
      from: '  if (items.some((i) => !parsed.rows.has(i))) refuse("INPUT_MISSING");', to: "  // sabotaged: a partial key is accepted",
      expect: /a key row missing: expected INPUT_MISSING/ },
    { id: "F7B-S11", what: "a duplicated key row is accepted", file: LIFE, test: T, named: SCORE_IN,
      from: '      if (rows.has(o.item)) return { fault: "INPUT_DUPLICATE" };', to: "      // sabotaged: duplicates are accepted",
      expect: /a duplicated key row: expected INPUT_DUPLICATE/ },
    { id: "F7B-S12", what: "the release carries the item identities", file: LIFE, test: T, named: "F07A2 · C3 · the frozen scorer releases EXACTLY",
      from: "    declared: String(items.length), denominator: String(denominator), evidenceState, untouched: String(grant.untouched),",
      to: '    declared: String(items.length), denominator: String(denominator), evidenceState, untouched: String(grant.untouched), items: items.join(","),',
      expect: /an item identity crossed out of the boundary/ },
    { id: "F7B-S13", what: "the key's declared label vocabulary is reported as a leak — the census could never be clean", file: "tools/heldout-firewall.mjs", test: T, named: "F07A2 · C4 · the key's declared label VOCABULARY",
      from: '  const members = [...new Set(inside.flatMap((p) => extractMembers(read(join(base, p)).toString("utf8"))))].filter((m) => !vocabulary.has(m));',
      to: '  const members = [...new Set(inside.flatMap((p) => extractMembers(read(join(base, p)).toString("utf8"))))];',
      expect: /declared vocabulary in ordinary prose was reported as marking-key content/ },
    { id: "F7B-S14", what: "an ordinary governed loader reads a governed sealed store through a climbing path — the foreign-store check dropped", file: "src/governance/sealed-paths.mjs", test: T, named: "F07A2 · C2 · C4 · an ORDINARY governed loader",
      from: '    if (hit) return { refuse: true, code: "SEALED_PATH_REFUSED", entryId: String(hit.id), classification: "SEALED" };',
      to: '    if (false && hit) return { refuse: true, code: "SEALED_PATH_REFUSED", entryId: String(hit.id), classification: "SEALED" };',
      expect: /Missing expected exception/ },
    { id: "F7B-S15", what: "the registry's linked-pair law is dropped", file: "src/governance/evidence-roles.mjs", test: T, named: "F07A2 · C1 · the registry law",
      from: "  errs.push(...linkedPairErrors(registry));", to: "  // sabotaged: the pair law is not applied",
      expect: /a key with no link was not refused/ },
    { id: "F7B-S16", what: "the manifest reports an unreadable store as zero files", file: "tools/heldout-firewall.mjs", test: T, named: "F07A2 · C4 · registration yields a discoverable manifest",
      from: "    const files = shape === \"DERIVED\" || !readable ? null : filesOf(r.root)", to: "    const files = shape === \"DERIVED\" ? null : !readable ? 0 : filesOf(r.root)",
      expect: /an unreadable store was reported as a readable or empty one/ },
    { id: "F7B-S17", what: "a key changed after the grant is scored", file: LIFE, test: T, named: SCORE_IN,
      from: '  if (keyCommitment(keyBytes) !== req.keyCommitment) refuse("KEY_CHANGED_SINCE_GRANT");', to: "  // sabotaged: the key is not re-checked at scoring",
      expect: /a key changed after the grant was scored/ },
    { id: "F7B-S18", what: "a missing mechanism output is accepted", file: LIFE, test: T, named: SCORE_IN,
      from: '  if (items.some((i) => !outputs.has(i))) invalid("INPUT_MISSING");', to: "  // sabotaged: missing outputs are accepted",
      expect: /an output missing for a declared item: expected INPUT_MISSING/ },
    { id: "F7B-S19", what: "a declared store whose directory is absent is reported located", file: "src/governance/sealed-store-roots.mjs", test: T, named: "F07A2 · C4 · a governed sealed store that cannot be located",
      from: '    if (!existsSync(value) || !statSync(value).isDirectory()) { set(null, "SEALED_STORE_ABSENT"); continue; }', to: "    // sabotaged: presence is not checked",
      expect: /a store that cannot be located was reported located, or a code changed/ },
    { id: "F7B-S20", what: "a derived set's read is not recorded before its deriver runs", file: LIFE, test: T, named: "F07A2 · C2 · a derived held-out set",
      from: '  emit(audit, { action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: "SET_DERIVATION_READ"',
      to: '  (() => {})({ action: LINKED_ACTIONS.ITEM_READ, outcome: "ALLOWED", reasonCode: "SET_DERIVATION_READ"',
      expect: /the deriver ran before its read was recorded/ },
    { id: "F7B-S21", what: "the production evaluator ignores the linked fields — an incomplete linked request is treated as an unlinked one", file: "bin/heldout-evaluation.mjs", test: T, named: "F07A2 · REAL · the production firewall, in the SYNTHETIC scope",
      from: '    ...(arg("key-set") || arg("key-commitment") || arg("scorer-id") || arg("scorer-hash") ? {', to: "    ...(false ? {",
      expect: /an incomplete linked request was not refused/ },
  ];
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const all = f07Amendment2Sabotages();
  const list = only.length ? all.filter((s) => only.includes(s.id)) : all;
  console.log("F07 AMENDMENT 2 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const executed = run.results.filter((r) => !String(r.verdict).startsWith("NOT RUN")).length;
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · EXECUTED ${executed} of ${list.length} · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(outArg.includes(":") || outArg.startsWith("/") ? outArg : join(REPO, outArg), renderEvidence(run, { title: "F07 AMENDMENT 2 SABOTAGE EVIDENCE — one defect per obligation of the frozen amendment", head }));
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && executed === list.length && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
