/**
 * 🔴 RR-321 A2 + A4 + A5 · A REGULATOR'S OWN PAGE, READ WHILE A PAGE IS BUILT (never while counting):
 *   · robots by Google's rule (RFC 9309, desktop/official.mjs); a page that still cannot be read is NOT dropped — it is built from the
 *     subject's list, with "check here", the regulator's link and the date;
 *   · the full answer, each item with its source and date: the score for each sub-test · how long a result stays valid · whether two
 *     sittings can be combined · the registration steps · the official link;
 *   · THE VERBATIM CHECK: every number a line shows stands on its source page (as digits, or as the word for it); a number not found there is
 *     not shown. AlmiOET's own records (validity years, the combining window) are LEADS: shown only when the regulator's page states them.
 * The lines are Visibility's own words about what the page shows — never the page's sentences copied.
 */
import { bodyAnswer } from "./official.mjs";

const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, eighteen: 18, twenty: 20, "twenty-four": 24 };
const sentences = (t) => String(t ?? "").split(/(?<=[.!?;])\s+/);
const standsIn = (n, s) => new RegExp(`(?<![\\d.])${n}(?![\\d])`).test(s) || Object.entries(WORD).some(([w, v]) => v === Number(n) && new RegExp(`\\b${w}\\b`, "i").test(s));
/** every number in a line (dates and the subject's name aside) stands on the source text → true */
export function verbatimOk(line, source) {
  const nums = String(line).replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ").match(/\d+(?:\.\d+)?/g) ?? [];
  return nums.every((n) => standsIn(n, String(source)));
}
const numberOf = (s) => { const m = /(\d{1,2})|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen|twenty-four|twenty)\b/i.exec(s); return m ? Number(m[1] ?? WORD[m[2].toLowerCase()]) : null; };

/** how long a result stays valid, as the page says it — { years | months, sentence } or null; `lead` = the years AlmiOET's record holds */
export function validityIn(text, lead = null) {
  for (const s of sentences(text)) {
    /* the validity sentence says "valid" or "within the last/past N years" — never a combining window ("sittings within 6 months") */
    if (!/\bvalid|within (the )?(last|past|previous)\b/i.test(s) || !/\b(test|result|sitting|certificate|OET|IELTS)\b/i.test(s) || /\bcombin|\btwo (test )?sittings|\bmore than one (test )?sitting/i.test(s)) continue;
    const m = /(\d{1,2}|one|two|three|four|five|six|eighteen|twenty-four|twelve|twenty)\s*(years?|months?)/i.exec(s);
    if (!m) continue;
    const n = numberOf(m[1]), unit = /month/i.test(m[2]) ? "months" : "years";
    if (lead && (unit !== "years" || n !== lead)) continue; // AlmiOET's record is a lead: only the page's same number confirms it
    return { n, unit, sentence: s };
  }
  return null;
}
/** whether results from two sittings can be combined — { allowed: true, months } | { allowed: false } | null, as the page says it */
export function combiningIn(text) {
  /* "in one sitting OR across a maximum of two sittings" allows two: a sentence that names two sittings is read before one that names one */
  const TWO = /\bcombin\w*|\btwo (test )?sittings\b|\bmore than one (test )?sitting\b|\bacross (a maximum of )?(two|2) (test )?sittings\b|\bmaximum of (two|2) (test )?sittings\b/i;
  const NO = /\bnot (be )?combin|\bcannot be combined|\bwill not accept results from (more than one|two)|\bnot accept (combined|results from)/i;
  const ss = sentences(text);
  for (const s of ss) {
    if (!/\b(test|result|sitting|score|grade)\b/i.test(s)) continue;
    if (NO.test(s)) return { allowed: false, sentence: s };
    if (TWO.test(s)) { const m = /(\d{1,2}|six|twelve|eighteen|twenty-four)\s*months?/i.exec(s); return { allowed: true, months: m ? numberOf(m[1]) : null, sentence: s }; }
  }
  for (const s of ss) if (/\b(one|single|same) (test )?sitting\b|\bone test (session|sitting)\b/i.test(s) && /\b(must|all|required?|only)\b/i.test(s)) return { allowed: false, sentence: s };
  return null;
}
const STEP_LINK = /\b(how to (apply|register)|apply(ing)? (for|to) (registration|the register)|registration (process|steps|requirements)|application (process|form|guide)|join(ing)? the register|registering (with|as))\b/i;

/**
 * Read one regulator page of the plan (desktop/plan-list.mjs) → { ok, url, on, why, claims: [{ fact, text, link, readOn, … }] }. `page` has
 * body, short, country, professions, grade (the list's), record (AlmiOET's leads: officialUrl, validityYears, combineWithinMonths), website.
 */
export async function readRegulator({ page, subject, reader }) {
  const url = page.record?.officialUrl ?? page.website;
  if (!url) return { ok: false, url: null, on: reader.on, why: "the list gives no address for it", claims: [] };
  const got = await bodyAnswer({ url, body: page.body, subject, reader, sitemap: true }); // its own sitemap names its English-requirements page
  if (!got.claim) {
    const n = got.notSaid, failed = !(n.checked ?? []).some((c) => c.ok);
    return { ok: false, url, on: n.checkedOn, why: failed ? (n.checked?.[0]?.why ?? "could not be read") : `its own page does not name ${subject}`, claims: [{ fact: "link", claimId: `check-${page.listId}`, text: `Check here: ${page.body}'s own page — ${failed ? `it could not be read on ${n.checkedOn} (${n.checked?.[0]?.why ?? "no answer"})` : `checked ${n.checkedOn}, it does not name ${subject}`}; this page is built from ${subject}'s list.`, link: url, readOn: n.checkedOn, source: `${page.body} — its own page`, official: true, body: page.body }] };
  }
  const c = got.claim, r = await reader.read(c.link), text = r.ok ? `${r.title ?? ""} ${r.text}` : "", on = c.readOn;
  const mk = (fact, line, extra = {}) => ({ fact, claimId: `${fact}-${page.listId}`, text: line, link: c.link, readOn: on, source: c.source, official: true, body: page.body, ...extra });
  const claims = [];
  /* the scores: the regulator's own sets; where the subject's list says other letters, the regulator's page is followed and it is said */
  const listLine = page.grade ? ["listening", "reading", "writing", "speaking"].map((s) => `${s[0].toUpperCase()}${s.slice(1)} ${page.grade[s]}`).join(" · ") : null;
  /* the letters differ only where the page states a letter for that sub-test (a page that states only scaled scores contradicts nothing) */
  const own = c.sets?.[0] ?? null, letterOf = (sub) => new RegExp(`\\b${sub}\\s+([ABC]\\+?)(?![\\w+])`, "i").exec(own ?? "")?.[1] ?? null;
  const differs = own && page.grade && ["Listening", "Reading", "Writing", "Speaking"].some((s) => letterOf(s) && letterOf(s) !== page.grade[s.toLowerCase()]);
  claims.push(mk("scores", `${c.text}${differs ? ` ${subject}'s list says ${listLine}; the regulator's own page is followed.` : ""}`));
  const v = validityIn(text, page.record?.validityYears ?? null);
  if (v) claims.push(mk("validity", `${page.body}'s own page states a time limit of ${v.n} ${v.unit} for ${subject} results.`));
  const cb = combiningIn(text);
  if (cb) claims.push(mk("combining", cb.allowed ? `${page.body}'s own page accepts results from two sittings${cb.months ? `, taken within ${cb.months} months` : ""}.` : `${page.body}'s own page asks for all sub-tests in one sitting — results are not combined.`));
  const step = (r.links ?? []).find((l) => STEP_LINK.test(l.text ?? "") && /^https?:/.test(l.href));
  claims.push(step ? mk("steps", `The registration steps are set out on ${page.body}'s own page about applying.`, { link: step.href }) : mk("steps", `${page.body}'s own page (checked ${on}) does not set out the registration steps here — see its site.`, { link: page.website ?? c.link }));
  claims.push(mk("link", `${page.body}'s official page about ${subject} and English: ${c.link}`));
  /* A5 · a number not on its page is not shown */
  const kept = claims.filter((x) => x.fact === "link" || x.fact === "steps" || verbatimOk(x.text.replace(new RegExp(`${subject}'s list says [^;]+;`), ""), text));
  return { ok: true, url: c.link, on, claims: kept, dropped: claims.length - kept.length };
}
