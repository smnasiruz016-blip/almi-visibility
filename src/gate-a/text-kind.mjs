/**
 * PROSE vs TABULAR — splitting `uniqueWords` by what KIND of text it is.
 *
 * ── 🔴 THE HOLE THIS EXISTS TO MEASURE ──────────────────────────────────────
 *
 * Gate A run 01 rejected nine of twelve professions at `uniqueWords >= 350` and
 * passed three. The cause was found in the source data: `meta.roleCounts` — how
 * many recognising organisations OET lists per profession.
 *
 *     nursing 469 · medicine 297 · pharmacy 70 || 56 · 56 · 47 · 46 · 44 · 40 …
 *                                   ^^ the cut falls between 70 and 56 ^^
 *
 * Nothing about the page changed. Only how many ROWS its list has. So:
 *
 *     `uniqueWords >= 350` CAN BE SATISFIED BY A DATA TABLE.
 *
 * On THIS corpus the overlap check caught those pages anyway — but that was this
 * dataset's luck, not the gate's doing. A page whose table genuinely differed
 * from its siblings' would pass BOTH checks and still be a data dump.
 *
 * ── ⚠️ THIS IS A MEASUREMENT, NOT A GATE ────────────────────────────────────
 *
 * Nothing here has a threshold and nothing here fails a page. The owner's ruling:
 * see the distribution first, set a bar afterwards — and RULE EIGHT applies to a
 * threshold invented today just as much as to one invented last week. `runGateA`
 * does not import this file.
 *
 * ── HOW THE SPLIT IS MADE, AND WHY THIS WAY ─────────────────────────────────
 *
 * By the MARKUP, not by the words. A token's kind is decided by its NEAREST
 * enclosing element from a fixed list. That is not a heuristic about content —
 * it is what the page's author declared the text to be:
 *
 *     LIST      li · td · dd            "one item among many of the same shape"
 *     PROSE     p · blockquote          "a paragraph of argument"
 *     HEADING   h1-h6 · dt · th · caption · summary · legend · figcaption
 *     OTHER     anything else           no structural signal at all
 *
 * 🔴 OTHER IS NOT A DUMPING GROUND, IT IS AN HONESTY BUCKET. Text sitting in a
 * bare `div`, `span` or `a` — navigation, buttons, footer links, stray strings —
 * declares nothing about itself. Assigning it to prose would flatter the page and
 * assigning it to list would flatter the gate. It is counted and reported
 * separately so the reader can see how much of the page has no structure at all.
 *
 * HEADINGS ARE THEIR OWN BUCKET for the same reason: twenty-one `<h2>`s of three
 * words each are labels, not the page's argument — but they are not table rows
 * either, and folding them into either side would misstate the number.
 *
 * ── AND IT IS A DECOMPOSITION, NOT A NEW MEASUREMENT ────────────────────────
 *
 * The four counts SUM EXACTLY to the `uniqueWords` the gate already reports. The
 * shell is computed over all tokens exactly as before and subtracted exactly as
 * before; only the surviving occurrences are then labelled. So this cannot
 * disagree with the gate — it can only say what the gate's own number is made of.
 * A test asserts the sum.
 */

/** Elements that never have children, so they never open a scope. */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Elements whose CONTENT is not page text at all. */
const NON_TEXT_TAGS = new Set(["script", "style", "noscript", "template", "svg"]);

/** 🔴 The classification. Nearest enclosing element wins. */
const KIND_OF_TAG = new Map([
  ["li", "list"], ["td", "list"], ["dd", "list"],
  ["p", "prose"], ["blockquote", "prose"],
  ["h1", "heading"], ["h2", "heading"], ["h3", "heading"],
  ["h4", "heading"], ["h5", "heading"], ["h6", "heading"],
  ["dt", "heading"], ["th", "heading"], ["caption", "heading"],
  ["summary", "heading"], ["legend", "heading"], ["figcaption", "heading"],
]);

export const KINDS = ["prose", "list", "heading", "other"];

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&ndash;": "-", "&mdash;": "-", "&hellip;": "...",
};

function decode(s) {
  let out = s;
  for (const [ent, ch] of Object.entries(ENTITIES)) out = out.split(ent).join(ch);
  return out.replace(/&#\d+;/g, " ");
}

/** Same normalisation as tokens.mjs — deliberately, so the counts stay comparable. */
function tokeniseRun(text) {
  return decode(text)
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, ""))
    .filter((t) => t.length > 0);
}

/**
 * Rendered HTML -> ordered tokens, each carrying the kind of text it sat in.
 *
 * The token ORDER is identical to `tokensOf` in tokens.mjs. That is what lets the
 * shell subtraction be replayed against this list and stay in step.
 *
 * @returns {{ tokens: string[], kinds: string[] }}
 */
export function tokensWithKind(html) {
  const s = String(html ?? "").replace(/<!--[\s\S]*?-->/g, " ");
  const tokens = [];
  const kinds = [];

  /** Stack of open elements that CARRY a kind, innermost last. */
  const scope = [];
  /** Depth of non-text elements we are inside; > 0 means discard text. */
  let muted = 0;
  let i = 0;

  const currentKind = () => (scope.length ? scope[scope.length - 1].kind : "other");

  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt === -1) {
      if (muted === 0) for (const t of tokeniseRun(s.slice(i))) { tokens.push(t); kinds.push(currentKind()); }
      break;
    }
    if (lt > i && muted === 0) {
      for (const t of tokeniseRun(s.slice(i, lt))) { tokens.push(t); kinds.push(currentKind()); }
    }
    const gt = s.indexOf(">", lt);
    if (gt === -1) break;

    const raw = s.slice(lt + 1, gt);
    const closing = raw.startsWith("/");
    const selfClosing = raw.endsWith("/");
    const nameMatch = /^\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(raw);
    const name = nameMatch ? nameMatch[1].toLowerCase() : null;
    i = gt + 1;
    if (!name) continue;

    if (NON_TEXT_TAGS.has(name)) {
      if (closing) muted = Math.max(0, muted - 1);
      else if (!selfClosing && !VOID_ELEMENTS.has(name)) muted++;
      continue;
    }
    if (VOID_ELEMENTS.has(name) || selfClosing) continue;

    if (closing) {
      // Close back to the matching open tag. Unbalanced markup must not corrupt
      // every token after it, so an unmatched close is ignored rather than
      // popping something it did not open.
      for (let k = scope.length - 1; k >= 0; k--) {
        if (scope[k].tag === name) { scope.length = k; break; }
      }
    } else if (KIND_OF_TAG.has(name)) {
      scope.push({ tag: name, kind: KIND_OF_TAG.get(name) });
    }
  }

  return { tokens, kinds };
}

/**
 * Replay the shell subtraction, keeping each surviving occurrence's kind.
 *
 * Identical rule to `residualTokens` in shell.mjs — walk in page order, spend the
 * shell's budget for a token, and keep what is left over. Same order, same
 * budget, same result; this one just carries the label along.
 *
 * @returns {{ counts: Record<string, number>, total: number, residualKinds: string[] }}
 */
export function uniqueWordsByKind(tokens, kinds, shell) {
  const budget = new Map(shell);
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const residualKinds = [];

  for (let n = 0; n < tokens.length; n++) {
    const left = budget.get(tokens[n]) ?? 0;
    if (left > 0) { budget.set(tokens[n], left - 1); continue; }
    const kind = KINDS.includes(kinds[n]) ? kinds[n] : "other";
    counts[kind]++;
    residualKinds.push(kind);
  }

  return { counts, total: residualKinds.length, residualKinds };
}
