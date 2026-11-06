/**
 * 🔴 RR-379 item 6 (owner, 6 Nov 2026) · AI SEARCH VISIBILITY TRACKER. For a client's brand and topics, Visibility asks the AI assistants a set
 * of real questions — through their OFFICIAL APIs with web search, on the CLIENT's own keys (AlmiWorld's own products use AlmiWorld's own
 * Anthropic key) — and Google's AI Overviews through DataForSEO's search data. For each answer it keeps: the date, the engine, whether the
 * brand is named, whether the client's site is cited (and which address), and the other brands and sites named. A score (0–100) and its
 * trend over runs; and for each answer the brand is missing from, what was cited instead and what page would answer it.
 * What an assistant says is an OBSERVATION on that day, with its engine and date — never a promise of a mention, a citation or traffic.
 * Pure: every request goes through the fetch handed in; each engine's money is booked by the caller.
 */
export const ENGINES = Object.freeze({
  claude: Object.freeze({ id: "claude", name: "Claude (Anthropic)", keyName: "ANTHROPIC_API_KEY", url: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-5-5", worstUsd: 0.08 }),
  chatgpt: Object.freeze({ id: "chatgpt", name: "ChatGPT (OpenAI)", keyName: "OPENAI_API_KEY", url: "https://api.openai.com/v1/responses", model: "gpt-5-mini", worstUsd: 0.06, prices: { input: 0.25, output: 2, perSearch: 0.01 } }),
  perplexity: Object.freeze({ id: "perplexity", name: "Perplexity", keyName: "PERPLEXITY_API_KEY", url: "https://api.perplexity.ai/chat/completions", model: "sonar", worstUsd: 0.02, prices: { input: 1, output: 1, perRequest: 0.005 } }),
  gemini: Object.freeze({ id: "gemini", name: "Gemini (Google)", keyName: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/models", model: "gemini-2.5-flash", worstUsd: 0.05, prices: { input: 0.3, output: 2.5, perRequest: 0.035 } }),
  aio: Object.freeze({ id: "aio", name: "Google AI Overviews", keyName: null, path: "/serp/google/organic/live/advanced", worstUsd: 0.012 }),
});
export const AIV = Object.freeze({ maxQuestions: 30, maxTokens: 1500 });
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
export const ASK_SYSTEM = "Answer the user's question helpfully, using web search. Name specific products, services, websites or organisations where they help, and cite your sources.";

/* ── one request per engine (each returns { text, cites:[{url,title}], usage:{usd,...} } or { fail, stop? }) ── */
const failOf = (r, name) => (r.status === 401 || r.status === 403 ? { fail: `${name} refused the key (${r.status}).`, stop: true } : r.status === 429 ? { fail: `${name} is busy or out of credit (429).`, stop: true } : { fail: `${name} answered with an error (${r.status}).` });
export async function askClaude({ key, question, fetchImpl = fetch, url = ENGINES.claude.url }) {
  let r; try { r = await fetchImpl(url, { method: "POST", signal: AbortSignal.timeout(180000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: ENGINES.claude.model, max_tokens: AIV.maxTokens, system: ASK_SYSTEM, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }], messages: [{ role: "user", content: question }] }) }); } catch { return { fail: "Claude did not answer." }; }
  if (!r.ok) return failOf(r, "Claude");
  const j = await r.json().catch(() => null), blocks = j?.content ?? [], text = clean(blocks.filter((b) => b?.type === "text").map((b) => b.text).join(" ")), cites = [];
  for (const b of blocks) for (const c of b?.citations ?? []) if (c?.url && !cites.some((x) => x.url === c.url)) cites.push({ url: c.url, title: clean(c.title) });
  const u = j?.usage ?? {}, inT = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), outT = u.output_tokens ?? 0, searches = u.server_tool_use?.web_search_requests ?? 0;
  return { text, cites, usage: { input: inT, output: outT, searches, model: j?.model ?? ENGINES.claude.model, route: "aiv" } };
}
export async function askChatGpt({ key, question, fetchImpl = fetch, model = ENGINES.chatgpt.model, url = ENGINES.chatgpt.url, prices = ENGINES.chatgpt.prices }) {
  let r; try { r = await fetchImpl(url, { method: "POST", signal: AbortSignal.timeout(180000), headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, tools: [{ type: "web_search" }], input: question, max_output_tokens: 4000 }) }); } catch { return { fail: "ChatGPT did not answer." }; }
  if (!r.ok) return failOf(r, "ChatGPT");
  const j = await r.json().catch(() => null), parts = (j?.output ?? []).filter((o) => o?.type === "message").flatMap((o) => o.content ?? []).filter((c) => c?.type === "output_text");
  const text = clean(parts.map((p) => p.text).join(" ")), cites = []; for (const p of parts) for (const a of p.annotations ?? []) if (a?.type === "url_citation" && a.url && !cites.some((x) => x.url === a.url)) cites.push({ url: a.url, title: clean(a.title) });
  const searches = (j?.output ?? []).filter((o) => o?.type === "web_search_call").length, inT = j?.usage?.input_tokens ?? 0, outT = j?.usage?.output_tokens ?? 0;
  return { text, cites, usage: { usd: (inT * prices.input + outT * prices.output) / 1e6 + searches * prices.perSearch, input: inT, output: outT, searches, model: j?.model ?? model, estimate: true } };
}
export async function askPerplexity({ key, question, fetchImpl = fetch, model = ENGINES.perplexity.model, url = ENGINES.perplexity.url, prices = ENGINES.perplexity.prices }) {
  let r; try { r = await fetchImpl(url, { method: "POST", signal: AbortSignal.timeout(120000), headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "user", content: question }] }) }); } catch { return { fail: "Perplexity did not answer." }; }
  if (!r.ok) return failOf(r, "Perplexity");
  const j = await r.json().catch(() => null), text = clean(j?.choices?.[0]?.message?.content), list = j?.search_results?.length ? j.search_results.map((s) => ({ url: s.url, title: clean(s.title) })) : (j?.citations ?? []).map((u) => ({ url: u, title: "" }));
  const inT = j?.usage?.prompt_tokens ?? 0, outT = j?.usage?.completion_tokens ?? 0;
  return { text, cites: list.filter((c) => c.url), usage: { usd: (inT * prices.input + outT * prices.output) / 1e6 + prices.perRequest, input: inT, output: outT, model, estimate: true } };
}
export async function askGemini({ key, question, fetchImpl = fetch, model = ENGINES.gemini.model, url = ENGINES.gemini.url, prices = ENGINES.gemini.prices }) {
  let r; try { r = await fetchImpl(`${url}/${encodeURIComponent(model)}:generateContent`, { method: "POST", signal: AbortSignal.timeout(120000), headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ parts: [{ text: question }] }], tools: [{ google_search: {} }] }) }); } catch { return { fail: "Gemini did not answer." }; }
  if (!r.ok) return failOf(r, "Gemini");
  const j = await r.json().catch(() => null), c = j?.candidates?.[0], text = clean((c?.content?.parts ?? []).map((p) => p.text ?? "").join(" "));
  const cites = (c?.groundingMetadata?.groundingChunks ?? []).map((g) => ({ url: g.web?.uri ?? null, title: clean(g.web?.title) })).filter((x) => x.url);
  const inT = j?.usageMetadata?.promptTokenCount ?? 0, outT = j?.usageMetadata?.candidatesTokenCount ?? 0;
  return { text, cites, usage: { usd: (inT * prices.input + outT * prices.output) / 1e6 + (cites.length ? prices.perRequest : 0), input: inT, output: outT, model, estimate: true } };
}
/** Google's AI Overview, from DataForSEO's organic result (load_async_ai_overview) → { text, cites } or { none: true } */
export function aiOverviewOf(result) {
  const items = (result ?? []).flatMap((r) => r?.items ?? []), ov = items.find((x) => x?.type === "ai_overview"); if (!ov) return { none: true, text: "", cites: [] };
  const parts = [ov, ...(ov.items ?? [])], text = clean(parts.map((p) => p.markdown ?? p.text ?? "").join(" ")), cites = [];
  for (const p of parts) for (const ref of p.references ?? []) if (ref?.url && !cites.some((x) => x.url === ref.url)) cites.push({ url: ref.url, title: clean(ref.title ?? ref.source) });
  return { text, cites };
}
export const aioTask = (question, location = "United States", language = "en") => ({ keyword: question, location_name: location, language_code: language, depth: 10, load_async_ai_overview: true });

/* ── reading an answer ── */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const named = (text, name) => { const n = clean(name); return n.length >= 3 && new RegExp(`(?:^|[^\\p{L}\\p{N}])${esc(n)}(?:$|[^\\p{L}\\p{N}])`, "iu").test(text); };
/** → { mentioned, cited, citedUrls, competitorsNamed, otherSites } */
export function readAnswer({ text, cites }, { brand, aliases = [], domain, competitors = [] }) {
  const names = [brand, ...aliases].filter(Boolean), t = String(text ?? ""), mentioned = names.some((n) => named(t, n)) || (domain ? t.toLowerCase().includes(domain) : false);
  const citedUrls = (cites ?? []).map((c) => c.url).filter((u) => { const h = hostOf(u); return domain && h && (h === domain || h.endsWith(`.${domain}`)); });
  const titleHit = (cites ?? []).some((c) => names.some((n) => named(c.title ?? "", n)));
  const competitorsNamed = competitors.filter((c) => named(t, c.name ?? c) || (cites ?? []).some((x) => c.domain && hostOf(x.url) === c.domain)).map((c) => c.name ?? c);
  const otherSites = [...new Set((cites ?? []).map((c) => hostOf(c.url)).filter((h) => h && h !== domain && !h.endsWith(`.${domain}`) && !/vertexaisearch|google\.com$/.test(h)))].slice(0, 8);
  return { mentioned, cited: citedUrls.length > 0 || titleHit, citedUrls, competitorsNamed, otherSites };
}
/** the score of one run: half for being named, half for being cited, over every answer read */
export function visibilityScore(rows) {
  const read = rows.filter((r) => !r.fail && !r.none); if (!read.length) return null;
  return Math.round(((read.filter((r) => r.mentioned).length + read.filter((r) => r.cited).length) / (2 * read.length)) * 100);
}
export function byEngine(rows) {
  const by = {}; for (const r of rows) { const e = (by[r.engine] ??= { engine: r.engine, asked: 0, answered: 0, mentioned: 0, cited: 0, none: 0, failed: 0 }); e.asked++; if (r.fail) e.failed++; else if (r.none) e.none++; else { e.answered++; if (r.mentioned) e.mentioned++; if (r.cited) e.cited++; } }
  return Object.values(by).map((e) => ({ ...e, score: e.answered ? Math.round(((e.mentioned + e.cited) / (2 * e.answered)) * 100) : null }));
}
/** for each question the brand is missing from: who won it, and the page that would answer it */
export function suggestions(rows, { site }) {
  const miss = new Map(); for (const r of rows) { if (r.fail || r.none || r.mentioned) continue; const m = miss.get(r.question) ?? { question: r.question, engines: [], sites: new Map() }; m.engines.push(r.engine); for (const s of r.otherSites ?? []) m.sites.set(s, (m.sites.get(s) ?? 0) + 1); miss.set(r.question, m); }
  return [...miss.values()].map((m) => ({ question: m.question, engines: [...new Set(m.engines)], citedInstead: [...m.sites.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([s]) => s),
    do: `Give ${site ?? "your site"} a page that answers "${m.question}" in its first lines, with your name, the facts and their sources (Create SEO pages makes it), and FAQ markup; the sites cited instead show what the assistants read.` }));
}
/** the trend: one point per run */
export const trendOf = (runs) => (runs ?? []).map((r) => ({ on: r.on, score: r.score, engines: r.engines?.map((e) => ({ engine: e.engine, score: e.score })) ?? [] }));
/** questions: the client's own list first, then the product's real searches and questions (never made up); brand questions added */
export function questionSet({ own = [], asked = [], phrases = [], brand, max = 10 }) {
  const seen = new Set(), out = [], add = (q, from) => { const t = clean(q); const k = t.toLowerCase(); if (t.length < 8 || t.length > 200 || seen.has(k) || out.length >= max) return; seen.add(k); out.push({ question: t /* RR-379 proof: "What is the best oet exam price?" — a phrase is asked as people type it, never reworded */, from }); };
  for (const q of own) add(q, "your list");
  for (const q of asked) add(q.text ?? q, q.source ?? "questions people ask");
  for (const p of phrases) add(p.text ?? p, p.source ?? "searches people make");
  if (brand && out.length < max) add(`What is ${brand}?`, "the brand itself");
  return out;
}
