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
import { subjectRef } from "../detect/subject.mjs";
import { evidenceEdge } from "../detect/binding.mjs";
import { loadRegistry } from "../facts/registry.mjs";

/** Why an external subject could not be read. An unavailable root is never a clean run. */
export const ADAPTER_UNAVAILABLE = Object.freeze({
  ROOT_UNAVAILABLE: "the declared external root could not be resolved or read",
  NO_REGISTRY: "the subject declares no readable fact registry",
  NO_PAGE_SPECS: "the subject declares no page specs, so it cites no claims",
});

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
export async function readExternalSubject({ product } = {}) {
  if (!product || typeof product.productId !== "string" || product.productId.trim() === "") {
    return unavailable(null, "ROOT_UNAVAILABLE", "no resolved product descriptor was supplied");
  }
  const tenantId = product.productId;

  if (typeof product.factsDir !== "string" || product.factsDir === "") {
    return unavailable(tenantId, "NO_REGISTRY", "the subject declares no facts directory");
  }

  let records;
  try {
    ({ records } = await loadRegistry(product.factsDir, tenantId));
  } catch (e) {
    /* 🔴 AN UNREADABLE ROOT IS UNKNOWN, NOT EMPTY. Returning an empty population here would let a
     * wrong path, an unmounted drive or a permission error read downstream as "nothing is wrong". */
    return unavailable(tenantId, "ROOT_UNAVAILABLE", `the external root could not be read: ${e.message}`);
  }
  if (!Array.isArray(records) || records.length === 0) {
    return unavailable(tenantId, "NO_REGISTRY", `the registry at the declared root holds ${Array.isArray(records) ? 0 : "no"} record(s)`);
  }

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
