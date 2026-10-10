/**
 * 🔴 RR-199 · R6b · ONE SABOTAGE PER FAILURE LIMB of what R6b built (RR-194 to RR-197): T-2's version-2 checks, the re-assessment plan and
 * its census, F90 (its 18 limbs carried from test/helpers/f90-sabotage.mjs, which is NOT run, and the RR-195 trap control), the RR-195
 * review-signal proof and issue-writer census, RR-196's three decisions and RR-197's report gate. Each on LIVE code, its span found EXACTLY
 * ONCE, applied ALONE, the named test — a prefix UNIQUE across every file this harness names — confirmed GREEN first and then required RED
 * by an AssertionError (never a crash of the TEST), every file restored by raw-byte sha256. The method of test/helpers/rr188-sabotage.mjs,
 * with two changes: each sabotage runs ONLY the test file holding its named test (the baseline runs them all once), and the committed
 * OUTPUTS a sabotaged bin could reach — the owner's ruling sheet and report and both findings stores — are hashed with the production trail
 * before and after. FIXTURE STRUCTURES ONLY (RR-177).
 *
 *   node test/helpers/rr199-sabotage.mjs --deliberate [--practice] [--only=<id>]     NOT part of `npm test`
 *
 * --practice writes runs/audit/rr199-sabotage-practice-<date>T<hhmm>.txt; the real run writes runs/audit/rr199-sabotage-<date>T<hhmm>.txt.
 * Neither overwrites an earlier file.
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = ["test/rr194-t2.test.mjs","test/rr195-r6b.test.mjs","test/rr196-r6b.test.mjs","test/rr197-r6b.test.mjs","test/f90-falsifiability.test.mjs","test/rr100-check-boundaries.test.mjs","test/rr102-content-check-boundaries.test.mjs","test/issue-writer-census.test.mjs","test/class-split.test.mjs","test/populations.test.mjs","test/consequence-register.test.mjs","test/row60-ruling-sheet.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
/* RR-199: the committed outputs a sabotaged bin could reach, hashed with the trail */
const OUTPUTS = [TRAIL, "runs/export/row60-ruling-sheet.json", "runs/export/row60-ruling-sheet.md", "runs/report/index.html", "runs/audit/content-findings.jsonl", "runs/audit/supply-labels.jsonl"];
const outputsSha = () => sha(Buffer.concat(OUTPUTS.map((p) => Buffer.from(sha(read(p))))));
const PRACTICE = process.argv.includes("--practice");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const DAY = new Date().toISOString().slice(0, 16).replace(":", "");
const EVIDENCE = join(REPO, "runs", "audit", `rr199-sabotage-${PRACTICE ? "practice-" : ""}${ONLY ? `${ONLY}-` : ""}${DAY}.txt`);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));

const SABOTAGES = [
  /* ── T-2 (RR-194): the version-2 checks never FAIL; their signal carries its value and justification; it decides nothing ── */
  ["T2-thin-content", "T-2 · thin-content past its signal records a FAIL again", [["src/audit/check.mjs", "    signal: Object.freeze({ name: signal.name,", "    ...(issueClass === \"thin-content\" ? { verdict: \"FAIL\" } : {}),\n    signal: Object.freeze({ name: signal.name,"]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  ["T2-near-duplicate", "T-2 · near-duplicate past its signal records a FAIL again", [["src/audit/check.mjs", "    signal: Object.freeze({ name: signal.name,", "    ...(issueClass === \"near-duplicate\" ? { verdict: \"FAIL\" } : {}),\n    signal: Object.freeze({ name: signal.name,"]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  ["T2-template-dominance", "T-2 · template-dominance past its signal records a FAIL again", [["src/audit/check.mjs", "    signal: Object.freeze({ name: signal.name,", "    ...(issueClass === \"template-dominance\" ? { verdict: \"FAIL\" } : {}),\n    signal: Object.freeze({ name: signal.name,"]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  ["T2-version", "T-2 · thin-content is version 1 again", [["src/audit/content-checks.mjs", "  id: \"thin-content\",\n  version: T2_VERSION,", "  id: \"thin-content\",\n  version: \"1\","]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  ["T2-value", "T-2 · the signal carries no value", [["src/audit/check.mjs", "value: signal.value, bound: signal.bound, justification: signal.justification, decides", "value: null, bound: signal.bound, justification: signal.justification, decides"]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  ["T2-justification", "T-2 · the signal's justification is dropped", [["src/audit/check.mjs", "bound: signal.bound, justification: signal.justification, decides", "bound: signal.bound, justification: \"\", decides"]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  ["T2-evidence-state", "T-2 · the evidence-state mapping of a review signal is dropped", [["src/evidence/evidence-state-adapters.mjs", "  \"thin-content\": \"REVIEW_SIGNAL_DECIDES_NOTHING\",\n", ""]], "T2-CHECKS · version 2:", "test/rr194-t2.test.mjs"],
  /* ── the re-assessment (RR-194): its tenant, its copies, its values, its records ── */
  ["RA-other-page", "re-assessment · another tenant's page is selected", [["src/audit/t2-reassessment.mjs", "if (url === undefined) { skipped += 1; continue; }", "if (false) { skipped += 1; continue; }"]], "T2-PLAN · selects only", "test/rr194-t2.test.mjs"],
  ["RA-other-tenant", "re-assessment · the OTHER_TENANT guard is removed", [["src/audit/t2-reassessment.mjs", "if (owner === null || !decideResolvedTenants(owner, tenantId).allowed) {", "if (owner === null) {"]], "T2-PLAN · REFUSES a finding whose page resolves", "test/rr194-t2.test.mjs"],
  ["RA-copies", "re-assessment · the COPIES_DIFFER guard is removed", [["src/audit/t2-reassessment.mjs", "if (states.size !== 1 || prints.size !== 1) {", "if (false) {"]], "T2-PLAN · REFUSES when the copies", "test/rr194-t2.test.mjs"],
  ["RA-value", "re-assessment · a value is invented when the recorded one is unreadable", [["src/audit/t2-reassessment.mjs", "body similarity ([0-9]*\\.[0-9]+) to /); return m ? Number(m[1]) : null;", "body similarity ([0-9]*\\.[0-9]+) to /); return m ? Number(m[1]) : 0;"]], "T2-PLAN · REFUSES a finding whose recorded value", "test/rr194-t2.test.mjs"],
  ["RA-one-store", "re-assessment · a finding moves in only one of its stores", [["src/audit/t2-reassessment.mjs", "for (const c of f.copies) { const w = byStore.get(c.store);", "for (const c of f.copies.slice(0, f.issue.detector === \"thin-content\" ? undefined : 1)) { const w = byStore.get(c.store);"]], "T2-PLAN · both stores", "test/rr194-t2.test.mjs"],
  ["RA-fail", "re-assessment · the replacement is re-recorded as a FAIL", [["src/audit/t2-reassessment.mjs", "    const replacement = reviewSignal({", "    const replacement = ((r) => ({ ...r, verdict: \"FAIL\" }))(reviewSignal({"], ["src/audit/t2-reassessment.mjs", "    });\n    const change = makeIssueStateChange({", "    }));\n    const change = makeIssueStateChange({"]], "T2-PLAN · each replacement", "test/rr194-t2.test.mjs"],
  ["RA-supersedes", "re-assessment · the replacement does not name the finding it supersedes", [["src/audit/t2-reassessment.mjs", "      supersedes: old.issue_id,", "      supersedes: null,"]], "T2-PLAN · each replacement", "test/rr194-t2.test.mjs"],
  ["RA-superseded-by", "re-assessment · the state change does not name the replacement", [["src/audit/t2-reassessment.mjs", "superseded_by: replacement.issue_id,", "superseded_by: old.issue_id,"]], "T2-PLAN · each replacement", "test/rr194-t2.test.mjs"],
  ["RA-open-only", "re-assessment · the OPEN-only filter is removed (a re-run re-appends)", [["src/audit/t2-reassessment.mjs", "    if ([...states][0] !== \"OPEN\") continue; // already moved", "    // already moved"]], "T2-PLAN · a re-run", "test/rr194-t2.test.mjs"],
  ["RA-census", "re-assessment · the census accepts ANY partition as naming the READS family", [["tools/tenant-scope-census.mjs", "/RESOURCES\\.collectionPartition\\(\\s*[\"']RUN_STORE[\"']/.test(t)", "/RESOURCES\\.collectionPartition\\(\\s*[\"'][A-Z_]+[\"']/.test(t)"]], "T2-CENSUS ·", "test/rr194-t2.test.mjs"],
  /* ── F90 C1–C5 and its held method: the 18 of test/helpers/f90-sabotage.mjs, carried (that harness writes fixed evidence names), plus the trap ── */
  ["F90-S01", "F90 C1: an OPEN finding of any verdict is actionable", [["src/audit/f90-falsifiability.mjs", "if (f.state === \"OPEN\" && f.verdict === \"FAIL\") { actionable.push(f); continue; }", "if (f.state === \"OPEN\") { actionable.push(f); continue; }"]], "C1 · exactly OPEN", "test/f90-falsifiability.test.mjs"],
  ["F90-S02", "F90 C1: a second store's copies are not counted", [["src/audit/f90-falsifiability.mjs", "        cur.copies += e.copies;\n", ""]], "C1 · exactly OPEN", "test/f90-falsifiability.test.mjs"],
  ["F90-S03", "F90 C1: a supersession with no recorded move is ignored", [["src/audit/f90-falsifiability.mjs", "if (e.state === \"OPEN\" && namedInSupersedes.has(id)) unreadable.push(", "if (false) unreadable.push("]], "C1 · FIRING CONTROLS:", "test/f90-falsifiability.test.mjs"],
  ["F90-S04", "F90 C1: one finding reading differently across stores is ignored", [["src/audit/f90-falsifiability.mjs", "if (key(cur) !== key(seen)) unreadable.push(", "if (false) unreadable.push("]], "C1 · FIRING CONTROLS:", "test/f90-falsifiability.test.mjs"],
  ["F90-S05", "F90 C1: unparseable lines are ignored", [["src/audit/f90-falsifiability.mjs", "if (unparseable > 0) unreadable.push(", "if (false) unreadable.push("]], "C1 · FIRING CONTROLS:", "test/f90-falsifiability.test.mjs"],
  ["F90-S06", "F90 C1: lifecycle errors are ignored", [["src/audit/f90-falsifiability.mjs", "if (errors.length) unreadable.push(", "if (false) unreadable.push("]], "C1 · FIRING CONTROLS:", "test/f90-falsifiability.test.mjs"],
  ["F90-S07", "F90 C2: a version mismatch is not named", [["src/audit/f90-falsifiability.mjs", "else if (check.version !== finding.detector_version) missing.push(", "else if (false) missing.push("]], "C2 · a held method", "test/f90-falsifiability.test.mjs"],
  ["F90-S08", "F90 C2: an undeclared live version is assumed", [["src/audit/f90-falsifiability.mjs", "else if (check.version === undefined) missing.push(", "else if (false) missing.push("]], "C2 · a held method", "test/f90-falsifiability.test.mjs"],
  ["F90-S09", "F90 C3: OBSERVATION written freehand", [["src/audit/f90-falsifiability.mjs", "observation = check.boundary.observes;", "observation = [\"a fresh observation of the page\"];"]], "C3 · the three parts", "test/f90-falsifiability.test.mjs"],
  ["F90-S10", "F90 C3: a missing boundary is not named (re-anchored, RR-199: the branch names nothing)", [["src/audit/f90-falsifiability.mjs", "    missing.push({ part: \"OBSERVATION\", fact: `${check.id} declares no boundary: what it observes` }, { part: \"THRESHOLD\", fact: `${check.id} declares no boundary: the conditions it fires on` });", "    missing.push();"]], "C3 · FIRING CONTROL:", "test/f90-falsifiability.test.mjs"],
  ["F90-S11", "F90 C4: a non-falsifiable finding does not disprove", [["src/audit/f90-falsifiability.mjs", ": notFalsifiable > 0 ? \"DISPROVED\" : \"PROVED\";", ": \"PROVED\";"]], "C4 · PROVED only", "test/f90-falsifiability.test.mjs"],
  ["F90-S12", "F90 C4: an empty population is proved", [["src/audit/f90-falsifiability.mjs", "population.unreadable.length > 0 || refutations.length === 0 ? \"COULD-NOT-PROVE\"", "population.unreadable.length > 0 ? \"COULD-NOT-PROVE\""]], "C4 · FIRING CONTROL: an EMPTY", "test/f90-falsifiability.test.mjs"],
  ["F90-S13", "F90 C4: classes merged", [["src/audit/f90-falsifiability.mjs", "const c = (byClass[r.issueClass] ??= ", "const c = (byClass[\"all\"] ??= "]], "C4 · PROVED only", "test/f90-falsifiability.test.mjs"],
  ["F90-S14", "F90 C4: untracked stores are read", [["src/audit/f90-falsifiability-reader.mjs", "[\"ls-files\", \"-z\", \"--\", \"runs\"]", "[\"ls-files\", \"-z\", \"--cached\", \"--others\", \"--\", \"runs\"]"]], "C4 · the stores are the TRACKED", "test/f90-falsifiability.test.mjs"],
  ["F90-S15", "F90 C5: the reader can write", [["src/audit/f90-falsifiability-reader.mjs", "import { readFileSync } from \"node:fs\";", "import { readFileSync, writeFileSync } from \"node:fs\";"]], "C5 · the census module", "test/f90-falsifiability.test.mjs"],
  ["F90-S16", "F90 C5: the entry point drops its bound", [["bin/finding-falsifiability.mjs", "console.log(`  bound            ${c.bound} · ${storesListed} tracked store(s) listed`);", ""]], "C5 · THE ENTRY POINT:", "test/f90-falsifiability.test.mjs"],
  ["F90-S17", "F90 HELD METHOD: a check's declared version drifts from what it stamps (re-anchored on exact-duplicate, RR-199)", [["src/audit/content-checks.mjs", "  id: \"exact-duplicate\",\n  version: \"1\",", "  id: \"exact-duplicate\",\n  version: \"2\","]], "REAL · every recorded", "test/f90-falsifiability.test.mjs"],
  ["F90-S18", "F90 HELD METHOD: the registry drops the declared version", [["src/audit/check.mjs", "boundary: validBoundary(id, boundary), version });", "boundary: validBoundary(id, boundary) });"]], "REAL · every recorded", "test/f90-falsifiability.test.mjs"],
  ["F90-TRAP", "F90 TRAP CONTROL (RR-195) · a version mismatch is not named, so the pre-run stores would PROVE", [["src/audit/f90-falsifiability.mjs", "else if (check.version !== finding.detector_version) missing.push(", "else if (false) missing.push("]], "TRAP CONTROL ·", "test/rr195-r6b.test.mjs"],
  /* ── RR-195: the review-signal proof and the issue-writer census ── */
  ["R195-justification", "RR-195 · the declared justification is not what the 125 replacements carry", [["src/audit/content-checks.mjs", " unique body words after shell subtraction is the struck Gate A floor", " unique body words after shell subtraction was the struck Gate A floor"]], "REVIEW SIGNALS ON ALL 125 ·", "test/rr195-r6b.test.mjs"],
  ["R195-decl-t2", "RR-195 · the split writer bin/t2-reassess.mjs is no longer declared", [["tools/issue-writer-census.mjs", "    file: \"bin/t2-reassess.mjs\",\n    builder:", "    file: \"bin/t2-reassess-undeclared.mjs\",\n    builder:"]], "RR-195 · the split writer", "test/issue-writer-census.test.mjs"],
  ["R195-decl-instrument", "RR-195 · the split writer bin/instrument-disagreement.mjs is no longer declared", [["tools/issue-writer-census.mjs", "    file: \"bin/instrument-disagreement.mjs\",\n    builder:", "    file: \"bin/instrument-disagreement-undeclared.mjs\",\n    builder:"]], "RR-195 · the split writer", "test/issue-writer-census.test.mjs"],
  ["R195-undeclared", "RR-195 · an undeclared issue writer no longer FAILS the census", [["tools/issue-writer-census.mjs", "const undeclared = split.filter((s) => !s.ok)", "const undeclared = split.filter(() => false)"]], "RR-195 · CONTROL:", "test/issue-writer-census.test.mjs"],
  /* ── RR-196 decision 3: one move across two stores; each store's own duplicate guard ── */
  ["D3-same-store", "RR-196 · a copy is accepted from the SAME store", [["src/evidence/lifecycle.mjs", "    if (seen && from !== null && !seen.has(null) && !seen.has(from)) {", "    if (seen && from !== null && !seen.has(null)) {"]], "DECISION 3 · CONTROL: the same move written twice", "test/rr196-r6b.test.mjs"],
  ["D3-unknown-store", "RR-196 · a copy is accepted from an UNKNOWN store", [["src/evidence/lifecycle.mjs", "    if (seen && from !== null && !seen.has(null) && !seen.has(from)) {", "    if (seen && !seen.has(from)) {"]], "DECISION 3 · CONTROL: a duplicate whose store is UNKNOWN", "test/rr196-r6b.test.mjs"],
  ["D3-identity", "RR-196 · a copy is identified by issue_id alone", [["src/evidence/lifecycle.mjs", "    const key = canonical(c);", "    const key = c.issue_id;"]], "DECISION 3 · CONTROL: a duplicate whose store is UNKNOWN", "test/rr196-r6b.test.mjs"],
  ["D3-read-mark", "RR-196 · the store no longer marks where a record was read from", [["src/evidence/store.mjs", "return markReadFrom(JSON.parse(l), filePath);", "return JSON.parse(l);"]], "DECISION 3 · the same move written into TWO stores", "test/rr196-r6b.test.mjs"],
  /* ── RR-196 decision 1: the T-2 taxonomy ── */
  ["D1-signal-version", "RR-196 · the review-signal half is placed at version 1", [["config/class-splits.mjs", "when: Object.freeze({ detector: parent, detector_version: \"2\", verdict: \"UNKNOWN\", reason_code: null })", "when: Object.freeze({ detector: parent, detector_version: \"1\", verdict: \"UNKNOWN\", reason_code: null })"]], "🟢 GREEN: every issue in the store is placed", "test/class-split.test.mjs"],
  ["D1-decision-count", "RR-196 · a decision on record's count is off by one", [["config/decision-register.mjs", "\"thin-content-review-signal\": reviewSignals(\"thin-content\", 118,", "\"thin-content-review-signal\": reviewSignals(\"thin-content\", 117,"]], "🟢 GREEN: every population check holds", "test/populations.test.mjs"],
  ["D1-audit-count", "RR-196 · an audit-trail count is off by one", [["config/audit-trail.mjs", "\"thin-content-claim-withdrawn\": withdrawnT2(\"thin-content\", 118,", "\"thin-content-claim-withdrawn\": withdrawnT2(\"thin-content\", 117,"]], "🟢 GREEN: every population check holds", "test/populations.test.mjs"],
  ["D1-retired-by", "RR-196 · a retired half names only one of the two classes its records became", [["config/consequence-register.mjs", "supersededBy: Object.freeze([`${parent}-claim-withdrawn`, `${parent}-review-signal`]), retired", "supersededBy: Object.freeze([`${parent}-claim-withdrawn`]), retired"]], "🔴 the store is untouched:", "test/class-split.test.mjs"],
  ["D1-found-back", "RR-196 · thin-content-found is put back as a live finding class", [["config/consequence-register.mjs", "  /* RR-196: thin-content-found, near-duplicate-found and template-dominance-found are RETIRED", "  \"thin-content-found\": Object.freeze({ what: \"x\", level: \"MODERATE\", consequence: \"x\", reversibility: \"x\", blastRadius: \"118\", why: \"x\", splitFrom: \"thin-content\", ruledFor: \"thin-content-found\", ruledBy: \"owner\", ruledOn: \"2026-09-14\" }),\n  /* RR-196: thin-content-found, near-duplicate-found and template-dominance-found are RETIRED"]], "🟢 REAL: the register holds exactly the 11", "test/consequence-register.test.mjs"],
  /* ── RR-196 decision 2 and RR-197: the owner's sheet and report, GLOBAL reads gated by F04; a dry run writes nothing ── */
  ["D2-sheet-refusal", "RR-196 · the sheet's F04 refusal no longer stops the run", [["bin/row60-ruling-sheet.mjs", "if (!decision.allowed) {", "if (false && !decision.allowed) {"]], "DECISION 2 · CONTROL: no actor,", "test/rr196-r6b.test.mjs"],
  ["D2-sheet-dry-sink", "RR-196 · the sheet's reconcile run records on the governed sink", [["bin/row60-ruling-sheet.mjs", "const sink = confirmMode\n", "const sink = true\n"]], "DECISION 2 · a RECONCILE run", "test/rr196-r6b.test.mjs"],
  ["D2-sheet-census", "RR-196 · the sheet's GLOBAL read is no longer declared in the census", [["tools/tenant-scope-census.mjs", "  \"bin/row60-ruling-sheet.mjs\": \"the owner", "  \"bin/row60-ruling-sheet-undeclared.mjs\": \"the owner"]], "DECISION 2 · the GLOBAL read", "test/rr196-r6b.test.mjs"],
  ["D2-sheet-action", "RR-196 · the READ_OWNER_RULING_SHEET action is removed", [["config/governance/authorisation.mjs", "  READ_OWNER_RULING_SHEET: A(\"RESEARCH\", \"PROTECTED_TENANT_DATA\"),\n", ""]], "DECISION 2 · the GLOBAL read", "test/rr196-r6b.test.mjs"],
  ["R197-refusal", "RR-197 · the report's F04 refusal no longer stops the run", [["bin/report.mjs", "if (!globalDecision.allowed) {", "if (false && !globalDecision.allowed) {"]], "RR-197 · CONTROL:", "test/rr197-r6b.test.mjs"],
  ["R197-dry-sink", "RR-197 · the report's dry run records on the governed sink", [["bin/report.mjs", "const globalSink = confirmMode\n", "const globalSink = true\n"]], "RR-197 · a DRY RUN", "test/rr197-r6b.test.mjs"],
  ["R197-census", "RR-197 · the report's GLOBAL read is no longer declared in the census", [["tools/tenant-scope-census.mjs", "  \"bin/report.mjs\": \"the owner", "  \"bin/report-undeclared.mjs\": \"the owner"]], "RR-197 · the owner report's GLOBAL read", "test/rr197-r6b.test.mjs"],
  /* ── RR-196: every review-signal page visible, on the sheet and in the report ── */
  ["D1-signals-row", "RR-196 · signalsForClass drops a page", [["src/audit/populations.mjs", "a.issue_id < b.issue_id ? -1 : 1));\n}", "a.issue_id < b.issue_id ? -1 : 1)).slice(1);\n}"]], "DECISION 1 · the owner's REPORT view", "test/rr196-r6b.test.mjs"],
  ["D1-sheet-signals", "RR-196 · the sheet's decision rows lose their signals", [["src/audit/ruling-sheet.mjs", "signals: signalsForClass(issue_class, { view, records: all }) };", "signals: [] };"]], "🟢 GREEN: the committed sheet,", "test/row60-ruling-sheet.test.mjs"],
  ["D1-view-signals", "RR-196 · the report view drops the page list", [["src/report/view.mjs", "${signals}\n  <p class=\"bound\">Every issue lands", "  <p class=\"bound\">Every issue lands"]], "DECISION 1 · the owner's REPORT view", "test/rr196-r6b.test.mjs"],
];

const RUN = ONLY ? SABOTAGES.filter((s) => s[0] === ONLY) : SABOTAGES;
if (ONLY && RUN.length !== 1) { console.error(`REFUSED — no sabotage ${ONLY}`); process.exit(2); }
if (existsSync(EVIDENCE)) { console.error(`REFUSED — ${EVIDENCE} exists; an earlier run's evidence is never overwritten`); process.exit(2); }
const files = [...new Set(SABOTAGES.flatMap((s) => s[2].map((x) => x[0])))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const inEol = (text, s) => (text.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
const occurrences = (text, s) => text.split(inEol(text, s)).length - 1;
const preflight = RUN.map(([id, , spans]) => [id, spans.map(([f, from]) => occurrences(originals.get(f).toString("utf8"), from))]);
const allOnce = preflight.every(([, ns]) => ns.every((x) => x === 1));
const trailBefore = outputsSha();
/* RR-199: the baseline runs every file once; each sabotage runs only the file that holds its named test */
const run = (files = T) => spawnSync(process.execPath, ["--test", ...files], { cwd: REPO, encoding: "utf8", timeout: 900000 });
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The first detail line under the named test's entry in the runner's failure summary — its error class. */
function failureClassOf(out, prefix) {
  const ls = out.split(/\r?\n/);
  const at = ls.findIndex((l, i) => i > ls.findIndex((x) => /✖ failing tests:/.test(x)) && new RegExp(`^✖ ${esc(prefix)} `).test(l));
  const detail = at < 0 ? null : ls.slice(at + 1).find((l) => l.trim() !== "");
  return detail ? detail.trim().split(/[ :[]/)[0] : null;
}
const base = run();
const baselineGreen = base.status === 0;
const named = [...new Set(RUN.map((s) => s[3]))];
const seenGreen = (p) => new RegExp(`✔ ${esc(p)} `).test(`${base.stdout}${base.stderr}`);
const namedGreen = named.every(seenGreen);
const lines = [
  `RR-199 R6b sabotage ${PRACTICE ? "PRACTICE " : ""}run · ${new Date().toISOString()}`,
  `population: ${RUN.length} sabotage(s) over ${T.join(" + ")} · each applied ALONE · no provider, no network, no third-party read`,
  `BASELINE (the named tests before any sabotage): ${baselineGreen && namedGreen ? "GREEN" : "NOT GREEN — no sabotage is run"} · named tests seen GREEN: ${named.filter(seenGreen).length} of ${named.length}`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, ns]) => `${id}=${ns.join("+")}`).join(" ")} · all exactly once: ${allOnce}`,
  `production trail + committed outputs (sheet, report, both stores) sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, spans, expect, file] of baselineGreen && namedGreen ? RUN : []) {
  if (!spans.every(([f, from]) => occurrences(originals.get(f).toString("utf8"), from) === 1)) { lines.push(`${id} ${limb}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const touched = [...new Set(spans.map((s) => s[0]))];
  for (const f of touched) {
    let text = originals.get(f).toString("utf8");
    for (const [, from, to] of spans.filter((s) => s[0] === f)) { const ff = inEol(text, from); const at = text.indexOf(ff); text = text.slice(0, at) + inEol(text, to) + text.slice(at + ff.length); }
    writeFileSync(join(REPO, f), text, "utf8");
  }
  const landed = touched.every((f) => sha(read(f)) !== sha(originals.get(f)));
  let failing = [], out = "";
  try {
    const r = run([file]);
    out = `${r.stdout}${r.stderr}`;
    failing = [...out.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
  } finally {
    for (const f of touched) writeFileSync(join(REPO, f), originals.get(f));
  }
  const restored = touched.every((f) => sha(read(f)) === sha(originals.get(f)));
  const red = failing.some((n) => n.startsWith(`${expect} `));
  const cls = failureClassOf(out, expect);
  const byAssertion = cls === "AssertionError";
  const syntax = /SyntaxError/.test(out);
  const childCrashed = /\n\s+at .*bin\/|TypeError: |ReferenceError: /.test(out);
  const ok = landed && red && byAssertion && !syntax && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} [${touched.join(", ")}]: landed ${landed} · named test "${expect}" red ${red} · its failure ${cls ?? "none"} · SyntaxError ${syntax} · a production child crashed ${childCrashed} · failing ${[...new Set(failing.map((n) => n.split(" ")[0]))].join(",") || "none"} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = outputsSha();
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${RUN.length} · residue ${residue} · production trail + committed outputs sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(dirname(EVIDENCE), { recursive: true });
writeFileSync(EVIDENCE, lines.join("\n") + "\n", { flag: "wx" });
console.log(lines.at(-1));
process.exitCode = residue === 0 && trailAfter === trailBefore && proved === RUN.length ? 0 : 1;
