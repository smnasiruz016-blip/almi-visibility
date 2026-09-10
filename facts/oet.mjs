/**
 * OET — AND THIS FILE EXISTS TO CARRY ONE RECORD AND ONE PROOF.
 *
 * ══ THE CASE THAT SPLIT `sourceMachineReadable` FROM `sourceQuotable` ═══════
 *
 * Every barrier A1 found was technical: a 403, a scanned PDF, an HTTP 500, a
 * broken TLS chain. Each of them stops a machine from READING a page, and the
 * design's single field `sourceMachineReadable` described all four correctly.
 *
 * OET IS NONE OF THEM. IT SERVES 200. THERE IS NO 403.
 *
 * (And an entry in our own records claiming oet.com 403s an automated fetch was
 * re-probed on 2026-09-10 and is WRONG — it returns 200. The technical claim
 * was out of date. The legal claim below is unaffected and still binding.)
 *
 * The barrier is the licence. OET's Intellectual Property policy prohibits
 * redistribution or reproduction of its Content and prohibits storing that
 * Content in any other form of electronic retrieval system.
 *
 *   🔴 A FACT CACHE HOLDING `quotedSpan` IS AN ELECTRONIC RETRIEVAL SYSTEM
 *      HOLDING A REPRODUCTION OF THEIR WORDING.
 *
 * So: a source a machine can read perfectly and may not quote. One field could
 * not express that, and the two independent fields exist because of this file.
 *
 * ══ AND THE CONSEQUENCE IS NOT COSMETIC ════════════════════════════════════
 *
 * THE NIGHTLY QUOTE MATCH — the mechanism the entire freshness model rests on —
 * CANNOT RUN AGAINST THE SINGLE MOST IMPORTANT SOURCE IN THE PRODUCT. Not
 * because it is blocked, but because there is lawfully nothing to match
 * against. Freshness here is a person re-reading the page, at exactly the cost
 * of a 403.
 *
 * ⚠️ `quoteMatchOutcome` IS `"not-applicable"`, NOT `"could-not-check"`, AND THE
 * DIFFERENCE IS THE POINT. A permanent "could not check" would report a lawful
 * state as a broken source — and six months later somebody would "fix" it.
 *
 * ══ NO WORKAROUND IS PROPOSED ══════════════════════════════════════════════
 *
 * The answer to a licence is the same as the answer to a 403: RECORD THE COST,
 * DO NOT ROUTE AROUND THE REFUSAL. No paraphrase-that-is-really-a-quote, no
 * storing the span "just for matching", no third-party mirror.
 *
 * ══ WHAT IS DELIBERATELY ABSENT ════════════════════════════════════════════
 *
 * 🔴 The four Block A claims the profession-page inventory says `/nursing`
 * needs — the nursing writing task type, the nursing speaking role-play
 * setting, which subtests are profession-specific, and the 0–500 grade bands —
 * ARE NOT HERE. They have not been acquired. Writing plausible values for them
 * from general knowledge would be the exact failure this registry exists to
 * prevent, and a registry that quietly invents its most important facts is
 * worse than an empty one. They are reported as a NAMED GAP by
 * `bin/facts.mjs census`, so their absence is counted rather than forgotten.
 */
import { fact } from "../src/facts/record.mjs";

export default [
  fact({
    id: "oet.content-licence-permits-stored-quotation",
    claim: { subject: "oet", predicate: "content-licence-permits-stored-quotation", qualifier: null },
    scope: "shared",
    value: { value: false, valueType: "boolean-with-consequence", unit: null },
    source: {
      url: "https://oet.com/en-us/Intellectual-Property-policy",
      label: "OET — Intellectual Property policy",
      publisher: "Cambridge Boxhill Language Assessment (OET)",
      tier: 1,
      documentRef: "OET Intellectual Property policy",
    },
    sourceMachineReadable: true,
    sourceMachineReadableBasis:
      "HTTP 200 on 2026-09-10 for oet.com/, /en-us/about, /en-us/Intellectual-Property-policy and /robots.txt. It is NOT a 403 — an earlier record of ours saying otherwise was wrong and is corrected.",
    sourceQuotable: false,
    sourceQuotableBasis:
      "EXPRESS PROHIBITION. The OET Intellectual Property policy forbids redistribution or reproduction of the Content in any form, and forbids storing the Content in any other form of electronic retrieval system. A fact cache holding a quotedSpan is such a system. Read 2026-09-10.",
    evidence: {
      ownWords:
        "OET's own intellectual property terms do not permit its wording to be reproduced or stored in a retrieval system. Facts sourced from OET are therefore recorded in our own words with a URL and a date, no verbatim extract is kept, and their freshness is a person re-reading the page rather than an automated match.",
    },
    queue: "MANUAL",
    freshness: { rule: "human-re-read", days: 180 },
    checks: { linkCheckedOn: "2026-09-10", linkCheckOutcome: "pass", quoteMatchedOn: null, quoteMatchOutcome: "not-applicable" },
    life: { status: "active", firstSeenOn: "2026-09-10", extractedOn: "2026-09-10" },
    provenance: {
      route: "R3",
      acquiredBy: "model:claude-opus-5",
      note: "The licence itself, read from the policy page. No span stored — storing one would be the very act the policy forbids.",
    },
  }),
];
