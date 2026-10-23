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
import { tokens } from "./youtube-advice.mjs";
import { spellFix, noRepeats, orderLinks } from "./youtube-plan.mjs";

export const AI = Object.freeze({ origin: "https://api.anthropic.com", path: "/v1/messages", version: "2023-06-01", model: "claude-opus-5-5", fallbackBeta: "server-side-fallback-2026-07-01" });
/* RR-311 B4: each option DECLARES the people it names and the facts it states, each fact with the words of the material it comes from */
const SCHEMA = { type: "object", additionalProperties: false, required: ["options"], properties: { options: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "description", "hashtags", "thumbnail", "names", "facts"], properties: { title: { type: "string" }, description: { type: "string" }, hashtags: { type: "array", items: { type: "string" } }, thumbnail: { type: "string" }, names: { type: "array", items: { type: "string" } }, facts: { type: "array", items: { type: "object", additionalProperties: false, required: ["fact", "quote"], properties: { fact: { type: "string" }, quote: { type: "string" } } } } } } } } };

/**
 * RR-312 1 · A FACT SHEET PER VIDEO, made automatically from THAT video's own title, description, tags and captions (owner: "dates aur naam
 * har video ke saath fixed nahien diye ja sakte; content se match kar ke likhna hoga"): its places, names, numbers, years, prices, what
 * happens — and the obvious typo suspects with a suggested fix ("1018 — probably 2018, next to 2016, 2017"; "Togather → Together").
 */
const COMMON = new Set("meri mera mere meray purani purana purane pehle pehla pehli yaadein yadein yaad yaadon hamari hamara humari humara apni apna apne nayi naya naye safar ghar khana din raat subah shaam aaj kal saath ek do teen sab family memories memory old first new my our the a an and of".split(" "));
const NOT_NAMES = new Set("I The A An My Our Your We You He She It They This That These Those Video Vlog Vlogs Day Daily Family Mom Dad Baby Part Episode Full New My Me Mere Meri Mera Hum Ham Aaj Kal Sunday Monday Tuesday Wednesday Thursday Friday Saturday January February March April May June July August September October November December Subscribe Like Share Comment Welcome Hello Hi Thanks Thank Please Happy Eid Ramadan Christmas Diwali Shorts".split(" "));
for (const w of NOT_NAMES) COMMON.add(w.toLowerCase());
export function factSheet(v, ctx = {}) {
  const own = [v.title, v.description, (v.tags ?? []).join(", "), ctx.captions ? String(ctx.captions).replace(/\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}\s+-->\s+\S+/g, " ") : ""].filter(Boolean).join("\n");
  const places = placesIn(own);
  const names = [...new Set((String(v.description ?? "").match(/(?<![.!?]\s|^)\b\p{Lu}\p{Ll}{2,}(?:\s\p{Lu}\p{Ll}{2,})?\b/gu) ?? []).filter((w) => !NOT_NAMES.has(w.split(" ")[0]) && !places.some((p) => w.includes(p))))].slice(0, 8);
  const nums = numbersIn(own), years = nums.filter((n) => /^(19|20)\d{2}$/.test(n)), prices = [...new Set((own.match(PRICE) ?? []).map((p) => p.trim()))];
  const typos = [];
  for (const n of nums.filter((x) => /^\d{4}$/.test(x) && !/^(19|20)\d{2}$/.test(x))) {
    const fix = years.map((y) => [y, ...[-3, -2, -1, 1, 2, 3].map((d) => String(Number(y) + d))]).flat().find((c) => lev(c, n) === 1 && /^(19|20)\d{2}$/.test(c) && !years.includes(c));
    if (fix) typos.push({ from: n, to: fix, why: `${n} — probably ${fix}, next to ${years.join(", ")}` });
  }
  const known = []; spellFix(own, known); for (const k of [...new Set(known)]) { const [from, to] = k.split(" → "); typos.push({ from, to, why: k }); }
  const happens = String(v.description ?? "").split(/(?<=[.!?])\s+|\n/).map((s) => s.trim()).find((s) => s.length >= 15 && !/https?:|subscribe|follow/i.test(s)) ?? null;
  return { places, names, numbers: nums.filter((n) => !years.includes(n)).slice(0, 12), years, prices, happens, typos, ownNames: ownNamesOf(ctx) };
}
/* RR-316 A1 (owner's real test: every AI option hidden over "@almiworld-world" — the channel's OWN handle): the channel's name, handle,
 * websites and the product's own names are part of EVERY video's material, always */
export const ownNamesOf = (ctx = {}) => [...new Set([ctx.channel?.title, ctx.channel?.handle, ...(ctx.ownNames ?? [])].filter(Boolean).map(String))];
const sheetText = (f) => [`places: ${f.places.join(", ") || "none named"}`, `people's names: ${f.names.join(", ") || "none named"}`, `years: ${f.years.join(", ") || "none"}`, `other numbers: ${f.numbers.join(", ") || "none"}`, `prices: ${f.prices.join(", ") || "none"}`, `what happens: ${f.happens ?? "only what the title says"}`, `typo suspects (you may write the fix): ${f.typos.map((t) => t.why).join("; ") || "none"}`].join("\n  ");

/** The material the AI may use — the only places, people, numbers and claims an option may name. */
export function materialOf(v, ctx) {
  const lines = [
    `VIDEO TITLE: ${v.title}`,
    `VIDEO DESCRIPTION (its own): ${String(v.description ?? "").slice(0, 1500)}`,
    `FACT SHEET FOR THIS VIDEO (made from its own words — use only these facts):\n  ${sheetText(factSheet(v, ctx))}`,
    ...(ctx.captions ? [`VIDEO CAPTIONS (what is said in it, with times): ${String(ctx.captions).slice(0, 4000)}`] : []),
    ...(ctx.chapters ? [`CHAPTERS FROM ITS CAPTIONS (real times — use these as they are): ${ctx.chapters}`] : []),
    `VIDEO KIND: ${ctx.kind === "LONG" ? "long video (chapters belong in its description)" : ctx.kind === "SHORT" ? "Short (no chapters)" : "unknown"}`,
    `CHANNEL: ${ctx.channel?.title ?? ""} ${ctx.channel?.handle ?? ""}`,
    `THE CHANNEL'S OWN NAMES (always allowed — its name, handle, websites and products): ${ownNamesOf(ctx).join(", ") || "none"}`,
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
/* RR-311 B3: the video's own language and story; translation and same-meaning words allowed; only places, people, numbers and claims are bound to the material */
const SYSTEM = "You write YouTube titles, descriptions, hashtags and thumbnail text for one video of a small creator. KEEP THE VIDEO'S STORY AND ITS OWN LANGUAGE AND SCRIPT: a Roman-Urdu title stays Roman Urdu (you may mix in the English words such creators use), an English title stays English; never shorten a title into something with another meaning. Ordinary words, same-meaning words and English ↔ Roman-Urdu translation are fine. But a PLACE, a PERSON, a NUMBER, a DATE, a PRICE or a CLAIM may appear only if the material holds it — the channel's description says who the channel is, NOT where this video happens; a place goes into an option only if the video's own title, description or captions name it. Write 3 different options, each from a different angle (what happens; the question a viewer would type; a short hook) — never an empty title such as 'X: What Is It Really Like?' or 'Watch This: X'. Each: a title of at most 100 characters, main words first, in the channel's title style; a description whose first two lines carry the key words, then a short summary from the video's own description or captions, then — for a long video, only when the material gives CHAPTERS FROM ITS CAPTIONS — those chapters exactly, then the links given, in the order given; keep it short and useful — never the same sentence twice, no filler line; never a placeholder such as '(add …)' or '?:??'; exactly 3 hashtags made of whole topic words (never a fragment of a sentence); thumbnail text of 2 to 4 words. List in 'names' every person you name, and in 'facts' every factual claim you make, each with the exact words of the material it comes from in 'quote'. If the material says too little, keep the option short rather than invent. RR-312: use only the FACT SHEET FOR THIS VIDEO, the video's own words and the research; if you are unsure of a detail (a year, a name, a place, a number), leave it out; a typo suspect listed in the fact sheet may be written in its fixed form.";

/*
 * RR-312 (owner, 22 Oct 2026: "guard mein aisi settings karein ke baar baar ruke nahien" — it hid ALL options over "2018", the AI's right fix of
 * the owner's own typo "1018" next to 2016 and 2017). Every finding now has a weight:
 *   · HIDDEN — only an option that names a truly invented place, person, @handle, price or claim (nowhere in the material, e.g. "Paris");
 *     only that option; the others stay.
 *   · CHECK — an option with a doubt (a number the material does not hold) is SHOWN, with a yellow note naming the doubt; the client decides.
 *   · CORRECTED — an obvious typo fix of the video's own words or numbers (1018 → 2018 next to 2016, 2017; Togather → Together; Icland →
 *     Iceland) passes, marked "corrected from your description".
 *   · small form slips are put right without a word (a 4th hashtag dropped, a thumbnail cut to 4 words, a placeholder line taken out).
 */
const lev = (a, b) => { a = String(a).toLowerCase(); b = String(b).toLowerCase(); const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const numbersIn = (s) => [...new Set((String(s).replace(/https?:\/\/\S+/g, " ").match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]+$/, "").replace(/,/g, "")))];
const wordsIn = (s) => [...new Set(String(s).toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 3))];
const PRICE = /(?:[$£€₹]\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:usd|eur|euro|euros|dollars?|pounds?|rs\.?|rupees?|pkr|inr|dkk|kroner)\b|\b(?:rs\.?|pkr|inr|dkk)\s?\d[\d,.]*)/gi;
/** one option's findings: hidden (a truly invented fact), check (a doubt), corrected (a typo fix) */
export function reviewOption(o, material) {
  /* the fact sheet's suggested fixes are suggestions, not the video's own words — checked as corrections, never as material */
  material = String(material).replace(/^FACT SHEET FOR THIS VIDEO[^\n]*\n(?:  [^\n]*\n?)*/m, "");
  const text = `${o.title}\n${o.description}\n${o.thumbnail}\n${(o.hashtags ?? []).join(" ").replace(/#/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")}`;
  const m = norm(material), mNums = numbersIn(material), mWords = wordsIn(material), mPlaces = new Set(placesIn(material).map((p) => p.toLowerCase()));
  const hidden = [], check = [], corrected = [];
  /* a typo fix of the VIDEO'S OWN word (its title, or a capitalised word of its description: Icland → Iceland) — never of the material's
   * labels or an ordinary lower-case word ("parts" is not a misspelt "Paris") */
  const own = String(material).split("\n").filter((l) => /^VIDEO (TITLE|DESCRIPTION)/.test(l)).join(" ");
  const ownTitle = /^VIDEO TITLE: (.*)$/m.exec(material)?.[1] ?? "";
  const ownWords = [...new Set([...wordsIn(ownTitle), ...(own.match(/\b\p{Lu}[\p{L}]{2,}/gu) ?? []).map((w) => w.toLowerCase())])];
  const fixOf = (w) => ownWords.find((x) => x !== w.toLowerCase() && x[0] === w.toLowerCase()[0] && Math.abs(x.length - w.length) <= 2 && lev(x, w) <= (w.length >= 7 ? 2 : 1));
  for (const p of placesIn(text)) { if (mPlaces.has(p.toLowerCase()) || m.includes(p.toLowerCase())) continue; const f = fixOf(p); if (f) corrected.push(`${f} → ${p}`); else hidden.push({ what: p, why: `${p} — a place your video never names` }); }
  for (const pr of String(text).match(PRICE) ?? []) { const n = numbersIn(pr)[0]; if (n && !mNums.includes(n)) hidden.push({ what: pr.trim(), why: `${pr.trim()} — a price your video never states` }); }
  /* RR-316 A1: a handle is compared in the material's own form ("@almiworld-world" → "almiworld world"), as every other word is */
  for (const h of String(text).match(/@[\w.-]{3,}/g) ?? []) if (!m.includes(norm(h.slice(1)))) hidden.push({ what: h, why: `${h} — a channel your video never names` });
  /* an ordinary word declared as a "name" ("Meri", "Purani", "Pehle") is no person */
  for (const n of o.names ?? []) { if (!n || m.includes(norm(n)) || norm(n).split(" ").every((w) => COMMON.has(w))) continue; const f = n.split(/\s+/).every((w) => m.includes(w.toLowerCase()) || fixOf(w)); if (f) corrected.push(n); else hidden.push({ what: n, why: `${n} — a person your video never names` }); }
  for (const f of o.facts ?? []) { const q = tokens(f?.quote ?? ""); if (!q.length) continue; const share = q.filter((w) => mWords.includes(w) || m.includes(w) || (w.length >= 5 && mWords.some((x) => x.slice(0, 4) === w.slice(0, 4) && Math.abs(x.length - w.length) <= 3))).length / q.length; /* Tier 1: inflection passes */ if (share < 0.7) check.push(`Check: "${String(f.fact ?? "").slice(0, 60)}" — said in other words than your video's own (a translation is fine; a new claim is not)`); } // RR-316 A2: a claim in other words is a doubt, not an invention
  /* numbers: in the material → fine; a one-digit fix of the material's own number next to its neighbours (1018 → 2018 beside 2016, 2017) →
   * corrected; any other number → a doubt the client checks (shown, never hidden) — unless it is part of a price above */
  const priced = new Set((String(text).match(PRICE) ?? []).flatMap((p) => numbersIn(p)));
  for (const n of numbersIn(text)) {
    if (mNums.includes(n) || priced.has(n) || /^0+$/.test(n) || /^0?0:00$/.test(n) || n.length < 2) continue; // a single digit ("Part 2", "#A1") is no fact to check
    /* the typo is the number ONE digit off but FAR in value (1018 for 2018 — not 2016, which is simply another year) */
    const near = mNums.filter((x) => x.length === n.length && lev(x, n) === 1 && Math.abs(Number(x) - Number(n)) >= 10).sort((a, b) => Math.abs(Number(b) - Number(n)) - Math.abs(Number(a) - Number(n)))[0];
    const neighbours = /^\d{4}$/.test(n) && mNums.some((x) => /^\d{4}$/.test(x) && x !== near && Math.abs(Number(x) - Number(n)) <= 3);
    if (near && neighbours) corrected.push(`${near} → ${n}`);
    else check.push(near ? `Check: ${n} — your description says ${near}` : `Check: ${n} — not in your video's own words`);
  }
  /* a word fix the dictionary knows (the owner's "Togather") */
  const known = []; spellFix(material, known); for (const k of known) { const to = k.split(" → ")[1]; if (to && text.toLowerCase().includes(to.toLowerCase())) corrected.push(k); }
  return { hidden, check: [...new Set(check)], corrected: [...new Set(corrected)] };
}
/** the form of an option, put right where that is safe; what cannot be put right */
function tidy(o) {
  const why = [];
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!title || title.length > 100) why.push("title missing or over 100 characters");
  const description = String(o.description ?? "").split("\n").filter((l) => !/\(add |fill in|\?:\?\?/i.test(l)).join("\n").trim();
  if (description.length < 40 || description.length > 5000) why.push(/\(add |fill in|\?:\?\?/i.test(String(o.description)) ? "a placeholder left in" : "description missing or too long");
  const hashtags = (Array.isArray(o.hashtags) ? o.hashtags : []).map((h) => `#${String(h).replace(/^#+/, "")}`).filter((h) => /^#[\p{L}\p{N}_]{2,40}$/u.test(h)).slice(0, 3);
  const thumbnail = String(o.thumbnail ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 4).join(" ").toUpperCase();
  if (!hashtags.length) why.push("no usable hashtag");
  return { why, option: { title, description, hashtags, thumbnail, facts: o.facts ?? [], names: o.names ?? [] } };
}
export function checkOptions(options, material) {
  const kept = [], dropped = [];
  for (const raw of Array.isArray(options) ? options : []) {
    const { why, option } = tidy(raw);
    if (why.length) { dropped.push({ title: raw?.title, why, form: true }); continue; }
    const r = reviewOption(option, material);
    if (r.hidden.length) { dropped.push({ title: option.title, why: r.hidden.map((h) => h.why), hidden: r.hidden.map((h) => h.what) }); continue; }
    kept.push({ ...option, check: r.check, corrected: r.corrected });
  }
  return { kept, dropped };
}

/** One request to the client's own AI. `recheck` (Tier 2) = the doubtful options, each with what was doubted — to be re-checked against the
 *  material and rewritten; the answer has exactly that many options, in the same order */
async function ask({ key, material, recheck = null, fetchImpl, base }) {
  const system = SYSTEM + (recheck ? ` RE-CHECK (RR-312 Tier 2): you are given ${recheck.length} option${recheck.length === 1 ? "" : "s"} you wrote, each with what was not found in the material. Check each against the material and rewrite it so every place, person, number, price and claim is in the material (or a typo fix listed in the fact sheet); leave out any detail you cannot ground. Return exactly ${recheck.length} option${recheck.length === 1 ? "" : "s"}, in the same order.` : "");
  const user = `MATERIAL:\n${material}\n\n${recheck ? `OPTIONS TO RE-CHECK:\n${JSON.stringify(recheck.map((r) => ({ option: { title: r.option.title, description: r.option.description, hashtags: r.option.hashtags, thumbnail: r.option.thumbnail }, not_in_the_material: r.doubts })))}` : "Write the 3 options."}`;
  let r;
  try {
    r = await fetchImpl(`${base}${AI.path}`, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": AI.version, "anthropic-beta": AI.fallbackBeta },
      body: JSON.stringify({ model: AI.model, max_tokens: 8000, fallbacks: "default", system, messages: [{ role: "user", content: user }], output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } }) });
  } catch { return { fail: "Your AI did not answer — the template options stay." }; }
  if (r.status === 401 || r.status === 403) return { fail: "Your AI refused the key — check it in Settings → Your AI connection." };
  if (!r.ok) return { fail: `Your AI answered with an error (${r.status}) — the template options stay.` };
  const body = await r.json().catch(() => null);
  const usage = body?.usage ? { input: body.usage.input_tokens, output: body.usage.output_tokens, model: body.model ?? AI.model } : null; // RR-314 B8: the model that answered // RR-311 B6: every request is counted
  if (body?.stop_reason === "refusal") return { fail: "Your AI declined to write for this video — the template options stay.", usage };
  try { return { options: JSON.parse((body?.content ?? []).find((b) => b?.type === "text")?.text)?.options ?? [], usage }; } catch { return { fail: "Your AI's answer could not be read — the template options stay.", usage }; }
}

/* one option judged: CLEAN, CHECK (a doubt — shown with a yellow note), HIDDEN (a clear invention), FORM (cannot be put right) */
function judge(raw, material) {
  const { why, option } = tidy(raw);
  if (why.length) return { state: "FORM", option: { ...option, title: option.title || String(raw?.title ?? "") }, doubts: why, why };
  const r = reviewOption(option, material);
  if (r.hidden.length) return { state: "HIDDEN", option, doubts: r.hidden.map((h) => h.what), why: r.hidden.map((h) => h.why), hidden: r.hidden.map((h) => h.what) };
  return { state: r.check.length ? "CHECK" : "CLEAN", option: { ...option, check: r.check, corrected: r.corrected }, doubts: r.check.map((c) => c.replace(/^Check: (\S+).*$/, "$1")) };
}

/**
 * Three options for one video, written by the client's own AI (RR-312, owner: "guard baar baar ruke nahien, aur result bhi best de"):
 *   · the prompt is grounded in the video's own FACT SHEET; each fact the AI states comes with its quote (a citation);
 *   · TIER 1 — a cheap check in code of every option (citations, places, people, numbers, prices); common words are never facts;
 *   · TIER 2 — ONLY the doubtful options go back to the AI once, naming the doubt; what passes is shown; what is still doubtful is shown with
 *     a yellow note; only a clear invention is hidden, in that option alone. At most one retry per video; every request counts in the cost.
 */
export async function writeWithAI({ provider, key, video, ctx, fetchImpl = fetch, base = AI.origin }) {
  if (provider !== "anthropic") return { ok: false, why: "AI writing works with an Anthropic (Claude) key in this version — your connected AI is another one. The ready options above are written by Visibility's own templates." };
  if (!key) return { ok: false, why: "Connect your AI key first (Settings → Your AI connection)." };
  const material = materialOf(video, ctx);
  const usages = [];
  const first = await ask({ key, material, fetchImpl, base }); if (first.usage) usages.push(first.usage);
  if (first.fail) return { ok: false, why: first.fail, usages, usage: sum(usages) };
  let judged = (Array.isArray(first.options) ? first.options : []).slice(0, 3).map((o) => judge(o, material));
  /* TIER 2: only the doubtful ones, once */
  const doubtful = judged.map((j, i) => ({ ...j, i })).filter((j) => j.state !== "CLEAN");
  const retried = doubtful.length > 0;
  let passedOnRetry = 0;
  if (retried) {
    const second = await ask({ key, material, recheck: doubtful.map((d) => ({ option: d.option, doubts: d.doubts })), fetchImpl, base }); if (second.usage) usages.push(second.usage);
    if (!second.fail) doubtful.forEach((d, k) => {
      const again = second.options?.[k] ? judge(second.options[k], material) : null;
      /* the rewrite wins when it is better: clean beats a note beats hidden; a doubt that stays is shown with its note */
      const rank = { CLEAN: 0, CHECK: 1, HIDDEN: 2, FORM: 3 };
      if (again && rank[again.state] <= rank[d.state]) { judged[d.i] = again; if (again.state === "CLEAN") passedOnRetry++; }
    });
  }
  /* RR-317 A (beta-g decision, owner: "guard ke baare mein aap behter jante ho"): TRUTH FIRST. An invented place, person, other channel's
   * handle or price is NEVER shown, not even with a note. If after the one retry no option is free of one, the client gets the TEMPLATE
   * options (made from the video's own words) with one plain line — never an empty video, never an invention. */
  const shown = judged.filter((j) => j.state === "CLEAN" || j.state === "CHECK").sort((a, b) => a.option.check.length - b.option.check.length);
  const hiddenOnes = judged.filter((j) => j.state === "HIDDEN");
  const seen = new Set(), kept = shown.filter((j) => !seen.has(j.option.title.toLowerCase()) && seen.add(j.option.title.toLowerCase())).map((j) => j.option);
  const dropped = hiddenOnes.map((j) => ({ title: j.option.title, why: j.why, hidden: j.hidden }));
  const outcome = !kept.length ? "templates instead" : hiddenOnes.length ? "one option hidden" : kept.some((o) => o.check.length) ? "shown with a note" : retried ? "retried and passed" : "shown clean";
  const example = hiddenOnes.flatMap((j) => j.hidden ?? [])[0];
  if (!kept.length) return { ok: false, fallback: true, outcome, why: hiddenOnes.length ? `Your AI's options named something that is not in this video${example ? ` (e.g. ${example})` : ""} — the ready options below are from your own words.` : "Your AI's options could not be used — the ready options below are from your own words.", dropped, retried, usages, usage: sum(usages) };
  const used = `this video's own title, description${material.includes("VIDEO CAPTIONS") ? ", captions" : ""}, its fact sheet, your channel's data and the matching niche research`;
  return { ok: true, outcome, retried, passedOnRetry, dropped, usages, usage: sum(usages),
    /* RR-317 B: no sentence said twice; the links in order — the page the video names first, then the product's page, then the channel */
    options: kept.map((o, i) => ({ n: i + 1, title: o.title, description: ctx.linkOrder?.length ? orderLinks(noRepeats(o.description), ctx.linkOrder) : noRepeats(o.description), hashtags: o.hashtags, thumbnail: o.thumbnail, check: o.check, corrected: o.corrected, byAI: true,
      basedOn: [`Written with your AI (Claude, ${AI.model}) from ${used} — checked: no place, person, price or claim outside them`, ...o.corrected.map((c) => `corrected from your description: ${c}`), ...(o.facts ?? []).slice(0, 3).map((x) => `fact: ${x.fact} — from "${x.quote}"`)] })) };
}
const sum = (us) => (us.length ? { input: us.reduce((n, u) => n + (u.input ?? 0), 0), output: us.reduce((n, u) => n + (u.output ?? 0), 0) } : null);
/* RR-318 A: the same truth guard writes for the website (desktop/web-ai.mjs) — one set of rules, never a copy */
export { lev, numbersIn, wordsIn, PRICE as PRICE_IN_TEXT, COMMON as COMMON_WORDS };
