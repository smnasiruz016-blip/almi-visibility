/**
 * 🔴 WHERE REAL SITEMAP OBSERVATIONS MAY LIVE — a residency law, enforced by content.
 *
 * The engine held 1.7 MB of real sitemap observations for eight days: 5 collections, 20,895 real
 * URLs, captured from live hosts. Nobody decided that; the collector simply wrote beside itself and
 * the file was committed. The same thing had already happened once with the crawl store, and the
 * fix both times was to move the material out. This module is what stops it happening a third time.
 *
 * ── WHY THIS READS CONTENT AND NOT FILENAMES ───────────────────────────────
 *
 * A rule keyed to `runs/evidence/sitemaps.jsonl` is defeated by `git mv`. The thing that makes a
 * file forbidden is not where it sits or what it is called — it is that it CONTAINS a real captured
 * population. So the classifier reads records and judges those.
 *
 * ── AND WHY A FIXTURE MUST DECLARE ITSELF ──────────────────────────────────
 *
 * A synthetic fixture and a real capture have the same shape; that is what makes a fixture useful.
 * No amount of looking at a record can tell them apart, and a guess here fails in the worst
 * direction — a real population waved through because it looked small or tidy.
 *
 * 🔴 So a fixture DECLARES itself, with `synthetic: true` on the record. An undeclared record of
 * capture shape is forbidden. That is the same principle as the tenancy it guards: the engine reads
 * declarations and never infers, and an absent declaration is never "probably fine".
 */

/** The collector method that marks a record as a sitemap capture, whatever file it sits in. */
export const SITEMAP_CAPTURE_METHOD = "sitemap.collect";

export const RESIDENCY = Object.freeze({
  ALLOWED_FIXTURE: "a record of capture shape that DECLARES itself synthetic — test material, allowed anywhere",
  FORBIDDEN_REAL_OBSERVATIONS: "an undeclared record of sitemap-capture shape inside this repository — real observation data, which belongs in the external data repository",
  ALLOWED_EXTERNAL_REFERENCE: "a reference to the external collection — a path, an id or a manifest entry, carrying no captured population",
  UNKNOWN_EXTERNAL_SOURCE_MISSING: "the external collection this reference names could not be read, so residency is unknown rather than satisfied",
});

/** Is this record shaped like a sitemap capture? Shape only — it says nothing about real or not. */
export function isSitemapCaptureRecord(record) {
  return Boolean(record)
    && record.method === SITEMAP_CAPTURE_METHOD
    && Array.isArray(record?.value?.urls);
}

/** A capture record that declares itself test material. 🔴 Declared, never inferred. */
export function declaresSynthetic(record) {
  return record?.synthetic === true;
}

/**
 * Classify one candidate artefact.
 *
 * @param {object} input
 * @param {string} input.content        the file's text
 * @param {boolean} [input.externalSourceReadable]  for a reference, whether the external collection reads
 * @returns one of the RESIDENCY keys
 */
export function classifySitemapArtifact({ content, externalSourceReadable = null } = {}) {
  if (typeof content !== "string" || content.trim() === "") return "ALLOWED_EXTERNAL_REFERENCE";

  const records = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t === "" || (t[0] !== "{" && t[0] !== "[")) continue;
    try {
      const parsed = JSON.parse(t);
      for (const r of Array.isArray(parsed) ? parsed : [parsed]) records.push(r);
    } catch { /* not a record line; a reference in prose or code is judged below */ }
  }

  const captures = records.filter(isSitemapCaptureRecord);
  if (captures.length > 0) {
    /* 🔴 ONE UNDECLARED CAPTURE IS ENOUGH. A file that mixes declared fixtures with a real record is
     * a file holding a real record; the declared ones do not launder it. */
    return captures.every(declaresSynthetic) ? "ALLOWED_FIXTURE" : "FORBIDDEN_REAL_OBSERVATIONS";
  }

  /* No captured population in the bytes. If it merely NAMES the external collection, its residency
   * depends on that collection being readable — a reference to something absent is not satisfied. */
  if (externalSourceReadable === false) return "UNKNOWN_EXTERNAL_SOURCE_MISSING";
  return "ALLOWED_EXTERNAL_REFERENCE";
}
