#!/usr/bin/env node
/**
 * THE DETECTION RUNNER — the production entry point for all six generic detectors.
 *
 *   node bin/detect.mjs --bundle=<file.mjs|file.json> --run-at=<iso>
 *   node bin/detect.mjs --bundle=<…> --run-at=<…> --expect=<file.json>
 *   node bin/detect.mjs --bundle=<…> --run-at=<…> --out=<dir> --confirm
 *
 * 🔴 IT IS TOLD NOTHING ABOUT WHAT IT IS LOOKING AT. A bundle of generic evidence goes in; a
 * findings output comes out. There is no subject list, no expected class, no label, no count and no
 * knowledge of which input ought to fail. Point it at anything and it does the same thing.
 *
 * 🔴 `--expect` IS READ AFTER THE FINDINGS ARE WRITTEN AND HASHED, NEVER BEFORE. The ordering is
 * the point: the output is closed before anything that knows the answers is allowed near it, so
 * expectations cannot reach a detector even by accident.
 *
 * 🔴 NO CLOCK. `--run-at` is declared by the caller, so the same evidence produces the same bytes
 * and therefore the same hash on any machine, on any day.
 *
 * Writing is a LOCAL write and needs --confirm. Reading and reporting need no flag.
 */
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { runDetectors, serialiseFindings } from "../src/detect/run.mjs";
import { readTree, readArchivedPages } from "../src/discover/corpus.mjs";
import { buildBundle } from "../src/discover/bundle.mjs";
import { score } from "../src/detect/score.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;

const bundlePath = flag("bundle");
const runAt = flag("run-at");
const outDir = flag("out");
const expectPath = flag("expect");

if (!bundlePath || !runAt) {
  console.error("usage: node bin/detect.mjs --bundle=<file> --run-at=<iso> [--expect=<file>] [--out=<dir> --confirm]");
  console.error("🔴 there is no default bundle and no default clock — a runner that picks its own input measures nothing in particular");
  process.exitCode = 2;
} else {
  const permission = writePermission({ target: LOCAL, argv, env: process.env });
  if (outDir) announceWritePermission(permission);

  /** A bundle may be JSON, or a module that default-exports one. Both are read as data. */
  const loadBundle = async (p) => {
    const abs = resolve(p);
    if (abs.endsWith(".json")) return JSON.parse(readFileSync(abs, "utf8"));
    const mod = await import(pathToFileURL(abs).href);
    return mod.default;
  };

  /**
   * 🔴 DISCOVERY FROM GENERIC ROOTS — the only mode the sealed examination may use.
   *
   * `--discover` takes ROOTS: a repository tree, a directory of archived responses, sitemap
   * documents, a declared registry. Not one suspected file, route, component, authority or count.
   * Everything the comparators judge is found by walking those roots, so nothing an operator knows
   * about the answers can reach a detector — including anything the operator knows by accident.
   */
  const discoverBundle = () => {
    const repoRoots = argv.filter((a) => a.startsWith("--repo=")).map((a) => a.slice("--repo=".length));
    const pageRoots = argv.filter((a) => a.startsWith("--pages=")).map((a) => a.slice("--pages=".length));
    const sitemapPaths = argv.filter((a) => a.startsWith("--sitemap=")).map((a) => a.slice("--sitemap=".length));
    const registryPath = flag("registry");
    const missRun = flag("miss-run");
    if (repoRoots.length === 0 || pageRoots.length === 0) {
      throw new Error("--discover needs at least one --repo=<dir> and one --pages=<dir>; there is no default root, because a runner that chooses its own input examines nothing in particular");
    }
    const files = repoRoots.flatMap((r) => readTree(r));
    const pages = [];
    for (const root of pageRoots) {
      for (const a of readArchivedPages(root)) {
        const url = a.headersRecord?.url ?? a.headersRecord?.requests?.[0]?.url ?? null;
        if (!url) continue; // a response with no URL cannot be attributed to a page, and is not invented one
        pages.push({ url, html: a.html, headersRecord: a.headersRecord });
      }
    }
    const sitemapXml = sitemapPaths.flatMap((p) => {
      const abs = resolve(p);
      if (!existsSync(abs)) return [];
      if (statSync(abs).isDirectory()) return readdirSync(abs).filter((f) => f.endsWith(".xml")).map((f) => readFileSync(join(abs, f), "utf8"));
      return [readFileSync(abs, "utf8")];
    });
    let registry = { readable: false, unreadableReason: "no --registry root was supplied" };
    if (registryPath) {
      try {
        const abs = resolve(registryPath);
        const records = [];
        const walkRegistry = (dir) => {
          for (const e of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, e.name);
            if (e.isDirectory()) { walkRegistry(full); continue; }
            const text = readFileSync(full, "utf8");
            for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
              records.push({ authority: m[1].toLowerCase(), predicate: "cited-as-authority", value: m[1].toLowerCase() });
            }
          }
        };
        if (existsSync(abs)) { statSync(abs).isDirectory() ? walkRegistry(abs) : null; registry = { readable: true, records }; }
        else registry = { readable: false, unreadableReason: `the registry root ${registryPath} does not exist` };
      } catch (e) { registry = { readable: false, unreadableReason: `the registry could not be read: ${e.message}` }; }
    }
    console.log(`\nDISCOVERY — roots only, no suspected locations`);
    console.log(`  repository files read : ${files.length} (from ${repoRoots.length} root(s))`);
    console.log(`  archived pages read   : ${pages.length} (from ${pageRoots.length} root(s))`);
    console.log(`  sitemap documents     : ${sitemapXml.length}`);
    console.log(`  registry              : ${registry.readable ? `READ, ${registry.records.length} record(s)` : `UNREADABLE — ${registry.unreadableReason}`}`);
    const b = buildBundle({ files, pages, sitemapXml, registry, missRunRequired: missRun === null ? undefined : Number(missRun) });
    console.log(`  candidates discovered : ${b.populations.discovered} · bound ${b.populations.bound} · unbound ${b.populations.unbound}`);
    for (const [k, v] of Object.entries(b.populations.byComparator)) console.log(`      ${k}: discovered ${v.discovered} · bound ${v.bound} · unbound ${v.unbound}`);
    return b;
  };

  const bundle = bundlePath === "discover" ? discoverBundle() : await loadBundle(bundlePath);
  const result = runDetectors({ bundle, runAt });
  const serialised = serialiseFindings(result);
  const digest = createHash("sha256").update(serialised).digest("hex");

  const counts = { FINDING: 0, CLEAN: 0, UNKNOWN: 0, NOT_APPLICABLE: 0 };
  for (const d of result.detectors) for (const o of d.outcomes) counts[o.outcome] += 1;

  console.log(`\nDETECTION RUN — declared runAt ${result.runAt}`);
  console.log("─".repeat(78));
  for (const d of result.detectors) {
    const c = { FINDING: 0, CLEAN: 0, UNKNOWN: 0, NOT_APPLICABLE: 0 };
    for (const o of d.outcomes) c[o.outcome] += 1;
    console.log(`  ${d.key}  ${d.name.padEnd(30)} FINDING ${String(c.FINDING).padStart(3)} · CLEAN ${String(c.CLEAN).padStart(3)} · UNKNOWN ${String(c.UNKNOWN).padStart(3)} · N/A ${String(c.NOT_APPLICABLE).padStart(3)}   (${d.outcomes.length} outcome(s))`);
  }
  console.log(`  TOTAL: FINDING ${counts.FINDING} · CLEAN ${counts.CLEAN} · UNKNOWN ${counts.UNKNOWN} · NOT_APPLICABLE ${counts.NOT_APPLICABLE}`);
  console.log(`  findings sha256: ${digest}`);

  /* 🔴 THE OUTPUT IS WRITTEN AND CLOSED BEFORE ANY EXPECTATION IS READ. */
  if (outDir) {
    if (!permission.mayWrite) {
      console.log(`\n[dry-run] would write findings to ${outDir} — pass --confirm to write`);
    } else {
      const dest = confineToRepo(join(outDir, "findings.json"));
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, serialised);
      writeFileSync(confineToRepo(join(outDir, "findings.sha256")), `${digest}  findings.json\n`);
      console.log(`\nwrote ${dest}`);
      console.log(`wrote ${join(outDir, "findings.sha256")}`);
    }
  }

  if (expectPath) {
    const expect = JSON.parse(readFileSync(resolve(expectPath), "utf8"));
    const s = score({ findings: result, requiredReds: expect.requiredReds, controls: expect.controls });
    console.log(`\nSCORE — against the frozen expectation set, applied to the CLOSED output above`);
    console.log("─".repeat(78));
    for (const r of s.reds) console.log(`  ${r.id.padEnd(6)} ${r.result.padEnd(22)} ${r.evidence}`);
    for (const c of s.controls) console.log(`  ${c.id.padEnd(6)} ${c.result.padEnd(22)} ${c.evidence}`);
    console.log(`\n  detected ${s.detected}/${s.redTotal} · unflagged ${s.unflagged}/${s.controlTotal} · false positives ${s.falsePositives} · unevaluated ${s.unevaluated}`);
    console.log(`  RESULT: ${s.pass ? "PASS" : "FAIL"}`);
    if (outDir && permission.mayWrite) {
      writeFileSync(confineToRepo(join(outDir, "score.json")), JSON.stringify({ findingsSha256: digest, ...s }, null, 2) + "\n");
      console.log(`  wrote ${join(outDir, "score.json")}`);
    }
    process.exitCode = s.pass ? 0 : 1;
  }
}
