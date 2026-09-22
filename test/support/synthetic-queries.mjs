/**
 * 🔴 SYNTHETIC TEST FIXTURE — NOT REAL EVIDENCE. GENERATED, NEVER REMEMBERED.
 *
 * Every string this module makes is produced by the DECLARED, DETERMINISTIC RULE below from a SEED the calling test
 * records. Nothing is hand-written: the author of these tests has read a retired held-out population, and a fixture
 * written "similar but different" would carry that memory. A generated nonsense corpus cannot.
 *
 * A test built on this module proves a MECHANISM — that a branch fires, that a clean case stays clean. It NEVER proves
 * real-world effectiveness, and nothing it produces may be counted as real evidence (registered in
 * config/evidence-roles.mjs as SYNTHETIC_TEST_FIXTURE, mayEvaluate false).
 */
export const EVIDENCE_CLASS = "SYNTHETIC_TEST_FIXTURE — NOT REAL EVIDENCE";

export const RULE =
  "mulberry32(seed) drives every choice. A WORD is 3 syllables, each one consonant from 'bdfgklmnprstvz' followed by one " +
  "vowel from 'aeiou', prefixed by 'q' so no generated word can be an English word. An INTENT is 2 distinct content words. " +
  "A QUERY of an intent is its 2 content words plus 0–2 filler words from the corpus's own generated filler list, in a " +
  "PRNG-shuffled order; with probability 1/4 a number slot (10–99) is inserted. Intent i's queries are made one after " +
  "another, and a query equal to an earlier one is regenerated.";

/** mulberry32 — a small, well-known deterministic PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = "bdfgklmnprstvz";
const V = "aeiou";

export function syntheticCorpus({ seed, intents = 6, queriesPerIntent = 6, fillerCount = 3 }) {
  const rnd = mulberry32(seed);
  const pick = (s) => s[Math.floor(rnd() * s.length)];
  const used = new Set();
  const word = () => {
    for (;;) {
      const w = `q${pick(C)}${pick(V)}${pick(C)}${pick(V)}${pick(C)}${pick(V)}`;
      if (!used.has(w)) { used.add(w); return w; }
    }
  };
  const filler = Array.from({ length: fillerCount }, word);
  const shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reference = {};
  const rows = [];
  const seen = new Set();
  for (let i = 0; i < intents; i += 1) {
    const id = `synthetic-intent-${String(i + 1).padStart(2, "0")}`;
    const content = [word(), word()];
    const members = [];
    while (members.length < queriesPerIntent) {
      const extra = Array.from({ length: Math.floor(rnd() * 3) }, () => pick(filler));
      const parts = shuffle([...content, ...extra]);
      if (rnd() < 0.25) parts.splice(Math.floor(rnd() * (parts.length + 1)), 0, String(10 + Math.floor(rnd() * 90)));
      const q = parts.join(" ");
      if (seen.has(q)) continue;
      seen.add(q);
      members.push(q);
      rows.push({ query: q, impressions: 1 + Math.floor(rnd() * 20), clicks: 0 });
    }
    reference[id] = { members };
  }
  const lexicon = { phrases: [], synonyms: {}, filler, slotTypes: {}, exclusive: [], slotRulings: {} };
  return Object.freeze({ seed, rule: RULE, evidenceClass: EVIDENCE_CLASS, rows, reference, lexicon });
}
