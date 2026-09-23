/**
 * §10 · SABOTAGE — DURABLE EVIDENCE. For each: confirm the mutation LANDED · run its test file · require RED, the
 * NAMED test among the failures, and the INTENDED reason in the output · restore byte-identically · verify by hash.
 *
 *   node test/helpers/f08-sabotage.mjs [--only=S3,S19] [--out=runs/audit/<file>.txt]
 *
 * 🔴 ATTRIBUTION IS BY THE FAILING TEST'S NAME, NOT ONLY BY A WORD IN THE OUTPUT. A pattern such as /REFUSED/
 * matches almost anything a governed-write test prints, so "red, and the word appeared" can be red for another
 * reason entirely. A sabotage is proved only when the test it was aimed at is one of the tests that failed.
 *
 * 🔴 IT RESTORES ON ABORT. Every exit path — success, failure, throw, SIGINT — goes through restore(), and the
 * restore is checked on RAW BYTES, so a changed line ending would count as residue.
 *
 * 🔴 LAW 1 — A SABOTAGE IS AS DANGEROUS AS ITS PROOF'S TARGET. Restoring the source does not undo what the
 * sabotaged code DID. The production audit trail is hashed before the first sabotage and after the last, and a
 * difference fails the whole run, whatever each sabotage reported.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const shaBytes = (b) => createHash("sha256").update(b).digest("hex");
const BOUNDARY = "src/governance/governed-write.mjs";
const ADAPTERS = "src/governance/durability-adapters.mjs";
const RUN = "src/governance/governed-run.mjs";
const EVENT = "src/audit-trail/event.mjs";
const T = "test/governed-write.test.mjs";

/**
 * `named` is a prefix of the test name the sabotage is aimed at. `expect` is the reason that test must give.
 * Both must hold; either alone is not attribution.
 */
export const SABOTAGES = [
  { id: "S3", what: "mutate the target before ATTEMPTED is durable", file: BOUNDARY, test: T, named: "P7 · P8 ·",
    /* Defers ONLY the ATTEMPTED write — the mutation proceeds before the attempt record is durable — and nothing
     * else changes. Removing the event entirely broke sixteen tests and could not be attributed. */
    from: '  const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId };\n  return audit.store.append(draft, { identity });',
    to: '  const identity = { governedWriteKey: key, governedWritePhase: phase, correlationId: audit.correlationId };\n  if (phase === "ATTEMPTED") { setTimeout(() => audit.store.append(draft, { identity }), 0); return { event: { eventId: null }, appended: false }; }\n  return audit.store.append(draft, { identity });',
    expect: /the mutation began before ATTEMPTED was durable/ },

  { id: "S19", what: "suppress a permission-refusal audit", file: BOUNDARY, test: T, named: "P9 ·",
    from: '  if (!permission || permission.mayWrite !== true) {\n    const refused = appendPhase({',
    to: '  if (!permission || permission.mayWrite !== true) {\n    if (true) return { ...base, outcome: "REFUSED", attemptedEventId: null, terminalEventId: null, faults: [] };\n    const refused = appendPhase({',
    expect: /REFUSED/ },

  { id: "S7+S8", what: "duplicate the target and the occurrence event on retry", file: BOUNDARY, test: T, named: "P13 · P14 · P21 ·",
    from: '  if (found.state === "COMMITTED") {',
    to: '  if (false && found.state === "COMMITTED") {',
    expect: /retries added occurrence events|ALREADY_COMMITTED/ },

  { id: "S9", what: "accept a conflicting idempotency key", file: BOUNDARY, test: T, named: "P15 · a supplied idempotency key",
    from: '  if (idempotencyKey !== null && idempotencyKey !== derived) {',
    to: '  if (false && idempotencyKey !== null && idempotencyKey !== derived) {',
    expect: /IDEMPOTENCY_KEY_NOT_DERIVABLE|Missing expected exception/ },

  { id: "S29", what: "widen the audit-store exemption to cover a governed write", file: BOUNDARY, test: T, named: "P26 · P51 ·",
    from: '  if (own.some((p) => p.endsWith(target))) {',
    to: '  if (false && own.some((p) => p.endsWith(target))) {',
    expect: /the exemption has become a hole|AUDIT_STORE_TARGET_FORBIDDEN/ },

  { id: "S13", what: "declare a discovered state with no owner", file: BOUNDARY, test: T, named: "P49 ·",
    from: '      owner: "NEXT_GOVERNED_WRITE_TO_SAME_TARGET",',
    to: '      owner: "",',
    expect: /has no named owner/ },

  { id: "S32", what: "report a DECLARED-UNREACHABLE outcome as proved", file: BOUNDARY, test: T, named: "P49 ·",
    from: '  VALIDATED_APPEND: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "ALREADY_COMMITTED"]),',
    to: '  VALIDATED_APPEND: Object.freeze(["REFUSED", "COMMITTED", "FAILED_BEFORE_COMMIT", "ALREADY_COMMITTED", "COMMIT_STATUS_UNKNOWN"]),',
    expect: /9 reachable-as-returned|COMMIT_STATUS_UNKNOWN/ },

  { id: "S16", what: "ignore a malformed tail (and so allow a valid tail to be truncated)", file: ADAPTERS, test: T, named: "P24 · P25 ·",
    from: '      if (readRecords().malformedTail) faults.push({ code: "MALFORMED_TAIL"',
    to: '      if (false && readRecords().malformedTail) faults.push({ code: "MALFORMED_TAIL"',
    expect: /MALFORMED_TAIL|FAILED_BEFORE_COMMIT/ },

  { id: "S22", what: "honour the store override OUTSIDE a test context", file: RUN, test: T, named: "P34 ·",
    from: '  if (!inVerifiedTestContext(env)) {\n    throw new AuditStoreOverrideForbidden(',
    to: '  if (false && !inVerifiedTestContext(env)) {\n    throw new AuditStoreOverrideForbidden(',
    expect: /an override was honoured with env|Missing expected exception/ },

  { id: "S27", what: "let the recorder version create a false cross-build conflict", file: EVENT, test: T, named: "P43 · P46 ·",
    from: '  "recordedAt", "previousEventHash", "eventHash", "migratedAt", "softwareVersion",',
    to: '  "recordedAt", "previousEventHash", "eventHash", "migratedAt",',
    expect: /still conflict across builds|the recorder's build is still part of occurrence identity|conflicting duplicate/ },

  /* Added 23 Sep 2026 with the repair of P15·P22's leak check, which fired on hex coincidence. A leak check that
   * cannot fire on a REAL leak is worth nothing, so this carries the disagreeing value into the event. */
  { id: "S-LEAK", what: "carry a disagreeing VALUE into a conflict's audit event", test: T, named: "P15 · P22 ·",
    edits: [
      { file: ADAPTERS, from: '      return { state: "CONFLICTING", fields: fields.join(",") };', to: '      return { state: "CONFLICTING", fields: fields.join(","), offered: fields.map((k) => String(record[k])).join(",") };' },
      { file: BOUNDARY, from: '      extraMetadata: { conflictingFields: String(found.fields ?? "UNNAMED") },', to: '      extraMetadata: { conflictingFields: String(found.fields ?? "UNNAMED"), offeredValues: String(found.offered ?? "") },' },
    ],
    expect: /the conflict report leaked a disagreeing VALUE/ },
];

/** The artefact LAW 1 protects. Hashed as raw bytes. */
const PRODUCTION = ["audit-trail/events.jsonl", "audit-trail/head.json"];
const productionHashes = () => Object.fromEntries(PRODUCTION.map((p) => [p, existsSync(join(REPO, p)) ? shaBytes(readFileSync(join(REPO, p))) : "ABSENT"]));

/** Names of failing TOP-LEVEL tests in a TAP stream (`not ok N - name`, at column 0). */
export const failingNames = (tap) => [...tap.matchAll(/^not ok \d+ - (.+?)(?: # .*)?$/gm)].map((m) => m[1]);

export function runSabotages(list, { log = console.log } = {}) {
  /* A sabotage is ONE edit ({file, from, to}) or several ({edits: [...]}) that together make one defect. */
  const editsOf = (s) => s.edits ?? [{ file: s.file, from: s.from, to: s.to }];
  const originals = new Map();
  for (const f of new Set(list.flatMap((x) => editsOf(x).map((e) => e.file)))) originals.set(f, readFileSync(join(REPO, f)));
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    for (const [f, bytes] of originals) writeFileSync(join(REPO, f), bytes);
  };
  process.on("exit", restore);
  process.on("SIGINT", () => { restore(); process.exit(130); });
  process.on("uncaughtException", (e) => { restore(); console.error(e); process.exit(1); });

  const prodBefore = productionHashes();
  const results = [];
  for (const s of list) {
    const edits = editsOf(s);
    const files = [...new Set(edits.map((e) => e.file))];
    const before = files.map((f) => shaBytes(originals.get(f))).join(",");
    /* Apply the edits in order to an in-memory copy per file; every anchor must occur exactly once when applied. */
    const texts = new Map(files.map((f) => [f, originals.get(f).toString("utf8")]));
    const badAnchor = edits.map((e) => ({ e, n: texts.get(e.file).split(e.from).length - 1 })).find(({ e, n }) => {
      if (n === 1) texts.set(e.file, texts.get(e.file).split(e.from).join(e.to));
      return n !== 1;
    });
    if (badAnchor) { results.push({ ...s, file: files.join(" + "), verdict: `NOT RUN — an anchor in ${badAnchor.e.file} occurs ${badAnchor.n} time(s)`, before }); continue; }

    for (const f of files) writeFileSync(join(REPO, f), Buffer.from(texts.get(f), "utf8"));
    const landed = edits.every((e) => {
      const now = readFileSync(join(REPO, e.file));
      return shaBytes(now) !== shaBytes(originals.get(e.file)) && now.toString("utf8").includes(e.to);
    });

    let output = "";
    try {
      output = execFileSync(process.execPath, ["--test", "--test-reporter=tap", s.test], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 28 });
    } catch (err) { output = `${err.stdout ?? ""}${err.stderr ?? ""}`; }
    const failed = Number((output.match(/^# fail (\d+)$/m) ?? [0, 0])[1]);
    const failing = failingNames(output);
    const namedFailed = failing.some((n) => n.startsWith(s.named));
    const reason = s.expect.test(output);

    for (const f of files) writeFileSync(join(REPO, f), originals.get(f));
    const after = files.map((f) => shaBytes(readFileSync(join(REPO, f)))).join(",");
    const restoredClean = after === before;
    const verdict = !landed ? "SABOTAGE DID NOT LAND"
      : failed === 0 ? "LANDED BUT GREEN — the guard is dead"
      : !namedFailed ? "RED, BUT NOT ON THE NAMED TEST"
      : !reason ? "RED ON THE NAMED TEST, FOR THE WRONG REASON"
      : "RED, named test, intended reason";
    results.push({ ...s, file: files.join(" + "), landed, failed, failing, namedFailed, reason, before, after, restoredClean, verdict });
    log(`  ${verdict.startsWith("RED, named") && restoredClean ? "ok  " : "🔴  "} ${s.id.padEnd(7)} failed=${String(failed).padStart(2)} ${verdict}`);
  }
  restore();
  const prodAfter = productionHashes();
  const dirty = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" })
    .split("\n").filter((l) => l.trim() && !l.startsWith("??"));
  const residue = [...originals.keys()].filter((f) => shaBytes(readFileSync(join(REPO, f))) !== shaBytes(originals.get(f)));
  return { results, prodBefore, prodAfter, productionUntouched: PRODUCTION.every((p) => prodBefore[p] === prodAfter[p]), dirty, residue };
}

export function renderEvidence({ results, prodBefore, prodAfter, productionUntouched, dirty, residue }, { title, head }) {
  const proved = results.filter((r) => r.verdict === "RED, named test, intended reason" && r.restoredClean);
  const out = [];
  out.push(title, "");
  out.push(`Engine tree: ${head}. Harness: test/helpers/f08-sabotage.mjs (committed). Node ${process.version}.`);
  out.push("Each sabotage replaces ONE anchor that occurs exactly once, confirms the bytes changed and hold the sabotage (LANDED),");
  out.push("runs its test file with the TAP reporter, requires fail > 0 (RED), requires the NAMED test among the failing tests,");
  out.push("requires the intended reason in the output, restores the original bytes, and compares raw-byte sha256 before/after.");
  out.push("No sabotage aims at the production audit trail; every firing case writes to a stand-in or a confined store.");
  out.push("");
  out.push("RESULTS");
  for (const r of results) {
    out.push(`${r.id.padEnd(8)} landed=${r.landed} red=${r.failed > 0} failed=${r.failed ?? "-"} namedTestFailed=${r.namedFailed} reason=${r.reason} restored=${r.restoredClean} — ${r.what}`);
    out.push(`         target ${r.file} · named test "${r.named}…" in ${r.test}`);
    out.push(`         sha256 before ${r.before} · after ${r.after ?? "-"}`);
    if (r.failing?.length) out.push(`         failing tests: ${r.failing.join(" | ")}`);
    out.push(`         verdict: ${r.verdict}`);
  }
  out.push("");
  out.push(`TOTAL ${results.length} · PROVED ${proved.length} · NOT PROVED ${results.length - proved.length}`);
  out.push(`residue in sabotaged files after restore: ${residue.length}${residue.length ? " — " + residue.join(", ") : ""}`);
  out.push(`tracked modifications after restore (excluding this evidence file): ${dirty.filter((l) => !/runs\/audit\/f08-sabotage/.test(l)).length}`);
  out.push("");
  out.push("PRODUCTION AUDIT TRAIL (LAW 1 — hashed around the whole run, raw bytes)");
  for (const p of Object.keys(prodBefore)) out.push(`  ${p}  before ${prodBefore[p]}  after ${prodAfter[p]}`);
  out.push(`  untouched: ${productionUntouched}`);
  return out.join("\n") + "\n";
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const only = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
  const outArg = (process.argv.find((a) => a.startsWith("--out=")) ?? "").slice(6);
  const list = only.length ? SABOTAGES.filter((s) => only.includes(s.id)) : SABOTAGES;
  console.log("§10 · SABOTAGE — landed · named test RED · intended reason · restored by raw-byte hash\n");
  const run = runSabotages(list);
  const bad = run.results.filter((r) => !(r.verdict === "RED, named test, intended reason" && r.restoredClean)).length;
  console.log(`\n${run.results.length} sabotage(s) · ${run.results.length - bad} proved · ${bad} NOT proved · residue ${run.residue.length} · production untouched ${run.productionUntouched}`);
  if (outArg) {
    const head = execFileSync("git", ["-C", REPO, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    writeFileSync(join(REPO, outArg), renderEvidence(run, { title: "F08 SABOTAGE EVIDENCE — the established set, re-run (§10)", head }));
    console.log(`evidence written: ${outArg}`);
  }
  process.exit(bad === 0 && run.residue.length === 0 && run.productionUntouched ? 0 : 1);
}
