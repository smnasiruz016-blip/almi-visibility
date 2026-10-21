/**
 * 🔴 RR-308 C1 · "FIX IT FOR ME" DESCRIPTIONS AND TITLES (owner, 21 Oct 2026: weak, repeated, or cut off with "…"). PURE.
 *   · Written from each page's OWN main content (its own sentences, its own main heading) — never a line the whole site repeats (a sentence
 *     found on 2+ pages is the site's boilerplate) and never a generic line ("17 questions answered below, each with its source.").
 *   · Complete sentences, about 120–160 characters, never cut with "…".
 *   · Unique per page: an option already given to another page is not given again.
 *   · Two options per page, each with Copy (the screen) and what it was written from.
 */
export const LEN = Object.freeze({ min: 120, max: 160, title: { min: 30, max: 60 } });
const GENERIC = /\b(answered below|each with its source|click here|read more|learn more|cookies?|all rights reserved|sign up|log ?in|subscribe|privacy policy|terms of (use|service)|this page|this site|welcome to)\b/i;
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const sentence = (s) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s && !/[.!?]$/.test(s) ? `${s}.` : s; };

/** The site's boilerplate: sentences found on 2 or more of its pages. */
export function boilerplate(pages) {
  const n = new Map();
  for (const p of pages) for (const s of new Set((p.lead ?? []).map(norm))) n.set(s, (n.get(s) ?? 0) + 1);
  return new Set([...n.entries()].filter(([, c]) => c >= 2).map(([s]) => s));
}

/** Up to 2 description options for ONE page, from its own sentences; `used` holds what other pages already got. */
export function descriptionOptions(page, { boiler = new Set(), used = new Set() } = {}) {
  /* a usable sentence: a real statement of the page (starts with a letter, 6+ words, ends with . or !), not a card fragment ("1800 Source:
   * HCPC … checked 2026-10-15"), not a question, not a button, not a line the site repeats */
  const own = (page.lead ?? []).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 25 && /^\p{L}/u.test(s) && s.split(" ").length >= 6 && /[.!]$/.test(s) && !/…|\.\.\.$/.test(s)
    && !/\bsource:|\bchecked \d{4}|·|\|/i.test(s) && !boiler.has(norm(s)) && !GENERIC.test(s) && !/\b(start|try) (your |a )?\d+-day free trial\b/i.test(s));
  const h1 = String(page.h1 ?? "").replace(/\s+/g, " ").trim();
  const cands = [];
  const fits = (t) => t.length >= LEN.min && t.length <= LEN.max;
  for (const s of own) if (fits(s)) cands.push({ text: s, from: "one sentence of the page's own text" });
  for (let i = 0; i + 1 < own.length; i++) { const t = `${own[i]} ${own[i + 1]}`; if (fits(t)) cands.push({ text: t, from: "two sentences of the page's own text" }); }
  if (h1 && !GENERIC.test(h1)) for (const s of own) { const t = `${sentence(h1)} ${s}`; if (fits(t) && !norm(s).startsWith(norm(h1))) cands.push({ text: t, from: "the page's main heading and one of its sentences" }); }
  /* when the page's sentences are all short or all long: the best complete text between 90 and 160, said to be shorter than ideal */
  if (!cands.length) { for (const s of own) if (s.length >= 90 && s.length <= LEN.max) cands.push({ text: s, from: "one sentence of the page's own text", short: true }); }
  const out = [];
  for (const c of cands) { const k = norm(c.text); if (used.has(k) || out.some((o) => norm(o.text) === k)) continue; out.push(c); if (out.length === 2) break; }
  for (const o of out) used.add(norm(o.text));
  return out;
}

/** Up to 2 title options for ONE page: its main heading, alone or with the site's name, 30–60 characters, unique per page. */
export function titleOptions(page, { siteName = null, used = new Set() } = {}) {
  const h1 = String(page.h1 ?? "").replace(/\s+/g, " ").trim(), h2 = (page.h2 ?? []).find((x) => x.length >= 10 && x.length <= 40);
  const cands = [];
  const add = (t, from) => { t = t.replace(/\s+/g, " ").trim(); if (t.length >= 10 && t.length <= 70 && !used.has(norm(t)) && !cands.some((c) => norm(c.text) === norm(t))) cands.push({ text: t, from }); };
  if (h1 && siteName && !norm(h1).includes(norm(siteName))) add(`${h1} | ${siteName}`, "the page's main heading and your site's name");
  if (h1) add(h1, "the page's main heading");
  if (h1 && h2 && !norm(h1).includes(norm(h2))) add(`${h1}: ${h2}`, "the page's main heading and its first sub-heading");
  const out = cands.sort((a, b) => Math.abs(45 - a.text.length) - Math.abs(45 - b.text.length)).slice(0, 2);
  for (const o of out) used.add(norm(o.text));
  return out;
}
