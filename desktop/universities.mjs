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
const NOT_COURSE = /\/(19|20)\d\d\/\d\d\/|officials?\b|news|video|gallery|photo|album|announcement|notice|tag|search|event|blog|staff|people|profile|research-?(project|group|centre)|story|stories|press|media|alumni|calendar|job|vacanc|career|tender|\.(jpg|png|pdf|docx?)$/i; // RR-320 proof: a dated news post and a staff list were taken as course pages
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

/*
 * 🔴 RR-322 A1 · THE LIGHT CHECK (owner: "the other 2,197 say only 'medicine & health sciences' — read ONE page of the university's own site
 * (its faculties or schools list), robots obeyed, no deep crawl, in the background, in batches"). The home page is read to find that list;
 * its own menu often names the faculties already ("Faculty of Nursing"). When it does not, the ONE page its menu calls "Faculties",
 * "Schools" or "Academics" is read — never more than two pages of a site. A profession counts only from a SHORT link or heading that names a
 * faculty, school or programme of it (a news headline never counts).
 */
/* the profession's word in the languages universities write their faculty names in (English, Spanish, Portuguese, French, German, Italian,
 * Indonesian/Malay, Turkish, Arabic) — dentistry before medicine ("Kedokteran Gigi" is dentistry, not medicine) */
const PROF_WORD = [[/\bdent(al|istry)\b|\bstomatolog|odontolog|kedokteran gigi|diş hekimli|zahnmedizin|طب الأسنان/i, "dentistry"], [/\bveterinar|kedokteran hewan|veteriner|tierärzt|الطب البيطري/i, "veterinary science"], [/\bnurs(e|es|ing)\b|\bmidwi(fe|ves|fery)\b|enfermer|enfermagem|keperawatan|kebidanan|hemşirelik|infirmi|pflegewissenschaft|infermierist|تمريض/i, "nursing"], [/\bmedicine\b|\bmedical (school|faculty|college|sciences?)\b|\bmbbs\b|\bmedicina\b|kedokteran|\btıp\b|médecine|\bmedizin\b|كلية الطب/i, "medicine"], [/\bpharma(cy|ceutical)|\bfarmac|\bfarmasi|eczacılık|pharmazie|صيدلة/i, "pharmacy"], [/\bphysiotherap|\bphysical therap|fisioterap|fizyoterapi|kinésithérap|kinesiolog/i, "physiotherapy"], [/\boccupational therap|terapia ocupacional|ergoterap|ergotherap/i, "occupational therapy"], [/\bradiograph|\bmedical imaging\b|\bradiolog|imagenolog/i, "radiography"], [/\bdietetic|\bnutrition\b|\bdietitian|nutrición|nutrição|\bgizi\b|beslenme ve diyet/i, "dietetics"], [/\boptometr/i, "optometry"], [/\bpodiatr|podolog/i, "podiatry"], [/\bspeech (and language )?(therap|patholog)|fonoaudiolog|logopäd|logoped|orthophon/i, "speech pathology"]];
/* a role that supports a profession is not it ("Veterinary Technology", "Pharmacy Technician", "Dental Assistant") */
const SUPPORT_WORD = /\b(technolog(y|ist)|technician|assistant|aide|hygien|nursing home|news|event|story|award|students? (win|won))\b/i;
const UNIT = /\b(facult(y|ies)|school|college|department|institute|programmes?|programs?|bachelor|degree|b\.?sc|course|division|centre|center)\b|facultad|faculdade|faculté|fakult|fakülte|escuela|escola|program studi|prodi|jurusan|كلية/i;
const LIST_LINK = /^(our )?(facult(y|ies)|schools?( (and|&) (colleges|faculties))?|colleges|academics?|academic units|departments|study programmes|programs|facultades|faculdades|facultés|fakultas|fakultäten|fakülteler|escuelas|كليات|الكليات)$/i;
/* the university's own name ("Kurdistan University of Medical Sciences", "Medical University of …") */
const NAME_PROF = [[/\bmedical (university|sciences?|college)|university of medicine|\bmedical school|\bschool of medicine/i, "medicine"], [/\bnursing (college|school|university)|college of nursing/i, "nursing"], [/\bpharmac(y|eutical) (university|college)|college of pharmacy/i, "pharmacy"], [/\bdental (college|school|university)/i, "dentistry"]];
export const professionsInName = (name) => [...new Set(NAME_PROF.filter(([re]) => re.test(String(name ?? ""))).map(([, p]) => p))];
/** the professions a page's own menu or headings name as one of its faculties, schools or programmes (each with the words it used) */
export function professionsOnPage(page) {
  const lines = [...(page.links ?? []).map((l) => l.text), ...String(page.headings ?? "").split("\n")].map((t) => String(t ?? "").replace(/\s+/g, " ").trim()).filter((t) => t.length >= 4 && t.length <= 70);
  const found = new Map();
  /* every profession a line names ("School of Medicine, Dentistry and Health Sciences"); a word that matched is taken out first, so
   * "Kedokteran Gigi" (dentistry) is never also "Kedokteran" (medicine) */
  for (const t of lines) { if (SUPPORT_WORD.test(t) || !(UNIT.test(t) || t.split(" ").length <= 3)) continue; let s = t; for (const [re, p] of PROF_WORD) if (re.test(s)) { if (!found.has(p)) found.set(p, t); s = s.replace(new RegExp(re.source, "gi"), " "); } }
  return [...found.entries()].map(([profession, words]) => ({ profession, words }));
}
export async function lightCheck({ u, reader }) {
  const byName = professionsInName(u.name);
  if (byName.length) return { state: "FOUND", professions: byName, words: [u.name], source: { url: u.page ?? null, title: "the university's own name (AlmiStudy's list)" }, checkedOn: u.verifiedOn ?? null, byName: true };
  if (!u.page) return { state: "NO_SITE", why: "the list gives no website", professions: [] };
  const home = await reader.read(u.page);
  if (!home.ok) return { state: /robots/.test(home.why ?? "") ? "ROBOTS" : home.blocked || /answered 403/.test(home.why ?? "") ? "BLOCKED" : "UNREADABLE", why: home.why, checkedOn: home.checkedOn, professions: [] };
  let page = home, ps = professionsOnPage(home);
  if (!ps.length) {
    let host = ""; try { host = new URL(home.url).hostname; } catch {}
    const list = (home.links ?? []).find((l) => LIST_LINK.test(String(l.text ?? "").trim()) && (() => { try { return new URL(l.href).hostname === host; } catch { return false; } })());
    if (list) { const r = await reader.read(list.href); if (r.ok) { page = r; ps = professionsOnPage(r); } }
  }
  return ps.length ? { state: "FOUND", professions: ps.map((x) => x.profession), words: ps.map((x) => x.words), source: { url: page.url, title: page.title }, checkedOn: page.checkedOn }
    : { state: "NONE", why: `its own ${page === home ? "home page" : "faculties page"} (checked ${page.checkedOn}) names no faculty or school of a health profession`, professions: [], source: { url: page.url }, checkedOn: page.checkedOn };
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
