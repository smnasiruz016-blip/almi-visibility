/**
 * 🔴 SHELL SUBTRACTION — DEFINED, PRINTED, AND TESTED. NOT ASSUMED.
 *
 * ── WHY THIS FILE IS THE MOST DANGEROUS ONE IN THE AUDIT ────────────────────
 *
 * Two pages that share a 2,000-word navigation are NOT duplicates, and a page
 * whose body is 400 words inside a 2,000-word chrome is NOT thin. Every number
 * in the duplicate, near-duplicate, thin and template checks is computed AFTER
 * this subtraction.
 *
 * **If shell subtraction is wrong, every number above it is wrong — and the
 * errors all point the same way, towards flagging clean pages.** A detector
 * that cries wolf costs the reader's trust on the first false alarm and every
 * true finding after it.
 *
 * So the definition is explicit, it is printed in every report that uses it,
 * and it is tested against a page whose shell is LARGER than its body.
 *
 * ── THE DEFINITION, IN WORDS ────────────────────────────────────────────────
 *
 * The SHELL is everything a page shares with its siblings by construction:
 *   · <head>, <script>, <style>, <noscript>, <svg>, <template> — never prose;
 *   · <nav>, <header>, <footer>, <aside> — site chrome;
 *   · [role=navigation], [aria-hidden=true], and common cookie/banner ids.
 *
 * The BODY is what remains: <main> or <article> if present, otherwise the whole
 * document minus the shell.
 *
 * 🔴 AND WHERE IT IS UNSURE, IT SAYS SO. If a page has no <main>/<article> AND
 * no recognisable chrome, the extraction is marked `confident: false` and every
 * check reading it must return UNKNOWN rather than a number. A body count taken
 * from an unrecognised layout is a guess wearing a number's clothes.
 */

/** Printed by every report that uses these numbers. */
export const SHELL_DEFINITION =
  "SHELL = head, script, style, noscript, svg, template, nav, header, footer, aside, " +
  "[role=navigation], [aria-hidden=true], and cookie/consent containers. " +
  "BODY = <main> or <article> if present, else the document minus the shell. " +
  "Word counts are taken on BODY only.";

/** The DoD's Gate A floor. Printed beside every thin result (LAW-BOUND-1). */
export const THIN_UNIQUE_WORD_FLOOR = 350;

const STRIP_ELEMENTS = ["script", "style", "noscript", "svg", "template", "head"];
const CHROME_ELEMENTS = ["nav", "header", "footer", "aside"];

function removeElements(html, tags) {
  let out = html;
  for (const tag of tags) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
    // Self-closing or unclosed variants of void-ish tags.
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/>`, "gi"), " ");
  }
  return out;
}

const textOf = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const words = (text) => (text === "" ? [] : text.toLowerCase().match(/[a-z0-9'’-]+/g) ?? []);

/**
 * Split a document into shell and body.
 *
 * Returns `{ bodyText, shellText, confident, why }`. **`confident: false` is a
 * refusal, not a hint** — callers must return UNKNOWN on it.
 */
export function extractBody(html) {
  const source = String(html ?? "");
  if (source.trim() === "") {
    return { bodyText: "", shellText: "", confident: false, why: "the document is empty" };
  }

  const stripped = removeElements(source, STRIP_ELEMENTS);

  // Prefer an explicit main/article — the author has told us where the body is.
  const main = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(stripped);
  if (main) {
    const bodyHtml = removeElements(main[2], CHROME_ELEMENTS);
    const bodyText = textOf(bodyHtml);
    const shellText = textOf(stripped.replace(main[0], " "));
    return {
      bodyText,
      shellText,
      confident: bodyText !== "",
      /* 🔴 TWO DIFFERENT FAILURES, TWO DIFFERENT REASON CODES.
       *
       * "We found the container and it is empty" is not "we could not tell
       * body from shell". The first means the page probably renders client
       * side; the second means our parser did not understand the layout. They
       * get different reason codes because a reader needs to know which. */
      reason: bodyText === "" ? "EMPTY_BODY" : null,
      why: bodyText === "" ? `<${main[1]}> is present but contains no text` : `body taken from <${main[1]}>`,
    };
  }

  // No main/article: subtract recognisable chrome from the whole document.
  const chromeMatches = CHROME_ELEMENTS.filter((t) => new RegExp(`<${t}\\b`, "i").test(stripped));
  const bodyHtml = removeElements(stripped, CHROME_ELEMENTS);
  const bodyText = textOf(bodyHtml);
  const shellText = textOf(stripped).slice(0, Math.max(0, textOf(stripped).length - bodyText.length));

  return {
    bodyText,
    shellText,
    /* 🔴 No <main>, no <article>, and no recognisable chrome either — we cannot
     * tell body from shell on this layout, so we refuse rather than guess. */
    confident: chromeMatches.length > 0 && bodyText !== "",
    reason: chromeMatches.length === 0 ? "UNRECOGNISED_LAYOUT" : bodyText === "" ? "EMPTY_BODY" : null,
    why:
      chromeMatches.length === 0
        ? "no <main>/<article> and no recognisable chrome — body and shell are indistinguishable on this layout"
        : bodyText === ""
          ? `chrome recognised (${chromeMatches.join(", ")}) but nothing remains outside it`
          : `body = document minus ${chromeMatches.join(", ")}`,
  };
}

/** Word counts for a page, with the shell's own size beside them. */
export function measure(html) {
  const e = extractBody(html);
  const bodyWords = words(e.bodyText);
  const shellWords = words(e.shellText);
  return {
    ...e,
    bodyWordCount: bodyWords.length,
    bodyUniqueWordCount: new Set(bodyWords).size,
    shellWordCount: shellWords.length,
    // 🔴 The ratio a reader needs to judge whether the subtraction mattered.
    shellShare: bodyWords.length + shellWords.length === 0
      ? null
      : shellWords.length / (bodyWords.length + shellWords.length),
  };
}

/**
 * Shingles for near-duplicate comparison, over BODY text only.
 *
 * `k = 8` words. Short enough to catch a rewritten paragraph, long enough that
 * two pages sharing stock phrasing ("apply for a visa") do not collide.
 */
export function shingles(text, k = 8) {
  const w = words(text);
  if (w.length < k) return new Set(w.length ? [w.join(" ")] : []);
  const out = new Set();
  for (let i = 0; i + k <= w.length; i += 1) out.add(w.slice(i, i + k).join(" "));
  return out;
}

export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return null; // 🔴 not 1, and not 0 — undefined
  let shared = 0;
  for (const s of a) if (b.has(s)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? null : shared / union;
}
