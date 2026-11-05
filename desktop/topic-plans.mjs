/**
 * 🔴 RR-376 item 3 (owner, 5 Nov 2026) · "TOPICS OTHERS HAVE PAGES ON AND WE DO NOT" BECOME PAGE PLANS, under recipe v3.5 (R-C: a page is defined by its own questions, answers and audience; only true duplicates merge). Each plan shows its real demand evidence: the sites that have it, the searches a month, the questions people type. Drafts only: nothing is made until the owner approves. An approved plan's questions go down the normal answer ladder; an unanswered one is not shown. Pure.
 */
import { meaningOf } from "./coverage.mjs";
import { countriesIn } from "./world.mjs";

export const PLANS_FILE = "topic-plans.json";
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const meaningKey = (t, drop = []) => meaningOf(t, { drop }).join(" ");
const title = (t) => clean(t).replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bOet\b/g, "OET").replace(/\bIelts\b/g, "IELTS").replace(/\bPte\b/g, "PTE");
const AUDIENCE = Object.freeze([[/\bnurs/i, "nurses"], [/\bdoctor|\bmedicine|\bphysician/i, "doctors"], [/\bdentist|\bdental/i, "dentists"], [/\bpharmac/i, "pharmacists"], [/\bphysio/i, "physiotherapists"], [/\bvet/i, "vets"], [/\bradiograph/i, "radiographers"], [/\boptomet/i, "optometrists"], [/\bdietit/i, "dietitians"], [/\bpodiatr/i, "podiatrists"], [/\bspeech/i, "speech pathologists"], [/\boccupational/i, "occupational therapists"]]);
const audienceOf = (t, subject) => { const who = AUDIENCE.find(([re]) => re.test(t))?.[1] ?? `${subject} candidates`, place = countriesIn(t)[0]; return place ? `${who} in ${place}` : who; };
/** does this text hold all of the topic's words? */
const holds = (want, text) => { const w = new Set(meaningOf(text)); return want.length > 0 && want.every((x) => w.has(x)); };
/**
 * @param topics [{ topic, sites, example }] what others have
 * @param keywords [{ k, v }] real searches a month; bank [{ question }] the questions held; existing the titles we have
 */
export function plansFromTopics({ topics = [], keywords = [], bank = [], existing = [], subject = "OET", on = null, was = {} }) {
  const drop = [subject], have = new Map(existing.map((t) => [meaningKey(t, drop), t])), byKey = new Map();
  for (const t of topics) { const k = meaningKey(t.topic, drop); if (!k) continue; const row = byKey.get(k); if (row) { row.sites = [...new Set([...row.sites, ...(t.sites ?? [])])]; row.alsoCalled.push(clean(t.topic)); continue; } byKey.set(k, { key: k, title: title(t.topic), topic: clean(t.topic), sites: [...new Set(t.sites ?? [])], example: t.example ?? null, alsoCalled: [] }); }
  return [...byKey.values()].map((p) => {
    const want = meaningOf(p.topic, { drop }), kw = keywords.filter((r) => holds(want, r.k ?? r.keyword)), volume = kw.reduce((n, r) => Math.max(n, Number(r.v ?? r.volume) || 0), 0), questions = [...new Set(bank.map((b) => clean(b.question ?? b.text)).filter((q) => q.length > 8 && holds(want, q)))].slice(0, 8), covered = have.get(p.key) ?? null;
    return { ...p, audience: audienceOf(p.topic, subject), questions, evidence: { sites: p.sites.length, example: p.example, searchesAMonth: volume || null, topKeyword: kw.sort((a, b) => (Number(b.v ?? b.volume) || 0) - (Number(a.v ?? a.volume) || 0))[0]?.k ?? null, questionsAsked: questions.length }, strength: questions.length >= 3 && volume > 0 ? "strong" : questions.length || volume ? "some" : "weak", covered, status: was[p.key]?.status ?? "draft", on };
  }).sort((a, b) => (b.evidence.searchesAMonth ?? 0) - (a.evidence.searchesAMonth ?? 0) || b.evidence.sites - a.evidence.sites);
}
const gapClaim = (subject, link, on) => ({ claimId: "plan-gap", card: null, text: `${subject}'s official page, checked ${on}, does not say this.`, link, readOn: on, official: true, gap: true });
/** only what the owner approved, each a page of its own, its questions waiting for real answers. A plan with no question waits */
export function approvedPages({ plans = [], plan, subject, link, on }) { const titles = new Set((plan.pages ?? []).map((p) => p.title)); let added = 0; for (const p of plans) { if (p.status !== "approved" || !p.questions?.length || titles.has(p.title)) continue; plan.pages.push({ kind: "topic", topic: p.key, title: p.title, questions: p.questions, source: `Other sites have it: ${p.evidence.sites}; asked ${p.evidence.questionsAsked} ways`, items: p.questions.map((q, i) => ({ part: `questionsa${i}`, question: q, claims: [gapClaim(subject, link, on)] })) }); added++; } return added; }
