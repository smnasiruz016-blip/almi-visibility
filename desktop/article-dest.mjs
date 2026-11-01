/**
 * RR-344 B (owner, 29 Oct 2026) · WHERE THE CLIENT'S ARTICLES GO, AND TODAY'S NOTICE.
 *   · "Where should your articles go?" — per product: their own site (connected under Publish: WordPress, GitHub + Vercel or Shopify),
 *     published after their Approve or fully automatically; an export file (HTML or Markdown) for any other site; LinkedIn / Facebook posts
 *     to copy (auto-posting is not built: it needs LinkedIn's and Meta's own app approvals); or drafts only. Only "fully automatic" lets the
 *     app publish by itself; export, posts and drafts only never publish.
 *   · Today's notice: one line on the dashboard — ready (review and approve) · published (its link) · none today, and why.
 *   · An e-mailed summary is NOT built (the app sends no e-mail yet) — the setting says "coming soon", never a promise.
 */
import { PUBLISH_MODE } from "../src/page/articles.mjs";

export const ARTICLE_DEST = Object.freeze({
  "site-approve": Object.freeze({ label: "My website — publish each article after I approve it", mode: PUBLISH_MODE.REVIEW_FIRST, publishes: true }),
  "site-auto": Object.freeze({ label: "My website — publish automatically once every check passes", mode: PUBLISH_MODE.AUTO_AFTER_GATES, publishes: true }),
  export: Object.freeze({ label: "Export a file (HTML or Markdown) for any other site", mode: PUBLISH_MODE.REVIEW_FIRST, publishes: false }),
  social: Object.freeze({ label: "LinkedIn and Facebook — posts ready to copy", mode: PUBLISH_MODE.REVIEW_FIRST, publishes: false }),
  drafts: Object.freeze({ label: "Drafts only — nothing leaves this computer", mode: PUBLISH_MODE.REVIEW_FIRST, publishes: false }),
});
export const EMAIL_SUMMARY = Object.freeze({ state: "coming soon", line: "A daily or weekly e-mail summary — coming soon: the app does not send e-mail yet." });

/** the product's choice: its own, else read from its publishing setting (the app before RR-344) */
/* RR-357 (owner: "the card says it is published by itself while the client chose Show me before publishing"): an article on the client's own
 * site follows the SAME choice as the pages (R1) — the publish choice decides between "after I approve it" and "automatically"; a file, posts or
 * drafts only stay what the client chose */
export const destOf = (saved, publishMode) => (ARTICLE_DEST[saved?.go] && !/^site-/.test(saved.go) ? saved.go : publishMode === PUBLISH_MODE.AUTO_AFTER_GATES ? "site-auto" : "site-approve");

/** what stops a publish under the client's choice (null = it may go) */
export const publishRefusal = (go) => (ARTICLE_DEST[go]?.publishes === false ? `You chose "${ARTICLE_DEST[go].label}" — nothing is published. Change it under "Where should your articles go?".` : null);

/**
 * Today's notice. `today` the day's article ({ url, title } or null), `none` why there is none, `live` the published records.
 * → { state: "ready" | "published" | "none", line, url?, link? }
 */
export function todayNotice({ go, today = null, none = null, live = [], connected = false }) {
  if (!today) return { state: "none", line: `No article today — ${none ?? "no new question with a sourced answer yet"}` };
  const rec = live.find((x) => x.url === today.url && x.state === "LIVE");
  if (rec) return { state: "published", line: `Published: ${rec.live ?? today.url}`, url: today.url, link: rec.live ?? null };
  const how = go === "site-auto" ? (connected ? "it is published by itself once every check passes" : "connect your site under Publish and it goes out by itself") : go === "export" ? "review it, then export the file" : go === "social" ? "review it, then copy its LinkedIn and Facebook posts" : go === "drafts" ? "review it — it stays a draft" : connected ? "review and approve" : "review it, and connect your site under Publish to publish it";
  return { state: "ready", line: `Today's article is ready — ${how}`, url: today.url, title: today.title ?? null };
}

const unent = (s) => String(s).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
/** a page's own content as Markdown — headings, paragraphs, lists and links (enough for any site's editor) */
export function markdownOf(html) {
  let s = String(html ?? "");
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  for (let n = 1; n <= 6; n++) s = s.replace(new RegExp(`<h${n}\\b[^>]*>([\\s\\S]*?)<\\/h${n}>`, "gi"), (_, t) => `\n\n${"#".repeat(n)} ${t.replace(/<[^>]+>/g, "").trim()}\n\n`);
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => `[${t.replace(/<[^>]+>/g, "").trim()}](${h})`);
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${t.replace(/<[^>]+>/g, "").trim()}`);
  s = s.replace(/<\/(p|div|section|ul|ol|table|tr)>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  return unent(s).split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
