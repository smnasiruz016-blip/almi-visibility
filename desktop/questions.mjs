/**
 * 🔴 RR-321 C + D2 + D3 · THE QUESTION COUNT, SHOWN BEFORE THE PAGE COUNT (owner, 23 Oct 2026):
 *   1 "questions we found" — never "all questions in the world" — with a separate number per source: Search Console, the client's AI browser
 *     search, AI research, the subject's own FAQ, Keyword Planner (and Bing) files;
 *   2 same-meaning questions → how many groups;
 *   3 how many groups can be a page of their own (a different answer with a source) — the rest are answered inside a bigger page;
 *   4 NOT ABOUT THE PRODUCT: removed, counted and listed ("kate cowhig", "bc care registry" … are no questions about OET), and a site's menu
 *     text ("Read our re-marking policy Everything you need to know FAQs …") is never a question at all.
 * Pure.
 */
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = (s, w) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, "iu").test(String(s ?? ""));
/** the label of each source, as the client reads it */
export const SOURCE_LABEL = (subject) => ({ search: "Search Console", observed: "your AI's browser search", "ai research": "AI research", "official FAQ": `${subject}'s own FAQ`, tool: "Keyword Planner and Bing files", youtube: "YouTube" });
export const SOURCE_ORDER = ["search", "observed", "ai research", "official FAQ", "tool", "youtube"];

/* a site's navigation and menu words: a line made of several of them is menu text, never a question (D3) */
const NAV = /\b(home|menu|log ?in|sign ?in|book (a|now)|book a test|faqs?|contact( us)?|about( us)?|read (our|more)|learn more|everything you need to know|policy|policies|terms|privacy|cookies?|newsletter|subscribe|shop|cart|search|download|explore|next step|view all|see all|back to)\b/gi;
export function isMenuText(text) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return true;
  const nav = s.match(NAV) ?? [], words = s.split(" "), caps = words.filter((w) => /^[A-Z]/.test(w)).length;
  if (nav.length >= 3) return true; // "Read our re-marking policy Everything you need to know FAQs …"
  if (nav.length >= 2 && !/\?$/.test(s) && caps / words.length > 0.4) return true;
  return words.length > 16 && !/\?/.test(s) && caps / words.length > 0.5; // a run of headings, not a question
}

/* what the test is FOR: a question about meeting an English-language requirement is about it even when it does not name it */
const NEED = /\b(english (language )?(test|tests|requirements?|proficiency|score|scores|exam)|language (test|requirements?)|ielts|pte|toefl|occupational english)\b/i;
/** → { about: true, why } | { about: false, why } — the subject named, its full name, its own FAQ, or the English-test need it meets */
export function aboutProduct(item, subject, { fullName = null } = {}) {
  const t = String(item?.text ?? item ?? "");
  if (names(t, subject) || (fullName && names(t, fullName))) return { about: true, why: `names ${subject}` };
  if (item?.kind === "official FAQ") return { about: true, why: `on ${subject}'s own FAQ` };
  if (NEED.test(t)) return { about: true, why: "about the English-test requirement it meets" };
  return { about: false, why: `does not name ${subject} or an English-test requirement` };
}

/**
 * Sort the questions found: kept (about the product), not about it, and menu text — counted per source. `items` = { text, kind, … }.
 */
export function sortQuestions(items, subject, opts = {}) {
  const kept = [], notAbout = [], menu = [], per = Object.fromEntries(SOURCE_ORDER.map((k) => [k, { found: 0, kept: 0 }]));
  const seen = new Set();
  for (const x of items) {
    const k = SOURCE_ORDER.includes(x.kind) ? x.kind : "search", key = `${k}|${String(x.text).toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (seen.has(key)) continue; seen.add(key);
    per[k].found++;
    if (isMenuText(x.text)) { menu.push({ name: String(x.text).slice(0, 120), why: "menu or navigation text of a page — never a question", source: x.source ?? null }); continue; }
    const a = aboutProduct(x, subject, opts);
    if (!a.about) { notAbout.push({ name: x.text, why: a.why, source: x.source ?? null }); continue; }
    per[k].kept++; kept.push({ ...x, why: a.why });
  }
  return { kept, notAbout, menu, per };
}

/** the question count's lines (C1–C4), from the sorted questions, the groups, and which groups are the main question of a sourced page */
export function questionCount({ sorted, groups, pages = [], subject }) {
  const L = SOURCE_LABEL(subject), found = Object.values(sorted.per).reduce((n, x) => n + x.found, 0);
  const mainOf = new Map(); for (const p of pages) if (p.main && (p.claims ?? []).length) mainOf.set(p.main, p.title);
  const own = groups.filter((g) => mainOf.has(g.question)), inside = groups.filter((g) => !mainOf.has(g.question));
  return {
    found, bySource: SOURCE_ORDER.map((k) => ({ kind: k, label: L[k], found: sorted.per[k].found, kept: sorted.per[k].kept })).filter((x) => x.found || ["search", "observed", "ai research", "official FAQ", "tool"].includes(x.kind)),
    kept: sorted.kept.length, groups: groups.length, ownPage: own.length, inside: inside.length,
    ownList: own.map((g) => ({ name: g.question, why: `the main question of "${mainOf.get(g.question)}" — a different answer, with its source` })),
    insideList: inside.map((g) => ({ name: g.question, why: g.page ? `answered inside "${g.page}"` : "no page answers it yet with a source" })),
    notAbout: sorted.notAbout.length, notAboutList: sorted.notAbout, menu: sorted.menu.length, menuList: sorted.menu,
    line: `${found.toLocaleString("en-US")} questions we found (not all the questions in the world): ${SOURCE_ORDER.filter((k) => sorted.per[k].found).map((k) => `${L[k]} ${sorted.per[k].found}`).join(" · ") || "none yet"}. ${sorted.notAbout.length} not about ${subject} and ${sorted.menu.length} menu lines removed; ${groups.length} groups of the same meaning; ${own.length} can be a page of their own, ${inside.length} are answered inside a bigger page.`,
  };
}
