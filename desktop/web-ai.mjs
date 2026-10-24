/**
 * 🔴 RR-318 A · "WRITE BETTER WITH AI" FOR THE WEBSITE, LIKE YOUTUBE (owner, 23 Oct 2026): every website item that needs text — a page
 * title, a meta description, an FAQ answer, a new page's opening answer, the Organization's description — can be written by the client's
 * OWN AI, on the client's own click, one item at a time, the cost counted in the same monthly cap.
 *   · GROUNDED: the AI is handed a FACT SHEET for that page — its own address, title, headings, its own text (without the source lines), the
 *     site's name, and for a new page the OFFICIAL answers Visibility read itself (each with its body and date) — and told to use nothing else.
 *   · THE SAME TRUTH GUARD (desktop/ai-write.mjs, RR-317 "truth first"): a place, person, other site's handle or price that is not in the
 *     fact sheet is an INVENTION and that option is never shown, not even with a note; a number or claim in other words is shown with a note;
 *     the doubtful options go back to the AI once; if none is left, the TEMPLATES stay, with one plain line.
 *   · WRITTEN, NOT LIFTED: a description says what the reader gets on that page, in complete sentences, within its length — never cut.
 * The key comes from Windows' secure store and goes only to the provider's own address.
 */
import { AI } from "./ai-write.mjs";
import { numbersIn, wordsIn, PRICE_IN_TEXT, COMMON_WORDS } from "./ai-write.mjs";
import { placesIn } from "./youtube-niche.mjs";
import { tokens } from "./youtube-advice.mjs";
import { countriesIn } from "./world.mjs";
import { cleanAnswer } from "./web-text.mjs";

/* what each kind of text must be */
export const KINDS = Object.freeze({
  title: { what: "a page title (the words shown as the link in Google)", min: 20, max: 60, rule: "at most 60 characters, the main words first, ending with \" | SITE NAME\" when it fits" },
  "meta description": { what: "a meta description (the two lines under the link in Google)", min: 110, max: 160, rule: "110 to 160 characters: what the reader GETS on this page, written for that reader, complete sentences — never a sentence copied from the page, never cut" },
  "FAQ answer": { what: "the answer to one question, to stand right under it on the page", min: 40, max: 600, rule: "it OPENS with the answer itself, then one or two sentences more; complete sentences; no source lines inside it (the sources stay on the page)" },
  "new page": { what: "the opening answer of a new page (its first paragraph)", min: 80, max: 700, rule: "two to four sentences that answer the page's question straight away, from the OFFICIAL FACTS only, each official fact with its body's name; complete sentences" },
  organization: { what: "a one-sentence description of the organisation (for its Organization structured data)", min: 40, max: 200, rule: "one sentence: who the organisation is and what it offers, from the site's own words" },
});
const SCHEMA = { type: "object", additionalProperties: false, required: ["options"], properties: { options: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "names", "facts"], properties: { text: { type: "string" }, names: { type: "array", items: { type: "string" } }, facts: { type: "array", items: { type: "object", additionalProperties: false, required: ["fact", "quote"], properties: { fact: { type: "string" }, quote: { type: "string" } } } } } } } } };

/** THE FACT SHEET for one website item — the only places, people, numbers, prices and claims an option may use. */
export function webMaterial({ kind, page = null, siteName, origin, question = null, present = null, official = [], productWhat = null }) {
  const own = page ? [...(page.lead ?? []), ...(page.qa ?? []).filter((x) => x.a).map((x) => `${x.q} ${cleanAnswer(x.a)}`), ...(page.facts ?? []).map(cleanAnswer)].join("\n").slice(0, 3500) : "";
  return [
    `WHAT TO WRITE: ${KINDS[kind].what}`,
    `SITE NAME: ${siteName ?? ""}`,
    `SITE ADDRESS: ${origin ?? ""}`,
    ...(page ? [`PAGE ADDRESS: ${page.url}`, `PAGE TITLE: ${page.title ?? ""}`, `PAGE MAIN HEADING: ${page.h1 ?? ""}`, `PAGE SECTION HEADINGS: ${(page.h2 ?? []).join(" | ")}`, `PAGE'S OWN TEXT (its sources stay on the page):\n${own}`] : []),
    ...(question ? [`THE QUESTION: ${question}`] : []),
    ...(present ? [`THE PRESENT TEXT (to improve): ${present}`] : []),
    ...(official.length ? [`OFFICIAL FACTS (read by Visibility on each body's own page — use them with the body's name):\n${official.map((c) => `- ${c.text} (${c.body ?? c.source}, checked ${c.readOn})`).join("\n")}`] : []),
    ...(productWhat ? [`WHAT THE PRODUCT IS (the owner's own words): ${String(productWhat).slice(0, 800)}`] : []),
  ].join("\n");
}
const norm = (s) => String(s ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}:]+/gu, " ").replace(/\s+/g, " ").trim();
const SYSTEM = (kind, siteName) => `You write ${KINDS[kind].what} for one page of the website of ${siteName || "a small business"}. Write 3 different options, each from a different angle. ${KINDS[kind].rule}. Use ONLY the material: a PLACE, a PERSON, an ORGANISATION, a NUMBER, a DATE, a PRICE or a CLAIM may appear only if the material holds it; if unsure, leave it out. Never promise a ranking, a result or a pass. Plain English. List in 'names' every person and organisation you name, and in 'facts' every factual claim, each with the exact words of the material it comes from in 'quote'.`;

/** one option judged: CLEAN · CHECK (a doubt, shown with a note) · HIDDEN (an invention — never shown) · FORM (cannot be used) */
export function judgeWeb(o, material, kind) {
  const text = String(o?.text ?? "").replace(/\s+/g, " ").trim(), K = KINDS[kind];
  if (!text) return { state: "FORM", text, why: ["no text"] };
  if (text.length > K.max) return { state: "FORM", text, why: [`longer than ${K.max} characters`] };
  if (text.length < K.min) return { state: "FORM", text, why: [`shorter than ${K.min} characters`] };
  if (/…|\.\.\.$/.test(text) || (kind !== "title" && !/[.!?]$/.test(text))) return { state: "FORM", text, why: ["not a complete sentence"] };
  const m = norm(material), mNums = numbersIn(material), mWords = wordsIn(material), mPlaces = new Set([...placesIn(material), ...countriesIn(material)].map((p) => p.toLowerCase()));
  const hidden = [], check = [];
  for (const p of new Set([...placesIn(text), ...countriesIn(text)])) if (!mPlaces.has(p.toLowerCase()) && !m.includes(p.toLowerCase())) hidden.push({ what: p, why: `${p} — a place this page and its official sources never name` });
  for (const pr of text.match(PRICE_IN_TEXT) ?? []) { const n = numbersIn(pr)[0]; if (n && !mNums.includes(n)) hidden.push({ what: pr.trim(), why: `${pr.trim()} — a price this page never states` }); }
  for (const h of text.match(/@[\w.-]{3,}/g) ?? []) if (!m.includes(norm(h.slice(1)))) hidden.push({ what: h, why: `${h} — an account this page never names` });
  for (const n of o?.names ?? []) { if (!n || m.includes(norm(n)) || norm(n).split(" ").every((w) => COMMON_WORDS.has(w))) continue; hidden.push({ what: n, why: `${n} — a person or organisation this page and its official sources never name` }); }
  const priced = new Set((text.match(PRICE_IN_TEXT) ?? []).flatMap((p) => numbersIn(p)));
  for (const n of numbersIn(text)) if (!mNums.includes(n) && !priced.has(n) && n.length >= 2) check.push(`Check: ${n} — not in this page's own words or its official sources`);
  for (const f of o?.facts ?? []) { const q = tokens(f?.quote ?? ""); if (!q.length) continue; const share = q.filter((w) => mWords.includes(w) || m.includes(w)).length / q.length; if (share < 0.7) check.push(`Check: "${String(f.fact ?? "").slice(0, 60)}" — said in other words than the page's or its sources'`); }
  if (hidden.length) return { state: "HIDDEN", text, hidden: hidden.map((h) => h.what), why: hidden.map((h) => h.why) };
  return { state: check.length ? "CHECK" : "CLEAN", text, check: [...new Set(check)], facts: o?.facts ?? [] };
}

async function ask({ key, kind, siteName, material, recheck = null, fetchImpl, base }) {
  const system = SYSTEM(kind, siteName) + (recheck ? ` RE-CHECK: you are given ${recheck.length} option${recheck.length === 1 ? "" : "s"} you wrote, each with what was not found in the material. Rewrite each so every place, person, organisation, number, price and claim is in the material; leave out what you cannot ground. Return exactly ${recheck.length}, in the same order.` : "");
  const user = `MATERIAL:\n${material}\n\n${recheck ? `OPTIONS TO RE-CHECK:\n${JSON.stringify(recheck.map((r) => ({ text: r.text, not_in_the_material: r.doubts })))}` : "Write the 3 options."}`;
  let r;
  try { r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version, "anthropic-beta": AI.fallbackBeta }, body: JSON.stringify({ model: AI.model, max_tokens: 4000, fallbacks: "default", system, messages: [{ role: "user", content: user }], output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } }) }); }
  catch { return { fail: "Your AI did not answer — the ready options stay." }; }
  if (r.status === 401 || r.status === 403) return { fail: "Your AI refused the key — check it in Settings → Your AI connection." };
  if (!r.ok) return { fail: `Your AI answered with an error (${r.status}) — the ready options stay.` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens, model: body.model ?? AI.model } : null;
  if (body?.stop_reason === "refusal") return { fail: "Your AI declined to write this — the ready options stay.", usage };
  try { return { options: JSON.parse((body?.content ?? []).find((b) => b?.type === "text")?.text)?.options ?? [], usage }; } catch { return { fail: "Your AI's answer could not be read — the ready options stay.", usage }; }
}
const sum = (us) => (us.length ? { input: us.reduce((n, u) => n + (u.input ?? 0), 0), output: us.reduce((n, u) => n + (u.output ?? 0), 0) } : null);

/** Three options for one website item, by the client's own AI, judged by the truth guard; the templates stay when none is clean. */
export async function writeWebWithAI({ provider, key, kind, material, siteName, fetchImpl = fetch, base = AI.origin }) {
  if (!KINDS[kind]) return { ok: false, why: "Visibility does not write that with AI." };
  if (provider !== "anthropic") return { ok: false, why: "AI writing works with an Anthropic (Claude) key in this version — your connected AI is another one. The ready options stay." };
  if (!key) return { ok: false, why: "Connect your AI key first (Settings → Your AI connection)." };
  const usages = [];
  const first = await ask({ key, kind, siteName, material, fetchImpl, base }); if (first.usage) usages.push(first.usage);
  if (first.fail) return { ok: false, why: first.fail, usages, usage: sum(usages) };
  const judged = (Array.isArray(first.options) ? first.options : []).slice(0, 3).map((o) => judgeWeb(o, material, kind));
  const doubtful = judged.map((j, i) => ({ ...j, i })).filter((j) => j.state !== "CLEAN");
  if (doubtful.length) {
    const second = await ask({ key, kind, siteName, material, recheck: doubtful.map((d) => ({ text: d.text, doubts: d.hidden ?? d.check ?? d.why })), fetchImpl, base }); if (second.usage) usages.push(second.usage);
    const rank = { CLEAN: 0, CHECK: 1, HIDDEN: 2, FORM: 3 };
    if (!second.fail) doubtful.forEach((d, k) => { const again = second.options?.[k] ? judgeWeb(second.options[k], material, kind) : null; if (again && rank[again.state] <= rank[d.state]) judged[d.i] = again; });
  }
  const shown = judged.filter((j) => j.state === "CLEAN" || j.state === "CHECK").sort((a, b) => a.check.length - b.check.length);
  const seen = new Set(), kept = shown.filter((j) => !seen.has(norm(j.text)) && seen.add(norm(j.text)));
  const hiddenOnes = judged.filter((j) => j.state === "HIDDEN"), example = hiddenOnes.flatMap((j) => j.hidden ?? [])[0];
  const outcome = !kept.length ? "templates instead" : hiddenOnes.length ? "one option hidden" : kept.some((o) => o.check.length) ? "shown with a note" : doubtful.length ? "retried and passed" : "shown clean";
  /* RR-317 A, for the website: an invention is never shown; with none left, the ready options (from the client's own pages) stay */
  if (!kept.length) return { ok: false, fallback: true, outcome, why: hiddenOnes.length ? `Your AI's options named something that is not on this page or in its official sources${example ? ` (e.g. ${example})` : ""} — the ready options here are from your own pages.` : "Your AI's options could not be used — the ready options here are from your own pages.", dropped: hiddenOnes.map((j) => ({ text: j.text, why: j.why })), usages, usage: sum(usages) };
  return { ok: true, outcome, dropped: hiddenOnes.map((j) => ({ text: j.text, why: j.why })), usages, usage: sum(usages),
    options: kept.map((j, i) => ({ n: i + 1, text: j.text, characters: j.text.length, check: j.check, byAI: true, basedOn: [`Written with your AI (Claude, ${AI.model}) from this page's own words${/OFFICIAL FACTS/.test(material) ? " and the official pages Visibility read" : ""} — checked: no place, person, organisation, price or claim outside them`, ...(j.facts ?? []).slice(0, 3).map((x) => `fact: ${x.fact} — from "${x.quote}"`)] })) };
}

/**
 * RR-318 B6 · the client's own AI SUGGESTS where each country's official bodies say it (its web search) — Visibility then READS every page
 * itself (desktop/official.mjs) and keeps only what the page shows. An address the AI gives is a lead, never a source.
 */
export async function suggestOfficialPages({ provider, key, subject, items, professions = [], fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false, why: "Finding official pages with AI needs an Anthropic (Claude) key (Settings → Your AI connection). You can also paste the pages yourself." };
  const schema = { type: "object", additionalProperties: false, required: ["pages"], properties: { pages: { type: "array", items: { type: "object", additionalProperties: false, required: ["item", "body", "url"], properties: { item: { type: "string" }, body: { type: "string" }, url: { type: "string" } } } } } };
  let r;
  try { r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(180000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version }, body: JSON.stringify({ model: AI.model, max_tokens: 6000, system: professions.length ? `For each item (a country), find the OFFICIAL page of each health regulator that registers one of these professions — ${professions.join(", ")} — where it states its English-language requirement for ${subject}: the regulator's own website only, never a test-prep, agency or news site. One page per regulator, at most ${Math.min(12, professions.length)} per item. Only addresses you found in your search.` : `For each item, find the OFFICIAL page of each body (a regulator, a government office) that states its English-language requirement for ${subject} — the body's own website only, never a test-prep, agency or news site. Give at most 3 bodies per item. Only addresses you found in your search.`, tools: [{ type: "web_search_20260209", name: "web_search", max_uses: Math.min(professions.length ? 30 : 10, items.length * (professions.length ? 4 : 2)) }], messages: [{ role: "user", content: `Subject: ${subject}\nItems: ${items.join(", ")}` }], output_config: { format: { type: "json_schema", schema } } }) }); }
  catch { return { ok: false, why: "Your AI did not answer." }; }
  if (!r.ok) return { ok: false, why: r.status === 401 || r.status === 403 ? "Your AI refused the key — check it in Settings → Your AI connection." : `Your AI answered with an error (${r.status}).` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens, model: body.model ?? AI.model } : null;
  let pages = [];
  try { pages = JSON.parse((body?.content ?? []).filter((b) => b?.type === "text").at(-1)?.text)?.pages ?? []; } catch { return { ok: false, why: "Your AI's answer could not be read.", usage }; }
  return { ok: true, usage, pages: pages.filter((p) => /^https:\/\//.test(p.url ?? "") && items.includes(p.item)).slice(0, items.length * (professions.length ? 12 : 3)) };
}

/* ── RR-319 · the client's own AI reads his formula, and researches the questions people ask (on his click, his key, his cap) ── */
async function askJSON({ key, system, user, schema, fetchImpl = fetch, base = AI.origin, maxTokens = 3000 }) {
  let r;
  try { r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(120000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version }, body: JSON.stringify({ model: AI.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }], output_config: { effort: "low", format: { type: "json_schema", schema } } }) }); }
  catch { return { ok: false, why: "Your AI did not answer." }; }
  if (!r.ok) return { ok: false, why: r.status === 401 || r.status === 403 ? "Your AI refused the key — check it in Settings → Your AI connection." : `Your AI answered with an error (${r.status}).` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens, model: body.model ?? AI.model } : null;
  try { return { ok: true, usage, data: JSON.parse((body?.content ?? []).filter((b) => b?.type === "text").at(-1)?.text) }; } catch { return { ok: false, why: "Your AI's answer could not be read.", usage }; }
}
const DIM_ENUM = ["countries", "universities", "professions", "job roles", "subjects", "cities", "questions"];
/**
 * the client's sentence → the same parts parseFormula makes; Visibility checks every number is in his own sentence. RR-320 B: the RELATIONS
 * ("people from X", "in the 9 destination countries", "graduates of 8,000 universities … to work in Y", "how many questions") — never a
 * product of every number; "professions" are the subject's professions, never study subjects.
 */
export async function understandFormulaAI({ provider, key, text, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false };
  const schema = { type: "object", additionalProperties: false, required: ["parts"], properties: { parts: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "dims"], properties: { text: { type: "string" }, dims: { type: "array", items: { type: "object", additionalProperties: false, required: ["dim", "n", "role"], properties: { dim: { type: "string", enum: DIM_ENUM }, n: { type: "integer" }, role: { type: "string", enum: ["origin", "destination", "located", "graduates", "none"] } } } } } } } } };
  const out = await askJSON({ key, schema, fetchImpl, base, system: "Split the client's sentence about which web pages he wants into its parts (one per question he asks). For each part list the dimensions he names with the number he gives — read the RELATION, never multiply: countries (role origin = where people come FROM; destination = where they go, work or register; located = only where universities stand), universities (role graduates when he speaks of their graduates), professions (the professions a test is for — never study subjects), job roles, subjects, cities, questions (n 0, when he asks how many questions people ask). Use only numbers he wrote.", user: String(text).slice(0, 2000) });
  if (!out.ok) return out;
  const nums = new Set((String(text).match(/\d[\d,.]*/g) ?? []).map((n) => Number(n.replace(/,/g, ""))));
  const DIM = { professions: ["roles", "professions"], "job roles": ["roles", "job roles"] };
  const parts = (out.data?.parts ?? []).map((p) => ({ text: p.text, dims: (p.dims ?? []).filter((d) => DIM_ENUM.includes(d.dim) && (d.dim === "questions" || nums.has(d.n) || nums.has(d.n / 1000))).map((d) => ({ dim: DIM[d.dim]?.[0] ?? d.dim, n: d.dim === "questions" ? null : d.n, word: DIM[d.dim]?.[1] ?? d.dim, role: d.dim === "countries" ? (d.role === "none" || d.role === "graduates" ? "destination" : d.role) : d.dim === "universities" && d.role === "graduates" ? "graduates" : null })) })).filter((p) => p.dims.length);
  return { ok: parts.length > 0, parts, usage: out.usage };
}
/**
 * RR-320 B · Q1 "how many people take it": the client's AI SEARCHES the web for a page that states a figure — a lead only; Visibility then
 * READS that page itself and keeps the figure only where the page states it (desktop/research5.mjs figureOf).
 */
export async function figureLeadAI({ provider, key, subject, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false, why: "Connect your AI to look this up." };
  const schema = { type: "object", additionalProperties: false, required: ["url"], properties: { url: { type: "string" } } };
  let r;
  try { r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(120000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version }, body: JSON.stringify({ model: AI.model, max_tokens: 1500, system: `Find ONE page that states how many people take ${subject} (a yearly or total figure) — its own official site first. Give its address only; an address you found in your search.`, tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }], messages: [{ role: "user", content: `Subject: ${subject}` }], output_config: { format: { type: "json_schema", schema } } }) }); }
  catch { return { ok: false, why: "Your AI did not answer." }; }
  if (!r.ok) return { ok: false, why: `Your AI answered with an error (${r.status}).` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens, model: body.model ?? AI.model } : null;
  try { const url = JSON.parse((body?.content ?? []).filter((b) => b?.type === "text").at(-1)?.text)?.url; return /^https:\/\//.test(url ?? "") ? { ok: true, url, usage } : { ok: false, why: "Your AI found no page.", usage }; } catch { return { ok: false, why: "Your AI's answer could not be read.", usage }; }
}
/**
 * The client's AI suggests the questions people ask about the subject — RESEARCH, never counted as searches: each is said as "your AI's
 * research", and a question naming a place or body none of the material names is left out (the truth guard's rule).
 */
export async function researchQuestionsAI({ provider, key, subject, what = "", countries = [], professions = [], fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false, why: "Connect your AI to add its research." };
  const schema = { type: "object", additionalProperties: false, required: ["questions"], properties: { questions: { type: "array", items: { type: "string" } } } };
  const material = `SUBJECT: ${subject}\nWHAT THE PRODUCT IS: ${String(what).slice(0, 800)}\nCOUNTRIES: ${countries.join(", ")}\nPROFESSIONS: ${professions.join(", ")}`;
  const out = await askJSON({ key, schema, fetchImpl, base, system: `List up to 40 real questions people ask about ${subject} before and while they prepare: requirements per country and profession, fees, scoring, comparisons with other tests, taking it on computer or at home, results, preparation. Short, as people type them — in their own words and language where they would (RR-322 B4: e.g. Roman Urdu, Hindi, Arabic, local currencies and cities). Only places and professions from the material.`, user: material });
  if (!out.ok) return out;
  const allowed = new Set([...countries.map((c) => c.toLowerCase()), ...professions.map((p) => p.toLowerCase())]);
  const qs = (out.data?.questions ?? []).map((q) => String(q).trim()).filter((q) => q.length >= 8 && q.length <= 160).filter((q) => countriesIn(q).every((c) => allowed.has(c.toLowerCase())));
  return { ok: true, usage: out.usage, questions: qs.slice(0, 40) };
}

/*
 * 🔴 RR-322 B3 · THE PROOF LAW FOR AI TEXT: the client's AI may write explanation, tips, steps and checklists; a SCORE, FEE, RULE or DATE
 * only from a source with its date. So every sentence the AI writes that carries a number not among the page's own sourced facts is DROPPED
 * — the explanation stays, an invented number never reaches a page.
 */
export function keepSourcedNumbers(text, facts = []) {
  const allowed = new Set(facts.flatMap((f) => String(f).match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(",", ".")));
  return String(text ?? "").split(/(?<=[.!?])\s+/).filter((s) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).every((n) => allowed.has(n.replace(",", ".")))).join(" ").trim();
}
const EXPLAIN_SCHEMA = { type: "object", additionalProperties: false, required: ["pages"], properties: { pages: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "answer", "points", "steps", "checklist", "tip"], properties: { title: { type: "string" }, answer: { type: "string" }, points: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "string" } }, checklist: { type: "array", items: { type: "string" } }, tip: { type: "string" } } } } } };
/** explanation for pages (topics, profession × sub-test): their own words, per page; numbers only those of the page's facts (kept by keepSourcedNumbers) */
export async function explainPagesAI({ provider, key, subject, pages, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false, why: "Connect your AI to add explanations." };
  const user = pages.map((p) => `PAGE: ${p.title}\nQUESTIONS: ${(p.questions ?? []).slice(0, 6).join(" | ")}\nFACTS (the only numbers you may use): ${(p.facts ?? []).join(" | ") || "none"}`).join("\n\n");
  const out = await askJSON({ key, schema: EXPLAIN_SCHEMA, fetchImpl, base, maxTokens: 8000, system: `For each page, write for a healthcare professional preparing for ${subject}: "answer" — 30 to 50 words answering the page's question first; "points" — 6 to 8 short, useful explanation points (how it works, what to watch for, common mistakes; for a profession's sub-test: its own task, case types, vocabulary and common mistakes); "steps" — 3 to 5; "checklist" — 4 to 6; "tip" — one. Plain words, no filler. Use NO number that is not in that page's FACTS. Opinions are said as "candidates often say …", never as fact.`, user });
  if (!out.ok) return out;
  const byTitle = new Map(pages.map((p) => [p.title, p])), result = {};
  for (const x of out.data?.pages ?? []) { const p = byTitle.get(x.title); if (!p) continue; const k = (s) => keepSourcedNumbers(s, p.facts ?? []); result[x.title] = { answer: k(x.answer), points: (x.points ?? []).map(k).filter(Boolean).slice(0, 8), steps: (x.steps ?? []).map(k).filter(Boolean).slice(0, 5), checklist: (x.checklist ?? []).map(k).filter(Boolean).slice(0, 6), tip: k(x.tip) || null, by: "your AI (explanation; facts from their sources)" }; }
  return { ok: true, usage: out.usage, pages: result };
}
const TRANSLATE_SCHEMA = { type: "object", additionalProperties: false, required: ["pages"], properties: { pages: { type: "array", items: { type: "object", additionalProperties: false, required: ["base", "title", "answer", "steps", "checklist", "tip"], properties: { base: { type: "string" }, title: { type: "string" }, answer: { type: "string" }, steps: { type: "array", items: { type: "string" } }, checklist: { type: "array", items: { type: "string" } }, tip: { type: "string" } } } } } };
/** the strongest pages in another language: the same answer, steps, checklist and tip — every number exactly as in the page */
export async function translatePagesAI({ provider, key, lang, langName, pages, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false, why: "Connect your AI to make pages in other languages." };
  const user = pages.map((p) => `BASE: ${p.title}\nANSWER: ${p.content.answer}\nSTEPS: ${(p.content.steps ?? []).join(" | ")}\nCHECKLIST: ${(p.content.checklist ?? []).join(" | ")}\nTIP: ${p.content.tip ?? ""}`).join("\n\n");
  const out = await askJSON({ key, schema: TRANSLATE_SCHEMA, fetchImpl, base, maxTokens: 8000, system: `Write each page in ${langName}, as people in that language search and speak — natural, not word for word. Keep every number, grade, name and date exactly as it is. "title" is the page's title in ${langName}, in the words people search. Copy BASE unchanged.`, user });
  if (!out.ok) return out;
  const byTitle = new Map(pages.map((p) => [p.title, p])), result = {};
  for (const x of out.data?.pages ?? []) { const p = byTitle.get(x.base); if (!p) continue; const facts = [p.content.answer, ...(p.content.steps ?? []), ...(p.content.checklist ?? []), p.content.tip ?? ""]; const k = (s) => keepSourcedNumbers(s, facts); result[`${lang}|${x.base}`] = { title: String(x.title).slice(0, 90), content: { answer: k(x.answer), steps: (x.steps ?? []).map(k).filter(Boolean), checklist: (x.checklist ?? []).map(k).filter(Boolean), tip: k(x.tip) || null, by: `your AI (in ${langName}; every number as in the English page)` } }; }
  return { ok: true, usage: out.usage, pages: result };
}
/* RR-323 · ORIGINAL practice samples (desktop/samples.mjs checks each one). Every field present (empty when not this sub-test's) — the
 * structured-output schema accepts no optional field */
const SAMPLE_SCHEMA = { type: "object", additionalProperties: false, required: ["samples"], properties: { samples: { type: "array", items: { type: "object", additionalProperties: false, required: ["key", "title", "task", "caseNotes", "letter", "card", "script", "text", "questions"], properties: {
  key: { type: "string" }, title: { type: "string" }, task: { type: "string" }, caseNotes: { type: "array", items: { type: "string" } }, letter: { type: "string" },
  card: { type: "object", additionalProperties: false, required: ["setting", "role", "tasks"], properties: { setting: { type: "string" }, role: { type: "string" }, tasks: { type: "array", items: { type: "string" } } } },
  script: { type: "string" }, text: { type: "string" }, questions: { type: "array", items: { type: "object", additionalProperties: false, required: ["q", "options", "answer"], properties: { q: { type: "string" }, options: { type: "array", items: { type: "string" } }, answer: { type: "string" } } } } } } } } };
/** pages: [{ key, title, subtest, profession, facts: [the subject's own format facts, in Visibility's words] }] → { ok, samples: { key: {…} } }.
 * The label is added by Visibility, never written by the AI; the AI's numbers here are a fictional patient's (not facts about the test). */
export async function samplesAI({ provider, key, subject, by, pages, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic" || !key) return { ok: false, why: "Connect your AI to write the practice samples." };
  const user = pages.map((p) => `KEY: ${p.key}\nPAGE: ${p.title}\nSUB-TEST: ${p.subtest}\nPROFESSION: ${p.profession ?? "any healthcare profession"}\nFORMAT (the subject's own pages): ${(p.facts ?? []).join(" | ") || "none stated"}`).join("\n\n");
  const out = await askJSON({ key, schema: SAMPLE_SCHEMA, fetchImpl, base, maxTokens: 12000, system: `Write ONE ORIGINAL practice sample per page for ${by}, for people preparing for ${subject}. Invent everything: new patients, names, places, dates and details. NEVER reproduce, paraphrase closely or recall any official ${subject} sample or past paper, or any other provider's material (E2, Benchmark, Kaplan or anyone's) — and never name a provider. Follow the FORMAT exactly. Writing: "caseNotes" 8 to 14 short case-note lines, "task" the instruction, "letter" a model letter inside the stated word range. Speaking: "card" with the setting, the candidate's role and 4 tasks. Listening: "script" a consultation of about 200 words, 6 "questions" (note completion, "options" empty) with their answers. Reading: "text" a health text of about 250 words, 6 "questions" with their options and answers. Fields that are not for this sub-test are empty. "key" copies KEY. Plain, natural English at the level of a working health professional.`, user });
  if (!out.ok) return out;
  const want = new Set(pages.map((p) => p.key)), samples = {};
  for (const x of out.data?.samples ?? []) if (want.has(x.key)) samples[x.key] = { title: x.title, task: x.task || null, caseNotes: x.caseNotes ?? [], letter: x.letter || null, card: x.card?.setting ? x.card : null, script: x.script || null, text: x.text || null, questions: (x.questions ?? []).filter((q) => q.q), by: "your AI" };
  return { ok: true, usage: out.usage, samples };
}
