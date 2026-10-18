#!/usr/bin/env node
/**
 * F74 · SAFE IMPLEMENTATION COMMAND GENERATION (acceptance _handoffs afe61ef, RR-284) — one bounded command per approved action.
 *
 *   node bin/implementation-commands.mjs --subject=<id> --research-batch=<id> --actions=approved-actions-YYYY-MM-DD.json --tenant=<id> --actor=<id> [--show]
 *                                                                                                  READ-ONLY; nothing run, fetched or written
 *
 * Each action of the batch's filed list names the owner decision or GREEN it rests on; the engine reads that record back from its authority
 * corpus (CURRENT, OWNER, the committed sha256) and makes exactly one command — scope, what must never happen, stop conditions, proof steps,
 * no secret value — or refuses it by name (src/governance/implementation-commands.mjs). Counts are printed; --show prints the commands.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { generateCommands } from "../src/governance/implementation-commands.mjs";

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), FILE = arg("actions");
if (!SUBJECT || !BATCH || !/^approved-actions-\d{4}-\d{2}-\d{2}\.json$/.test(FILE ?? "")) { console.error("usage: node bin/implementation-commands.mjs --subject=<id> --research-batch=<id> --actions=approved-actions-YYYY-MM-DD.json — nothing read"); process.exit(2); }
scopedEntryPoint({ entry: "bin/implementation-commands.mjs", governed: false, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(join(batchDir, FILE))) { console.error("🔴 REFUSED — NO_ACTIONS_FILED: the batch holds no such actions file; nothing generated"); process.exit(3); }
const { actions } = JSON.parse(readFileSync(join(batchDir, FILE), "utf8"));
const r = generateCommands({ actions, corpus: AUTHORITY_CORPUS });
console.log("F74 · IMPLEMENTATION COMMANDS — one per approved action; nothing run, fetched or written");
console.log(`  actions          ${r.actions} filed · commands ${r.commands.length} · refused ${r.refused.length}${r.refused.length ? ` (${[...new Set(r.refused.map((x) => x.refused))].join(", ")})` : ""}`);
for (const c of r.commands) console.log(`  command          ${c.commandId} · ${c.actionId} · approved by ${c.approval}`);
if (process.argv.includes("--show")) for (const c of r.commands) console.log(`\n${c.text}\n`);
