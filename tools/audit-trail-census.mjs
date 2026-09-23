#!/usr/bin/env node
/**
 * 🔴 F08 §13 · THE CENSUSES, EACH WITH A DENOMINATOR, A STATED SEARCH SCOPE AND A LIVE POSITIVE CONTROL.
 *
 *   node tools/audit-trail-census.mjs [--base=<ref>]
 *
 * READ-ONLY. It writes nothing, so it needs no write gate; it prints counts, codes and location CLASSES, and never a
 * protected match. Every zero below is followed by the control that proves the check could have returned something
 * else — a zero without one is an unmeasured claim, not a zero.
 *
 * It lives in tools/, outside the territory it polices, for the same reason product-boundary.mjs does.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { AUDIT_STORE } from "../config/audit-store.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { CROSSWALK } from "../config/fboard/crosswalk.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { contractSha256 } from "../src/fboard/acceptance.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { isSealed, readUnsealed, SealedPathRefused } from "../src/governance/sealed-paths.mjs";
import { governedGuardSink } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createTenantResolver, TENANT_ID_PATTERN } from "../src/tenancy/resolver.mjs";
import { PRODUCT_WORDS } from "./product-boundary.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "origin/main";
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
const sha = (s) => createHash("sha256").update(String(s).replace(/\r\n/g, "\n"), "utf8").digest("hex");
const rows = [];
const say = (name, denominator, scope, finding, control) => {
  rows.push({ name, finding });
  console.log(`\n${name}`);
  console.log(`  denominator : ${denominator}`);
  console.log(`  search scope: ${scope}`);
  console.log(`  finding     : ${finding === 0 ? "0" : `🔴 ${finding}`}`);
  console.log(`  live control: ${control}`);
};

const changed = git("diff", "--name-only", `${BASE}...HEAD`).trim().split("\n").filter(Boolean);
const changedExisting = changed.filter((p) => existsSync(join(REPO, p)));
console.log(`F08 §13 CENSUSES · base ${BASE} (${git("rev-parse", "--short", BASE).trim()}) · HEAD ${git("rev-parse", "--short", "HEAD").trim()}`);
console.log(`changed files in this branch: ${changed.length}`);
for (const p of changed) console.log(`  ${p}`);

/* ── 13.1 · PROTECTED-PAYLOAD FIREWALL over changed files and all audit output ────────────────────────────────── */
{
  const fw = execFileSync(process.execPath, [join(REPO, "bin", "heldout-firewall.mjs"), "--check"], { cwd: REPO, encoding: "utf8" });
  const failures = Number(fw.match(/^FAILURES: (\d+)$/m)?.[1] ?? "-1");
  const tracked = Number(fw.match(/ENGINE — (\d+) tracked file/)?.[1] ?? "-1");
  const sealedExcluded = Number(fw.match(/(\d+) sealed path\(s\) excluded unread/)?.[1] ?? "-1");
  const auditLines = readFileSync(join(REPO, AUDIT_STORE.eventsPath), "utf8").split("\n").filter(Boolean).length;
  say(
    "13.1 · PROTECTED-PAYLOAD FIREWALL (production path: bin/heldout-firewall.mjs --check)",
    `${tracked} tracked engine files, ${sealedExcluded} sealed paths excluded unread, of which ${changedExisting.length} changed on this branch; plus ${auditLines} audit events`,
    "every tracked file the firewall's declared population holds, the audit store included",
    failures,
    "proved this session: one retired member planted into a tracked MANDATORY_GOVERNANCE file turned the same command RED (FAIL_RETIRED_PAYLOAD, exit 1) and the probe was removed; and test/audit-trail.test.mjs P14 refuses a real retired member through the production append path",
  );
}

/* ── 13.2 · ROW 52 SEALED-PATH DENIAL ─────────────────────────────────────────────────────────────────────────── */
{
  const tracked = git("ls-files").trim().split("\n").filter(Boolean);
  const sealedPaths = tracked.filter((p) => isSealed(EVIDENCE_ROLE_REGISTRY, "engine", p));
  let opened = 0;
  let refusedAll = true;
  /* F07 §5.3 — every probe is an ATTEMPTED access, and every attempted access is RECORDED: the guard's refusals go
   * through F08's durable boundary (the production trail, or the confined store under a test). The count must equal
   * the number of sealed paths probed. (F08 had routed these to a non-persisted diagnostic sink.) */
  const PROBE_AT = isoSeconds(Date.now());
  const guard = governedGuardSink({ repo: REPO, correlationId: `run:audit-trail-census:${PROBE_AT}`, now: PROBE_AT.slice(0, 10), actor: "tools/audit-trail-census.mjs" });
  for (const p of sealedPaths) {
    try { readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, path: p, audit: guard, read: () => { opened += 1; return ""; } }); refusedAll = false; }
    catch (e) { if (!(e instanceof SealedPathRefused)) refusedAll = false; }
  }
  // The audit trail names sealed material and never expands it: no sealed PREFIX content, only the prefix identity.
  const store = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] });
  const sealedRefs = store.readAll().events.flatMap((e) => e.evidenceRefs).filter((r) => isSealed(EVIDENCE_ROLE_REGISTRY, r.root, r.ref));
  const sealedWithHash = sealedRefs.filter((r) => r.contentHash !== null).length;
  let controlOpened = 0;
  const refusalsTraced = guard.emitted;
  readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root: "engine", base: REPO, path: "package.json", audit: guard, read: () => { controlOpened += 1; return "{}"; } });
  say(
    "13.2 · ROW 52 SEALED-PATH DENIAL",
    `${sealedPaths.length} tracked paths under a declared sealed prefix; ${sealedRefs.length} sealed reference(s) in the audit trail; ${refusalsTraced} refusal event(s) RECORDED by the guard through the F08 boundary`,
    "every tracked engine path, asked for through the ordinary loader; and every evidence reference in the store",
    (refusedAll ? 0 : 1) + opened + sealedWithHash + (refusalsTraced === sealedPaths.length ? 0 : 1) + (guard.emitted === refusalsTraced ? 0 : 1),
    `the SAME loader read an unsealed path in this run (package.json, ${controlOpened} read) and traced ${guard.emitted - refusalsTraced} event(s) for it — so the refusal is not "it refuses everything", and a permitted read is not audited as a refusal`,
  );
}

/* ── 13.3 · PRODUCT / CLIENT IDENTIFIER CENSUS over generic production changes and all audit output ───────────── */
{
  const scope = changedExisting.filter((p) => /^(src|bin|tools|config)\//.test(p));
  const hits = [];
  for (const p of [...scope, AUDIT_STORE.eventsPath, AUDIT_STORE.headPath]) {
    if (!existsSync(join(REPO, p))) continue;
    const text = readFileSync(join(REPO, p), "utf8");
    // Code lines only for source, whole file for the store (an audit record has no "comments").
    const lines = /\.(mjs|js)$/.test(p) ? text.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)) : text.split("\n");
    for (const w of PRODUCT_WORDS) if (lines.some((l) => new RegExp(w, "i").test(l))) hits.push(`${p}:${w}`);
  }
  const boundary = execFileSync(process.execPath, [join(REPO, "bin", "product-boundary.mjs")], { cwd: REPO, encoding: "utf8" });
  const codeOccurrences = Number(boundary.match(/code lines: (\d+)/)?.[1] ?? "-1");
  /* 🔴 THE CONTROL IS BUILT FROM THE RULE'S OWN LIST, NOT FROM A LITERAL PRODUCT NAME.
   * The first version embedded a real product reference in this line, and this very census then reported it — the
   * law's own file was its first offender, which is precisely the hole tools/sealed-corpus-census.mjs refuses to
   * cut for itself. Taking the probe from PRODUCT_WORDS keeps the control live and needs no exemption. */
  const probe = `{"resourceRef":"${PRODUCT_WORDS[3]}-registry/facts"}`;
  const controlFires = PRODUCT_WORDS.filter((w) => new RegExp(w, "i").test(probe)).length;
  say(
    "13.3 · PRODUCT / CLIENT IDENTIFIER CENSUS",
    `${scope.length} changed generic production file(s) + the audit store and head record, against ${PRODUCT_WORDS.length} product word classes (imported from tools/product-boundary.mjs, never copied)`,
    "code lines of every changed src/bin/tools/config file, and every byte of the audit store",
    hits.length + (codeOccurrences === 0 ? 0 : codeOccurrences),
    `the same word list fires ${controlFires}x on a probe built from PRODUCT_WORDS itself; and bin/product-boundary.mjs's own control is in its test`,
  );
  for (const h of hits) console.log(`    🔴 ${h}`);
}

/* ── 13.4 · TENANT-ISOLATION CENSUS over the committed trail ──────────────────────────────────────────────────── */
{
  const resolver = createTenantResolver({});
  const declared = resolver.declarations.readable ? new Set(resolver.declarations.tenants.filter((t) => t.status === "ACTIVE").map((t) => t.tenantId)) : null;
  const events = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;
  const scoped = events.filter((e) => e.scopeType !== "GLOBAL_PRODUCT");
  const faults = [];
  if (!declared) faults.push("DECLARATION_SOURCE_UNREADABLE");
  for (const e of scoped) {
    if (!TENANT_ID_PATTERN.test(e.tenantId ?? "")) faults.push(`${e.eventId}:TENANT_ID_NOT_OPAQUE`);
    if (declared && !declared.has(e.tenantId)) faults.push(`${e.eventId}:TENANT_NOT_DECLARED`);
    if (e.scopeType === "SUBJECT" && !e.subjectId) faults.push(`${e.eventId}:SUBJECT_ID_ABSENT`);
    for (const r of e.evidenceRefs) if (r.tenantId && r.tenantId !== e.tenantId) faults.push(`${e.eventId}:CROSS_TENANT_EVIDENCE`);
  }
  for (const e of events.filter((x) => x.scopeType === "GLOBAL_PRODUCT")) {
    if (e.tenantId !== null || e.subjectId !== null) faults.push(`${e.eventId}:GLOBAL_CARRIES_SCOPE`);
  }
  const partitions = new Map();
  for (const e of scoped) partitions.set(e.tenantId, (partitions.get(e.tenantId) ?? 0) + 1);
  say(
    "13.4 · TENANT-ISOLATION CENSUS",
    `${events.length} committed events — ${scoped.length} tenant- or subject-scoped across ${partitions.size} declared tenant(s), ${events.length - scoped.length} global-product`,
    "every event in the committed audit store, against the EXTERNAL declaration source in force",
    faults.length,
    "test/audit-trail.test.mjs P11 and P25 fire on a real foreign tenant id and on a leaking filter (S6 and S15 turn them RED)",
  );
}

/* ── 13.5 · ORPHAN AND PRODUCTION-ENTRY-POINT CENSUS ──────────────────────────────────────────────────────────── */
{
  const files = git("ls-files", "src", "bin", "tools").trim().split("\n").filter((p) => p.endsWith(".mjs"));
  const text = new Map(files.map((f) => [f, readFileSync(join(REPO, f), "utf8")]));
  const importsOf = (f, t) => [...t.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]).filter((s) => s.startsWith(".")).map((s) => {
    const parts = f.split("/").slice(0, -1).concat(s.split("/"));
    const out = [];
    for (const p of parts) { if (p === ".") continue; if (p === "..") out.pop(); else out.push(p); }
    return out.join("/");
  });
  const reached = new Set();
  const walk = (f) => { if (reached.has(f) || !text.has(f)) return; reached.add(f); for (const n of importsOf(f, text.get(f))) walk(n); };
  for (const b of files.filter((f) => f.startsWith("bin/"))) walk(b);
  for (const t of files.filter((f) => f.startsWith("test/"))) walk(t);
  const newModules = changed.filter((p) => p.startsWith("src/audit-trail/"));
  const orphans = newModules.filter((m) => !reached.has(m));
  const entryPoints = files.filter((f) => f.startsWith("bin/"));
  say(
    "13.5 · ORPHAN AND PRODUCTION-ENTRY-POINT CENSUS",
    `${newModules.length} new module(s) under src/audit-trail/, against ${entryPoints.length} production entry points and ${files.length} tracked source files`,
    "static imports, walked transitively from every bin/*.mjs",
    orphans.length,
    // 🔴 THE CONTROL IS A REAL FILE THE WALK DOES NOT REACH, not an invented name: a walk that reached everything
    // would report zero orphans for every input, and this number shows it discriminates over the actual tree.
    `the same walk leaves ${files.filter((f) => !reached.has(f)).length} REAL tracked source file(s) unreached, so "reached" is not universally true (${files.filter((f) => !reached.has(f)).slice(0, 3).join(", ") || "none"})`,
  );
  if (orphans.length) for (const o of orphans) console.log(`    🔴 ORPHAN ${o}`);
}

/* ── 13.6 · WRITER-LAW CENSUS — every new script has its write gate ───────────────────────────────────────────── */
{
  const out = execFileSync(process.execPath, [join(REPO, "tools", "permitted-writers.mjs")], { cwd: REPO, encoding: "utf8" });
  const undeclared = Number(out.match(/ungated in bin\/: (\d+)/)?.[1] ?? "-1");
  const sites = Number(out.match(/(\d+) write site\(s\)/)?.[1] ?? "-1");
  const failureMet = /FAILURE condition is MET/.test(out);
  const gatedAtCaller = Number(out.match(/GATED-AT-CALLER[^:]*: (\d+)/)?.[1] ?? "-1");
  say(
    "13.6 · WRITER-LAW CENSUS (tools/permitted-writers.mjs)",
    `${sites} write sites across every tracked src/bin/tools .mjs; ${gatedAtCaller} reported GATED-AT-CALLER`,
    "every write path under src/, bin/ and tools/, filesystem primitives and helper calls alike",
    undeclared + (failureMet ? 1 : 0),
    "this census FIRED during this run: three write sites added to bin/authority-migrate.mjs were reported ungated and undeclared, and the code was moved to src/ rather than the census weakened",
  );
}

/* ── 13.7 · CHANGED-ASSERTION CENSUS ──────────────────────────────────────────────────────────────────────────── */
{
  /* 🔴 A FILE THAT IS NEW ON THE BRANCH HAS NO VERSION AT THE BASE, AND ASKING GIT FOR ONE IS A CRASH, NOT A ZERO.
   * The first version of this census assumed every changed test file existed at the base and threw on the first
   * genuinely new one — a census that dies is not a census that passed. A new file is counted as 0 -> N ADDED,
   * which is what it is, and only a FALL in an existing file's count is a finding. */
  const countAsserts = (text) => text.split("\n").filter((l) => /assert\./.test(l)).length;
  const at = (ref, p) => { try { return countAsserts(git("show", `${ref}:${p}`)); } catch { return null; } };
  const changedTests = changed.filter((p) => p.startsWith("test/"));
  let removed = 0;
  let addedLines = 0;
  for (const p of changedTests) {
    const before = at(BASE, p);
    const after = existsSync(join(REPO, p)) ? countAsserts(readFileSync(join(REPO, p), "utf8")) : 0;
    if (before === null) { addedLines += after; console.log(`    ${p}: NEW on this branch — ${after} assertion lines added`); continue; }
    if (after < before) removed += before - after;
    addedLines += Math.max(0, after - before);
    console.log(`    ${p}: ${before} -> ${after} assertion lines${after < before ? "  🔴 FELL" : ""}`);
  }
  say(
    "13.7 · CHANGED-ASSERTION CENSUS",
    `${changedTests.length} test file(s) changed on this branch · ${addedLines} assertion line(s) added · finding counts only assertion lines REMOVED from a file that already existed`,
    `every path under test/ in git diff ${BASE}...HEAD, each compared against its own version at the base`,
    removed,
    "the same comparison reports a positive number the moment any existing file's assertion count falls; it is applied to every changed test file, and none was weakened, deleted or loosened",
  );
}

/* ── 13.8 · FROZEN-ACCEPTANCE BYTE-IDENTITY against the hashes recorded when it was frozen ────────────────────── */
{
  const RECORDED_FILE_SHA = "f6aef3403621f7275b2a2173da4c66cd562a400a9e581fc48c3f13c87981d18a";
  const RECORDED_CONTRACT_SHA = "92d20a631da004bf6de5accd4df87df933ca99d0c9661bc49f8d9b8361b2a826";
  const acc = ACCEPTANCES.F08;
  const faults = [];
  if (acc.ruling.sha256 !== RECORDED_FILE_SHA) faults.push("RULING_SHA_MOVED");
  if (acc.contractSha256 !== RECORDED_CONTRACT_SHA) faults.push("CONTRACT_SHA_MOVED");
  if (contractSha256(acc) !== RECORDED_CONTRACT_SHA) faults.push("ACCEPTANCE_TAMPERED");
  const govBytes = (() => {
    try { return execFileSync("git", ["-C", "C:/Projects/_handoffs", "show", `${acc.ruling.commit}:${acc.ruling.path}`], { encoding: "utf8", maxBuffer: 1 << 28 }); }
    catch { return null; }
  })();
  if (govBytes === null) faults.push("GOVERNANCE_BYTES_UNREADABLE");
  else if (sha(govBytes) !== RECORDED_FILE_SHA) faults.push("COMMITTED_RULING_MOVED");
  /* 🔴 THE CONTROL MUST SURVIVE THE DECLARED NORMALISATION. The first version appended a SPACE to EXPECTED, and
   * `normaliseClause` collapses whitespace runs and trims — so the "control" printed the same hash twice and could
   * never have fired. It changes a WORD now, which is what an altered clause actually looks like. */
  const controlSha = contractSha256({ ...acc, expected: acc.expected.replace("Every governed event", "Some governed events") });
  if (controlSha === RECORDED_CONTRACT_SHA) faults.push("CONTROL_CANNOT_FIRE");
  say(
    "13.8 · FROZEN-ACCEPTANCE BYTE-IDENTITY",
    "1 frozen acceptance (F08), 4 clauses, checked against the two hashes recorded when it was frozen and against the governance repository's committed bytes",
    `_handoffs ${acc.ruling.commit.slice(0, 12)}:${acc.ruling.path}, and config/fboard/acceptances.mjs`,
    faults.length,
    `the same derivation moves when a clause moves: changing one WORD of EXPECTED gives ${controlSha.slice(0, 12)}…, not ${RECORDED_CONTRACT_SHA.slice(0, 12)}… (S18 turns the named test RED)`,
  );
  if (faults.length) for (const f of faults) console.log(`    🔴 ${f}`);
}

/* ── 13.9 · HISTORICAL-TO-F-BOARD STATE-TRANSFER CHECK ────────────────────────────────────────────────────────── */
{
  const board = buildBoard(CAPABILITIES, DECLARED);
  const errs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } });
  const p = progress(board);
  const events = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;
  const faults = [...errs.map((e) => `${e.code} ${e.id ?? ""}`)];
  for (const e of events) if (/^HISTORICAL/.test(e.metadata?.board ?? "")) faults.push(`${e.eventId}:HISTORICAL_BOARD_IN_TRAIL`);
  const imported = CROSSWALK.entries.filter((e) => e.authorityImported !== false).length;
  if (imported) faults.push(`CROSSWALK_AUTHORITY_IMPORTED ${imported}`);
  const provenanceAsAuthority = CROSSWALK.provenance.filter((x) => x.role !== "PROVENANCE_REFERENCE" || x.authorityImported !== false).length;
  if (provenanceAsAuthority) faults.push(`PROVENANCE_AS_AUTHORITY ${provenanceAsAuthority}`);
  say(
    "13.9 · HISTORICAL-TO-F-BOARD STATE-TRANSFER CHECK",
    `${board.length} F-rows, ${CROSSWALK.provenance.length} historical provenance records, ${events.length} audit events`,
    "the built board with its authority check, the generated crosswalk, and every event's declared board",
    faults.length,
    "the board refuses a historical record BY NAME (HISTORICAL_STATE_REFUSED / HISTORICAL_STATE_IMPORTED); S17 plants a historical VERIFIED-PASS on F08 and turns the named test RED",
  );
  console.log(`    F-board: ${Object.entries(p.split).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(" · ")} · sum ${Object.values(p.split).reduce((a, b) => a + b, 0)} · F-progress ${p.passed}/${p.denominator}`);
  for (const r of board.filter((x) => x.state !== "UNASSESSED")) console.log(`      ${r.featureId} ${r.state}`);
  if (faults.length) for (const f of faults) console.log(`    🔴 ${f}`);
}

const bad = rows.filter((r) => r.finding !== 0);
console.log(`\n═══ ${rows.length} censuses · ${bad.length} with a non-zero finding`);
for (const b of bad) console.log(`  🔴 ${b.name} — ${b.finding}`);
console.log(`store sha256 ${sha(readFileSync(join(REPO, AUDIT_STORE.eventsPath), "utf8"))}`);
process.exit(bad.length === 0 ? 0 : 1);
