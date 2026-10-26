/**
 * 🔴 RR-328 B · THE COUNTRY FACTS AI — AlmiWorld's OWN Anthropic key (ANTHROPIC_API_KEY in Vercel, its own workspace with a monthly limit,
 * set by the owner). It PROPOSES: a candidate fact always comes with the page it stands on; the collector then reads that page itself and
 * stores the fact as "confirmed" only when it is there (cf-collector.mjs). An AI's word alone is never shown on a page.
 *   · Claude's Messages API on api.anthropic.com — the same plain HTTPS call as desktop/ai-write.mjs (no SDK in this repository); its web
 *     search is Anthropic's own server tool (an official API — never a Google result page read by us);
 *   · the key is set on the outgoing request from its NAME at the moment of sending — never kept, printed, logged, hashed or measured;
 *   · every call's price is counted (tokens and searches, Anthropic's own prices) against the collector's daily cap.
 */
import { NAME_TYPES } from "../desktop/country-facts.mjs";

export const CF_AI = Object.freeze({ origin: "https://api.anthropic.com", path: "/v1/messages", version: "2023-06-01", model: "claude-opus-5-5", fallbackBeta: "server-side-fallback-2026-07-01", keyName: "ANTHROPIC_API_KEY", search: "web_search_20260209", maxSearches: 6,
  /* Claude Opus 5.5: $4 per million input tokens, $20 per million output; web search $10 per 1,000 — Anthropic's pricing page (platform.claude.com/docs/en/about-claude/pricing), read 2026-10-25 */
  price: Object.freeze({ inPerM: 4, outPerM: 20, perSearch: 0.01 }) });
export const aiConfigured = (env = process.env) => String(env[CF_AI.keyName] ?? "").length > 20;
/** a call's price in US dollars, from its own usage counts */
export const costOf = (u) => (Number(u?.input_tokens ?? 0) + Number(u?.cache_creation_input_tokens ?? 0) + Number(u?.cache_read_input_tokens ?? 0) * 0.1) * CF_AI.price.inPerM / 1e6 + Number(u?.output_tokens ?? 0) * CF_AI.price.outPerM / 1e6 + Number(u?.server_tool_use?.web_search_requests ?? 0) * CF_AI.price.perSearch;

/**
 * One question to the AI, its answer as JSON in `schema`. `search`: may it search the web (Anthropic's tool, at most CF_AI.maxSearches).
 * → { ok, data, usd, searches } | { ok: false, why, usd, searches }
 */
export async function askAi({ env = process.env, fetchImpl = fetch, base = CF_AI.origin, system, prompt, schema, search = false, maxTokens = 8000, timeoutMs = 150000 }) {
  if (!aiConfigured(env)) return { ok: false, why: "ANTHROPIC_API_KEY is not set in Vercel yet.", usd: 0, searches: 0 };
  const messages = [{ role: "user", content: prompt }];
  let usd = 0, searches = 0;
  for (let turn = 0; turn < 4; turn++) {
    let r, body;
    try {
      r = await fetchImpl(`${base}${CF_AI.path}`, { method: "POST", signal: AbortSignal.timeout(timeoutMs), headers: { "content-type": "application/json", "x-api-key": env[CF_AI.keyName], "anthropic-version": CF_AI.version, "anthropic-beta": CF_AI.fallbackBeta },
        body: JSON.stringify({ model: CF_AI.model, max_tokens: maxTokens, fallbacks: "default", system, messages, output_config: { effort: "medium", format: { type: "json_schema", schema } }, ...(search ? { tools: [{ type: CF_AI.search, name: "web_search", max_uses: CF_AI.maxSearches }] } : {}) }) });
      body = await r.json().catch(() => null);
    } catch (e) { return { ok: false, why: e?.name === "TimeoutError" ? "the AI did not answer in time" : "the AI could not be reached", usd, searches }; }
    usd += costOf(body?.usage); searches += Number(body?.usage?.server_tool_use?.web_search_requests ?? 0);
    if (!r.ok) return { ok: false, why: `the AI answered ${r.status}${body?.error?.type ? ` (${body.error.type})` : ""}`, usd, searches };
    if (body?.stop_reason === "refusal") return { ok: false, why: "the AI declined this question", usd, searches };
    /* a long search may pause its turn: send its work back and let it go on */
    if (body?.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: body.content }); continue; }
    const text = (body?.content ?? []).filter((b) => b?.type === "text").map((b) => b.text).join("").trim();
    try { return { ok: true, data: JSON.parse(text), usd, searches }; } catch { return { ok: false, why: "the AI's answer could not be read", usd, searches }; }
  }
  return { ok: false, why: "the AI's search did not finish", usd, searches };
}

/* ── the three questions the collector asks ── */
const COUNCIL_SCHEMA = { type: "object", additionalProperties: false, required: ["councils"], properties: { councils: { type: "array", items: { type: "object", additionalProperties: false, required: ["profession", "name", "nameType", "website", "address", "sourceUrl"], properties: { profession: { type: "string" }, name: { type: "string" }, nameType: { type: "string", enum: [...NAME_TYPES] }, website: { type: "string" }, address: { type: "string" }, sourceUrl: { type: "string" } } } } } };
const RULE_SCHEMA = { type: "object", additionalProperties: false, required: ["rules"], properties: { rules: { type: "array", items: { type: "object", additionalProperties: false, required: ["kind", "rule", "quote", "sourceUrl"], properties: { kind: { type: "string" }, rule: { type: "string" }, quote: { type: "string" }, sourceUrl: { type: "string" } } } } } };
const ANSWER_SCHEMA = { type: "object", additionalProperties: false, required: ["answers"], properties: { answers: { type: "array", items: { type: "object", additionalProperties: false, required: ["group", "answer"], properties: { group: { type: "string" }, answer: { type: "string" } } } } } };

const SOURCING = "You propose facts for AlmiWorld's own pages. Every fact you give must stand, in words, on the official page you name in sourceUrl — the organisation's own website or its government's — because a program will open that page and look for it; a fact not found there is thrown away. Never guess a name, a website or an address: leave out what you did not find on an official page. Give web addresses in full (https://…).";
/* RR-328 addition (rule R1): any same-meaning name; the names already tried are named so the next day's search looks further */
export const councilQuestion = ({ country, subject, professions, known = [], tried = {} }) => ({ search: true, schema: COUNCIL_SCHEMA, system: SOURCING,
  prompt: `Country: ${country}. For each of these professions, find the official body in ${country} that does this job for people of that profession — registers or licenses them to practise, or checks their credentials: ${professions.join(", ")}.\nIt may have ANY name with this meaning: ${NAME_TYPES.join("; ")} (the national ${subject} test office or venue counts as "national test office or venue"; an embassy or consulate counts where it checks credentials).\nFor each, give: profession (exactly as written above), the body's official name, nameType (one of the types above), its official website, its postal address, and sourceUrl — the page on that official website where its name and this address both appear (often its contact page).${known.length ? `\nAlready known from official records (confirm their address and add the others): ${known.map((k) => `${k.profession}: ${k.name} (${k.link})`).join("; ")}.` : ""}${Object.keys(tried).length ? `\nAlready tried and NOT confirmed on an official page (look for another body or another official page): ${Object.entries(tried).map(([p, t]) => `${p}: ${t.names.join(", ")}`).join("; ")}.` : ""}\nOne body may serve several professions: list it once per profession. ${subject} is the English test these people take; it does not matter for this question.` });
export const ruleQuestion = ({ country, subject, councils = [] }) => ({ search: true, schema: RULE_SCHEMA, system: SOURCING,
  prompt: `Country: ${country}. Health professionals trained in ${country} who want to register abroad (they take ${subject}) often need something done in ${country} first: a verification or good-standing letter from their home council, documents attested or apostilled, a registration step. Find up to 3 such rules that are specific to ${country}, each on an official page (the council's or the government's).${councils.length ? ` The home councils already found: ${councils.join("; ")}.` : ""}\nFor each give: kind (one of: good standing, verification, documents, attestation, registration, other), rule — one plain sentence in your own words, quote — 8 to 40 words copied EXACTLY from the page, and sourceUrl.` });
export const answerQuestion = ({ country, subject, groups, facts }) => ({ search: false, schema: ANSWER_SCHEMA,
  system: `You write short answers (at most 60 words each) to what people in ${country} search about ${subject}. Use ONLY the facts given for any number, fee, date, score, name or place; general guidance may be in your own words. Never add a number that is not in the facts. If the facts do not answer a group, give general guidance without numbers.`,
  prompt: `Facts (each from an official page):\n${facts.map((f) => `- ${f}`).join("\n") || "- (none yet)"}\n\nGroups of searches from ${country} (answer each by its group id):\n${groups.map((g) => `- ${g.group}: ${g.keywords.slice(0, 5).join(" | ")}`).join("\n")}` });
