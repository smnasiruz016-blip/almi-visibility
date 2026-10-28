/**
 * 🔴 RR-334 · ARTICLES FOR EVERY ALMIWORLD PRODUCT — DRAFTS ONLY (owner, 27 Oct 2026). AlmiVisibility writes, for each product:
 *   · ANSWER   one article a question people really ask: the answer first, from the product's question facts already checked on their
 *              official page (cf-questions.mjs) — no AI here, nothing new said; related questions under it, each with its label and source;
 *   · INTRO    what the product is, who it is for, why it is needed, and honest pros and cons with their limits (which councils do not accept
 *              a test …) — ONE AI question (web search); each hard fact is then READ on its official page here (robots obeyed): its quoted
 *              words on the page, every number it states on the page too; what fails is left out, said why. Guidance is labelled and states
 *              no number at all.
 * Every block carries its source and the day it was read; each draft links to the product. A draft waits on /owner/articles for the owner's
 * one-tap Approve or Reject; NOTHING is published here — publishing is a later step (almiworld.com's blog; AlmiVisibility's own site).
 */
import { FAMILY } from "./family.mjs";
import { PRODUCT_FACTS } from "../desktop/product-facts.mjs";
import { numbersOf, quoteOnPage, hostOf, governmentHost, SHOWN_STATUS, blockedSource } from "../desktop/country-facts.mjs";
import { NEVER_SOURCES } from "./cf-ai.mjs";

/* RR-335 · F40's two judged criteria and F37's promise rule, word for word — the site does not load the engine's page builder, so the
 * test (rr335) holds these equal to src/page/quality-judgements.mjs CRITERIA and src/page/draft-render.mjs PROMISE */
export const JUDGE_CRITERIA = Object.freeze({
  engaging: Object.freeze({ id: "f40-engaging-v1", criterion: "Engaging: a reader who arrives with the page's central question is drawn to read on, judged by a declared agent on the rendered draft." }),
  hookable: Object.freeze({ id: "f40-hookable-v1", criterion: "Hookable: the title, the direct answer and the headings state the page's value in the reader's own terms, judged by a declared agent on the rendered draft." }),
});
const AI_JUDGED = Object.keys(JUDGE_CRITERIA);
export const PROMISE = /\b(guarantee[sd]?|rank(s|ed|ing)? (#?1|first|top)|top of (google|search)|cited by (ai|chatgpt|gemini)|will (rank|be indexed|be cited))\b/i;
const JUDGE_SCHEMA = { type: "object", additionalProperties: false, required: AI_JUDGED, properties: Object.fromEntries(AI_JUDGED.map((n) => [n,
  { type: "object", additionalProperties: false, required: ["verdict", "observation"], properties: { verdict: { type: "string", enum: ["PASS", "FAIL"] }, observation: { type: "string" } } }])) };
/** the AI judge's one question: F40's two criteria and the page itself, nothing else */
export const judgeQuestion = (d) => ({ template: "judge", schema: JUDGE_SCHEMA, maxTokens: 800,
  system: "You judge one web page against two declared criteria. Read only the page given. For each criterion answer PASS or FAIL and one sentence saying what in the page decides it. Never judge anything not on the page.",
  prompt: `${AI_JUDGED.map((n) => `${n}: ${JUDGE_CRITERIA[n].criterion}`).join("\n")}\n\nThe page:\n${articleText(d).slice(0, 12000)}` });
/** the judge's answer as F40's recorded judgements: each with its criterion id, the observation and the provider's call id (F40 C5) */
export const judgementsOf = (data, callId) => (callId ? AI_JUDGED.filter((n) => ["PASS", "FAIL"].includes(data?.[n]?.verdict) && String(data?.[n]?.observation ?? "").trim())
  .map((n) => ({ name: n, verdict: data[n].verdict, criterionId: JUDGE_CRITERIA[n].id, observation: String(data[n].observation).trim().slice(0, 400), source: { kind: "AGENT", provider: "anthropic", callRef: callId } })) : []);

export const ARTICLES = Object.freeze({ introsPerDay: 2, refreshDays: 30, related: 4, minBlocks: 3, judgedPerDay: 6 });

/* RR-335 (owner, 28 Oct 2026) · F40 ON EVERY DRAFT, WITH A COST GUARD: the deterministic page-law checks first — the answer first, no
 * promise of ranking, nothing said twice (no word count: RR-294) — and only a draft that passes them goes to the AI judge (the cheapest
 * capable model, cf-ai.mjs) for F40's two judged criteria, engaging and hookable, each verdict recorded with the provider and its call id.
 * Inside the collector's daily AI cap, at most judgedPerDay a day; a draft not yet judged WAITS — it is never refused for it. */
export function articleChecks(d) {
  const blocks = Array.isArray(d?.blocks) ? d.blocks : [], texts = blocks.map((b) => String(b?.text ?? "").trim().toLowerCase());
  const said = blocks.map((b) => `${b?.heading ?? ""} ${b?.text ?? ""}`).join(" ");
  const twice = texts.filter((t, i) => t && texts.indexOf(t) !== i).length;
  const check = (ok, why) => (ok ? { state: "PASS" } : { state: "FAIL", why });
  return Object.freeze({
    answerFirst: check(Boolean(texts[0]), "the draft does not open with its answer"),
    noPromise: check(!PROMISE.test(said), "it promises a ranking or a result"),
    nothingTwice: check(twice === 0, `${twice} block(s) say what another block already says`),
  });
}
export const articleText = (d) => [d?.title, ...(d?.blocks ?? []).flatMap((b) => [b?.heading, b?.text])].filter(Boolean).join("\n");
/** a draft's F40 state for the owner: FAIL (a check, or the judge), PASS (both judged PASS), or WAITING for the AI judge */
export function articleQuality(d, judged = null) {
  const checks = articleChecks(d), failed = Object.entries(checks).filter(([, c]) => c.state === "FAIL").map(([k, c]) => `${k}: ${c.why}`);
  if (failed.length) return Object.freeze({ state: "FAIL", checks, why: failed.join("; ") });
  const js = judged?.judgements ?? [];
  if (js.length !== AI_JUDGED.length) return Object.freeze({ state: "WAITING", checks, why: "waiting for the AI judge (engaging, hookable) — the page-law checks passed" });
  const bad = js.filter((j) => j.verdict === "FAIL");
  return Object.freeze({ state: bad.length ? "FAIL" : "PASS", checks, judgements: js, usd: judged.usd ?? null, callId: judged.callId ?? null, at: judged.at ?? null,
    why: bad.length ? bad.map((j) => `${j.name}: ${j.observation}`).join("; ") : null });
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

/* the AlmiWorld products an article is written for: the family's list (its name and its own address) */
export const ARTICLE_PRODUCTS = Object.freeze(FAMILY.products.map((p) => Object.freeze({ key: p.key, name: p.name, href: p.href })));
const productOf = (key) => ARTICLE_PRODUCTS.find((p) => p.key === key) ?? null;
/* what the product is ABOUT (AlmiOET → OET): the subject an introduction explains, and the official sites that may state its hard facts */
const SUBJECT = { visibility: { name: "getting a business found on Google and in AI answers", sites: [] } };
const subjectOf = (key) => SUBJECT[key] ?? (PRODUCT_FACTS[key] ? { name: PRODUCT_FACTS[key].name, sites: PRODUCT_FACTS[key].sites } : { name: key, sites: [] });

/** ANSWER drafts from the question facts (no AI): the most asked question with an OFFICIAL answer that is shown, a draft each */
export function answerDrafts({ product, facts, today, max = 1 }) {
  const P = productOf(product); if (!P) return [];
  const mine = facts.filter((f) => (f.product ?? "oet") === product && f.part === "questions" && SHOWN_STATUS.includes(f.status) && f.value?.question && f.value?.answer && !f.value?.removedBy);
  const official = mine.filter((f) => f.value.answerKind === "official" && f.sourceUrl).sort((a, b) => Number(b.value.volume ?? 0) - Number(a.value.volume ?? 0) || Number(b.value.count ?? 0) - Number(a.value.count ?? 0));
  return official.slice(0, max).map((f) => {
    const related = mine.filter((x) => x.key !== f.key && x.value.intent === f.value.intent && x.country === f.country).slice(0, ARTICLES.related);
    const block = (x) => ({ heading: x.value.question, text: x.value.answer, label: x.value.answerKind === "official" ? "official" : "general guidance", source: x.value.answerKind === "official" ? { url: x.sourceUrl, title: x.sourceTitle ?? null, on: x.readOn } : x.value.guidanceSource ?? null });
    const blocks = [{ ...block(f), heading: "The answer" }, ...related.map(block)];
    return { id: `${product}|answer|${slug(`${f.country}-${f.value.intent ?? f.value.question}`)}`, product, kind: "answer", country: f.country, title: f.value.question, on: today,
      outline: ["The answer", ...(related.length ? ["Related questions", ...related.map((x) => x.value.question)] : []), `About ${P.name}`], blocks, links: [{ href: P.href, text: P.name }], from: [f.key, ...related.map((x) => x.key)] };
  });
}

/* ── INTRO: one AI question, then checked here ── */
const INTRO_SCHEMA = { type: "object", additionalProperties: false, required: ["title", "blocks"], properties: { title: { type: "string" }, blocks: { type: "array", items: { type: "object", additionalProperties: false, required: ["section", "heading", "text", "kind", "quote", "sourceUrl"],
  properties: { section: { type: "string", enum: ["what", "who", "why", "pros", "cons"] }, heading: { type: "string" }, text: { type: "string" }, kind: { type: "string", enum: ["official", "guidance"] }, quote: { type: "string" }, sourceUrl: { type: "string" } } } } } };
export const SECTIONS = Object.freeze({ what: "What it is", who: "Who it is for", why: "Why it is needed", pros: "Pros", cons: "Cons and limits" });
export const introQuestion = ({ product, facts = [] }) => {
  const P = productOf(product), S = subjectOf(product);
  return { template: "articles", search: true, schema: INTRO_SCHEMA, maxTokens: 6000,
    system: `You draft an honest introduction for AlmiWorld's blog. Sections: what ${S.name} is, who it is for, why it is needed, its pros, and its cons and LIMITS (for a test: where it is NOT accepted, which councils or bodies do not take it; for a service: what it cannot do). Each block is at most 70 words, answer first. A block of kind "official" states a hard fact (a number, fee, date, score, rule, or which body accepts what): it must stand, in words, on an OFFICIAL page — ${S.sites.length ? `${S.sites.join(", ")}, ` : ""}a government's own page, a council's or regulator's own page${P ? `, or ${P.href} for what ${P.name} itself offers` : ""} — give quote: 8 to 40 words copied EXACTLY from that page, and sourceUrl in full; a program opens the page and throws away a block not found there. A block of kind "guidance" is general advice in your own words with NO number, fee, date, score or rule at all; quote empty; sourceUrl: the reputable page it is summarised from, or empty. Never invent anything. ${NEVER_SOURCES}`,
    prompt: `Write the introduction to ${S.name}${P ? ` (AlmiWorld's product: ${P.name}, ${P.href})` : ""}: 2 to 3 blocks for each section.${facts.length ? `\nAlready confirmed on official pages (use them; each is a fact you may state with its page):\n${facts.slice(0, 12).map((f) => `- ${f}`).join("\n")}` : ""}\nSearch like this: "I need the official answer to this question: '<what you want to say>'. Give the official source page." and, for advice, "I need a reliable non-official answer to '<question>' (teachers, experts, real candidates). Give the source page and date."` };
};

/** the AI's draft, checked block by block on its pages (the collector's reader: robots obeyed). → { draft | null, dropped: [{ heading, why }] } */
export async function checkIntro({ product, data, reader, room = () => true, today }) {
  const P = productOf(product), S = subjectOf(product), dropped = [], blocks = [];
  const own = (h) => Boolean(h && (governmentHost(h) || S.sites.some((s) => h === s || h.endsWith(`.${s}`)) || (P && h === hostOf(P.href))));
  for (const b of (data?.blocks ?? []).filter((x) => SECTIONS[x.section] && String(x.text ?? "").trim())) {
    const text = String(b.text).trim(), url = String(b.sourceUrl ?? "").trim();
    if (url && blockedSource(url)) { dropped.push({ heading: b.heading, why: "its source is a site the owner blocked" }); continue; }
    if (b.kind !== "official") {
      if (numbersOf(text).length) { dropped.push({ heading: b.heading, why: "general guidance may state no number" }); continue; }
      let source = null; if (url && room()) { const p = await reader.read(url); if (p.ok) source = { url: p.url, title: p.title ?? null, on: p.checkedOn ?? today }; }
      blocks.push({ section: b.section, heading: b.heading, text, label: "general guidance", source }); continue;
    }
    if (!room()) { dropped.push({ heading: b.heading, why: "today's page reads are used — tried again next time" }); continue; }
    const page = url ? await reader.read(url) : { ok: false, why: "no source page given" }, h = hostOf(page.ok ? page.url : url);
    const said = numbersOf(text), ok = page.ok && own(h) && b.quote && quoteOnPage(b.quote, page.text) && said.every((n) => numbersOf(page.text).includes(n));
    if (!ok) { dropped.push({ heading: b.heading, why: !own(h) ? "its source page is not official" : !page.ok ? `its source page could not be read (${page.why})` : !quoteOnPage(b.quote ?? "", page.text) ? "the quoted words are not on its source page" : "a number it states is not on its source page" }); continue; }
    blocks.push({ section: b.section, heading: b.heading, text, label: "official", quote: b.quote, source: { url: page.url, title: page.title ?? null, on: page.checkedOn ?? today } });
  }
  if (!P || blocks.length < ARTICLES.minBlocks) return { draft: null, dropped };
  const order = Object.keys(SECTIONS), sorted = blocks.sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
  return { draft: { id: `${product}|intro`, product, kind: "intro", country: null, title: String(data.title ?? `${S.name}: what it is, who it is for, pros and cons`).trim().slice(0, 120), on: today,
    outline: order.filter((s) => sorted.some((b) => b.section === s)).map((s) => SECTIONS[s]).concat(`About ${P.name}`), blocks: sorted, links: [{ href: P.href, text: P.name }], dropped }, dropped };
}

/** a draft as the owner reads it (and as a later publishing step will carry it): answer first, every block with its label, source and date */
export function articleHtml(d) {
  const src = (s) => (s?.url ? ` <span class="fine">Source: <a href="${esc(s.url)}" rel="nofollow">${esc(s.title || hostOf(s.url))}</a>, read ${esc(s.on ?? "")}</span>` : "");
  const by = d.kind === "intro" ? Object.keys(SECTIONS).map((k) => [SECTIONS[k], d.blocks.filter((b) => b.section === k)]).filter(([, bs]) => bs.length) : [[null, d.blocks]];
  return `<article><h1>${esc(d.title)}</h1>${by.map(([h, bs]) => `${h ? `<h2>${esc(h)}</h2>` : ""}${bs.map((b) => `<h3>${esc(b.heading)}</h3><p>${esc(b.text)} <span class="chip">${esc(b.label)}</span>${src(b.source)}</p>`).join("")}`).join("")}
<h2>About ${esc(d.links[0]?.text ?? "")}</h2><p>${d.links.map((l) => `<a href="${esc(l.href)}">${esc(l.text)}</a>`).join(" · ")}</p></article>`;
}
