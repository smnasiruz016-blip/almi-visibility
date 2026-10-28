/**
 * 🔴 RR-326 B + G · THE COLLECTOR'S SEED LIST — ONE editable list the owner changes on his own page (/owner), kept in the database; this
 * file holds only the FIRST list (the default) and the rules a list must keep.
 *   · one group per line:  kind:key | Name | seed, seed, seed
 *       product:<key>   an AlmiWorld product (almi-data's family list) — its seeds go to Google in ONE request per location, every 30 days
 *       category:<key>  a category of products, services or websites — one request per seed per location, every 60 days
 *       youtube:<key>   YouTube niches — Google SEARCH volumes only (never YouTube's own numbers), every 60 days like a category
 *     a line starting with # is a note.
 *   · the locations (RR-329, rule R5): "all locations" and EVERY country Google can target, in the owner's queue order (site/queue.mjs) —
 *     Google's own criterion ids, read from Google's geotargets file of 2026-10-06 (developers.google.com/google-ads/api/data/geotargets);
 *     the order of work is the queue's (site/kw-collector.mjs);
 *   · the language: English (Google's languageConstants/1000). Urdu, Hindi and Arabic seeds come later, when the owner says.
 * Pure: no store, no network.
 */
import { createHash } from "node:crypto";
import GC from "./google-countries.json" with { type: "json" };
import { QUEUE_COUNTRIES } from "./queue.mjs";

export const LANGUAGES = Object.freeze({ en: Object.freeze({ name: "English", constant: "languageConstants/1000" }) });
/* RR-329 (rule R5): EVERY country Google can target — Google's own criterion ids from its geotargets file of 2026-10-06 (site/google-countries.json:
 * 192 of AlmiWorld's 197; Cuba, Iran, Kosovo, North Korea and Palestine are not in it), in the owner's queue order, "All locations" first */
export const LOCATIONS = Object.freeze([{ code: "ALL", name: "All locations", geo: null },
  ...QUEUE_COUNTRIES.filter((c) => GC.countries[c]).map((c) => ({ code: GC.countries[c].code, name: c, geo: `geoTargetConstants/${GC.countries[c].geo}` }))].map((l) => Object.freeze(l)));
export const NOT_IN_GOOGLE = Object.freeze(QUEUE_COUNTRIES.filter((c) => !GC.countries[c]));
export const locationOf = (code) => LOCATIONS.find((l) => l.code === String(code ?? "").toUpperCase()) ?? null;
/* the app's keyword service asks THESE for a page plan (RR-326 E, unchanged): all locations and the owner's first 18 — the collector fills the rest */
export const PLAN_LOCATIONS = Object.freeze(["ALL", "PK", "IN", "PH", "NG", "KE", "EG", "BD", "NP", "GB", "IE", "AU", "NZ", "US", "CA", "AE", "SA", "QA", "SG"].map(locationOf));

/* RR-329 (rule R5): how often a unit is asked again, in days — Google's figures are 12-month averages it updates once a month, so a product
 * is asked again after 30 days and a category or YouTube niche after 60 (all 193 locations stay under a third of Google's daily limit) */
export const KINDS = Object.freeze({ product: "monthly", category: "every two months", youtube: "every two months" });
export const REFRESH_DAYS = Object.freeze({ product: 30, category: 60, youtube: 60 });
export const SEED_RULES = Object.freeze({ productSeeds: 20, groupSeeds: 60, groups: 80, seedLength: 80 });

/* the FIRST list (RR-326 B: the 24 products of almi-data's family list; G: the owner's categories and YouTube niches, his words) */
export const DEFAULT_SEEDS = `# AlmiWorld's own products — collected first, in the owner's queue order, every 30 days (one request per location with all the product's seeds)
product:jobs | AlmiJob | jobs abroad, job search, visa sponsorship jobs, overseas jobs
product:salary | Salary Checker | salary checker, salary calculator, average salary
product:cv | AlmiCV | cv maker, resume builder, cv template, cv format
product:study | AlmiStudy | study abroad, scholarships, university admission
product:prep | AlmiPrep | ielts, ielts preparation, ielts practice test
product:pte | AlmiPTE | pte exam, pte practice, pte academic
product:toefl | AlmiTOEFL | toefl, toefl practice test, toefl exam
product:oet | AlmiOET | oet, oet exam, oet practice test, oet nursing, oet exam fee, how to apply for oet, oet test centre, is oet accepted for nmc, oet vs ielts for nurses, oet writing sample for nurses
product:det | AlmiDET | duolingo english test, duolingo english test practice
product:celpip | AlmiCELPIP | celpip, celpip practice test, celpip exam
product:french | AlmiFrench | learn french, french course, tef canada
product:spanish | AlmiSpanish | learn spanish, spanish course, dele exam
product:japanese | AlmiJapanese | learn japanese, jlpt, japanese course
product:korean | AlmiKorean | learn korean, topik exam, korean course
product:goethe | AlmiGoethe | goethe exam, learn german, goethe a1
product:portuguese | AlmiPortuguese | learn portuguese, portuguese course
product:italian | AlmiItalian | learn italian, italian course, italian citizenship language test
product:dutch | AlmiDutch | learn dutch, inburgering exam, dutch course
product:icelandic | AlmiIcelandic | learn icelandic, icelandic course
product:danish | AlmiDanish | learn danish, danish test, danish course
product:norwegian | AlmiNorwegian | learn norwegian, norwegian course, norskprove
product:swedish | AlmiSwedish | learn swedish, swedish course, sfi swedish
product:swiss | AlmiSwiss | swiss citizenship test, c permit switzerland, learn swiss german
product:visibility | AlmiVisibility | keyword research tool, free seo checker, website audit, seo site checker, ai search visibility, rank in chatgpt, google ai overviews seo, perplexity seo, answer engine optimization, generative engine optimization, youtube seo, local seo, seo for restaurants, seo for small business, how to get my restaurant on google, free seo check for my website, how to rank in chatgpt
# The general keyword database — after the products, every 60 days (one request per seed per location)
category:shopping | Shopping | shoes, clothes, mobile phones, laptops, furniture, jewellery, cosmetics, perfume, watches, baby products
category:food | Food | restaurants, recipes, catering, bakery, food delivery, halal food
category:travel | Travel | hotels, flights, visa, tours, umrah packages, car rental
category:health | Health | dentist, clinic, physiotherapy, fitness, gym, yoga, diet plan, eye care, opticians
category:education | Education | online courses, tutoring, university admission, scholarships, language learning, coding course, ielts, pte, oet
category:jobs | Jobs and careers | jobs, remote jobs, freelance work, cv writing, salary
category:money | Money | insurance, loans, credit card, accounting, money transfer
category:home | Home and property | real estate, apartments for rent, interior design, cleaning services, plumber, electrician, moving company
category:business | Business and tech | web design, seo services, app development, web hosting, digital marketing, ecommerce store
category:events | Events and beauty | wedding photographer, wedding planner, salon, barber, makeup artist
category:charity | Charity | donate, charity school, zakat
# YouTube niches — Google SEARCH volumes, never YouTube's own numbers
youtube:niches | YouTube niches | daily vlog, family vlog, daily life routine, cooking channel, recipe videos, travel vlog, tech review, unboxing, gaming, fitness videos, beauty and makeup, diy, kids videos, study with me, motivation, islamic videos, comedy, pakistani vlog, indian vlog
`;

/** RR-334 · a product group's seeds with the AI's keyword ideas (templates b and d) (each a real search Google then measures), at most the limit */
export function withMoreSeeds(groups, { ideas = {} } = {}) {
  return Object.freeze(groups.map((g) => {
    if (g.kind !== "product") return g;
    const more = (ideas[g.key]?.seeds ?? []).map(normSeed).filter((s) => s && s.length <= SEED_RULES.seedLength);
    const seeds = [...new Set([...g.seeds, ...more])].slice(0, SEED_RULES.productSeeds);
    return seeds.length === g.seeds.length ? g : Object.freeze({ ...g, seeds: Object.freeze(seeds) });
  }));
}
/** a seed as Google receives it and the store keys it: trimmed, lower case, one space */
export const normSeed = (s) => String(s ?? "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
/** what a request asks, as the database knows it: one seed → "q:<seed>" (the finder's, a category's); several → "seeds:<hash>" (a product's,
 * the app's) — so the same question asked by the collector, the finder or the app is the SAME fetch, served from the database */
export const seedKeyOf = (seeds) => (seeds.length === 1 ? `q:${seeds[0]}` : `seeds:${createHash("sha256").update(seeds.join("\n")).digest("hex").slice(0, 16)}`);

/** the owner's list → { ok, groups } or { ok: false, why } (line by line; nothing half-read) */
export function parseSeeds(text) {
  const groups = [], keys = new Set();
  const lines = String(text ?? "").split(/\r?\n/);
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim(); if (!line || line.startsWith("#")) continue;
    const at = `line ${i + 1}`;
    const parts = line.split("|").map((x) => x.trim());
    if (parts.length !== 3) return { ok: false, why: `${at}: write it as  kind:key | Name | seed, seed, seed` };
    const m = /^(product|category|youtube):([a-z0-9-]{1,40})$/.exec(parts[0]);
    if (!m) return { ok: false, why: `${at}: it must start with product:, category: or youtube: and a short key (a–z, 0–9, -)` };
    const id = `${m[1]}:${m[2]}`; if (keys.has(id)) return { ok: false, why: `${at}: ${id} is already in the list` };
    if (!parts[1] || parts[1].length > 60) return { ok: false, why: `${at}: a name of 1–60 characters` };
    const seeds = [...new Set(parts[2].split(",").map(normSeed).filter(Boolean))];
    const max = m[1] === "product" ? SEED_RULES.productSeeds : SEED_RULES.groupSeeds;
    if (!seeds.length) return { ok: false, why: `${at}: at least one seed word` };
    if (seeds.length > max) return { ok: false, why: `${at}: at most ${max} seed words for a ${m[1]} (it has ${seeds.length})` };
    const long = seeds.find((s) => s.length > SEED_RULES.seedLength); if (long) return { ok: false, why: `${at}: a seed of at most ${SEED_RULES.seedLength} characters` };
    keys.add(id); groups.push(Object.freeze({ id, kind: m[1], key: m[2], name: parts[1], seeds: Object.freeze(seeds) }));
  }
  if (!groups.length) return { ok: false, why: "the list is empty" };
  if (groups.length > SEED_RULES.groups) return { ok: false, why: `at most ${SEED_RULES.groups} groups` };
  return { ok: true, groups: Object.freeze(groups) };
}

/**
 * The collector's units of work: one per (product, location) — all its seeds in one request, daily — and one per (seed, location) of a
 * category or YouTube niche, weekly. A unit's id names exactly what it asks Google, so "the same thing twice in a day" is one id twice.
 */
export function unitsOf(groups, { language = "en" } = {}) {
  const out = [];
  for (const g of groups) for (const loc of LOCATIONS) {
    const seedSets = g.kind === "product" ? [g.seeds] : g.seeds.map((s) => [s]);
    for (const seeds of seedSets) {
      const what = g.kind === "product" ? g.id : `${g.id}:${seeds[0]}`;
      out.push(Object.freeze({ id: `${what}|${loc.code}|${language}`, group: g.id, kind: g.kind, cadence: KINDS[g.kind], refreshDays: REFRESH_DAYS[g.kind], product: g.kind === "product" ? g.key : g.id, country: loc.name, seeds: Object.freeze([...seeds]), location: loc.code, geo: loc.geo, language,
        seedKey: seedKeyOf(seeds) }));
    }
  }
  return out;
}
