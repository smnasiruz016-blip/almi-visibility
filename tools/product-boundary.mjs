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
/* 🔴 F02 (24 Sep 2026): THE LIST NOW LIVES WITH EACH SUBJECT. It used to be written here, which made this shared file
 * hold one client's vocabulary. Each subject package (subjects/<id>/package.mjs) declares the words shared code must
 * never contain; the law is the union of them, plus the private-path shapes below, which name no client. An EMPTY union
 * would make every scan vacuous, so it throws. */
const { loadAllSubjectPackages } = await import("../src/subject-package.mjs");
const PACKAGES = await loadAllSubjectPackages();
/** Shapes of a private location — a machine's own paths are never shared engine material. */
export const PRIVATE_PATH_FRAGMENTS = Object.freeze(["C:/Users/", "C:/Projects/", "OneDrive"]);
export const PRODUCT_WORDS = Object.freeze([...new Set(PACKAGES.flatMap((p) => p.vocabulary ?? []))]);
if (PRODUCT_WORDS.length === 0) throw new Error("NEUTRALITY_VOCABULARY_EMPTY: no subject package declares a vocabulary — every scan would pass vacuously");
export const NEUTRALITY_TERMS = Object.freeze([...PRODUCT_WORDS, ...PRIVATE_PATH_FRAGMENTS]);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const PRODUCT_WORD_RE = new RegExp(NEUTRALITY_TERMS.map(escapeRe).join("|"), "gi");

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

/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * 🔴 THE SHARED ENGINE — src/, bin/ AND config/ (F02, 24 Sep 2026). The law used to cover src/ alone, and that blind spot
 * is how one client's hosts, regulators and private paths sat in bin/ and config/ unseen. Subject packages
 * (subjects/<id>/) are outside it by construction: they are where that material belongs.
 * ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
export const SHARED_SCOPE = Object.freeze(["src", "bin", "config"]);

/**
 * ONE PINNED LINE, matched by the sha256 of its exact text — never by file, never by pattern. It is the historical 61-row
 * ledger (src/checklist/classification.mjs), which the F02 command orders NOT to be altered: a row's `test` field records
 * the command it was run with. Any edit to that line, or any other hit anywhere, is a breach; a pin that no longer matches
 * a line is itself a breach, so it cannot outlive its reason.
 */
export const PINNED_HISTORICAL_LINES = Object.freeze([
  /* 🔴 DECLARED BLIND SPOT (RR-149 §6): the three lines below are NOT scanned for a client word — the census cannot see one planted
   * there while the bytes stay identical. Bounded: by exact sha256 only, three lines, one file; any edit to a line un-pins THAT pin
   * (stale is judged per pin — test/product-boundary.test.mjs CONTROL); it ends when the owner amends or replaces F62's acceptance.
   * RR-148: F62's frozen acceptance (_handoffs a5ec9f1) carries the owner's own words (RR-148 §1: the engine names "no profession") in
   * its EXPECTED, FAILURE and EVIDENCE clauses, copied byte-for-byte and pinned by contractSha256 — altering them breaks the contract pin,
   * and changing the acceptance is the owner's act. These three exact lines, by hash, and nothing else. */
  Object.freeze({ file: "config/fboard/acceptances.mjs", sha256: "3ad2b28d6e31dfb4916aab05b9f1c90ae8f76deabec28970eaecc7bec20d0138", why: "F62's frozen acceptance, EXPECTED (the owner's words, a5ec9f1)" }),
  Object.freeze({ file: "config/fboard/acceptances.mjs", sha256: "c115938d210ef7e8d9f8871bb65a0d020009122aa56a5b412653c4dc15819bc6", why: "F62's frozen acceptance, FAILURE (the owner's words, a5ec9f1)" }),
  Object.freeze({ file: "config/fboard/acceptances.mjs", sha256: "e587cc1272e9c7d96718df3e18cf72756222a8aabcf451c2687910df198ce6fc", why: "F62's frozen acceptance, EVIDENCE (the owner's words, a5ec9f1)" }),
  /* RR-179 §4.2: F41 Acceptance Amendment 1's EXPECTED (frozen by its hash, _handoffs be0ec9d) names the owner's RR-177 ruling on the 27
   * existing pages of a named subject — the frozen words, copied byte for byte and pinned by contractSha256; this pin is that one line. */
  Object.freeze({ file: "config/fboard/acceptances.mjs", sha256: "63bb2aa4fbad8915d463e2860f2775f01a689d828e81d6cb321bb5c287732b56", why: "F41 Amendment 1's frozen acceptance, EXPECTED (RR-177's ruling named in C8, be0ec9d)" }),
  /* in the census's own order (files sorted: config/ before src/), so each pin is matched in turn */
  Object.freeze({ file: "src/checklist/classification.mjs", sha256: "945c24967dd7f9cc4a784ac06b215b4b2828353200458f22d0a643c79995f51d", why: "the historical ledger (frozen; F02 command §3: do not alter the historical 61/38 ledger)" }),
]);

/** The shared engine, scanned. Returns every breach, every pin used, and every stale pin. Reads only. */
export async function neutralityCensus({ repo, read = null, pins = PINNED_HISTORICAL_LINES } = {}) {
  const { execFileSync } = await import("node:child_process");
  const { readFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const { join } = await import("node:path");
  const files = execFileSync("git", ["-C", repo, "ls-files", ...SHARED_SCOPE], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".mjs")).sort();
  const text = read ?? ((f) => readFileSync(join(repo, f), "utf8"));
  const breaches = []; const pinned = []; let commentLines = 0;
  for (const file of files) {
    const s = text(file);
    const r = scanSource(s);
    commentLines += distinctLines(r.comment);
    const seen = new Set();
    for (const o of r.code) {
      if (seen.has(o.line)) continue;
      seen.add(o.line);
      const h = createHash("sha256").update(o.text).digest("hex");
      const pin = pins.find((x) => x.file === file && x.sha256 === h);
      (pin ? pinned : breaches).push({ file, line: o.line, word: o.word, text: o.text, ...(pin ? { why: pin.why, sha256: h } : {}) });
    }
  }
  /* RR-148: stale is judged PER PIN, by its own hash — with several pins in one file, a per-file check let an edited line's pin outlive it */
  const stale = pins.filter((x) => !pinned.some((p) => p.file === x.file && p.sha256 === x.sha256));
  return { files, breaches, pinned, stale, commentLines };
}
