/**
 * 🔴 FROZEN ACCEPTANCES OF THE ACTIVE F-BOARD — COPIED FROM COMMITTED RULINGS, NEVER AUTHORED HERE.
 *
 * Each entry is parsed (src/fboard/acceptance.mjs) from the ruling's committed bytes in the governance repository, and
 * pinned to BOTH the ruling's sha256 and the contract's own sha256 under the declared normalisation. The engine never
 * writes an acceptance: a change to any clause here without a new committed ruling turns the pins red.
 */
/** 🔴 The ORIGINAL frozen F02 acceptance (3ea6fda) — byte-immutable, amended (not replaced) by Amendment 1 above. */
export const F02_ORIGINAL = Object.freeze({
    featureId: "F02",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F02_ACCEPTANCE_2026-09-24.md", commit: "3ea6fdac909bc76b4ba8137ef0c07147f7525143", sha256: "e468526e1257fd6ac16505a5018398fb8701165da0f711edc44b1395673e79e5" }),
    // Resolved through the register (inclusion rule f-row-acceptance, the name the F02 command gave the file); the board
    // accepts this acceptance only while that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "F02_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F02"]) }),
    frozenOn: "2026-09-24",
    feature: "F02 · Tenant and evidence isolation",
    input: "A declared tenant and two or more tenant-scoped resources or records,\nincluding at least one real attempted relationship between resources.",
    expected: "Every governed resource, evidence item, cost item, learning item and output\nresolves to one declared tenant scope before use; same-tenant relationships\nmay proceed, while cross-tenant, undeclared, ambiguous and mismatched\nrelationships fail closed with a reason that identifies the failed scope\nrelationship without exposing another tenant's protected content.",
    failure: "A governed item is accepted without one unambiguous tenant scope; a\ncross-tenant relationship proceeds; tenant identity is inferred from a name,\nhost, path, client-specific vocabulary or content rather than a declaration;\none tenant's evidence, costs, learning or outputs can affect another tenant's\ndecision; or the guard is proved only by fixtures or an empty population.",
    evidence: "The production resolver and every production join or decision path exercised\nover a real non-empty population, with same-tenant success, cross-tenant\nrefusal, undeclared refusal, ambiguous refusal, mismatched-scope refusal,\nnon-leakage checks and independently firing clean controls.",
    contractSha256: "9b6273d6fdb92f7fa8f2d542a40cdb1a210cce6ad34b430bc3d7c7e0d2b03471",
  });

/** 🔴 The ORIGINAL frozen F04 acceptance (b439309) — byte-immutable, amended (not replaced) by Amendment 1 below. */
export const F04_ORIGINAL = Object.freeze({
    featureId: "F04",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F04_ACCEPTANCE_2026-09-25.md", commit: "b439309bfc7e704821bbbd2a59433b65713c0f5d", sha256: "8d50f03fc5c72399344e3e368e342d2ed849f0b9201333028ce5111086c347b7" }),
    authority: Object.freeze({ propositionId: "F04_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F04"]) }),
    frozenOn: "2026-09-25",
    feature: "F04 · Roles permissions and approvals",
    input: "A declared actor, a governed action, the resource and scope affected by that action, and any\napproval or separation-of-duty requirement applicable to it.",
    expected: "Before a governed action executes, one product-neutral decision establishes the actor's current\nidentity class, role, tenant and subject scope, permissions, required approvals and\nseparation-of-duty status; only a fully authorised action proceeds, while missing identity, missing\nrole, insufficient scope, missing approval, expired approval, conflicting duty and unsupported\naction fail closed before protected data is read, state changes, remote work begins, money is\ncommitted or content is published.",
    failure: "A governed action proceeds without a declared actor or current permission; a role silently widens\ntenant or subject scope; a model, tool, process or commit author is treated as a human verifier or\napprover; an actor supplies, approves or verifies their own restricted decision where separation is\nrequired; a stale or unrelated approval is reused; publishing, payment, export or\nconnected-property change occurs without its required authority; a caller-specific allowlist\nbypasses the shared decision; or the mechanism is proved only by fixtures or an empty population.",
    evidence: "The production authorisation boundary and every governed action family exercised over a real\nnon-empty population, including authorised and refused research, verification, approval,\npublishing, spending, exporting and connected-property-change decisions where those families\nexist, with scope isolation, separation-of-duty checks, expiry, non-leakage, audit events and clean\nopposite-verdict controls.",
    contractSha256: "2a2a98bfb8eb88071102de18a6e3ff727f682948830c58aeb03ba90eaacda12e",
  });

export const ACCEPTANCES = Object.freeze({
  F01: Object.freeze({
    featureId: "F01",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F01_FROZEN_ACCEPTANCE_2026-09-24.md", commit: "1429928b48135603e417a17a4f17c81da7dfda25", sha256: "eb445a1e4c856519bdcb0380b5d152633b40d1e52911344a981915afbb3749de" }),
    // Resolved through the register like any other record (inclusion rule frozen-f-row-acceptance); the board accepts
    // this acceptance only while that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "F01_FROZEN_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F01"]) }),
    frozenOn: "2026-09-24",
    feature: "F01 · Product declaration and intake",
    input: "A versioned project declaration submitted by an identified actor for\none declared tenant. It may name public properties, environments,\ngoals, permissions, constraints and connector intentions, but contains\nno secret credential and grants no authority merely by being submitted.",
    expected: "Visibility validates the declaration through a product-neutral,\nversioned contract; assigns or validates stable project identity;\nbinds it to exactly one declared tenant; normalises each public property\nwithout guessing ownership; records environments, goals, permissions\nand constraints separately; refuses ambiguous, unsafe, secret-bearing\nor cross-tenant input; stores accepted declarations through a declared\nportable root; preserves the submitter's wording as isolated data; and\nrecords validation, acceptance, refusal and supersession decisions\nthrough the audit trail.",
    failure: "Shared code contains client knowledge; a declaration silently creates\nownership or permission; an absent tenant defaults to a usual tenant;\none project crosses tenants; credentials or secret values are accepted;\nprivate/local/credentialed targets are treated as public properties;\nenvironment is guessed from hostname; goals are converted into facts;\npermissions default to allowed; constraints disappear; unknown schema\nfields or versions are silently ignored; a duplicate or replay creates\nanother project; an update overwrites history; or a refused declaration\nmutates the accepted store.",
    evidence: "The contract exercised through a real non-empty declaration population\nand a new unrelated neutral declaration; accepted, refused, duplicate,\nsuperseded and unavailable-storage worlds; complete field and population\narithmetic; tenant isolation, secret exclusion, portability, audit,\nidempotency and orphan proofs; independent sabotage for every failure\nclass; two agreeing full suites; named counting control; one green PR,\nmerge and exact-main CI.",
    contractSha256: "5d7ddb4c6d37a3d96cbc8ce65797eb20f3119816a20084c9176aa089b5d80ccb",
  }),
  /* 🔴 F02 · AMENDMENT 1 (25 Sep 2026) is the CURRENT contract. It changes ONLY the treatment of the non-existent learning
   * population (deferred to F79 · Evidence Cache Before Re-Research); no isolation rule is weakened and no existing population
   * leaves F02. The original acceptance stays frozen, exported as F02_ORIGINAL, and is named by `amends`: the board refuses an
   * amendment that does not name, by both hashes, the freeze it amends (src/fboard/board.mjs). */
  F02: Object.freeze({
    featureId: "F02",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F02_ACCEPTANCE_AMENDMENT_1_2026-09-25.md", commit: "ad14a64e8853e26a49fdac994dc5d00b6a65e29b", sha256: "19764797de24261a02725caa6786ec19d0c29e4f207a2db2b0dbbae6fc684db5" }),
    // Resolved through the register (inclusion rule f-row-acceptance-amendment); the board accepts it only while that
    // resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "F02_ACCEPTANCE_AMENDMENT_1", scope: Object.freeze(["ALMIVISIBILITY", "F02"]) }),
    frozenOn: "2026-09-25",
    feature: "F02 · Tenant and evidence isolation",
    input: "F02 is judged over every tenant-governed resource population that presently\nexists in production. A future learning population enters F02 automatically\nwhen F79 creates it.",
    expected: "All existing evidence, costs, caches, research inputs and outputs remain\ntenant-isolated. Any future F79 learning or evidence-cache path must use the\nsame F02 boundary before F79 may pass.",
    failure: "An existing population crosses tenants; an undeclared learning resource is\naccepted; F79 later introduces learning without F02 isolation; or the absence\nof a learning population is disguised by fixtures or fabricated records.",
    evidence: "Real non-empty existing populations prove their isolation NOW. The\nundeclared-learning refusal is proved with a firing control NOW. Real\nlearning write and reuse evidence is deferred to F79 and becomes mandatory\nwhen that population exists.",
    contractSha256: "4b153869c05b3563d313a9941fca874aef789732e842169671df80ccb48dbd3d",
    amends: Object.freeze({ ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F02_ACCEPTANCE_2026-09-24.md", commit: "3ea6fdac909bc76b4ba8137ef0c07147f7525143", sha256: "e468526e1257fd6ac16505a5018398fb8701165da0f711edc44b1395673e79e5" }), contractSha256: "9b6273d6fdb92f7fa8f2d542a40cdb1a210cce6ad34b430bc3d7c7e0d2b03471", supersededOnlyAs: "the demand for a presently non-empty real learning population" }),
    dependsOn: Object.freeze({ featureId: "F79", name: "Evidence Cache Before Re-Research", state: "UNASSESSED", constraint: "config/fboard/row-constraints.mjs" }),
  }),
  F05: Object.freeze({
    featureId: "F05",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-22_F05_ACCEPTANCE.md", commit: "58685998b08fafb8bf3d6b1b7da9a2becf3fe004", sha256: "035ae68d09de3378a18d4935af146308fdeef34ab21f5121dde4db47fb3a1f70" }),
    // 🔴 §6A — the ruling is resolved through the register like any other record; the board accepts this acceptance only
    // while that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "OWNER_RULING_F05_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F05"]) }),
    frozenOn: "2026-09-22",
    feature: "F05 · Current Authority Register",
    input: "Dated authority records whose proposition, governed scope, issuer,\neffective time, source and supersession relationship are declared.",
    expected: "For an exact proposition and requested scope, the resolver returns exactly\none CURRENT applicable authority, or an explicit ABSENT or OPEN_CONFLICT.\nA newer applicable ruling supersedes an older conflicting ruling only\ninside its declared scope. Superseded records remain immutable audit\nhistory and are never applied.",
    failure: "An older rule is applied after a newer applicable rule; a narrow ruling\nsupersedes unrelated scope; an unresolved conflict or absence quietly\nproduces permission; historical 61/38 material becomes F-row authority; or\nhistorical state transfers without fresh F-row verification.",
    evidence: "The resolver exercised over the real committed authority corpus, with every\napplicable authority accounted for, plus firing and clean controls for\nnewer-over-older, narrow-scope containment, equal-authority conflict,\nabsence, historical-only input and malformed provenance.",
    contractSha256: "942308f9d58f5c2960a49f6b4abe00b1a1899ebee813cadb715b6e881e4cf68d",
  }),
  F06: Object.freeze({
    featureId: "F06",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F06_FROZEN_ACCEPTANCE_2026-09-24.md", commit: "a0c94ceb481e763c344025dfa7f2d1245b6af83f", sha256: "7453b6bfe2b327a6e45ddb0d748a5e08c2d9dfd708fbb139a9dd81c38cc47b67" }),
    // Resolved through the register like any other record (inclusion rule frozen-f-row-acceptance); the board accepts
    // this acceptance only while that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "F06_FROZEN_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F06"]) }),
    frozenOn: "2026-09-24",
    feature: "F06 · Evidence State Model",
    input: "A real engine record, finding, check result, claim, recommendation or\nderived conclusion whose epistemic status affects how Visibility may\nreport, compare, prioritise or act on it.",
    expected: "Every governed item exposes exactly one canonical evidence state:\nOBSERVED\nDirectly measured, retrieved or witnessed evidence, with source,\ntime and traceable evidence reference.\nINFERRED\nA conclusion derived from identified inputs by a named rule, formula\nor method. It is never presented as directly observed.\nRECOMMENDED\nA proposed action or judgement based on identified evidence. It is\nnot itself proof that the underlying condition is true or that the\naction was implemented.\nUNKNOWN\nThe relevant question was reached, but available evidence does not\nlawfully establish an answer.\nNOT_MEASURED\nThe relevant check was not performed or did not produce a measurement.\nIt is distinct from zero, PASS, FAIL and UNKNOWN.\nNOT_APPLICABLE\nThe check is outside the item's declared scope, with a specific,\nreviewable applicability reason.\nThe evidence state remains separate from verdict, confidence, workflow\nstatus, verification state, board state and action state. Every\nconversion or transition names its evidence, rule, software version,\nactor and time. Missing or ambiguous legacy labels fail closed and\ncannot silently become OBSERVED, PASS or zero.",
    failure: "A governed item has no state or more than one canonical state; an\ninference is reported as an observation; a recommendation is reported\nas evidence or implementation; UNKNOWN, NOT_MEASURED or unavailable is\nconverted into zero, PASS or absence; NOT_APPLICABLE lacks a declared\nreason; a legacy label is guessed into a canonical state; or the\nevidence state is silently coupled to a verdict, confidence value,\nworkflow state, fact-verification label or board status.",
    evidence: "The canonical model and production adapters exercised over every real\ngoverned population; exact population and migration arithmetic with\nzero remainder; each of the six states reached on real material where\na lawful real population exists and otherwise through a firing\nsynthetic control; forbidden conversions proved RED independently;\nproduct-neutrality, isolation, audit, orphan and transition censuses;\ntwo agreeing full suites; a named counting control; one green PR,\nmerge and exact-main CI.",
    contractSha256: "b1c791d4f734652a84f88b170dfd020434625e9859fa97e7dde7ce560670337a",
  }),
  F07: Object.freeze({
    featureId: "F07",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F07_FROZEN_ACCEPTANCE_2026-09-23.md", commit: "cd149aea074f1e1b4b1f13fbeac26e6fdcaff047", sha256: "a9fbccdd040cc20d3962635372f318c49308086de6a8613842f8d957eb8b1112" }),
    // 🔴 §6A — resolved through the register like any other record (inclusion rule frozen-f-row-acceptance); the board
    // accepts this acceptance only while that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "F07_FROZEN_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F07"]) }),
    frozenOn: "2026-09-23",
    feature: "F07 · Held-out Evidence Firewall",
    input: "A declared held-out evaluation set; its sealed-store identity,\nconfidentiality boundary, access rule, population-accounting method\nand scoring protocol; a mechanism that must be assessed without its\nbuilders or mandatory governance readers seeing the held-out payload.",
    expected: "Mandatory governance and implementation reading exposes only the\nevidence shape and protocol—not held-out queries, URLs, fact values,\nlabels, defect locations, expected answers or marking keys. The sealed\npayload remains inaccessible until the assessed mechanism is frozen.\nEvery attempted and authorised access is recorded. Evaluation accounts\nfor the complete declared population without leaking payload into\nshared code, governance, logs, reports or future acceptance text.",
    failure: "Any mandatory reader can obtain, quote, paraphrase or infer a held-out\npayload item or expected answer before mechanism freeze; an\nunauthorised read reaches the filesystem; access is unrecorded; the\nevaluated denominator silently shrinks; a hidden item enters generic\ncode, fixtures, logs, governance or reports; or a mechanism is changed\nafter held-out access and still presented as an untouched held-out\nevaluation.",
    evidence: "A real sealed-store population refused before filesystem read, with\ncomplete path accounting; live controls proving the same loader can\nread an authorised ordinary file; a synthetic end-to-end held-out\nlifecycle proving freeze-before-access, recorded access, complete\nscoring and post-access contamination refusal; governance and content\nleak censuses with firing controls; and adversarial mutations proving\neach failure limb turns RED.",
    contractSha256: "263ebb5cd23aaf2e98c95b66b307a25308da8b6f35e4c0e25b654a524f80b0a5",
  }),
  F08: Object.freeze({
    featureId: "F08",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-22_F08_ACCEPTANCE.md", commit: "19e6b7b6aa4ad4757ac1c797d674754a4b92f1bb", sha256: "f6aef3403621f7275b2a2173da4c66cd562a400a9e581fc48c3f13c87981d18a" }),
    // 🔴 §6A — resolved through the register like any other record; the board accepts this acceptance only while
    // that resolution is CURRENT and names these exact bytes.
    authority: Object.freeze({ propositionId: "OWNER_RULING_F08_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F08"]) }),
    frozenOn: "2026-09-22",
    feature: "F08 · Audit Trail and Provenance",
    input: "Real engine decisions, state transitions, evidence uses, authorised\nwrites and explicit refusals that carry a declared tenant or\nglobal-product scope, an actor, a governing authority and a software\nversion.",
    expected: "Every governed event is recorded in an append-only, product-neutral\naudit trail that identifies what happened, when it happened and when\nit was recorded, by whom or by which process, for which tenant or\nglobal scope, under which authority as it stood at the time of the\nevent, under which software version, using which evidence\nreferences, and with which outcome. A reader can reconstruct the\ndecision without access to protected payload.",
    failure: "A governed action produces no audit event; an event omits its actor,\nscope, authority, evidence references, software version, times or\noutcome; an event is silently mutable, deletable or reorderable\nwithin the declared detection boundary; a reference cannot be\nresolved; cross-tenant evidence is joined; superseded authority is\nreported as the authority at the event; a migrated event is\nindistinguishable from a natively recorded one; or protected\npayload, credentials, marking keys or expected answers enter the\naudit trail.",
    evidence: "The production audit path exercised over non-empty real populations\ndrawn from the current authority register, F-board transitions,\nevidence-role decisions, authorised writes and explicit refusals,\nwith complete population accounting, silent clean controls proved\ncapable of firing, firing controls, tamper proofs, a declared and\ntested detection boundary, cross-tenant refusal and\nprotected-payload refusal.",
    contractSha256: "92d20a631da004bf6de5accd4df87df933ca99d0c9661bc49f8d9b8361b2a826",
  }),
  /* 🔴 F03 · FROZEN 25 Sep 2026, committed ALONE in the governance repository (f9d1888) before any F03 engine change
   * (owner command §8, L2). Pinned here from the committed blob. The F-board row stays UNASSESSED until the owner merges
   * and every clause is PROVED on the merged tree (owner command §1, §14): no board event is recorded before that. */
  F03: Object.freeze({
    featureId: "F03",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F03_FROZEN_ACCEPTANCE_2026-09-25.md", commit: "f9d18881fb658e3351880ba1c20bb83e12004a74", sha256: "f42429e10a6186fb9ebf66d007d464b02b07338b9a0c387ac99cf6f9ff070dfe" }),
    authority: Object.freeze({ propositionId: "F03_FROZEN_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F03"]) }),
    frozenOn: "2026-09-25",
    feature: "F03 · Subject root and connector registry",
    input: "Every root and every external connector the product resolves today: the\ndeclared roots and, inside them, each subject's data root, each\nobservation and declaration store, and every production entry point that\nopens or constructs a connection to an external source. A subject package\nkept inside the engine as subject-owned code is not a root. The committed\ndeclarations are the only input that may create a root or a connector, and\nthe real current declarations are the population, re-measured now under\nF03.",
    expected: "Every governed caller reaches a subject's root, a store and a connector\nthrough one resolution over declared, portable descriptors, completed\nbefore any read of subject data and before any connector is constructed.\nA root or a connector exists only because a committed declaration says\nso: a filename, directory presence, host, path convention or file content\ncan never create authority for either, and there is no default root.\nRoot and connector resolution is part of F02's single scope decision, not\na second decision: a subject or connector is allowed for a tenant only\nwhen F02 already allows everything it declares. Undeclared, ambiguous and\nscope-mismatched requests all refuse, each with a machine-readable reason\nand without payload, host, private path or secret. A connector\ndeclaration names its credential and never holds or derives its value;\na secret value never enters the registry, a log, an error, an audit event\nor evidence. Resolutions and refusals are recorded through the governed\nwrite path. The same declaration resolves in at least two genuinely\ndifferent environments. Shared code holds no subject identity.",
    failure: "A root or connector is created by a filename, directory, host, path,\nconvention, file content or default; subject data is read, or a connector\nconstructed, before resolution; a resolution disagrees with, or reaches\nbeyond, F02's decision; an undeclared, ambiguous or scope-mismatched\nrequest is allowed, or refuses without a reason, or refuses carrying\npayload, a host, a private path or a secret; a credential value is held,\nderived, echoed, hashed or measured anywhere; a resolution or refusal\nbypasses the governed write path; the declaration resolves in only one\nenvironment, or only through an environment-specific branch; a subject's\nidentity appears in shared code; or useful subject-owned behaviour is\ndeleted to satisfy a census.",
    evidence: "Shape only, under the F07 firewall: no real host, real path, real\ncredential name, real subject answer or expected value appears in this\ncontract. The real current declarations resolved with complete population\narithmetic and shown byte-identical to their committed form; every\nroot-locating and connection-constructing entry point shown to resolve\nfirst, by a census whose zero has a firing control; refused worlds for\nundeclared, ambiguous, scope-mismatched and unreadable declarations, each\nwith its reason and without payload; secret exclusion across the\nregistry, logs, errors, audit events and evidence; resolutions and\nrefusals audited through the governed write path; one declaration\nresolved in two genuinely different environments, where two directories\nmade by a test on one machine do not count; independent sabotage for\nevery failure class; two agreeing full suites; named counting control;\none PR, merge and exact-main CI.",
    contractSha256: "4a65924af01d7532b634b2d25f5acd0e3480a19aa34b93609cd8cf66d5957198",
  }),
  /* 🔴 F04 · AMENDMENT 1 (25 Sep 2026) is the CURRENT contract (owner ruling _handoffs 4bf7b1d; command 89e8664 §3). It
   * changes ONLY the EVIDENCE interpretation for a high-risk family with zero current owner-approved real actions; INPUT,
   * EXPECTED and FAILURE are the original's, and the original EVIDENCE clause is kept whole. The original stays frozen,
   * exported as F04_ORIGINAL, and is named by `amends` (both hashes, checked by src/fboard/board.mjs). */
  F04: Object.freeze({
    featureId: "F04",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F04_ACCEPTANCE_AMENDMENT_1_2026-09-25.md", commit: "68bd208178566bd739849c33e836b5033b3b6c4d", sha256: "95c2164e9394a208e857c0b8765071369a114d74fef6dd06bedb9d645214d711" }),
    authority: Object.freeze({ propositionId: "F04_ACCEPTANCE_AMENDMENT_1", scope: Object.freeze(["ALMIVISIBILITY", "F04"]) }),
    frozenOn: "2026-09-25",
    feature: "F04 · Roles permissions and approvals",
    input: "A declared actor, a governed action, the resource and scope affected by that action, and any\napproval or separation-of-duty requirement applicable to it.",
    expected: "Before a governed action executes, one product-neutral decision establishes the actor's current\nidentity class, role, tenant and subject scope, permissions, required approvals and\nseparation-of-duty status; only a fully authorised action proceeds, while missing identity, missing\nrole, insufficient scope, missing approval, expired approval, conflicting duty and unsupported\naction fail closed before protected data is read, state changes, remote work begins, money is\ncommitted or content is published.",
    failure: "A governed action proceeds without a declared actor or current permission; a role silently widens\ntenant or subject scope; a model, tool, process or commit author is treated as a human verifier or\napprover; an actor supplies, approves or verifies their own restricted decision where separation is\nrequired; a stale or unrelated approval is reused; publishing, payment, export or\nconnected-property change occurs without its required authority; a caller-specific allowlist\nbypasses the shared decision; or the mechanism is proved only by fixtures or an empty population.",
    evidence: "The production authorisation boundary and every governed action family exercised over a real\nnon-empty population, including authorised and refused research, verification, approval,\npublishing, spending, exporting and connected-property-change decisions where those families\nexist, with scope isolation, separation-of-duty checks, expiry, non-leakage, audit events and clean\nopposite-verdict controls. For each governed family with a current owner-approved real action,\nexercise real authorised and refused examples. For a high-risk family with zero current\nowner-approved real actions, report the zero population, prove a real refusal, prove the\nauthorised branch reachable only through a confined control, exclude that control from the real\npopulation, remain fail-closed, and require a future lawful re-sit when the first approved real\naction occurs.",
    contractSha256: "ff7933199082079139134f65bab8662ca1d675ae5bd1d8694a754972c92347f9",
    amends: Object.freeze({ ruling: F04_ORIGINAL.ruling, contractSha256: F04_ORIGINAL.contractSha256 }),
    zeroApprovedFamilies: Object.freeze(["SPEND", "EXPORT", "VERIFICATION", "PUBLISH", "CONNECTED_PROPERTY_CHANGE"]),
  }),
  /* 🔴 F09 · FROZEN 25 Sep 2026, committed ALONE in the governance repository (cf10494) before any F09 measurement or engine
   * change (owner command §5.2, L2). Pinned from the committed blob by src/fboard/acceptance.mjs parseContract. Its 19
   * clarifications are frozen in the same bytes (sha256 below). acceptanceRelation NEW. */
  F09: Object.freeze({
    featureId: "F09",
    ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F09_ACCEPTANCE_2026-09-25.md", commit: "cf104942dbcaba52aeeca4719306a7131b133540", sha256: "5b85d04ef632bd0fc24e14bac39d24bacfe3cf85d40ce0fc32e18c7130468f74" }),
    authority: Object.freeze({ propositionId: "F09_ACCEPTANCE", scope: Object.freeze(["ALMIVISIBILITY", "F09"]) }),
    frozenOn: "2026-09-25",
    feature: "F09 · Cross-client portability proof",
    input: "An independently existing client or project that is materially unrelated to the clients or\nsubjects previously exercised by the product, together with its authorised declaration, public or\nowner-provided resources and bounded goal.",
    expected: "The client is onboarded, resolved and processed through the same current product-neutral\ndeclaration, isolation, connector, authorisation, evidence and audit boundaries without adding its\nname, host, vocabulary, expected answer or client-specific branch to shared engine logic; changing\nonly declarations or subject-owned material is sufficient, and the resulting outcomes remain\nconfined to that client's tenant and subject scope.",
    failure: "Shared engine code, generic configuration or generic tests gain the client's name, host,\nvocabulary, data value, expected result or special-case branch; an existing client's declaration is\nreused or widened; tenant, subject, connector, role or evidence boundaries are bypassed; the new\nclient affects another client's evidence, costs, learning, outputs or decisions; onboarding works\nonly from the original machine location; or the proof uses a fixture, synthetic client, empty\npopulation or data authored by the onboarding command.",
    evidence: "One independently existing unrelated client processed through production entry points, with\ndeclaration-only or subject-owned integration, portable resolution in two environments, authorised\nand refused worlds, zero shared engine specialisation, tenant and subject isolation, unchanged\nexisting-client outcomes, audit events and clean controls.",
    contractSha256: "d0c8bd96fcba46e712955379fa06e39cbd84186c7af8340adad90aa6fa535027",
  }),
});
