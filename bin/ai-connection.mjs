#!/usr/bin/env node
/**
 * F16 · C17–C18 · THE CLIENT'S OWN AI CONNECTION — CONNECT OR DISCONNECT (Acceptance Amendment 3, _handoffs 1e48cb8; RR-159).
 *
 *   node bin/ai-connection.mjs --tenant=<id> --actor=<id> --subject=<id> --research-batch=<id> --connect|--disconnect --confirm
 *
 * 🔴 THERE IS NO DRY RUN, AND IT REACHES NOTHING. It appends ONE event to the research batch's own connection store (ai-connection.jsonl),
 * through the governed write path: CONNECTED (the subject's declared AI_PROVIDER connector, which must exist) or DISCONNECTED (at any time,
 * whatever the connector's state). A disconnect is never a deletion: every record already written stays exactly as it is, and needs no
 * re-verification — no admitted record rests on a provider's output. A run in flight reads this store before every provider call and every
 * source read, and stops on DISCONNECTED (bin/collect-public-questions.mjs). The credential is the client's own and is never touched here:
 * not its name's value, not any part of it. Generic: it names no provider, plan tier, tenant or host.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupSubject, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { namedActor } from "../src/governance/authorisation.mjs";
import { AI_CONNECTOR_KIND, CONNECTION, connectionEvent, connectionNow } from "../src/research/ai-connection.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch");
const want = process.argv.includes("--connect") ? CONNECTION.CONNECTED : process.argv.includes("--disconnect") ? CONNECTION.DISCONNECTED : null;
if (!SUBJECT || !BATCH || !want || (process.argv.includes("--connect") && process.argv.includes("--disconnect"))) { console.error("usage: node bin/ai-connection.mjs --subject=<id> --research-batch=<id> --connect|--disconnect --confirm — nothing written"); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
if (!permission.mayWrite) { console.error("🔴 REFUSED — CONNECTION_CHANGE_REQUIRES_CONFIRM: there is no dry run; nothing written"); process.exit(2); }

const SCOPE = scopedEntryPoint({ entry: "bin/ai-connection.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
const members = lookupSubject(index, SUBJECT).entry?.members ?? [];
if (!members.some((m) => m.resourceKind === "RESEARCH_BATCH" && m.resourceRef === BATCH)) { console.error("🔴 REFUSED — BATCH_NOT_THIS_SUBJECTS: the subject does not declare this research batch"); process.exit(3); }
const batchDir = join(store.dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT"); process.exit(3); }
const connector = lookupConnector(index, SUBJECT, AI_CONNECTOR_KIND);
/* a CONNECT needs the subject's own declared AI connection; a DISCONNECT is always allowed — the client can always leave */
if (want === CONNECTION.CONNECTED && connector.state !== "DECLARED") { console.error(`🔴 REFUSED — AI_CONNECTION_UNDECLARED: the subject declares no ${AI_CONNECTOR_KIND} connector (${connector.state}); nothing written`); process.exit(3); }
const connectorId = connector.state === "DECLARED" ? connector.connector.connectorId : arg("connector-id");
if (!connectorId) { console.error("🔴 REFUSED — no connector to disconnect: name it with --connector-id=<id>"); process.exit(3); }

/* the batch's own connection store, inside the RESEARCH store the gate decided */
const file = join(batchDir, "ai-connection.jsonl");
const before = connectionNow(existsSync(file) ? createJsonlStore(join(store.dir, BATCH, "ai-connection.jsonl")).readAll() : [], { subject: SUBJECT, connectorId });
const at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const ev = connectionEvent({ subject: SUBJECT, connectorId, event: want, at, by: namedActor(process.argv) ?? "unnamed" });
const g = executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(file), records: [ev],
  targetClass: "GENERATED_CONFIG", action: "APPEND_AI_CONNECTION_EVENTS", occurredAt: at, correlationId: `run:ai-connection:${at}`, discipline: "APPEND_IF_NEW" }));
if (g.outcome !== "COMMITTED" && g.outcome !== "ALREADY_COMMITTED") { console.error(`  🔴 ${g.outcome} — the connection event did NOT persist`); process.exit(1); }
console.log("F16 · THE CLIENT'S OWN AI CONNECTION — this tenant's subject only; nothing reached, no credential touched");
console.log(`  ${before} → ${want} (as at ${at}) · every record already written stands unchanged and needs no re-verification`);
