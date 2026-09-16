/**
 * THE RENDERER — resolves claim ids into a page, and refuses to invent.
 *
 * ══ THE THREE THINGS IT WILL NOT DO ═══════════════════════════════════════
 *
 * 1. 🔴 IT WILL NOT RENDER A CLAIM THE REGISTRY DOES NOT HAVE. An unresolved id
 *    throws. The alternative — skipping it — produces a page that is quietly
 *    shorter than its author believed, which is the failure mode that lets a
 *    generator ship a thin page while its spec looks full.
 *
 * 2. 🔴 IT WILL NOT RENDER A QUOTE THAT MAY NOT BE USED TODAY. Every quote goes
 *    through `renderableQuote()`, which withdraws it when a licence's currency
 *    condition has lapsed. Reading `evidence.quotedSpan` directly is how an
 *    out-of-licence reproduction reaches a reader.
 *
 * 3. 🔴 IT WILL NOT RENDER A NON-ACTIVE RECORD. A `candidate` is a belief, a
 *    `lead` is a thing to go and check, and a `conflict` is two readings that
 *    disagree. None of the three may reach a reader.
 *
 * ══ AND EVERY FACT CARRIES ITS OWN ID INTO THE HTML ═══════════════════════
 *
 * `data-claim-id` on every rendered fact. So the page is not merely GENERATED
 * from the registry, it is TRACEABLE BACK to it by anybody reading the markup —
 * which is what §5A's "untraceable copies" is actually asking for. A fact on a
 * page you cannot trace to a record is a fact nobody will ever re-verify.
 */
import { renderableQuote, quoteUsableNow } from "../facts/freshness.mjs";
import { RENDERABLE_STATUSES } from "../facts/schema.mjs";
import { quotabilityState } from "../facts/licences.mjs";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Render one fact. Returns the HTML and a trace entry, always together — a
 * renderer that could emit HTML without a trace could emit an untraceable copy.
 */
export function renderFact(record, now = new Date()) {
  if (!RENDERABLE_STATUSES.includes(record?.life?.status)) {
    throw new Error(`${record?.id}: status "${record?.life?.status}" may not reach a reader`);
  }

  const quote = renderableQuote(record, now);
  const verdict = quoteUsableNow(record, now);
  const parts = [];

  parts.push(`<p class="claim">${esc(record.value.value)}</p>`);

  if (quote) {
    // Their words, lawfully, with the credit their licence requires.
    parts.push(`<blockquote class="source-wording"><p>${esc(quote.span)}</p>`);
    parts.push(`<cite>${esc(quote.attribution)}</cite></blockquote>`);
  } else if (record.evidence.ownWords) {
    // Our words, because theirs may not be held. The fact survives; the
    // expression is ours. This is the ordinary case, not a degraded one.
    parts.push(`<p class="in-our-words">${esc(record.evidence.ownWords)}</p>`);
  }

  const url = record.source.url;
  parts.push(
    `<p class="citation">Source: <a href="${esc(url)}" rel="nofollow noopener">${esc(record.source.label)}</a>` +
      ` — ${esc(record.source.publisher)}. Checked ${esc(record.checks.linkCheckedOn ?? "not checked")}.</p>`,
  );

  return {
    html: `<div class="fact" data-claim-id="${esc(record.id)}">\n  ${parts.join("\n  ")}\n</div>`,
    trace: {
      claimId: record.id,
      subject: record.claim.subject,
      sourceUrl: url,
      tier: record.source.tier,
      licence: record.licence,
      quotabilityState: quotabilityState(record.licence, record._productId),
      renderedQuote: Boolean(quote),
      quoteWithheld: !quote && record.sourceQuotable === true && Boolean(record.evidence.quotedSpan),
      quoteVerdict: verdict.reason,
      lastMachineCheck: record.checks.quoteMatchedOn ?? record.checks.fingerprintCheckedOn ?? record.checks.linkCheckedOn,
    },
  };
}

/**
 * Render the whole page from its spec plus the registry.
 *
 * Returns the HTML and a full trace. **The trace is not a debugging aid** — it
 * is the evidence that every claim on the page came from a record, and it is
 * what the tests assert against.
 */
export function renderPage(spec, records, now = new Date()) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const trace = [];
  const missing = [];
  const out = [];

  out.push(`<article class="variant" data-variant="${esc(spec.variant)}">`);
  out.push(`<h1>${esc(spec.title)}</h1>`);
  out.push(`<p class="intro">${esc(spec.intro)}</p>`);

  for (const section of spec.sections) {
    out.push(`<section>`);
    out.push(`<h2>${esc(section.heading)}</h2>`);
    if (section.framing) out.push(`<p class="framing">${esc(section.framing)}</p>`);
    for (const id of section.claims) {
      const rec = byId.get(id);
      if (!rec) {
        missing.push(id);
        continue;
      }
      const { html, trace: t } = renderFact(rec, now);
      out.push(html);
      trace.push({ ...t, section: section.heading });
    }
    out.push(`</section>`);
  }
  // The link that replaces an extracted shared block. Counted as page text like
  // anything else — it is words, it is identical on all twelve, and pretending
  // otherwise would flatter exactly the measurement it appears in.
  if (spec.trailer) out.push(`<p class="see-also">${esc(spec.trailer)}</p>`);
  out.push(`</article>`);

  // 🔴 Thrown, never warned. See the header.
  if (missing.length) {
    throw new Error(`the spec references ${missing.length} claim(s) the registry does not have: ${missing.join(", ")}`);
  }

  return { html: out.join("\n"), trace };
}

/**
 * 🔴 THE PROOF THAT THE PAGE HOLDS NO INDEPENDENT COPY.
 *
 * §5A forbids "independent untraceable copies of the same factual claim". This
 * checks the spec source text for any sentence that also appears in a record —
 * which is what a copy would look like: a fact written into the template as well
 * as held in the registry, so that fixing the record fixes only one of them.
 *
 * ⚠️ It is a SUBSTRING check over the spec's own framing text, and it is honest
 * about that: it catches a copied sentence, not a paraphrase. A paraphrase in
 * the framing is caught by the rule above it — the moment framing needs a
 * citation it belongs in the registry — which is a review rule, not a machine
 * one, and is recorded as such rather than pretended away.
 */
/** The three answers. A field is COPIED, or CLEAN, or the detector could not judge it. */
export const COPY_STATES = Object.freeze(["COPIED", "CLEAN", "NOT_TESTED"]);

/** The probe length this detector has always used. Detection is UNCHANGED by the third state. */
const PROBE = 60;
/**
 * Below this, a span is too short for substring matching to mean anything — the trap recorded
 * in FACT_CACHE_DESIGN.md §8.6, where four common words matched a glossary entry. The number is
 * NOT a distinctiveness threshold and must not be treated as one: the same measurement found the
 * other weak pass at 190 characters, so length does not predict anchoring (n=17). It marks only
 * where this detector stops claiming to know.
 */
const TOO_SHORT = 40;

/* ── THE MEASURED REASONS, so a future reader sees evidence and not an opinion ─────────────── */
const WHY = Object.freeze({
  number:
    "a number cannot be judged by substring matching: measured false positives — 10000 is found inside " +
    "110000 and inside 2100009 — and measured representation misses: a grouped, currency-prefixed, " +
    "space-grouped or spelled-out form of the same number is not the same string",
  boolean:
    'a boolean renders as "true" or "false", which are ordinary language: substring matching would ' +
    "report any framing containing the word as a copy of the value",
  otherType: (t) => `a ${t} value has no proved-safe textual form to match against the framing`,
  tooShort:
    `under ${TOO_SHORT} characters there is no proved-safe method: a short common phrase matches ` +
    "trivially (FACT_CACHE_DESIGN.md §8.6), and length is not a proxy for anchoring, so a longer " +
    "floor would not fix it either",
  tail:
    `first ${PROBE} characters checked and clean; the tail beyond character ${PROBE} is NOT checked ` +
    "by any proved-safe method, so this value is not clean — it is unjudged",
});

/**
 * 🔴 THREE ANSWERS, BECAUSE TWO SILENTLY HID THE THING THIS CHECK EXISTS TO FIND.
 *
 * This function used to `continue` past every value it could not judge. A skip with no record is
 * indistinguishable from a clean result to everything downstream — so the §5A guarantee read
 * "no copied facts" while, of the first product's 46 values, 13 (12 numbers and 1 boolean) and 5
 * strings under 40 characters were never examined at all, and the probe read only the first 60
 * characters of the rest. Measured 16 September 2026: 27 of 27 ownWords and 17 of 18 quotedSpans
 * exceed 60 characters, so the unexamined tail was the LARGER escape, and it sat inside fields
 * that were reported clean.
 *
 * 🔴 LAW-ABSENT-1: THE ABSENCE OF A DETECTABLE COPY IS NOT EVIDENCE THAT NOTHING WAS COPIED.
 *    NOT_TESTED is never counted as CLEAN and never counted as COPIED.
 *
 * 🔴 CLEAN NOW MEANS FULLY CHECKED. A value whose probe was clean but whose tail was never read is
 *    NOT_TESTED. The clean count collapses when you do this, and that is the measurement becoming
 *    honest rather than a regression.
 *
 * 🔴 DETECTION IS UNCHANGED. The same probe finds the same copies it always did. A fixed-window
 *    method was measured and REJECTED on 16 September: it reported a 40-character run of shared
 *    editorial boilerplate as COPIED, and a false COPIED is a §5A refusal of a legitimate page.
 *    Widening the probe is the opposite of a fix — a longer needle matches strictly less often.
 *
 * @returns {{copied: Array, clean: Array, notTested: Array}} every present field, accounted for
 */
export function findCopiedFacts(spec, records) {
  const framingText = [spec.intro, ...spec.sections.map((s) => `${s.heading} ${s.framing ?? ""}`)].join(" ");
  const copied = [];
  const clean = [];
  const notTested = [];

  for (const r of records) {
    for (const [field, text] of [["value", r.value?.value], ["ownWords", r.evidence?.ownWords], ["quotedSpan", r.evidence?.quotedSpan]]) {
      if (text === undefined || text === null) continue; // absent: there is nothing to copy

      const declare = (reason) => notTested.push({ claimId: r.id, field, reason });

      if (typeof text !== "string") {
        if (typeof text === "number") declare(WHY.number);
        else if (typeof text === "boolean") declare(WHY.boolean);
        else declare(WHY.otherType(typeof text));
        continue;
      }
      if (text.length < TOO_SHORT) { declare(WHY.tooShort); continue; }

      // Compare on a distinctive run rather than the whole string, so a copy that
      // was lightly trimmed still trips it.
      const probe = text.slice(0, PROBE);
      if (framingText.includes(probe)) { copied.push({ claimId: r.id, field, probe }); continue; }

      // 🔴 A PARTIALLY CHECKED VALUE IS NOT CLEAN. The probe covers the whole value only when the
      // value is no longer than the probe; beyond that the tail was never read.
      if (text.length <= PROBE) clean.push({ claimId: r.id, field });
      else declare(WHY.tail);
    }
  }

  return { copied, clean, notTested };
}
