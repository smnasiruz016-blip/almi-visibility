/**
 * 🔴 F10 · HUMAN QUESTION DISCOVERY — THE FROZEN PARAMETERS, AS DATA (acceptance _handoffs 504dbb9, contract c05e6789…).
 *
 * Every value below is fixed by the frozen F10 acceptance or by an owner act recorded before it. Nothing here is tuned
 * to a result: the scoring rule was fixed BEFORE ANY LABEL EXISTS (C6) and may not change once one does. Generic: this file
 * names no subject, client, host, tenant or query. Tenants are counted, never named.
 */

/** The classification protocol (C2, C6): the four discovered classes and the owner's two labeller exclusions. */
export const PROTOCOL = Object.freeze({
  id: "human-question-classes-v1",
  classes: Object.freeze(["GOAL", "QUESTION", "CONCERN", "CONFUSION"]),
  exclusions: Object.freeze(["EXCLUDED_PERSONAL", "CANNOT_TELL"]),
});

/**
 * THE SCORING RULE (C6, owner ruling 1.5). A PRE-RUN ACCEPTANCE DECISION, not a prediction of performance.
 *   D = declaredItems − EXCLUDED_PERSONAL − CANNOT_TELL; D < minDenominator → INVALID, no rate.
 *   a class is assessable with ≥ minPositives labelled positives AND ≥ minNegatives labelled negatives, else UNKNOWN;
 *   PASS needs ≥ minAssessableClasses assessable classes and Cohen's kappa ≥ kappaBar on EVERY one of them.
 * LIMIT (a): raw agreement is NOT the bar — ≥ 0.80 raw agreement PASSES a mechanism that finds nothing when the rare
 * classes sit near 5% (_handoffs 4874299, bar-arithmetic output line 239). Kappa corrects for chance.
 * LIMIT (b): at D between 80 and 100 kappa is noisy (a few items move it ~0.05–0.1): a result near the bar is not
 * decisive; and it measures the mechanism against the owner's reference labels, not two humans agreeing.
 */
export const SCORING_RULE = Object.freeze({
  declaredItems: 100,
  minDenominator: 80,
  minPositives: 10,
  minNegatives: 10,
  minAssessableClasses: 2,
  kappaBar: 0.6,
  nearBarBand: 0.1,
});

/**
 * THE POPULATION SOURCE (C1). The registered observed Search Console store and the one query-page observation the
 * preparation measured, pinned by id AND content hash: a changed pull is a changed population, and C1 fails closed on it
 * until re-measured (REOPEN TRIGGER). The retired population is derived from its own registered observation.
 */
export const POPULATION_SOURCE = Object.freeze({
  storeId: "observed:search-console-store",
  storePath: "runs/evidence/evidence.jsonl",
  observationId: "c97334fdd102df8e",
  method: "gsc.searchAnalytics.query:query-page",
  contentSha256: "d4d450a085572119dc3705cd8c1ffe7ff66ae6baaad1c0f656473db4aa78f4a8",
  retiredObservationId: "45ce21253a3fc58c",
});

/**
 * THE OWNER-AUTHORISED EXCLUSION RULES (C1), exactly as committed in the round-3 rule text (_handoffs a58a385, blob
 * f681c859…) without the two rules the owner did not authorise. Order matters: a row is removed by the FIRST rule it
 * matches. Canonical digest of [[name, source, flags], …] re-derived from that blob: RULES_DIGEST below.
 */
export const EXCLUSION_RULES = Object.freeze([
  Object.freeze({ name: "EMAIL", family: "personal or contact material", re: /[^\s@]+@[^\s@]+\.[a-z]{2,}/i }),
  Object.freeze({ name: "PHONE", family: "personal or contact material", re: /(?:\+?\d[\s().-]?){7,}/ }),
  Object.freeze({ name: "IDENTITY_NUMBER", family: "personal or contact material", re: /\b\d{6,}\b|\b[a-z]{1,2}\d{6,9}\b/i }),
  Object.freeze({ name: "POSTAL_ADDRESS", family: "personal or contact material", re: /\b\d+\s+\w+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way|court|crescent|place)\b|\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/i }),
  Object.freeze({ name: "SENSITIVE_HEALTH_PERSONAL", family: "health", re: /\b(pregnan\w*|hiv|aids|cancer|tumou?r|diabet\w*|depress\w*|anxiety|suicid\w*|mental illness|disabilit\w*|miscarriage|abortion|std|sti|hepatitis|tuberculosis|my (illness|condition|diagnosis))\b/i }),
  Object.freeze({ name: "SENSITIVE_IMMIGRATION_STATUS", family: "immigration", re: /\b(asylum|refugee|deport\w*|overstay\w*|illegal\w*|undocumented|detention|removal order|visa (refus\w*|reject\w*|denied)|appeal against)\b/i }),
  Object.freeze({ name: "SENSITIVE_CHILD", family: "child-related material", re: /\b(child|children|kid|kids|baby|babies|minor|son|daughter|teen\w*|toddler|infant)\b/i }),
  Object.freeze({ name: "DONATION", family: "donation or payment material", re: /\b(donat\w*|charit\w*|zakat|sadaqah|fundrais\w*|sponsor a)\b/i }),
  Object.freeze({ name: "PAYMENT", family: "donation or payment material", re: /\b(payment\w*|pay|paid|paying|paypal|credit card|debit card|card details|bank transfer|invoice\w*|refund\w*)\b/i }),
  Object.freeze({ name: "D4_IMMIGRATION_SUBJECT", family: "immigration", re: /\b(visa\w*|immigra\w*|migra\w*|sponsor\w*|residen\w*|citizenship|work permit|settlement|ilr|brp)\b/i }),
  Object.freeze({ name: "D4_HEALTH_SUBJECT", family: "health", re: /\b(health\w*|medic\w*|nurs\w*|hospital\w*|patient\w*|clinic\w*|doctor\w*|disease\w*|nhs)\b/i }),
]);
export const RULES_DIGEST = "39e00548df991f78c455654bbf0dc005d0947cd1a374f18f99e084be1a1a2dd4";
export const EXCLUSION_FAMILIES = Object.freeze(["personal or contact material", "health", "immigration", "child-related material", "donation or payment material"]);

/**
 * THE COMMITTED ACCOUNTING the recount must reconcile with (C1; _handoffs 5a4b3c4 owner-sheet eligibility output, blob
 * c4dcfb5a…). COUNT-ONLY: the eligible capacities are a multiset, tenants are not named. A difference fails closed until it
 * is re-measured and recorded.
 */
export const COMMITTED_ACCOUNTING = Object.freeze({
  start: 574, unattributed: 0, operator: 224,
  byFamily: Object.freeze({ "personal or contact material": 0, health: 6, immigration: 7, "child-related material": 0, "donation or payment material": 1 }),
  retired: 60, crossTenantDuplicates: 0, withinTenantDuplicates: 20, eligible: 256,
  eligibleCapacitiesDescending: Object.freeze([142, 62, 27, 12, 5, 2, 2, 2, 2]),
  allocationDescending: Object.freeze([37, 22, 16, 12, 5, 2, 2, 2, 2]),
});

/**
 * C7 · THE SEQUENCE-EVIDENCE REOPEN TRIGGER. A record field with one of these names makes a store a candidate sequence
 * population; its first appearance in a declared store fires the trigger. Names only — never a value.
 */
export const SEQUENCE_FIELD_NAMES = Object.freeze([
  "session", "session_id", "sessionid", "session_key", "sessionkey", "visit_id", "visitid", "ga_session_id",
  "sequence", "sequence_index", "sequenceindex", "event_index", "eventindex", "step_index", "stepindex", "turn_index",
  "client_id", "clientid", "user_pseudo_id", "userpseudoid", "pseudonymous_id", "pseudonymousid",
  // the F10 reachability probe's own field list (_handoffs 8757bd6), kept so the trigger is never narrower than that measurement
  "previousquery", "prevquery", "refinement", "nextquery", "followup", "follow_up", "querychain",
]);
