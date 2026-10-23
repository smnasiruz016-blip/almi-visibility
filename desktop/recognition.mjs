/**
 * 🔴 RR-321 A + G2 · WHO ACCEPTS THE TEST, FROM THE SUBJECT'S OWN LIST (owner, 23 Oct 2026: "the regulator pages must be fixed"):
 *   · the FIRST source is the subject's own "who recognises it" list — every body in every country, with its professions and the score it
 *     asks for. For OET that list is shown by oet.com's page through its own search service in the browser (no page text holds it), so
 *     Visibility uses AlmiOET's OWN copy of it (owned data, with its date) — never a hidden service called by Visibility;
 *   · "countries where it is ACCEPTED" = every country where a NAMED body accepts it (any kind: regulator, employer, university …);
 *   · "countries where it is a REQUIREMENT" = where a health REGULATOR (or a health authority) accepts it — an employer or a school is not a
 *     registration rule (D6: the Philippines is named for employers and schools only, so it is accepted there, never "recognised for
 *     registration");
 *   · ONE PAGE PER REGULATOR RULE: a regulator's professions are sections of its one page (as Ahpra); its title uses the words people search
 *     ("OET score for nurses in Ireland (NMBI)").
 * Pure: the list is handed in.
 */
import { isHealthRegulator } from "./official.mjs";

const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
/* the people of a profession, as people search for them */
export const PEOPLE_WORD = Object.freeze({ nursing: "nurses", medicine: "doctors", dentistry: "dentists", pharmacy: "pharmacists", physiotherapy: "physiotherapists", "occupational therapy": "occupational therapists", radiography: "radiographers", dietetics: "dietitians", optometry: "optometrists", podiatry: "podiatrists", "speech pathology": "speech pathologists", "veterinary science": "vets" });
const THE = new Set(["United Kingdom", "United States", "United Arab Emirates", "Philippines", "Maldives", "Netherlands", "Bahamas", "Gambia", "Czech Republic", "Dominican Republic", "Central African Republic", "Democratic Republic of the Congo", "Republic of the Congo", "Marshall Islands", "Solomon Islands", "Comoros", "Seychelles"]);
/** "in the United Kingdom", "in Ireland" */
export const inCountry = (c) => `${THE.has(c) ? "the " : ""}${c}`;
const REGULATOR_KIND = /healthcare regulator|credentialing/i;
/** a body whose acceptance is a REGISTRATION rule: a health regulator or credentialing body (by the list's own kind), or a health authority
 * of a government (never a visa or education office — official.mjs NOT_HEALTH) */
export const isRegulator = (o) => !/home affairs|immigration|visa|border/i.test(o.name) && (REGULATOR_KIND.test(o.kind ?? "") || ((!o.kind || /^government$/i.test(o.kind)) && isHealthRegulator(o.name)));
export const SUBTESTS = Object.freeze(["listening", "reading", "writing", "speaking"]);
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
/** "Listening B · Reading B · Writing C+ · Speaking B" */
export const gradeLine = (g) => (g ? SUBTESTS.map((s) => `${cap(s)} ${g[s]}`).join(" · ") : null);

/**
 * The list → the countries where it is accepted, those where it is a requirement, and every regulator. Each country carries its bodies by kind
 * so a click shows them (B6).
 */
export function recognitionOf(list, { professions = null } = {}) {
  const items = (list?.items ?? []).filter((o) => o.country);
  const by = new Map();
  for (const o of items) { const c = by.get(o.country) ?? { country: o.country, bodies: [], regulators: [] }; c.bodies.push(o); if (isRegulator(o)) c.regulators.push(o); by.set(o.country, c); }
  const kinds = (xs) => Object.entries(xs.reduce((m, o) => ({ ...m, [o.kind ?? "not said"]: (m[o.kind ?? "not said"] ?? 0) + 1 }), {})).map(([k, n]) => `${n} ${k.toLowerCase()}`).join(", ");
  const accepted = [...by.values()].map((c) => ({ country: c.country, bodies: c.bodies.length, regulators: c.regulators.length, kinds: kinds(c.bodies), names: c.bodies.map((o) => o.name) })).sort((a, b) => b.bodies - a.bodies || a.country.localeCompare(b.country));
  const requirement = accepted.filter((c) => c.regulators > 0);
  const notRequirement = accepted.filter((c) => !c.regulators).map((c) => ({ name: c.country, why: `${c.bodies} named bod${c.bodies === 1 ? "y" : "ies"} accept it there (${c.kinds}) — no health regulator, so it is accepted there but is no registration rule` }));
  /* a regulator once per country (the list can name one twice) */
  const seen = new Set(), regulators = [];
  for (const c of by.values()) for (const o of c.regulators) { const k = `${o.country}|${o.name.toLowerCase()}`; if (seen.has(k)) continue; seen.add(k); regulators.push({ ...o, professions: (o.professions ?? []).filter((p) => !professions || professions.includes(p)) }); }
  return { source: list?.source ?? null, on: list?.listOn ?? null, page: list?.page ?? null, accepted, requirement, notRequirement, regulators, leftOut: list?.leftOut ?? [] };
}

/** the people of a regulator's professions, in a title: "nurses", "doctors and dentists", "doctors, nurses and 10 more" */
export function peopleOf(professions) {
  const w = professions.map((p) => PEOPLE_WORD[p] ?? p);
  if (w.length <= 2) return w.join(" and ");
  const order = ["nurses", "doctors", ...w.filter((x) => x !== "nurses" && x !== "doctors")].filter((x) => w.includes(x));
  return `${order.slice(0, 2).join(", ")} and ${w.length - 2} more`;
}
/** a regulator page's title in the words people search — "OET score for nurses in Ireland (NMBI)"; at most 70 characters, never cut */
export function regulatorTitle(subject, r) {
  const name = r.name.replace(/\s*\([^)]*\)\s*$/, "").replace(/^(\S+)\s+-\s+.*$/, "$1").trim(), who = r.short ?? name, score = r.professions.length > 1 ? "scores" : "score";
  const people = r.professions.length ? peopleOf(r.professions) : "health professionals", few = r.professions.length > 2 ? "health professionals" : people;
  /* "Medical Radiation Practice Board of Australia" in Australia: the board's name without its country, the country said once */
  const stem = name.replace(new RegExp(`\\s+(of|for)\\s+(the\\s+)?${r.country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "");
  const tries = [`${subject} ${score} for ${people} in ${inCountry(r.country)} (${who})`, `${subject} ${score} for ${people}: ${name}`, `${subject} for ${people} in ${inCountry(r.country)}: ${stem}`, `${subject} for ${few}: ${name}`, `${subject} for ${few} in ${inCountry(r.country)}: ${stem}`, `${subject}: ${name}`];
  return tries.find((t) => t.length <= 70) ?? tries.at(-1);
}

/**
 * ONE PAGE PER REGULATOR RULE — and the pairs (country × profession) its rules cover. `professions` = the subject's professions (OET's 12).
 */
export function regulatorPagesOf(rec, { subject, professions }) {
  const pages = rec.regulators.filter((r) => r.professions.length).map((r) => ({
    kind: "regulator", title: regulatorTitle(subject, r), body: r.name, short: r.short, country: r.country, professions: r.professions, grade: r.grade, website: r.website, record: r.record ?? null, listId: r.id,
    claims: [listClaim(subject, r, rec)].filter(Boolean),
    why: `${subject}'s own list names ${r.name} as accepting ${subject} for ${r.professions.join(", ")}${r.grade ? ` (${gradeLine(r.grade)})` : " — the list states no score"}`,
    source: { url: rec.page, title: `${subject}'s list of organisations that recognise it` }, checkedOn: rec.on, questions: [] }));
  const noProfession = rec.regulators.filter((r) => !r.professions.length).map((r) => ({ name: `${r.name} (${r.country})`, why: "the list names none of the professions for it" }));
  const pairs = new Map();
  for (const p of pages) for (const prof of p.professions) { const k = `${p.country}|${prof}`; pairs.set(k, [...(pairs.get(k) ?? []), p.body]); }
  const countries = rec.requirement.map((c) => c.country), combos = countries.flatMap((c) => professions.map((p) => ({ country: c, profession: p })));
  const notAccepted = combos.filter((x) => !pairs.has(`${x.country}|${x.profession}`)).map((x) => ({ name: `${x.profession} in ${x.country}`, why: `no regulator in ${subject}'s list accepts ${subject} for ${x.profession} in ${x.country}` }));
  return { pages, pairs: [...pairs.entries()].map(([k, bodies]) => { const [country, profession] = k.split("|"); return { country, profession, bodies }; }), combos: combos.length, notAccepted, noProfession };
}
/** what the list itself says about a body — the list's own facts (owned data) with its address and date; never a regulator's page */
export function listClaim(subject, r, rec) {
  if (!rec?.page || !rec?.on) return null;
  const text = `${subject}'s own list of recognising organisations names ${r.name} as accepting ${subject} for ${r.professions.map((p) => PEOPLE_WORD[p] ?? p).join(", ")}${r.grade ? ` — ${gradeLine(r.grade)}` : ""}.`;
  return { claimId: `list-${r.listId ?? r.id ?? r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, text, link: rec.page, readOn: rec.on, source: `${subject}'s list (AlmiOET's copy, read ${rec.on})`, official: true, body: subject, fromList: true };
}
export const countLine = (rec, subject) => `${fmt(rec.accepted.length)} countries where a named body accepts ${subject} · ${fmt(rec.requirement.length)} where a health regulator does (${subject}'s own list, AlmiOET's copy read ${rec.on})`;
