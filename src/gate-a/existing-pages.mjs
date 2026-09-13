/**
 * ITEM 25 — GATE A'S CHECKS AS MEASUREMENTS OVER PAGES THAT ALREADY EXIST.
 *
 * Gate A was built to decide whether a CANDIDATE page may be published, so it
 * runs in order and stops early: a page that fails unique words is never scored
 * for overlap. Item 25's v0.1 boundary asks something else — that unique value,
 * sibling overlap and verified-fact presence are each MEASURED AND REPORTED PER
 * PAGE on existing pages. So this measures all three on every page, with Gate
 * A's own functions and thresholds (no re-implementation), and reports each
 * against its threshold without gating one on another.
 *
 * ── THE DECLARED CHOICES ───────────────────────────────────────────────────
 *
 * TEMPLATE GROUP — pages on one host whose paths have the same depth and the
 * same first segment ("host /first/·/·"). Gate A never compares two templates;
 * this is the rule that decides what a page's siblings are. A group of one has
 * no sibling, and its overlap is VACUOUS, reported as such — never a pass.
 *
 * VERIFIED-FACT PRESENCE — a VERIFIED registry fact counts as present on a page
 * when its value, normalised (case and whitespace folded), appears in the page's
 * text and is at least MIN_VALUE_CHARS long. A shorter value ("B") would match
 * by accident and is not counted — declared, not hidden. Present facts are then
 * judged by Gate A's own countFacts.
 *
 * This module names no product.
 */

import { tokensOf, textOf } from "./tokens.mjs";
import { computeShells, uniqueWords, residualTokens } from "./shell.mjs";
import { maxAgainstPopulation } from "./overlap.mjs";
import { countFacts, MIN_FACTS } from "./facts.mjs";
import { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP } from "./run.mjs";
import { toGateAFact } from "../facts/registry.mjs";

export const MIN_VALUE_CHARS = 8;

export function templateGroupOf(canonical) {
  const u = new URL(canonical);
  const segments = u.pathname.split("/").filter(Boolean);
  return `${u.hostname} /${segments[0] ?? ""}${"/·".repeat(Math.max(0, segments.length - 1))}`;
}

const fold = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

/** The VERIFIED facts whose value appears in this page's text. */
export function factsPresentIn(html, facts) {
  const text = fold(textOf(html));
  return facts.filter((f) => {
    const v = f?.value?.value;
    return f.verificationState === "VERIFIED" && typeof v === "string" && v.trim().length >= MIN_VALUE_CHARS && text.includes(fold(v));
  });
}

/**
 * @param {{ id: string, html: string }[]} pages
 * @param {object[]} facts registry records
 */
export function measureExistingPages(pages, facts, { now = new Date() } = {}) {
  const groups = new Map();
  for (const p of pages) {
    const g = templateGroupOf(p.id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ ...p, tokens: tokensOf(p.html) });
  }
  const results = [];
  for (const [group, members] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const shell = computeShells(members.map((m) => m.tokens)).shellB;
    const withResidual = members.map((m) => ({ id: m.id, residual: residualTokens(m.tokens, shell) }));
    const overlaps = new Map(maxAgainstPopulation(withResidual, withResidual).map((o) => [o.id, o]));
    /* 🔴 FOUND WHILE WRITING THIS MODULE'S FIRING FIXTURE: in a group of TWO,
     * Gate A's shell is every token both pages share, so two identical pages
     * subtract to nothing and score 0 — a duplicate pair reads as perfectly
     * distinct. That is not a measurement of overlap, and it is reported as
     * UNMEASURABLE rather than as a pass. A group of one has no sibling at all. */
    const overlapState = members.length === 1 ? "VACUOUS" : members.length === 2 ? "UNMEASURABLE_PAIR" : "MEASURED";
    for (const m of members) {
      const unique = uniqueWords(m.tokens, shell);
      const o = overlaps.get(m.id);
      const present = factsPresentIn(m.html, facts);
      const counted = countFacts(present.map(toGateAFact), now);
      const measured = overlapState === "MEASURED";
      results.push({
        id: m.id,
        group,
        groupSize: members.length,
        uniqueWords: unique,
        uniquePass: unique >= MIN_UNIQUE_WORDS,
        overlapState,
        maxOverlap: measured ? o.maxOverlap : null,
        overlapAgainst: measured ? o.against : null,
        overlapVacuous: overlapState === "VACUOUS",
        overlapPass: measured ? o.maxOverlap <= MAX_SIBLING_OVERLAP : null,
        factsPresent: present.map((f) => f.id),
        factSources: [...new Set(present.map((f) => f.source?.url).filter(Boolean))],
        factsQualifying: counted.qualifying,
        factsPass: counted.passes,
      });
    }
  }
  return { results, groups: groups.size, thresholds: { MIN_UNIQUE_WORDS, MAX_SIBLING_OVERLAP, MIN_FACTS, MIN_VALUE_CHARS } };
}
