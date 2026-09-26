/**
 * 🔴 EVIDENCE ROLES — WHAT A REGISTERED ARTEFACT MAY LAWFULLY DO, CHECKED FAIL-CLOSED (22 September 2026).
 *
 * Generic: it knows no subject, no product and no client. It judges a registry (config/evidence-roles.mjs, or any
 * registry handed to it) by structure alone:
 *   · every entry names ONE known role — a missing or unknown role is refused;
 *   · every permission is an EXPLICIT boolean — "as governed" is not a value, and an unstated permission is refused;
 *   · no artefact acts in two roles, and no role holds a permission its own nature forbids;
 *   · a content hash is a 64-hex sha256 (or a retired set's 16-hex fingerprint), and null ONLY for a sealed artefact.
 * And it answers the one question the firewall asks: may this matched artefact be exempt as ordinary observed data?
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { requireGuardSink, resourceRef } from "./guard-audit.mjs";

export const ROLES = Object.freeze([
  "OBSERVED_DATA", "TRAINING_DATA", "DEVELOPMENT_FIXTURE", "SYNTHETIC_TEST_FIXTURE", "HELD_OUT_EVIDENCE", "MARKING_KEY",
  "GOVERNANCE_METADATA", "RETIRED_CONTAMINATED", "SEALED",
]);
export const PERMISSIONS = Object.freeze(["mandatoryReadable", "mayTrain", "mayEvaluate", "maySupplyExpectedAnswer", "sealed"]);
export const REQUIRED = Object.freeze(["id", "resource", "role", "scope", "source", "provenance", "capturedAt", "contentHash", ...PERMISSIONS, "retiredReason"]);

/** The declared content-hash rule: sha256 over the UTF-8 bytes with CRLF normalised to LF. */
export const contentHashOf = (bytes) => createHash("sha256").update(Buffer.from(Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n"), "utf8")).digest("hex");

const resourceKey = (r) => (r?.path ? `${r.root}:${r.path}` : r?.pathPrefixes ? `${r.root}:prefix:${r.pathPrefixes.join("|")}` : r?.derivation ? `${r.root}:derived:${JSON.stringify(r.derivation)}` : null);

/** Every structural fault of a registry, each with a code. [] means the registry may be used. */
export function registryErrors(registry) {
  const errs = [];
  if (!Array.isArray(registry) || registry.length === 0) return [{ code: "REGISTRY_EMPTY", why: "no registry, or an empty one — nothing can be exempt, and nothing can be judged" }];
  const byResource = new Map();
  for (const [i, e] of registry.entries()) {
    const at = e?.id ?? `entry ${i}`;
    for (const f of REQUIRED) if (!(e && Object.hasOwn(e, f))) errs.push({ code: f === "role" ? "ROLE_MISSING" : "FIELD_MISSING", id: at, why: `${at} does not declare ${f}` });
    if (e && Object.hasOwn(e, "role") && !ROLES.includes(e.role)) errs.push({ code: "ROLE_UNKNOWN", id: at, why: `${at} names an unknown role "${e.role}"` });
    for (const p of PERMISSIONS) if (e && Object.hasOwn(e, p) && typeof e[p] !== "boolean") errs.push({ code: "PERMISSION_NOT_BOOLEAN", id: at, why: `${at}: ${p} is ${JSON.stringify(e[p])}, not an explicit true or false` });
    const key = resourceKey(e?.resource);
    if (!key) errs.push({ code: "RESOURCE_UNIDENTIFIED", id: at, why: `${at} names no path, path prefix or derivation` });
    else { if (byResource.has(key)) errs.push({ code: "DUAL_ROLE", id: at, why: `${at} and ${byResource.get(key)} register the same artefact — no artefact may act in two roles` }); byResource.set(key, at); }
    if (!e) continue;
    const hashOk = e.role === "SEALED" ? e.contentHash === null : typeof e.contentHash === "string" && (/^[0-9a-f]{64}$/.test(e.contentHash) || (e.role === "RETIRED_CONTAMINATED" && /^[0-9a-f]{16}$/.test(e.contentHash)));
    if (!hashOk) errs.push({ code: "HASH_MALFORMED", id: at, why: `${at}: contentHash ${JSON.stringify(e.contentHash)} is not lawful for role ${e.role}` });
    const forbid = (cond, why) => { if (cond) errs.push({ code: "ROLE_PERMISSION_CONFLICT", id: at, why: `${at}: ${why}` }); };
    forbid(e.role === "OBSERVED_DATA" && e.maySupplyExpectedAnswer !== false, "observed data may never supply an expected answer");
    forbid(e.role === "OBSERVED_DATA" && e.sealed !== false, "observed data is not sealed material");
    forbid(["HELD_OUT_EVIDENCE", "MARKING_KEY"].includes(e.role) && e.sealed !== true, `${e.role} outside a sealed boundary is forbidden`);
    forbid(["HELD_OUT_EVIDENCE", "MARKING_KEY"].includes(e.role) && e.mandatoryReadable !== false, `${e.role} may not be mandatory reading`);
    forbid(e.role === "SEALED" && (e.sealed !== true || e.mayTrain || e.mayEvaluate || e.maySupplyExpectedAnswer || e.mandatoryReadable), "sealed material grants nothing and is read by nothing ordinary");
    forbid(e.role === "RETIRED_CONTAMINATED" && (e.mayTrain || e.mayEvaluate || e.maySupplyExpectedAnswer), "a retired population may not train, evaluate or supply an answer");
    forbid(e.role === "RETIRED_CONTAMINATED" && !(typeof e.retiredReason === "string" && e.retiredReason.trim()), "a retired population must state why");
    forbid(e.role !== "RETIRED_CONTAMINATED" && e.retiredReason !== null, "only a retired population carries a retiredReason");
    forbid(e.role === "SYNTHETIC_TEST_FIXTURE" && (e.mayEvaluate || e.maySupplyExpectedAnswer), "a synthetic fixture is never real evidence");
  }
  errs.push(...linkedPairErrors(registry));
  return errs;
}

/* ═══ F07 AMENDMENT 2 (governance 051feb9) — THE LINKED PAIR ═══════════════════════════════════════════════════════════════
 * A MARKING_KEY names, by id, the ONE registered HELD_OUT_EVIDENCE set it marks (`linkedSet`); both declare the tenant scope
 * they cover (`tenantScope`, a list of tenant ids or the one word GLOBAL_PRODUCT); a key may declare the protocol's own label
 * vocabulary (`labelVocabulary`), which is public protocol text and never a leak by itself. The pair must be two distinct
 * artefacts (DUAL_ROLE above), each set carries at most one key, and the pair never spans different tenant scopes. */
export const TENANT_SCOPE_GLOBAL = "GLOBAL_PRODUCT";
const scopeOf = (e) => (Array.isArray(e?.tenantScope) && e.tenantScope.length && e.tenantScope.every((t) => typeof t === "string" && t.trim()) ? [...new Set(e.tenantScope)].sort() : null);
export const sameTenantScope = (a, b) => { const x = scopeOf(a), y = scopeOf(b); return Boolean(x && y && x.length === y.length && x.every((t, i) => t === y[i])); };

export function linkedPairErrors(registry) {
  const errs = [];
  const list = Array.isArray(registry) ? registry : [];
  for (const e of list.filter((x) => ["HELD_OUT_EVIDENCE", "MARKING_KEY"].includes(x?.role))) {
    const at = e.id ?? "?";
    if (!scopeOf(e)) errs.push({ code: "TENANT_SCOPE_UNDECLARED", id: at, why: `${at} (${e.role}) declares no tenant scope — a held-out role is never tenant-blind` });
    if (e.role !== "MARKING_KEY") continue;
    if (Object.hasOwn(e, "labelVocabulary") && !(Array.isArray(e.labelVocabulary) && e.labelVocabulary.every((v) => typeof v === "string" && v.trim()))) errs.push({ code: "LABEL_VOCABULARY_MALFORMED", id: at, why: `${at}: labelVocabulary is not a list of non-empty strings` });
    if (!(typeof e.linkedSet === "string" && e.linkedSet.trim())) { errs.push({ code: "MARKING_KEY_LINK_MISSING", id: at, why: `${at} names no linked HELD_OUT_EVIDENCE set` }); continue; }
    const set = list.find((x) => x?.id === e.linkedSet);
    if (!set || set.role !== "HELD_OUT_EVIDENCE") { errs.push({ code: "MARKING_KEY_LINK_UNRESOLVED", id: at, why: `${at} links to an id that is not a registered HELD_OUT_EVIDENCE set` }); continue; }
    if (scopeOf(e) && scopeOf(set) && !sameTenantScope(e, set)) errs.push({ code: "PAIR_CROSSES_TENANTS", id: at, why: `${at} and its set ${set.id} declare different tenant scopes` });
  }
  const keysBySet = new Map();
  for (const k of list.filter((x) => x?.role === "MARKING_KEY" && typeof x.linkedSet === "string")) keysBySet.set(k.linkedSet, [...(keysBySet.get(k.linkedSet) ?? []), k.id]);
  for (const [set, keys] of keysBySet) if (keys.length > 1) errs.push({ code: "SET_HAS_MORE_THAN_ONE_KEY", id: set, why: `${set} is linked by ${keys.length} marking keys — a grant must bind exactly one` });
  return errs;
}

/** The registry entry for a repository-relative path in a given root, or null. Path equality, never similarity. */
export const entryFor = (registry, root, path) => (registry || []).find((e) => e.resource?.root === root && e.resource?.path === path) ?? null;

/**
 * 🔴 MAY THIS MATCHED ARTEFACT BE EXEMPT AS ORDINARY OBSERVED DATA? Lawful ONLY when every condition holds — the owner's
 * six, checked one by one, each failure named. `read` returns the artefact's bytes; `evaluatorSources` are the
 * sources of the held-out evaluators (checked for the artefact's path by exact substring of the path, never a guess).
 */
export function observedDataExemption({ registry, root, path, read, evaluatorSources = [], audit }) {
  /* 🔴 F08 §6.2 — EVERY DECISION, ALLOWED OR REFUSED, IS AUDITED HERE, ONCE, AS IT IS MADE. The sink is required and
   * checked before anything is read. Every outcome below leaves through `decided`, which emits exactly one
   * metadata-only event — the entry id, its role, the root and a digest of the artefact's path; never its bytes and
   * never the path — and then returns. A failed emission throws: an unaudited decision is not a decision. */
  requireGuardSink(audit, "observedDataExemption");
  const decided = (result, entry = null) => {
    audit.emit({
      eventType: "EVIDENCE_ROLE_DECISION", action: "EXEMPT_AS_OBSERVED_DATA", outcome: result.exempt ? "ALLOWED" : "REFUSED", reasonCode: result.code,
      metadata: { guard: "observedDataExemption", classification: result.exempt ? "OBSERVED_DATA_EXEMPT" : "NOT_EXEMPT", ruleEntry: entry ? String(entry.id) : "UNREGISTERED", role: entry ? String(entry.role) : "UNREGISTERED", root: String(root), resourceRef: resourceRef(root, path) },
    });
    return result;
  };
  const e = entryFor(registry, root, path);
  if (!e) return decided({ exempt: false, code: "UNREGISTERED", why: `${root}:${path} is not registered — an unregistered match fails closed` });
  if (e.role !== "OBSERVED_DATA") return decided({ exempt: false, code: "NOT_OBSERVED_DATA", why: `${e.id} is registered as ${e.role}, not OBSERVED_DATA` }, e);
  const actual = contentHashOf(read());
  if (actual !== e.contentHash) return decided({ exempt: false, code: "HASH_MISMATCH", why: `${e.id}: the registered hash does not match the artefact's content — changed without re-registration` }, e);
  if (e.maySupplyExpectedAnswer !== false) return decided({ exempt: false, code: "MAY_SUPPLY_EXPECTED_ANSWER", why: `${e.id} may supply an expected answer` }, e);
  if (e.mandatoryReadable !== false) return decided({ exempt: false, code: "MANDATORY_READING", why: `${e.id} is mandatory reading` }, e);
  if (evaluatorSources.some((s) => s.includes(path))) return decided({ exempt: false, code: "IMPORTED_BY_HELD_OUT_EVALUATOR", why: `${e.id} is read by a held-out evaluator` }, e);
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
  const labels = (registry || []).filter((x) => ["MARKING_KEY", "HELD_OUT_EVIDENCE"].includes(x.role) && x.resource?.root === root && (x.resource?.path ?? "").startsWith(dir));
  if (labels.length) return decided({ exempt: false, code: "EXPECTED_LABEL_ALONGSIDE", why: `${e.id} sits beside expected-label material (${labels.map((x) => x.id).join(", ")})` }, e);
  return decided({ exempt: true, code: "REGISTERED_OBSERVED_DATA", entry: e.id }, e);
}

/** Read a file's bytes (for `observedDataExemption`). */
export const bytesOf = (file) => () => readFileSync(file);
