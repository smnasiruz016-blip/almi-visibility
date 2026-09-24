/**
 * 🔴 ROW 6 — THE AXIS HYPOTHESES AND WHERE THEIR EVIDENCE IS READ. SUBJECT KNOWLEDGE, SO IT LIVES OUTSIDE `src/`.
 *
 * An axis here is a HYPOTHESIS, never an adopted dimension. This file only says, for each candidate, WHERE the
 * evidence for it would show up: which row-5 slot types carry its values, which words mark it, and which URL
 * segment of our own archived sibling pages varies along it. Every verdict is computed by
 * src/discovery/axis-discovery.mjs from measurements; nothing here states a verdict.
 *
 * The frozen contract names six — profession, role, stage, origin/destination, language, locality. All are listed
 * and all must be tested (the validator refuses otherwise); origin/destination is tested as its two directions,
 * because a person's origin and their destination are two different questions about them. Any slot type row 5
 * recorded that no named axis claims is tested too, as a DISCOVERED candidate — found in the evidence, not listed
 * by habit.
 *
 * 🔴 `profession` and `role` cannot be told apart by wording alone: a query names a job title, and whether that title
 * is a licensed profession is not in the query. The split below (LICENSED_HEADS) is a declared READING of the title,
 * recorded as such — not a measurement.
 */

/** Job-title words read as licensed / regulated professions. Every other occupation value is read as a role. */
export const LICENSED_HEADS = Object.freeze(["midwife", "doctor", "worker", "nurse", "psychologist", "neurologist", "cardiology", "pharmacist", "dentist", "cardiologist", "clinical"]);
const licensed = (value) => String(value).split(/[\s-]+/).some((w) => LICENSED_HEADS.includes(w));

/** Words beside a country that make it a DESTINATION (where the person is going), not where they are. */
export const DESTINATION_CONTEXT = Object.freeze(["requirement", "visa", "migration", "residency", "study"]);

export const AXIS_SPECS = Object.freeze({
  profession: {
    named: true,
    reads: "an occupation slot value read as a licensed profession (LICENSED_HEADS)",
    slotTypes: ["occupation"],
    include: (v) => licensed(v),
  },
  role: {
    named: true,
    reads: "an occupation slot value NOT read as a licensed profession",
    slotTypes: ["occupation"],
    include: (v) => !licensed(v),
  },
  stage: {
    named: true,
    reads: "a word marking where in a journey the person is — preparing, booking, a result, retaking — or a career stage (no experience, a beginner, a student)",
    slotTypes: ["audience"],
    words: {
      preparing: ["swt", "sst", "rts", "format", "template"],
      booking: ["booking", "fee", "reschedule", "cancellation", "price"],
      result: ["result", "rescore"],
      retaking: ["retake"],
      "no experience": ["noexperience"],
    },
  },
  origin: {
    named: true,
    contractName: "origin/destination",
    reads: "a nationality in the question (a demonym slot)",
    slotTypes: ["demonym"],
  },
  destination: {
    named: true,
    contractName: "origin/destination",
    reads: "a country in a question about going there (beside a requirement, visa, migration, residency or study word)",
    slotTypes: ["country"],
    contextAny: DESTINATION_CONTEXT,
  },
  language: {
    named: true,
    reads: "the language the query is written in, from two or more marker words",
    markers: {
      es: ["licenciatura", "maestria", "administracion", "en", "de", "la", "las", "del", "inteligencia", "recursos", "hidraulicos", "tecnologias", "informacion"],
      it: ["cittadinanza", "lingue", "culture", "per", "il", "progettazione", "turismo", "mediazione", "linguistica", "sostenibile", "culturale", "naturalistico"],
    },
    minMarkers: 2,
  },
  locality: {
    named: true,
    reads: "where the searcher is (Search Console's country dimension), and a place named in a question that is not about going there",
    searcherCountry: true,
    slotTypes: ["country", "city"],
    contextNone: DESTINATION_CONTEXT,
  },
});

/**
 * Our own archived sibling pages that differ in exactly ONE path segment, per axis — the input to the sibling
 * collapse measurement. `segment` is the 0-based index of the varying path segment; `depth` the segment count.
 */
export const SIBLING_FAMILIES = Object.freeze({
  role: [{ host: "almicv.almiworld.com", prefix: "cv-guide", depth: 3, segment: 2, varies: "occupation, same country", include: (a, b) => !licensed(a) && !licensed(b) }],
  profession: [{ host: "almicv.almiworld.com", prefix: "cv-guide", depth: 3, segment: 2, varies: "occupation, same country, both read as licensed", include: (a, b) => licensed(a) && licensed(b) }],
  locality: [{ host: "almicv.almiworld.com", prefix: "cv-guide", depth: 3, segment: 1, varies: "country, same occupation" }],
  destination: [{ host: "almipte.almiworld.com", prefix: "pte-for", depth: 4, segment: 1, varies: "destination, same field and origin" }],
  origin: [
    { host: "almipte.almiworld.com", prefix: "pte-for", depth: 4, segment: 3, varies: "origin, same destination and field" },
    { host: "almipte.almiworld.com", prefix: "pte-for", depth: 3, segment: 2, varies: "origin, same destination" },
  ],
});

/** URL patterns in the page rows that show an axis HARD-CODED into the estate's URL space. */
export const HARD_CODED_PATTERNS = Object.freeze({
  origin: [/\/from-[a-z-]+(\/|$)/, /\/from\/[a-z-]+(\/|$)/],
  destination: [/\/pte-for\/[a-z-]+\/(?!from-)[a-z-]+/, /\/study-in-[a-z-]+\//, /\/requirements\/[a-z-]+\//, /\/toefl-for\/[a-z-]+\//],
  locality: [/\/cv-guide\/[a-z-]+(\/|$)/, /\/jobs\/[a-z-]+(\/|$)/, /\/salary\/[a-z-]+\//, /\/exams-in\/[a-z-]+/],
  role: [/\/cv-guide\/[a-z-]+\/[a-z-]+/, /\/jobs\/[a-z-]+\/[a-z-]+/, /\/salary\/[a-z-]+\/[a-z-]+/, /\/templates\/role\//],
  // the connected product that DECLARES this axis builds its pages as /<profession>/from-<origin>/<organisation>
  profession: [/^https:\/\/almioet\.almiworld\.com\/(?!register\/)[a-z-]+\/from-[a-z-]+/],
});
