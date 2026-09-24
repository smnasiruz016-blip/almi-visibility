/**
 * 🔴 FROZEN ACCEPTANCES OF THE ACTIVE F-BOARD — COPIED FROM COMMITTED RULINGS, NEVER AUTHORED HERE.
 *
 * Each entry is parsed (src/fboard/acceptance.mjs) from the ruling's committed bytes in the governance repository, and
 * pinned to BOTH the ruling's sha256 and the contract's own sha256 under the declared normalisation. The engine never
 * writes an acceptance: a change to any clause here without a new committed ruling turns the pins red.
 */
export const ACCEPTANCES = Object.freeze({
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
});
