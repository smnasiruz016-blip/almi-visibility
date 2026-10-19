#!/usr/bin/env node
/**
 * F91 · AMENDMENT 6 · THE PAGE PLAN BY THE OWNER'S DEMAND-OR-OPPORTUNITY RULE (acceptance _handoffs
 * AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_6_2026-10-18.md, RR-286) — READ-ONLY; nothing fetched, written or published.
 *
 *   node bin/page-plan.mjs --subject=<id> --research-batch=<id> --inputs=page-plan-inputs-YYYY-MM-DD.json --tenant=<id> --actor=<id> [--list]
 *
 * Every requested combination of the batch's declared page dimensions gets exactly one of DEMAND · OPPORTUNITY · MERGED INTO <page>, with its
 * reason (src/page/page-plan.mjs), over the batch's stored records only: its verified claims as answers, and every stored demand record —
 * the client's own Search Console queries among them — judged by F18's rule. The OPPORTUNITY label stays in this output; no page shows it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { planFaults, LABEL } from "../src/page/page-plan.mjs";
import { approvedPlan } from "../src/page/plan-batch.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), INPUTS = arg("inputs");
if (!SUBJECT || !BATCH || !/^page-plan-inputs-\d{4}-\d{2}-\d{2}\.json$/.test(INPUTS ?? "")) { console.error("usage: node bin/page-plan.mjs --subject=<id> --research-batch=<id> --inputs=page-plan-inputs-YYYY-MM-DD.json [--list] — nothing read"); process.exit(2); }
scopedEntryPoint({ entry: "bin/page-plan.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, INPUTS))) { console.error("🔴 REFUSED — NO_PLAN_INPUTS_FILED: the batch files no such plan inputs; nothing read"); process.exit(3); }
const json = (f) => JSON.parse(readFileSync(join(batchDir, f), "utf8"));
const rows = (f) => { try { return readFileSync(join(batchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const inputs = json(INPUTS);
/* the inputs name their two dimensions: the primary's values each have the page a combination merges into */
/* RR-292: the plan is read by the ONE reader every batch build uses (src/page/plan-batch.mjs approvedPlan) */
const plan = approvedPlan({ inputs, rows, json });
const claims = (json("page-drafts.json").pages ?? []).flatMap((p) => (p.needs ?? []).flatMap((n) => (n.answer?.claims ?? []).map((c) => ({ claimId: c.claimId, primary: p.combination?.[inputs.primary?.name], body: c.body ?? c.source?.body, text: c.text }))));
if (!plan.measured) { console.log(`F91 · PAGE PLAN — NOT MEASURED: missing ${plan.missing}`); process.exit(0); }
const faults = planFaults(plan, { claims });
console.log("F91 · PAGE PLAN (Amendment 6) — DEMAND, OPPORTUNITY or MERGED for every requested combination; nothing written or published");
console.log(`  candidates       ${plan.candidates} (the raw combination count — candidates only: not pages, not demand)`);
console.log(`  plan             DEMAND ${plan.counts.DEMAND} · OPPORTUNITY ${plan.counts.OPPORTUNITY} · MERGED ${plan.counts.MERGED} · NOT MEASURED ${plan.counts.NOT_MEASURED}`);
console.log(`  demand records   ${plan.observedRecords} observed (each with its own source and date, F18's rule)`);
console.log(`  duplicate/thin   ${faults.length} planned page(s) at fault`);
if (process.argv.includes("--list")) for (const r of plan.rows) console.log(`    ${r.label.padEnd(12)} ${r.combination}${r.label === LABEL.MERGED ? ` → ${r.target}` : ""} — ${r.reason}`);
