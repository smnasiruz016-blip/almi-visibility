/**
 * 🔴 RR-320 D · UNIVERSITY PAGES FROM ALMISTUDY'S FULL DATA (owner, 23 Oct 2026: "ONE page per university, with all destination countries
 * inside it — what its graduates need for each. A few thousand pages, not 72,000"). The FUNNEL the client sees:
 *   all universities (the list) → teach healthcare (the list's own subjects first, then the university's OWN site) → facts found per
 *   destination (a regulator's own page for a profession it teaches) → search evidence (the client's Search Console names it) → pages.
 * RR-319 found 0 because a university names OET on its COURSE pages (nursing, medicine …), not its general English page: Visibility reads
 * the university's own course pages — from its sitemap, else its home page's links — robots obeyed, paced, a few per run.
 * Degree-recognition directories: used only where their terms allow reuse — none found yet, so a page gives a "check here" link to the
 * official directory, never its content. A fact no official page states is "official page checked <date>, does not say".
 */
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, word) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(word)}(?![\\p{L}\\p{N}])`, word.length <= 3 ? "u" : "iu").test(String(text ?? ""));

/* the subject names in a list (AlmiStudy's own wording: "Nursing", "Pharmacy", "Veterinary Medicine" …) → the professions a test is for */
const FIELD_PROFESSION = [[/\bnurs|midwi/i, "nursing"], [/^medicine$|\bmbbs\b|medical school|^human medicine|^general medicine/i, "medicine"], [/\bdent|stomatolog/i, "dentistry"], [/\bpharma/i, "pharmacy"], [/\bphysiotherap|physical therap/i, "physiotherapy"], [/\boccupational therap/i, "occupational therapy"], [/\bradiograph|medical imaging|radiolog/i, "radiography"], [/\bdietet|dietitian|nutrition/i, "dietetics"], [/\boptom/i, "optometry"], [/\bpodiat/i, "podiatry"], [/\bspeech/i, "speech pathology"], [/\bveterin/i, "veterinary science"]];
const HEALTH_FIELD = /medic|health|nurs|pharm|dent|veterin|physio|therap|midwi|optom|radiog|diet|nutrition|podiat|speech|stomatolog/i;
/** the professions a university teaches, as its list names them ([] = healthcare, which professions not named) */
export const professionsOfFields = (fields = []) => [...new Set(fields.flatMap((f) => FIELD_PROFESSION.filter(([re]) => re.test(String(f).trim())).map(([, p]) => p)))];
/* a client's own list names its subjects in its "subjects" column; AlmiStudy's in "fields" (its "subjects" are slugs) */
const fieldsOf = (u) => u.fields ?? u.subjects ?? [];
export const teachesHealth = (u) => fieldsOf(u).some((f) => HEALTH_FIELD.test(f)) || (u.subjects ?? []).some((s) => /medicine-health/.test(s));

/* the words of a university's name that are its own (never "University", "College", "of", nor its city) */
const GENERIC = new Set(["university", "universitas", "universidad", "universidade", "universite", "université", "universita", "università", "universiti", "college", "institute", "institut", "instituto", "school", "faculty", "academy", "of", "the", "and", "for", "de", "del", "di", "la", "le", "des", "do", "da", "national", "state", "federal", "public", "medical", "health", "healthcare", "care", "nursing", "pharmacy", "pharmaceutical", "medicine", "veterinary", "dental", "dentistry", "sciences", "science", "technology", "polytechnic", "international", "central", "royal"]);
const ownWords = (u) => String(u.name).replace(/\([^)]*\)/g, " ").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERIC.has(w) && w !== String(u.city ?? "").toLowerCase());
const shortName = (u) => /\(([A-Z][A-Za-z-]{1,9})(?:\s*\/[^)]*)?\)/.exec(u.name)?.[1] ?? null;
/** the client's searches that name this university (its own words all, or its short name in brackets) */
export function searchesNaming(u, queries = []) {
  const own = ownWords(u), short = shortName(u);
  return queries.filter((q) => (own.length && own.every((w) => has(q, w))) || (short && short.length >= 3 && has(q, short)));
}

/* a COURSE page of a health profession, by its address: the profession's word in its last two parts, and a study word or a school name */
const COURSE_WORD = /cours|program|degree|stud(y|ies)|undergrad|postgrad|bachelor|master|bsc|msc|mbbs|school|faculty|department|nursing|medicine|pharmacy|dentistry/i;
const NOT_COURSE = /news|video|gallery|photo|album|announcement|notice|tag|search|event|blog|staff|people|profile|research-?(project|group|centre)|story|stories|press|media|alumni|calendar|job|vacanc|career|tender|\.(jpg|png|pdf|docx?)$/i;
function courseProfession(url) {
  let p; try { p = decodeURIComponent(new URL(url).pathname).toLowerCase(); } catch { return null; }
  if (NOT_COURSE.test(p)) return null;
  const tail = p.split("/").filter(Boolean).slice(-2).join("/");
  const prof = FIELD_PROFESSION.find(([re]) => re.test(tail.replace(/[-_]/g, " ").replace(/\bmedicine\b/, "medicine")))?.[1] ?? (/\b(medicine|mbbs|md)\b/.test(tail.replace(/[-_/]/g, " ")) ? "medicine" : null);
  return prof && COURSE_WORD.test(p) ? prof : null;
}
/**
 * One university's OWN site: its home page (robots obeyed), then its health course pages — from its sitemap, else the home page's links —
 * at most `maxCourses`, one per profession first. → { state: READ | ROBOTS | UNREADABLE, why, courses: [{ url, title, profession, readOn,
 * namesSubject }] }
 */
export async function coursePagesOf({ u, reader, subject, maxCourses = 3 }) {
  if (!u.page) return { state: "NO_SITE", why: "the list gives no website", courses: [] };
  const home = await reader.read(u.page);
  if (!home.ok) return { state: /robots/.test(home.why ?? "") ? "ROBOTS" : "UNREADABLE", why: home.why, checkedOn: home.checkedOn, courses: [] };
  let origin, under = "/"; try { origin = new URL(home.url).origin; under = new URL(u.page).pathname.replace(/[^/]*$/, ""); } catch { return { state: "UNREADABLE", why: "not a web address", courses: [] }; }
  /* a university listed at a part of a shared site (host/uni-a/) keeps to its own part */
  const mine = (h) => { try { const x = new URL(h); return x.origin === origin && x.pathname.startsWith(under); } catch { return false; } };
  const fromLinks = (home.links ?? []).map((l) => l.href).filter(mine);
  let cands = [...new Set(fromLinks)].map((url) => ({ url, profession: courseProfession(url) })).filter((x) => x.profession);
  if (cands.length < maxCourses && reader.sitemapOf) { const sm = await reader.sitemapOf(origin).catch(() => null); cands = [...cands, ...(sm?.urls ?? []).filter(mine).map((url) => ({ url, profession: courseProfession(url) })).filter((x) => x.profession && !cands.some((c) => c.url === x.url))]; }
  /* one per profession first, the shortest address of each (a course's own page before its sub-pages) */
  const byProf = new Map(); for (const c of cands.sort((a, b) => a.url.length - b.url.length)) if (!byProf.has(c.profession)) byProf.set(c.profession, c);
  const pick = [...byProf.values(), ...cands.filter((c) => ![...byProf.values()].includes(c))].slice(0, maxCourses);
  const courses = [];
  for (const c of pick) { const r = await reader.read(c.url); if (r.ok && courseProfession(r.url)) courses.push( /* RR-320 proof: a link that moved to the home page is no course page */{ url: r.url, title: r.title ?? r.h1 ?? c.url, profession: c.profession, readOn: r.checkedOn, namesSubject: has(`${r.title} ${r.text}`, subject) }); }
  return { state: "READ", checkedOn: home.checkedOn, courses, homeNamesSubject: has(home.text, subject), found: cands.length };
}

/* RR-320 D: the official degree-recognition directories — no permission to reuse their data was found, so a page only links "check here" */
export const RECOGNITION_DIRECTORIES = Object.freeze([
  Object.freeze({ professions: ["medicine"], name: "World Directory of Medical Schools (WFME and FAIMER)", url: "https://search.wdoms.org/", reuse: false, line: "Check here whether this medical school is listed. Visibility links to the directory and copies nothing from it: no permission to reuse its data was found." }),
]);

/**
 * THE FUNNEL over the client's university list. `queries` = his Search Console searches; `countryWeight` = searches per country (Search
 * Console's country dimension) — the universities people search for are read first, then those in the countries the searches come from.
 */
export async function universityFunnel({ all, reader, subject, queries = [], countryWeight = {}, maxReads = 30, tell = () => {} }) {
  const health = all.filter(teachesHealth);
  const pool = health.map((u) => ({ u, professions: professionsOfFields(fieldsOf(u)), searched: searchesNaming(u, queries) }));
  const order = [...pool].sort((a, b) => b.searched.length - a.searched.length || (countryWeight[b.u.country] ?? 0) - (countryWeight[a.u.country] ?? 0) || b.professions.length - a.professions.length || String(a.u.name).localeCompare(String(b.u.name)));
  const read = [], notRead = [];
  for (const [i, x] of order.entries()) {
    if (i >= maxReads) { notRead.push({ name: x.u.name, country: x.u.country, why: "not read in this run (Visibility reads a few at a time, slowly)" }); continue; }
    tell(`Reading ${x.u.name}'s own course pages (${i + 1} of ${Math.min(order.length, maxReads)})`);
    /* RR-320 proof: one university's odd site (a robots rule that broke a pattern) stopped the whole count — one site's error is that site's */
    const c = await coursePagesOf({ u: x.u, reader, subject }).catch((e) => ({ state: "UNREADABLE", why: `its site could not be read (${String(e?.message ?? e).slice(0, 80)})`, courses: [] }));
    read.push({ ...x, site: c });
  }
  const entry = (x) => ({ name: x.u.name, country: x.u.country, city: x.u.city ?? null, page: x.u.page, type: x.u.type ?? null, fields: fieldsOf(x.u).slice(0, 12), professions: [...new Set([...x.professions, ...(x.site?.courses ?? []).map((c) => c.profession)])], listProfessions: x.professions, accreditation: x.u.accreditation ?? null, verifiedOn: x.u.verifiedOn ?? null, listSource: x.u.source ?? null, searched: x.searched, site: x.site ?? null });
  const withCourse = read.filter((x) => x.site.courses.length);
  return {
    candidates: all.length, health: health.length, specific: pool.filter((x) => x.professions.length).length,
    pool: pool.map((x) => ({ name: x.u.name, country: x.u.country, professions: x.professions, searched: x.searched.length })),
    read: read.map(entry), kept: withCourse.map((x) => ({ ...entry(x), source: { url: x.site.courses[0].url, title: x.site.courses[0].title }, checkedOn: x.site.courses[0].readOn, how: `its own site lists ${[...new Set(x.site.courses.map((c) => c.profession))].join(", ")} course pages${x.site.courses.some((c) => c.namesSubject) ? ` and names ${subject} on one` : ""}` })),
    dropped: read.filter((x) => !x.site.courses.length).map((x) => ({ name: x.u.name, country: x.u.country, state: x.site.state, why: x.site.state === "READ" ? `its own site was read (${x.site.checkedOn}) — no health course page found on it` : x.site.state === "ROBOTS" ? `${x.site.why}` : x.site.state === "NO_SITE" ? x.site.why : `its own site could not be read (${x.site.why})` })),
    notRead, inScope: health.length,
    blocked: { robots: read.filter((x) => x.site.state === "ROBOTS").length, unreadable: read.filter((x) => x.site.state === "UNREADABLE").length, noSite: read.filter((x) => x.site.state === "NO_SITE").length },
    namesSubject: withCourse.filter((x) => x.site.courses.some((c) => c.namesSubject) || x.site.homeNamesSubject).length,
    searched: pool.filter((x) => x.searched.length).length,
  };
}
