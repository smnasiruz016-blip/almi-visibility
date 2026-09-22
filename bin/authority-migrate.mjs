#!/usr/bin/env node
/**
 * 🔴 F05 §7 — MIGRATE THE REAL AUTHORITY CORPUS FROM COMMITTED BYTES, AND CENSUS IT (22 September 2026).
 *
 *   node bin/authority-migrate.mjs --governance-root=<dir> --governance-commit=<sha> --engine-commit=<sha> [--confirm]
 *
 * Reads ONLY committed material: file lists from `git ls-tree` at the named commits, bytes from `git show`, first-commit
 * dates from `git log`. Never the working tree, so an uncommitted edit cannot enter the corpus. Every read goes through
 * `readUnsealed` — a sealed path is refused before it is read. Prints paths, rules, hashes and counts; never content.
 *
 * Without --confirm it re-derives and compares with config/authority/corpus.mjs (exit 1 when stale). With --confirm it
 * regenerates the corpus (write-law LOCAL — src/write-law.mjs). The census (one disposition per record, remainder zero) is printed either way.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GOVERNANCE_RULES, ENGINE_RULES, EXCLUDE, SCOPE_ROOT } from "../config/authority/inclusion.mjs";
import { EVIDENCE_ROLE_REGISTRY } from "../config/evidence-roles.mjs";
import { readUnsealed } from "../src/governance/sealed-paths.mjs";
import { ruleFor, recordFromFile, census } from "../src/authority/corpus.mjs";
import { STORED_STATUSES } from "../src/authority/register.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = confineToRepo(join(ENGINE, "config", "authority", "corpus.mjs"), { label: "the generated authority corpus" });
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const govRoot = arg("governance-root"), govCommit = arg("governance-commit"), engCommit = arg("engine-commit");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const NOW = arg("now") ?? "2026-09-22";
if (!govRoot || !govCommit || !engCommit) { console.error("usage: --governance-root=<dir> --governance-commit=<sha> --engine-commit=<sha> [--confirm]"); process.exit(2); }

const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
const full = (cwd, c) => git(cwd, "rev-parse", "--verify", `${c}^{commit}`).trim();

function collect({ repo, cwd, commit, rules, prefix, root, dir = "" }) {
  const names = git(cwd, "ls-tree", "--name-only", commit, ...(dir ? [dir] : [])).split("\n").filter(Boolean);
  const out = [];
  for (const path of names) {
    const name = path.split("/").pop();
    const rule = ruleFor(rules, name, EXCLUDE);
    if (!rule) continue;
    const text = readUnsealed({ registry: EVIDENCE_ROLE_REGISTRY, root, base: "", path, read: (p) => git(cwd, "show", `${commit}:${p.replace(/\\/g, "/")}`) });
    const blob = git(cwd, "rev-parse", `${commit}:${path}`).trim();
    const firstCommitAt = git(cwd, "log", "--diff-filter=A", "--follow", "--format=%aI", commit, "--", path).trim().split("\n").pop() || null;
    out.push(recordFromFile({ rule, repo, path, name, prefix, commit, blob, text, firstCommitAt, root: SCOPE_ROOT }));
  }
  return { listed: names.length, records: out };
}

const g = full(govRoot, govCommit), e = full(ENGINE, engCommit);
const gov = collect({ repo: "_handoffs", cwd: govRoot, commit: g, rules: GOVERNANCE_RULES, prefix: "(AlmiVisibility_)?", root: "governance" });
const eng = collect({ repo: "engine", cwd: ENGINE, commit: e, rules: ENGINE_RULES, prefix: "", root: "engine" });
const drafted = [...gov.records, ...eng.records].sort((a, b) => a.authorityId.localeCompare(b.authorityId));
// The STORED status is what resolution finds for the record's own proposition and scope — never a claim. An INVALID
// record can store no status at all (null), so it stays INVALID on every later resolution.
const first = census(drafted, NOW);
const records = drafted.map((r, i) => ({ ...r, status: STORED_STATUSES.includes(first.dispositions[i].disposition) ? first.dispositions[i].disposition : null }));
const c = census(records, NOW);
if (c.dispositions.some((d, i) => d.disposition !== first.dispositions[i].disposition)) { console.error("STORED STATUS CHANGED A DISPOSITION — refusing"); process.exit(1); }

const body = `/**
 * 🔴 GENERATED — DO NOT EDIT. bin/authority-migrate.mjs, from COMMITTED bytes only.
 * Governance: _handoffs ${g} · engine: ${e} · inclusion rule: config/authority/inclusion.mjs.
 * Paths, structured identity and content hashes only — no governance prose is copied here.
 */
export const CORPUS_PROVENANCE = Object.freeze(${JSON.stringify({ governanceCommit: g, engineCommit: e, now: NOW, governanceListed: gov.listed, engineListed: eng.listed })});
export const AUTHORITY_CORPUS = Object.freeze(${JSON.stringify(records, null, 2)}.map((r) => Object.freeze(r)));
`;

console.log(`governance commit ${g} — ${gov.listed} tracked top-level names, ${gov.records.length} included`);
console.log(`engine commit     ${e} — ${eng.listed} tracked top-level names, ${eng.records.length} included`);
const byRule = {};
for (const r of records) byRule[r.inclusionRule] = (byRule[r.inclusionRule] ?? 0) + 1;
console.log("by inclusion rule:", JSON.stringify(byRule));
console.log("issuedAt source:", JSON.stringify(records.reduce((m, r) => ((m[r.issuedAtSource] = (m[r.issuedAtSource] ?? 0) + 1), m), {})));
console.log(`census (now ${NOW}): total ${c.total} · ${Object.entries(c.counts).map(([k, v]) => `${k} ${v}`).join(" · ")} · remainder ${c.remainder}`);
for (const d of c.dispositions.filter((x) => x.disposition !== "CURRENT")) console.log(`  ${d.disposition.padEnd(14)} ${d.authorityId} — ${d.reason}`);

if (permission.mayWrite) {
  writeFileSync(OUT, body, "utf8");
  console.log(`wrote ${OUT}`);
} else {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  if (cur !== body) { console.log("corpus STALE — re-run with --confirm"); process.exit(1); }
  console.log("corpus UP TO DATE");
}
if (c.remainder !== 0) process.exit(1);
