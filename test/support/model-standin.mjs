/**
 * RR-312 · an AI stand-in that behaves like a real model — including its small slips — for measuring the guard (tests and the proof share
 * this one file). It writes 3 options from the video's own words, with Roman-Urdu translation words, and, by a fixed seed per video:
 *   · fixes a typo'd year of the description (1018 → 2018 beside 2016, 2017) — a correction;
 *   · adds a year the material does not hold (a doubt);
 *   · invents a place ("Paris") in one option, or a person ("Sara"), or a price ("$50") — truly invented;
 *   · slips on form: a 4th hashtag, a 5-word thumbnail, a placeholder line.
 * Told what to avoid (the retry), it drops the named slip most of the time (85%), as a real model mostly does.
 */
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
const clean = (s) => String(s ?? "").replace(/[#@][\p{L}\p{N}_.-]*/gu, " ").replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|️|‍|[\u{1F1E6}-\u{1F1FF}]/gu, " ").replace(/\s+/g, " ").trim();
const words = (s) => clean(s).split(" ").filter(Boolean);
export function modelReply(material, { attempt = 0, avoid = [] } = {}) {
  const title = /^VIDEO TITLE: (.*)$/m.exec(material)?.[1] ?? "Video";
  const desc = /^VIDEO DESCRIPTION \(its own\): (.*)$/m.exec(material)?.[1] ?? "";
  const r = rng(hash(title) + attempt * 7919);
  const own = words(title.split("|")[0]).slice(0, 7).join(" ") || "Hamari Video";
  const line = clean(desc.split(/(?<=[.!?])\s+/)[0]) || own;
  const years = (desc.match(/\b\d{4}\b/g) ?? []);
  const base = (t, extra = "") => ({ title: t.slice(0, 95), description: `${t}${extra}.\n${line.length >= 20 ? line : `${own} — hamari yaadein, hum sab ke saath.`}`.slice(0, 600), hashtags: ["#FamilyVlog", "#PakistaniFamily", "#Yaadein"], thumbnail: "HAMARI YAADEIN", names: [], facts: [] });
  const o = [base(`${own} — Meri Purani Yaadein`), base(`${own} | Pehla Din`), base(`Hamari ${own}`)];
  const keep = (slip) => !avoid.some((a) => slip.includes(a)) || r() > 0.85;
  /* a typo'd year in the description, fixed (1018 beside 2016, 2017 → 2018) */
  const typo = years.find((y) => /^1\d{3}$/.test(y) && years.some((z) => /^20\d{2}$/.test(z)));
  if (typo) o[0].description += `\n${years.filter((y) => y !== typo).join(", ")}, 2${typo.slice(1)} ki videos.`;
  if (r() < 0.2) { const y = String((years.map(Number).find((x) => x > 1900) ?? 2019) + 4); if (keep(y)) o[1].title = `${o[1].title} ${y}`.slice(0, 95); }
  if (r() < 0.12 && keep("Paris")) o[2].title = `${own} — Paris Trip`.slice(0, 95);
  if (r() < 0.08 && keep("Sara")) { o[1].names = ["Sara"]; o[1].description += "\nSara ke saath."; }
  if (r() < 0.06 && keep("$50")) o[0].description += "\nSirf $50 mein poora din.";
  if (r() < 0.10) o[0].hashtags = [...o[0].hashtags, "#Vlog"];
  if (r() < 0.10) o[2].thumbnail = "HAMARI PURANI YAADEIN PEHLA DIN";
  if (r() < 0.05) o[1].description += "\n(Add one or two sentences saying what happens.)";
  return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options: o }) }], usage: { input_tokens: 3000, output_tokens: 600 } };
}
/** a fetch for writeWithAI: reads the retry's "do not use" list from the system prompt */
export const modelFetch = (seen = []) => async (url, init) => {
  const j = JSON.parse(init.body); seen.push(j);
  const avoid = [...String(j.system).matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((x) => /previous answer used/.test(j.system));
  const material = j.messages[0].content.replace(/^MATERIAL:\n/, "");
  return new Response(JSON.stringify(modelReply(material, { attempt: avoid.length ? 1 : 0, avoid })), { status: 200 });
};
