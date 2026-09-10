#!/usr/bin/env node
/**
 * GATE A — the command line.
 *
 *   node bin/gate-a.mjs --corpus <dir>            measure and report (DRY-RUN)
 *   node bin/gate-a.mjs --corpus <dir> --out <dir>   also write JSON + CSV
 *
 * ⚠️ THE WRITE LAW APPLIES TO --out, at its LOCAL level: dry-run by default, and
 * `--confirm` to actually write. It does NOT ask for ALLOW_PROD_WRITE, because
 * `--out` writes a report file on this machine and nothing else — and a safety
 * flag typed every day stops being a signal. Nothing here touches a database;
 * there is no database yet, deliberately. See src/write-law.mjs.
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
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
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
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));

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

/**
 * 🔴 WHICH GROUPS ARE ONLY A SAMPLE — and what that forbids.
 *
 * `uniqueWords` is a function of ONE page, so a sample gives an honest
 * DISTRIBUTION of it. `overlap` is a claim about a PARTICULAR PAIR, and "every
 * sibling, never a sample" was always its rule. A sample does not weaken that
 * rule — it makes overlap INAPPLICABLE: an overlap computed inside a 500-page
 * sample of a 237,413-page group is not that group's overlap and must never be
 * printed as though it were.
 */
const manifestPath = join(corpusDir, "corpus-manifest.json");
const corpusManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
const sampledGroups = new Set();
if (corpusManifest && corpusManifest.leafSampled && corpusManifest.leafSampled < (corpusManifest.groups?.["profession-origin-org"] ?? Infinity)) {
  sampledGroups.add("profession-origin-org");
}

/** min / median / max, plus the two ends of the distribution that matter. */
function distribution(values) {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const at = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { n: v.length, min: v[0], p25: at(0.25), median: at(0.5), p75: at(0.75), p95: at(0.95), max: v[v.length - 1] };
}

const report = { generatedAt: new Date().toISOString(), shellDefinition, corpus: corpusManifest, groups: [] };

for (const g of groups) {
  const pages = readGroup(join(corpusDir, g));
  const sampled = sampledGroups.has(g);
  const out = runGateA(pages, { shellDefinition });
  report.groups.push({ group: g, sampled, ...out });

  console.log(`\n── ${g} — ${out.pages} page(s)${sampled ? "  (A SAMPLE, not the whole group)" : ""} ──`);
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

  // The DISTRIBUTION, not just pass/fail. On a sampled group this is the honest
  // thing a sample can say, and on a full group it is the whole population.
  const dist = distribution(out.results.map((r) => r.uniqueWords));
  report.groups[report.groups.length - 1].uniqueWordsDistribution = dist;
  console.log(
    `  uniqueWords (threshold ${out.thresholds.MIN_UNIQUE_WORDS}): ` +
      `min ${dist.min} · p25 ${dist.p25} · median ${dist.median} · p75 ${dist.p75} · p95 ${dist.p95} · MAX ${dist.max}`,
  );
  if (sampled) {
    // The rule the owner set before the run: if even the sample's MAXIMUM is far
    // below the bar, the finding is about the whole group. If anything came
    // CLOSE, the sample has done its job and the group must be counted in full.
    const near = dist.max >= out.thresholds.MIN_UNIQUE_WORDS * 0.8;
    console.log(
      near
        ? `    🔴 the sample's MAXIMUM (${dist.max}) is within 20% of the threshold — THE SAMPLE HAS DONE ITS JOB. Count this group IN FULL before ruling on it.`
        : `    the sample's MAXIMUM (${dist.max}) is far below ${out.thresholds.MIN_UNIQUE_WORDS} — one justification covers the whole group; it does not need 237,413 separate ones.`,
    );
  }

  const keep = out.results.filter((r) => r.verdict === "KEEP").length;
  console.log(`  KEEP ${keep} · REJECT ${out.results.length - keep}`);
  const byStage = {};
  for (const r of out.results) if (r.rejectedAt) byStage[r.rejectedAt] = (byStage[r.rejectedAt] ?? 0) + 1;
  for (const [stage, n] of Object.entries(byStage)) console.log(`    rejected at ${stage}: ${n}`);

  const reachedFacts = out.results.filter((r) => r.uniquePass).length;
  console.log(`  reached stage 2 (facts): ${reachedFacts}`);

  // 🔴 The quadratic stage must never be silently empty.
  console.log(`  reached stage 3 (overlap): ${out.reachedOverlap} (eliminated before it: ${out.eliminatedBefore})`);
  if (sampled) {
    console.log(
      "    🔴 OVERLAP IS NOT REPORTED FOR THIS GROUP. It is a SAMPLE, and overlap is a claim about a\n" +
        "       particular PAIR — 'every sibling, never a sample' does not weaken here, it makes the\n" +
        "       measurement INAPPLICABLE. An overlap inside a sample is not this group's overlap.",
    );
  } else if (out.reachedOverlap === 0) {
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
    console.log(`\n[dry-run] --out ${outDir} was given but nothing was written. Add --confirm.`);
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
