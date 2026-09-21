/**
 * 🔴 THE ANSWER LEG — THE ONE MEASUREMENT ROW 6's VERDICT TURNS ON, AND THE ONE IT COULD NOT CARRY.
 *
 * `verdictOf` has always asked whether the useful ANSWER materially changes as an axis's value
 * changes: MEASURED + changes → BUILD, MEASURED + does not change → REJECT. But `discoverAxes` set
 * that leg to the literal `UNKNOWN`, with no parameter by which any evidence could reach it. So the
 * two terminal branches were unreachable from the production path — not because the evidence was
 * thin, but because there was no way in. Measured before this module existed: with every parameter
 * `discoverAxes` accepts supplied maximally, terminal verdicts were 0 of 1.
 *
 * This is the way in. It is generic: it knows no product, no host, no authority and no axis name.
 *
 * ── WHAT COUNTS AS "THE ANSWER AT A VALUE" ────────────────────────────────
 *
 * A claim whose identity ends in `.<axis>=<value>` is one value's answer to one question. The
 * question is the identity's STEM — everything before that qualifier. Two claims answer the SAME
 * question only when their stems are identical.
 *
 * 🔴 THE STEM CARRIES THE AUTHORITY, AND THAT IS DELIBERATE. Two claims stated by different
 * authorities are two different questions, even when their claim names match. Comparing them would
 * let the authority change WITH the axis value, so any difference measured would be the authority's,
 * not the axis's — a confounded pair that produces a confident, wrong terminal verdict. Grouping by
 * the full stem refuses that pair structurally, rather than hoping a caller notices.
 *
 * ── THE TWO LAWS THIS LEG INHERITS ────────────────────────────────────────
 *
 * ACCEPT ONLY ON A MEASUREMENT. An answer that is not VERIFIED is not an answer. An unverified
 * record standing in for one is exactly "missing evidence turned into a measurement".
 *
 * LAW-ABSENT-1. One value's answer says nothing about whether the answer changes. Fewer than two
 * verified values is INSUFFICIENT_EVIDENCE — never "the answer does not change".
 *
 * 🔴 TENANCY IS DECIDED BEFORE CONTENT. Cross-tenant evidence is INVALID and is refused before a
 * single answer is read, so no client's material can ever decide another's axis.
 */

/** Every state this leg can report. INSUFFICIENT_EVIDENCE and the two refusals are never terminal. */
export const ANSWER_LEG_STATES = Object.freeze([
  "MEASURED",
  "INSUFFICIENT_EVIDENCE",
  "AMBIGUOUS",
  "INVALID_CROSS_TENANT",
  "UNDECLARED_TENANT",
]);

export const ANSWER_REASONS = Object.freeze({
  TENANT_UNDECLARED: "TENANT_UNDECLARED",
  TENANT_CROSS: "TENANT_CROSS",
  NO_QUALIFIED_CLAIM: "NO_QUALIFIED_CLAIM",
  ONE_VALUE_ONLY: "ONE_VALUE_ONLY",
  NO_VERIFIED_ANSWER: "NO_VERIFIED_ANSWER",
  CONFLICTING_ANSWERS_AT_A_VALUE: "CONFLICTING_ANSWERS_AT_A_VALUE",
  DISJOINT_VALUE_POPULATION: "DISJOINT_VALUE_POPULATION",
  /* 🔴 §5 — the two refusals that keep a verdict at the level the axis was discovered on. */
  CONSTANT_AT_DISCOVERED_LEVEL: "CONSTANT_AT_DISCOVERED_LEVEL",
  INCOMPLETE_LEVEL_MAPPING: "INCOMPLETE_LEVEL_MAPPING",
  ANSWER_CHANGES: "ANSWER_CHANGES",
  ANSWER_CONSTANT: "ANSWER_CONSTANT",
});

/**
 * 🔴 PROJECT THE DISCOVERED VALUES THROUGH A LEVEL MAPPING, AND ANSWER AT THEIR LEVEL.
 *
 * An axis is discovered on the values people actually used. Answer evidence is often recorded at a
 * coarser level — classes, regions, "domestic" against "foreign". A mapping from the discovered
 * value to the level the answer was recorded at joins the two, and that join is lawful.
 *
 * What is NOT lawful is letting the join move the verdict. The question an axis must answer is
 * whether the useful answer changes AS THE DISCOVERED VALUE CHANGES. So each discovered value is
 * carried through the mapping to the answer that covers it, and the answers are counted THERE. A set
 * of discovered values that all inherit one identical answer is a CONSTANT at the discovered level,
 * however many distinct answers exist at the parent level.
 *
 * @param {object} a
 * @param {Iterable<string>} a.discovered  the values the axis was discovered on
 * @param {Record<string,string>} a.parents  discovered value → the value the answer is recorded at
 * @param {Map<string,Set<string>>} a.answersAtParent  parent value → its distinct verified answers
 */
export function projectToDiscoveredLevel({ discovered, parents, answersAtParent }) {
  const answerOf = new Map();
  const unmapped = [];
  const unanswered = [];
  for (const d of discovered) {
    const parent = parents?.[d];
    if (parent === undefined || parent === null) { unmapped.push(d); continue; }
    const answers = answersAtParent.get(String(parent));
    if (!answers || answers.size === 0) { unanswered.push(d); continue; }
    /* a parent answering itself two ways is caught upstream as CONFLICTING_ANSWERS_AT_A_VALUE */
    answerOf.set(d, [...answers][0]);
  }
  return {
    answerOf,
    unmapped: unmapped.sort(),
    unanswered: unanswered.sort(),
    distinctAnswers: new Set([...answerOf.values()]),
  };
}

/** `<stem>.<axis>=<value>` — structural, never a list of known axis names. */
export const CLAIM_QUALIFIER = /\.([a-z][a-z0-9-]*)=([^.]+)$/;

/**
 * Read one claim identity as an answer at a value.
 * @returns {{ axis: string, axisValue: string, stem: string, identity: string }|null}
 */
export function parseQualifiedClaim(identity) {
  if (typeof identity !== "string") return null;
  const m = CLAIM_QUALIFIER.exec(identity);
  if (!m) return null;
  return { axis: m[1], axisValue: m[2], stem: identity.slice(0, m.index), identity };
}

/** Stable serialisation, so "the same answer" does not depend on key order. */
function canonical(answer) {
  if (answer === null || answer === undefined) return null;
  if (typeof answer !== "object") return JSON.stringify(answer);
  if (Array.isArray(answer)) return JSON.stringify(answer.map((x) => (typeof x === "object" && x !== null ? JSON.parse(canonical(x)) : x)));
  return JSON.stringify(Object.fromEntries(Object.keys(answer).sort().map((k) => [k, typeof answer[k] === "object" && answer[k] !== null ? JSON.parse(canonical(answer[k])) : answer[k]])));
}

const leg = (state, reason, basis, extra = {}) => Object.freeze({ state, reason, basis, ...extra });

/**
 * 🔴 THE TENANCY GATE. Both scopes must be RESOLVED and identical. Anything else refuses, and it
 * refuses for EVERY axis at once — because the refusal is about the stores, not about any axis.
 *
 * @param {{state: string, tenantId?: string|null}} axisScope      the axis population's declared scope
 * @param {{state: string, tenantId?: string|null}} evidenceScope  the answer evidence's declared scope
 * @returns {{ ok: true }|{ ok: false, leg: object }}
 */
export function tenancyGate(axisScope, evidenceScope) {
  const a = axisScope ?? { state: "UNDECLARED" };
  const e = evidenceScope ?? { state: "UNDECLARED" };
  if (a.state !== "RESOLVED" || e.state !== "RESOLVED") {
    return {
      ok: false,
      leg: leg("UNDECLARED_TENANT", ANSWER_REASONS.TENANT_UNDECLARED,
        `the axis population resolves ${a.state} and the answer evidence resolves ${e.state}. A join needs BOTH declared: ` +
        "a tenant is attached by declaration, never inferred from a name, a host or a path, so an undeclared store is not " +
        "'probably the same one'. Nothing is read until it is declared",
        { axisTenantId: a.tenantId ?? null, evidenceTenantId: e.tenantId ?? null }),
    };
  }
  if (a.tenantId !== e.tenantId) {
    return {
      ok: false,
      leg: leg("INVALID_CROSS_TENANT", ANSWER_REASONS.TENANT_CROSS,
        "the answer evidence belongs to a different declared tenant than the axis population. Cross-tenant evidence is " +
        "INVALID — never UNKNOWN and never a pass — and it is refused before any answer is read",
        { axisTenantId: a.tenantId, evidenceTenantId: e.tenantId }),
    };
  }
  return { ok: true };
}

/**
 * Measure the answer leg for every axis the evidence carries.
 *
 * @param {object}  args
 * @param {Array<{identity: string, answer: unknown, verified: boolean}>} args.claims
 * @param {{state: string, tenantId?: string|null}} args.axisScope
 * @param {{state: string, tenantId?: string|null}} args.evidenceScope
 * @returns {{ gate: object|null, byAxis: Record<string, object>, population: object }}
 */
export function answerEvidence({ claims = [], axisScope, evidenceScope, axisValues = null, valueParents = null }) {
  /* 🔴 TENANCY FIRST — before a single answer is read. */
  const gate = tenancyGate(axisScope, evidenceScope);
  const qualified = claims.map((c) => ({ c, q: parseQualifiedClaim(c?.identity) })).filter((x) => x.q);
  const population = {
    claims: claims.length,
    qualified: qualified.length,
    verifiedQualified: qualified.filter((x) => x.c.verified).length,
  };
  if (!gate.ok) return { gate: gate.leg, byAxis: {}, population };

  /* group by axis, then by the question (the full stem, authority included) */
  const axes = new Map();
  for (const { c, q } of qualified) {
    if (!axes.has(q.axis)) axes.set(q.axis, new Map());
    const byStem = axes.get(q.axis);
    if (!byStem.has(q.stem)) byStem.set(q.stem, []);
    byStem.get(q.stem).push({ ...q, answer: c.answer, verified: Boolean(c.verified) });
  }

  const byAxis = {};
  for (const [axis, byStem] of axes) {
    /* 🔴 THE VALUES MUST BE THE SAME POPULATION, NOT THE SAME WORD. An axis discovered on one set of
     * values cannot be decided by answers about a different set that happens to share its name. */
    if (axisValues && Object.prototype.hasOwnProperty.call(axisValues, axis)) {
      const discovered = new Set((axisValues[axis] ?? []).map((v) => String(v)));
      const answered = new Set([...byStem.values()].flat().map((r) => String(r.axisValue)));
      const shared = [...answered].filter((v) => discovered.has(v));
      if (discovered.size > 0 && shared.length === 0) {
        const parents = valueParents && Object.prototype.hasOwnProperty.call(valueParents, axis) ? valueParents[axis] : null;
        if (!parents) {
          byAxis[axis] = leg("INSUFFICIENT_EVIDENCE", ANSWER_REASONS.DISJOINT_VALUE_POPULATION,
            `the answer evidence covers ${answered.size} value(s) and the axis was discovered on ${discovered.size}, and they share NONE — one axis name, two value vocabularies. Deciding the axis on answers about values it was never discovered on would measure a different population`,
            { evidence: [], discoveredValues: discovered.size, answeredValues: answered.size, sharedValues: 0 });
          continue;
        }

        /* 🔴 §5 — A MAPPING JOINS THE LEVELS. IT DOES NOT MOVE THE VERDICT TO THE PARENT LEVEL.
         * Each question is read at the level its answers were recorded at, then every DISCOVERED
         * value is carried through the mapping to the answer covering it, and the answers are
         * counted there — because that is the level the axis exists at. */
        const mapped = [...byStem.entries()].map(([stem, rs]) => {
          const answersAtParent = new Map();
          for (const r of rs.filter((x) => x.verified)) {
            const k = String(r.axisValue);
            if (!answersAtParent.has(k)) answersAtParent.set(k, new Set());
            answersAtParent.get(k).add(canonical(r.answer));
          }
          return { stem, rs, ...projectToDiscoveredLevel({ discovered, parents, answersAtParent }) };
        });

        /* A mapping that leaves a discovered value uncovered cannot decide the axis: the values it
         * dropped are exactly the ones that might have answered differently. */
        const incomplete = mapped.filter((m) => m.unmapped.length > 0 || m.unanswered.length > 0);
        if (incomplete.length === mapped.length) {
          const worst = incomplete[0];
          byAxis[axis] = leg("INSUFFICIENT_EVIDENCE", ANSWER_REASONS.INCOMPLETE_LEVEL_MAPPING,
            `the level mapping does not carry every discovered value to an answer — ${worst.unmapped.length} value(s) have no parent and ${worst.unanswered.length} reach a parent nothing answers. The values a mapping drops are the ones that might have answered differently, so it cannot decide`,
            { evidence: [], unmapped: worst.unmapped, unanswered: worst.unanswered, discoveredValues: discovered.size });
          continue;
        }

        const decidableMapped = mapped.filter((m) => m.answerOf.size >= 2);
        if (decidableMapped.length === 0) {
          byAxis[axis] = leg("INSUFFICIENT_EVIDENCE", ANSWER_REASONS.ONE_VALUE_ONLY,
            `no question reaches two or more DISCOVERED values through the mapping, so nothing can be compared at the level the axis was discovered on`,
            { evidence: [] });
          continue;
        }

        const changingMapped = decidableMapped.filter((m) => m.distinctAnswers.size > 1);
        if (changingMapped.length === 0) {
          const m = decidableMapped[0];
          byAxis[axis] = leg("INSUFFICIENT_EVIDENCE", ANSWER_REASONS.CONSTANT_AT_DISCOVERED_LEVEL,
            `the answers differ at the level they were RECORDED at, but all ${m.answerOf.size} discovered value(s) inherit the SAME one — the answer never changes for anybody who searched. A difference at a level the axis was not discovered on is not a distinction at the level it was`,
            { materiallyChanges: false, discoveredValues: discovered.size, distinctAnswersAtDiscoveredLevel: 1,
              evidence: decidableMapped.flatMap((x) => x.rs.filter((r) => r.verified).map((r) => r.identity)).sort() });
          continue;
        }

        byAxis[axis] = leg("MEASURED", ANSWER_REASONS.ANSWER_CHANGES,
          `${changingMapped.length} of ${decidableMapped.length} question(s) give a DIFFERENT verified answer across the DISCOVERED values, carried through the level mapping`,
          { materiallyChanges: true, questionsCompared: decidableMapped.length,
            distinctAnswersAtDiscoveredLevel: changingMapped[0].distinctAnswers.size,
            evidence: changingMapped.flatMap((x) => x.rs.filter((r) => r.verified).map((r) => r.identity)).sort() });
        continue;
      }
    }
    const groups = [];
    for (const [stem, rs] of byStem) {
      const verified = rs.filter((r) => r.verified);
      const answersAtValue = new Map();
      for (const r of verified) {
        if (!answersAtValue.has(r.axisValue)) answersAtValue.set(r.axisValue, new Set());
        answersAtValue.get(r.axisValue).add(canonical(r.answer));
      }
      groups.push({ stem, all: rs, verified, answersAtValue });
    }

    /* 🔴 A VALUE THAT ANSWERS ITSELF TWO DIFFERENT WAYS IS AMBIGUOUS — and it outranks a
     * measurement, because a conflicted population cannot be read as either outcome. */
    const conflicted = groups.filter((g) => [...g.answersAtValue.values()].some((s) => s.size > 1));
    if (conflicted.length) {
      byAxis[axis] = leg("AMBIGUOUS", ANSWER_REASONS.CONFLICTING_ANSWERS_AT_A_VALUE,
        `${conflicted.length} question(s) carry two different VERIFIED answers at one value, so the evidence contradicts itself and cannot decide`,
        { evidence: conflicted.flatMap((g) => g.verified.map((r) => r.identity)).sort() });
      continue;
    }

    /* decidable = one question whose answer is VERIFIED at two or more distinct values */
    const decidable = groups.filter((g) => g.answersAtValue.size >= 2);
    if (decidable.length === 0) {
      const anyVerified = groups.some((g) => g.verified.length > 0);
      const reason = anyVerified ? ANSWER_REASONS.ONE_VALUE_ONLY : ANSWER_REASONS.NO_VERIFIED_ANSWER;
      byAxis[axis] = leg("INSUFFICIENT_EVIDENCE", reason,
        anyVerified
          ? `no question is answered at two or more values by VERIFIED evidence (${groups.length} question(s), the best carries ${Math.max(0, ...groups.map((g) => g.answersAtValue.size))} verified value(s)). ` +
            "LAW-ABSENT-1: one value's answer says nothing about whether the answer changes"
          : `${groups.length} question(s) carry this axis, and none has a VERIFIED answer at any value. An unverified record is not an answer`,
        { evidence: [] });
      continue;
    }

    /* MEASURED. The answer changes if ANY decidable question answers differently across its values. */
    const changing = decidable.filter((g) => new Set([...g.answersAtValue.values()].map((s) => [...s][0])).size > 1);
    const materiallyChanges = changing.length > 0;
    byAxis[axis] = leg("MEASURED", materiallyChanges ? ANSWER_REASONS.ANSWER_CHANGES : ANSWER_REASONS.ANSWER_CONSTANT,
      materiallyChanges
        ? `${changing.length} of ${decidable.length} question(s) answered at two or more values give a DIFFERENT verified answer as the value changes`
        : `${decidable.length} question(s) answered at two or more values give the SAME verified answer at every value`,
      { materiallyChanges, questionsCompared: decidable.length, evidence: decidable.flatMap((g) => g.verified.map((r) => r.identity)).sort() });
  }

  return { gate: null, byAxis, population };
}
