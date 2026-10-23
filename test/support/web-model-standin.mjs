/**
 * RR-318 A · an AI stand-in for the WEBSITE writing (tests and the proof share this one file). It answers the Messages API the way the real
 * model does for desktop/web-ai.mjs: 3 options built from the page's own heading and sections (or the question and its official facts).
 * By `mode`:
 *   · "clean"            — 3 options within the length, from the material only;
 *   · "invent"           — every option names a place ("Paris") and a person ("Dr Sara Khan") the material never names, every time;
 *   · "invent-once"      — the first answer invents in one option; told what to avoid (the retry), it drops it;
 *   · "too-long"         — the meta descriptions run past 160 characters (a form slip; never shown).
 * It never reads a key; it counts the requests it answered.
 */
export function webModelReply(body, { mode = "clean", attempt = 0 } = {}) {
  const user = String(body?.messages?.[0]?.content ?? ""), system = String(body?.system ?? "");
  const kind = /^WHAT TO WRITE: (.*)$/m.exec(user)?.[1] ?? "";
  const head = (/^PAGE MAIN HEADING: (.*)$/m.exec(user)?.[1] || /^THE QUESTION: (.*)$/m.exec(user)?.[1] || /^SITE NAME: (.*)$/m.exec(user)?.[1] || "This page").trim().replace(/[.?!]$/, "");
  const site = /^SITE NAME: (.*)$/m.exec(user)?.[1]?.trim() || "the site";
  const secs = (/^PAGE SECTION HEADINGS: (.*)$/m.exec(user)?.[1] ?? "").split(" | ").map((s) => s.trim()).filter((s) => s && !/^(key facts|questions and answers|common questions)$/i.test(s)).slice(0, 3);
  const official = (/OFFICIAL FACTS[^\n]*\n((?:- [^\n]*\n?)*)/.exec(user)?.[1] ?? "").split("\n").filter(Boolean).map((l) => l.replace(/^- /, ""));
  const recheck = /RE-CHECK/.test(system);
  const n = recheck ? Number(/given (\d+) option/.exec(system)?.[1] ?? 1) : 3;
  let opts;
  if (/meta description/.test(kind)) {
    const low = secs.map((s) => s.charAt(0).toLowerCase() + s.slice(1));
    const shapes = [(t) => `${head}: ${t} — explained clearly, so you know what to expect.`, (t) => `On this page: ${t}. Written plainly for people preparing now.`, (t) => `${site} explains ${t}, with each answer set out step by step.`];
    /* like a real model, each option is fitted to the length by saying fewer topics — never cut */
    opts = shapes.map((f) => { for (let k = Math.max(1, low.length); k >= 1; k--) { const t = f(low.slice(0, k).join(", ") || "what you need to know"); if (t.length <= 160) return t.length < 110 ? `${t} Clear answers for you.` : t; } return f("the essentials"); });
  } else if (/page title/.test(kind)) opts = [`${head} | ${site}`, `${head}: what to know | ${site}`, `${head} — a clear guide`].map((t) => (t.length > 60 ? head.slice(0, 58) : t));
  else if (/opening answer/.test(kind)) opts = official.length ? [official.slice(0, 2).map((l) => l.replace(/\s*\(.*?checked [\d-]+\)$/, "")).join(" "), `${official[0].replace(/\s*\(.*?checked [\d-]+\)$/, "")} Each answer here comes from the official page.`, `${head}? ${official[0].replace(/\s*\(.*?checked [\d-]+\)$/, "")}`] : [`${head}: the official answer was not found yet, so this page waits for it.`, `${head}: this page gives the answer once the official page says it.`, `${head}: Visibility found no official answer yet, and says so.`];
  else if (/answer to one question/.test(kind)) opts = [`Yes. ${head} is answered on this page, from its own words.`, `In short: ${head.toLowerCase()} — the page explains it in its own words.`, `The answer is on this page: ${head.toLowerCase()}, explained step by step.`];
  else opts = [`${site} offers online practice and honest feedback, as its own pages describe.`, `${site} is an online practice site, described on its own home page.`, `${site}: online practice with clear feedback, in its own words.`];
  opts = opts.map((text) => ({ text, names: [], facts: [] }));
  const invent = mode === "invent" || (mode === "invent-once" && !recheck && attempt === 0);
  if (invent) opts = opts.map((o, i) => (mode === "invent" || i === 0 ? { text: o.text.replace(/\.$/, " — as Dr Sara Khan teaches in Paris."), names: ["Dr Sara Khan"], facts: [] } : o));
  if (mode === "too-long") opts = opts.map((o) => ({ ...o, text: `${o.text} ${o.text}` }));
  return { id: "msg_standin", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", usage: { input_tokens: 900, output_tokens: 300 }, content: [{ type: "text", text: JSON.stringify({ options: opts.slice(0, n) }) }] };
}
/** a fetch that answers like the AI provider (for desktop/web-ai.mjs in tests): counts requests; never reads the key's value */
export function webModelFetch({ mode = "clean" } = {}) {
  let count = 0;
  const f = async (url, init) => { count++; const body = JSON.parse(init.body); return new Response(JSON.stringify(webModelReply(body, { mode, attempt: count - 1 })), { status: 200, headers: { "content-type": "application/json" } }); };
  f.count = () => count;
  return f;
}
