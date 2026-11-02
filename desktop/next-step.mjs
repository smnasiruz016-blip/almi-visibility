/**
 * 🔴 RR-362 items 2, 4, 7 (recipe R11: a next-step button on every screen) · A PRODUCT'S ONE LINE AND ITS ONE NEXT STEP, for its card on the first screen and its "What to do now" box. Plain words only.
 * One rule, one place: the card and the Home tab read the same answer. Pure: what the product holds is handed in.
 */
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/**
 * `c` = { hasSite, checked, score, pages, ready, improve, published, checkLater, running: job|null, foreign } → { status, button, action, tab }.
 * `action`: check | make | pages | settings | wait. A set-aside draft of another subject never counts (item 7: "almiworld youtube" showed "20 made · 3 ready", OET's drafts).
 */
export function nextStepOf(c) {
  if (c.running) return { status: `${c.running.label}: ${c.running.of ? `${c.running.done} of ${c.running.of}` : "working"}`, button: "See how far it is", action: "wait", tab: "Home" };
  if (!c.hasSite) return { status: "Add your website to start", button: "Add my website", action: "settings", tab: "Settings" };
  if (!c.checked) return { status: "Not checked yet", button: "Check my site", action: "check", tab: "Home" };
  const later = c.checkLater ? ` · ${plural(c.checkLater, "page")} checked tomorrow` : "";
  if (c.ready > 0) return { status: `${plural(c.ready, "page")} ready · ${c.published} published${later}`, button: `${plural(c.ready, "page")} wait${c.ready === 1 ? "s" : ""} for you → See them`, action: "pages", tab: "Pages" };
  if (c.pages > 0 || c.improve > 0) return { status: `${plural(c.pages, "page")} made, none ready yet${later}`, button: "See what each page still needs", action: "pages", tab: "Pages" };
  if (c.published > 0) return { status: `${plural(c.published, "page")} published`, button: "Make more pages", action: "make", tab: "Home" };
  return { status: c.score != null ? `Score ${c.score} of 100 · no pages yet` : "No pages yet", button: "Make my pages", action: "make", tab: "Home" };
}
/* item 13: the pages not read yet are read again on a later day, by the app itself: the same run; a run per day at most */
export const checksDue = (pending, { today, running = false }) => Boolean(pending?.titles?.length) && !running && String(pending.day) < today;
/* item 3: the 17 big cards become a short list of one-line links, the most important on top (per the features' own ids) */
export const TOP_JOBS = Object.freeze(["seo-pages", "publish", "check", "articles", "keywords"]);
export const MORE_JOBS = Object.freeze(["page-count", "seo-check", "aeo", "geo", "links", "languages", "search-power", "google", "youtube", "tiktok-instagram", "social", "monthly"]);
