// 🔴 SANITISED 2026-09-22 under the RETIRED_CONTAMINATED ruling (_handoffs a5452ee, clarified f4367b1): 1 retired held-out string occurrence(s) replaced by [REDACTED — RETIRED_CONTAMINATED HELD-OUT PAYLOAD]. Retired set fingerprint 3d4951d6…, population 61. The original bytes remain ONLY in Git history — blob 56f1a7e610e4266dfa9de3f11b9bc092878ca173, introduced in dd15acf; they must not be used as held-out, unseen, marking-key or expected-answer evidence.
/**
 * 🔴 ROW 5 — THE SUBJECT'S WORDS, DECLARED OUTSIDE `src/` SO THE CLUSTERER STAYS GENERIC.
 *
 * Every entry is a claim about how this subject's searchers write: a synonym, a filler word, a multi-word phrase,
 * a typed slot value, or a group of mutually exclusive entities. It is the part of the clusterer that knows the
 * subject, and it is the part most able to smuggle the reference in — so it is held to one mechanical law:
 *
 *   🔴 EVERY SOURCE WORD IN THIS FILE MUST OCCUR IN AT LEAST ONE IN-SAMPLE (NOT HELD-OUT) QUERY.
 *   (Source words: each word of a phrase, each synonym's key, each filler word, each slot value and exclusive
 *   entity that is not itself the target of a synonym or phrase. A target such as `equiv` is a label, not a word.)
 *
 * test/intent-clustering.test.mjs enforces it. A word that occurs only in a held-out query cannot be here, so the
 * held-out check measures what this lexicon does on wording it was not written from. What the law cannot stop:
 * the author READ every query, including the held-out ones, before writing this file. The held-out miss count is
 * therefore a lower bound on the misses a truly unseen query set would produce, and is reported as one.
 *
 * It was tuned against the IN-SAMPLE disagreements with the reference only, in three rounds; the held-out misses
 * were not printed until it was frozen.
 */

export const LEXICON = Object.freeze({
  phrases: [
    ["curriculum vitae", "cv"],
    ["c v", "cv"],
    ["no experience", "noexperience"],
    ["zero experience", "noexperience"],
    // the three task names belong to one test: naming the task names the test
    ["summarize written text", "pte swt"],
    ["summarise written text", "pte swt"],
    ["writing summary", "pte swt"],
    ["summarize spoken text", "pte sst"],
    ["respond to a situation", "pte rts"],
    ["respond to situation", "pte rts"],
    ["word limit", "wordlimit"],
    ["celpe bras", "celpebras"],
    ["life style", "lifestyle"],
    ["self employment", "business"],
    ["pearson test of english", "pte"],
    ["single module", "retake"],
    ["new zealand", "new_zealand"],
    ["saudi arabia", "saudi_arabia"],
    ["primary school", "primary_school"],
    ["low budget", "budget"],
    ["small budget", "budget"],
    ["low start", "budget"],
    ["b v", ""],
    // the candidate account's name: the account, and the test it belongs to
    ["my pte", "mypte pte"],
  ],
  synonyms: {
    resume: "cv", resumes: "cv",
    results: "result",
    habits: "habit", routine: "habit",
    businesses: "business",
    score: "equiv", scores: "equiv",
    band: ["ielts", "equiv"], bands: ["ielts", "equiv"],
    equal: "equiv", equivalent: "equiv", conversion: "equiv", convert: "equiv", converter: "equiv", compare: "equiv", compared: "equiv", chart: "equiv",
    difference: "vs", or: "vs",
    mypte: ["mypte", "pte"],
    changes: "change",
    jobs: "job",
    beginners: "beginner", newbies: "beginner",
    required: "requirement", requirements: "requirement", accepted: "requirement", accepting: "requirement",
    refund: "cancellation",
    improvement: "retake",
    guards: "guard",
    pr: "migration",
  },
  filler: [
    "a", "to", "in", "into", "for", "of", "with", "on", "and", "is", "what", "how", "which", "when", "i", "u", "you",
    "can", "have", "t", "don", "about", "between", "many", "my",
    "best", "good", "easy", "basic", "new", "essential", "practical", "daily", "everyday", "personal", "living", "life", "better", "healthy",
    "improve", "build", "develop", "important", "yourself", "that", "are",
    "test", "exam", "check", "sample", "word", "free", "trial", "pearson",
    "make", "write", "put", "writing",
    "ideas", "start", "starting", "small",
  ],
  slotTypes: {
    country: ["australia", "new_zealand", "spain", "switzerland", "denmark", "qatar", "iran", "saudi_arabia", "peru", "cameroon", "netherlands", "china", "philippines", "malta", "iraq", "croatia", "japan", "guatemala"],
    demonym: ["iranian"],
    city: ["bari", "torino", "valencia", "braga", "venezia", "chelsea"],
    occupation: ["assistant", "manager", "engineer", "bartender", "maid", "housekeeper", "midwife", "producer", "quant", "researcher", "worker", "tutor", "developer", "coordinator", "doctor", "driving", "writer", "guard", "bank", "animal", "trade", "primary_school", "management"],
    field: ["mit"],
    variant: ["academic", "core"],
    audience: ["beginner", "student"],
    budget: ["budget"],
    skill: ["reading"],
    purpose: ["migration"],
  },
  absorbs: ["occupation"],
  intentWords: ["cv", "job", "pte", "ielts", "study", "requirement"],
  /**
   * Two keys naming a DIFFERENT set of a group's members — including one naming a member and the other none —
   * score 0. The tests are the object of a question (reference rule R4); the word limit is an ask (R3).
   */
  exclusive: [["pte", "ielts", "toefl"], ["wordlimit"]],
  dominates: [["equiv", "vs"], ["result", "mypte"]],
  /**
   * 🔴 THE EXPLICIT JUDGEMENT THE BRIEF ASKED FOR. For every slot type: does its VALUE change the question?
   * (Never — a value is never in the key.) Does its PRESENCE? (`inKey`.) And why.
   */
  slotRulings: {
    number: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — a score selects one row of one equivalence answer; '47 pte to ielts' and 'pte to ielts' ask the same question, and '47' and '65' are the same intent with different slot values" },
    year: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — the year dates the question, it does not change it" },
    country: { inKey: true, ruling: "SAME INTENT ACROSS VALUES; a country's PRESENCE is part of the question ('cv malta' is not 'cv for an occupation')" },
    demonym: { inKey: true, ruling: "SAME INTENT ACROSS VALUES; a nationality's presence is part of the question and is not a place" },
    city: { inKey: true, ruling: "SAME INTENT ACROSS VALUES; a city's presence is part of the question" },
    occupation: { inKey: true, ruling: "SAME INTENT ACROSS VALUES — 'bartender cv' and '[REDACTED — RETIRED_CONTAMINATED HELD-OUT PAYLOAD]' are one question with two occupations; an occupation's presence is part of the question" },
    field: { inKey: false, ruling: "SAME INTENT ACROSS VALUES, AND OPTIONAL — 'study in philippines' and 'study mit in china' ask the same thing; the field narrows it" },
    variant: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — the test variant (academic, core) narrows the answer, it does not change the ask" },
    audience: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — who asks (a beginner, a student) narrows the answer, it does not change the ask" },
    budget: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — a budget constraint narrows the answer" },
    skill: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — the skill practised narrows the material" },
    purpose: { inKey: false, ruling: "SAME INTENT ACROSS VALUES — a stated purpose (migration) narrows the answer, it does not change the ask" },
  },
});
