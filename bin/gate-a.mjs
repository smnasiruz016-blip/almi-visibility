#!/usr/bin/env node
/**
 * GATE A — the command line.
 *
 *   node bin/gate-a.mjs --corpus <dir>            measure and report (DRY-RUN)
 *   node bin/gate-a.mjs --corpus <dir> --out <dir>   also write JSON + CSV
 *
 * ⚠️ THE WRITE LAW APPLIES TO --out. Writing files is a write path, so it obeys
 * the same rule as every other one: **dry-run by default, and a real write needs
 * BOTH `--confirm` AND `ALLOW_PROD_WRITE=1`.** Nothing here touches a database —
 * there is no database yet, deliberately.
 *
 * ── THE CORPUS ──────────────────────────────────────────────────────────────
 *
 * A directory of template GROUPS. One sub-directory per group, and inside it one
 * `.html` file per page — the RENDERED HTML as served, never the source. An
 * optional `<page>.facts.json` beside a page carries its fact records.
 *
 *     corpus/
 *       profession/                     <- one template group
 *         nursing.html
 *         nursing.facts.json            <- optional
 *       profession-origin-org/
 *         nursing__from-india__uk-nmc.html
 *
 * Two templates are never compared to each other, which is why the group is a
 * directory rather than a flag.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { writePermission, announceWritePermission } from "../src/write-law.mjs";
import { runGateA } from "../src/gate-a/run.mjs";

const argv = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = argv.indexOf(name);
  return i === -1 || i + 1 >= argv.length ? fallback : argv[i + 1];
}

const corpusDir = flag("--corpus");
const outDir = flag("--out");
const shellDefinition = flag("--shell", "B");

// The write law is announced BEFORE anything else happens, so a run that is
// about to change something never looks like a run that is about to report.
const permission = announceWritePermission(writePermission({ argv, env: process.env }));

if (!corpusDir) {
  console.error("\nusage: node bin/gate-a.mjs --corpus <dir> [--out <dir>] [--shell A|B] [--confirm]");
  process.exit(2);
}
if (!existsSync(corpusDir)) {
  console.error(`\ncorpus not found: ${corpusDir}`);
  process.exit(2);
}

/** Read one template group from a directory. */
function readGroup(dir) {
  const pages = [];
  for (const name of readdirSync(dir)) {
    if (extname(name) !== ".html") continue;
    const id = basename(name, ".html");
    const factsPath = join(dir, `${id}.facts.json`);
    pages.push({
      id,
      html: readFileSync(join(dir, name), "utf8"),
      facts: existsSync(factsPath) ? JSON.parse(readFileSync(factsPath, "utf8")) : [],
      whyThisUrl: existsSync(join(dir, `${id}.why.txt`))
        ? readFileSync(join(dir, `${id}.why.txt`), "utf8").trim()
        : "",
    });
  }
  return pages;
}

const groups = readdirSync(corpusDir).filter((n) => statSync(join(corpusDir, n)).isDirectory());
if (groups.length === 0) {
  console.error(`\nno template groups (sub-directories) in ${corpusDir}`);
  process.exit(2);
}

const report = { generatedAt: new Date().toISOString(), shellDefinition, groups: [] };

for (const g of groups) {
  const pages = readGroup(join(corpusDir, g));
  const out = runGateA(pages, { shellDefinition });
  report.groups.push({ group: g, ...out });

  console.log(`\n── ${g} — ${out.pages} page(s) ──`);
  if (out.vacuous) {
    // Count the population BEFORE the guard. An empty group is a finding.
    console.log("  🔴 EMPTY GROUP — nothing was measured. This is not a pass.");
    continue;
  }
  console.log(
    `  shell: A=${out.shell.sizeA} tokens · B=${out.shell.sizeB} tokens · ` +
      `B needs ${out.shell.minPagesForShell}/${out.pages} pages` +
      (out.shell.bEqualsA ? "  (group is small: B IS A here, the definition is doing nothing)" : ""),
  );

  const keep = out.results.filter((r) => r.verdict === "KEEP").length;
  console.log(`  KEEP ${keep} · REJECT ${out.results.length - keep}`);
  const byStage = {};
  for (const r of out.results) if (r.rejectedAt) byStage[r.rejectedAt] = (byStage[r.rejectedAt] ?? 0) + 1;
  for (const [stage, n] of Object.entries(byStage)) console.log(`    rejected at ${stage}: ${n}`);

  // 🔴 The quadratic stage must never be silently empty.
  console.log(`  reached the overlap stage: ${out.reachedOverlap} (eliminated before it: ${out.eliminatedBefore})`);
  if (out.reachedOverlap === 0) {
    console.log("    🔴 NO PAGE REACHED THE OVERLAP STAGE. That is a finding about this corpus, not a pass.");
  } else {
    console.log(`    strategy: ${out.overlapStrategy.kind} — ${out.overlapStrategy.note}`);
    if (!out.overlapStrategy.complete) {
      console.log("    ⚠️ this strategy is NOT complete — it may miss a pair, and its rate must be stated.");
    }
  }
}

// ── output ──────────────────────────────────────────────────────────────────
if (outDir) {
  if (!permission.mayWrite) {
    console.log(`\n[dry-run] --out ${outDir} was given but nothing was written. Add --confirm AND ALLOW_PROD_WRITE=1.`);
  } else {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "gate-a.json"), JSON.stringify(report, null, 2), "utf8");
    const rows = [
      "group,id,verdict,rejectedAt,totalWords,uniqueWords,qualifyingFacts,residualWords,maxOverlap,overlapAgainst",
    ];
    for (const g of report.groups) {
      for (const r of g.results ?? []) {
        rows.push(
          [
            g.group, r.id, r.verdict, r.rejectedAt ?? "",
            r.totalWords, r.uniqueWords,
            r.facts ? r.facts.qualifying : "",
            r.residualWords ?? "", r.maxOverlap ?? "", r.overlapAgainst ?? "",
          ].join(","),
        );
      }
    }
    writeFileSync(join(outDir, "gate-a.csv"), rows.join("\n"), "utf8");
    console.log(`\nwrote ${join(outDir, "gate-a.json")} and gate-a.csv`);
  }
}

console.log("");
