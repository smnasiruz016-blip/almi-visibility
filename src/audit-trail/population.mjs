/**
 * 🔴 F08 · THE INCLUSION RULE, THE CENSUS, AND THE MIGRATION CANDIDATES (§6 and §10, 22 September 2026).
 *
 * 🔴 THE RULE IS DECLARED HERE, ABOVE THE CODE THAT SELECTS. Nothing below chooses a population; it applies this.
 *
 * A REAL GOVERNED EVENT is an engine action that satisfies ALL FOUR of:
 *   R1  IT IS A DECISION OF RECORD — it admits, transitions, authorises, grants or refuses. Looking is not deciding.
 *   R2  IT IS PRODUCTION-REACHABLE — from a tracked production entry point (bin/*.mjs), or from committed
 *       configuration that a production entry point reads.
 *   R3  EVERY REQUIRED FIELD IS DERIVABLE — from COMMITTED evidence (a migrated event) or supplied by the production
 *       caller at the moment (a native event). A field that must be guessed makes the source NOT_MIGRATABLE.
 *   R4  IT CARRIES A DECLARED SCOPE — GLOBAL_PRODUCT, or TENANT/SUBJECT with a declared opaque tenant identifier.
 *
 * NOT COUNTED AS REAL EVENTS, EVER — counted and named instead:
 *   X1  synthetic test fixtures (registry role SYNTHETIC_TEST_FIXTURE, and everything under test/);
 *   X2  development fixtures;
 *   X3  historical prose that merely DESCRIBES an event — the historical 61-row ledger's status records are
 *       PROVENANCE and transfer no state to any F-row;
 *   X4  duplicated generated documents;
 *   X5  subject facts and product content;
 *   X6  anything under a declared sealed prefix (Row 52) or any held-out set;
 *   X7  🔴 READ-ONLY DIAGNOSTIC ACTIONS — a production entry point that writes nothing and settles no permission.
 *       They are COUNTED and NAMED below and their behaviour is not changed. Whether they should later be audited is
 *       an owner question, not an F08 one.
 *
 * ONE DE-DUPLICATION RULE, so no action is counted twice: a write-gate decision is recorded ONCE, under family D,
 * whatever its outcome. Family E holds the refusals that are NOT write-gate decisions — a sealed-path denial, an
 * authority that does not resolve CURRENT, an evidence role that fails closed.
 *
 * Generic: no subject, product, client, host or regulator is named anywhere in this file.
 */
import { createHash } from "node:crypto";
import { resolve as resolveAuthority, permits } from "../authority/register.mjs";

export const FAMILIES = Object.freeze({
  A: "current-authority resolution and migration actions",
  B: "F-board state transitions",
  C: "evidence-role registration and refusal decisions",
  D: "authorised file/write-gate decisions",
  E: "explicit engine refusals that protect tenant, evidence or authority",
  // 🔴 NOT ONE OF THE OWNER'S FIVE — an ADDITION, declared as one (see familyTCandidates).
  T: "resource-scope attachment decisions (tenant isolation) — an ADDED population, not a substitution",
});
/** The five the command named, kept separate from the addition so no census can quietly conflate them. */
export const COMMANDED_FAMILIES = Object.freeze(["A", "B", "C", "D", "E"]);
export const ADDED_FAMILIES = Object.freeze(["T"]);

export const INCLUSION_RULE = Object.freeze({
  R1: "a decision of record — it admits, transitions, authorises, grants or refuses; looking is not deciding",
  R2: "production-reachable from a tracked bin/*.mjs entry point, or from committed configuration one reads",
  R3: "every required field derivable from committed evidence, or supplied by the production caller at the moment",
  R4: "a declared scope — GLOBAL_PRODUCT, or TENANT/SUBJECT with a declared opaque tenant identifier",
});
export const EXCLUSIONS = Object.freeze({
  X1: "synthetic test fixtures, and everything under test/",
  X2: "development fixtures",
  X3: "historical prose describing an event — the historical 61-row ledger is provenance, never an event",
  X4: "duplicated generated documents",
  X5: "subject facts and product content",
  X6: "anything under a declared sealed prefix, and any held-out set",
  X7: "read-only diagnostic entry points — counted and named, behaviour unchanged",
});

/** A committed DAY becomes the instant at its start, and the event says so in metadata. Never a guessed time of day. */
export const dayToInstant = (day) => `${day}T00:00:00Z`;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The registry entry a stored reference points at — path, sealed prefix or derivation. Null fails closed upstream. */
export function makeEvidenceLookup(registry) {
  return (ref) => {
    if (!ref || typeof ref !== "object") return null;
    return (registry || []).find((e) => {
      if (e.resource?.root !== ref.root) return false;
      if (e.resource?.path) return e.resource.path === ref.ref;
      if (e.resource?.pathPrefixes) return e.resource.pathPrefixes.includes(ref.ref);
      if (e.resource?.derivation) return e.resource.derivation.observationId === ref.ref;
      return false;
    }) ?? null;
  };
}
export const makeSealedLookup = (registry) => {
  const lookup = makeEvidenceLookup(registry);
  return (ref) => lookup(ref)?.sealed === true;
};

/** A registry entry's stored reference — identity only. SEALED material carries no content hash, because it is not read. */
export function refForEntry(entry) {
  const r = entry.resource;
  const ref = r.path ?? (r.pathPrefixes ? r.pathPrefixes[0] : r.derivation?.observationId);
  return Object.freeze({ root: r.root, ref, role: entry.role, contentHash: entry.sealed === true ? null : entry.contentHash, tenantId: null });
}

/**
 * 🔴 THE AUTHORITY AS IT STOOD AT THE EVENT — resolved through F05's production resolver at the EVENT'S OWN DAY, never
 * at read time. An ask that does not return CURRENT is a real refusal and makes the source NOT_MIGRATABLE.
 */
export function authorityAt({ records, propositionId, scope, day }) {
  const res = resolveAuthority({ records, propositionId, scope, now: day });
  if (!permits(res)) return { ok: false, outcome: res.outcome, why: `authority ${propositionId} [${(scope ?? []).join("/")}] resolves ${res.outcome} at ${day}, not CURRENT` };
  return { ok: true, outcome: "CURRENT", hash: res.authority.contentHash, authorityIds: res.authority.authorityIds };
}

const dispositionOutcome = Object.freeze({
  CURRENT: { outcome: "ALLOWED", reasonCode: "CURRENT_APPLICABLE_AUTHORITY" },
  SUPERSEDED: { outcome: "REFUSED", reasonCode: "SUPERSEDED_DO_NOT_APPLY" },
  NOT_APPLICABLE: { outcome: "REFUSED", reasonCode: "SCOPE_DOES_NOT_COVER_OR_NOT_YET_EFFECTIVE" },
  OPEN_CONFLICT: { outcome: "REFUSED", reasonCode: "OPEN_CONFLICT_NEVER_PERMITS" },
  INVALID: { outcome: "INVALID", reasonCode: "MALFORMED_RECORD" },
});

/**
 * FAMILY A — one admission decision per committed authority record, plus the recorded corpus migration action.
 * The record's own first-commit time is its occurredAt: a committed fact, never a guess.
 */
export function familyACandidates({ corpus, dispositions, provenance, softwareVersion, correlationId, migratedAt }) {
  const out = [];
  corpus.forEach((r, i) => {
    const d = dispositions[i];
    const day = typeof r.recordedAt === "string" ? r.recordedAt.slice(0, 10) : null;
    const occurredAt = typeof r.recordedAt === "string" && r.recordedAt.length > 10 ? new Date(r.recordedAt).toISOString().replace(/\.\d{3}Z$/, "Z") : day ? dayToInstant(day) : null;
    const map = dispositionOutcome[d.disposition] ?? { outcome: "INVALID", reasonCode: "UNACCOUNTED" };
    if (!occurredAt) { out.push({ family: "A", sourceId: r.authorityId, notMigratable: "NO_COMMITTED_TIME: the record carries no recordedAt" }); return; }
    out.push({
      family: "A",
      sourceId: r.authorityId,
      migrationSource: `authority-corpus:${r.sourceRef?.blob ?? "unknown"}`,
      draft: {
        eventType: "AUTHORITY_RESOLUTION",
        action: "ADMIT_AUTHORITY_RECORD",
        outcome: map.outcome,
        reasonCode: map.reasonCode,
        occurredAt,
        actor: "bin/authority-migrate.mjs",
        actorType: "ENGINE",
        scopeType: "GLOBAL_PRODUCT",
        tenantId: null,
        subjectId: null,
        authorityRef: { propositionId: r.propositionId, scope: [...r.scope] },
        authorityHashOverride: r.contentHash,
        softwareVersion,
        evidenceRefs: [],
        correlationId,
        parentEventId: null,
        migration: true,
        migrationSource: `authority-corpus:${r.sourceRef?.blob ?? "unknown"}`,
        migratedAt,
        metadata: { family: "A", disposition: d.disposition, authorityBlob: r.sourceRef?.blob ?? "", issuerClass: r.issuer?.class ?? "UNDECLARED", inclusionRule: r.inclusionRule ?? "" },
      },
    });
  });
  // The recorded corpus MIGRATION action itself.
  out.push({
    family: "A",
    sourceId: `authority-corpus-migration:${provenance.governanceCommit.slice(0, 12)}`,
    migrationSource: `corpus-provenance:${provenance.governanceCommit}`,
    draft: {
      eventType: "AUTHORITY_MIGRATION",
      action: "MIGRATE_AUTHORITY_CORPUS",
      outcome: "APPLIED",
      reasonCode: "CORPUS_REGENERATED_FROM_COMMITTED_BYTES",
      occurredAt: dayToInstant(provenance.now),
      actor: "bin/authority-migrate.mjs",
      actorType: "ENGINE",
      scopeType: "GLOBAL_PRODUCT",
      tenantId: null,
      subjectId: null,
      authorityRef: { propositionId: "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN", scope: ["ALMIVISIBILITY", "F05"] },
      softwareVersion,
      evidenceRefs: [],
      correlationId,
      parentEventId: null,
      migration: true,
      migrationSource: `corpus-provenance:${provenance.governanceCommit}`,
      migratedAt,
      metadata: { family: "A", occurredAtPrecision: "DAY", records: String(corpus.length), governanceCommit: provenance.governanceCommit, engineCommit: provenance.engineCommit },
    },
  });
  return out;
}

/**
 * FAMILY B — one event per DECLARED F-board event. The engine recorded the transition; no person is named as actor.
 *
 * 🔴 D-RECORDER-1, REPAIRED AT ITS CAUSE (F08 reopened on CONCRETE_CONTRADICTORY_EVIDENCE, _handoffs 99f0732). Every declared
 * movement is bound to what was true FOR THAT MOVEMENT, never to the row as it stands today:
 *   · its AUTHORITY is the acceptance that GOVERNED it — the last ACCEPTANCE_FROZEN or ACCEPTANCE_AMENDED ruling before it in the
 *     row's declared history, resolved to its acceptance version (`versions`, every pinned version: originals and amendments);
 *     the row's CURRENT acceptance is never used for a historical event (it re-attributed history — B1, B2);
 *   · its `stateAfter` is the state immediately AFTER it, walked from the declared transitions — never the row's current state
 *     (it made the same identity carry different content — B3a);
 *   · its IDENTITY is fixed by a key over the declared event it records (`identitySubject`), so two same-kind, same-day
 *     movements of one row are two events, not a collision (B3b);
 *   · a movement ALREADY on the trail — written under the old rule, whose bytes are never touched — is recognised from its
 *     stored fields (row, action, day, governing authority, from, to) and returned as already audited: it is never re-emitted.
 * `versions` and `recorded` are REQUIRED: a default here would silently restore the defect.
 */
export function familyBCandidates({ declared, versions, recorded, softwareVersion, correlationId, migratedAt, blockerAuthority }) {
  if (!Array.isArray(versions) || !Array.isArray(recorded)) throw new TypeError("familyBCandidates needs every acceptance version and the events already recorded — a default would re-attribute history");
  const out = [];
  const versionOf = (ruling) => versions.find((v) => v?.ruling?.sha256 && v.ruling.sha256 === ruling?.sha256) ?? null;
  const refOf = (v) => ({ propositionId: v.authority.propositionId, scope: [...v.authority.scope] });
  const onTrail = recorded.filter((e) => e?.eventType === "BOARD_TRANSITION" && e.metadata?.family === "B");
  const consumed = new Set();
  for (const row of Object.values(declared)) {
    let governing = null;
    let state = "UNASSESSED";
    for (const ev of row.events ?? []) {
      const day = ev.on;
      if (!DAY.test(day ?? "")) { out.push({ family: "B", sourceId: `${row.featureId}:${ev.kind}`, notMigratable: "NO_COMMITTED_DAY: the declared event carries no lawful date" }); continue; }
      if (ev.kind === "ACCEPTANCE_FROZEN" || ev.kind === "ACCEPTANCE_AMENDED") {
        governing = versionOf(ev.ruling);
        if (!governing?.authority) { out.push({ family: "B", sourceId: `${row.featureId}:${ev.kind}:${day}`, notMigratable: "GOVERNING_ACCEPTANCE_UNRESOLVED: the declared ruling matches no pinned acceptance version" }); continue; }
      }
      if (typeof ev.to === "string" && ev.to) state = ev.to;
      const authorityRef = governing ? refOf(governing) : blockerAuthority?.[row.featureId] ?? null;
      if (!authorityRef) { out.push({ family: "B", sourceId: `${row.featureId}:${ev.kind}`, notMigratable: "NO_GOVERNING_AUTHORITY: no acceptance governs this event and the row records no blocker source" }); continue; }
      const occurredAt = dayToInstant(day);
      /* The declared event's position among the row's events of the same kind and day makes two genuinely distinct movements with
       * otherwise identical fields (a row reopened twice in one day under one acceptance) two keys, never one. */
      const ordinal = (row.events ?? []).slice(0, (row.events ?? []).indexOf(ev)).filter((x) => x.kind === ev.kind && x.on === day).length;
      const identitySubject = createHash("sha256").update(JSON.stringify([row.featureId, ev.kind, day, ordinal, ev.from ?? "", ev.to ?? "", ev.reason ?? "", governing?.contractSha256 ?? authorityRef.propositionId]), "utf8").digest("hex").slice(0, 32);
      /* Already on the trail? A NEW-rule event by its write-time key; a LEGACY event (written before the key existed) by its stored
       * fields, each legacy event consumed ONCE — so a duplicate declared movement can never hide behind one stored event. */
      const prior = onTrail.find((e) => e.metadata.identitySubject === identitySubject)
        ?? onTrail.find((e) => !e.metadata.identitySubject && !consumed.has(e.eventId) && e.metadata.featureId === row.featureId && e.action === ev.kind && e.occurredAt === occurredAt
          && e.authorityRef?.propositionId === authorityRef.propositionId && (e.metadata.from ?? "") === (ev.from ?? "") && (e.metadata.to ?? "") === (ev.to ?? ""));
      if (prior) { consumed.add(prior.eventId); out.push({ family: "B", sourceId: `${row.featureId}:${ev.kind}:${day}`, alreadyAudited: prior.eventId }); continue; }
      out.push({
        family: "B",
        sourceId: `${row.featureId}:${ev.kind}:${day}`,
        migrationSource: `fboard-declaration:${row.featureId}:${ev.kind}`,
        authorityDay: day,
        draft: {
          eventType: "BOARD_TRANSITION",
          action: ev.kind,
          outcome: "RECORDED",
          reasonCode: `BOARD_EVENT_${ev.kind}`,
          occurredAt: dayToInstant(day),
          actor: "config/fboard/f-board.mjs",
          actorType: "ENGINE",
          scopeType: "GLOBAL_PRODUCT",
          tenantId: null,
          subjectId: null,
          authorityRef,
          softwareVersion,
          evidenceRefs: [],
          correlationId,
          parentEventId: null,
          migration: true,
          migrationSource: `fboard-declaration:${row.featureId}:${ev.kind}`,
          migratedAt,
          /* 🔴 A TRANSITION EVENT NAMES WHAT MOVED THE ROW, BY IDENTITY AND HASH — NEVER BY PAYLOAD.
           * Where the declared board event carries them, the movement's own references travel with the audit
           * event: the states it moved between, the pull request, the exact merged SHA, the CI run and its
           * conclusion, and the sha256 of the governing records. A reader can then reconstruct the movement
           * without opening anything. Absent fields are recorded as "", never invented. */
          metadata: {
            family: "B", featureId: row.featureId, board: row.board, stateAfter: state, identitySubject,
            occurredAtPrecision: "DAY", population: ev.population ?? "",
            from: ev.from ?? "", to: ev.to ?? "", route: (ev.route ?? "").slice(0, 190), changeKind: ev.changeKind ?? "",
            pullRequest: ev.pullRequest === undefined ? "" : String(ev.pullRequest),
            mergedSha: ev.mergedSha ?? "", ciRun: ev.ciRun ?? "", ciConclusion: ev.ciConclusion ?? "",
            boardAuthoritySha256: ev.boardAuthorityRuling?.sha256 ?? "",
            evidenceRecordSha256: ev.evidenceRecord?.sha256 ?? "",
          },
        },
      });
    }
  }
  return out;
}

/**
 * FAMILY C — one registration decision per registry entry, carrying the entry itself as its evidence reference.
 *
 * 🔴 THE EVENT'S TIME IS WHEN THE ROLE WAS REGISTERED, NOT WHEN THE ARTEFACT WAS CAPTURED. The first draft used
 * `capturedAt` and made seven of eight entries NOT_MIGRATABLE, because the rulings that govern the registry did not
 * yet exist on the day the evidence was captured. That refusal was CORRECT about the authority and WRONG about the
 * event: registering a role is a decision made when the registry declared it. `registeredAtOf(id)` supplies that day
 * from COMMITTED git history — the first commit in which the entry's id appears — and `capturedAt` is kept in
 * metadata, where it belongs.
 */
export function familyCCandidates({ registry, softwareVersion, correlationId, migratedAt, roleAuthority, registeredAtOf }) {
  return registry.map((entry) => {
    const day = registeredAtOf(entry.id);
    if (!DAY.test(day ?? "")) return { family: "C", sourceId: entry.id, notMigratable: "NO_COMMITTED_REGISTRATION_DAY: git history holds no commit introducing this entry" };
    const authorityRef = roleAuthority(entry);
    if (!authorityRef) return { family: "C", sourceId: entry.id, notMigratable: "NO_GOVERNING_AUTHORITY" };
    return {
      family: "C",
      sourceId: entry.id,
      migrationSource: `evidence-role-registry:${entry.id}`,
      authorityDay: day,
      draft: {
        eventType: "EVIDENCE_ROLE_DECISION",
        action: "REGISTER_EVIDENCE_ROLE",
        outcome: "RECORDED",
        reasonCode: `ROLE_${entry.role}`,
        occurredAt: dayToInstant(day),
        actor: "config/evidence-roles.mjs",
        actorType: "ENGINE",
        scopeType: "GLOBAL_PRODUCT",
        tenantId: null,
        subjectId: null,
        authorityRef,
        softwareVersion,
        evidenceRefs: [refForEntry(entry)],
        correlationId,
        parentEventId: null,
        migration: true,
        migrationSource: `evidence-role-registry:${entry.id}`,
        migratedAt,
        metadata: {
          family: "C", role: entry.role, occurredAtPrecision: "DAY", capturedAt: entry.capturedAt ?? "",
          mayTrain: String(entry.mayTrain), mayEvaluate: String(entry.mayEvaluate),
          maySupplyExpectedAnswer: String(entry.maySupplyExpectedAnswer), sealed: String(entry.sealed),
          mandatoryReadable: String(entry.mandatoryReadable),
        },
      },
    };
  });
}

/**
 * FAMILY T — RESOURCE-SCOPE ATTACHMENT DECISIONS. 🔴 AN ADDITION, DECLARED AS ONE.
 *
 * The owner's command named five families (A–E) and every one of them turns out to be GLOBAL_PRODUCT scoped: the
 * authority register, the F-board, the evidence-role registry, the write law and the sealed-path guard are all
 * product-wide. The frozen acceptance, however, requires an event to say "for which tenant or global scope", and a
 * limb proved only at global scope proves nothing about the tenant half. So this SIXTH population is recorded as
 * well — it is not a substitution for any of the five, and the five are censused unchanged.
 *
 * It is real: the production scope resolver (src/tenancy/resolver.mjs) is asked, at run time, about each resource the
 * EXTERNAL declaration source attaches, and its answer is recorded as it came. The declarations are somebody else's;
 * nothing here computes a scope.
 *
 * 🔴 AND IT STORES NO REFERENCE. A declared resource reference is a hostname or a registry name — a client's, and a
 * product's. The event carries the resourceKIND (generic vocabulary), the OPAQUE declared tenant id, and a sha256 of
 * the reference. Never the reference itself. That is why the audit trail can be read by anyone who may read the
 * engine, and why the product-neutrality census over the store returns zero for a reason rather than by luck.
 *
 * SUBJECT scope is not decoration either: where a declared tenant holds MORE THAN ONE attached resource, the
 * resource is a distinguishable subject inside that boundary, and the event says so with both ids.
 */
export function familyTCandidates({ attachments, resolveScope, refHash, softwareVersion, correlationId, occurredAt, authorityRef }) {
  const perTenant = new Map();
  for (const a of attachments) perTenant.set(a.tenantId, (perTenant.get(a.tenantId) ?? 0) + 1);
  return attachments.map((a) => {
    const answer = resolveScope({ resourceKind: a.resourceKind, resourceRef: a.resourceRef });
    const subjectId = (perTenant.get(a.tenantId) ?? 0) > 1 ? refHash(a.resourceRef) : null;
    if (answer.state !== "RESOLVED") {
      return {
        family: "T",
        sourceId: `scope:${a.resourceKind}:${refHash(a.resourceRef).slice(0, 12)}`,
        notMigratable: `SCOPE_NOT_RESOLVED: the production resolver answered ${answer.state} (${answer.reason})`,
      };
    }
    return {
      family: "T",
      sourceId: `scope:${a.resourceKind}:${refHash(a.resourceRef).slice(0, 12)}`,
      draft: {
        eventType: "SCOPE_RESOLUTION",
        action: "RESOLVE_RESOURCE_SCOPE",
        outcome: "ALLOWED",
        reasonCode: answer.reason,
        occurredAt,
        actor: "src/tenancy/resolver.mjs",
        actorType: "ENGINE",
        scopeType: subjectId ? "SUBJECT" : "TENANT",
        tenantId: answer.tenantId,
        subjectId,
        authorityRef,
        softwareVersion,
        evidenceRefs: [],
        correlationId,
        parentEventId: null,
        migration: false,
        migrationSource: null,
        migratedAt: null,
        metadata: {
          family: "T",
          resourceKind: a.resourceKind,
          // 🔴 THE REFERENCE IS HASHED, NEVER STORED. It is a client host or a product registry name.
          resourceRefSha256: refHash(a.resourceRef),
          declaredOn: a.declaredOn ?? "",
          resourcesInThisScope: String(perTenant.get(a.tenantId) ?? 0),
          identitySubject: refHash(a.resourceRef),
        },
      },
    };
  });
}

/** The census shape every family reports. Denominators and remainders must reconcile to zero. */
export function accountFamily({ family, candidates, audited = 0 }) {
  const migratable = candidates.filter((c) => c.draft);
  const notMigratable = candidates.filter((c) => c.notMigratable);
  const scoped = migratable.reduce((m, c) => { m[c.draft.scopeType] = (m[c.draft.scopeType] ?? 0) + 1; return m; }, {});
  const ids = migratable.map((c) => c.sourceId);
  const duplicate = ids.length - new Set(ids).size;
  const total = candidates.length;
  const remainder = total - (migratable.length + notMigratable.length);
  return {
    family,
    description: FAMILIES[family],
    total,
    audited,
    unaudited: total - audited,
    malformed: notMigratable.length,
    duplicate,
    tenantScoped: (scoped.TENANT ?? 0) + (scoped.SUBJECT ?? 0),
    globalProductScoped: scoped.GLOBAL_PRODUCT ?? 0,
    unresolvedScope: migratable.filter((c) => !["GLOBAL_PRODUCT", "TENANT", "SUBJECT"].includes(c.draft.scopeType)).length,
    remainder,
  };
}
