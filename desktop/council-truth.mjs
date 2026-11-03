/**
 * 🔴 RR-366 Part 1 · A COUNCIL LINE MUST BE TRUE (recipe R12). beta-g, 2 Nov 2026: the India page said "Indian Dietetic Association registers dietitians", "Indian Society of Radiographers & Technologists registers radiographers".
 * Associations do not register anyone. A line says "registers" only when that body's OWN page says it registers, licenses or regulates that profession. A body named association, society or confederation needs its own page to say
 * it IS the regulator (Ireland's pharmacy regulator is named a society, in law). Otherwise the real regulator is searched for by its same-meaning names; not found, the line is an honest open question with the page checked and its date. Never invented.
 * The page's text is read only to decide, never kept. Pure apart from the `read` and `search` handed in.
 */
const WORDS = Object.freeze({ nursing: /\bnurs(?:e|es|ing)\b|\bmidwi/i, medicine: /\bdoctors?\b|\bphysicians?\b|\bmedical practitioners?\b|\bmedicine\b|\bmedical\b/i, dentistry: /\bdentists?\b|\bdentistry\b|\bdental\b/i, pharmacy: /\bpharmac/i, physiotherapy: /\bphysiotherap|\bphysical therap/i, "occupational therapy": /\boccupational therap/i, radiography: /\bradiograph|\bradiolog|\bmedical radiation\b|\bimaging technolog/i, dietetics: /\bdietiti|\bdietici|\bdietetic|\bnutritionists?\b/i, optometry: /\boptomet/i, podiatry: /\bpodiatr|\bchiropod/i, "speech pathology": /\bspeech\b|\baudiolog/i, "veterinary science": /\bveterinar/i });
const DUTY = /\bregist(?:er|ers|ered|ering|ration)\b|\blicen[cs](?:e|es|ed|ing)\b|\bregulat(?:e|es|ed|ing|or|ors|ory|ion)\b|\bstatutory\b/i;
/* registering for an event, an account or a membership is no registering of a profession */
const NOT_THE_DUTY = /\bmembers?(?:hip)?\b|\bconferences?\b|\bwebinars?\b|\bworkshops?\b|\bseminars?\b|\bcourses?\b|\bevents?\b|\blog ?in\b|\bsign ?in\b|\baccounts?\b|\bnewsletter\b|\bonline registration\b|\bpassword\b/i;
export const NOT_A_REGISTRAR = /\b(?:association|society|confederation|federation|union|academy|guild|forum|chamber|foundation)\b/i;
/* such a body must say it IS the legal regulator: "is the statutory pharmacy regulator". "a self-regulatory body", "a representative and regulatory body", "peer regulating" (the Optometry Confederation of India's own words, read 2 Nov 2026) say the opposite: anywhere on its page they settle it */
const SAYS_IT_IS = /\b(?:is|are) (?:the|a|an) (?:[\w-]+ ){0,4}statutory\b|\bstatutory (?:regulator|regulatory|body|authority)\b|\b(?:is|are) the (?:[\w-]+ ){0,3}regulators?\b|\bwe regulate\b/i;
const NOT_THE_LAW = /\bself[- ]regulat\w*|\brepresentative and regulatory\b|\bpeer[- ]regulat\w*|\bprivate\b[^.]{0,40}\bregulat\w*|\bnot[- ]for[- ]profit\b|\bSection 8\b|\bprofessional association\b/i;
/* a page's text often has no full stops (menus, notices): a duty word and the profession close together, with no membership or event beside them */
const REACH = 90;
const windows = (t) => { const s = String(t ?? "").replace(/\s+/g, " "), out = []; for (const m of s.matchAll(new RegExp(DUTY.source, "gi"))) out.push(s.slice(Math.max(0, m.index - REACH), m.index + m[0].length + REACH)); return out; };
const FIND = /\b(?:about|who we are|mandate|mission|functions?|what we do|our role|regist|licen[cs]|the act\b|legislation)\b/i;
export const SAME_MEANING_NAMES = "council commission board authority ministry office";

/** does this page's text say its body registers, licenses or regulates this profession? */
export function statesRegistration(text, profession, { strict = false } = {}) {
  const who = WORDS[profession]; if (!who) return false;
  if (strict && NOT_THE_LAW.test(String(text))) return false;
  return windows(text).some((s) => who.test(s) && !NOT_THE_DUTY.test(s) && (!strict || SAYS_IT_IS.test(s)));
}
const titled = (p) => `${p.title ?? ""}. ${p.h1 ?? ""}. ${p.text ?? ""}`;
/** the body's own pages (the one the collectors read, its website, and at most `extra` pages named like "about" on them) → { ok, evidence } or { ok: false, why, page } */
export async function checkCouncil({ name, profession, link, website = null, read, on, extra = 3 }) {
  const strict = NOT_A_REGISTRAR.test(String(name)), seen = new Set(), queue = [...new Set([link, website].filter((u) => /^https?:\/\//.test(u ?? "")))], first = queue[0] ?? null; let readAny = false, more = extra;
  while (queue.length) {
    const u = queue.shift(); if (seen.has(u)) continue; seen.add(u);
    const p = await Promise.resolve(read(u)).catch(() => null); if (!p?.ok) continue; readAny = true;
    if (statesRegistration(titled(p), profession, { strict })) return { ok: true, evidence: p.url ?? u, on, strict };
    for (const l of p.links ?? []) { if (more <= 0) break; if (seen.has(l.href) || queue.includes(l.href) || !/^https?:/.test(l.href)) continue; let same = false; try { same = new URL(l.href).hostname.replace(/^www\./, "") === new URL(u).hostname.replace(/^www\./, ""); } catch { /* not an address */ } if (same && FIND.test(`${l.text ?? ""} ${l.href}`)) { queue.push(l.href); more--; } }
  }
  return { ok: false, why: !readAny ? "unread" : strict ? "association" : "not stated", page: first, on };
}
const BODY_IN_TITLE = /\b(?:council|commission|board|authority|ministry|registry|regulator)\b/i;
/** the real regulator, by the same-meaning names: Google's results (through the capped route, when the client switched it on), each page read and judged the same way. Found only when its own page says so */
export async function findRegulator({ people, profession, place, search, read, on }) {
  if (!search) return null;
  const results = await Promise.resolve(search(`${people} registration ${SAME_MEANING_NAMES} ${place}`)).catch(() => []);
  for (const r of (results ?? []).slice(0, 5)) {
    const p = await Promise.resolve(read(r.url)).catch(() => null); if (!p?.ok || !statesRegistration(titled(p), profession) || !new RegExp(String(place).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(titled(p))) continue;
    const name = String(p.title ?? r.title ?? "").split(/\s[|–—-]\s|\s::\s/).map((x) => x.trim()).find((x) => BODY_IN_TITLE.test(x) && !NOT_A_REGISTRAR.test(x) && x.length <= 90); if (name) return { name, link: p.url ?? r.url, on };
  }
  return null;
}
export const openLine = ({ name, people, place, why, on }) => (why === "unread" ? `Who registers ${people} in ${place} is still an open question: ${name}'s own page could not be read on ${on}.` : why === "association" ? `${name} is a professional body, not shown here as the registering body: its own page, checked ${on}, does not say it registers ${people}. Who registers ${people} in ${place} is still an open question.` : `Who registers ${people} in ${place} is still an open question: ${name}'s own page, checked ${on}, does not say it registers them.`);
/* 🔴 RR-367 R-A + R-B (owner, 3 Nov 2026): an office not confirmed as the registering body, with an address or contact from a real source, is SHOWN with that source and date. It is no open question. One office may serve several professions: it stands on every page it serves. It never says "registers" unless the body's own page does */
export const officeLine = ({ name, people, place, address = null, website = null, professional = false }) => `Office for ${people} in ${place}: ${name}${professional ? " (a professional body)" : ""}${address ? `, ${String(address).replace(/[.\s]+$/, "")}` : ""}${website ? ` — ${website}` : ""}. Whether it is the registering body is not confirmed yet.`;
export const OPEN_QUESTION = (place) => `Which councils are not confirmed yet in ${place}?`;
const stateCouncil = (name) => /\bState\b/.test(String(name)) && !/\bStates\b/.test(String(name));
const keyOf = (f) => `${f.country}|${f.profession}|${f.councilName ?? f.text}`;
export const councilKey = (country, profession, name) => `${country}|${profession}|${name}`;
/**
 * The council facts as a page may show them. `checks` = { key: verdict }. With no check at all (no reading was possible) the line stands, unless its body is an association, which is never shown as registering on trust.
 * → { facts, changes: [{ country, profession, before, after, source, on }] }
 */
export function councilFacts(facts = [], checks = null, { inPlace = (c) => c, peopleOf = (p) => p, today = null } = {}) {
  const changes = [], out = facts.flatMap((f) => {
    if (f.part !== "home-council" || !f.profession) return [f];
    const name = f.councilName ?? String(f.text).split(/ registers /)[0], c = checks?.[keyOf({ ...f, councilName: name })] ?? null, place = inPlace(f.country), people = peopleOf(f.profession), on = c?.on ?? today ?? f.on;
    const open = (why, page) => { if (f.address || f.website) { const text = officeLine({ name, people, place, address: f.address, website: f.website, professional: NOT_A_REGISTRAR.test(name) }); changes.push({ country: f.country, profession: f.profession, before: f.text, after: text, source: f.link, on: f.on, why }); return [{ ...f, text, office: true, checkedWhy: why, checkedOn: on }]; } const text = openLine({ name, people, place, why, on }); changes.push({ country: f.country, profession: f.profession, before: f.text, after: text, source: page ?? f.link, on }); return [{ ...f, part: "open-council", text, link: page ?? f.link, on }]; };
    /* the owner's verified facts already hold this body's own page for this profession (GMC refuses our reader, its OET page is in his file) */
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } }, verified = !NOT_A_REGISTRAR.test(name) ? facts.find((x) => x.part === "councils" && x.verified && x.country === f.country && x.profession === f.profession && [host(f.link), host(f.website)].filter(Boolean).includes(host(x.link))) : null;
    if (verified && !c?.ok) { changes.push({ country: f.country, profession: f.profession, before: f.text, after: f.text, source: verified.link, on: verified.on, kept: "its own page could not be read here, but the owner's verified facts hold that page" }); return [{ ...f, link: verified.link, on: verified.on }]; }
    /* the owner reviewed this very line and approved it: it stands, said in the list, unless its body is an association */
    if (f.approved && !NOT_A_REGISTRAR.test(name) && !c?.ok && !c?.found) { changes.push({ country: f.country, profession: f.profession, before: f.text, after: f.text, source: f.link, on: f.on, kept: `the app could not confirm it (${c?.why ?? "not checked"}): it stands on the owner's own approval` }); return [f]; }
    if (!c) return NOT_A_REGISTRAR.test(name) ? open("association", f.link) : [f];
    if (c.found) { const text = `${c.found.name} registers ${people} in ${place}.`; changes.push({ country: f.country, profession: f.profession, before: f.text, after: text, source: c.found.link, on }); return [{ ...f, councilName: c.found.name, text, link: c.found.link, on, body: c.found.name }]; }
    if (!c.ok) return open(c.why, c.page);
    /* the page says so: its link is the source now, not its contact page. A state's council speaks for its own state; a body named a society says on its own page that it is the regulator */
    const text = stateCouncil(name) ? `${name} registers ${people} in its own state of ${place} (other states have their own).` : c.strict ? `${name} registers ${people} in ${place} (its own page says it is the regulator).` : f.text;
    if (text !== f.text) changes.push({ country: f.country, profession: f.profession, before: f.text, after: text, source: c.evidence, on });
    return [{ ...f, text, link: c.evidence, on }];
  });
  return { facts: out, changes };
}
/** a council line the page itself holds that an association "registers" on no one's word → the reason, or null. Read from the page, for the final check */
export function councilLineWhy(line) {
  const m = /^(.{3,120}?) registers\b/.exec(String(line ?? "")); if (!m) return null;
  return NOT_A_REGISTRAR.test(m[1]) && !/its own page says it is the regulator/i.test(line) ? `${m[1]} is a professional body: it is not shown as registering anyone unless its own page says it is the regulator` : null;
}
