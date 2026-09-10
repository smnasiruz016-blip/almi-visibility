/**
 * THE NIGHTLY QUOTE MATCH — the job the whole freshness model rests on.
 *
 * `FACT_CACHE_DESIGN.md` §3: re-checking the quote is a nightly machine job, and
 * it is what makes `FACT_FRESHNESS_DAYS = 180` enforceable instead of
 * decorative. When a span stops matching, that ONE record is flagged and a
 * person looks — a tiny queue, rather than re-researching everything.
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────
 *
 * 🔴 A PASSING QUOTE MATCH IS NOT A FACT CHECK. It establishes that this exact
 * string is on this page today. The string could be quoted out of context, or
 * contradicted three paragraphs further down. It is enormously more than a link
 * check and it is still not somebody having read the page. Nothing here ever
 * writes `factCheckedOn`.
 *
 * ── NORMALISATION, AND WHY IT IS KEPT DELIBERATELY THIN ─────────────────────
 *
 * Every normalisation step makes the match more forgiving, and a match that
 * forgives enough stops being able to fail. That is the failure mode to fear
 * here: a green nightly job that would go green against a page that had changed.
 *
 * So this normalises only what a RENDERING difference can legitimately change
 * and an EDITOR cannot:
 *
 *   - HTML tags, script and style bodies      (markup, not words)
 *   - character entities                       (&amp; is an encoding of "&")
 *   - curly quotes / dashes -> ASCII           (a CMS rewrites these silently)
 *   - runs of whitespace -> one space          (line wrapping is not content)
 *
 * It does NOT lowercase, does not strip punctuation, and does not stem. If the
 * regulator changes "at least half" to "at least 50%", THIS MUST GO RED — that
 * is the entire product.
 */

const ENTITIES = Object.freeze({
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
  "&nbsp;": " ", "&ndash;": "-", "&mdash;": "-", "&hellip;": "...",
  "&lsquo;": "'", "&rsquo;": "'", "&ldquo;": '"', "&rdquo;": '"',
  "&pound;": "£", "&euro;": "€", "&#39;": "'", "&#8217;": "'", "&#x27;": "'",
});

/** HTML in, comparable text out. Used on BOTH sides, so the two can never drift. */
export function normaliseText(input) {
  if (typeof input !== "string") return "";
  let t = input;
  t = t.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  t = t.replace(/<!--[\s\S]*?-->/g, " ");
  t = t.replace(/<[^>]+>/g, " ");
  for (const [entity, char] of Object.entries(ENTITIES)) t = t.split(entity).join(char);
  t = t.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
  // A CMS rewrites these on save; a person editing the meaning does not.
  t = t.replace(/[‘’‛′]/g, "'").replace(/[“”‟″]/g, '"');
  t = t.replace(/[‐-―−]/g, "-");
  t = t.replace(/ /g, " ");
  return t.replace(/\s+/g, " ").trim();
}

/**
 * Match ONE record's span against ONE fetched body.
 *
 * 🔴 THE REFUSAL COMES FIRST AND IT IS NOT NEGOTIABLE. A record whose licence
 * does not permit a stored quote has nothing lawful to match, and this returns
 * `not-applicable` WITHOUT LOOKING AT THE PAGE — not "could-not-check", because
 * a permanent could-not-check would report a lawful state as a broken source.
 */
export function matchQuote(record, fetched) {
  const id = record?.id ?? "(no id)";
  if (record?.sourceQuotable !== true) {
    return { id, outcome: "not-applicable", detail: "the licence does not permit a stored quote — nothing is attempted" };
  }
  const span = record?.evidence?.quotedSpan;
  if (typeof span !== "string" || span.trim() === "") {
    return { id, outcome: "could-not-check", detail: "the record is quotable but carries no quotedSpan" };
  }
  // A refusal is a COST, not an obstacle to route around. It gets its own
  // outcome and it is never softened into either of the other two.
  if (!fetched || fetched.ok !== true) {
    return { id, outcome: "could-not-check", detail: fetched?.detail ?? "the source could not be fetched" };
  }
  const haystack = normaliseText(fetched.body);
  const needle = normaliseText(span);
  if (needle === "") return { id, outcome: "could-not-check", detail: "the span normalised to nothing" };

  const occurrences = countOccurrences(haystack, needle);
  if (occurrences === 0) {
    return { id, outcome: "fail", occurrences, detail: "🔴 THE SPAN IS NO LONGER ON THE PAGE — a person must look at this record" };
  }
  return {
    id,
    outcome: "pass",
    occurrences,
    // 🔴 A PASS THAT PROVES LESS THAN IT LOOKS LIKE IT PROVES.
    //
    // Found by this job's first real run, against its own registry: the span
    // "on their own behalf" matched — and it matched because it is four common
    // words that happen to appear in the page's glossary as well as in the rule
    // it was supposed to evidence. It would have gone on matching after the rule
    // itself was deleted.
    //
    // A span that occurs more than once is not anchored to the sentence that
    // carries the value, so the nightly job cannot tell that sentence's removal
    // from a reshuffle. This is reported rather than failed — the span IS still
    // there and nothing has been shown to have changed — but it is exactly the
    // shape of a check that has quietly stopped being able to go red.
    ambiguous: occurrences > 1,
    detail:
      occurrences > 1
        ? `⚠️ span found ${occurrences} times — it is NOT anchored to one sentence, so this pass is weak evidence`
        : `span found once, verbatim, in ${haystack.length} chars of text`,
  };
}

function countOccurrences(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/**
 * Fetch one URL for the job. No spoofing, no proxy, no retry-until-it-works:
 * a source that declines automated access has declined it, and the answer is to
 * record the cost rather than route around the refusal.
 */
export async function fetchForMatch(url, { timeoutMs = 20_000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { redirect: "follow", signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status, detail: `HTTP ${res.status} — the source refused or moved` };
    return { ok: true, status: res.status, body: await res.text() };
  } catch (err) {
    // A timeout, a DNS failure and a broken TLS chain are all "could not
    // check". A1 met three of these in one afternoon.
    return { ok: false, status: null, detail: `fetch failed: ${err?.message ?? String(err)}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run the job over a set of records. Groups by URL so one page is fetched once
 * however many claims it carries — the NMC OET page alone carries two.
 */
export async function runQuoteMatch(records = [], { fetchImpl = fetch, now = new Date() } = {}) {
  const attempted = records.filter((r) => r?.sourceQuotable === true);
  const skipped = records.filter((r) => r?.sourceQuotable !== true).map((r) => matchQuote(r, null));

  const byUrl = new Map();
  for (const r of attempted) {
    const url = r?.source?.url;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(r);
  }

  const results = [];
  for (const [url, group] of byUrl) {
    const fetched = await fetchForMatch(url, { fetchImpl });
    for (const r of group) results.push({ ...matchQuote(r, fetched), url });
  }

  const all = [...results, ...skipped];
  const tally = { pass: 0, fail: 0, "could-not-check": 0, "not-applicable": 0 };
  for (const r of all) tally[r.outcome] += 1;
  const ambiguous = all.filter((r) => r.ambiguous === true);

  return {
    ranOn: now.toISOString().slice(0, 10),
    urlsFetched: byUrl.size,
    results: all,
    tally,
    // 🔴 Reported apart, always. A could-not-check is not a failure and must
    // never be added to one — a blocked source would then look broken.
    flaggedForAPerson: all.filter((r) => r.outcome === "fail"),
    inconclusive: all.filter((r) => r.outcome === "could-not-check"),
    // Reported as its own column, because a weak pass is not a failure and must
    // not be counted as one — but it must not disappear into the pass count
    // either. That is how a gate stops being able to go red without anybody
    // touching it.
    ambiguous,
  };
}
