/**
 * 🔴 RR-308 B6 · AI WRITING WITH THE CLIENT'S OWN KEY (owner, 21 Oct 2026: "if the client's own AI key is connected, use it to write the
 * options (grounded in the research; no invented facts). Without AI, use templates, and say plainly that AI gives better options").
 *   · Only on the client's own click ("Write better options with AI", one video at a time) — never by itself, so the client's AI bill is
 *     theirs to decide. The key comes from Windows' secure store (desktop/secrets.mjs) and goes ONLY to the provider's own address.
 *   · GROUNDED: the AI is handed the video's own title and description, the channel's own description, who and where the channel is, and
 *     the niche research — and told to use nothing else. Every option it writes is CHECKED before it is shown: a capitalised word or a number
 *     that is in none of that material is an invented fact, and the option is dropped. Fewer than 2 clean options → the templates stay, said.
 *   · Anthropic (Claude) is supported in this version, through its Messages API on api.anthropic.com (the same plain HTTPS call the engine's
 *     own provider adapter makes — src/research/ai-providers/anthropic.mjs). A key of another provider is said plainly.
 */
import { placesIn } from "./youtube-niche.mjs";

export const AI = Object.freeze({ origin: "https://api.anthropic.com", path: "/v1/messages", version: "2023-06-01", model: "claude-opus-5-5", fallbackBeta: "server-side-fallback-2026-07-01" });
/* RR-311 B4: each option DECLARES the people it names and the facts it states, each fact with the words of the material it comes from */
const SCHEMA = { type: "object", additionalProperties: false, required: ["options"], properties: { options: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "description", "hashtags", "thumbnail", "names", "facts"], properties: { title: { type: "string" }, description: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }, thumbnail: { type: "string" }, names: { type: "array", items: { type: "string" } }, facts: { type: "array", items: { type: "object", additionalProperties: false, required: ["fact", "quote"], properties: { fact: { type: "string" }, quote: { type: "string" } } } } } } } } };

/** The material the AI may use — the only places, people, numbers and claims an option may name. */
export function materialOf(v, ctx) {
  const lines = [
    `VIDEO TITLE: ${v.title}`,
    `VIDEO DESCRIPTION (its own): ${String(v.description ?? "").slice(0, 1500)}`,
    ...(ctx.captions ? [`VIDEO CAPTIONS (what is said in it, with times): ${String(ctx.captions).slice(0, 4000)}`] : []),
    ...(ctx.chapters ? [`CHAPTERS FROM ITS CAPTIONS (real times — use these as they are): ${ctx.chapters}`] : []),
    `VIDEO KIND: ${ctx.kind === "LONG" ? "long video (chapters belong in its description)" : ctx.kind === "SHORT" ? "Short (no chapters)" : "unknown"}`,
    `CHANNEL: ${ctx.channel?.title ?? ""} ${ctx.channel?.handle ?? ""}`,
    `CHANNEL DESCRIPTION (its own — who the channel is; NOT where this video happens): ${String(ctx.channel?.description ?? "").slice(0, 800)}`,
    `WHO THE CHANNEL IS: ${ctx.persona?.who ?? "not said"}`,
    `CHANNEL LANGUAGE: ${ctx.language ?? "as its titles"}`,
    `NICHE PHRASES (from the channel's own tags and description): ${(ctx.niche?.queries ?? []).map((q) => q.q).join(", ")}`,
    ...(ctx.summary ? [`NICHE RESEARCH (${ctx.summary.source}): ${ctx.summary.lines.map((l) => `${l.what}: ${l.line}`).join(" | ")}`] : []),
    ...(ctx.ownData?.length ? [`FROM THE CHANNEL'S OWN DATA: ${ctx.ownData.join(" | ")}`] : []),
    `LINKS TO USE: ${(ctx.links ?? []).join(" ") || "none"}`,
    `TITLE STYLE OF THIS CHANNEL: ${ctx.style ?? "English"}`,
  ];
  return lines.join("\n");
}
const norm = (s) => String(s ?? "").toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}:]+/gu, " ").replace(/\s+/g, " ").trim();
/**
 * RR-311 B4 (owner: "block only real facts not in the material: places, people's names, numbers, dates, prices, claims; allow common
 * words, English ↔ Roman-Urdu translation and same-meaning words"). What is NOT in the material and is caught:
 *   · a PLACE (the known places — countries, cities) the material does not name;
 *   · a NUMBER, date, price or time the material does not hold;
 *   · a PERSON the option names (it must declare them) or an @handle, not in the material;
 *   · a CLAIM it states (it must declare each with the words of the material it comes from) whose words are not in the material.
 * An ordinary word ("Memories", "Meri", "Purani", "Pehle") is never an invented fact.
 */
export function inventedIn(text, material, { names = [], facts = [] } = {}) {
  const m = norm(material), mPlaces = new Set(placesIn(material).map((p) => p.toLowerCase()));
  const out = [];
  for (const p of placesIn(text)) if (!mPlaces.has(p.toLowerCase()) && !m.includes(p.toLowerCase())) out.push(p);
  for (const n of String(text).replace(/https?:\/\/\S+/g, " ").match(/\d[\d,.:/-]*/g) ?? []) { const k = n.replace(/[,.:/-]+$/, ""); if (!/^0?0:00$/.test(k) && !m.includes(norm(k)) && !m.replace(/,/g, "").includes(k.replace(/,/g, ""))) out.push(k); }
  for (const h of String(text).match(/@[\w.-]{3,}/g) ?? []) if (!m.includes(h.toLowerCase().slice(1))) out.push(h);
  for (const n of names) if (n && !m.includes(norm(n))) out.push(n);
  for (const f of facts) { const q = norm(f?.quote); if (!q || q.split(" ").length < 2 || !m.includes(q)) out.push(`"${String(f?.fact ?? "").slice(0, 60)}" (its source words are not in the material)`); }
  return [...new Set(out)];
}
export function checkOptions(options, material) {
  const kept = [], dropped = [];
  for (const o of Array.isArray(options) ? options : []) {
    const why = [];
    if (typeof o.title !== "string" || !o.title.trim() || o.title.length > 100) why.push("title missing or over 100 characters");
    if (!Array.isArray(o.hashtags) || o.hashtags.length !== 3 || o.hashtags.some((h) => !/^#[\p{L}\p{N}_]{2,40}$/u.test(h))) why.push("not exactly 3 hashtags");
    const tw = String(o.thumbnail ?? "").trim().split(/\s+/).filter(Boolean).length; if (tw < 2 || tw > 4) why.push("thumbnail text not 2–4 words");
    if (typeof o.description !== "string" || o.description.length < 40 || o.description.length > 5000) why.push("description missing or too long");
    if (/\(add |fill in|\?:\?\?/i.test(`${o.title} ${o.description}`)) why.push("a placeholder left in");
    const inv = inventedIn(`${o.title}\n${o.description}\n${o.thumbnail}\n${(o.hashtags ?? []).join(" ").replace(/#/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}`, material, { names: o.names ?? [], facts: o.facts ?? [] });
    if (inv.length) why.push(`names something not in the material: ${inv.slice(0, 4).join(", ")}`);
    (why.length ? dropped : kept).push(why.length ? { title: o.title, why } : { title: o.title.trim(), description: o.description.trim(), hashtags: o.hashtags, thumbnail: String(o.thumbnail).trim().toUpperCase(), facts: o.facts ?? [] });
  }
  return { kept: kept.slice(0, 3), dropped };
}

/** One call: three options for one video, written by the client's own AI, checked. */
export async function writeWithAI({ provider, key, video, ctx, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic") return { ok: false, why: "AI writing works with an Anthropic (Claude) key in this version — your connected AI is another one. The ready options above are written by Visibility's own templates." };
  if (!key) return { ok: false, why: "Connect your AI key first (Settings → Your AI connection)." };
  const material = materialOf(video, ctx);
  /* RR-311 B3: the video's own language and story; translation and same-meaning words allowed; only places, people, numbers and claims are bound to the material */
  const system = "You write YouTube titles, descriptions, hashtags and thumbnail text for one video of a small creator. KEEP THE VIDEO'S STORY AND ITS OWN LANGUAGE AND SCRIPT: a Roman-Urdu title stays Roman Urdu (you may mix in the English words such creators use), an English title stays English; never shorten a title into something with another meaning. Ordinary words, same-meaning words and English ↔ Roman-Urdu translation are fine. But a PLACE, a PERSON, a NUMBER, a DATE, a PRICE or a CLAIM may appear only if the material holds it — the channel's description says who the channel is, NOT where this video happens; a place goes into an option only if the video's own title, description or captions name it. Write 3 different options, each from a different angle (what happens; the question a viewer would type; a short hook) — never an empty title such as 'X: What Is It Really Like?' or 'Watch This: X'. Each: a title of at most 100 characters, main words first, in the channel's title style; a description whose first two lines carry the key words, then a short summary from the video's own description or captions, then — for a long video, only when the material gives CHAPTERS FROM ITS CAPTIONS — those chapters exactly, then the links given; never a placeholder such as '(add …)' or '?:??'; exactly 3 hashtags made of whole topic words (never a fragment of a sentence); thumbnail text of 2 to 4 words. List in 'names' every person you name, and in 'facts' every factual claim you make, each with the exact words of the material it comes from in 'quote'. If the material says too little, keep the option short rather than invent.";
  let r;
  try {
    r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version, "anthropic-beta": AI.fallbackBeta },
      body: JSON.stringify({ model: AI.model, max_tokens: 8000, fallbacks: "default", system, messages: [{ role: "user", content: `MATERIAL:\n${material}\n\nWrite the 3 options.` }], output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } }) });
  } catch { return { ok: false, why: "Your AI did not answer — the template options stay." }; }
  if (r.status === 401 || r.status === 403) return { ok: false, why: "Your AI refused the key — check it in Settings → Your AI connection." };
  if (!r.ok) return { ok: false, why: `Your AI answered with an error (${r.status}) — the template options stay.` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens } : null; // RR-311 B6: every request is counted
  if (body?.stop_reason === "refusal") return { ok: false, why: "Your AI declined to write for this video — the template options stay.", usage };
  const text = (body?.content ?? []).find((b) => b?.type === "text")?.text;
  let parsed; try { parsed = JSON.parse(text); } catch { return { ok: false, why: "Your AI's answer could not be read — the template options stay.", usage }; }
  const { kept, dropped } = checkOptions(parsed?.options, material);
  if (kept.length < 1) return { ok: false, why: `Your AI's options named a place, person, number or claim that is not in this video's own words or the research (${dropped.flatMap((d) => d.why).slice(0, 2).join("; ")}) — they were not shown. The template options stay.`, dropped, usage };
  const used = `this video's own title, description${material.includes("VIDEO CAPTIONS") ? ", captions" : ""}, your channel's data and the matching niche research`;
  return { ok: true, options: kept.map((o, i) => ({ n: i + 1, ...o, byAI: true, basedOn: [`Written with your AI (Claude, ${AI.model}) from ${used} — checked: no place, person, number or claim outside them`, ...(o.facts ?? []).slice(0, 3).map((x) => `fact: ${x.fact} — from "${x.quote}"`)] })), dropped, usage };
}
