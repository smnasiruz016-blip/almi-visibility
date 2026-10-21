/**
 * 🔴 RR-311 B6 + D5 · THE AI COACH AND WHAT THE CLIENT'S AI COSTS (owner, 21 Oct 2026).
 *   · AI COACH: the client asks about THEIR OWN channel in the app ("mera channel kyun nahien barh raha?"). The answer is written by the
 *     client's own AI, ONLY from the numbered facts Visibility hands it (the channel's own numbers, its score, its findings, the niche research,
 *     the competitors) — each sentence citing its fact, in the language of the question. A question the facts cannot answer is said so.
 *   · COST: every AI request is counted with the tokens the AI itself reports, at Anthropic's published price for the model, and shown —
 *     "AI used today: N requests (about $X)" — with a monthly cap the client sets (default $10); at the cap, AI is not called.
 * The key comes from Windows' secure store and goes ONLY to the provider's own address (desktop/ai-write.mjs AI.origin).
 */
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { AI } from "./ai-write.mjs";

/* Anthropic's published price for Claude Opus 5.5: $4 per million input tokens, $20 per million output tokens */
export const PRICE = Object.freeze({ model: AI.model, inPerMillion: 4, outPerMillion: 20, source: "Anthropic's price for Claude Opus 5.5 — $4 per million tokens in, $20 out" });
export const DEFAULT_CAP_USD = 10;
export const costOf = (u) => ((u?.input ?? 0) * PRICE.inPerMillion + (u?.output ?? 0) * PRICE.outPerMillion) / 1e6;
const money = (x) => (x < 0.01 ? "under $0.01" : `$${x.toFixed(2)}`);

/** the ledger of the client's AI use — this computer only; the month's total against the cap */
export function aiLedger(file, { now = () => Date.now(), cap = () => DEFAULT_CAP_USD } = {}) {
  const read = () => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return { days: {} }; } };
  const today = () => new Date(now()).toISOString().slice(0, 10), month = () => today().slice(0, 7);
  const self = {
    month() { const l = read(); return Object.entries(l.days).filter(([d]) => d.startsWith(month())).reduce((t, [, x]) => ({ requests: t.requests + x.requests, usd: t.usd + x.usd }), { requests: 0, usd: 0 }); },
    today() { return read().days[today()] ?? { requests: 0, usd: 0 }; },
    /** may AI be called now? (the month is under the cap) */
    allowed() { const m = self.month(); return m.usd < cap() ? { ok: true } : { ok: false, why: `Your AI limit for this month is reached (${money(m.usd)} of ${money(cap())}). Raise it in Settings → Your AI connection, or wait for next month. The template options stay.` }; },
    add(usage) { const l = read(), d = today(), x = l.days[d] ?? { requests: 0, usd: 0, input: 0, output: 0 }; const c = costOf(usage); l.days[d] = { requests: x.requests + 1, usd: x.usd + c, input: x.input + (usage?.input ?? 0), output: x.output + (usage?.output ?? 0) }; writeFileSync(`${file}.tmp`, JSON.stringify(l)); renameSync(`${file}.tmp`, file); return c; },
    line() { const t = self.today(), m = self.month(); return `AI used today: ${t.requests} request${t.requests === 1 ? "" : "s"} (about ${money(t.usd)}). This month: about ${money(m.usd)} of your ${money(cap())} limit. (${PRICE.source}.)`; },
  };
  return self;
}

const SCHEMA = { type: "object", additionalProperties: false, required: ["answer", "facts"], properties: { answer: { type: "string" }, facts: { type: "array", items: { type: "integer" } } } };
/** one question about the client's own channel, answered only from the numbered facts */
export async function askCoach({ key, question, facts, fetchImpl = fetch, base = AI.origin }) {
  if (!key) return { ok: false, why: "Connect your AI key first (Settings → Your AI connection)." };
  const q = String(question ?? "").trim(); if (q.length < 3 || q.length > 600) return { ok: false, why: "Ask a question of up to 600 characters." };
  const list = facts.map((f, i) => `[${i + 1}] ${f.text} (source: ${f.source})`).join("\n");
  const system = "You are a YouTube coach for ONE small creator. Answer ONLY from the numbered facts about their own channel. Every sentence that states a fact ends with its number in brackets, like [3]. Never add a number, a place, a person or a claim that is not in the facts. If the facts do not answer the question, say so plainly and say which data would answer it. Give 2–4 concrete next steps. Answer in the language and script of the question (Roman Urdu if asked in Roman Urdu). Keep it under 180 words.";
  let r;
  try {
    r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version, "anthropic-beta": AI.fallbackBeta },
      body: JSON.stringify({ model: AI.model, max_tokens: 2000, fallbacks: "default", system, messages: [{ role: "user", content: `FACTS ABOUT MY CHANNEL:\n${list}\n\nMY QUESTION: ${q}` }], output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } }) });
  } catch { return { ok: false, why: "Your AI did not answer — try again." }; }
  if (r.status === 401 || r.status === 403) return { ok: false, why: "Your AI refused the key — check it in Settings → Your AI connection." };
  if (!r.ok) return { ok: false, why: `Your AI answered with an error (${r.status}).` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens } : null;
  if (body?.stop_reason === "refusal") return { ok: false, why: "Your AI declined this question.", usage };
  let p; try { p = JSON.parse((body?.content ?? []).find((b) => b?.type === "text")?.text); } catch { return { ok: false, why: "Your AI's answer could not be read.", usage }; }
  /* the cited facts must exist; an answer citing none is shown with that said */
  const cited = [...new Set([...(p.facts ?? []), ...[...String(p.answer).matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))])].filter((n) => n >= 1 && n <= facts.length);
  return { ok: true, answer: String(p.answer).trim(), sources: cited.map((n) => ({ n, ...facts[n - 1] })), usage, note: cited.length ? null : "This answer cites none of your channel's facts — read it as general advice." };
}
