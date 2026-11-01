/**
 * 🔴 RR-356 PART B (owner: "IMPROVE, DON'T DUPLICATE — if the client already has a page on the same topic, do NOT make a second page; improve
 * it: through the connection where it can be edited, else ready content to paste, page by page") · THE IMPROVEMENT PACK of one existing
 * page: the parts of Visibility's draft for that topic (each question with its sourced answers, and its fact cards) that the existing page
 * does not answer yet — judged by the page's own questions and headings as Visibility read them. Pure.
 */
import { readPage } from "./page-quality.mjs";

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 3));
/** does the existing page already ask this question? (the same words, or most of them) */
export function alreadyAsked(question, existing) {
  const q = words(question); if (!q.size) return false;
  return [...(existing?.qa ?? []).map((x) => x.q), ...(existing?.h2 ?? []), existing?.h1].filter(Boolean).some((h) => { if (norm(h) === norm(question)) return true; const w = words(h); return [...q].filter((x) => w.has(x)).length / q.size >= 0.75; });
}
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * → { url, title, add: [question], already: [question], html, text } — `draft` = Visibility's draft for the topic; `existing` = the client's
 * page as read (desktop/site-read.mjs readPage: h1, h2, qa). The html is a section ready to paste (or to add through the connection): the new
 * questions, each answer with its source and date — and nothing the page already has.
 */
export function improvePack({ draft, existing }) {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(draft.html)?.[1] ?? draft.html;
  const blocks = [...main.matchAll(/<details data-need-id="[^"]*"[^>]*>([\s\S]*?)<\/details>/gi)].map((m) => ({ html: m[0].replace(/ open(?=[ >])/, ""), question: /<summary>([\s\S]*?)<\/summary>/i.exec(m[1])?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "" }));
  const add = blocks.filter((b) => !alreadyAsked(b.question, existing)), already = blocks.filter((b) => alreadyAsked(b.question, existing)).map((b) => b.question);
  /* the fact cards of the added questions only — a card whose answer the page already has is not repeated */
  const ids = new Set(add.flatMap((b) => [...b.html.matchAll(/data-claim-id="([^"]*)"/g)].map((m) => m[1])));
  const cardList = [...main.matchAll(/<li class="card" data-claim-id="([^"]*)"[\s\S]*?<\/li>/gi)].filter((m) => ids.has(m[1])).map((m) => m[0]);
  const cards = cardList.length ? `<section><h2>Key facts</h2><ul class="cards">${cardList.join("")}</ul></section>` : "";
  const style = /<style data-av-content>[\s\S]*?<\/style>/i.exec(draft.html)?.[0] ?? "";
  const html = add.length ? `<section class="av-page" data-improve-for="${esc(existing?.url ?? "")}">${style}<h2>More about ${esc(existing?.h1 ?? draft.title)}</h2>${cards}${add.map((b) => b.html).join("\n")}</section>` : "";
  const r = readPage(`<main>${html}</main>`);
  const text = add.length ? [`Improve your page: ${existing?.url ?? ""}`, `Add this section (${add.length} question${add.length === 1 ? "" : "s"} your page does not answer yet). Every answer keeps its source and date.`, "",
    ...r.cards.map((c) => `• ${c.value}`), "", ...r.items.flatMap((it) => [`## ${it.question}`, ...it.answers.map((a) => `- ${a}`), ""]), already.length ? `Already on your page (not repeated): ${already.join("; ")}` : ""].join("\n") : `Your page ${existing?.url ?? ""} already answers every question Visibility has for this topic — nothing to add.`;
  return { url: existing?.url ?? null, title: draft.title, add: add.map((b) => b.question), already, html, text };
}
