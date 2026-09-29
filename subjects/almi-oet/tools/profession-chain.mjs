#!/usr/bin/env node
/**
 * THE CHAIN, FOR ANY PROFESSION PAGE — registry → page → Gate A → rollout.
 *
 *   node bin/profession-chain.mjs --page=nursing
 *   node bin/profession-chain.mjs --page=speech-pathology [--out=runs/x --confirm]
 *
 * 🔴 BOTH PAGES GO THROUGH IDENTICAL CODE. That is the whole point of running it
 * on a second profession: if the runner differed, the comparison would be
 * measuring the runner.
 *
 * The eleven sibling pages come from the cache `npm run chain` wrote. Nothing is
 * fetched. Nothing is published.
 *
 * ── WHY THE SECOND PROFESSION IS THE WEAKEST ONE ───────────────────────────
 *
 * /nursing passed, and nursing is the best case in the whole set — 469
 * recognising organisations against speech pathology's 46, six destination
 * regulators against four. Running the next chain on another strong profession
 * would be running the experiment that is going to pass.
 *
 *   PASS  → the cohort is safe, and the remaining ten can be worked.
 *   FAIL  → THE COHORT IS SMALLER THAN TWELVE, and we learn it now rather than
 *           after building eleven pages. And the reading is NOT "profession
 *           pages do not work" — it is "how many professions have enough data",
 *           which is a COUNT, and Gate B asks for ten, not twelve.
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../../../src/write-law.mjs";
import { executeGovernedWrite } from "../../../src/governance/governed-write.mjs";
import { governedFileWrite } from "../../../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../../../src/audit-trail/store.mjs";
import { loadRegistry, toGateAFact } from "../../../src/facts/registry.mjs";
import { placeClaims, isSharedAcrossVariants } from "../../../src/page/claim-placement.mjs";
import { renderPage, findCopiedFacts } from "../../../src/page/render.mjs";
import { runGateA, MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "../../../src/gate-a/run.mjs";
import { tokensWithKind } from "../../../src/gate-a/text-kind.mjs";
import { tokensOf } from "../../../src/gate-a/tokens.mjs";
import { shingles } from "../../../src/gate-a/overlap.mjs";
import { uniqueWords } from "../../../src/gate-a/shell.mjs";

import { productFromArgvOrExit, productIdOrExit } from "../../../src/product-cli.mjs";
import { scopedEntryPoint } from "../../../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../../../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../../../src/crawl/observation-batch.mjs";
import { existingPageGate } from "../../../src/page/existing-page-population.mjs";

/**
 * 🔴 THE PRODUCT ARRIVES AS AN ARGUMENT, NOT AS AN IMPORT.
 *
 * This runner used to resolve a product at IMPORT time, so it could not be
 * pointed at a second one without editing this file. Its arithmetic was
 * already generic; the BINDING was not.
 *
 * There is no default: a runner with no `--product=<id>` stops and says so.
 */
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: "node bin/profession-chain.mjs --product=<id> --page=<slug>" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "subjects/almi-oet/tools/profession-chain.mjs", governed: true, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.cache("sibling-page cache"), RESOURCES.runArtefacts("sibling pages read from the cache directory"), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/profession-chain.mjs --product=<id> --page=<slug>", scope: SCOPE });

const argv = process.argv.slice(2);
const flag = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=") ?? null;
const which = flag("page") ?? "nursing";
const outDir = confineToRepo(flag("out"), { label: "--out" });

const PAGES = { nursing: PRODUCT.pageSpecs.nursing, "speech-pathology": PRODUCT.pageSpecs["speech-pathology"] };
const base = PAGES[which];
if (!base) {
  console.error(`unknown --page=${which}. Known: ${Object.keys(PAGES).join(", ")}`);
  process.exit(2);
}

const permission = writePermission({ target: LOCAL, argv, env: process.env });
const REPO_ROOT_FOR_GOVERNANCE = new URL("../../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RUN_INSTANT = governedInstant(Date.now());
const RUN_CORRELATION = `run:profession-chain:${RUN_INSTANT}`;
if (outDir) announceWritePermission(permission);

const line = (ch = "─") => console.log(ch.repeat(78));
const f4 = (n) => (n === null || n === undefined ? "—" : n.toFixed(4));
const CACHE = "runs/_profession-cache";

const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const spec = placeClaims(base, PRODUCT.placement.removed);
const { html, trace } = renderPage(spec, records);
const facts = trace.map((t) => toGateAFact(records.find((r) => r.id === t.claimId)));
const { tokens, kinds } = tokensWithKind(html);
const k = (kind) => kinds.filter((x) => x === kind).length;

if (!existsSync(CACHE) || readdirSync(CACHE).length < 11) {
  console.error(`\n🔴 ${CACHE} missing or short. Run \`npm run chain -- --confirm\` first — this script does not fetch, and the chain keeps its cache only with --confirm.`);
  process.exit(2);
}
const siblings = readdirSync(CACHE)
  .filter((f) => f.endsWith(".html") && f !== `${which}.html`)
  .map((f) => ({ id: f.replace(/\.html$/, ""), html: readFileSync(join(CACHE, f), "utf8") }));

const gate = runGateA([{ id: `${which} (CANDIDATE)`, html, facts, whyThisUrl: `the profession page for ${which}` }, ...siblings]);
const me = gate.results.find((r) => r.id === `${which} (CANDIDATE)`);

// ── the shared half, by the rule that survived: a property of the PAGE ──────
// 🔴 DERIVED, not a list. See isSharedAcrossVariants:
// a hardcoded set only knows the claims somebody remembered to add, and it
// silently credited profession-independent text as distinguishing.
const repeated = new Set(records.filter((r) => isSharedAcrossVariants(r, PRODUCT.axis.key, PRODUCT.placement.allRepeated)).map((r) => r.id));
const blocks = html.split('<div class="fact" data-claim-id="').slice(1);
let sharedA = html.split('<div class="fact"')[0];
let uniqueA = "";
for (const b of blocks) {
  const id = b.slice(0, b.indexOf('"'));
  const close = b.indexOf("</div>");
  if (repeated.has(id)) sharedA += " " + b.slice(0, close);
  else uniqueA += " " + b.slice(0, close);
  sharedA += " " + b.slice(close);
}
const SA = shingles(tokensOf(sharedA));
const UA = shingles(tokensOf(uniqueA));
const framing = [spec.title, spec.intro, ...spec.sections.map((s) => `${s.heading} ${s.framing ?? ""}`)].join(" ");
const textOf = (ids) =>
  ids.map((id) => records.find((r) => r.id === id)).filter(Boolean)
    .map((r) => `${r.value.value} ${r.evidence.ownWords ?? ""} ${r.evidence.quotedSpan ?? ""}`).join(" ");
const onPage = trace.map((t) => t.claimId);
const SB = shingles(tokensOf(`${framing} ${textOf(onPage.filter((id) => repeated.has(id)))}`));
const UB = shingles(tokensOf(textOf(onPage.filter((id) => !repeated.has(id)))));
const best = (S, U) => S.size / (S.size + U.size + U.size);

const framingCounts = new Map();
for (const t of tokensOf(sharedA)) framingCounts.set(t, (framingCounts.get(t) ?? 0) + 1);
const bestRolloutUnique = uniqueWords(tokensOf(uniqueA), framingCounts);

console.log(`\nTHE CHAIN — /${which}`);
line("═");
console.log(`  ${trace.length} claims from ${new Set(trace.map((t) => t.subject)).size} sources · registry ${records.length} records`);
console.log(`  population: ${siblings.length} published sibling profession pages (cache, no fetch)`);

console.log(`\nSTEP 2 · BY REFERENCE (§5A)`);
line();
const copyCheck = findCopiedFacts(base, records);
console.log(`  fact text copied into the spec: ${copyCheck.copied.length} DETECTED · ${copyCheck.notTested.length} value(s) NOT TESTED · ${copyCheck.clean.length} fully checked and clean`);
for (const n of copyCheck.notTested) console.log(`    NOT TESTED  ${n.claimId} (${n.field}): ${n.reason}`);
console.log(`  every rendered fact carries data-claim-id: ${trace.length}/${trace.length}`);
console.log(`  their words quoted: ${trace.filter((t) => t.renderedQuote).length}   🔴 our words: ${trace.filter((t) => !t.renderedQuote).length}`);

console.log(`\nSTEP 3 · GATE A — ONE PAGE`);
line();
console.log(`  uniqueWords   ${String(me.uniqueWords).padStart(5)} / ${MIN_UNIQUE_WORDS}   ${me.uniquePass ? "PASS" : "🔴 FAIL"}`);
console.log(`    prose ${k("prose")}  list ${k("list")}  heading ${k("heading")}  (split reported, not thresholded)`);
console.log(`  facts         ${String(me.facts?.qualifying ?? 0).padStart(5)} / 5       ${me.factsPass ? "PASS" : "🔴 FAIL"}`);
console.log(`    factChecked ${me.facts?.factChecked ?? 0}  🔴 still zero, and it must be`);
console.log(`  overlap       ${f4(me.maxOverlap).padStart(5)} / ${MAX_SIBLING_OVERLAP}   ${me.overlapPass === null ? "—" : me.overlapPass ? "PASS" : "🔴 FAIL"}`);
console.log(`  VERDICT       ${me.verdict}`);

console.log(`\nSTEP 4 · 🔴 ROLLOUT — WHERE THE VERDICT IS READ`);
line();
console.log(`  identical across all twelve by construction: ${tokensOf(sharedA).length} of ${tokens.length} words` +
  ` = ${((tokensOf(sharedA).length / tokens.length) * 100).toFixed(1)}%`);
console.log(`  uniqueWords after rollout   ${String(bestRolloutUnique).padStart(5)} / ${MIN_UNIQUE_WORDS}   ${bestRolloutUnique >= MIN_UNIQUE_WORDS ? "PASS" : "🔴 FAIL"}`);
console.log(`  overlap A (cites per-prof)  ${f4(best(SA, UA))} / ${MAX_SIBLING_OVERLAP}   ${best(SA, UA) <= MAX_SIBLING_OVERLAP ? "PASS" : "🔴 FAIL"}   S/U ${SA.size}/${UA.size}`);
console.log(`  overlap B (cites shared)    ${f4(best(SB, UB))} / ${MAX_SIBLING_OVERLAP}   ${best(SB, UB) <= MAX_SIBLING_OVERLAP ? "PASS" : "🔴 FAIL"}   S/U ${SB.size}/${UB.size}`);

const rolloutPass = bestRolloutUnique >= MIN_UNIQUE_WORDS && best(SA, UA) <= MAX_SIBLING_OVERLAP && best(SB, UB) <= MAX_SIBLING_OVERLAP;
console.log(`\n  🔴 VERDICT AFTER ROLLOUT: ${me.verdict === "KEEP" && rolloutPass ? "KEEP" : "REJECT"}`);

console.log(`\n  awaiting a layer that does not exist: ${PRODUCT.placement.awaiting.length}   rendered today: ${trace.filter((t) => PRODUCT.placement.awaiting.some((a) => a.claim === t.claimId)).length}`);

const report = {
  page: which, generatedOn: new Date().toISOString().slice(0, 10),
  claims: trace.length, sources: [...new Set(trace.map((t) => t.subject))],
  words: tokens.length, prose: k("prose"), list: k("list"),
  onePage: { uniqueWords: me.uniqueWords, facts: me.facts?.qualifying, overlap: me.maxOverlap, verdict: me.verdict },
  rollout: { uniqueWords: bestRolloutUnique, overlapA: best(SA, UA), overlapB: best(SB, UB), verdict: me.verdict === "KEEP" && rolloutPass ? "KEEP" : "REJECT" },
  sharedWords: tokensOf(sharedA).length,
};

if (outDir) {
  let chainRefused = false;
  let chainFailed = false;
  /* 🔴 F34 — the candidate page is written only when no existing page of this tenant serves, or may serve, its intent. */
  const existingPage = existingPageGate({ scope: SCOPE, entry: "subjects/almi-oet/tools/profession-chain.mjs", candidate: { slug: which, intent: spec?.variant, structure: { values: PRODUCT.variants } } });
  for (const [name, body, what] of [
    /* F04: the action is a label the shared engine's registry declares, so it names no subject word (neutrality census). */
    ...(existingPage.mayProduce ? [[`${which}.html`, html, "WRITE_VARIANT_CHAIN_PAGE"]] : []),
    [`${which}-chain.json`, JSON.stringify(report, null, 2) + "\n", "WRITE_VARIANT_CHAIN_REPORT"],
  ]) {
    const governed = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
      repo: REPO_ROOT_FOR_GOVERNANCE, permission, target: join(outDir, name),
      targetClass: "RUN_EVIDENCE", bytes: body,
      action: what, occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    }));
    if (governed.outcome === "REFUSED") chainRefused = true;
    else if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
      console.error(`🔴 ${governed.outcome} — ${join(outDir, name)} was not written; the governed attempt is on the audit trail`);
      chainFailed = true;
    }
  }
  if (chainRefused) console.log(`\n[dry-run] would have written ${outDir} — ${permission.reason}`);
  else if (!chainFailed) console.log(`\nwrote ${outDir}/${existingPage.mayProduce ? `${which}.html` : `${which}-chain.json`}`);
  if (chainFailed) process.exitCode = 1;
}
