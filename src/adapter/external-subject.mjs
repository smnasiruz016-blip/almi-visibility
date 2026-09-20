/**
 * THE EXTERNAL SUBJECT ADAPTER — the first real subject, read through the declared external root.
 *
 * ── 🔴 WHAT THIS IS, AND WHAT IT IS CAREFUL NOT TO BE ───────────────────────────────────────────
 *
 * The engine had met real material exactly once, in the sealed examination, and it failed: the
 * comparators fired thousands of times at file paths while the subjects under examination drew
 * nothing. V1 then gave every result a tenant, a typed subject and a binding state — but V1 was
 * only ever measured against fixtures the run was handed directly, which is the easiest possible
 * binding and proved very little. This adapter is the first time a REAL external subject reaches
 * that contract.
 *
 * 🔴 IT KNOWS NO PRODUCT. It is handed a product id, resolves whatever that id declares through the
 * engine's existing subject-root mechanism, and reads it. There is no rule here about any
 * particular subject's vocabulary, authorities, routes or wording — nothing in this file would read
 * differently if it were pointed at a second subject tomorrow, and `test/product-boundary.test.mjs`
 * fails the build if `src/` ever names one in code.
 *
 * 🔴 READ-ONLY, AND NOTHING IS COPIED IN. It opens the external root, derives bindings from evidence
 * ALREADY PRESENT there, and returns them. No record, page, fact or value is written into this
 * repository, and none is persisted anywhere by this module.
 *
 * ── THE EDGE IT DERIVES, AND WHY IT IS INTRINSIC ────────────────────────────────────────────────
 *
 * A product's page spec cites CLAIM IDS. Those ids resolve, or do not, against that product's own
 * fact registry. That resolution is not a resemblance anybody noticed — it is a reference the
 * subject's own material already carries, which is exactly what `CLAIM_SUPPORTED_BY_FACT` is for.
 * Nothing here matches on similar text, equal numbers, nearby paths or arrival order.
 */
import { relative, sep } from "node:path";

import { subjectRef } from "../detect/subject.mjs";
import { evidenceEdge } from "../detect/binding.mjs";
import { loadRegistry } from "../facts/registry.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { subjectRoots } from "../subject-roots.mjs";

/** Why an external subject could not be read. An unavailable root is never a clean run. */
export const ADAPTER_UNAVAILABLE = Object.freeze({
  ROOT_UNAVAILABLE: "the declared external root could not be resolved or read",
  NO_REGISTRY: "the subject declares no readable fact registry",
  NO_PAGE_SPECS: "the subject declares no page specs, so it cites no claims",
  TENANT_UNDECLARED: "no declaration attaches this fact registry to an isolation scope",
  TENANT_AMBIGUOUS: "two or more declarations attach this fact registry to different scopes",
  TENANT_INVALID: "the declaration for this fact registry is malformed or names a scope that is not declared",
  TENANT_SOURCE_UNKNOWN: "the declaration source could not be read, so this registry's scope is unknown rather than absent",
});

const TENANT_FAILURE = Object.freeze({
  UNDECLARED: "TENANT_UNDECLARED", AMBIGUOUS: "TENANT_AMBIGUOUS",
  INVALID: "TENANT_INVALID", UNKNOWN: "TENANT_SOURCE_UNKNOWN",
});

/**
 * The declared reference for a subject's fact registry: its directory RELATIVE TO the external root
 * that resolves it. 🔴 A relative reference, not an absolute path — an absolute one carries a drive
 * letter and a checkout location, so the same registry would need a different declaration on every
 * machine and CI would resolve nothing.
 *
 * 🔴 AND IT IS A LOOKUP KEY, NOT A DERIVATION. The scope is whatever the declaration says it is;
 * this function only says WHICH declaration to read. Nothing about the path contributes to the
 * identifier, which is why the identifier is opaque and assigned once elsewhere.
 */
export function factRegistryRef({ factsDir, rootPath }) {
  if (typeof factsDir !== "string" || factsDir === "" || typeof rootPath !== "string" || rootPath === "") return null;
  const rel = relative(rootPath, factsDir);
  if (rel === "" || rel.startsWith("..")) return null;
  return { resourceKind: "FACT_REGISTRY", resourceRef: rel.split(sep).join("/") };
}

/**
 * Read one external subject and derive its lawful bindings.
 *
 * @param {object} input
 * @param {object} input.product   the product descriptor, already resolved by the engine's own
 *                                 subject-root mechanism. NOT a path this module chose.
 * @returns `{ available, reason, tenantId, claims, registry, subjectBindings, populations }`
 *
 * 🔴 `product` HAS NO DEFAULT. A runner that picks its own subject measures nothing in particular,
 * and an adapter that falls back to "the usual one" is how a second tenant's data gets read by the
 * first tenant's run.
 */
export async function readExternalSubject({ product, env = process.env, resolveTenant = null } = {}) {
  if (!product || typeof product.productId !== "string" || product.productId.trim() === "") {
    return unavailable(null, "ROOT_UNAVAILABLE", "no resolved product descriptor was supplied");
  }

  if (typeof product.factsDir !== "string" || product.factsDir === "") {
    return unavailable(null, "NO_REGISTRY", "the subject declares no facts directory");
  }

  /* 🔴 THE PRODUCT ID USED TO BE THE TENANT HERE, AND IT IS NOW PROVENANCE ONLY.
   *
   * `const tenantId = product.productId` read a subject registry's own name as an isolation scope.
   * Like the capture batch on the page side, it was a plausible value derived from material that
   * never claimed to be a scope — and deriving one at all is what the law forbids. The registry is
   * now attached to a declared scope by an explicit declaration, looked up below. If nobody declared
   * one, this adapter reports that and binds nothing; it does not fall back to the id it used to use. */
  /* 🔴 THE REGISTRY IS READ BEFORE THE SCOPE IS RESOLVED, AND THE ORDER IS LOAD-BEARING.
   *
   * The first version of this resolved the scope first, and it turned an unreadable root and an
   * empty registry into TENANT_UNDECLARED — fail-closed, but reporting the wrong cause. Two existing
   * tests caught it. A reader chasing "no declaration attaches this registry" would have gone
   * looking in the declaration file for a fault that was actually an unmounted drive.
   *
   * So the material is read first and its own faults reported in its own words; only material that
   * really is there goes on to ask which scope it belongs to. Both orders refuse; only this one
   * says why. */
  let records;
  try {
    ({ records } = await loadRegistry(product.factsDir, product.productId));
  } catch (e) {
    /* 🔴 AN UNREADABLE ROOT IS UNKNOWN, NOT EMPTY. Returning an empty population here would let a
     * wrong path, an unmounted drive or a permission error read downstream as "nothing is wrong". */
    return unavailable(null, "ROOT_UNAVAILABLE", `the external root could not be read: ${e.message}`);
  }
  if (!Array.isArray(records) || records.length === 0) {
    return unavailable(null, "NO_REGISTRY", `the registry at the declared root holds ${Array.isArray(records) ? 0 : "no"} record(s)`);
  }

  const root = externalRootContaining(product.factsDir, env);
  const ref = root === null ? null : factRegistryRef({ factsDir: product.factsDir, rootPath: root.path });
  if (ref === null) {
    return unavailable(null, "TENANT_UNDECLARED", `the facts directory ${product.factsDir} is not inside a declared external root, so it has no declarable reference`);
  }
  const resolved = (resolveTenant ?? createTenantResolver({ env }))(ref);
  if (resolved.state !== "RESOLVED") {
    return unavailable(null, TENANT_FAILURE[resolved.state], `${resolved.reason}: ${resolved.detail ?? ""}`.trim());
  }
  const tenantId = resolved.tenantId;
  const provenance = Object.freeze({ productId: product.productId, registryRef: ref.resourceRef });

  const specs = product.pageSpecs ?? {};
  const slugs = Object.keys(specs);
  if (slugs.length === 0) {
    return unavailable(tenantId, "NO_PAGE_SPECS", "the subject declares no page specs, so no claim is cited by anything");
  }

  const byId = new Map(records.map((r) => [r.id, r]));
  const claims = [];
  const subjectBindings = {};
  let citedTotal = 0, resolvedTotal = 0, danglingTotal = 0, ambiguousTotal = 0;

  for (const slug of slugs) {
    const spec = specs[slug];
    const cited = (spec?.sections ?? []).flatMap((s) => s.claims ?? []);
    for (const claimId of cited) {
      citedTotal += 1;

      const bound = bindCitedClaim({ tenantId, slug, claimId, records });
      if (bound.kind === "DANGLING") danglingTotal += 1;
      else if (bound.kind === "AMBIGUOUS") ambiguousTotal += 1;
      else resolvedTotal += 1;

      subjectBindings[bound.claimSubject.identity] = { candidates: bound.candidates, edges: bound.edges };
      claims.push({
        id: bound.claimSubject.identity,
        locator: bound.claimSubject.locator,
        authority: bound.record?.claim?.subject ?? null,
        predicate: bound.record?.claim?.predicate ?? null,
        statedValue: bound.record?.value?.value ?? null,
      });
    }
  }

  /* The registry side, read from the SAME external material. `readable: true` is declared only
   * because it was actually read above — an unreadable root returned long before this point. */
  const registry = {
    readable: true,
    records: records.map((r) => ({
      authority: r?.claim?.subject ?? null,
      predicate: r?.claim?.predicate ?? null,
      value: r?.value?.value ?? null,
    })),
  };

  return Object.freeze({
    available: true,
    reason: null,
    tenantId,
    provenance,
    claims,
    registry,
    subjectBindings,
    populations: Object.freeze({
      records: records.length,
      pageSpecs: slugs.length,
      claimsCited: citedTotal,
      claimsResolved: resolvedTotal,
      claimsDangling: danglingTotal,
      claimsAmbiguous: ambiguousTotal,
    }),
  });
}

/**
 * 🔴 ONE CITATION, JUDGED — EXPORTED SO ALL THREE OF ITS BRANCHES CAN BE REACHED.
 *
 * Two of these branches cannot occur in the real material as it stands: the subject's own page
 * specs resolve every claim they cite, and its registry keeps one active record per claim. Guards
 * that no input can reach are guards nobody has seen refuse, so this is exported and driven
 * directly with crafted record sets — a defensive branch nothing exercises is a comment.
 *
 *   RESOLVED   exactly one record carries this id  -> one candidate, one lawful edge
 *   DANGLING   the citation names an id nothing holds -> the candidate stays VISIBLE, no edge
 *   AMBIGUOUS  two records claim the id -> every candidate named, no edge, never a choice
 */
export function bindCitedClaim({ tenantId, slug, claimId, records }) {
  const matches = (records ?? []).filter((r) => r.id === claimId);
  const claimSubject = subjectRef({
    type: "PUBLIC_CLAIM", tenantId, identityKind: "STRUCTURED_REFERENCE",
    identity: `${slug}#${claimId}`, locator: `pageSpec:${slug} cites ${claimId}`,
  });

  if (matches.length === 0) {
    return { kind: "DANGLING", claimSubject, record: null, candidates: [claimSubject], edges: [] };
  }
  if (matches.length > 1) {
    return { kind: "AMBIGUOUS", claimSubject, record: null, candidates: matches.map((m) => factSubject(tenantId, m)), edges: [] };
  }
  const fact = factSubject(tenantId, matches[0]);
  return {
    kind: "RESOLVED", claimSubject, record: matches[0], candidates: [fact],
    edges: [evidenceEdge({
      from: claimSubject, to: fact, edgeType: "CLAIM_SUPPORTED_BY_FACT", tenantId,
      method: "the subject's own page spec cites this claim id, and the id resolves in the subject's own fact registry",
      artifact: `pageSpec:${slug} -> factsDir record ${matches[0].id}`,
      reason: "a citation the material itself carries — not a resemblance, a shared number or a nearby path",
    })],
  };
}

function factSubject(tenantId, record) {
  return subjectRef({
    type: "FACT_RECORD", tenantId, identityKind: "FACT_ID",
    identity: record.id, locator: `${record._file ?? "(file)"}:${record.id}`,
  });
}

/**
 * The declared external root that contains a path. 🔴 Two roots containing it is refused rather
 * than resolved by order: a silent winner here would silently change which declaration is read.
 */
export function externalRootContaining(path, env) {
  const inside = (p, root) => { const rel = relative(root, p); return rel !== "" && !rel.startsWith(".."); };
  const hits = subjectRoots(env).filter((r) => r.kind === "external" && inside(path, r.path));
  return hits.length === 1 ? hits[0] : null;
}

function unavailable(tenantId, reason, detail) {
  return Object.freeze({
    available: false, reason, detail, tenantId,
    claims: [], registry: { readable: false, unreadableReason: detail },
    subjectBindings: {},
    populations: Object.freeze({ records: 0, pageSpecs: 0, claimsCited: 0, claimsResolved: 0, claimsDangling: 0, claimsAmbiguous: 0 }),
  });
}

/**
 * Shape the adapter's output as a bundle the EXISTING shared A–F integration point already accepts.
 * Nothing about any comparator's meaning changes; this only says which slice of evidence it reads.
 */
export function toBundle(subject) {
  return {
    pageSubjects: [],
    subjectBindings: subject.subjectBindings,
    claimRegistry: { claims: subject.claims, registry: subject.registry },
  };
}
