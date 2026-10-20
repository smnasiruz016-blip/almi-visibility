#!/usr/bin/env node
/**
 * 🔴 BUILD-PAGE — THE ONE PAGE BUILDER'S RUNNER (RR-295, owner decisions 1 and 3; the STANDING PAGE LAW of RR-294).
 *
 *   node bin/build-page.mjs --product=<id> --research-batch=<id> --tenant=<t> --actor=<a>                      judge every page
 *   node bin/build-page.mjs --product=<id> --research-batch=<id> --out=<dir> --confirm --tenant=<t> --actor=<a>  also write the passing ones
 *
 * There is ONE page builder: the one that made the 12 guides (src/page/one-builder.mjs over src/page/joined-page.mjs renderJoined). Every
 * page this runner builds comes from it, in this order: the client's own website design (its logo, its own header and links), the key-fact
 * cards, then the questions and answers, each answer with its source and checked date. The old construction template and the page drafts
 * of the old plan are gone (owner decision 3); this runner builds the pages of the named research batch's stored guides, and nothing else.
 *
 * 🔴 PAGE-1 — THE FIVE PAGE GATES ARE ITS ACCEPTANCE STEP (src/page/page-gates.mjs acceptByPageGates): every page is judged in the form it
 * would go live; one failing any gate is REFUSED by name, each failing check named, its HTML withdrawn so nothing of it can be written.
 * The run is costed before it starts (gate D): a local build, no request, no paid call.
 *
 * 🔴 NOTHING IS PUBLISHED. A passing page is written as an HTML file on this machine, inside this repository, behind --confirm, through the
 * governed write. No product is attached, no route, no sitemap entry, no deploy, no production write.
 */
import { join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL, REPO_ROOT } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { guideItemsByValue, buildGuides } from "../src/page/one-builder.mjs";
import { acceptByPageGates, costGate } from "../src/page/page-gates.mjs";
import { GUIDANCE } from "../config/guidance/guidance-read.mjs";
import { readProductQuestionnaire } from "../src/questionnaire/product-questionnaire-reader.mjs";
import { designOf } from "../src/questionnaire/product-questionnaire.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

/**
 * 🔴 THE ONE AUTHORISED EXIT — EVERY EXIT FROM THIS MODULE DRAINS FIRST. `process.exit()` can lose the tail of a piped stdout, so every
 * exit waits for the zero-length write's callback (stream callbacks run in order), with a bounded timer as a floor, never a hang.
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

/** An early stop: drain, exit, and run nothing after it (exitAfterDrain returns at once; the module must not go on). */
async function stopHere(code) {
  exitAfterDrain(code);
  await new Promise(() => {});
}

const USAGE = "node bin/build-page.mjs --product=<id> --research-batch=<id> [--out=<dir> --confirm]";
const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;
const BATCH = flag("research-batch");
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
if (!BATCH) { console.error(`\n🔴 no --research-batch: the one builder builds the stored guides of a named research batch, and nothing else\n  usage: ${USAGE}\n`); await stopHere(1); }
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/build-page.mjs", governed: true, resources: [RESOURCES.subject(PRODUCT_ID), ...(BATCH ? [RESOURCES.researchBatch(BATCH)] : [])] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const outDir = confineToRepo(flag("out"), { label: "--out" });
const permission = writePermission({ target: LOCAL, argv, env: process.env });
/* PAGE-1 gate D: the run's cost, recorded before the build starts */
const RUN_COST_ENTRY = Object.freeze({ recorded_at: new Date().toISOString(), money: Object.freeze({ amountState: "ZERO_BY_TARIFF", amount: 0, currency: "USD", basis: "a local page build: no request, no paid call" }), requests: 0 });
const RUN_STARTED_AT = new Date(Date.now() + 1).toISOString();
if (outDir) announceWritePermission(permission);

/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
if (!existsSync(dir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); await stopHere(3); }
const json = (f) => { try { return JSON.parse(readFileSync(join(dir, f), "utf8")); } catch { return null; } };
const rows = (f) => { try { return readFileSync(join(dir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };

/* page law 1: the client's own design, as its questionnaire files it — none filed is none, never a default look */
const filed = await readProductQuestionnaire(PRODUCT);
const design = filed.state === "READ" ? designOf(filed.questionnaire) : null;
const guides = guideItemsByValue(rows("joined-pages.jsonl"));
const quotation = new Map((json("page-drafts.json")?.pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => [c.claimId, c.quotation ?? null]))));
const linksFile = readdirSync(dir).filter((f) => /^internal-links-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop() ?? null;
const links = linksFile ? json(linksFile) : null;
const on = new Date().toISOString().slice(0, 10);

const line = (ch = "─") => console.log(ch.repeat(78));
console.log(`\nBUILD-PAGE · THE ONE PAGE BUILDER — product ${PRODUCT.productId} · research batch ${BATCH}`);
line("═");
console.log(`design                ${design ? "the client's own (its questionnaire)" : "NOT FILED — every page fails page law 1"}`);
console.log(`stored guides         ${guides.size}`);
if (guides.size === 0) { console.log("\n🔴 DATA GAP — the batch holds no stored guide. Nothing to build, and nothing was."); await stopHere(2); }

const built = buildGuides({ guides, keyFacts: json("key-facts.json") ?? [], rates: json("conversion-rates.json") ?? [], quotationOf: (id) => quotation.get(id) ?? null, design,
  stamp: `TEST PAGE · local build of stored test data · not published (build-page, ${on})`, on, relatedFor: (value) => (Array.isArray(links?.pages?.[value]) ? links.pages[value] : []) });
/* F34 (RR-295): a stored page with no existing address is a NEW page — refused, named, never built blind */
const notBuilt = built.filter((g) => g.refused);
for (const g of notBuilt) console.log(`🔴 ${g.value} — REFUSED: ${g.refused}`);
const slugOf = (g) => (g.url ? new URL(g.url).pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") : `guide-${g.value}`);
const candidates = built.filter((g) => !g.refused).map((g) => Object.freeze({ slug: slugOf(g), verdict: "ACCEPTED", html: g.html, url: g.url, items: g.items, rejects: [], cardsRefused: g.cardsRefused,
  trace: g.items.flatMap((it) => it.claims.map((c) => ({ needId: it.needId, claimId: c.claimId, text: c.text, source: c.source ?? null, link: c.link ?? null, readOn: c.readOn ?? null }))) }));
const urls = candidates.map((c) => c.url).filter(Boolean);
const sec = rows("live-security.jsonl").find((r) => r.kind === "ROBOTS");
const results = acceptByPageGates(candidates, { guidance: GUIDANCE, on, cost: costGate({ entry: RUN_COST_ENTRY, startedAt: RUN_STARTED_AT, budget: { money: 0, currency: "USD", requests: 0 } }),
  urlOf: (c) => c.url, itemsOf: (c) => c.items, site: { robotsTxt: sec?.read?.body ?? null, sitemapUrls: urls, serve: (path) => ({ status: urls.some((u) => new URL(u).pathname.replace(/\/$/, "") === path.replace(/\/$/, "")) ? 200 : 404 }) } });

for (const c of results) {
  console.log(`${c.verdict === "ACCEPTED" ? "✅" : "🔴"} ${c.slug} — ${c.verdict === "ACCEPTED" ? "PASSES ALL FIVE GATES" : "REFUSED"}`);
  for (const r of c.rejects) console.log(`    REFUSED  ${r.reason}`);
  for (const x of c.cardsRefused ?? []) console.log(`    card not shown ${x.claimId}: ${x.code}${x.why ? ` — ${x.why}` : ""}`);
}
const accepted = results.filter((c) => c.verdict === "ACCEPTED");
console.log(`\nPASS ${accepted.length} of ${results.length + notBuilt.length} page(s) · REFUSED ${results.length - accepted.length + notBuilt.length}. A refusal is a result, not an error.`);

let writeFailed = false;
if (outDir) {
  for (const c of results) {
    if (c.html === null) { console.log(`[refused] nothing written for ${c.slug}`); continue; }
    /* Routed. Two targets per page, two governed occurrences — a whole-file replacement is its own target. */
    const PAGE_INSTANT = governedInstant(Date.now());
    const outcomes = [
      [`${c.slug}.html`, c.html, "WRITE_CANDIDATE_PAGE"],
      [`${c.slug}.trace.json`, JSON.stringify(c.trace, null, 2) + "\n", "WRITE_CANDIDATE_TRACE"],
    ].map(([name, body, what]) => executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
      repo: REPO_ROOT, permission, target: join(outDir, name), targetClass: "OPERATOR_CHOSEN_OUTPUT", bytes: body,
      action: what, occurredAt: PAGE_INSTANT, correlationId: `run:build-page:${PAGE_INSTANT}`,
    })));
    const bad = outcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
    if (bad) { console.error(`🔴 ${bad.outcome} — ${c.slug} was not written; the governed attempt is on the audit trail`); writeFailed = true; }
    else if (outcomes.every((o) => o.outcome === "REFUSED")) console.log(`[dry-run] would have written ${join(outDir, `${c.slug}.html`)} — ${permission.reason}`);
    else console.log(`wrote ${join(outDir, `${c.slug}.html`)} and its trace`);
  }
}
exitAfterDrain(writeFailed ? 1 : accepted.length === results.length && notBuilt.length === 0 ? 0 : 2);
