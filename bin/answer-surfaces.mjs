#!/usr/bin/env node
/**
 * 🔴 F16 C7 · F63 · ANSWER SURFACES THROUGH THE ENGINE'S OWN BROWSER ROUTE (RR-291, owner decision 2 of 19 Oct 2026).
 *
 *   node bin/answer-surfaces.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --tenant=<id> --actor=<id> [--ai-per-surface=N] [--live --confirm]
 *
 * Without --live it prints the plan only — the queries the subject's own declaration forms (src/research/answer-surfaces.mjs), each with the
 * surface it would be opened on; no request, nothing written. With --live the route the engine already has (src/facts/browser-route.mjs, opened
 * through the subject's CITED_SOURCES connector — the one lawful launch of a window) opens a VISIBLE window with a fresh, separate profile, and
 * for each question it reads the host's robots file first and obeys it (fail closed), then opens the question's address and reads the page's
 * visible text — never typing, clicking or solving. At least 20 s between two reads of one host; a robots disallow, a captcha, a bot check,
 * an unusual-traffic page or a login wall STOPS that host for the rest of the run and every question left on it is recorded BLOCKED with the
 * reason. The owner's bounds are kept by the code: at most 20 web searches and 20 AI questions. What a page showed is kept as domains,
 * features and addresses only — never its text (F16 C19). Nothing is posted, sent or published.
 *
 * Generic: it names no client, product or provider plan.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { openConnector, pacedRelease } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { openBrowserRoute } from "../src/facts/browser-route.mjs";
import { browserRead, BLOCK } from "../src/facts/source-reader.mjs";
import { loadPlaywright } from "../src/render/renderer.mjs";
import { surfacesOf, SURFACE, BOUNDS, formSurfaceQueries, formAiQuestions, planRefusals, webSearchSeen, aiAnswerSeen, ownPosition, observationRecord, surfaceCensus } from "../src/research/answer-surfaces.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = "CITED_SOURCES";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
const AI_PER = Number(arg("ai-per-surface") ?? 3);
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "") || !(Number.isInteger(AI_PER) && AI_PER >= 0)) { console.error("usage: node bin/answer-surfaces.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--ai-per-surface=N] [--live --confirm] — nothing read, no request, nothing written"); process.exit(2); }
const live = process.argv.includes("--live");
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const SCOPE = scopedEntryPoint({ entry: "bin/answer-surfaces.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live ? runCost({ entryPoint: "bin/answer-surfaces.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

const index = rootIndexFor(process.env);
const subject = lookupSubject(index, SUBJECT);
if (subject.state !== "DECLARED") { console.error(`🔴 REFUSED — the subject is not declared (${subject.state}); no request was made`); process.exit(3); }
const store = lookupStore(index, "RESEARCH");
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT; no request was made"); process.exit(3); }
const own = (f) => { const p = join(subject.dir, f); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; };
const descriptor = own("descriptor.json"), surfaces = own("answer-surfaces.json");
const SURFACES = surfacesOf(surfaces);
const formed = formSurfaceQueries({ descriptor, surfaces });
const ai = formAiQuestions(descriptor);
if (formed.missing.length || ai.missing.length) { console.error(`🔴 REFUSED — the declaration forms no plan: ${[...formed.missing, ...ai.missing].join("; ")}; no request was made`); process.exit(3); }
/* the local questions first (F63): a stop part-way through still leaves the declared location's rank observed */
const web = [...formed.local.map((q) => ({ surfaceId: "web-search", q, location: q.location })), ...formed.topical.map((q) => ({ surfaceId: "web-search", q }))];
const aiPlan = ["ai-answer-a", "ai-answer-b"].flatMap((surfaceId) => ai.queries.slice(0, AI_PER).map((q) => ({ surfaceId, q })));
/* the owner's bounds are for ALL runs together: the questions already stored count, and so do the ones a run asked but could not keep
 * (--asked-unkept=web:N,ai:N names them — RR-291's first run read 6 AI questions and kept none, its write refused for a missing key) */
const stored = (() => { try { return readFileSync(join(batchDir, "answer-surface-observations.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } })();
const unkept = Object.fromEntries((arg("asked-unkept") ?? "").split(",").filter(Boolean).map((p) => p.split(":")).map(([k, n]) => [k, Number(n) || 0]));
const priorWeb = stored.filter((r) => r.surface === SURFACE.WEB_SEARCH && r.state === "OBSERVED").length + (unkept.web ?? 0);
const priorAi = stored.filter((r) => r.surface === SURFACE.AI_ANSWER && r.state === "OBSERVED").length + (unkept.ai ?? 0);
const refused = planRefusals({ web: [...Array(priorWeb).fill(null), ...web], ai: [...Array(priorAi).fill(null), ...aiPlan] });
console.log(`  already asked    web ${priorWeb} · AI ${priorAi} (stored, and named as asked but not kept)`);
console.log("F16 C7 · F63 · ANSWER SURFACES — the engine's own browser route; domains, features and addresses only, never a page's text");
console.log(`  plan             web searches ${web.length} (topical ${formed.topical.length} · local ${formed.local.length}, location ${surfaces.locations.join(", ")}) · AI questions ${aiPlan.length} (${AI_PER} on each of 2 surfaces) · owner's bounds ${BOUNDS.webSearches} / ${BOUNDS.aiQuestions}`);
console.log(`  bound            at least ${BOUNDS.gapMs / 1000} s between two reads of one host · robots read first and obeyed (fail closed) · a robots disallow, captcha, bot check or login wall stops that host`);
if (refused.length) { console.error(`🔴 REFUSED — ${refused.join("; ")}; no request was made`); process.exit(3); }
for (const p of [...web, ...aiPlan]) console.log(`    ${p.surfaceId.padEnd(12)} ${p.q.text.length > 110 ? `${p.q.text.slice(0, 107)}...` : p.q.text}`);
if (!live) { console.log("  NOT RUN — no --live: the plan only; no request was made and nothing was written"); process.exit(0); }
const declared = lookupConnector(index, SUBJECT, KIND);
if (declared.state !== "DECLARED" || !(declared.connector.reaches ?? []).some((x) => x.resourceKind === "RESEARCH_BATCH" && x.resourceRef === BATCH)) { console.error("🔴 REFUSED — the subject declares no CITED_SOURCES connector reaching this batch; no request was made"); process.exit(3); }

const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
const t0 = performance.now();
const cap = web.length + aiPlan.length + 3; /* each question once, and each of the three hosts' robots files once */
let ROUTE = null;
try { ROUTE = await openBrowserRoute({ cap, startedByClient: true, loadPlaywright, launchBrowser: CONNECTOR.launchBrowser, settleMs: 25000 }); console.log(`  browser route    OPEN — ${ROUTE.browser}, a visible window with a fresh, separate profile`); }
catch (e) { console.log(`  browser route    COULD NOT OPEN (${String(e?.message ?? e).split("\n")[0]}) — every question is BLOCKED`); }
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const run = `answer-surfaces:${instant}`;
const state = { reads: 0, stoppedHosts: new Map() };
const robotsSeen = new Set();
const pace = (what) => pacedRelease(what, BOUNDS.gapMs);
const records = [];
const asked = { "web-search": 0, "ai-answer-a": 0, "ai-answer-b": 0 };
try {
  for (const p of [...web, ...aiPlan]) {
    const url = SURFACES[p.surfaceId].at(p.q.text);
    const host = new URL(url).host;
    /* a host the route already stopped (or whose robots file disallows) is not asked again: the question is BLOCKED with that reason */
    const stoppedFor = state.stoppedHosts.get(host);
    const read = stoppedFor ? { state: "BLOCKED", reason: stoppedFor, detail: `the route stopped for ${host} earlier in this run — not asked` }
      : ROUTE ? await browserRead(url, { route: robotsSeen.has(host) ? { ...ROUTE, robots: undefined } : ROUTE, state, on: ON, pace }) : { state: "BLOCKED", reason: BLOCK.NO_ROUTE, detail: "the route could not open" };
    robotsSeen.add(host);
    if (read.state !== "READ" && [BLOCK.ROBOTS_DISALLOWED, BLOCK.ROBOTS_UNREADABLE].includes(read.reason)) state.stoppedHosts.set(host, read.reason);
    if (read.state === "READ") asked[p.surfaceId] += 1;
    const kind = SURFACES[p.surfaceId].kind;
    const seen = read.state !== "READ" ? null : kind === SURFACE.WEB_SEARCH ? webSearchSeen(read.text, { surfaceHost: new URL(url).hostname }) : aiAnswerSeen(read.text, { surfaceHost: new URL(url).hostname });
    const mine = seen && kind === SURFACE.WEB_SEARCH ? { domains: surfaces.ownDomains ?? [], ...ownPosition(seen.results, surfaces.ownDomains) } : null;
    records.push(observationRecord({ surfaces: SURFACES, tenantId: SCOPE.tenantId, subject: SUBJECT, surfaceId: p.surfaceId, query: p.q, on: ON, at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), run, read, seen, location: p.location ?? null, own: mine }));
    console.log(`    ${p.surfaceId.padEnd(12)} ${read.state === "READ" ? "OBSERVED" : `BLOCKED ${read.reason}`}${seen?.results ? ` · ${seen.results.length} result domain(s) · features ${seen.features.join(",") || "none"}${mine ? ` · own ${mine.state === "RANKED" ? `#${mine.position}` : mine.state}` : ""}` : seen?.leads ? ` · ${seen.leads.length} address(es), UNVERIFIED LEADS` : ""}`);
  }
} finally { if (ROUTE) await ROUTE.close().catch(() => {}); }
/* F78: the browser route's reads are this run's requests — the run's one cost entry counts them (no paid call; the window is the engine's own) */
if (state.reads) RUN_COST.noteRequests("CLIENT_BROWSER_ROUTE", state.reads);
const census = surfaceCensus(records);
console.log(`  used             web searches ${asked["web-search"]} of ${BOUNDS.webSearches} · AI questions ${asked["ai-answer-a"] + asked["ai-answer-b"]} of ${BOUNDS.aiQuestions} · route reads ${state.reads} (robots files count) · ${Math.round((performance.now() - t0) / 1000)} s`);
console.log(`  stopped hosts    ${[...state.stoppedHosts].map(([h, r]) => `${h} (${r})`).join(" · ") || "none"}`);
console.log(`  F16 C7 census    ${census.verdict} · denominator ${census.denominator} observed result page(s) · blocked ${census.blocked} ${JSON.stringify(census.blockedBy)}`);
if (!permission.mayWrite) { console.log("  NOT WRITTEN — no --confirm"); process.exit(0); }
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, "answer-surface-observations.jsonl")), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_ANSWER_SURFACE_OBSERVATIONS", occurredAt: instant, correlationId: `run:answer-surfaces:${instant}`, discipline: "APPEND_IF_NEW" }));
if (g.outcome !== "COMMITTED" && g.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${g.outcome} — the observations did NOT persist`); process.exit(1); }
console.log(`  kept             ${records.length} observation record(s) in the batch's answer-surface store (no page text)`);
process.exit(0);
