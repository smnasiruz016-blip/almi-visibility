/**
 * 🔴 RR-363 · R15: THE PAGE BLUEPRINT FROM THE TOP PAGES (owner, 2 Nov 2026: "they win with building blocks, not with long text"). From each top page only its STRUCTURE: which blocks it uses, how many, the columns
 * of its tables; never a sentence of its text, and nothing from it is ever a fact. The blueprint = every block in the #1 page or in at least two top pages + the page type's core questions + our own edge.
 * A comments box is recorded when top pages have one, and never built now (later, owner-moderated). Pure.
 */
export const BLOCKS = Object.freeze({ search: "a search or choose box", table: "a data table", steps: "numbered steps", bar: "a topic bar or table of contents", foldouts: "fold-out sections", faqs: "questions and answers", action: "an action button", related: "related links", comments: "comments or questions from readers", year: "the year in the title", tips: "practical tips" });
export const NOT_BUILT_NOW = Object.freeze(["comments"]);
/* what the top pages lack and we can add, per product category (recipe R15: "our own edge") */
export const OUR_EDGE = Object.freeze({ exam: Object.freeze(["the fee in local money", "the council for each profession", "the score each country asks, side by side", "links to practice", "verified dates with their source"]), general: Object.freeze(["verified facts with their source"]) });

const textOf = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
/** a page's HTML → its building blocks. A page built by a script in the visitor's browser shows little: `thin` says so */
export function blocksOfHtml(html, { title = null } = {}) {
  const clean = String(html ?? "").replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " "), main = /<(main|article)\b[\s\S]*<\/\1>/i.exec(clean)?.[0] ?? clean;
  const t = title ?? textOf(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(clean)?.[1] ?? ""), words = textOf(main).split(" ").filter(Boolean).length;
  const count = (re) => (main.match(re) ?? []).length, heads = [...main.matchAll(/<h[234]\b[^>]*>([\s\S]*?)<\/h[234]>/gi)].map((m) => textOf(m[1]));
  const tables = [...main.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((m) => (/<tr\b[^>]*>([\s\S]*?)<\/tr>/i.exec(m[0])?.[1] ?? "").match(/<t[hd]\b[^>]*>[\s\S]*?<\/t[hd]>/gi)?.map((c) => textOf(c).slice(0, 40)).filter(Boolean).slice(0, 8) ?? []);
  const stepCounts = [...main.matchAll(/<ol\b[\s\S]*?<\/ol>/gi)].map((m) => (m[0].match(/<li\b/gi) ?? []).length).filter((n) => n >= 2);
  const faqs = heads.filter((h) => /\?\s*$/.test(h)).length + [...main.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].filter((m) => /\?\s*$/.test(textOf(m[1]))).length;
  return {
    search: /<input\b[^>]*type=["']?(?:search|text)|<select\b|role=["']search|data-chooser/i.test(main), tables: tables.length, columns: tables.slice(0, 3), steps: stepCounts.length ? Math.max(...stepCounts) : 0,
    bar: /data-topic-bar|table[- ]of[- ]contents|class=["'][^"']*\b(?:toc|tabs?|tab-bar)\b/i.test(main) || heads.some((h) => /^(?:table of )?contents$/i.test(h)), foldouts: count(/<details\b/gi) + count(/class=["'][^"']*\baccordion\b/gi), faqs,
    action: /<a\b[^>]*class=["'][^"']*\b(?:btn|button|cta)\b/i.test(main) || /<button\b[^>]*>\s*(?:book|try|start|get|sign up|register)/i.test(main), related: heads.some((h) => /\b(?:related|you may also|read next|see also|more guides)\b/i.test(h)) || /class=["'][^"']*\brelated\b/i.test(main),
    comments: /id=["']comments?["']|class=["'][^"']*\bcomment-(?:list|form|respond)\b|leave a (?:reply|comment)/i.test(clean), year: /\b20\d\d\b/.test(t), tips: heads.some((h) => /\btips?\b/i.test(h)) || /data-tips\b/i.test(main), words, thin: words < 150,
  };
}
const present = (b, k) => (k === "table" ? b.tables > 0 : k === "steps" ? b.steps > 0 : k === "foldouts" ? b.foldouts > 0 : k === "faqs" ? b.faqs > 0 : Boolean(b[k]));
/** the top pages' blocks → the blueprint. `tops` = [{ url, rank (1 = Google's first), blocks, official? }] */
export function blueprintOf({ tops = [], core = {}, category = "exam", on = null } = {}) {
  const read = tops.filter((t) => t.blocks), first = read.find((t) => t.rank === 1), blocks = [];
  for (const k of Object.keys(BLOCKS)) { const n = read.filter((t) => present(t.blocks, k)).length, inFirst = first && present(first.blocks, k); if (inFirst || n >= 2) blocks.push({ block: k, why: inFirst ? (n > 1 ? `Google's #1 page and ${n - 1} more` : "Google's #1 page") : `${n} of ${read.length} top pages` }); }
  const nums = (f) => read.map(f).filter((x) => x > 0).sort((a, b) => a - b), mid = (xs) => (xs.length ? xs[Math.floor(xs.length / 2)] : 0);
  return { on, read: read.length, urls: read.map((t) => ({ url: t.url, rank: t.rank ?? null, official: Boolean(t.official), blocks: t.blocks })), blocks, faqs: mid(nums((t) => t.blocks.faqs)), words: mid(nums((t) => t.blocks.words)), columns: read.flatMap((t) => t.blocks.columns ?? []).slice(0, 6), year: blocks.some((b) => b.block === "year"), core: Object.values(core), edge: OUR_EDGE[category] ?? OUR_EDGE.general };
}
/** the ledger's line: blocks the top pages use → blocks our page has; a missing one named */
export function blocksCompared(blueprint, ours) {
  const wanted = (blueprint?.blocks ?? []).map((b) => b.block), has = (k) => present(ours, k), missing = wanted.filter((k) => !has(k));
  return { wanted, ours: Object.keys(BLOCKS).filter(has), missing, notBuiltNow: missing.filter((k) => NOT_BUILT_NOW.includes(k)), line: wanted.length ? `The top pages use: ${wanted.map((k) => BLOCKS[k]).join(", ")}. ${missing.length ? `This page lacks: ${missing.map((k) => BLOCKS[k]).join(", ")}.` : "This page has them all."}` : "No top page could be read for its blocks yet." };
}
/** what may be stored from another computer: structure only, never text */
export function cleanBlueprint(b) {
  if (!b || typeof b !== "object") return null;
  const num = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Math.min(1e6, Number(x))) : 0), short = (x) => String(x ?? "").slice(0, 60);
  return { on: /^\d{4}-\d{2}-\d{2}/.test(b.on ?? "") ? String(b.on).slice(0, 10) : null, read: num(b.read), urls: (Array.isArray(b.urls) ? b.urls : []).filter((u) => /^https:\/\//.test(u?.url ?? "")).slice(0, 10).map((u) => ({ url: String(u.url).slice(0, 300), rank: u.rank == null ? null : num(u.rank), official: Boolean(u.official), blocks: { ...Object.fromEntries(Object.keys(BLOCKS).filter((k) => !["table", "steps", "foldouts", "faqs"].includes(k)).map((k) => [k, Boolean(u.blocks?.[k])])), tables: num(u.blocks?.tables), steps: num(u.blocks?.steps), foldouts: num(u.blocks?.foldouts), faqs: num(u.blocks?.faqs), words: num(u.blocks?.words), columns: (Array.isArray(u.blocks?.columns) ? u.blocks.columns : []).slice(0, 3).map((c) => (Array.isArray(c) ? c.slice(0, 8).map(short) : [])) } })), blocks: (Array.isArray(b.blocks) ? b.blocks : []).filter((x) => BLOCKS[x?.block]).map((x) => ({ block: x.block, why: short(x.why) })), faqs: num(b.faqs), words: num(b.words), year: Boolean(b.year) };
}
