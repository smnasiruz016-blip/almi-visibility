/**
 * 🔴 THE EVIDENCE-ROLE REGISTRY — WHAT EACH REGISTERED ARTEFACT MAY LAWFULLY DO (owner rulings of 22 September 2026:
 * _handoffs a5452ee, clarified by f4367b1).
 *
 * Every entry declares its ROLE and every permission as an explicit boolean. An unstated permission is FALSE, and an
 * entry that cannot state one truthfully is not registered: `src/governance/evidence-roles.mjs` fails closed on it.
 * Registration uses resource identifiers and content hashes ONLY — no payload is ever copied here.
 *
 * contentHash rule: sha256 over the artefact's UTF-8 bytes with CRLF normalised to LF (so a checkout's line endings
 * cannot move it). A SEALED artefact carries `contentHash: null`: its content may not be read, so it is not hashed.
 * A retired population's contentHash is its SET FINGERPRINT (see its `fingerprintRule`).
 */
export const CONTENT_HASH_RULE = "sha256 over the UTF-8 bytes with CRLF normalised to LF";

const OBSERVED = Object.freeze({
  role: "OBSERVED_DATA",
  mandatoryReadable: false,
  // capabilities may compute over it as ordinary real input, per their own acceptance contract
  mayEvaluate: true,
  maySupplyExpectedAnswer: false,
  sealed: false,
  retiredReason: null,
});

export const EVIDENCE_ROLE_REGISTRY = Object.freeze([
  Object.freeze({
    ...OBSERVED,
    id: "observed:search-console-store",
    resource: Object.freeze({ root: "engine", path: "runs/evidence/evidence.jsonl" }),
    scope: "the connected estate's Search Console pulls and re-sightings held by the engine's evidence store",
    subject: null,
    source: "Search Console API pulls, ingested by the engine",
    provenance: "append-only evidence store; every observation carries its own id, method and timestamp",
    capturedAt: "2026-09-12",
    contentHash: "9d6f9c12ebf508c967714e2a0e67e1938ef6749314d55c49d5c22d4a92485bf8",
    // unsupervised statistics (weights, co-occurrence) are computed over it as ordinary input
    mayTrain: true,
  }),
  Object.freeze({
    ...OBSERVED,
    id: "observed:search-language-output",
    resource: Object.freeze({ root: "engine", path: "runs/discovery/search-language-2026-09-15.json" }),
    scope: "a deterministic derivation of three stored query pulls; read as input by the localized-thinking path",
    subject: null,
    source: "bin/search-language.mjs over runs/evidence/evidence.jsonl",
    provenance: "committed output; reproducible from the store",
    capturedAt: "2026-09-15",
    contentHash: "06ba66ac27e2f3eb26d005841b76817838926b8d868b188beab04fc988d492e2",
    mayTrain: false,
  }),
  Object.freeze({
    ...OBSERVED,
    id: "observed:localized-thinking-output",
    resource: Object.freeze({ root: "engine", path: "runs/discovery/localized-thinking-2026-09-15.json" }),
    scope: "a deterministic derivation of the country×query pull and the search-language output",
    subject: null,
    source: "bin/localized-thinking.mjs over runs/evidence/evidence.jsonl",
    provenance: "committed output; reproducible from the store",
    capturedAt: "2026-09-15",
    contentHash: "de1f4fce664d27ed35a1a5874d907cfe4b36a10d4c1601f26c640a2c0f3646c5",
    mayTrain: false,
  }),
  Object.freeze({
    ...OBSERVED,
    id: "observed:localized-reasoning-output",
    resource: Object.freeze({ root: "engine", path: "runs/discovery/localized-reasoning-2026-09-21.json" }),
    scope: "a derivation of the country×query pull joined to the declared external research batch",
    subject: null,
    source: "the localized-thinking path with the external research batch",
    provenance: "committed output",
    capturedAt: "2026-09-21",
    contentHash: "9abd4ce7e4abc58ba7ed3a35e05f74459601c539ce70285e438c2f577eba6094",
    mayTrain: false,
  }),
  Object.freeze({
    ...OBSERVED,
    id: "observed:local-reasoning-batch",
    resource: Object.freeze({ root: "external", path: "research/local-reasoning-2026-09-21/records.jsonl" }),
    scope: "public primary-source readings in a declared external subject-data root, hash-pinned by their manifest",
    subject: "declared per record (tenant id)",
    source: "browser-rendered readings of public primary sources",
    provenance: "external batch with its own manifest and sha256",
    capturedAt: "2026-09-21",
    contentHash: "f5225889d6c1806672e202dc5b5d878e833ae03b2e989c69d3eebd3aa0e2ba49",
    mayTrain: false,
  }),
  Object.freeze({
    id: "retired:held-out-set-3d4951d6673301bc",
    resource: Object.freeze({ root: "derived", derivation: Object.freeze({ observationId: "45ce21253a3fc58c", population: "human rows (src/discovery/query-population.mjs)", rule: "HOLD_OUT_RULE (src/discovery/intent-clusters.mjs)" }) }),
    role: "RETIRED_CONTAMINATED",
    scope: "a held-out population derived from one stored query pull; retired from every held-out, unseen, marking-key and expected-answer role",
    subject: null,
    source: "derived at runtime from registered observed data; never stored as a list",
    provenance: "owner rulings _handoffs a5452ee and f4367b1",
    capturedAt: "2026-09-14",
    contentHash: "3d4951d6673301bc",
    fingerprintRule: "first 16 hex of sha256 over the members, lower-cased, sorted, joined by LF",
    population: 61,
    mandatoryReadable: false,
    mayTrain: false,
    mayEvaluate: false,
    maySupplyExpectedAnswer: false,
    sealed: false,
    retiredReason: "its members were exposed in mandatory-readable governance before evaluation; it can no longer act as unseen evidence",
  }),
  Object.freeze({
    id: "sealed:case-study-row52",
    resource: Object.freeze({ root: "engine", pathPrefixes: Object.freeze(["case-study-01/", "runs/case-study-01/"]) }),
    role: "SEALED",
    scope: "a sealed case-study corpus, its exhibits and its marking key; readable only by its own sealed evaluation",
    subject: null,
    source: "the sealed case study",
    provenance: "path-presence metadata only; content not read",
    capturedAt: "2026-09-20",
    contentHash: null,
    mandatoryReadable: false,
    mayTrain: false,
    mayEvaluate: false,
    maySupplyExpectedAnswer: false,
    sealed: true,
    retiredReason: null,
  }),
  Object.freeze({
    id: "synthetic:query-fixture-generator",
    resource: Object.freeze({ root: "engine", path: "test/support/synthetic-queries.mjs" }),
    role: "SYNTHETIC_TEST_FIXTURE",
    scope: "generated nonsense query corpora for mechanism tests; NOT REAL EVIDENCE",
    subject: null,
    source: "a declared deterministic generator with a recorded seed",
    provenance: "generated, never remembered",
    capturedAt: "2026-09-22",
    contentHash: "65743c91af619686b3811efeb3d4b6c3d8acc701f4b5d4a21c3f9c81dac51ba5",
    mandatoryReadable: false,
    mayTrain: false,
    mayEvaluate: false,
    maySupplyExpectedAnswer: false,
    sealed: false,
    retiredReason: null,
  }),
]);

/**
 * 🔴 F07 AMENDMENT 2 (governance 051feb9) — GOVERNED SEALED STORES OUTSIDE ANY GIT TREE.
 *
 * A registered HELD_OUT_EVIDENCE or MARKING_KEY entry whose `resource.root` is not "engine" (and not a derivation) names
 * one of these stores. Each is located at run time by an ENVIRONMENT REFERENCE, BY NAME — never a path in this file, so the
 * declared shape is { mechanism: "ENV_REFERENCE", name: "<ENVIRONMENT_VARIABLE_NAME>" }, and the
 * registry stays portable and no location is committed. An undeclared, unset or absent store is not an empty store: the
 * census and the evaluator FAIL CLOSED on it (src/governance/sealed-store-roots.mjs).
 *
 * EMPTY until the owner chooses this shape for a real marking key: the choice between a git-tracked sealed path and a
 * store declared here is the owner's (governance c4f55d7, Step 1), and the engine supports and proves both.
 */
export const SEALED_STORE_ROOTS = Object.freeze({});
