/**
 * 🔴 RR-325 C · THE OWNER'S OWN TERMS OF SERVICE AND PRIVACY POLICY — his text EXACTLY, never rewritten.
 * site/legal.generated.json is written ONLY by tools/legal-from-docx.mjs from the owner's Word file (its name and the sha256 of its bytes are
 * inside it): each paragraph's words, its heading level, list items, the table, bold words and links, as the file has them. The file's own
 * preamble (its title line and the note to the owner) is not a page.
 *   · A page that still holds "[FILL" is NOT PUBLISHED: /privacy or /terms answers "not found" until the owner fills it and the file is
 *     read again. A local PREVIEW (never on Vercel) shows it with each [FILL] marked, for the owner's review.
 * Pure functions here; the generator reads the file.
 */
import { readFileSync } from "node:fs";

const dec = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* one paragraph's runs: its words (w:t, tabs, breaks), bold, and the link it sits in */
function runsOf(p, rels) {
  const runs = [];
  const walk = (frag, href) => {
    for (const rm of frag.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
      const r = rm[1], bold = /<w:b\/>|<w:b w:val="(?:1|true)"\/>/.test(r);
      let t = ""; for (const x of r.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) t += x[1] !== undefined ? dec(x[1]) : x[0] === "<w:tab/>" ? "\t" : "\n";
      if (t) { const last = runs.at(-1); if (last && last.bold === bold && last.href === href) last.text += t; else runs.push({ text: t, bold, href }); }
    }
  };
  let last = 0;
  for (const hm of p.matchAll(/<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>/g)) { walk(p.slice(last, hm.index), null); const id = /r:id="([^"]+)"/.exec(hm[1])?.[1]; walk(hm[2], id ? rels[id] ?? null : null); last = hm.index + hm[0].length; }
  walk(p.slice(last), null);
  return runs;
}
const paragraphs = (xml) => [...xml.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((m) => m[1] ?? "");

/** the Word body (document.xml + its relationships) → blocks: { kind: heading|p|li|table, level?, runs | rows } in the file's order */
export function docxBlocks(documentXml, relsXml = "") {
  const rels = Object.fromEntries([...String(relsXml).matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*>/g)].map((m) => [m[1], dec(m[2])]));
  const body = documentXml.slice(documentXml.indexOf("<w:body>"), documentXml.indexOf("</w:body>"));
  const out = [];
  const para = (p) => {
    const runs = runsOf(p, rels); if (!runs.map((r) => r.text).join("").trim()) return;
    const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? "", h = /^(?:Heading|Title)(\d?)$/i.exec(style), list = /<w:numPr>/.test(p);
    out.push(h ? { kind: "heading", level: Number(h[1] || 1), runs } : list ? { kind: "li", runs } : { kind: "p", runs });
  };
  let at = 0;
  for (const tm of body.matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>/g)) {
    for (const p of paragraphs(body.slice(at, tm.index))) para(p);
    const rows = [...tm[1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((r) => [...r[1].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((c) => paragraphs(c[1]).map((p) => runsOf(p, rels)).filter((rs) => rs.length).flat()));
    out.push({ kind: "table", rows });
    at = tm.index + tm[0].length;
  }
  for (const p of paragraphs(body.slice(at))) para(p);
  return out;
}

const textOf = (b) => (b.kind === "table" ? b.rows.flat(2).map((r) => r.text).join(" ") : b.runs.map((r) => r.text).join(""));
/** the blocks → the two pages: each starts at its level-1 heading ("Terms of Service", "Privacy Policy …"); what comes before is the file's preamble */
export function legalPages(blocks) {
  const starts = blocks.map((b, i) => (b.kind === "heading" && b.level === 1 ? i : -1)).filter((i) => i >= 0);
  const page = (re) => { const i = starts.find((s) => re.test(textOf(blocks[s]))); if (i === undefined) return null; const end = starts.find((s) => s > i) ?? blocks.length; return blocks.slice(i, end); };
  return { terms: page(/^Terms of Service\b/i), privacy: page(/^Privacy Policy\b/i) };
}
/** every "[FILL …]" still in a page (the owner fills them; the page is not published until there is none) */
export const fillsIn = (page) => [...new Set((page ?? []).flatMap((b) => [...textOf(b).matchAll(/\[FILL[^\]]*\]/gi)].map((m) => m[0])))];

/** a page's HTML — the owner's words exactly; links as the file has them; in a PREVIEW each [FILL] is marked */
export function renderLegal(page, { preview = false } = {}) {
  const run = (r) => { let t = esc(r.text).replace(/\n/g, "<br>"); if (preview) t = t.replace(/\[FILL[^\]]*\]/gi, (m) => `<mark class="fill">${m}</mark>`); if (r.bold) t = `<b>${t}</b>`; return r.href && /^https:\/\//.test(r.href) ? `<a href="${esc(r.href)}">${t}</a>` : t; };
  const line = (runs) => runs.map(run).join("");
  let html = "", inList = false;
  for (const b of page ?? []) {
    if (b.kind !== "li" && inList) { html += "</ul>"; inList = false; }
    if (b.kind === "heading") html += `<h${Math.min(b.level, 3)}>${line(b.runs)}</h${Math.min(b.level, 3)}>`;
    else if (b.kind === "li") { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${line(b.runs)}</li>`; }
    else if (b.kind === "table") html += `<div class="tablewrap"><table class="legal">${b.rows.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${line(c)}</th>` : `<td>${line(c)}</td>`)).join("")}</tr>`).join("")}</table></div>`;
    else html += `<p>${line(b.runs)}</p>`;
  }
  return inList ? `${html}</ul>` : html;
}

/** the generated file (tools/legal-from-docx.mjs); missing → no page published */
/* 🔴 OWNER'S RULING 3 + 4 (1 Nov 2026): the website does not say where AlmiWorld's data comes from, and the keyword finder is gone. The generated file stays exactly as his Word file
 * made it (its sha256 is pinned); these sentences are changed when the page is shown, until his Word file says the same. The app's own optional connections to a client's OWN account stay named. */
export const OWNER_RULING_LEGAL = Object.freeze([
  ["Keyword searches: when you use the free keyword finder on our website, or AlmiWorld’s keyword service in the app, the words you search are sent to AlmiWorld. We store the searched words and the keyword results, never together with personal data, so the service gets faster and better for everyone. Search volumes come from Google Ads Keyword Planner, through AlmiWorld’s own Google Ads account.", "Research: AlmiWorld researches what people want to know about a subject and uses it to help make your pages. It never holds your personal data together with that research."],
  ["Google Ads (Keyword Planner)", "Google Ads, only if you connect your own account"],
  ["Keyword ideas and search volume ranges", "What your own account shows you"],
  ["Google (YouTube, Search Console, Google Ads keyword data)", "Google (YouTube, Search Console, your own Google Ads account)"],
]);
export const withOwnerRulings = (v) => { if (typeof v === "string") return OWNER_RULING_LEGAL.reduce((t, [a, b]) => t.split(a).join(b), v); if (Array.isArray(v)) return v.map(withOwnerRulings); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "source" ? x : withOwnerRulings(x)])); return v; };
export function loadLegal(url = new URL("./legal.generated.json", import.meta.url)) {
  /* RR-326 F (26 Oct): the owner's Word file now holds the keyword-search words itself — nothing is added here any more */
  try { return withOwnerRulings(JSON.parse(readFileSync(url, "utf8"))); } catch { return { source: null, terms: null, privacy: null }; }
}
