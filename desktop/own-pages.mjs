/**
 * 🔴 RR-388 PART A · A PRODUCT'S OWN SUBJECT PAGES ("eat our own cooking"): the pages people search before they buy what the product sells
 * (for AlmiVisibility: what each kind of SEO is and how to do it, checklists, and comparisons with the tools buyers weigh). Generic: the pages
 * are DATA in lists/own-pages.json, keyed by the product's own site; no product is named in this code.
 *   · Each answer was written from its owner's own page (Google, Apple, Google Play, OpenAI, each competitor's own pricing page) and judged
 *     PASS by the real truth pass on that WHOLE page before it was listed (the proof file is named in the list). It enters the plan marked
 *     judged (filled), so the truth pass does not pay for it again; the fit check holds it as passed.
 *   · A line about the product itself is the product's own text (Q&A LAW 5A.5), from its own site: shown as its own product text.
 *   · The pages then go through the same pipeline as every other: the gate (fewer than 6 real Q&A → noindex), the canonical, the FAQ data
 *     equal to the visible Q&A, the product's button, the site scan.
 */
import { readFileSync } from "node:fs";

const LIST = (() => { try { return JSON.parse(readFileSync(new URL("./lists/own-pages.json", import.meta.url), "utf8")); } catch { return { sites: {} }; } })();
const hostOf = (u) => { try { return new URL(/^https?:/.test(String(u)) ? String(u) : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** the list's pages for this site, or null */
export const ownPagesFor = (site, list = LIST) => list.sites?.[hostOf(site) ?? ""] ?? null;

/** the plan, in the shape every other plan has (pages → items → claims), or null when the site has none */
export function ownPlanPages({ site, list = LIST }) {
  const mine = ownPagesFor(site, list); if (!mine?.pages?.length) return null;
  const pages = [], notBuilt = [];
  for (const p of mine.pages) {
    const items = (p.items ?? []).map((it, i) => ({ part: `own${i}`, question: it.question, claims: (it.answers ?? []).map((a, j) => { const own = a.ownProduct === true || hostOf(a.link) === hostOf(site); /* a line from the product's own site is its own product text (LAW 5A.5), judged too before it was listed */ return { claimId: `own-${slug(p.title)}-${i}-${j}`, ...(typeof a.card === "string" && a.text.includes(a.card) ? { card: a.card } /* a key fact standing verbatim in the judged sentence */ : {}), text: a.text, link: a.link, readOn: String(a.readOn ?? mine.on ?? "").slice(0, 10), source: a.source ? `${a.source} — its own page` : "its own page", official: !own, ...(own ? { ownProduct: true } : { filled: true /* judged PASS on its whole page before it was listed */ }) }; /* no card is typed in: the writer takes a key fact (a price, a number with its word) from the sourced sentence itself */ }) })).filter((it) => it.claims.length);
    if (!items.length) { notBuilt.push({ title: p.title, why: "no judged answer" }); continue; }
    pages.push({ kind: p.kind ?? "topic", title: p.title, screen: p.screen ?? null, questions: items.map((it) => ({ question: it.question, source: "the product's own page plan", on: mine.on ?? null })), items, content: null, open: [], ledger: [], links: [] });
  }
  /* each page links to the others of its kind, and the comparisons to the kinds of SEO */
  for (const p of pages) { p.claims = p.items[0].claims; p.lastChecked = p.items.flatMap((it) => it.claims.map((c) => c.readOn)).filter(Boolean).sort().at(-1) ?? null; p.weak = false; p.links = [...pages.filter((x) => x !== p && x.kind === p.kind), ...pages.filter((x) => x !== p && x.kind !== p.kind)].map((x) => x.title).slice(0, 8); /* its own kind first, then the others: at least 3 internal links */ }
  return { pages, notBuilt, counts: { own: pages.length }, skipped: [], existing: [], fromOwnList: true, proof: mine.proof ?? null };
}
