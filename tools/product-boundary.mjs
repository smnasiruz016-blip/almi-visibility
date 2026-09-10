/**
 * PRODUCT BOUNDARY — THE ENGINE MAY NOT KNOW WHICH PRODUCT IT IS SERVING.
 *
 * The owner's ruling, 10 September 2026:
 *
 *   "ye 12 occupations OET ka hissa hain, visibility ka nahien. Visibility
 *    hamaray TAMAM products k liye hay — jo ban chuke hain aur jo abhi bannay
 *    wale hain."
 *
 * AlmiVisibility is the SYSTEM for building pages. AlmiOET is one PRODUCT that
 * is fed to it. The twelve professions are AlmiOET's axis, not the system's
 * vocabulary — so `src/` may not name them, and neither may it name any other
 * product's subject matter.
 *
 * 🔴 WHY THIS IS A TEST AND NOT A PARAGRAPH.
 *
 * "Product-agnostic" written in a README is a sentence that quietly stops being
 * true the first week somebody needs a special case. A grep that fails the build
 * is the same claim made FALSIFIABLE. This module is that grep, and the test
 * beside it is the claim.
 *
 * 🔴 AND WHY COMMENTS ARE EXEMPT, DELIBERATELY.
 *
 * A comment naming nursing is DOCUMENTATION — it records the measurement that
 * produced a rule, and deleting it would destroy the evidence while changing no
 * behaviour. Code naming nursing is a DEPENDENCY. Only the second one is the
 * breach, so only the second one is counted.
 *
 * That exemption is also the reason this file cannot just call `String.includes`
 * on the source: it has to know, for every occurrence, whether it sits in code
 * or in a comment. A string literal is CODE — `"profession="` in a predicate is
 * exactly the dependency we are hunting, even though it is quoted text.
 *
 * 🔴 AND THIS FILE LIVES IN `tools/`, NOT IN `src/`, ON PURPOSE.
 *
 * `PRODUCT_WORDS` below is a list of product words, so under `src/` it would
 * have been the law's own first offender — and the only way to keep it there
 * would have been to write itself an exemption. An exemption is a hole that
 * stays open long after the reason for it is forgotten, and the next file that
 * wants one has a precedent to point at.
 *
 * Moving the law out of the territory it polices costs one directory and needs
 * no exemption at all. `src/` is checked with NOTHING skipped.
 */

/**
 * 🔴 ONE LIST, ONE PLACE.
 *
 * Every product word lives here and nowhere else. A second copy in the test
 * would be a control that does not share the rule's code, and the two would
 * drift the first time somebody adds a word to one of them.
 *
 * Substrings, not whole words: `nmc` must catch `NMCN`, `pharmac` must catch
 * both `pharmacy` and `pharmacist`, `midwif` both `midwife` and `midwifery`.
 */
export const PRODUCT_WORDS = [
  "profession",
  "nursing",
  "nurse",
  "oet",
  "hcpc",
  "ahpra",
  "nmc",
  "podiatr",
  "pharmac",
  "midwif",
];

const PRODUCT_WORD_RE = new RegExp(PRODUCT_WORDS.join("|"), "gi");

/** Keywords after which a `/` opens a regular expression rather than dividing. */
const REGEX_PRECEDING_KEYWORDS = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await",
]);

const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);

/**
 * Mark every character of `source` as comment (1) or not-comment (0).
 *
 * 🔴 THIS HAS TO UNDERSTAND STRINGS AND REGULAR EXPRESSIONS, NOT JUST `//`.
 *
 * `src/page/render.mjs` contains `.replace(/"/g, "&quot;")`. A scanner that only
 * looked for quotes would open a string at the `"` INSIDE that regex, close it
 * at the next one, and mis-read the rest of the line — and a scanner that only
 * looked for `//` would call the `//` inside a URL string a comment. Either
 * mistake makes a zero mean nothing, which is the failure this whole file
 * exists to avoid. `test/product-boundary.test.mjs` proves both cases.
 */
export function commentMask(source) {
  const n = source.length;
  const mask = new Uint8Array(n);

  // Tracks `${ ... }` inside template literals so a nested template or string
  // is scanned as code rather than swallowed.
  const templateStack = [];
  let i = 0;
  let lastSignificant = "";

  const markRange = (from, to) => {
    for (let k = from; k < to && k < n; k += 1) mask[k] = 1;
  };

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    // ---- line comment -------------------------------------------------
    if (c === "/" && next === "/") {
      let end = source.indexOf("\n", i);
      if (end === -1) end = n;
      markRange(i, end);
      i = end;
      continue;
    }

    // ---- block comment ------------------------------------------------
    if (c === "/" && next === "*") {
      let end = source.indexOf("*/", i + 2);
      end = end === -1 ? n : end + 2;
      markRange(i, end);
      i = end;
      continue;
    }

    // ---- quoted string ------------------------------------------------
    if (c === '"' || c === "'") {
      i += 1;
      while (i < n && source[i] !== c) {
        if (source[i] === "\\") i += 1;
        if (source[i] === "\n") break; // unterminated; do not run away
        i += 1;
      }
      i += 1;
      lastSignificant = c;
      continue;
    }

    // ---- template literal ---------------------------------------------
    if (c === "`") {
      i += 1;
      while (i < n) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === "`") {
          i += 1;
          break;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          templateStack.push("template");
          i += 2;
          break;
        }
        i += 1;
      }
      lastSignificant = "`";
      continue;
    }

    if (c === "}" && templateStack.length > 0) {
      templateStack.pop();
      // Resume the template literal that this `${}` interrupted.
      i += 1;
      while (i < n) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === "`") {
          i += 1;
          break;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          templateStack.push("template");
          i += 2;
          break;
        }
        i += 1;
      }
      lastSignificant = "`";
      continue;
    }

    // ---- regular expression literal -----------------------------------
    if (c === "/") {
      const prev = lastSignificant;
      const word = /[A-Za-z0-9_$]$/.test(prev) ? trailingWord(source, i) : "";
      const dividing =
        (isIdentChar(prev) && !REGEX_PRECEDING_KEYWORDS.has(word)) ||
        prev === ")" ||
        prev === "]";
      if (!dividing) {
        i += 1;
        let inClass = false;
        while (i < n) {
          const r = source[i];
          if (r === "\\") {
            i += 2;
            continue;
          }
          if (r === "[") inClass = true;
          else if (r === "]") inClass = false;
          else if (r === "/" && !inClass) {
            i += 1;
            break;
          } else if (r === "\n") break; // unterminated; do not run away
          i += 1;
        }
        lastSignificant = "/";
        continue;
      }
    }

    if (!/\s/.test(c)) lastSignificant = c;
    i += 1;
  }

  return mask;
}

/** The identifier ending at `end`, used to tell `return /re/` from `a / b`. */
function trailingWord(source, end) {
  let k = end - 1;
  while (k >= 0 && /\s/.test(source[k])) k -= 1;
  let stop = k + 1;
  while (k >= 0 && isIdentChar(source[k])) k -= 1;
  return source.slice(k + 1, stop);
}

/**
 * Every product-word occurrence in `source`, each labelled code or comment.
 *
 * Returns `{ code: [...], comment: [...] }` where each entry is
 * `{ line, word, text }` — `text` is the whole source line, so a failure can
 * name itself instead of just counting.
 */
export function scanSource(source) {
  const mask = commentMask(source);
  const lineStarts = [0];
  for (let k = 0; k < source.length; k += 1) {
    if (source[k] === "\n") lineStarts.push(k + 1);
  }
  const lineAt = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const code = [];
  const comment = [];
  PRODUCT_WORD_RE.lastIndex = 0;
  let m;
  while ((m = PRODUCT_WORD_RE.exec(source)) !== null) {
    const li = lineAt(m.index);
    const start = lineStarts[li];
    let end = source.indexOf("\n", start);
    if (end === -1) end = source.length;
    const entry = {
      line: li + 1,
      word: m[0].toLowerCase(),
      text: source.slice(start, end).replace(/\r$/, "").trim(),
    };
    (mask[m.index] ? comment : code).push(entry);
  }
  return { code, comment };
}

/** Distinct line numbers among a list of occurrences. */
export function distinctLines(occurrences) {
  return new Set(occurrences.map((o) => o.line)).size;
}
