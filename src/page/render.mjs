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
      quotabilityState: quotabilityState(record.licence),
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

  out.push(`<article class="profession" data-profession="${esc(spec.profession)}">`);
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
export function findCopiedFacts(spec, records) {
  const framingText = [spec.intro, ...spec.sections.map((s) => `${s.heading} ${s.framing ?? ""}`)].join(" ");
  const copies = [];
  for (const r of records) {
    for (const [field, text] of [["value", r.value?.value], ["ownWords", r.evidence?.ownWords], ["quotedSpan", r.evidence?.quotedSpan]]) {
      if (typeof text !== "string" || text.length < 40) continue;
      // Compare on a distinctive run rather than the whole string, so a copy that
      // was lightly trimmed still trips it.
      const probe = text.slice(0, 60);
      if (framingText.includes(probe)) copies.push({ claimId: r.id, field, probe });
    }
  }
  return copies;
}
