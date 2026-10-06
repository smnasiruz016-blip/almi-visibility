#!/usr/bin/env node
/**
 * ROW 61 — SAFE LOCAL PAGE CONSTRUCTION. Build a declared page spec of a declared product from its fact
 * registry, and ACCEPT it only if every frozen part of Gate A passes.
 *
 *   node bin/build-page.mjs --product=<id> --slug=<slug>                 judge one declared candidate
 *   node bin/build-page.mjs --product=<id> --all-slugs                   judge every declared candidate of ONE product
 *   node bin/build-page.mjs --product=<id> --slug=<slug> --out=<dir> --confirm   also write it, IF accepted
 *   node bin/build-page.mjs --product=<id> --all-slugs --research-batch=<id>       judge F35's chosen needs too (their compiled drafts)
 *
 * 🔴 RR-180 ruling 3(a) — THIS RUNNER RECEIVES AND ACTS ONLY ON F35'S DECISION. It reads F91's planning store of the named research batch,
 * asks F35 (src/page/action-evidence.mjs) and hands construction F35's construction set (decisionsForConstruction): a draft is built only
 * for a need F35 CHOSE to CREATE. No research batch, or no need chosen → every candidate is refused at that part, and nothing is built.
 *
 * 🔴 NOTHING IS PUBLISHED. An accepted candidate is written as an HTML file on this machine, inside this
 * repository, behind --confirm. No page is created in any product, no route, no sitemap entry, no deploy,
 * no production write.
 *
 * 🔴 NO SLUG, NO DEFAULT. A runner with neither --slug nor --all-slugs stops and says so, as --product
 * already does. It used to build one hard-coded spec and could not reach the second spec its own product
 * declares.
 *
 * 🔴 --all-slugs loops the declared specs of ONE product (owner ruling, 14 September 2026). Each candidate
 * is judged on its own and every refusal is recorded separately. No cross-product loop, no cohort, no batch
 * publish, no page-count target. It exists to produce the DATA GAP list, not output.
 *
 * 🔴 FAILS CLOSED. constructCandidates (src/page/construct.mjs) hands back HTML only for an ACCEPTED
 * candidate. A refused one has nothing to write; the run records its DATA GAP / REJECT / BLOCKED reasons and
 * exits 2. This runner used to print "TEXT AS BUILT (before Gate A)" and write the file anyway.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { selectCandidates, constructCandidates, decisionsForConstruction, ACCEPTED, NOT_TESTED } from "../src/page/construct.mjs";
import { renderCompiledDraft } from "../src/page/draft-render.mjs";
import { judgeDraft, POPULATION, ASSESSMENTS, JUDGEMENTS } from "../src/page/quality-judgements.mjs";
import { previewForOwner } from "../src/page/content-brief.mjs";
import { readClientActionEvidence } from "../src/page/action-evidence.mjs";
import { NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { readClientIndexation } from "../src/page/indexation-evidence.mjs";
import { existsSync } from "node:fs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { overturnedIds } from "../src/research/meaning-judgement.mjs";
import { NO_RECORDED_GAIN_EVIDENCE } from "../src/page/information-gain.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { existingPageDecisionEvent } from "../src/page/existing-page-first.mjs";

/**
 * 🔴 THE ONE AUTHORISED EXIT — EVERY EXIT FROM THIS MODULE DRAINS FIRST.
 *
 * `process.exit()` forces the process down "even if there are still asynchronous operations
 * pending ... including I/O operations to process.stdout", and writes to stdout ARE
 * asynchronous when stdout is a pipe — which is exactly what `spawnSync` gives a child, and
 * what CI runs everything through. So a runner that prints its verdict and exits immediately
 * can lose the tail of its own output, and the reader sees a truncated report with a correct
 * exit code: a result that looks complete and is not.
 *
 * 🔴 THIS IS CORRECTED AS AN UNSAFE PROPERTY IN ITS OWN RIGHT, NOT AS A PROVEN ROOT CAUSE.
 * It was found while investigating #99's intermittent CI failure; whether it caused that
 * failure is UNKNOWN and is not claimed here.
 *
 * Why a choke point rather than "drain the paths that print": reachability in JavaScript is
 * where "I cannot determine" multiplies — callbacks, dynamic dispatch, writes inside imported
 * helpers. One helper, every exit routed through it, and a guard that only has to scan for
 * `process.exit(` outside it. Correctness lives in one place instead of three, and the cost —
 * paths that printed nothing also drain — is nothing.
 *
 * 🔴 THE WAIT IS BOUNDED. `process.exitCode` is NOT used: it makes exit depend on the event
 * loop draining, so one stray handle turns a truncated run into a hanging one, and a build
 * binary that hangs is worse than one that truncates. The zero-length write's callback fires
 * after every earlier write has been handled (stream callbacks run in order), and the timer
 * is a floor under the worst case, not a substitute for the drain.
 */
const DRAIN_TIMEOUT_MS = 5000;
function exitAfterDrain(code) {
  let exited = false;
  const go = () => {
    if (exited) return;
    exited = true;
    process.exit(code);
  };
  const timer = setTimeout(go, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  process.stdout.write("", go);
}

const USAGE = "node bin/build-page.mjs --product=<id> (--slug=<slug> | --all-slugs) [--research-batch=<id>] [--out=<dir> --confirm]";
const BATCH = process.argv.find((a) => a.startsWith("--research-batch="))?.slice("--research-batch=".length) ?? null;
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
/* F34 — the existing-page check reads this tenant's partition of the stored observation batch, declared here like every read. */
const SCOPE = scopedEntryPoint({ entry: "bin/build-page.mjs", governed: true, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), ...(BATCH ? [RESOURCES.researchBatch(BATCH)] : []), RESOURCES.evidenceStore()] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;

let requested;
try {
  requested = selectCandidates(PRODUCT.pageSpecs, { slug: flag("slug"), allSlugs: argv.includes("--all-slugs") });
} catch (e) {
  console.error(`\n🔴 ${e.message}\n  usage: ${USAGE}\n`);
  exitAfterDrain(1);
}

const outDir = confineToRepo(flag("out"), { label: "--out" });
const permission = writePermission({ target: LOCAL, argv, env: process.env });
if (outDir) announceWritePermission(permission);

const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const verifiedInRegistry = records.filter((r) => r.verificationState === "VERIFIED").length;

const line = (ch = "─") => console.log(ch.repeat(78));
console.log(`\nSAFE LOCAL PAGE CONSTRUCTION — product ${PRODUCT.productId}`);
line("═");
console.log(`declared page specs   ${Object.keys(PRODUCT.pageSpecs).length}   requested ${requested.length}`);
console.log(`registry records      ${records.length}   VERIFIED ${verifiedInRegistry}`);
if (requested.length === 0) {
  console.log(`\n🔴 DATA GAP — ${PRODUCT.productId} declares no page spec. Nothing to construct, and nothing was.`);
  exitAfterDrain(2);
}

/* 🔴 F34 — THE SAME TENANT'S EXISTING PAGES, BEFORE ANY CANDIDATE IS JUDGED. An unreadable population is handed on as null, so
 * every candidate is REFUSED rather than built as though the site were empty. */
const existing = readExistingPagePopulation({ scope: SCOPE, resolve: createTenantResolver() });
const ep = existing.population;
console.log(`existing pages        ${ep ? `${ep.pages.length} of this tenant (coverage ${ep.coverageState}) · bound: one stored observation batch, this tenant's partition` : `UNAVAILABLE (${existing.fault}) — every candidate is refused`}`);

/* 🔴 RR-180 ruling 3(a) — F35's decision, read from the named research batch's planning store (F91 C14) as page-actions reads it */
let planningRows = null, overturned = new Set();
if (BATCH) {
  const store = lookupStore(rootIndexFor(process.env), "RESEARCH");
  if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); exitAfterDrain(3); }
  /* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
  if (!existsSync(dir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); exitAfterDrain(3); }
  const rowsOf = (f) => (existsSync(join(dir, f)) ? createJsonlStore(join(dir, f)).readAll() : []);
  planningRows = rowsOf("planning.jsonl");
  overturned = overturnedIds(rowsOf("meaning-judgements.jsonl"));
}
const ae = readClientActionEvidence({ tenantId: SCOPE.tenantId, product: PRODUCT, records, resolve: createTenantResolver(), reviews: [], planningRows, overturned, decayEvidence: { ...NO_RECORDED_DECAY_EVIDENCE, indexing: readClientIndexation({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), inspections: [] }).indexingChecks ?? [] } });
const chosen = decisionsForConstruction(ae);
if (argv.includes("--all-slugs")) requested = [...requested, ...chosen.decisions.filter((d) => d.spec && !requested.includes(d.slug)).map((d) => d.slug)];
console.log(`F35 decisions         ${chosen.decisions.length} chosen CREATE (${chosen.decisions.filter((d) => d.spec).length} compiled) · section proposals ${ae.compiled?.sectionProposals?.length ?? 0}${chosen.why ? ` — ${chosen.why}` : ""}`);

const results = constructCandidates({ pageSpecs: PRODUCT.pageSpecs, variants: PRODUCT.variants, records, requested, tenantId: SCOPE.tenantId, existingPages: ep, decisions: chosen.decisions /* 🔴 RR-180 ruling 3(a): F35's construction set, and nothing else */, links: null /* F37: no internal-link targets are recorded — the internal-links and technical checks are NOT MEASURED */, gainEvidence: NO_RECORDED_GAIN_EVIDENCE /* F39: none is recorded (no store) — passed EXPLICITLY */ });
/* C6 — one recorded decision per candidate the check stopped, through this run's own guard sink. */
for (const c of results) {
  /* RR-179 (c): a candidate F35 did not choose is never judged, so it has no existing-page decision to record */
  const ev = c.parts.existingPage ? existingPageDecisionEvent(c.parts.existingPage.decision, { entry: "bin/build-page.mjs" }) : null;
  if (ev) SCOPE.recordDecision(ev);
}

for (const c of results) {
  console.log(`\n${c.verdict === ACCEPTED ? "✅" : "🔴"} ${c.slug} — ${c.verdict}`);
  line();
  console.log(`  template family: ${c.family.rendered} of ${c.family.declared} declared spec(s) rendered · shell ${c.family.shellSource} (${c.family.shellPages} page(s))`);
  if (c.renderedWords !== null) console.log(`  rendered words ${c.renderedWords}`);
  for (const [part, p] of Object.entries(c.parts)) {
    if (part === "existingPage") {
      console.log(`  ${part.padEnd(12)} ${p.outcome} — ${p.considered ?? p.value} existing page(s) considered, ${p.matched} naming this intent, coverage ${p.coverageState ?? "NONE"}${p.decision.mayProduce ? "" : ` — ${p.decision.reason}`}`);
      continue;
    }
    const measured = p.value === undefined ? "" : ` ${p.value}${p.threshold === undefined ? "" : ` (bar ${p.threshold})`}`;
    console.log(`  ${part.padEnd(12)} ${p.state}${measured}${p.reason ? ` — ${p.reason}` : ""}`);
  }
  for (const g of c.dataGaps) console.log(`  DATA GAP   ${g.part}: ${g.reason}`);
  for (const r of c.rejects) console.log(`  REJECT     ${r.part}: ${r.reason}`);
  for (const n of c.notTested) console.log(`  ${NOT_TESTED}  ${n.part}: ${n.reason}`);
  if (c.parts.facts?.notVerified.length) console.log(`  cited but not VERIFIED: ${c.parts.facts.notVerified.join(" · ")}`);
  if (c.parts.whyThisUrl) console.log(`  ${c.parts.whyThisUrl.notEnforced}`);
  console.log(`  ${c.pageOne.id} ${c.pageOne.state}: ${c.pageOne.statement} — missing: ${c.pageOne.missingGateFamilies.join(", ")}`);
  console.log(`  §5A fact text copied into the spec: ${c.copies.length} DETECTED · ${c.copiesNotTested.length} value(s) NOT TESTED · ${c.copiesFullyChecked} fully checked and clean`);
  for (const n of c.copiesNotTested) console.log(`    NOT TESTED  ${n.claimId} (${n.field}): ${n.reason}`);
}

const accepted = results.filter((c) => c.verdict === ACCEPTED);
console.log(`\nACCEPTED ${accepted.length} of ${results.length} candidate(s). A refusal is a result, not an error.`);

/* 🔴 F40 (RR-184) · the quality judgements of each draft F37 rendered for a need F35 chose. The draft is F37's own render of the same
 * spec, with the same links construction was handed (none); F40 reads construction's parts for that slug and refuses the draft if its
 * checks are not the ones construction judged. A REAL run: engaging and hookable have no lawful judge today, so each is NOT MEASURED. */
const judged = chosen.decisions.filter((d) => d.spec).map((d) => ({ slug: d.slug, q: judgeDraft({ spec: d.spec, decision: d.decision,
  draft: renderCompiledDraft({ spec: d.spec, decision: d.decision, links: null }), parts: results.find((r) => r.slug === d.slug)?.parts, population: POPULATION.REAL }) }));
console.log(`\nF40 · quality judgements: ${judged.length} draft(s) — five separate assessments each, never a score; a draft that does not pass F40 is never a passing preview`);
for (const { slug, q } of judged) {
  if (!q.judged) { console.log(`  ${slug} — NOT JUDGED: ${q.why}`); continue; }
  console.log(`  ${slug} — F40 gate ${q.gate.verdict}${q.gate.blockers.length ? ` (${q.gate.blockers.join(" · ")})` : ""}`);
  for (const a of ASSESSMENTS) console.log(`    ${a.padEnd(22)} ${q.assessments[a].verdict}`);
  for (const n of JUDGEMENTS) console.log(`    judgement ${n.padEnd(12)} ${q.judgements[n].verdict} — ${q.judgements[n].observation ?? q.judgements[n].why} [source: ${q.judgements[n].source?.id ?? "none"}]`);
}

/* 🔴 F41 C9 (RR-188) · each judged draft's preview, handed F40's result for THAT draft. This runner prepares no brief, so none is READY;
 * the preview states every reason it is not put forward, F40's verdict and blockers word for word. Nothing is published. */
for (const { slug, q } of judged) {
  const construction = results.find((r) => r.slug === slug);
  const pv = previewForOwner({ construction, brief: null, f40: q });
  console.log(`  preview ${slug} — ${pv.state}${pv.missing?.length ? `: ${pv.missing.join(" | ")}` : ""}`);
}

if (outDir) {
  for (const c of results) {
    if (c.html === null) {
      console.log(`[refused] nothing written for ${c.slug}`);
    } else {
      /* Routed. Two targets per candidate, two governed occurrences — a whole-file replacement is its own target,
       * so this is per-TARGET, not per-record. The bare mkdir is gone: the boundary's prepare step makes it. */
      const PAGE_INSTANT = governedInstant(Date.now());
      const outcomes = [
        [`${c.slug}.html`, c.html, "WRITE_CANDIDATE_PAGE"],
        [`${c.slug}.trace.json`, JSON.stringify(c.trace, null, 2) + "\n", "WRITE_CANDIDATE_TRACE"],
      ].map(([name, body, what]) => executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
        repo: REPO, permission, target: join(outDir, name), targetClass: "OPERATOR_CHOSEN_OUTPUT", bytes: body,
        action: what, occurredAt: PAGE_INSTANT, correlationId: `run:build-page:${PAGE_INSTANT}`,
      })));
      const bad = outcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
      if (bad) {
        console.error(`🔴 ${bad.outcome} — ${c.slug} was not written; the governed attempt is on the audit trail`);
        process.exitCode = 1;
      } else if (outcomes.every((o) => o.outcome === "REFUSED")) {
        console.log(`[dry-run] would have written ${join(outDir, `${c.slug}.html`)} — ${permission.reason}`);
      } else {
        console.log(`wrote ${join(outDir, `${c.slug}.html`)} and its trace`);
      }
    }
  }
}
exitAfterDrain(accepted.length === results.length ? 0 : 2);
