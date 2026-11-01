/**
 * 🔴 RR-354 (owner, AlmiOET's run: "it's a bit too complicated, it should be simple and easy") · PLAIN WORDS FOR A CLIENT.
 *   · Why a page is not ready, in one line a non-technical client understands — never a gate's own words ("key-fact card", "slug").
 *   · The five jobs a client ticks, in the client's words.
 *   · The final report: short and honest — "10 pages made, 8 published, 2 need your OK — here is why." Never "published" for a page that
 *     was not; a site with no publish connection is said, with one next step.
 * Pure.
 */
const RULES = [
  [/no key-fact card|no sourced answer on the page/i, "This page needs one checked fact — none of the checked facts fits it yet. Visibility adds one as soon as its collectors have it."],
  [/not answered with a source and date/i, "A question on this page has no checked answer yet."],
  [/the title is \d+ characters/i, "Its title is a little too long."],
  [/no other page of the set links to it|links to no other page/i, "No other page links to it yet."],
  [/offer button|data-cta/i, "It has no offer button — set yours in Settings → Your product."],
  [/meta description/i, "Its short description for Google is missing or the same as another page's."],
  [/canonical/i, "Its address settings need a fix — Visibility does it when you press Fix."],
  [/robots|disallow/i, "Your site's robots file blocks search engines from it."],
  [/without a visible source and date/i, "A fact on it does not show where it came from."],
  [/first sourced answer starts after/i, "Its first checked answer is too far down the page."],
];
/** a draft that is not ready → one plain line (a ready one → null) */
export function plainWhy(draft) {
  if (!draft || draft.readyAsDraft) return null;
  /* RR-355: the sixth check ("good to read") and "looks like your site" already speak in plain words — their own line first */
  const own = (draft.gates ?? []).filter((g) => !g.pass && /* RR-357: the recipe's own checks speak plain words too — the open questions are named, never "one of the five checks" */ ["good to read", "looks like your site", "answers its whole intent", "every fact sourced and fresh", "not a duplicate"].includes(g.words)).flatMap((g) => g.failing ?? []);
  if (own.length) return own[0];
  const fails = (draft.gates ?? []).filter((g) => !g.pass).flatMap((g) => g.failing ?? []);
  for (const [re, line] of RULES) if (fails.some((f) => re.test(f))) return line;
  return fails.length ? "One of the five checks did not pass yet — press Fix and Visibility tries again with its newest data." : "It is not ready yet.";
}

/** a planned page that was not made as a page of its own (the planner's REFUSED / SECTION rows) → [{ title, why }] in plain words */
export const notMadeOf = (plan = []) => plan.filter((r) => r.kind === "REFUSED" || r.kind === "SECTION").map((r) => ({ title: r.question, why: r.kind === "REFUSED" ? "Not made yet — Visibility is still looking for its official answer; once found, it goes onto the page it belongs to — never a thin page of its own." : `Not made as a new page — ${/^https?:\/\//.test(r.into ?? "") ? `your page ${r.into}` : "another page"} already covers it.` }));

/** the jobs the client ticks — in the client's words, each with what Visibility does for it */
export const JOBS = Object.freeze([
  Object.freeze({ id: "create-pages", label: "Create SEO pages", does: "New pages for what people search — every fact checked, with its source." }),
  Object.freeze({ id: "structure", label: "Fix existing pages", does: "Better titles, descriptions and questions-and-answers for the pages you already have, ready to copy." }),
  Object.freeze({ id: "submit", label: "Get found on Google and Bing", does: "Tells Google and Bing about every page that goes live." }),
  Object.freeze({ id: "social", label: "Social links and posts", does: "A ready post for each new page, for each of your social pages." }),
  Object.freeze({ id: "reports", label: "Reports", does: "A short report every month, and a check every week." }),
]);
export const APPROVAL = Object.freeze({ review: "Show me before publishing", publish: "Publish for me" });

/**
 * The report after the ticked jobs: `drafts` (with readyAsDraft), `live` (published URLs), `approval` ("review" | "publish"), `connected`
 * (a publish connection), `blocked` (a plan-only product) → { headline, needOk: [{ title, why }], needWork: [{ title, why }], next, lines }
 */
export function jobReport({ drafts = [], live = [], approval = "review", connected = false, blocked = null, lines = [], notMade = [] }) {
  const isLive = new Set(live), made = drafts.length, ready = drafts.filter((d) => d.readyAsDraft), published = drafts.filter((d) => isLive.has(d.url)).length;
  const waiting = ready.filter((d) => !isLive.has(d.url) && !d.improve), work = drafts.filter((d) => !d.readyAsDraft && !d.improve); // RR-358: an existing page is never a new page waiting or failing
  const needOk = waiting.map((d) => ({ title: d.title, url: d.url, why: blocked ? "This product is set to plan only — nothing is published from here." : approval === "review" ? "Ready — it waits for your OK." : !connected ? "Ready — but your site is not connected yet, so it could not be published." : "Ready — press Publish." }));
  const unmade = notMade.filter((x) => /^Not made yet/.test(x.why)), needWork = [...work.map((d) => ({ title: d.title, url: d.url, why: plainWhy(d) })), ...unmade];
  /* RR-356 PART B: a topic the client already has a page for is "improve your existing page", never counted as a new page */
  const imp = drafts.filter((d) => d.improve).length, fresh = made - imp;
  const parts = imp ? [`${fresh} new page${fresh === 1 ? "" : "s"} made`, `${imp} of your existing pages to improve`, `${published} published`] : [`${made} page${made === 1 ? "" : "s"} made`, `${published} published`];
  if (needOk.length) parts.push(`${needOk.length} need${needOk.length === 1 ? "s" : ""} your OK`);
  if (work.length) parts.push(`${work.length} need${work.length === 1 ? "s" : ""} work`);
  if (unmade.length) parts.push(`${unmade.length} not made yet`);
  const headline = `${parts.join(", ")}${needOk.length || needWork.length ? " — here is why." : "."}`;
  const next = blocked ? { label: "Open Settings", action: "settings" } : !made ? { label: "Create pages", action: "seo-pages" } : needOk.length && !connected ? { label: "Connect your site", action: "publish-settings" } : needOk.length ? { label: "Publish all ready", action: "publish-all" } : needWork.length ? { label: "Fix all", action: "fix-all" } : { label: "See the pages", action: "pages" };
  const topics = drafts.map((d) => ({ title: d.title, url: d.url, is: d.improve ? `improve your existing page ${d.improve.url}` : "new page" }));
  return { headline, needOk, needWork, next, lines, topics };
}
