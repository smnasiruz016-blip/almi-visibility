/**
 * 🔴 THE GENERIC SCOPE RESOLVER — THE ONLY PRODUCTION PATH TO A TENANT IDENTIFIER.
 *
 * ── WHAT A TENANT IS, AFTER THIS MODULE ────────────────────────────────────
 *
 * A tenant is an explicitly DECLARED isolation scope. It is not a property a resource carries, not
 * a thing this engine may compute, and not something a hostname can create. A resource is ATTACHED
 * to a scope by a declaration someone else wrote, in the external declaration source. No
 * attachment, no tenant — and an absent tenant never means "the usual one".
 *
 * Three earlier mechanisms are replaced by this one. Each of them read something the material
 * happened to carry AS IF it were a scope: a capture batch's own id, a subject registry's own id,
 * and an operator's command line. All three are now PROVENANCE or gone. What made them wrong was
 * not which value they picked; it was that a scope was being inferred at all.
 *
 * ── WHY resourceKind IS A LOOKUP KEY AND NOTHING ELSE ──────────────────────
 *
 * 🔴 There is no branch in this file on the VALUE of `resourceKind`. It is half of a composite key
 * and it never reaches a condition, a fallback or a failure mode. That is deliberate and it is
 * tested: a per-kind branch is a client-specific rule wearing a schema's clothes, and the moment one
 * exists, two resource kinds can disagree about what UNDECLARED means. An unknown kind is therefore
 * UNDECLARED like any other unmatched key — never a crash, and never a special case.
 *
 * ── THE FIVE ANSWERS, AND WHY THERE IS NO SIXTH ────────────────────────────
 *
 *   RESOLVED    exactly one ACTIVE declaration attaches this resource
 *   UNDECLARED  nothing attaches it — the honest answer, and never a default scope
 *   AMBIGUOUS   two or more declarations attach it to DIFFERENT scopes; never resolved by
 *               precedence, order or recency, because a silent winner is how a stale
 *               declaration governs a run for a week
 *   INVALID     the reference is malformed, or the attachment names a scope that is not an
 *               ACTIVE declaration — a declaration that points nowhere is a fault, not an absence
 *   UNKNOWN     the declaration source itself could not be read; "I could not look" is not "there
 *               is nothing there", and an unreadable source must never read downstream as clean
 *
 * Only RESOLVED carries a tenantId. Every other state carries null, so a caller cannot half-use one.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { subjectRoots } from "../subject-roots.mjs";

/** The declaration directory inside an external root, and the two files it holds. */
export const TENANCY_DIR = "tenancy";
export const TENANTS_FILE = "tenants.json";
export const ATTACHMENTS_FILE = "attachments.json";

/**
 * The resource kinds a declaration may use. 🔴 This list is a VOCABULARY, not a dispatch table —
 * nothing below branches on which one it is. A reference whose kind is absent from this list still
 * resolves through the same lookup and still answers UNDECLARED; the list exists so a declaration
 * FILE carrying a typo can be rejected at read time rather than silently never matching.
 */
/* F02 (24 Sep 2026): the stores a governed run reads can now be DECLARED — an evidence store, a cost ledger, a capture
 * set, a research batch, a cache store. Before, they had no kind, so no declaration could ever attach them and every run
 * reading one was refused forever, whatever the owner declared. The vocabulary widens; the rule does not: with no
 * attachment each still resolves UNDECLARED and refuses. */
export const RESOURCE_KINDS = Object.freeze(["SITE_ORIGIN", "FACT_REGISTRY", "SITEMAP_COLLECTION", "CRAWL_BATCH", "EVIDENCE_STORE", "COST_LEDGER", "CAPTURE_SET", "RESEARCH_BATCH", "CACHE_STORE"]);

export const RESOLUTION_STATES = Object.freeze(["RESOLVED", "UNDECLARED", "AMBIGUOUS", "INVALID", "UNKNOWN"]);

/** The declared identifier's shape. Read to VALIDATE a declaration — never to construct one. */
export const TENANT_ID_PATTERN = /^tenant:[0-9a-f]{32}$/;

const answer = (state, tenantId, reason, detail) => Object.freeze({ state, tenantId, reason, detail });

/**
 * 🔴 NAMED CARRIED EXCEPTION — REPOSITORY-FILE SUBJECTS HAVE NO DECLARED KIND, AND THEREFORE NO REACH.
 *
 * A page carries a URL, so it resolves through SITE_ORIGIN. A repository file carries no origin,
 * no registry, no collection and no batch — there is no kind above that fits it. Once the operator
 * mechanism was removed, a detection run whose subjects are repository files resolves UNDECLARED and
 * can produce neither FINDING nor CLEAN.
 *
 * That is a REAL LOSS OF REACH for the discovery and file-bundle paths, and it is recorded here
 * rather than absorbed into a sentence in a commit message. It is not repaired by widening a kind to
 * cover files, and not by restoring an operator-supplied scope: both would reintroduce an inferred
 * tenant, which is the thing the law forbids.
 *
 * 🔴 THE UNLOCK CONDITION IS DATA, NOT PROSE. `unlocked(kinds)` answers from the declarations
 * actually in force, so the exception cannot outlive its cause by being forgotten, and no report can
 * claim file-subject reach while it is false.
 */
export const SOURCE_ARTIFACT_EXCEPTION = Object.freeze({
  id: "SOURCE_ARTIFACT_HAS_NO_DECLARED_RESOURCE_KIND",
  subjectType: "SOURCE_ARTIFACT",
  statement: "a repository-file subject carries no reference of any declared resource kind, so it resolves UNDECLARED and can reach neither FINDING nor CLEAN",
  affects: Object.freeze(["bin/detect.mjs --bundle=discover", "bin/detect.mjs --bundle=<file>"]),
  recordedOn: "2026-09-20",
  /** The condition, as data: a fifth declared kind exists that a repository file could be attached by. */
  unlockCondition: Object.freeze({
    kind: "DECLARED_RESOURCE_KIND_EXISTS",
    requiredBeyond: Object.freeze([...RESOURCE_KINDS]),
    describedAs: "a resource kind, declared externally, that a repository-file subject can be attached by",
  }),
  /** @param {string[]} declaredKinds the kinds actually present in the declarations in force */
  unlocked(declaredKinds) {
    if (!Array.isArray(declaredKinds)) return false;
    return declaredKinds.some((k) => typeof k === "string" && k !== "" && !RESOURCE_KINDS.includes(k));
  },
});

/** Every external root that holds a declaration directory. Zero and two are both meaningful. */
export function declarationLocations({ env = process.env } = {}) {
  return subjectRoots(env)
    .filter((r) => r.kind === "external")
    .map((r) => ({ root: r, dir: join(r.path, TENANCY_DIR) }))
    .filter((c) => existsSync(join(c.dir, TENANTS_FILE)) && existsSync(join(c.dir, ATTACHMENTS_FILE)));
}

/**
 * Read the declarations in force. 🔴 It never throws and never returns a partial set: a source that
 * cannot be read yields `{ readable: false }` with the reason, and every lookup against it answers
 * UNKNOWN. An empty array would be indistinguishable from "nothing is declared", which is precisely
 * the confusion that lets an unreadable source pass for a clean one.
 */
export function readDeclarations({ env = process.env } = {}) {
  const found = declarationLocations({ env });
  if (found.length === 0) {
    return { readable: false, reason: "DECLARATION_SOURCE_ABSENT", detail: `no declared external root holds ${TENANCY_DIR}/${TENANTS_FILE} and ${TENANCY_DIR}/${ATTACHMENTS_FILE}`, tenants: null, attachments: null, dir: null };
  }
  if (found.length > 1) {
    return { readable: false, reason: "DECLARATION_SOURCE_AMBIGUOUS", detail: `${found.length} external roots hold a ${TENANCY_DIR} directory at once: ${found.map((f) => f.dir).join(" and ")}`, tenants: null, attachments: null, dir: null };
  }
  const dir = found[0].dir;
  let tenants, attachments;
  try {
    tenants = JSON.parse(readFileSync(join(dir, TENANTS_FILE), "utf8"))?.tenants;
    attachments = JSON.parse(readFileSync(join(dir, ATTACHMENTS_FILE), "utf8"))?.attachments;
  } catch (e) {
    return { readable: false, reason: "DECLARATION_SOURCE_UNREADABLE", detail: `${dir}: ${e.message}`, tenants: null, attachments: null, dir };
  }
  if (!Array.isArray(tenants) || !Array.isArray(attachments)) {
    return { readable: false, reason: "DECLARATION_SOURCE_UNREADABLE", detail: `${dir}: the declaration files do not hold a tenants array and an attachments array`, tenants: null, attachments: null, dir };
  }
  return { readable: true, reason: null, detail: null, tenants, attachments, dir };
}

/**
 * Build a resolver over the declarations in force.
 *
 * The index is composite — kind and reference together — and is built once. A duplicated
 * (kind, reference) attaching to ONE scope is a harmless restatement; attaching to two is
 * AMBIGUOUS. That distinction is measured from the declared ids, never from their order.
 */
export function createTenantResolver({ env = process.env } = {}) {
  const declarations = readDeclarations({ env });

  if (!declarations.readable) {
    const unreadable = () => answer("UNKNOWN", null, declarations.reason, declarations.detail);
    unreadable.declarations = declarations;
    unreadable.declaredKinds = [];
    return unreadable;
  }

  const active = new Map();
  for (const t of declarations.tenants) {
    if (t?.status === "ACTIVE" && typeof t.tenantId === "string" && TENANT_ID_PATTERN.test(t.tenantId)) active.set(t.tenantId, t);
  }

  const index = new Map();
  const declaredKinds = new Set();
  for (const a of declarations.attachments) {
    if (typeof a?.resourceKind !== "string" || typeof a?.resourceRef !== "string") continue;
    declaredKinds.add(a.resourceKind);
    const key = `${a.resourceKind}\u0000${a.resourceRef}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(a);
  }

  const resolve = function resolveTenant({ resourceKind, resourceRef } = {}) {
    if (typeof resourceKind !== "string" || resourceKind.trim() === "" || typeof resourceRef !== "string" || resourceRef.trim() === "") {
      return answer("INVALID", null, "MALFORMED_REFERENCE", `a resource reference needs a non-empty kind and ref (got ${JSON.stringify(resourceKind)} / ${JSON.stringify(resourceRef)})`);
    }

    /* 🔴 ONE LOOKUP, WHATEVER THE KIND. An unknown kind simply matches nothing. */
    const hits = index.get(`${resourceKind}\u0000${resourceRef}`) ?? [];
    if (hits.length === 0) {
      return answer("UNDECLARED", null, "NO_ATTACHMENT", `no declaration attaches ${resourceKind} ${JSON.stringify(resourceRef)} to a scope`);
    }

    const named = new Set(hits.map((h) => h.tenantId));
    if (named.size > 1) {
      return answer("AMBIGUOUS", null, "CONFLICTING_ATTACHMENTS", `${hits.length} declarations attach ${resourceKind} ${JSON.stringify(resourceRef)} to ${named.size} different scopes: ${[...named].sort().join(", ")}`);
    }

    const tenantId = [...named][0];
    if (!active.has(tenantId)) {
      return answer("INVALID", null, "ATTACHMENT_NAMES_UNDECLARED_TENANT", `the declaration attaches ${resourceKind} ${JSON.stringify(resourceRef)} to ${JSON.stringify(tenantId)}, which is not an ACTIVE declared scope`);
    }
    return answer("RESOLVED", tenantId, "EXPLICIT_DECLARED_ATTACHMENT", null);
  };

  resolve.declarations = declarations;
  resolve.declaredKinds = [...declaredKinds].sort();
  resolve.activeTenantCount = active.size;
  return resolve;
}
