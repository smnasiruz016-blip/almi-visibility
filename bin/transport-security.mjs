#!/usr/bin/env node
/**
 * F27 · SECURITY AND TRANSPORT CHECKS — one client's recorded pages, count-only.
 *
 *   node bin/transport-security.mjs --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched or rendered; writes nothing
 *
 * 🔴 WHAT WAS NEVER COLLECTED IS NOT MEASURED (RR-111): TLS, the http: form's redirect, every response header outside the recorded
 * names, and public exposure — never a pass, a failure or 0. Audit: src/audit/transport-security.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readClientTransport } from "../src/audit/transport-security-reader.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/transport-security.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });

const r = readClientTransport({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const a = r.audit, p = a.parts;
const names = Object.entries(p.headers.recordedNames).map(([k, n]) => `${k} ${n} of ${p.headers.observations}`).join(" · ") || "none";
console.log("F27 · SECURITY AND TRANSPORT CHECKS — this tenant only, recorded data only, count-only");
console.log(`  bound           ${r.bound}`);
console.log(`  HTTPS: HTTPS ${p.https.https} · NOT HTTPS ${p.https.notHttps} · NOT MEASURED ${p.https.notMeasured} of ${p.https.denominator} page(s) · redirect of the http: form measured ${p.https.redirectMeasured} of ${a.fetched} · TLS NOT MEASURED — ${p.https.verdict}`);
console.log(`  MIXED CONTENT: http: references ${p.mixedContent.references} of ${p.mixedContent.referencesSeen} declared references on ${p.mixedContent.pagesRead} of ${p.mixedContent.denominator} HTTPS page(s) read · CSS and script-inserted NOT MEASURED — ${p.mixedContent.verdict}`);
console.log(`  UNSAFE FORMS: unencrypted submissions ${p.unsafeForms.submissions} (forms seen ${p.unsafeForms.formsSeen}) · password inputs on NOT HTTPS pages ${p.unsafeForms.passwordsOnNotHttps} · on ${p.unsafeForms.pagesRead} of ${p.unsafeForms.denominator} fetched page(s) read — ${p.unsafeForms.verdict}`);
console.log(`  HEADERS: none judged — missing ${p.headers.missing[0]} · names recorded: ${names} — ${p.headers.verdict}`);
console.log(`  PUBLIC EXPOSURE: NOT MEASURED — missing ${p.publicExposure.missing[0]} — ${p.publicExposure.verdict}`);
console.log(`  population      ${a.incomplete ? "INCOMPLETE" : "COMPLETE"}${a.incomplete ? ` — absent: ${a.absent.join(" · ")}` : ""}`);
console.log(`  verdict         ${a.verdict}`);
