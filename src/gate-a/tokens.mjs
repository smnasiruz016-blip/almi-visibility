/**
 * FROM RENDERED HTML TO THE TOKEN MULTISET GATE A COUNTS.
 *
 * 🔴 RENDERED, AS SERVED — NEVER THE SOURCE, NEVER THE TEMPLATE. GAP-055 is the
 * standing reason and it is not a slogan: a page there declared
 * `export const revalidate = false` and the deployment served
 * `Cache-Control: private, no-store` on 240,327 URLs. What the source says and
 * what a reader receives are two different things, and Gate A judges the second.
 *
 * ⚠️ A MULTISET, NOT A SET. Counts are kept. A word that appears four times in
 * the shell and five times on this page contributes ONE unique occurrence here —
 * not zero, which a set would give, and not five, which ignoring the shell would
 * give.
 */

/** Tags whose CONTENT is not page text. Their inner text is removed entirely. */
const NON_TEXT_TAGS = ["script", "style", "noscript", "template", "svg"];

const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&ndash;": "-", "&mdash;": "-", "&hellip;": "...",
};

/** Rendered HTML -> visible text. */
export function textOf(html) {
  let s = String(html ?? "");
  for (const tag of NON_TEXT_TAGS) {
    s = s.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  for (const [ent, ch] of Object.entries(ENTITIES)) s = s.split(ent).join(ch);
  s = s.replace(/&#\d+;/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Visible text -> ordered token list.
 *
 * Normalisation is deliberately conservative: lowercase, split on whitespace,
 * and strip punctuation only at the EDGES of a token. Word-internal punctuation
 * survives, because "nurse's" and "b2" and "sitemap-index" are single words and
 * splitting them would inflate every count in the same direction on every page.
 */
export function tokenise(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, ""))
    .filter((t) => t.length > 0);
}

/** Rendered HTML -> ordered token list. The two steps above, in order. */
export function tokensOf(html) {
  return tokenise(textOf(html));
}

/** Ordered tokens -> Map<token, count>. The multiset. */
export function counts(tokens) {
  const m = new Map();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/** Total size of a multiset — the number of token OCCURRENCES, not distinct words. */
export function multisetSize(m) {
  let n = 0;
  for (const c of m.values()) n += c;
  return n;
}
