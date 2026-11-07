/**
 * 🔴 RR-388 PART A3 · COMPARISON PAGES ARE SAFE WHEN THE OWNER (OR AUTOPILOT) MAKES THEM. A page that compares the product with other tools
 * ("AlmiVisibility vs Semrush", "… compared with …", "… alternatives") may say a competitor's price or feature ONLY from that company's own
 * page, with its source and date:
 *   · a line that names a competitor stays only when its link is on that competitor's own site (or the product's own site, for our side);
 *     a line about a competitor from anyone else's page (a review site, a blog, an AI summary) is taken out, and said;
 *   · a competitor left with no line from its own page means its page could not be read: that comparison is NOT made (the page goes, said).
 * Applied to every plan before its pages are written, whatever made the plan.
 */
const COMPARE = /\s(?:vs\.?|versus)\s|\bcompared (?:to|with)\b|\balternatives? to\b/i;
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const tokenOf = (name) => String(name).toLowerCase().replace(/\.(?:ai|io|com|app)$/i, "").replace(/[^a-z0-9]+/g, "");
export const isComparison = (title) => COMPARE.test(` ${String(title ?? "")} `);

/** the tools a comparison title names, the product's own name left out */
export function rivalsOf(title, ownName = "") {
  const t = String(title ?? "").replace(/:.*$/, "").replace(/\balternatives? to\b/i, " vs ").replace(/\bcompared (?:to|with)\b/i, " vs ");
  const own = tokenOf(ownName);
  return t.split(/\s(?:vs\.?|versus)\s|,|\band\b/i).map((s) => s.trim()).filter(Boolean).filter((s) => !own || tokenOf(s) !== own).filter((s) => tokenOf(s).length >= 3);
}
const names = (text, rivals) => rivals.filter((r) => new RegExp(`\\b${String(r).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(String(text)));
const onItsOwnSite = (link, rival) => { const h = hostOf(link), k = tokenOf(rival); return Boolean(h && k && h.replace(/[^a-z0-9]/g, "").includes(k)); };

/** the plan, with every comparison page made safe. → { removed: [{ title, question, line, why }], dropped: [{ title, why }] } */
export function guardComparisons(plan, { ownName = "", ownHost = "" } = {}) {
  const removed = [], dropped = [];
  if (!plan?.pages?.length) return { removed, dropped };
  const own = hostOf(/^https?:/.test(ownHost) ? ownHost : `https://${ownHost}`);
  plan.pages = plan.pages.filter((p) => {
    if (!isComparison(p.title)) return true;
    const rivals = rivalsOf(p.title, ownName); if (!rivals.length) return true;
    for (const it of p.items ?? []) it.claims = (it.claims ?? []).filter((c) => {
      const named = names(c.text, rivals); if (!named.length) return true;
      const bad = named.filter((r) => !onItsOwnSite(c.link, r)); /* even our own site may not speak for a competitor */
      if (!bad.length) return true;
      removed.push({ title: p.title, question: it.question, line: String(c.text).slice(0, 160), why: `it says something about ${bad.join(", ")} from a page that is not ${bad.length === 1 ? "its" : "their"} own (${hostOf(c.link) || "no link"})` });
      return false;
    });
    p.items = (p.items ?? []).filter((it) => it.claims.length);
    const unread = rivals.filter((r) => !(p.items ?? []).some((it) => it.claims.some((c) => onItsOwnSite(c.link, r))));
    if (unread.length) { dropped.push({ title: p.title, why: `no comparison: ${unread.join(", ")}'s own page was not read` }); return false; }
    if (p.items[0]) p.claims = p.items[0].claims;
    return true;
  });
  return { removed, dropped };
}
