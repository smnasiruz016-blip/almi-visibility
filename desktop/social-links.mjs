/**
 * 🔴 RR-353 (owner, 31 Oct 2026: "Setup asks for the client's social media links … post automatically where an official API allows it after
 * the client connects; otherwise show ready-to-copy posts with an Open <network> button").
 *   · The client's own pages: Facebook Page, LinkedIn, Instagram, TikTok, X, YouTube — each a full web address on that network's own site.
 *   · The posts are the article's own CHECKED posts (src/page/social-posts.mjs: its sourced fact, its link) — never a new claim. Each network
 *     gets Copy and "Open <network>": the network's own share page where one exists (Facebook, LinkedIn, X), else the client's page there.
 *   · Automatic posting: NOT in this version. Each network's posting API needs AlmiWorld's own developer app approved by that network
 *     (Meta, LinkedIn, X, TikTok) — said plainly, never pretended.
 * Pure.
 */
export const SOCIAL_NETWORKS = Object.freeze([
  Object.freeze({ id: "facebook", name: "Facebook Page", hosts: ["facebook.com", "fb.com"], home: "https://www.facebook.com/", share: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` }),
  Object.freeze({ id: "linkedin", name: "LinkedIn", hosts: ["linkedin.com"], home: "https://www.linkedin.com/feed/", share: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` }),
  Object.freeze({ id: "instagram", name: "Instagram", hosts: ["instagram.com"], home: "https://www.instagram.com/", share: null }),
  Object.freeze({ id: "tiktok", name: "TikTok", hosts: ["tiktok.com"], home: "https://www.tiktok.com/upload", share: null }),
  Object.freeze({ id: "x", name: "X", hosts: ["x.com", "twitter.com"], home: "https://x.com/compose/post", share: (url, text) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}` }),
  Object.freeze({ id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be"], home: "https://studio.youtube.com/", share: null }),
]);
export const AUTO_POST_LINE = "Posting by itself is not in this version: each network's posting connection needs AlmiWorld's own app approved by that network (Meta, LinkedIn, X, TikTok) first. Until then: Copy, then Open — the post is ready in one paste.";
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^(www|m|business)\./i, "").toLowerCase(); } catch { return null; } };

/** the typed pages → { links: { facebook: url, … } } | { refused } — each empty one is left out; each is on its own network's site */
export function socialFrom(v = {}) {
  const links = {};
  for (const n of SOCIAL_NETWORKS) {
    let t = String(v?.[n.id] ?? "").trim(); if (!t) continue;
    if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
    const h = hostOf(t);
    if (!h || /\s/.test(t) || !n.hosts.some((x) => h === x || h.endsWith(`.${x}`))) return { refused: `${n.name}: give your page's full address on ${n.hosts[0]} (for example https://${n.hosts[0]}/yourpage).` };
    links[n.id] = t;
  }
  return { links };
}

/**
 * The posts for every network: `post` = socialFor(…) ({ posts: [{ network, text }] } — the checked posts), `links` = the client's pages,
 * `url` = the page's LIVE address (null while it is a draft: the share pages need a live page). → [{ network, name, text, open, openLabel, page }]
 */
export function socialShare({ post, links = {}, url = null }) {
  const checked = post?.posts ?? [];
  if (!checked.length) return [];
  const fb = checked.find((p) => p.network === "Facebook") ?? checked[0], li = checked.find((p) => p.network === "LinkedIn") ?? fb;
  const firstLine = (t) => String(t).split("\n")[0];
  const link = /(https?:\/\/\S+)\s*$/.exec(fb.text)?.[1] ?? "";
  const short = `${firstLine(fb.text)}\n\n${link}`.trim();
  const xText = fb.text.length <= 280 ? fb.text : short.length <= 280 ? short : link;
  const texts = { facebook: fb.text, linkedin: li.text, instagram: fb.text, tiktok: fb.text, x: xText, youtube: li.text };
  return SOCIAL_NETWORKS.map((n) => {
    const page = links[n.id] ?? null, share = url && n.share ? n.share(url, n.id === "x" ? xText.replace(link, url) : texts[n.id]) : null;
    return { network: n.id, name: n.name, text: texts[n.id], page, open: share ?? page ?? n.home, openLabel: `Open ${n.name === "Facebook Page" ? "Facebook" : n.name}`, how: share ? "opens its share page with your page's link" : page ? "opens your page there — paste the post" : "opens the network — paste the post" };
  });
}
