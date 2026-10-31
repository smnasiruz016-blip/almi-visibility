/**
 * 🔴 RR-351 · "ADD OFFICIAL FACTS FILE" (owner, 31 Oct 2026): a product's verified-facts file — facts read on their official page, each with
 * its source URL, its quote and its check date — imported into the product. ONLY a fact whose quote AND numbers were proved on its page goes
 * onto a page; every other fact (not proved, numbers not found, page not readable) shows as "check the official page" with its link, never
 * its value. Pure: the file's text in, the facts out.
 *
 * The file: { countries: [{ country, facts: [{ key, value, url, quote, accessed, verdict, verdict2?, numbersMissing?, note? }] }] }
 *   key       "fee" · "rate" · "venues" · "rule" · "regulator:<profession>"
 *   verdict   "VERIFIED" — the quote stands on the live page; verdict2 (when present) must say so too; numbersMissing [] — every number in
 *             the value was found on the page. A quote can be true while a number beside it is not: both must hold.
 */
import { createHash } from "node:crypto";
import { CF_PROFESSIONS } from "./country-facts.mjs";

export const FACTS_FILE = "facts-file.json";
/* a key → the country-page part it fills (desktop/country-facts.mjs PARTS) */
const PART_OF = { fee: "fee", rate: "fee", venues: "centres", rule: "rules" };
const LABEL_OF = { fee: "The test fee", rate: "The exchange rate", venues: "Test centres", rule: "A rule of its own" };
/* the file's profession words → the page plan's keys */
const PROFESSION_OF = { "speech and language therapy": "speech pathology", "speech therapy": "speech pathology", "speech language therapy": "speech pathology", "speech language pathology": "speech pathology", "veterinary": "veterinary science", "dietetics and nutrition": "dietetics",
  "nursing midwifery": "nursing", "nursing and midwifery": "nursing", "midwifery": "nursing", "medical radiation technology": "radiography", "medical radiation practice": "radiography", "medical imaging": "radiography" };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const https = (u) => { try { return new URL(String(u)).protocol === "https:"; } catch { return false; } };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };

/** one fact is VERIFIED only when its quote and its numbers were both proved on its official page */
export function verifiedFact(f) {
  return f?.verdict === "VERIFIED" && (f.verdict2 === undefined || f.verdict2 === "VERIFIED") && Array.isArray(f.numbersMissing) && f.numbersMissing.length === 0
    && String(f.value ?? "").trim().length > 0 && String(f.quote ?? "").trim().length > 0 && https(f.url) && DAY.test(String(f.accessed ?? ""));
}

/** why a fact is not shown with its value (plain words, for the owner's list) */
function whyNot(f) {
  if (f.verdict === "NUMBERS_UNPROVEN" || f.verdict2 === "NUMBERS_UNPROVEN" || (Array.isArray(f.numbersMissing) && f.numbersMissing.length)) return "a number in it was not found on the official page";
  if (f.verdict === "QUOTE_NOT_FOUND" || f.verdict2 === "QUOTE_NOT_FOUND") return "its quote was not found on the official page";
  if (f.verdict === "CHECK_OFFICIAL") return f.note ? `not read: ${String(f.note).slice(0, 160)}` : "the official page could not be read";
  if (f.verdict === "VERIFIED" && !Array.isArray(f.numbersMissing)) return "the file does not say its numbers were checked";
  return "not proved on its official page";
}

/** a key's part, profession and label: "regulator:nursing" → councils · nursing · "The regulator for nursing" */
export function keyOf(key) {
  const k = String(key ?? "").trim().toLowerCase();
  const m = /^regulator:(.+)$/.exec(k);
  /* RR-354 (owner's files: "occupational-therapy", "nursing-midwifery", "medical-radiation-technology" — 7 facts reached no profession):
   * hyphens are spaces, and each profession's other names are its one name */
  if (m) { const w = m[1].replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim(), p = PROFESSION_OF[w] ?? w; return { part: "councils", profession: p, label: `The regulator for ${w}` }; }
  return PART_OF[k] ? { part: PART_OF[k], profession: null, label: LABEL_OF[k] } : null;
}

/**
 * Read ONE facts file. → { ok, refused?, file, facts: [{ id, country, key, part, profession, label, verified, text, quote, link, on, why? }],
 *   counts: { all, verified, check, skipped }, skipped: [why…] }
 * A verified fact carries its value as `text`; a fact not proved carries "<label>: check the official page" and its link — never its value.
 */
export function readFactsFile(text, { name = "facts.json" } = {}) {
  let j; try { j = JSON.parse(String(text ?? "").replace(/^﻿/, "")); } catch { return { ok: false, refused: `${name} cannot be read — it is not a facts file.` }; }
  if (!Array.isArray(j?.countries) || !j.countries.length) return { ok: false, refused: `${name} has no "countries" list — it is not a verified-facts file.` };
  const facts = [], skipped = [];
  for (const c of j.countries) {
    const country = String(c?.country ?? "").trim();
    if (!country || !Array.isArray(c.facts)) { skipped.push(`a country without its name or facts in ${name}`); continue; }
    for (const f of c.facts) {
      const k = keyOf(f?.key);
      if (!k) { skipped.push(`${country}: "${f?.key}" is not a fact Visibility knows`); continue; }
      if (!https(f.url)) { skipped.push(`${country} · ${k.label}: no official page address`); continue; }
      const ok = verifiedFact(f), on = DAY.test(String(f.accessed ?? "")) ? f.accessed : null;
      const id = `file-${createHash("sha256").update(`${country}|${f.key}|${f.url}|${ok ? f.value : ""}`).digest("hex").slice(0, 16)}`;
      facts.push(ok
        ? { id, country, key: f.key, part: k.part, profession: k.profession, label: k.label, verified: true, text: String(f.value).trim(), quote: String(f.quote).trim(), link: f.url, on, source: hostOf(f.url) }
        : { id, country, key: f.key, part: k.part, profession: k.profession, label: k.label, verified: false, text: `${k.label}: check the official page`, link: f.url, on, source: hostOf(f.url), why: whyNot(f) });
    }
  }
  if (!facts.length) return { ok: false, refused: `${name} has no fact Visibility can use.`, skipped };
  /* one fact once: the same country, key, page and value read twice is one fact */
  const seen = new Set(), unique = facts.filter((f) => !seen.has(f.id) && seen.add(f.id));
  return { ok: true, file: name, facts: unique, skipped, counts: { all: unique.length, verified: unique.filter((f) => f.verified).length, check: unique.filter((f) => !f.verified).length, skipped: skipped.length } };
}

/** the product's store after adding a file: the same file name again REPLACES its facts (a re-checked file), other files are kept */
export function addFactsFile(store, read, { on }) {
  const files = (store?.files ?? []).filter((x) => x.file !== read.file);
  files.push({ file: read.file, addedOn: on, counts: read.counts, facts: read.facts });
  return { files };
}
/** every fact of the product's store, one per id (the newest file first) */
/* RR-354: a fact's profession is read again from its key — a file added before the name fix keeps working without being added again */
export const factsOfStore = (store) => { const seen = new Set(); return [...(store?.files ?? [])].reverse().flatMap((x) => x.facts).filter((f) => !seen.has(f.id) && seen.add(f.id)).map((f) => { const k = keyOf(f.key); return k?.part === "councils" && k.profession !== f.profession ? { ...f, profession: k.profession } : f; }); };

/** VERIFIED facts as the app's official answers (desktop/main.mjs officialOf): country → claims, each with its page and the day it was checked */
export function officialClaimsOf(store) {
  const out = {};
  for (const f of factsOfStore(store).filter((x) => x.verified && x.on)) (out[f.country] ??= []).push({ claimId: f.id, text: f.text, link: f.link, readOn: f.on, source: `${f.source} — its official page`, official: true, body: f.source, fromFactsFile: true, part: f.part, profession: f.profession });
  return out;
}
/** for a country page (desktop/local-pages.mjs): its VERIFIED facts as the owner's own checked lines, and its "check the official page" lines */
export function countryLinesOf(store) {
  const out = {};
  for (const f of factsOfStore(store)) {
    const x = (out[f.country] ??= { owner: [], checkOfficial: [] });
    /* only a RULE fills its part of the five (an official page's rule); a fee read in AUD is not "the fee in its own currency", a venue
     * line is not the venue list, a destination's regulator is not the home council — they are shown, never counted as a filled part */
    if (f.verified) x.owner.push({ key: `country|${f.country}|${f.part === "rules" ? "rules" : `file-${String(f.key).toLowerCase()}`}`, value: { text: f.text, link: f.link, on: f.on, note: "read on its official page" }, readOn: f.on, status: "owner", fromFactsFile: true });
    else x.checkOfficial.push({ label: f.label, link: f.link, on: f.on });
  }
  for (const x of Object.values(out)) x.checkOfficial = x.checkOfficial.filter((c, i, all) => all.findIndex((y) => y.label === c.label && y.link === c.link) === i);
  return out;
}
/** the owner's summary of the store: files, and per file how many facts go on pages and how many say "check the official page" */
export function factsFileView(store) {
  return { files: (store?.files ?? []).map((x) => ({ file: x.file, addedOn: x.addedOn, ...x.counts, countries: [...new Set(x.facts.map((f) => f.country))] })),
    notShown: factsOfStore(store).filter((f) => !f.verified).map((f) => ({ country: f.country, label: f.label, link: f.link, why: f.why })) };
}
