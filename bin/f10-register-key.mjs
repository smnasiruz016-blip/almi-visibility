#!/usr/bin/env node
/**
 * 🔴 F10 · GOVERNED KEY REGISTRATION AND PRE-SCORING KEY PREFLIGHT (command af4e9c8, Part D1).
 *
 *   node bin/f10-register-key.mjs measure c6|c7 --actor=<ref> [--confirm]   the key's row count and FULL commitment, for registration
 *   node bin/f10-register-key.mjs verify  c6|c7 --actor=<ref> [--confirm]   the same, and the key must be the REGISTERED one, unchanged
 *
 * Every read is src/heldout/key-registration.mjs: a durable ACCESS event appended and the out-of-tree witness checked EQUAL BEFORE
 * any key byte is read; nothing leaves but a row count, a commitment and codes. Without --confirm nothing is recorded or read.
 * The named actor is authorised by F04 first. Storage S is found only by its declared reference and never printed.
 */
import { readFileSync } from "node:fs";
import { EVIDENCE_ROLE_REGISTRY as REAL_REGISTRY, SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { PROTOCOL } from "../config/human-questions.mjs";
import { C7_PROTOCOL } from "../config/follow-up-questions.mjs";
import { withSyntheticSealedFixture } from "../src/governance/synthetic-sealed-fixture.mjs";
import { resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";
import { governedAuditContext } from "../src/governance/governed-run.mjs";
import { guardAuthority, durableGuardSink } from "../src/governance/guard-audit.mjs";
import { authorise, authorisationEvent, namedActor, AUTHORISATION_REFUSED_EXIT } from "../src/governance/authorisation.mjs";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createWitness, gitDirWitnessLocator, linesOf } from "../src/audit-trail/witness.mjs";
import { measureKey, KeyRegistrationRefused } from "../src/heldout/key-registration.mjs";

/** The two F10 keys: where the owner's `finish` wrote each (src/discovery/f10-labelling.mjs TASKS) and the set each is linked to. */
export const F10_KEYS = Object.freeze({
  c6: Object.freeze({ keyId: "sealed:f10-c6-marking-key", root: "f10-marking-key", prefix: "key/", linkedSetId: "sealed:f10-c3-selection", classes: PROTOCOL.classes, exclusions: PROTOCOL.exclusions }),
  c7: Object.freeze({ keyId: "sealed:f10-c7-marking-key", root: "f10-marking-key", prefix: "pairs-key/", linkedSetId: "sealed:f10-c7-pairs", classes: C7_PROTOCOL.classes, exclusions: C7_PROTOCOL.exclusions }),
});

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const [cmd, task] = argv;
const MODE = { measure: "MEASURE", verify: "VERIFY" }[cmd];
if (!MODE || !F10_KEYS[task]) { console.error("usage: node bin/f10-register-key.mjs measure|verify c6|c7 --actor=<ref> [--confirm]"); process.exit(2); }
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
if (!permission.mayWrite) { console.log("[dry-run] nothing is recorded and no key byte is read — add --confirm"); process.exit(0); }

const NOW = isoSeconds(Date.now());
const correlationId = `run:f10-register-key:${cmd}:${task}:${NOW}`;
const { authorityRef, authorityHash } = guardAuthority({ now: NOW.slice(0, 10) });
const ctx = { ...governedAuditContext({ repo: REPO, correlationId, authorityRef, authorityHash }), actor: "bin/f10-register-key.mjs" };
const decision = authorise({ actorRef: namedActor(argv), action: "RECORD_HELDOUT_EVALUATION", scope: { scopeType: "GLOBAL_PRODUCT" }, resourceRef: `f10-register-key:${cmd}`, now: NOW });
durableGuardSink({ store: ctx.store, actor: ctx.actor, softwareVersion: ctx.softwareVersion, correlationId: `${correlationId}:authorisation`, authorityRef, authorityHash }).emit(authorisationEvent(decision));
if (!decision.allowed) { console.error(`🔴 AUTHORISATION REFUSED — ${decision.outcome} (${decision.reason}); no key byte was read`); process.exit(AUTHORISATION_REFUSED_EXIT); }

const EFFECTIVE = withSyntheticSealedFixture({ registry: REAL_REGISTRY, declared: SEALED_STORE_ROOTS });
/* The production store's witness; a confined (test-context) store has none, so G1 refuses there — by design, not by accident. */
const witness = ctx.synthetic ? null : createWitness({ locate: gitDirWitnessLocator(REPO) });
try {
  const r = measureKey({
    audit: ctx, witness, trailLines: () => linesOf(readFileSync(ctx.store.eventsPath, "utf8")),
    registry: EFFECTIVE.registry, stores: resolveSealedStoreRoots({ declared: EFFECTIVE.declared }), spec: F10_KEYS[task], mode: MODE,
  });
  console.log(`KEY ${task.toUpperCase()} ${MODE} PASSED · rows ${r.rows} · commitment ${r.commitment}`);
  process.exit(0);
} catch (e) {
  if (!(e instanceof KeyRegistrationRefused)) throw e;
  console.error(`🔴 KEY ${task.toUpperCase()} ${MODE} REFUSED — ${e.code}`);
  process.exit(5);
}
