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
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { runDetectors, serialiseFindings } from "../src/detect/run.mjs";
import { readTree, readArchivedPages } from "../src/discover/corpus.mjs";
import { buildBundle } from "../src/discover/bundle.mjs";
import { readExternalSubject, toBundle } from "../src/adapter/external-subject.mjs";
import { observedPageSubjects, toBundle as toPageBundle, bundlesByTenant } from "../src/adapter/observed-page-subject.mjs";
import { sitemapUrlSubjects, sitemapDetectorInputsByTenant } from "../src/adapter/sitemap-subject.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { score } from "../src/detect/score.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;

/**
 * Fold several per-tenant runs into one reportable result.
 *
 * 🔴 EVERY OUTCOME KEEPS THE SCOPE IT WAS JUDGED IN. The merged result deliberately carries NO
 * run-level tenant — there isn't one, and writing the largest scope's id there would be a quiet
 * claim that the others were judged in it. An outcome without its own scope would be exactly the
 * ambiguity this whole change exists to remove.
 */
function mergeRuns(results, runAt) {
  const byKey = new Map();
  for (const { tenantId, result } of results) {
    for (const d of result.detectors) {
      if (!byKey.has(d.key)) byKey.set(d.key, { key: d.key, name: d.name, outcomes: [] });
      for (const o of d.outcomes) byKey.get(d.key).outcomes.push({ ...o, tenantId: o.tenantId ?? tenantId });
    }
  }
  return Object.freeze({
    runAt,
    tenantId: null,
    tenantIds: Object.freeze(results.map((r) => r.tenantId)),
    detectors: Object.freeze([...byKey.values()].map((d) => Object.freeze({ ...d, outcomes: Object.freeze(d.outcomes) }))),
  });
}

const bundlePath = flag("bundle");
const runAt = flag("run-at");
const outDir = flag("out");
const expectPath = flag("expect");
/* 🔴 THERE IS NO --tenant FLAG, AND ITS ABSENCE IS THE POINT.
 *
 * This runner used to accept `--tenant=<anything>` and hand that string to the binder as an
 * isolation scope. An operator's command line is not a declaration: nothing checked the value, and
 * a typo, a stale copy-paste or a guess would silently become the scope a whole run was judged in.
 * It also OVERRODE a record's own resolved scope, which is worse than inventing one.
 *
 * A scope is now resolved per resource from the external declarations, by the adapter that reads
 * the resource. There is no input left here to misuse, which is why the flag was removed rather
 * than validated. */

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

  /**
   * 🔴 READ ONE DECLARED EXTERNAL SUBJECT, THROUGH THE ENGINE'S OWN ROOT MECHANISM.
   *
   * The id selects a declared root; it is not a rule about any subject, and this runner holds no
   * knowledge of what it will find there. Nothing is copied into this repository, and a root that
   * cannot be read yields UNKNOWN rather than an empty run that looks clean.
   */
  const subjectBundle = async () => {
    const id = flag("subject");
    if (!id) throw new Error('--bundle=subject needs --subject=<declared product id>; there is no default subject, because a runner that picks its own measures nothing in particular');
    const product = await productFromArgvOrExit(["node", "x", `--product=${id}`], { usage: "node bin/detect.mjs --bundle=subject --subject=<id>" });
    const subject = await readExternalSubject({ product });
    console.log(`\nEXTERNAL SUBJECT — read-only, through the declared root`);
    console.log(`  available   : ${subject.available}`);
    if (!subject.available) console.log(`  reason      : ${subject.reason} — ${subject.detail}`);
    console.log(`  populations : ${JSON.stringify(subject.populations)}`);
    console.log(`  tenant      : ${subject.tenantId ?? "(none resolved)"}`);
    console.log(`  provenance  : ${JSON.stringify(subject.provenance ?? null)}  — productId is provenance, never a scope`);
    return { bundle: toBundle(subject), tenantId: subject.tenantId };
  };

  /**
   * 🔴 REAL OBSERVED PAGES FROM THE EXTERNAL OBSERVATION BATCH.
   *
   * The batch is UNASSIGNED, so its tenant is the batch's own identity and never a product — which
   * also means any edge from these pages to a product's subject is INVALID_CROSS_TENANT rather than
   * a rule this runner has to remember. Unbound pages are printed with their reason, because a page
   * that drops out of the population is how a joiner reports a clean rate over what it chose.
   */
  const observedPagesBundle = () => {
    const r = observedPageSubjects();
    console.log(`\nOBSERVED PAGE SUBJECTS — read-only, from the external observation batch`);
    console.log(`  batch      : ${r.batchId} (${r.classificationState})  — PROVENANCE, never a scope`);
    console.log(`  resolution : ${JSON.stringify(r.resolution)}`);
    console.log(`  tenants    : ${r.tenants.length} declared scope(s)`);
    console.log(`  pages      : ${r.population} · ${JSON.stringify(r.counts)}`);
    console.log(`  reasons    : ${JSON.stringify(r.reasons)}`);
    const sum = Object.values(r.counts).reduce((a, b) => a + b, 0);
    if (sum !== r.population) throw new Error(`the buckets sum to ${sum} but the population is ${r.population} — a page has gone missing`);

    const groups = bundlesByTenant(r);
    const offered = groups.reduce((n, g) => n + g.bundle.pageSubjects.length, 0);
    const grouped = groups.reduce((n, g) => n + g.pages.length, 0);
    console.log(`  runs       : ${groups.length} · offered ${offered} · pages in a scope ${grouped} · without a scope ${r.population - grouped}`);
    return groups.map((g) => ({ tenantId: g.tenantId, bundle: g.bundle }));
  };

  /**
   * 🔴 THE REAL SITEMAP JOIN — two independently captured populations, joined only where BOTH the
   * normalised URL and the DECLARED scope match exactly. Each side resolves its own scope from its
   * own reference; this runner joins nothing itself.
   */
  const sitemapBundles = () => {
    const pages = observedPageSubjects();
    const sm = sitemapUrlSubjects({ observedPages: pages });
    const sum = Object.values(sm.counts).reduce((a, b) => a + b, 0);
    console.log(`\nSITEMAP URL SUBJECTS — read-only, from the external sitemap collection`);
    console.log(`  collection : ${sm.batchId} (${sm.provenance.classificationState}) — PROVENANCE, never a scope`);
    console.log(`  its scope  : ${sm.collectionState} ${sm.collectionTenantId ?? ""}`);
    console.log(`  documents  : ${sm.documents} · stored URLs ${sm.population}`);
    console.log(`  counts     : ${JSON.stringify(sm.counts)} · sum ${sum} · remainder ${sm.population - sum}`);
    console.log(`  reasons    : ${JSON.stringify(sm.reasons)}`);
    for (const b of sm.bounds.filter((x) => x.bounded)) {
      console.log(`  ⚠ STORAGE BOUND: ${b.origin} stored ${b.urlsStored} of ${b.urlsTotal} counted URLs — every population above is over what was STORED`);
    }
    if (sum !== sm.population) throw new Error(`the buckets sum to ${sum} but the population is ${sm.population} — a sitemap URL has gone missing`);

    const inputs = sitemapDetectorInputsByTenant(sm, pages);
    console.log(`  runs       : ${inputs.length} · BOUND entries offered ${inputs.reduce((n, g) => n + g.sitemapUrls.length, 0)} of ${sm.population}`);
    return inputs.map((g) => ({
      tenantId: g.tenantId,
      bundle: {
        sitemapObserved: { sitemapUrls: g.sitemapUrls, observations: g.observations },
        pageSubjects: g.pageSubjects,
        subjectBindings: g.subjectBindings,
      },
    }));
  };

  /**
   * 🔴 ONE RUN PER DECLARED TENANT — AND runDetectors IS UNCHANGED.
   *
   * The shared entry point takes ONE scope for a whole run, and bindSubject refuses any candidate
   * belonging to a different one. That was invisible while every observed page shared a single
   * capture-batch scope. With real declared site scopes the same population spans eighteen, and a
   * single run over it rejects every page outside the one scope it was handed — MEASURED AT 345 OF
   * 495 before this loop existed.
   *
   * The answer is a loop here, not a change there. Nothing about the binder, the detectors or the
   * integration point moves; the runner simply stops pretending a multi-site population is one
   * scope. Each run is judged exactly as a single-tenant run always was.
   */
  let runs;
  if (bundlePath === "observed-pages") {
    runs = observedPagesBundle();
  } else if (bundlePath === "sitemap") {
    runs = sitemapBundles();
  } else if (bundlePath === "subject") {
    runs = [await subjectBundle()];
  } else {
    /* A bundle nobody resolved a scope for. It still runs, and every result binds UNBOUND or
     * INVALID — the correct refusal, and the recorded cost of removing the operator flag. */
    runs = [{ tenantId: null, bundle: bundlePath === "discover" ? discoverBundle() : await loadBundle(bundlePath) }];
  }

  const results = runs.map((r) => ({ tenantId: r.tenantId, result: runDetectors({ bundle: r.bundle, runAt, tenantId: r.tenantId }) }));
  const result = results.length === 1 ? results[0].result : mergeRuns(results, runAt);
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
  if (results.length > 1) {
    console.log(`  runs  : ${results.length}, one per declared scope — no run-level tenant, each outcome carries the scope it was judged in`);
    for (const r of results) {
      const c = { FINDING: 0, CLEAN: 0, UNKNOWN: 0, NOT_APPLICABLE: 0 };
      for (const d of r.result.detectors) for (const o of d.outcomes) c[o.outcome] += 1;
      console.log(`      ${r.tenantId}  FINDING ${c.FINDING} · CLEAN ${c.CLEAN} · UNKNOWN ${c.UNKNOWN} · N/A ${c.NOT_APPLICABLE}`);
    }
  } else {
    console.log(`  tenant: ${result.tenantId ?? "(none resolved — every result binds UNBOUND or INVALID and nothing actionable leaves)"}`);
  }
  console.log(`  findings sha256: ${digest}`);

  /* 🔴 THE OUTPUT IS WRITTEN AND CLOSED BEFORE ANY EXPECTATION IS READ. */
  if (outDir) {
    /* Routed. Both bodies are TEXT, MEASURED — serialiseFindings returns a JSON string, and the digest line is a
     * template literal — so the absence of an encoding argument at the old call sites did not make them binary.
     * The bare mkdir is gone: the boundary's prepare step creates the directory. */
    const DETECT_INSTANT = governedInstant(Date.now());
    const dest = confineToRepo(join(outDir, "findings.json"));
    const sha = confineToRepo(join(outDir, "findings.sha256"));
    const detectOutcomes = [
      [dest, serialised, "WRITE_DETECT_FINDINGS"],
      [sha, `${digest}  findings.json\n`, "WRITE_DETECT_FINDINGS_DIGEST"],
    ].map(([target, body, what]) => executeGovernedWrite(governedFileWrite({
      repo: REPO, permission, target, targetClass: "OPERATOR_CHOSEN_OUTPUT", bytes: body,
      action: what, occurredAt: DETECT_INSTANT, correlationId: `run:detect:${DETECT_INSTANT}`,
    })));
    const bad = detectOutcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
    if (bad) {
      console.error(`🔴 ${bad.outcome} — findings were not written; the governed attempt is on the audit trail`);
      process.exitCode = 1;
    } else if (detectOutcomes.every((o) => o.outcome === "REFUSED")) {
      console.log(`\n[dry-run] would write findings to ${outDir} — pass --confirm to write`);
    } else {
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
    if (outDir) {
      const SCORE_INSTANT = governedInstant(Date.now());
      const scoreGoverned = executeGovernedWrite(governedFileWrite({
        repo: REPO, permission, target: confineToRepo(join(outDir, "score.json")),
        targetClass: "OPERATOR_CHOSEN_OUTPUT",
        bytes: JSON.stringify({ findingsSha256: digest, ...s }, null, 2) + "\n",
        action: "WRITE_DETECT_SCORE", occurredAt: SCORE_INSTANT, correlationId: `run:detect:${SCORE_INSTANT}`,
      }));
      if (scoreGoverned.outcome === "COMMITTED" || scoreGoverned.outcome === "ALREADY_COMMITTED") {
        console.log(`  wrote ${join(outDir, "score.json")}`);
      } else if (scoreGoverned.outcome !== "REFUSED") {
        console.error(`🔴 ${scoreGoverned.outcome} — the score was not written; the governed attempt is on the audit trail`);
        process.exitCode = 1;
      }
    }
    process.exitCode = s.pass ? 0 : 1;
  }
}
