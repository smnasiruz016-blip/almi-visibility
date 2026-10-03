#!/usr/bin/env node
/**
 * 🔴 F30 · CHANGE CHECK — ONE CLIENT'S OWN RECORDED OBSERVATIONS, THE SAME PAGES COMPARED ACROSS TIME, COUNT-ONLY
 * (acceptance _handoffs fdc9048).
 *
 *   node bin/change-check.mjs --subject=<declared subject> --tenant=<t> [--now=<ISO time>]
 *
 * READ-ONLY. It fetches, renders, schedules and writes nothing.
 *
 * WHAT IT READS:
 * - every research batch the subject declares as a member, each decided by F02 before it is read;
 * - the client's own recrawl setting, if one is declared (the data root's tenancy/recrawl-settings.json, its own entry only).
 *
 * WHAT IT DECIDES: by the recorded rule (src/audit/change-detection.mjs, printed below):
 * - each page observed cleanly at two different times is UNCHANGED or CHANGED;
 * - a page with fewer than two clean observations is NOT MEASURED;
 * - recrawl timing comes only from the client's declared interval, else NOT DECLARED.
 *
 * Generic: nothing here names a client, host, product or path shape.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { lookupStore, lookupSubject, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { siteOriginsOf } from "../src/tenancy/connectors.mjs";
import { changeCheck, CHANGE_RULE, NOT_MEASURED } from "../src/audit/change-detection.mjs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const SUBJECT = arg("subject");
const NOW = arg("now") ?? new Date().toISOString();
if (!SUBJECT || Number.isNaN(Date.parse(NOW))) { console.error("usage: node bin/change-check.mjs --subject=<declared subject> --tenant=<t> [--now=<ISO time>]"); process.exit(2); }

/* the subject's own declared batches and site, named BEFORE the scope decision — everything read is one of these */
const index = rootIndexFor(process.env);
const subject = lookupSubject(index, SUBJECT);
if (subject.state !== "DECLARED") { console.error(`🔴 REFUSED — the subject is ${subject.state}. NOTHING WAS READ.`); process.exit(3); }
const BATCHES = subject.entry.members.filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
const SITE = lookupConnector(index, SUBJECT, "PUBLIC_SITE");
const SITE_ORIGINS = SITE.state === "DECLARED" ? [...siteOriginsOf(SITE.connector)] : [];
if (BATCHES.length === 0) { console.error("🔴 REFUSED — the subject declares no research batch. NOTHING WAS READ."); process.exit(3); }
scopedEntryPoint({ entry: "bin/change-check.mjs", governed: false, resources: [...BATCHES.map((b) => RESOURCES.researchBatch(b)), ...SITE_ORIGINS.map((o) => RESOURCES.siteOrigin(o))] });

const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}.`); process.exit(3); }
const batches = BATCHES.map((b) => {
  const jsonl = (name) => { const f = join(store.dir, b, name); return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; };
  /* the run's records, and the batch's cost ledger — whose entry naming a run is the proof its collection was KEPT (C3) */
  return { batch: b, records: jsonl("crawl.jsonl"), ledger: jsonl("ledger.jsonl") };
});
/* the client's own recrawl setting — its own entry only; with none declared, timing is NOT DECLARED */
const settingsFile = join(store.rootPath, "tenancy", "recrawl-settings.json");
const settings = existsSync(settingsFile) ? JSON.parse(readFileSync(settingsFile, "utf8")).settings ?? [] : [];
const setting = settings.find((s) => s.subjectId === SUBJECT) ?? null;

const r = changeCheck({ batches, setting, now: NOW });
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log(`F30 · CHANGE CHECK — one client's own recorded observations, the same pages across time, count-only · as of ${NOW}`);
console.log(`  rule         ${CHANGE_RULE.id} v${CHANGE_RULE.version} — compares ${CHANGE_RULE.fields.join(", ")}; no threshold, score or weight`);
console.log(`  population   batches ${batches.length} · pages ${r.pages} · observations not clean, counted apart: ${fmt(r.excluded)}`);
console.log(`  compared     ${r.compared} of ${r.pages} page(s) · UNCHANGED ${r.unchanged} · CHANGED ${r.changed} (fields: ${fmt(r.fieldsChanged)}) · ${NOT_MEASURED} ${r.notMeasured} (fewer than two clean observations)`);
console.log(`  fields       not measured on one side: ${r.fieldsNotMeasured}`);
console.log(`  recrawl      setting ${setting ? `every ${setting.everyHours} hour(s), declared by the client` : "NOT DECLARED"} · ${fmt(r.due)} — of ${r.pages} page(s); nothing is scheduled or fetched by this check`);
console.log(`  population   ${r.incomplete ? "INCOMPLETE — a page or field above is NOT MEASURED" : "COMPLETE"} · nothing fetched or written`);
