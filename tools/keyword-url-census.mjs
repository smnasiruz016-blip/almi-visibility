/**
 * 🔴 ROW 3 — THE KEYWORD→URL CENSUS. A STORED KEYWORD MAY NEVER BECOME A URL BY ITSELF.
 *
 * Modelled on tools/product-boundary.mjs, and living in tools/ for the same reason: the law must sit outside the
 * territory it polices. It reads every module under src/ and bin/, with comments removed by the SAME comment scanner
 * the product boundary uses, and:
 *
 *   1. finds every CONSUMER of the search-language module — a file that names it in code, by import, dynamic import or a
 *      path string — and every file that consumes a consumer, until nothing new is found;
 *   2. fails if any consumer contains a URL-shaped construction: `new URL(`, a `/${…}` path template, a slug, a route,
 *      an href, a sitemap, `encodeURIComponent(`, an `.html` output, or a replace-spaces-with-hyphens slugify.
 *
 * It is deliberately coarse: a consumer that builds an unrelated URL is still refused. A false alarm costs a review; a
 * missed path would let a keyword become a page.
 *
 * 🔴 WHAT IT CANNOT SEE — and the row says so:
 *   · a person writing a page, route or slug BY HAND from a keyword they read in a report — it reads code, not people;
 *   · data copied OUT of the stored records into another file, repository or product, where no import remains to follow;
 *   · a consumer outside src/ and bin/ — another repository, the products' data repository, a notebook, a shell script;
 *   · an import whose specifier is COMPUTED at run time, or code run through eval;
 *   · a file that only holds the module's path as TEXT and hands it to another module that runs it — a path string counts
 *     only in a file that itself imports child_process or worker_threads, or calls import().
 * It proves no code path in this repository takes a stored keyword to a URL. It does not prove none will ever exist.
 */
import { commentMask } from "./product-boundary.mjs";

export const TARGET_BASENAME = "search-language.mjs";

export const URL_SHAPES = Object.freeze([
  { shape: "new URL(", re: /\bnew\s+URL\s*\(/ },
  { shape: "a /${…} path template", re: /`[^`\n]*\/\$\{/ },
  { shape: "slug", re: /slug/i },
  { shape: "route", re: /\broute/i },
  { shape: "href", re: /\bhref\b/i },
  { shape: "sitemap", re: /sitemap/i },
  { shape: "encodeURIComponent(", re: /encodeURIComponent\s*\(/ },
  { shape: ".html output", re: /\.html\b/ },
  { shape: "spaces → hyphens slugify", re: /\.(replace|replaceAll)\(\s*\/\\s\+?\/g?\s*,\s*["'`]-["'`]|\.split\(\s*["'`] ["'`]\s*\)\.join\(\s*["'`]-["'`]/ },
]);

/** The source with every comment character blanked (newlines kept, so line numbers survive). */
export function codeOnly(source) {
  const mask = commentMask(source);
  let out = "";
  for (let i = 0; i < source.length; i += 1) out += mask[i] && source[i] !== "\n" ? " " : source[i];
  return out;
}

/**
 * 🔴 A file CONSUMES a module when its code can reach it: an import / export-from specifier or a dynamic import() naming
 * it — or, in a file that can load or start code (it imports child_process or worker_threads, or calls import()),
 * any string naming it.
 * A file that merely MENTIONS the path in text it never runs — the ledger's `test:` string for row 3, printed into
 * CHECKLIST_BOUNDARIES.md — is not a consumer. Narrowed on 15 September 2026, when that mention made the whole ledger a
 * "consumer"; the narrowing is itself a limit, stated below the census header.
 */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'`]([^"'`\n]+)["'`]/g;
const CAN_EXECUTE = /["'`](?:node:)?(?:child_process|worker_threads)["'`]|\bimport\s*\(/;
const names = (code, basename) => {
  for (const m of code.matchAll(SPECIFIER)) if (m[1] === basename || m[1].endsWith(`/${basename}`)) return true;
  return CAN_EXECUTE.test(code) && code.includes(basename);
};

/**
 * @param {Map<string, string>} sources  repo-relative path → file text, for every module under src/ and bin/
 * @returns {{ consumers: string[], breaches: { file: string, shape: string, line: number, text: string }[] }}
 */
export function keywordUrlCensus(sources) {
  const code = new Map([...sources].map(([f, s]) => [f, codeOnly(s)]));
  const consumers = new Set([...code].filter(([f, c]) => f.endsWith(`/${TARGET_BASENAME}`) || names(c, TARGET_BASENAME)).map(([f]) => f));
  for (let grew = true; grew;) {
    grew = false;
    for (const [f, c] of code) {
      if (consumers.has(f)) continue;
      if ([...consumers].some((k) => k.startsWith("src/") && names(c, k.split("/").pop()))) {
        consumers.add(f);
        grew = true;
      }
    }
  }
  const breaches = [];
  for (const f of [...consumers].sort()) {
    const lines = code.get(f).split("\n");
    lines.forEach((text, i) => {
      for (const { shape, re } of URL_SHAPES) if (re.test(text)) breaches.push({ file: f, shape, line: i + 1, text: text.trim().slice(0, 120) });
    });
  }
  return { consumers: [...consumers].sort(), breaches };
}

/**
 * 🔴 THE NO-LEXICON LAW, as a function the test and the runner share: every place a source NAMES one of `forbidden`
 * in code — an import, a dynamic import, or a path string. Comments are allowed: documentation is not a dependency.
 */
export function forbiddenReferences(source, forbidden) {
  const c = codeOnly(source);
  return forbidden.filter((name) => c.includes(name));
}
