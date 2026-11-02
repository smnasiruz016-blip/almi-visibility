/**
 * 🔴 RR-363 (owner's item 22) · HOW MANY PEOPLE READ EACH QUESTION, where the subject's official help centre shows it: real demand, ranks a page's questions. Data per subject, never code.
 * OET's help centre builds its lists in the visitor's browser, so Visibility cannot read the counts itself: these are the ones the owner read on 2 Nov 2026, said as such. They rank; they are never a fact on a page.
 */
export const HELP_VIEWS = Object.freeze({
  OET: Object.freeze({ source: "the views OET's help centre showed the owner on 2 Nov 2026", rows: Object.freeze([
    ["How do I see my {S} results?", 420000, "result"], ["Can I defer or reschedule my {S} test, and what does it cost?", 199000, "fee"], ["What ID can I use for {S}?", 155000], ["How much does {S} cost?", 100000, "fee"], ["What special testing arrangements does {S} offer?", 43000], ["Can a refugee or asylum seeker without a passport take {S}?", 8000],
  ]) }),
});
const STOP = new Set(["how", "do", "does", "i", "my", "can", "what", "the", "a", "an", "and", "or", "it", "for", "of", "in", "is", "to", "test", "take"]);
const wordsOf = (t, subject) => new Set(String(t).toLowerCase().replace(/[^a-z ]+/g, " ").split(" ").filter((w) => !STOP.has(w)).map((w) => w.replace(/s$/, "")).filter((w) => w.length > 1 && w !== String(subject).toLowerCase())); /* the small words go before the plural: "does" is not "doe" */
/** the views behind a question: the help-centre row it says the same as (one holds the other's words, or they share two and most of them; "cost" alone is no match); 0 when none */
export function viewsOf(question, subject) {
  const rows = HELP_VIEWS[subject]?.rows ?? [], q = wordsOf(question, subject); if (!q.size) return 0;
  let best = 0;
  for (const [t, v] of rows) { const w = wordsOf(t, subject), both = [...w].filter((x) => q.has(x)).length, holds = both === Math.min(w.size, q.size); if (both && (holds || (both >= 2 && both / Math.min(w.size, q.size) >= 0.6)) && v > best) best = v; }
  return best;
}
/** the help centre's questions as demand evidence (G1) */
export const helpDemand = (subject) => (HELP_VIEWS[subject]?.rows ?? []).filter((r) => r[2]).map(([t, v, topic]) => ({ text: t.replace("{S}", subject), source: `${HELP_VIEWS[subject].source}: ${Math.round(v / 1000)}K`, weight: 8 + Math.log10(v), ranks: topic }));
