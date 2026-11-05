/**
 * 🔴 RR-374 (owner, 5 Nov 2026: 240 of 297 preview pages held "<Council>'s official page, checked <date>, does not say this", 37 showed "could not be read … 404 … still being looked for", in the page and in its FAQ data).
 * A QUESTION IS SHOWN ONLY WITH A REAL ANSWER. desktop/answer-finder.mjs looks for each missing one. Not found: the question leaves the page and its FAQ data, and is kept for the owner in the needs-work list. A page is never dropped, and never padded.
 * R-A stands: "Whether it is the registering body is not confirmed yet", with its address and source, is a real answer. Only the work note behind it goes. Pure apart from the `read` handed in.
 */
import { STEP_LINK } from "./regulator-read.mjs";
import { NOT_A_REGISTRAR } from "./council-truth.mjs";

/* a work note: what we did, never what the reader asked */
const NOTES = Object.freeze([/\bdoes not say this\b/i, /\bis the place to read this\b/i, /\bcould not be read\b/i, /\bstill being (?:looked|checked)\b/i, /\bbeing looked for\b/i, /\bhas not been checked yet\b/i, /\bwas not read yet\b/i, /\bstill an open question\b/i, /\bdoes not say it registers\b/i, /\b404\b/, /\banswered \d{3}\b/i, /\brobots\.txt\b/i, /\bsecurity service\b/i, /^Ask .{2,120} directly\.?$/i, /\bNo question from .* is held yet\b/i]);
const sentences = (t) => String(t ?? "").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
export const isNoteSentence = (s) => NOTES.some((re) => re.test(s));
/** a claim's words with the work notes out; "" when nothing real is left */
export function withoutNotes(text) { const kept = sentences(text).filter((s) => !isNoteSentence(s)); return kept.join(" ").trim(); }
/** does this text show the customer a work note? */
export const holdsNote = (text) => sentences(text).some(isNoteSentence);
/** the words a customer reads on a page */
export const pageWords = (html) => String(html ?? "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, "\"").replace(/\s+/g, " ").trim();
/** the first work note a finished page shows, or null. Its FAQ data is read too */
export function noteOnPage(html) { const t = pageWords(html); for (const re of [/\bdoes not say this\b/i, /\bcould not be read\b/i, /\bstill being looked for\b/i, /\bis the place to read this\b/i, /\b404 Page not found\b/i, /\bhas not been checked yet\b/i]) { const m = re.exec(t); if (m) return m[0]; } return null; }

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };
const partOf = (it) => String(it.part ?? "").replace(/\d+$/, "");
/* which empty answers another official page can fill */
export const NEEDS = Object.freeze({
  regulator: Object.freeze({ need: "steps", anchor: STEP_LINK, also: /\b(?:registration|register|apply|licen[cs]e|licen[cs]ing)\b/i, says: /\b(?:appl(?:y|ication|icants?)|regist(?:er|ration))\b[\s\S]{0,400}\b(?:forms?|fees?|documents?|requirements?|steps?|procedures?|process)\b|\b(?:forms?|fees?|documents?|requirements?|steps?|procedures?|process)\b[\s\S]{0,400}\b(?:appl(?:y|ication|icants?)|regist(?:er|ration))\b/i, named: STEP_LINK }),
  standing: Object.freeze({ need: "standing", anchor: /\bgood standing\b|\bverification\b|\bcertificate of (?:status|registration)\b|\bcertificates?\b|\bservices?\b/i, also: /\bgood standing\b|\bverification\b/i, says: /\bgood standing\b|\bverification of registration\b|\bregistration verification\b|\bcertificate of status\b/i, named: /\bgood standing\b|\bverification of registration\b|\bregistration verification\b|\bcertificate of status\b/i }),
});
/* the proof run read these as "applying": a committee's form, a screening test's form, a specialist's form, a page of forms */
const NOT_THE_NEED = /\bcommittee\b|\bexperts?\b|\bscreening\b|\bspecialists?\b|\btenders?\b|\brecruit\w*|\bvacanc\w*|\bjobs?\b|\bmembership\b|\bstudents?\b|\bcolleges?\b|\binstitutions?\b|\bcourses?\b|\bcme\b|\bcpd\b|\brenewal\b|\brenew\b|\bcomplaints?\b|\bdownload\b|\bforms?\b|\badditional\b|\bdual\b|\bcredentials?\b/i;
const emptyItem = (it) => (it.claims ?? []).length > 0 && it.claims.every((c) => !withoutNotes(c.text));
const usesThis = (u, origin) => { const a = hostOf(u), b = hostOf(origin); return Boolean(a && b) && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)); };
const OFFICIAL_HOST = /(?:^|\.)(?:gov|govt|go|gob|gouv|nic|mil)(?:\.[a-z]{2,3})?$|\.gov\.[a-z]{2}$/i;
/** the page of the body's own that is named for this need (the page held, its home, the links named for it), or not found. An association's page registers no one */
export async function findAnswer(row, { read, on, extra = 4 }) {
  if (NOT_A_REGISTRAR.test(row.body ?? "")) return { ok: false, on, why: "an association's page registers no one" };
  const n = NEEDS[row.part], seen = new Set(), anchors = new Map(), notHome = (u) => { try { return new URL(u).pathname.replace(/\/+$/, "") !== ""; } catch { return false; } }, ok = (p, u) => { if (!p?.ok || !notHome(p.url ?? u)) return false; const all = `${p.title ?? ""} ${p.h1 ?? ""} ${p.text ?? ""}`; const about = `${anchors.get(u) ?? ""} ${p.title ?? ""} ${p.h1 ?? ""} ${decodeURIComponent(String(p.url ?? u)).replace(/[-_/]+/g, " ")}`; if (/\.pdf(?:$|\?)/i.test(String(p.url ?? u)) || NOT_THE_NEED.test(about)) return false; return n.says.test(all) && n.also.test(all) && n.named.test(`${anchors.get(u) ?? ""} ${p.title ?? ""} ${p.h1 ?? ""} ${decodeURIComponent(String(p.url ?? u)).replace(/[-_/]+/g, " ")}`); }, found = (p, u, how) => ({ ok: true, url: p.url ?? u, on, how });
  let more = extra; const queue = [...new Set([row.link, `${row.origin}/`])]; let readAny = false;
  while (queue.length) { const u = queue.shift(); if (seen.has(u)) continue; seen.add(u); const p = await Promise.resolve(read(u)).catch(() => null); if (!p?.ok) continue; readAny = true; if (ok(p, u)) return found(p, u, "own"); const links = (p.links ?? []).filter((l) => /^https?:/.test(l.href ?? "") && usesThis(l.href, row.origin) && !seen.has(l.href) && n.anchor.test(`${l.text ?? ""} ${l.href}`)); for (const l of links) { if (more <= 0) break; anchors.set(l.href, l.text ?? ""); queue.push(l.href); more--; } }
  return { ok: false, on, why: readAny ? "no page of its own holds it" : "its pages could not be opened" };
}
/** where the test is taken: the official finder, as every other country's page. No AI: it is OET's own fact */
export function applyFills(plan, { finder = null } = {}) {
  for (const p of plan.pages ?? []) for (const it of p.items ?? []) {
    if (!emptyItem(it)) continue;
    if (partOf(it) === "centres" && finder?.text && p.country) { it.claims = [{ claimId: `fill-centres-${p.country}`.replace(/\s+/g, "-"), card: null, text: `To find a test venue in ${finder.place(p.country)}, use Find a test on ${finder.subject}'s booking page.`, link: finder.link, readOn: finder.readOn, source: finder.source ?? "its own page", official: true, filled: true }]; continue; }
  }
  return plan;
}
/* 🔴 rule 2: a council's name and its source. A name that is not in the address must stand on the page itself, or on a government's own address */
const SMALL = /^(?:of|and|for|the|in|on|at)$/i, PLAIN = /^(?:the|council|board|authority|national|general|health|professions?|ministry|department|medical|institute|association|society|registered|republic|state|commission|committee|care|royal|college)$/i;
export function nameInAddress(name, url) {
  const h = String(hostOf(url) ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase(); if (!h) return false; const short = /\(([A-Za-z&]{2,})\)/.exec(name)?.[1]?.toLowerCase().replace(/&/g, ""), words = String(name).replace(/\([^)]*\)/g, " ").split(/[^A-Za-z]+/).filter(Boolean);
  if (short && h.includes(short)) return true; const main = words.filter((w) => !SMALL.test(w)).map((w) => w[0]).join("").toLowerCase(), all = words.map((w) => w[0]).join("").toLowerCase();
  for (const a of [main, all]) for (let i = 0; a.length >= 3 && i + 3 <= a.length; i++) if (h.includes(a.slice(i, i + 3))) return true; /* New Zealand Medical Radiation Technologists Board: mrtboard */
  return words.some((w) => !PLAIN.test(w) && !SMALL.test(w) && w.length > 3 && h.includes(w.toLowerCase().slice(0, 3)));
}
const NAMED_LINE = /^(?:Office for [^:]+: )?(.+?)(?: \(a professional body\))?(?:, [^—]*)?(?: — \S+)?\. Whether it is the registering body|^(.+?) registers\b|^(.+?) \(official page\)/;
const nameIn = (text) => { const m = NAMED_LINE.exec(String(text ?? "")); return (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").replace(/^In [^:]+:\s*/, "").trim() || null; };
/** the named lines whose name is not in their address: to be read against the page */
export function namesToCheck(plan) { const out = new Map(); for (const p of plan.pages ?? []) for (const it of p.items ?? []) { if (!/^(?:council|councils|regulator)$/.test(partOf(it))) continue; for (const c of it.claims ?? []) { const name = nameIn(c.text); if (name && c.link && !nameInAddress(name, c.link)) out.set(`name|${name}|${c.link}`, { key: `name|${name}|${c.link}`, name, link: c.link }); } } return [...out.values()]; }
/** one name against its own source page */
export async function checkName(row, { read, on }) { const p = await Promise.resolve(read(row.link)).catch(() => null), norm = (s) => String(s ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(), short = /\(([A-Za-z&]{2,})\)/.exec(row.name)?.[1] ?? null, all = `${p?.title ?? ""} ${p?.h1 ?? ""} ${p?.text ?? ""}`; return { on, read: Boolean(p?.ok), named: !p?.ok ? null : (norm(all).includes(norm(row.name.replace(/\([^)]*\)/g, " "))) || Boolean(short && new RegExp(`\\b${short.replace(/&/g, "")}\\b`).test(all))) }; }
const THEIR_SITE = (h) => ` Its own site is at ${h}.`;
/** rule 2 on the plan: the reader sees whose site it is; a name no source stands behind leaves, for the owner */
export function fixNames(plan, checks = {}) {
  const out = []; for (const p of plan.pages ?? []) { const told = new Set(); for (const it of p.items ?? []) { if (!/^(?:council|councils|regulator)$/.test(partOf(it))) continue; const keep = []; for (const c of it.claims ?? []) { const name = nameIn(c.text); if (!name || !c.link || nameInAddress(name, c.link)) { keep.push(c); continue; } const v = checks[`name|${name}|${c.link}`], host = hostOf(c.link); if (v?.named === true || (OFFICIAL_HOST.test(host ?? "") && v?.named !== false)) { const text = c.text.includes(THEIR_SITE(host)) || told.has(host) ? c.text : `${c.text.replace(/\s+$/, "")}${THEIR_SITE(host)}`; told.add(host); keep.push({ ...c, text }); if (v?.named !== true) out.push({ title: p.title, name, link: c.link, why: "its government address, not read: kept with whose site it is" }); continue; } if (v && v.named === false && !OFFICIAL_HOST.test(host ?? "")) { out.push({ title: p.title, name, link: c.link, why: "its source does not name it: taken off" }); p.leftOff = [...new Set([...(p.leftOff ?? []), partOf(it)])]; continue; } keep.push(c); out.push({ title: p.title, name, link: c.link, why: "not read yet: to check" }); } it.claims = keep; } }
  return out;
}
/** a line that holds a work note and something real keeps the real part: done before the AI reads it */
export function stripNotes(plan) { for (const p of plan.pages ?? []) for (const it of p.items ?? []) it.claims = (it.claims ?? []).map((c) => { const t = withoutNotes(c.text); return t.length >= 12 && t !== c.text ? { ...c, text: t } : c; }); return plan; }
export const THIN_BELOW = 4;
/**
 * The last word on a plan: work notes out of every line; a question left with no real answer leaves the page; the page stays, said thin below THIN_BELOW. → one row per page that changed or is thin.
 * A question with no claims at all is left alone: the page's own builder decides those.
 */
export function dropEmptyAnswers(plan, { thinBelow = THIN_BELOW } = {}) {
  const rows = [];
  for (const p of plan.pages ?? []) {
    const dropped = [], filled = [], items = [], cut = [];
    for (const it of p.items ?? []) {
      const had = it.claims ?? []; if (!had.length) { items.push(it); continue; }
      const claims = had.flatMap((c) => { const text = withoutNotes(c.text); return text.length >= 12 ? [text === c.text ? c : { ...c, text }] : []; });
      if (!claims.length) { const c = had[0]; dropped.push({ part: it.part, question: it.question, why: c.text, link: c.link ?? null }); continue; }
      if (claims.length < had.length) cut.push(partOf(it)); /* one body's line left a list */
      for (const c of claims) if (c.filled) filled.push({ part: it.part, question: it.question, source: c.link ?? null });
      items.push({ ...it, claims });
    }
    p.items = items; p.leftOff = [...new Set([...p.leftOff ?? [], ...dropped.filter((d) => !items.some((it) => partOf(it) === partOf(d) && (it.claims ?? []).length)).map(partOf).map((x) => x.replace(/^questionsa$/, "questions")), ...cut])]; const real = items.filter((it) => (it.claims ?? []).length).length, thin = real < thinBelow; p.answerLog = { dropped: dropped.length, filled: filled.length, real, thin };
    if (dropped.length || filled.length || thin) rows.push({ title: p.title, kind: p.kind ?? null, real, thin, dropped, filled });
  }
  return rows;
}
/** the owner's numbers */
export const answersSummary = (rows = []) => ({ pages: rows.length, dropped: rows.reduce((n, r) => n + r.dropped.length, 0), filled: rows.reduce((n, r) => n + r.filled.length, 0), thin: rows.filter((r) => r.thin).map((r) => ({ title: r.title, real: r.real })) });
