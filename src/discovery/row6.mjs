/**
 * 🔴 ROW 6, ASSEMBLED — ONE PATH FROM THE STORE TO THE VERDICTS, SHARED BY THE RUNNER AND THE TEST.
 *
 * Its input is the subject's real evidence, every part NAMED: row 5's intent record (built on the query pull it
 * pins), the country×query pull and the page-rows pull below, and the archived bodies of the 12 September crawl.
 * The axes it must test are READ from row 6's frozen EXPECTED clause, not retyped here.
 */
import { loadBoundaries } from "../checklist/boundaries.mjs";
import { extractBody, shingles, jaccard } from "../audit/shell.mjs";
import { row5 } from "./row5.mjs";
import { splitPopulation } from "./query-population.mjs";
import { discoverAxes, axisErrors } from "./axis-discovery.mjs";
import { answerEvidence } from "./answer-evidence.mjs";
import { availableSubjects, importSubjectModule } from "../subject-roots.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { partitionRowsByDeclaredHost } from "../tenancy/row-partition.mjs";
import { factRegistryRef, externalRootContaining } from "../adapter/external-subject.mjs";
import { loadRegistry } from "../facts/registry.mjs";
import { product } from "../product.mjs";

/** The Search Console country×query pull of 2026-09-12T23:25:04.608Z. */
export const COUNTRY_QUERY_OBSERVATION = "9bf50cfb134a0d7d";
/** The Search Console page-rows pull of 2026-09-12T22:06:43.410Z (1,525 pages). */
export const PAGE_ROWS_OBSERVATION = "9f8cbf772d1cd434";

function observation(records, id, methodSuffix) {
  const o = records.find((r) => r.record_type === "observation" && r.observation_id === id);
  if (!o) throw new Error(`observation ${id} is not in the store — the row's input is missing, not empty`);
  if (!o.method.endsWith(methodSuffix)) throw new Error(`observation ${id} is ${o.method}, not ${methodSuffix}`);
  return o;
}

/** The axes the frozen contract names, read from its EXPECTED clause: "axes (a, b, c)". */
export function contractAxes(boundaries = loadBoundaries()) {
  const m = String(boundaries[6]?.expected ?? "").match(/axes \(([^)]+)\)/);
  if (!m) throw new Error("row 6's EXPECTED clause names no axes — the contract could not be read");
  return m[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean);
}

/** Archived page pairs that differ in exactly one path segment, per axis, each with its measured body overlap. */
export function siblingPairs({ bodies, crawlRecords, families }) {
  const seen = new Set();
  const pages = [];
  for (const r of crawlRecords) {
    if (r.record_type !== "observation" || !bodies.has(r.observation_id) || !r.target?.ref) continue;
    const u = new URL(r.target.ref);
    const segs = u.pathname.split("/").filter(Boolean);
    const id = `${u.host}/${segs.join("/")}`;
    if (seen.has(id)) continue;
    seen.add(id);
    pages.push({ url: r.target.ref, host: u.host, segs, id: r.observation_id });
  }
  const cache = new Map();
  const shinglesOf = (p) => {
    if (!cache.has(p.id)) {
      const e = extractBody(bodies.get(p.id));
      cache.set(p.id, e.confident ? shingles(e.bodyText) : null);
    }
    return cache.get(p.id);
  };
  const out = {};
  for (const [axis, list] of Object.entries(families)) {
    out[axis] = [];
    for (const f of list) {
      const group = pages.filter((p) => p.host === f.host && p.segs[0] === f.prefix && p.segs.length === f.depth);
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const diff = group[i].segs.map((s, k) => (s !== group[j].segs[k] ? k : -1)).filter((k) => k >= 0);
          if (diff.length !== 1 || diff[0] !== f.segment) continue;
          const a = group[i].segs[f.segment];
          const b = group[j].segs[f.segment];
          if (f.include && !f.include(a, b)) continue;
          const sa = shinglesOf(group[i]);
          const sb = shinglesOf(group[j]);
          out[axis].push({ a: group[i].url, b: group[j].url, overlap: sa && sb ? jaccard(sa, sb) : null });
        }
      }
    }
  }
  return out;
}

/**
 * Every declared product's axis, read from its own descriptor (`<root>/<id>/product.mjs`, over every subject root) —
 * the axis a human chose by hand before anything ran. The engine names no product: it lists the roots and reads what
 * each declares.
 */
export async function readDeclaredAxes() {
  const out = {};
  for (const id of availableSubjects()) {
    const mod = await importSubjectModule(id, "product.mjs");
    const descriptor = Object.values(mod).find((v) => v && typeof v === "object" && v.axis?.key);
    if (descriptor) out[id] = descriptor.axis.key;
  }
  return out;
}


/**
 * 🔴 THE DECLARED ANSWER EVIDENCE, AND THE SCOPES THAT DECIDE WHETHER IT MAY BE READ.
 *
 * Every declared subject's fact registry is a candidate source of per-value answers. Which tenant
 * each belongs to is read from the DECLARATIONS through the production resolver — never from the
 * product's name, its folder, or the shape of its reference.
 *
 * 🔴 IT RETURNS THE SCOPES EVEN WHEN THEY REFUSE. A loader that quietly returned nothing on an
 * undeclared scope would make the refusal invisible, and an invisible refusal reads exactly like an
 * absence of evidence. The caller is handed the scopes and lets the gate decide.
 */
export async function readDeclaredAnswerEvidence({ axisResourceKind, axisResourceRef, axisRows = null, env = process.env, resolve = null } = {}) {
  /* 🔴 THE RESOLVER IS AN INPUT, NAMED AND CORRECTLY TYPED. Building it behind the caller's back
   * would make the whole tenancy decision an undeclared dependency, and would leave the RESOLVED
   * check below with no reachable input — on the real declarations the only source that reaches it
   * already resolves, so the guard could never be driven false. */
  const resolveScope = resolve ?? createTenantResolver({ env });
  /* 🔴 THE AXIS POPULATION IS A MIXED CAPTURE, SO ITS SCOPE IS DERIVED FROM ITS OWN ROWS.
   * Each row carries the host that attaches it, and the tenant comes from the owner's existing
   * SITE_ORIGIN declaration for that exact host — never from a product name, a file name or a path.
   * A single resource reference can still be given, and is used when no rows are supplied. */
  let axisScope = resolveScope({ resourceKind: axisResourceKind, resourceRef: axisResourceRef });
  let axisPartition = null;
  if (Array.isArray(axisRows)) {
    axisPartition = partitionRowsByDeclaredHost({ rows: axisRows, resolve: resolveScope });
  }

  const sources = [];
  const claims = [];
  let evidenceScope = { state: "UNDECLARED", tenantId: null };

  for (const id of availableSubjects()) {
    await importSubjectModule(id, "product.mjs");
    let descriptor;
    try {
      descriptor = product(id);
    } catch {
      continue;
    }
    const root = externalRootContaining(descriptor.factsDir, env);
    const ref = root === null ? null : factRegistryRef({ factsDir: descriptor.factsDir, rootPath: root.path });
    if (ref === null) {
      sources.push({ subject: id, ref: null, state: "UNDECLARED", records: 0 });
      continue;
    }
    const scope = resolveScope(ref);
    let records = [];
    try {
      ({ records } = await loadRegistry(descriptor.factsDir, descriptor.productId));
    } catch (e) {
      /* 🔴 AN UNREADABLE SOURCE IS UNKNOWN, NEVER EMPTY. */
      sources.push({ subject: id, ref: ref.resourceRef, state: "UNAVAILABLE", records: 0, why: e.message });
      continue;
    }
    sources.push({ subject: id, ref: ref.resourceRef, state: scope.state, tenantId: scope.tenantId ?? null, records: records.length });
    if (scope.state !== "RESOLVED") continue;
    evidenceScope = { state: scope.state, tenantId: scope.tenantId };
    for (const r of records) claims.push({ identity: r.id, answer: r.value, verified: r.verificationState === "VERIFIED" });
  }

  /* 🔴 THE JOIN OPENS ONLY FOR A TENANT THE AXIS POPULATION ITSELF CONTAINS. A declared registry
   * whose tenant owns no row here stays UNDECLARED and is still refused — which is the whole point
   * of the gate, kept intact. */
  if (axisPartition) {
    const rowsForEvidenceTenant = axisPartition.byTenant[evidenceScope.tenantId]?.length ?? 0;
    axisScope = rowsForEvidenceTenant > 0
      ? { state: "RESOLVED", tenantId: evidenceScope.tenantId, rows: rowsForEvidenceTenant, basis: "the axis population's own rows, attached by their stored host through the declared site origins" }
      : { state: "UNDECLARED", tenantId: null, rows: 0, basis: "the axis population contains no row belonging to the tenant that holds this evidence" };
  }

  return { claims, axisScope, evidenceScope, sources, axisPartition: axisPartition?.arithmetic ?? null };
}

/** Pages in the page rows whose URL carries an axis's pattern: the axis HARD-CODED into the URL space. */
export function hardCodedIn(pageRows, patterns) {
  return Object.fromEntries(Object.entries(patterns).map(([axis, res]) => {
    const hits = pageRows.filter((r) => res.some((re) => re.test(r.url)));
    return [axis, { pages: hits.length, impressions: hits.reduce((n, r) => n + (r.impressions || 0), 0), examples: hits.slice(0, 3).map((r) => r.url) }];
  }));
}

/**
 * 🔴 THE ANSWER EVIDENCE IS OPTIONAL TO SUPPLY AND MANDATORY TO GATE. A caller that owns no answer
 * evidence passes none and every answer leg stays UNKNOWN, exactly as before. A caller that owns some
 * must also declare BOTH scopes, and the gate refuses the join unless the production resolver says
 * they are the same declared tenant — decided before any answer is read.
 */
export function row6({ records, crawlRecords, bodies, lexicon, reference, ambiguous, referenceStatus, specs, families, patterns, declaredAxes = {}, answerClaims = null, axisScope = null, evidenceScope = null, availabilityLegs = {}, humanValueLegs = {} }) {
  // 🔴 22 Sep 2026: row 6 consumes row 5's CLUSTERS only; the reference status passes through so a refused score is named
  const r5 = row5({ records, lexicon, reference, ambiguous, referenceStatus });
  const clusterOf = new Map(r5.record.flatMap((c) => c.members.map((m) => [m.original, c.id])));
  const cq = observation(records, COUNTRY_QUERY_OBSERVATION, ":country-query");
  const cqPopulation = splitPopulation(cq.value.rows);
  const pages = observation(records, PAGE_ROWS_OBSERVATION, ":page-rows");
  /* 🔴 THE PAGE-ROW INPUT IS A MIXED CAPTURE, AND THE RUN SAYS SO. One property covers many declared
   * site tenants; the hard-coded-axis counts below are drawn from all of them. The partition is
   * reported rather than applied silently, because a count that hides whose pages it came from is
   * the shape that lets one client's URL space speak for another's. */
  const pageRowScopes = partitionRowsByDeclaredHost({ rows: pages.value.rows, resolve: createTenantResolver({}) });
  const pairs = siblingPairs({ bodies, crawlRecords, families });
  const declaredBy = {};
  for (const [productId, key] of Object.entries(declaredAxes)) (declaredBy[key] ||= []).push(productId);

  /* 🔴 THE ANSWER LEG IS TOLD WHICH VALUES EACH AXIS WAS DISCOVERED ON, so it can refuse to decide
   * an axis whose value vocabulary its evidence does not share. The axes are discovered first, with
   * no answer legs, purely to read their values; the real pass follows. */
  const discovery = discoverAxes({
    record: r5.record, specs, countryRows: cqPopulation.human,
    intentOf: (q) => clusterOf.get(q) ?? null,
    siblingPairs: pairs, siblingFamilies: families,
    hardCoded: hardCodedIn(pages.value.rows, patterns), declaredBy,
  });
  const axisValues = Object.fromEntries(discovery.map((d) => [d.axis, d.discovery.values.map((v) => v.value)]));

  const answers = answerClaims
    ? answerEvidence({ claims: answerClaims, axisScope, evidenceScope, axisValues })
    : { gate: null, byAxis: {}, population: { claims: 0, qualified: 0, verifiedQualified: 0 } };

  const results = discoverAxes({
    record: r5.record,
    specs,
    countryRows: cqPopulation.human,
    intentOf: (q) => clusterOf.get(q) ?? null,
    siblingPairs: pairs,
    siblingFamilies: families,
    hardCoded: hardCodedIn(pages.value.rows, patterns),
    declaredBy,
    answerLegs: answers.byAxis,
    answerDefault: answers.gate,
    availabilityLegs,
    humanValueLegs,
  });
  const named = contractAxes();
  return {
    answerEvidence: answers,
    pageRowScopes,
    input: {
      queries: { observationId: r5.input.observationId, rows: r5.input.rowCount, human: r5.population.human.length, operators: r5.population.operators.length },
      countryQuery: { observationId: COUNTRY_QUERY_OBSERVATION, observedAt: cq.observed_at, rows: cq.value.rows.length, human: cqPopulation.human.length, operators: cqPopulation.operators.length, countries: new Set(cqPopulation.human.map((r) => r.country)).size },
      pageRows: { observationId: PAGE_ROWS_OBSERVATION, observedAt: pages.observed_at, rows: pages.value.rows.length },
      archivedBodies: bodies.size,
    },
    contractAxes: named,
    row5Errors: r5.errors,
    results,
    errors: axisErrors({ results, namedAxes: named }),
  };
}
