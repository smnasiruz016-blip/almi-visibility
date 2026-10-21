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
export const AI = Object.freeze({ origin: "https://api.anthropic.com", path: "/v1/messages", version: "2023-06-01", model: "claude-opus-5-5", fallbackBeta: "server-side-fallback-2026-07-01" });
const SCHEMA = { type: "object", additionalProperties: false, required: ["options"], properties: { options: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "description", "hashtags", "thumbnail"], properties: { title: { type: "string" }, description: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }, thumbnail: { type: "string" } } } } } };

/** The material the AI may use — and the only words an option may name. */
export function materialOf(v, ctx) {
  const lines = [
    `VIDEO TITLE: ${v.title}`,
    `VIDEO DESCRIPTION (its own): ${String(v.description ?? "").slice(0, 1500)}`,
    `VIDEO KIND: ${ctx.kind === "LONG" ? "long video (chapters belong in its description)" : ctx.kind === "SHORT" ? "Short (no chapters)" : "unknown"}`,
    `CHANNEL: ${ctx.channel?.title ?? ""} ${ctx.channel?.handle ?? ""}`,
    `CHANNEL DESCRIPTION (its own): ${String(ctx.channel?.description ?? "").slice(0, 800)}`,
    `WHO THE CHANNEL IS: ${ctx.persona?.who ?? "not said"}`,
    `PLACES THE CHANNEL NAMES: ${(ctx.persona?.places ?? []).join(", ") || "none"}`,
    `NICHE PHRASES (from the channel's own tags and description): ${(ctx.niche?.queries ?? []).map((q) => q.q).join(", ")}`,
    ...(ctx.summary ? [`NICHE RESEARCH (${ctx.summary.source}): ${ctx.summary.lines.map((l) => `${l.what}: ${l.line}`).join(" | ")}`] : []),
    `LINKS TO USE: ${(ctx.links ?? []).join(" ") || "none"}`,
    `TITLE STYLE OF THIS CHANNEL: ${ctx.style ?? "English"}`,
  ];
  return lines.join("\n");
}
/* an invented fact: a capitalised word or a number that the material does not hold */
export function inventedIn(text, material) {
  const m = String(material).toLowerCase();
  const words = String(text).replace(/https?:\/\/\S+/g, " ").match(/[\p{Lu}][\p{L}'’]{2,}|\d[\d,.:]*/gu) ?? [];
  const COMMON = /^(the|and|for|with|from|this|that|my|our|your|how|what|why|when|where|who|day|life|vlog|chapters|intro|subscribe|more|watch|part|new|best|first|full|video|videos|short|shorts|in|on|of|to|a|an|i|we|you|0:00|00:00)$/i;
  return [...new Set(words.filter((w) => !COMMON.test(w) && !m.includes(w.toLowerCase().replace(/[’']/g, "")) && !m.includes(w.toLowerCase())))];
}
export function checkOptions(options, material) {
  const kept = [], dropped = [];
  for (const o of Array.isArray(options) ? options : []) {
    const why = [];
    if (typeof o.title !== "string" || !o.title.trim() || o.title.length > 100) why.push("title missing or over 100 characters");
    if (!Array.isArray(o.hashtags) || o.hashtags.length !== 3 || o.hashtags.some((h) => !/^#[\p{L}\p{N}_]{2,40}$/u.test(h))) why.push("not exactly 3 hashtags");
    const tw = String(o.thumbnail ?? "").trim().split(/\s+/).filter(Boolean).length; if (tw < 2 || tw > 4) why.push("thumbnail text not 2–4 words");
    if (typeof o.description !== "string" || o.description.length < 40 || o.description.length > 5000) why.push("description missing or too long");
    const inv = inventedIn(`${o.title} ${o.description} ${o.thumbnail} ${(o.hashtags ?? []).join(" ").replace(/#/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}`, material);
    if (inv.length) why.push(`names something not in the material: ${inv.slice(0, 4).join(", ")}`);
    (why.length ? dropped : kept).push(why.length ? { title: o.title, why } : { title: o.title.trim(), description: o.description.trim(), hashtags: o.hashtags, thumbnail: String(o.thumbnail).trim().toUpperCase() });
  }
  return { kept: kept.slice(0, 3), dropped };
}

/** One call: three options for one video, written by the client's own AI, checked. */
export async function writeWithAI({ provider, key, video, ctx, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic") return { ok: false, why: "AI writing works with an Anthropic (Claude) key in this version — your connected AI is another one. The ready options above are written by Visibility's own templates." };
  if (!key) return { ok: false, why: "Connect your AI key first (Settings → Your AI connection)." };
  const material = materialOf(video, ctx);
  const system = "You write YouTube titles, descriptions, hashtags and thumbnail text for one video of a small creator. Use ONLY the facts in the material you are given — never add a place, a person, a number, an event or a claim that is not there. Write 3 different options. Each: a title of at most 100 characters (what happens, where, who — main words first, in the channel's title style); a description whose first two lines carry the key words, then a short summary taken only from the video's own description, then — for a long video only — a 'Chapters' list with 0:00 Intro and lines for the client to fill in, then the links given; exactly 3 hashtags; thumbnail text of 2 to 4 words. If the material says too little, keep the option short rather than invent.";
  let r;
  try {
    r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version, "anthropic-beta": AI.fallbackBeta },
      body: JSON.stringify({ model: AI.model, max_tokens: 8000, fallbacks: "default", system, messages: [{ role: "user", content: `MATERIAL:\n${material}\n\nWrite the 3 options.` }], output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } }) });
  } catch { return { ok: false, why: "Your AI did not answer — the template options stay." }; }
  if (r.status === 401 || r.status === 403) return { ok: false, why: "Your AI refused the key — check it in Settings → Your AI connection." };
  if (!r.ok) return { ok: false, why: `Your AI answered with an error (${r.status}) — the template options stay.` };
  const body = await r.json().catch(() => null);
  if (body?.stop_reason === "refusal") return { ok: false, why: "Your AI declined to write for this video — the template options stay." };
  const text = (body?.content ?? []).find((b) => b?.type === "text")?.text;
  let parsed; try { parsed = JSON.parse(text); } catch { return { ok: false, why: "Your AI's answer could not be read — the template options stay." }; }
  const { kept, dropped } = checkOptions(parsed?.options, material);
  if (kept.length < 2) return { ok: false, why: `Your AI's options named things that are not in this video's own words or the research (${dropped.flatMap((d) => d.why).slice(0, 2).join("; ")}) — they were not shown. The template options stay.`, dropped };
  return { ok: true, options: kept.map((o, i) => ({ n: i + 1, ...o, basedOn: [`written by your AI (Claude, ${AI.model}) only from: this video's own title and description, your channel's description, and the niche research — and checked: no word or number outside them`] })), dropped, usage: body.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens } : null };
}
