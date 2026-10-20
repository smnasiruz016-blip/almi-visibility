/**
 * 🔴 SOCIAL POSTS (RR-297, item 2). For each article, 2–3 short, ready-to-copy posts (Facebook, LinkedIn), each with the article's link and
 * ONE sourced fact — its words of the same meaning, its numbers, units and conditions exact, its source and checked date named. No promise
 * of rankings or results; an opinion appears only under "General view — not an official fact".
 * POSTING IS THE CLIENT'S OWN ACTION: nothing here posts, logs in or holds a credential (AUTO_POSTING says so). Pure. Generic.
 */
import { sameMeaning } from "./joined-page.mjs";

export const NETWORKS = Object.freeze(["Facebook", "LinkedIn"]);
export const AUTO_POSTING = "DEFERRED — posting is the client's own action: copy a post and share it yourself. No social login, no credential. Auto-posting through the client's own connection comes later.";
export const GENERAL_VIEW_LABEL = "General view — not an official fact";
const PROMISE = /\b(will|guaranteed?|sure to)\b[^.]{0,40}\b(rank|ranking|top of google|first page|cited|citation|results?|pass)\b|\bguarantee/i;

/** The posts of one article: { url, question, items: [{ claims: [{ text, source, link, readOn }] }], generalView? }. */
export function postsForArticle(article) {
  const facts = article.items.flatMap((it) => it.claims).filter((c) => c.text && c.link && /^\d{4}-\d{2}-\d{2}$/.test(c.readOn ?? ""));
  if (!facts.length) return Object.freeze({ posts: Object.freeze([]), refused: Object.freeze([{ why: "the article has no sourced fact — no post is written" }]) });
  const line = (c) => `${c.text.trim()} (Source: ${c.source ?? new URL(c.link).hostname}, checked ${c.readOn})`;
  const drafts = [
    { network: "Facebook", fact: facts[0], text: `${article.question}\n\n${line(facts[0])}\n\nRead the full answer: ${article.url}` },
    { network: "LinkedIn", fact: facts[0], text: `A question we hear often: ${article.question}\n\n${line(facts[0])}\n\nThe full answer, with every source: ${article.url}` },
    ...(facts[1] ? [{ network: "Facebook", fact: facts[1], text: `${line(facts[1])}\n\nMore: ${article.url}` }] : []),
  ];
  if (article.generalView) drafts[1].text += `\n\n${GENERAL_VIEW_LABEL}: ${article.generalView.text}`;
  const posts = [], refused = [];
  for (const d of drafts) { const c = checkPost(d, article); (c.ok ? posts : refused).push(Object.freeze(c.ok ? { network: d.network, text: d.text, claimId: d.fact.claimId } : { network: d.network, claimId: d.fact.claimId, why: c.why })); }
  return Object.freeze({ posts: Object.freeze(posts), refused: Object.freeze(refused) });
}

/**
 * A post passes when: it carries the article's link; its fact says what the claim says (same meaning, every number, unit and condition
 * kept) with the claim's source and checked date; it promises no ranking or result; any opinion is under the General-view label.
 * `post` is { network, text, fact: the claim it states, said?: the fact's words as written in the post (defaults to the claim's text) }.
 */
export function checkPost(post, article) {
  const c = post.fact, said = post.said ?? c.text.trim();
  if (!post.text.includes(article.url)) return { ok: false, why: "the post does not carry the article's link" };
  if (!post.text.includes(said)) return { ok: false, why: "the post does not state its fact" };
  const sm = sameMeaning(said, c.text);
  if (!sm.same) return { ok: false, why: `the fact is not the source's: ${sm.why}` };
  if (!post.text.includes(c.readOn) || !(post.text.includes(c.source ?? "") && (c.source ?? "") !== "")) return { ok: false, why: "the post does not name the fact's source and checked date" };
  if (PROMISE.test(post.text)) return { ok: false, why: "the post promises a ranking or a result" };
  if (article.generalView && post.text.includes(article.generalView.text) && !post.text.includes(`${GENERAL_VIEW_LABEL}: ${article.generalView.text}`)) return { ok: false, why: "an opinion without its General-view label" };
  return { ok: true, why: null };
}
