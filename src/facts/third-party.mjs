/**
 * THIRD-PARTY RIGHTS — AND THE QUESTION HAD THE WRONG SHAPE.
 *
 * ══ THE OWNER'S RULING, 2026-09-10 ════════════════════════════════════════
 *
 *   WRONG QUESTION:  "is there a third-party notice anywhere on this page?"
 *   RIGHT QUESTION:  "THE TEXT I AM ABOUT TO STORE — is IT a third party's?"
 *
 * The first version asked the big question, and the Immigration New Zealand page
 * showed what that costs: it carries `Crown copyright` in its footer AND a
 * separate `© 2026 Cookie Information` from a consent widget. The scan reported
 * `clear: false`, which was **correct as an observation and useless as a
 * decision** — a cookie banner in the page furniture had acquired a veto over a
 * fact taken from the article body.
 *
 * ══ AND THE NARROWING IS STRUCTURAL, NEVER AN OPINION ═════════════════════
 *
 * 🔴 THIS FILE DOES NOT KNOW WHAT "COOKIE INFORMATION" IS, AND MUST NOT.
 * Recognising a vendor by name and deciding what its notice covers would be a
 * judgement about somebody's rights made by pattern-matching a brand — the exact
 * move this project refuses everywhere else. So the decision rests on ONE thing
 * the author of the page has already declared, in their own markup:
 *
 *   IS THE NOTICE IN THE SAME CONTENT REGION AS THE TEXT I AM STORING?
 *
 *   notice in a footer / nav / aside, span from <main>   →  NO CONFLICT
 *   notice INSIDE the region the span came from          →  🔴 REAL CONFLICT
 *
 * A page that puts a copyright line inside its own article body is telling us
 * something about that article. A page that puts one in a consent widget is
 * telling us about the widget. We do not have to interpret either; we only have
 * to read where they are.
 *
 * ⚠️ AND THE WHOLE-PAGE OBSERVATION IS NOT DELETED. `clear: false` stays on the
 * record. What changed is what it is allowed to DECIDE — because an observation
 * that quietly became a veto is how a check ends up switched off.
 */

/** Elements whose contents are page furniture rather than the document's body. */
const CHROME_TAGS = ["footer", "nav", "aside", "header"];
/** Elements an author uses to mark the document's own body. */
const REGION_TAGS = ["main", "article"];

/**
 * Cut out every `<tag>…</tag>` subtree, honouring nesting.
 *
 * Deliberately a small hand-rolled scanner rather than a parser dependency: this
 * repo has zero dependencies on purpose, and the job is narrow enough to be read
 * in full by whoever has to trust it.
 */
export function stripSubtrees(html, tags = CHROME_TAGS) {
  let out = html;
  for (const tag of tags) {
    const open = new RegExp(`<${tag}\\b[^>]*>`, "i");
    for (;;) {
      const m = open.exec(out);
      if (!m) break;
      let i = m.index + m[0].length;
      let depth = 1;
      const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
      scan.lastIndex = i;
      let end = out.length;
      for (;;) {
        const t = scan.exec(out);
        if (!t) break;
        depth += t[1] === "/" ? -1 : 1;
        if (depth === 0) {
          end = t.index + t[0].length;
          break;
        }
      }
      out = out.slice(0, m.index) + " " + out.slice(end);
    }
  }
  return out;
}

/** Every `<main>` / `<article>` subtree, outermost first. Empty when the page has none. */
export function contentRegions(html) {
  const regions = [];
  for (const tag of REGION_TAGS) {
    const open = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    let m;
    while ((m = open.exec(html)) !== null) {
      const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
      scan.lastIndex = m.index + m[0].length;
      let depth = 1;
      let end = html.length;
      for (;;) {
        const t = scan.exec(html);
        if (!t) break;
        depth += t[1] === "/" ? -1 : 1;
        if (depth === 0) {
          end = t.index + t[0].length;
          break;
        }
      }
      regions.push({ tag, html: html.slice(m.index, end) });
      open.lastIndex = end;
    }
  }
  return regions;
}

/** Copyright notices in a piece of HTML, as text. */
export function noticesIn(html, normalise) {
  const text = normalise(html);
  return [...text.matchAll(/©[^.©]{0,80}/g)].map((m) => m[0].trim());
}

/**
 * 🔴 THE DECISION. Does storing THIS SPAN from THIS PAGE conflict with a
 * third party's notice?
 *
 * @param {string} html      the page as fetched
 * @param {string} span      the text about to be stored
 * @param {(s: string) => string} normalise  the SAME normaliser the quote match
 *        uses, passed in rather than imported, so the two can never drift and so
 *        this module stays free of a cycle.
 * @param {(n: string) => boolean} isOwnPublisher  which notices belong to the
 *        publisher we are already citing (e.g. Crown copyright on a gov.uk page)
 */
export function thirdPartyConflictForSpan(html, span, normalise, isOwnPublisher = () => false) {
  const wholePage = noticesIn(html, normalise);
  const foreignOnPage = wholePage.filter((n) => !isOwnPublisher(n));

  const needle = normalise(span);
  if (needle === "") {
    return { conflict: false, reason: "no span to place", wholePageNotices: wholePage, foreignOnPage, region: null, regionNotices: [] };
  }

  // Which content region does the span actually live in?
  const regions = contentRegions(html);
  const candidates = regions.length > 0 ? regions : [{ tag: "body", html }];
  const holder = candidates.find((r) => normalise(r.html).includes(needle)) ?? null;

  if (!holder) {
    // 🔴 The span is not in any content region — it may be in the chrome itself.
    // That is NOT a pass. We do not know what we would be storing, so we refuse.
    return {
      conflict: true,
      reason: "the span was not found in any content region of this page — it may be page furniture, and we will not store what we cannot place",
      wholePageNotices: wholePage,
      foreignOnPage,
      region: null,
      regionNotices: [],
    };
  }

  // Inside that region, page furniture is still page furniture.
  const bodyOnly = stripSubtrees(holder.html, CHROME_TAGS);
  const regionNotices = noticesIn(bodyOnly, normalise).filter((n) => !isOwnPublisher(n));

  return {
    conflict: regionNotices.length > 0,
    reason:
      regionNotices.length > 0
        ? `🔴 ${regionNotices.length} third-party notice(s) INSIDE the <${holder.tag}> the span came from — this one really does bite`
        : `no third-party notice inside the <${holder.tag}> the span came from` +
          (foreignOnPage.length > 0
            ? `; ${foreignOnPage.length} elsewhere on the page (furniture), which does not decide anything`
            : ""),
    // Kept, always. The observation survives even when it decides nothing.
    wholePageNotices: wholePage,
    foreignOnPage,
    region: holder.tag,
    regionNotices,
  };
}
