/**
 * 🔴 ROW 5, STEP ZERO — WHICH QUERY ROWS ARE A PERSON ASKING, AND WHICH ARE AN ENGINE BEING INSTRUCTED.
 *
 * Search Console reports every string that drew an impression. Some of those strings are not questions a person
 * put in their own words: they carry SEARCH OPERATORS (`site:`, `-site:`, `inurl:`, a double-quoted exact phrase),
 * which tell the engine how to match rather than say what someone wants to know. Clustering them as intents would
 * put a tool's instruction into the human-intent population.
 *
 * 🔴 SO THEY ARE CLASSIFIED, NOT DROPPED. A row silently deleted is a row nobody can audit. Every input row lands
 * in exactly one of the two populations; each operator row carries its KIND and the reason; both counts are
 * reported; and a validator refuses an operator row found inside the human population, and refuses a row that is
 * in neither.
 *
 * WHO TYPED AN OPERATOR STRING IS NOT OBSERVABLE HERE. The kind is read from the FORM of the string. What the form
 * suggests about its author is an INFERENCE and is labelled as one.
 */

export const OPERATOR_RULE =
  "a query row is OPERATOR when its string contains a search-engine operator — site:, -site:, inurl:, intitle:, " +
  "filetype:, or a double-quoted exact phrase. Such a string instructs the engine how to match; it is not a person's " +
  "question in their own words. It is excluded from the human-intent population, kept, and counted. Every other row is HUMAN.";

export const OPERATOR_KINDS = Object.freeze({
  SITE_INSPECTION: {
    form: "the whole string is site:<host> and nothing else",
    inference: "an index-coverage check of a named host — what the engine holds for it. Nothing is asked about any subject",
  },
  EXCLUSION_LIST_MONITOR: {
    form: "a quoted term followed by three or more -site: exclusions",
    inference: "the signature of an automated monitoring or scraping tool: a fixed exclusion list of social and review platforms appended to unrelated terms, so that only editorial pages come back",
  },
  EXACT_PHRASE_LOOKUP: {
    form: "one or more double-quoted exact phrases, with no site operator",
    inference: "an exact-match lookup of a stated fact — the shape of automated verification or research, not of a question in a person's words",
  },
  OTHER_OPERATOR: {
    form: "any other operator (inurl:, intitle:, filetype:)",
    inference: "an engine instruction of a kind not otherwise classified",
  },
});

const SITE_ONLY = /^-?site:\S+$/i;
const EXCLUSION = /(^|\s)-site:\S+/gi;
const OTHER = /(^|\s)-?(inurl|intitle|filetype|allinurl|allintitle):/i;

/** The kind of an operator string, or null for a human query. */
export function operatorKind(query) {
  const q = String(query).trim();
  if (SITE_ONLY.test(q)) return "SITE_INSPECTION";
  if ((q.match(EXCLUSION) || []).length >= 3) return "EXCLUSION_LIST_MONITOR";
  if (/site:/i.test(q)) return "OTHER_OPERATOR";
  if (q.includes('"')) return "EXACT_PHRASE_LOOKUP";
  if (OTHER.test(q)) return "OTHER_OPERATOR";
  return null;
}

/** Split the query rows into the two populations. Nothing is dropped. */
export function splitPopulation(rows) {
  const human = [];
  const operators = [];
  for (const row of rows) {
    const kind = operatorKind(row.query);
    if (kind === null) human.push(row);
    else operators.push({ ...row, kind, form: OPERATOR_KINDS[kind].form, inference: OPERATOR_KINDS[kind].inference });
  }
  return { total: rows.length, human, operators, rule: OPERATOR_RULE };
}

/**
 * 🔴 THE LAW'S OWN TEST FOR OPERATOR SYNTAX — deliberately NOT `operatorKind`. A law that asked the classifier it
 * polices would go blind the moment the classifier broke: a classifier that stopped seeing `site:` would also stop
 * the law from seeing it. This is the rule's syntax stated once more, flatly; test/intent-clustering.test.mjs proves
 * the two agree on every real row.
 */
export const hasOperatorSyntax = (query) => /(^|\s)-?(site|inurl|intitle|filetype|allinurl|allintitle):|"/i.test(String(query));

/**
 * 🔴 The population law. Returns [] when it holds.
 *   operator-in-population — a row whose string carries an operator sits in the human population
 *   row-dropped            — an input row is in neither population, or in both
 */
export function populationErrors({ rows, human, operators }) {
  const errs = [];
  for (const h of human) {
    if (hasOperatorSyntax(h.query)) errs.push({ limb: "operator-in-population", why: `"${h.query}" carries search-operator syntax and was counted as a human query` });
  }
  const count = new Map();
  for (const r of [...human, ...operators]) count.set(r.query, (count.get(r.query) || 0) + 1);
  for (const r of rows) {
    const n = count.get(r.query) || 0;
    if (n !== 1) errs.push({ limb: "row-dropped", why: `"${r.query}" is in ${n} population(s); every row must be in exactly one` });
  }
  if (human.length + operators.length !== rows.length) {
    errs.push({ limb: "row-dropped", why: `${human.length} human + ${operators.length} operator ≠ ${rows.length} rows in the store` });
  }
  return errs;
}
