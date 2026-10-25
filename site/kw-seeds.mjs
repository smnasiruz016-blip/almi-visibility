/**
 * 🔴 RR-326 B + G · THE COLLECTOR'S SEED LIST — ONE editable list the owner changes on his own page (/owner), kept in the database; this
 * file holds only the FIRST list (the default) and the rules a list must keep.
 *   · one group per line:  kind:key | Name | seed, seed, seed
 *       product:<key>   an AlmiWorld product (almi-data's family list) — its seeds go to Google in ONE request per location, EVERY DAY
 *       category:<key>  a category of products, services or websites — one request per seed per location, refreshed at least WEEKLY
 *       youtube:<key>   YouTube niches — Google SEARCH volumes only (never YouTube's own numbers), weekly like a category
 *     a line starting with # is a note.
 *   · the locations: "all locations" and the owner's 18 countries — Google's own criterion ids, read from Google's geotargets file of
 *     2026-10-06 (developers.google.com/google-ads/api/data/geotargets);
 *   · the language: English (Google's languageConstants/1000). Urdu, Hindi and Arabic seeds come later, when the owner says.
 * Pure: no store, no network.
 */
import { createHash } from "node:crypto";

export const LANGUAGES = Object.freeze({ en: Object.freeze({ name: "English", constant: "languageConstants/1000" }) });
export const LOCATIONS = Object.freeze([
  ["ALL", "All locations", null], ["PK", "Pakistan", 2586], ["IN", "India", 2356], ["PH", "Philippines", 2608], ["NG", "Nigeria", 2566],
  ["KE", "Kenya", 2404], ["EG", "Egypt", 2818], ["BD", "Bangladesh", 2050], ["NP", "Nepal", 2524], ["GB", "United Kingdom", 2826],
  ["IE", "Ireland", 2372], ["AU", "Australia", 2036], ["NZ", "New Zealand", 2554], ["US", "United States", 2840], ["CA", "Canada", 2124],
  ["AE", "United Arab Emirates", 2784], ["SA", "Saudi Arabia", 2682], ["QA", "Qatar", 2634], ["SG", "Singapore", 2702],
].map(([code, name, id]) => Object.freeze({ code, name, geo: id === null ? null : `geoTargetConstants/${id}` })));
export const locationOf = (code) => LOCATIONS.find((l) => l.code === String(code ?? "").toUpperCase()) ?? null;

export const KINDS = Object.freeze({ product: "daily", category: "weekly", youtube: "weekly" });
export const SEED_RULES = Object.freeze({ productSeeds: 20, groupSeeds: 60, groups: 80, seedLength: 80 });

/* the FIRST list (RR-326 B: the 24 products of almi-data's family list; G: the owner's categories and YouTube niches, his words) */
export const DEFAULT_SEEDS = `# AlmiWorld's own products — collected first, every day (one request per location with all the product's seeds)
product:jobs | AlmiJob | jobs abroad, job search, visa sponsorship jobs, overseas jobs
product:salary | Salary Checker | salary checker, salary calculator, average salary
product:cv | AlmiCV | cv maker, resume builder, cv template, cv format
product:study | AlmiStudy | study abroad, scholarships, university admission
product:prep | AlmiPrep | ielts, ielts preparation, ielts practice test
product:pte | AlmiPTE | pte exam, pte practice, pte academic
product:toefl | AlmiTOEFL | toefl, toefl practice test, toefl exam
product:oet | AlmiOET | oet, oet exam, oet practice test, oet nursing
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
product:visibility | AlmiVisibility | seo tool, keyword research tool, ai visibility
# The general keyword database — refreshed at least once a week (one request per seed per location)
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
      out.push(Object.freeze({ id: `${what}|${loc.code}|${language}`, group: g.id, kind: g.kind, cadence: KINDS[g.kind], seeds: Object.freeze([...seeds]), location: loc.code, geo: loc.geo, language,
        seedKey: seedKeyOf(seeds) }));
    }
  }
  return out;
}
