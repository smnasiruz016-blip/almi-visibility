/**
 * 🔴 F70 · THE DOWNLOADABLE EVIDENCE REPORT (acceptance _handoffs AlmiVisibility_F70_ACCEPTANCE_2026-10-19.md, RR-291) — and F71's lead box,
 * F72's branding (acceptances F71/F72_ACCEPTANCE_2026-10-19.md).
 *
 * One static HTML file from a stored score run (src/report/visibility-score.mjs): headings in order (h1 → h2 → h3, none skipped), every table
 * with a header row, alt text on every image (there is none), and every finding with its evidence id. Bad findings and anything NOT MEASURED
 * come first. No script, no outside resource, nothing fetched.
 *   F71 · the lead box is OFF by default; when the client turns it on it is a form whose consent box is UNTICKED; the score is computed before
 *         and apart from it — the box never changes a number.
 *   F72 · branding changes only the name shown and two colours; the evidence and method lines are the same bytes either way.
 * Pure. Generic: it names no client, product or host.
 */
export const DEFAULT_BRAND = Object.freeze({ name: "AlmiVisibility", primary: "#1f3a5f", accent: "#2f6f4f" });
export const LEAD_DEFAULT = Object.freeze({ enabled: false });
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const COLOUR = /^#[0-9a-f]{6}$/i;

/** F72 · a brand: only a name and two colours; anything else is refused. */
export function brandOf(b) {
  if (b == null) return DEFAULT_BRAND;
  const extra = Object.keys(b).filter((k) => !["name", "primary", "accent"].includes(k));
  if (extra.length) throw new TypeError(`a brand changes only its name and two colours — refused: ${extra.join(", ")}`);
  if (typeof b.name !== "string" || b.name.trim() === "" || !COLOUR.test(b.primary ?? "") || !COLOUR.test(b.accent ?? "")) throw new TypeError("a brand needs a name and two #rrggbb colours");
  return Object.freeze({ name: b.name.trim(), primary: b.primary, accent: b.accent });
}

/** The evidence and method lines — built from the run alone, never from the brand or the lead setting. */
export function evidenceSection(run, findings) {
  const rows = findings.map((f) => `<tr><td>${esc(f.url)}</td><td>${esc(f.check)}</td><td>${f.weight}</td><td>${esc(f.finding)}</td><td>${esc(f.action)}</td><td><code>${esc(f.evidenceId)}</code></td></tr>`).join("\n");
  const nm = run.notMeasured.map((x) => `<li>${esc(x)}</li>`).join("\n");
  return [
    `<h2 id="bad">Bad findings and what was NOT MEASURED</h2>`,
    `<h3>Findings (${findings.length})</h3>`,
    `<div class="wide"><table><thead><tr><th scope="col">Page</th><th scope="col">Check</th><th scope="col">Weight</th><th scope="col">Finding</th><th scope="col">Next action</th><th scope="col">Evidence id</th></tr></thead><tbody>\n${rows}\n</tbody></table></div>`,
    `<h3>NOT MEASURED (${run.notMeasured.length}) — out of the denominator</h3>`,
    run.notMeasured.length ? `<ul>\n${nm}\n</ul>` : `<p>None.</p>`,
    `<h2 id="score">Score and method</h2>`,
    `<p>Score <strong>${run.score ?? "NOT MEASURED"}</strong> = ${run.numerator} / ${run.denominator}. The denominator is ${esc(run.denominatorRule)}.</p>`,
    `<p>Mode ${esc(run.mode)}: ${run.sampleSize} of ${run.of} page(s)${run.skipped.length ? `; skipped ${run.skipped.length}` : ""}. Evaluated checks: ${run.evaluated}.</p>`,
    `<h3>By category</h3>`,
    `<table><thead><tr><th scope="col">Category</th><th scope="col">Score</th></tr></thead><tbody>${Object.entries(run.byCategory).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v ?? "NOT MEASURED"}</td></tr>`).join("")}</tbody></table>`,
    `<h3>Weights</h3>`,
    `<table><thead><tr><th scope="col">Check</th><th scope="col">Weight</th></tr></thead><tbody>${Object.entries(run.weights).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")}</tbody></table>`,
  ].join("\n");
}

/** F71 · the lead box, only when the client turned it on: a consent box that is NOT ticked. Never touches the score. */
export function leadSection(lead = LEAD_DEFAULT) {
  if (lead?.enabled !== true) return "";
  return [`<h2 id="deeper">Ask for a deeper check</h2>`, `<form method="post" action="${esc(lead.action ?? "#")}"><p><label>Email <input type="email" name="email"></label></p>`, `<p><label><input type="checkbox" name="consent" value="yes"> I agree to be contacted about this report.</label></p>`, `<p><button type="submit">Send</button></p></form>`].join("\n");
}

/**
 * F71 C3 · a lead submission is kept only WITH its consent record: the box ticked by the person, the words they agreed to, and when. Without
 * one it is REFUSED and nothing of it is kept — not the address, not a part of it.
 */
export function admitLeadSubmission(s) {
  const c = s?.consent;
  const ok = c && c.ticked === true && typeof c.text === "string" && c.text.trim() !== "" && typeof c.at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(c.at);
  if (!ok) return Object.freeze({ state: "REFUSED", reason: "NO_CONSENT_RECORD", kept: null });
  return Object.freeze({ state: "ACCEPTED", kept: Object.freeze({ contact: String(s.contact ?? ""), consent: Object.freeze({ ticked: true, text: c.text, at: c.at }) }) });
}

/** F70 · the whole file. */
export function renderReport({ title, run, findings, brand = null, lead = LEAD_DEFAULT, on }) {
  const b = brandOf(brand);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(b.name)}</title>
<style>body{font-family:system-ui,sans-serif;margin:16px;max-width:72rem;color:#111;background:#fff;line-height:1.45}h1,h2{color:${b.primary}}h3{color:${b.accent}}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top;overflow-wrap:anywhere}.wide{overflow-x:auto}code{overflow-wrap:anywhere}</style>
</head>
<body>
<header><p>${esc(b.name)} · report of ${esc(on)}</p></header>
<main>
<h1>${esc(title)}</h1>
${evidenceSection(run, findings)}
${leadSection(lead)}
</main>
</body>
</html>
`;
}

/** F70 C1 · the accessibility rules, checked on a rendered file: headings in order, a header row in every table, alt on every image. */
export function accessibilityFaults(html) {
  const faults = [];
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  levels.forEach((l, i) => { if (i === 0 ? l !== 1 : l > levels[i - 1] + 1) faults.push(`heading h${l} skips a level`); });
  for (const t of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) if (!/<thead>[\s\S]*?<th\b/i.test(t)) faults.push("a table without a header row");
  for (const i of html.match(/<img\b[^>]*>/gi) ?? []) if (!/\balt=/i.test(i)) faults.push("an image without alt text");
  return faults;
}
