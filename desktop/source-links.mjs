/**
 * 🔴 RR-370 items 4, 7, 9 (beta-g, 4 Nov 2026: a rule linked to ahpra.gov.au/Error/500.aspx; the fee linked to the OET@Home page; "I found no…" on a page). EVERY SOURCE LINK MUST OPEN A REAL PAGE, and every claim must cite the page that says it. The corrections read from a list (checked by hand, with their date) apply to every page; every address in the page set is then opened once a month, and a broken one is replaced or its claim taken off. A site that refuses a robot (403) is said as not checked, never as broken. Pure but for the fetch handed in.
 */
import { readFileSync } from "node:fs";
export const LINKS_FILE = "source-links.json";
export const LINK_RULE = Object.freeze({ keepDays: 30, side: 8, timeoutMs: 20000 });
export const CORRECTIONS = Object.freeze(JSON.parse(readFileSync(new URL("./lists/fact-corrections.json", import.meta.url), "utf8")));
const ERROR_PAGE = /\/(?:error|errors)\/|\/404(?:[./?]|$)|\/500(?:[./?]|$)|[?&]aspxerrorpath=|\/not-?found/i;
export const errorAddress = (u) => ERROR_PAGE.test(String(u ?? ""));
/** what one address answered → ok | broken | unchecked */
export async function checkLink(url, { fetchImpl = fetch, timeoutMs = LINK_RULE.timeoutMs } = {}) {
  if (errorAddress(url)) return { state: "broken", why: "its address is an error page" };
  let r; try { r = await fetchImpl(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": "Mozilla/5.0 (compatible; AlmiVisibility link check)", accept: "text/html,application/pdf,*/*" } }); } catch { return { state: "unchecked", why: "it did not answer in time" }; }
  try { r.body?.cancel?.(); } catch { /* nothing to free */ }
  if (errorAddress(r.url)) return { state: "broken", why: `it leads to an error page (${r.url})` };
  if (r.status === 404 || r.status === 410) return { state: "broken", why: `it answered ${r.status}` };
  if (r.status >= 500) return { state: "unchecked", why: `it answered ${r.status}` };
  if (r.status === 401 || r.status === 403 || r.status === 429) return { state: "unchecked", why: `it refuses automatic readers (${r.status})` };
  return r.ok ? { state: "ok", final: r.url && r.url !== url ? r.url : undefined } : { state: "unchecked", why: `it answered ${r.status}` };
}
export const claimsOf = (plan) => (plan.pages ?? []).flatMap((p) => (p.items ?? []).flatMap((it) => it.claims ?? []));
/** the addresses not checked within the month */
export function linksToCheck(plan, kept = {}, { now = new Date().toISOString() } = {}) { const fresh = (u) => kept[u] && (Date.parse(now) - Date.parse(kept[u].on)) / 864e5 <= LINK_RULE.keepDays; return [...new Set(claimsOf(plan).map((c) => c.link).filter((u) => /^https?:/.test(u ?? "")))].filter((u) => !fresh(u)); }
export async function checkLinks(urls, { kept = {}, now = new Date().toISOString(), fetchImpl = fetch, side = LINK_RULE.side, onDone = () => {}, timeoutMs = LINK_RULE.timeoutMs } = {}) { let at = 0; await Promise.all(Array.from({ length: side }, async () => { while (at < urls.length) { const u = urls[at++]; kept[u] = { on: now, ...(await checkLink(u, { fetchImpl, timeoutMs })) }; onDone(u); } })); return kept; }
/* 🔴 item 7: a page speaks in the third person, whoever wrote the fact */
const FIRST_PERSON = [[/\bI found no\b/g, "the pages checked show no"], [/\bI found\b/g, "the pages checked show"], [/\bI could not\b/g, "it was not possible to"], [/\bI cannot\b/g, "it is not possible to"], [/\bI did not find\b/g, "the pages checked do not show"], [/\bI would (?:recommend|suggest)\b/g, "it is worth"], [/\bI recommend\b/g, "it is worth"]];
export const firstPersonIn = (t) => /(?:^|[\s(,;:.])I(?:'m|'ve|'d)?\s+(?:am|was|have|had|found|could|can|cannot|did|do|would|will|think|recommend|suggest|see|checked|looked|believe|know)\b/.test(String(t ?? ""));
export const thirdPerson = (t) => FIRST_PERSON.reduce((s, [re, to]) => s.replace(re, to), String(t ?? ""));
/**
 * The corrections and the checks applied to every claim of the plan. → { changed: [{ page, text, link, to, why }], removed: [...] }
 * corrections.text: wrong words → the checked words and their page · corrections.cite: a claim holding these words is cited to that document · corrections.links: an address → the right one
 */
export function applySources(plan, { corrections = CORRECTIONS, checks = {} } = {}) {
  const changed = [], removed = [];
  for (const p of plan.pages ?? []) { const items = [];
    for (const it of p.items ?? []) { const keep = [];
      for (const c0 of it.claims ?? []) { let c = c0;
        const to = (patch, why) => { changed.push({ page: p.title, text: String(c.text).slice(0, 120), link: c.link, to: patch.link ?? c.link, why }); c = { ...c, ...patch }; };
        for (const r of corrections.text ?? []) if (String(c.text).includes(r.has)) to({ text: r.to, link: r.link, readOn: r.on, source: `${r.source} — its official page`, intent: r.intent ?? c.intent, card: null }, r.why);
        for (const r of corrections.cite ?? []) if (String(c.text).includes(r.has) && c.link !== r.link) to({ link: r.link, readOn: r.on, source: r.source }, r.why);
        for (const r of corrections.links ?? []) if (String(c.link ?? "").includes(r.from) && (!r.textHas || String(c.text).includes(r.textHas))) to({ link: r.to, readOn: r.on, source: `${r.source} — its official page` }, r.why);
        if (firstPersonIn(c.text)) { const t = thirdPerson(c.text); if (t !== c.text) c = { ...c, text: t }; if (firstPersonIn(c.text)) { removed.push({ page: p.title, text: String(c.text).slice(0, 160), link: c.link, why: "it speaks as \"I\"" }); continue; } }
        const k = checks[c.link]; if (k?.state === "broken" || errorAddress(c.link)) { removed.push({ page: p.title, text: String(c.text).slice(0, 160), link: c.link, why: k?.why ?? "its address is an error page" }); continue; }
        keep.push(c); }
      if (keep.length) items.push({ ...it, claims: keep }); else if (!(it.claims ?? []).length) items.push(it); }
    p.items = items; }
  return { changed, removed };
}
/** the file beta-g reads */
export function linksText({ checks = {}, plan, on }) { const uses = new Map(); for (const p of plan.pages ?? []) for (const it of p.items ?? []) for (const c of it.claims ?? []) if (c.link) uses.set(c.link, (uses.get(c.link) ?? 0) + 1); const rows = [...uses].map(([u, n]) => ({ u, n, k: checks[u] ?? { state: "not checked yet" } })), by = (s) => rows.filter((r) => r.k.state === s), line = (r) => `  ${r.u}  (on ${r.n} answers)${r.k.why ? `: ${r.k.why}` : ""}${r.k.final ? ` → ${r.k.final}` : ""}`; return [`Source links checked, ${on}. ${rows.length} addresses in the page set: opens ${by("ok").length}, broken ${by("broken").length}, a site that would not let the check in ${by("unchecked").length}, not checked yet ${by("not checked yet").length}.`, "", "BROKEN (none of these may remain):", ...by("broken").map(line), "", "COULD NOT BE CHECKED BY A ROBOT (not called broken; open in a browser):", ...by("unchecked").map(line), "", "OPENS:", ...by("ok").map(line), ""].join("\n"); }
