/**
 * 🔴 RR-318 B · THE WEBSITE'S READY TEXT, WRITTEN — NEVER LIFTED, NEVER CUT (owner's live test on AlmiOET, 23 Oct 2026):
 *   1 a meta description is WRITTEN: what the reader gets on that page (its main heading and what its sections cover), complete sentences,
 *     never a sentence lifted out of the page ("…anyone promising you a precise number from practice is guessing"), never cut;
 *   2 an FAQ answer is never cut mid-word ("we do not c") and never carries the page's "Source: … · checked …" or "Also asked: …" lines —
 *     the source stays on the visible page;
 *   3 the Organization is the site's real NAME (the name its page titles share: "AlmiOET", never a page title) and its logo only when one was
 *     found — never "from your logo" without one;
 *   4 FAQ markup is offered as what it is: Google stopped showing FAQ rich results on 7 May 2026; the markup helps search and AI understand.
 * Pure: a site read in, text out.
 */
export const FAQ_TRUTH = "Google stopped showing FAQ rich results on 7 May 2026 (Google Search Central's own changelog). FAQ markup still helps search engines and AI assistants understand your questions and answers — it does not make them show in Google.";
export const FAQ_TRUTH_SOURCE = "https://developers.google.com/search/updates";
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const sentence = (s) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s && !/[.!?]$/.test(s) ? `${s}.` : s; };

/** An answer as a reader sees it: no "Source: …", no "· checked 2026-10-15", no "Also asked: …" — the sources stay on the page. */
export function cleanAnswer(text) {
  return String(text ?? "")
    .replace(/\bAlso asked:[\s\S]*$/i, " ")
    .replace(/\bSources?:\s[\s\S]{0,300}?·\s*checked\s+\d{4}-\d{2}-\d{2}/gi, " ")
    .replace(/·?\s*checked\s+\d{4}-\d{2}-\d{2}/gi, " ")
    .replace(/\bSources?:\s[^.?!]{0,200}$/i, " ")
    .replace(/\s+([.,;:])/g, "$1").replace(/\s+/g, " ").trim();
}
/** A long text kept whole, or shortened only at a sentence end — never mid-word; `null` when even its first sentence is longer than `max`. */
export function wholeSentences(text, max) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  let out = "";
  for (const s of t.split(/(?<=[.!?])\s+(?=[\p{Lu}\d"“(])/u)) { const next = out ? `${out} ${s}` : s; if (next.length > max) break; out = next; }
  return out || null;
}

/** The site's real name: the part its page titles share ("… | AlmiOET", "… · AlmiOET"), else its own og:site_name, else its address. */
export function siteNameOf(site) {
  const counts = new Map();
  for (const p of site?.pages ?? []) { const parts = String(p.title ?? "").split(/\s+[|·—–-]\s+|\s+[|·]\s*/).map((x) => x.trim()).filter((x) => x && x.length <= 40); if (parts.length < 2) continue; for (const x of new Set([parts[0], parts.at(-1)])) counts.set(x, (counts.get(x) ?? 0) + 1); }
  const shared = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0];
  if (shared) return shared;
  const own = String(site?.design?.siteName ?? "").trim();
  if (own && own.length <= 40 && !/\s[|·—–-]\s/.test(own)) return own;
  if (own) return own.split(/\s+[|·—–-]\s+/).pop().trim();
  try { return new URL(site.origin).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** The Organization block: the real name, the site's address, its logo only when the site shows one. */
export function organizationLd(site) {
  const name = siteNameOf(site), logo = site?.design?.logo ?? null;
  const ld = { "@context": "https://schema.org", "@type": "Organization", name, url: site.origin, ...(logo ? { logo } : {}) };
  return { ld, paste: `<script type="application/ld+json">${JSON.stringify(ld, null, 1)}</script>`, from: `your site's name as your page titles write it (${name}) and its address${logo ? ", and the logo on your home page" : ""}`,
    note: logo ? null : "No logo was found on your site's home page, so none is named here. Add a \"logo\" line with your logo's web address (for example \"logo\": \"https://…/logo.png\") if you want one." };
}

/* a section heading that says nothing about what the reader gets */
const GENERIC_H2 = /^(key facts|questions and answers|common questions|faqs?|frequently asked questions|contents|table of contents|related\b.*|more\b.*|summary|overview|introduction|conclusion|sources?|references|share|follow us|newsletter|contact( us)?)$/i;
const lowerFirst = (s) => (/^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const brandless = (s, name) => (name ? String(s ?? "").split(/\s+[|·—–-]\s+/).filter((x) => norm(x) !== norm(name)).join(" — ") : String(s ?? "")).trim();

/**
 * Up to 2 WRITTEN descriptions for one page (owner: "what the reader gets on that page, complete sentences, never cut"):
 *   · its main heading, then what its own sections cover ("Inside: the four OET sub-tests; all 12 healthcare professions; …"), or how many
 *     questions it answers with one of them; topics are dropped from the end until it fits 160 characters — never a cut word;
 *   · its present description, kept to its complete sentences (when it is too long).
 * Never a sentence lifted from the page's body. Unique across the site (`used`).
 */
export function writtenDescriptions(page, { siteName = null, used = new Set(), min = 70, max = 160 } = {}) {
  const head = sentence(brandless(page.h1 || page.title, siteName));
  const topics = (page.h2 ?? []).map((h) => String(h).replace(/\s+/g, " ").trim()).filter((h) => h && !GENERIC_H2.test(h) && h.length <= 70 && norm(h) !== norm(page.h1));
  const qs = (page.qa ?? []).map((x) => String(x.q).trim()).filter(Boolean);
  const sourced = (page.qa ?? []).some((x) => /\bsource:/i.test(String(x.a ?? "")));
  const cands = [];
  if (head && topics.length >= 2) for (let k = Math.min(4, topics.length); k >= 2; k--) { const t = `${head} Inside: ${topics.slice(0, k).map(lowerFirst).join("; ")}.`; if (t.length <= max) { cands.push({ text: t, from: "the page's main heading and what its sections cover" }); break; } }
  /* the client's own present description, kept to its complete sentences, comes before a count of questions */
  if (page.description && page.description.length > max) { const d = wholeSentences(page.description, max); if (d && d.length >= min) cands.push({ text: d, from: "your page's present description, kept to its complete sentences" }); }
  if (head && qs.length) { const t = `${head} ${qs.length} question${qs.length === 1 ? "" : "s"} answered${sourced ? ", each with its official source" : ""} — for example: ${qs[0]}`; const s = /[.!?]$/.test(t) ? t : `${t}.`; if (s.length <= max) cands.push({ text: s, from: "the page's main heading and the questions it answers" }); else { const u = `${head} ${qs.length} question${qs.length === 1 ? "" : "s"} answered${sourced ? ", each with its official source" : ""}.`; if (u.length <= max) cands.push({ text: u, from: "the page's main heading and the questions it answers" }); } }
  if (head && !cands.length && topics.length === 1) { const t = `${head} Inside: ${lowerFirst(topics[0])}.`; if (t.length <= max) cands.push({ text: t, from: "the page's main heading and its section" }); }
  const out = [];
  for (const c of cands) { const k = norm(c.text); if (c.text.length < min || used.has(k) || out.some((o) => norm(o.text) === k)) continue; out.push(c); if (out.length === 2) break; }
  for (const o of out) used.add(norm(o.text));
  return out;
}

/** A NEW page's meta description: its question, and what the page gives — the official answer with its owner and date (never another page's sentence). */
export function newPageDescription(question, claims = [], brand = null, max = 160) {
  const q = sentence(question).replace(/\.$/, /^(how|what|why|which|where|when|who|is|are|can|does|do|should|will)\b/i.test(question) ? "?" : ".");
  const official = claims.find((c) => c.official);
  const body = official?.body ?? null, day = official?.readOn ?? null;
  const tries = [
    body && day ? `${q} The answer from ${body}'s own page (checked ${day})${brand ? `, and how to prepare with ${brand}` : ""}.` : null,
    body && day ? `${q} The answer from ${body}'s own page, checked ${day}.` : null,
    claims.length ? `${q} The answer, each line with its source and the day it was checked.` : null,
  ].filter(Boolean);
  return tries.find((t) => t.length <= max && t.length >= 50) ?? null;
}
