/**
 * v0.1 ITEM 7 — THE MINIMUM REPORT VIEW. ONE PAGE. READ-ONLY.
 *
 * ── 🔴 WHAT IT IS NOT ───────────────────────────────────────────────────────
 *
 * Not a dashboard. V5.1 §62 excludes any dashboard beyond one report page, and
 * this is that one page: static HTML generated from the evidence store, no
 * server, no framework, no build step, **no action of any kind**. There is no
 * form, no button, no fetch, no write path. If a future action engine needs a
 * button it gets its own PR and its own gate.
 *
 * ── 🔴 LAW-BOUND-1 APPLIES TO A SCREEN EXACTLY AS TO A FILE ─────────────────
 *
 * A page built from 394 fetched pages of a 1,497 pool on a 240,328-URL site
 * must say those numbers AND say PARTIAL, at the top, in the reader's first
 * screenful. Not in a footnote, not on hover. A screen that can drop its own
 * coverage state is the same defect as a report that can — and worse, because
 * a screen looks authoritative.
 */

import { labelFor, labelCensus, LABELS } from "./provenance-label.mjs";

const esc = (s) =>
  String(s ?? "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;");

/** 🔴 A null renders as an em dash. Never 0, never blank-so-it-looks-like-zero. */
const cell = (v) => (v === null || v === undefined ? '<span class="null" title="not measured">—</span>' : esc(v));

/**
 * Gather everything the page states about itself.
 *
 * Returns `null` fields rather than guesses when a record is absent, so the
 * page can say UNKNOWN instead of printing a confident blank.
 */
export function summarise({ crawlRecords = [], evidenceRecords = [], facts = [] }) {
  const runs = crawlRecords.filter((r) => r.record_type === "crawl_run");
  const liveRun = runs.filter((r) => r.urlsFetched > 0).at(-1) ?? null;
  const correction = crawlRecords.find((r) => r.record_type === "crawl_run_correction") ?? null;
  const obs = crawlRecords.filter((r) => r.record_type === "observation");
  const pages = crawlRecords.filter((r) => r.record_type === "page");

  const byPage = evidenceRecords
    .filter((r) => r.record_type === "observation" && r.method === "gsc.searchAnalytics.query:by-page")
    .at(-1) ?? null;
  const evObs = evidenceRecords.filter((r) => r.record_type === "observation");
  const evResightings = evidenceRecords.filter((r) => r.record_type === "resighting");

  /* 🔴 The corrected value wins on the page, and BOTH are shown. Displaying only
   * the corrected one would hide that we got it wrong; displaying only the
   * recorded one would repeat the error. */
  const coverageState = correction?.corrected_value ?? liveRun?.coverageState ?? "UNKNOWN";

  return {
    liveRun,
    correction,
    coverageState,
    recordedCoverageState: liveRun?.coverageState ?? null,
    observations: obs.length,
    fetched: obs.filter((o) => !o.value?.skipped).length,
    disallowed: obs.filter((o) => o.value?.skipped).length,
    pages: pages.length,
    seedPoolSize: liveRun?.seedPoolSize ?? null,
    searchRowCount: byPage?.value?.rowCount ?? null,
    evidenceObservations: evObs.length,
    evidenceResightings: evResightings.length,
    facts,
    labelCensus: labelCensus([...crawlRecords, ...evidenceRecords, ...facts]),
  };
}

/**
 * 🔴 THE RECONCILIATION (A2f). 500 observations, 495 pages — where did 5 go?
 *
 * Numbers that do not add up are the thing this product exists to catch, so the
 * page does the arithmetic out loud rather than leaving the reader to guess.
 */
export function reconcile(crawlRecords) {
  const obs = crawlRecords.filter((r) => r.record_type === "observation");
  const pages = crawlRecords.filter((r) => r.record_type === "page");
  const byPageId = new Map();
  for (const p of pages) byPageId.set(p.page_id, p);

  const folded = [];
  for (const p of pages) {
    if ((p.observations?.length ?? 0) > 1) {
      const members = obs.filter((o) => p.observations.includes(o.observation_id));
      folded.push({
        page_id: p.page_id,
        canonical_url: p.canonical_url,
        requested: members.map((m) => m.value.requested_url),
      });
    }
  }
  const surplus = folded.reduce((n, f) => n + f.requested.length - 1, 0);
  return {
    observations: obs.length,
    pages: pages.length,
    folded,
    surplus,
    balances: obs.length - surplus === pages.length,
  };
}

function labelBadge(record) {
  const { label, why } = labelFor(record);
  // 🔴 ON ITS FACE. The title attribute carries the REASON, but the LABEL ITSELF
  // is rendered text — a tooltip is not "visible where the value is".
  return `<span class="lbl lbl-${label}" title="${esc(why)}">${label}</span>`;
}

export function renderHeader(s) {
  const pct = s.seedPoolSize && s.fetched ? ((s.fetched / s.seedPoolSize) * 100).toFixed(1) : null;
  const run = s.liveRun;
  return `
<header class="banner banner-${esc(s.coverageState)}">
  <h1>AlmiVisibility — evidence</h1>
  <p class="state">COVERAGE: <strong>${esc(s.coverageState)}</strong></p>
  <p class="lede">
    <strong>${cell(s.fetched)}</strong> pages fetched, of <strong>${cell(s.observations)}</strong> requested,
    selected from a pool of <strong>${cell(s.seedPoolSize)}</strong> pages with any search presence,
    on a property whose sitemap carries <strong>~240,328</strong> URLs.
    <strong>${cell(s.disallowed)}</strong> were disallowed by robots.txt and never fetched.
  </p>
  ${pct ? `<p class="lede">That is <strong>${pct}%</strong> of the seed pool and well under 1% of the site.</p>` : ""}
  ${
    s.recordedCoverageState && s.recordedCoverageState !== s.coverageState
      ? `<p class="correction">🔴 The run RECORDED <code>${esc(s.recordedCoverageState)}</code>. That was wrong and is
         corrected to <code>${esc(s.coverageState)}</code> by an appended correction record — the original is not edited.</p>`
      : ""
  }
  <table class="bounds">
    <caption>Bounds that shaped everything below (LAW-BOUND-1)</caption>
    <tbody>
      <tr><th>maxUrlsPerRun</th><td>${cell(run?.maxUrlsPerRun)}</td></tr>
      <tr><th>maxRequestsPerHost</th><td>${cell(run?.maxRequestsPerHost)}</td></tr>
      <tr><th>maxResponseBytes</th><td>${cell(run?.maxResponseBytes)}</td></tr>
      <tr><th>seed pool</th><td>${cell(s.seedPoolSize)}</td></tr>
      <tr><th>selection rule</th><td><code>${cell(run?.selectionRule)}</code></td></tr>
      <tr><th>Search Console rows</th><td>${cell(s.searchRowCount)}</td></tr>
    </tbody>
  </table>
  <p class="invariant">🔴 A FETCHED URL IS NOT AN INDEXED URL. A CRAWLED INVENTORY IS NOT THE SITE.</p>
</header>`;
}

export function renderReconciliation(rec) {
  const rows = rec.folded
    .map(
      (f) => `<tr>
        <td><code>${esc(f.page_id)}</code></td>
        <td class="wrap">${f.requested.map((u) => `<code>${esc(u)}</code>`).join("<br>")}</td>
        <td class="wrap"><code>${esc(f.canonical_url)}</code></td>
      </tr>`,
    )
    .join("\n");
  return `
<section id="reconciliation">
  <h2>Reconciliation — why ${rec.observations} observations became ${rec.pages} pages</h2>
  <p class="sum ${rec.balances ? "ok" : "bad"}">
    ${rec.observations} observations − ${rec.surplus} folded = <strong>${rec.observations - rec.surplus}</strong> pages
    ${rec.balances ? "✅ balances" : "🔴 DOES NOT BALANCE"}
  </p>
  <p>Each pair below is two seed URLs that <strong>redirected to the same final URL</strong>, so they share one
  <code>page_id</code>. Nothing was lost and nothing was invented.</p>
  <table>
    <thead><tr><th>page_id</th><th>requested (from Search Console)</th><th>final URL</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

export function renderRecords(records, { title, limit = 50 }) {
  const shown = records.slice(0, limit);
  const rows = shown
    .map(
      (r) => `<tr>
      <td>${labelBadge(r)}</td>
      <td><code>${esc(r.record_type)}</code></td>
      <td class="wrap">${esc(r.method ?? r.canonical_url ?? r.run_id ?? r.id ?? "")}</td>
      <td><code>${esc(r.observation_id ?? r.page_id ?? r.run_id ?? "")}</code></td>
      <td>${cell(r.observed_at ?? r.seen_at ?? r.built_at ?? r.corrected_at ?? null)}</td>
    </tr>`,
    )
    .join("\n");
  return `
<section>
  <h2>${esc(title)}</h2>
  <p class="bound">Showing <strong>${shown.length}</strong> of <strong>${records.length}</strong>
  [bound: limit=${limit}]${records.length > limit ? " — <strong>TRUNCATED</strong>, this list is not the whole set" : ""}</p>
  <table>
    <thead><tr><th>label</th><th>type</th><th>what</th><th>id</th><th>when</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

export function renderFacts(facts) {
  const rows = facts
    .map(
      (f) => `<tr>
      <td>${labelBadge(f)}</td>
      <td class="wrap"><code>${esc(f.id)}</code></td>
      <td><strong class="vs vs-${esc(f.verificationState)}">${esc(f.verificationState)}</strong></td>
      <td>${cell(f.checks?.factCheckedOn)}</td>
      <td>${cell(f.source?.tier)}</td>
    </tr>`,
    )
    .join("\n");
  const unverified = facts.filter((f) => f.verificationState === "UNVERIFIED").length;
  return `
<section id="facts">
  <h2>Verified fact registry — ${facts.length} records</h2>
  <p class="sum bad">🔴 <strong>${unverified} of ${facts.length}</strong> are <strong>UNVERIFIED</strong>.
  They keep their values and their sources; nobody has fact-checked them, and no date was backfilled.</p>
  <table>
    <thead><tr><th>label</th><th>id</th><th>verificationState</th><th>factCheckedOn</th><th>tier</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

/**
 * 🔴 THE ISSUE CHAIN — AND WHAT THE PAGE SAYS WHEN THERE IS NONE.
 *
 * An issue must be able to show its evidence back to observations and sources.
 * There are no issues, because no detector exists (C5). The page says that
 * outright: an empty section with no explanation reads as "this feature is
 * missing", and a bare claim with no chain would be worse.
 */
export function renderIssues(issues, allRecords) {
  if (issues.length === 0) {
    return `
<section id="issues">
  <h2>Issues — none</h2>
  <p class="sum">There are <strong>0</strong> issues, and that is not a measurement of health.
  <strong>No detector exists in v0.1</strong> (constraint C5): nothing has ever judged a page, so nothing
  could have raised an issue. An empty list here means the shelf is built and nothing has been put on it.</p>
</section>`;
  }
  const byId = new Map(allRecords.map((r) => [r.observation_id ?? r.source_id, r]));
  const rows = issues
    .map((i) => {
      const chain = (i.evidence ?? []).map((id) => (byId.has(id) ? `<code>${esc(id)}</code>` : `<span class="bad">🔴 ${esc(id)} — NOT IN THIS STORE</span>`));
      const broken = (i.evidence ?? []).some((id) => !byId.has(id));
      return `<tr>
        <td>${labelBadge(i)}</td>
        <td><code>${esc(i.issue_id)}</code></td>
        <td>${esc(i.verdict)}</td>
        <td class="wrap">${chain.length ? chain.join("<br>") : '<span class="bad">🔴 NO EVIDENCE — this claim cannot show its chain</span>'}
        ${broken ? '<br><span class="bad">🔴 the chain is BROKEN: an evidence id is not in this store</span>' : ""}</td>
      </tr>`;
    })
    .join("\n");
  return `<section id="issues"><h2>Issues — ${issues.length}</h2>
  <table><thead><tr><th>label</th><th>id</th><th>verdict</th><th>evidence chain</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

/**
 * 🔴 ITEM 49 — ONE CONCLUSION WALKED END TO END: what, why, from which
 * evidence, when, and what changed it. Each part is shown as the store
 * supplies it, and a part the store cannot supply is shown as MISSING.
 */
export function renderChainWalk(walk) {
  if (!walk) {
    return `<section id="chain"><h2>A conclusion, walked end to end — none</h2>
  <p class="sum bad">🔴 No stored conclusion has ever left OPEN, so no chain can show what changed it.</p></section>`;
  }
  const ok = (b) => (b ? "✅ present" : '<span class="bad">🔴 MISSING</span>');
  const ev = (list) => list.map((e) => (e.found ? `<code>${esc(e.id)}</code> ${esc(e.method)} · ${esc(e.target ?? "")} · ${esc(e.observed_at)}` : `<span class="bad">🔴 ${esc(e.id)} — NOT IN THESE STORES</span>`)).join("<br>");
  const changes = walk.changedBy.map((c) => `
      <p><strong>→ ${esc(c.to)}</strong> by <code>${esc(c.action)}</code> (${esc(c.actor)})</p>
      <p class="wrap">${esc(c.reason)}</p>
      <p>evidence for the move:<br>${ev(c.evidence)}</p>
      ${c.replacement ? `<p>replaced by <code>${esc(c.replacement.issue_id)}</code> — verdict <strong>${esc(c.replacement.verdict)}</strong>, ${esc(c.replacement.detector)} v${esc(c.replacement.detector_version)}<br><span class="wrap">${esc(c.replacement.reason ?? "")}</span></p>` : ""}`).join("");
  return `
<section id="chain">
  <h2>A conclusion, walked end to end — <code>${esc(walk.issue_id)}</code> · now ${esc(walk.state)}</h2>
  <table class="bounds"><tbody>
    <tr><th>WHAT ${ok(walk.present.what)}</th><td>${esc(walk.what.issue_class)} on page <code>${esc(walk.what.target_page_id)}</code> — ${esc(walk.what.summary ?? "")}</td></tr>
    <tr><th>WHY ${ok(walk.present.why)}</th><td>verdict ${esc(walk.why.verdict)} by detector <code>${esc(walk.why.detector)}</code> v${esc(walk.why.detector_version)} — ${esc(walk.why.reason ?? "")}</td></tr>
    <tr><th>FROM WHICH EVIDENCE ${ok(walk.present.evidence)}</th><td class="wrap">${ev(walk.evidence)}</td></tr>
    <tr><th>WHEN ${ok(walk.present.when)}</th><td>opened ${esc(walk.when.opened_at)}${walk.when.moves.map((m) => `; → ${esc(m.to)} ${esc(m.at)}`).join("")}</td></tr>
    <tr><th>WHAT CHANGED IT ${ok(walk.present.changedBy)}</th><td class="wrap">${changes || '<span class="bad">🔴 nothing has changed it</span>'}</td></tr>
  </tbody></table>
  <p class="bound">The original record is unchanged in the store; the move is a second record. The store holds this issue_id ${esc(walk.copies)} time(s).</p>
</section>`;
}

/** 🔴 ITEM 49 / §623 — the source-tier layer ordering REAL records. */
export function renderSourceTiers(ranked, census) {
  const rows = ranked
    .map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.source_tier)}</td><td><code>${esc(s.source_id)}</code></td><td>${esc(s.publisher ?? "")}</td><td>${esc(s.retrieved_at)}</td></tr>`)
    .join("\n");
  return `
<section id="source-tiers">
  <h2>Sources, ranked by the §623 tier order — ${ranked.length} real records</h2>
  <p class="bound">[bound: tier census ${Object.entries(census).map(([k, v]) => `${esc(k)}=${v}`).join(" · ")}; equal tiers keep their input order — the rule states no preference between them]</p>
  <table><thead><tr><th>#</th><th>tier</th><th>source</th><th>publisher</th><th>retrieved</th></tr></thead><tbody>${rows}</tbody></table>
</section>`;
}

/** 🔴 ITEM 45 — the cost ledger, every line with the bound that shaped it. */
export function renderLedger(lines, failures) {
  return `
<section id="ledger">
  <h2>Cost ledger — ${lines.length} entries</h2>
  <pre class="wrap">${lines.map(esc).join("\n")}</pre>
  <p class="${failures.length ? "sum bad" : "sum ok"}">UNKNOWN although measurable: <strong>${failures.length}</strong>${failures.length ? ` — ${failures.map((f) => `${esc(f.entry_id)} · ${esc(f.part)}`).join("; ")}` : ""}</p>
</section>`;
}

/**
 * 🔴 ITEM 51 — A RECOMMENDATION, WITH ALL SIX THINGS THE OWNER MUST BE ABLE TO INSPECT.
 * Priority, confidence and cost come from src/report/recommendation-fields.mjs,
 * each computed from stored evidence and each shown as UNKNOWN, with its reason,
 * when its inputs are missing. Nothing here chooses a number.
 */
export function renderRecommendations(fields) {
  if (!fields?.length) return "";
  const show = (v) => {
    if (!v) return '<span class="bad">🔴 MISSING</span>';
    if (v.state === "UNKNOWN") return `<span class="lbl lbl-UNKNOWN">UNKNOWN</span> ${esc(v.reason)}${v.lowerBound !== undefined ? ` (at least ${esc(v.lowerBound)} measured)` : ""}`;
    return null;
  };
  /* 🔴 ROW 60 — beside the rank: its BASIS, the consequence register entries that applied, and the consequence-weighted
   * rank, which is UNKNOWN for as long as any applied class is UNCLASSIFIED. Never a level the register does not declare. */
  const consequence = (p) => {
    if (!p?.consequence) return "";
    const entries = p.consequence.entries.length
      ? p.consequence.entries.map((e) => `<code>${esc(e.issue_class)}</code> = <strong>${esc(e.level ?? "none")}</strong>`).join(" · ")
      : "none — no finding class is linked";
    const state = p.consequence.state === "UNKNOWN" ? `<span class="lbl lbl-UNKNOWN">UNKNOWN</span> ${esc(p.consequence.reason)}` : "DECLARED";
    return `<br>basis: <strong>${esc(p.basisKind)}</strong><br>consequence register entries: ${entries}<br>consequence: ${state}<br>consequence-weighted rank: <span class="lbl lbl-UNKNOWN">UNKNOWN</span> <span class="bound">${esc(p.consequenceWeightedRank?.reason ?? "")}</span>`;
  };
  const priority = (p) => (show(p) ?? `<strong>${esc(p.rank)} of ${esc(p.of)}</strong><br><span class="bound">${esc(p.basis)}</span>`) + consequence(p);
  const confidence = (c) =>
    show(c) ??
    `weakest source tier <strong>${esc(c.weakestTier)}</strong><br><span class="bound">tiers ${Object.entries(c.tierCensus).map(([k, v]) => `${esc(k)}=${v}`).join(" · ")} · evidence resolved ${esc(c.evidenceResolved)} · issues UNKNOWN ${esc(c.issuesUnknown)} · pulls incomplete ${esc(c.pullsIncomplete)}</span>`;
  const part = (label, v, unit = "") => `${label}: ${v.state === "MEASURED" ? `<strong>${esc(v.value)}${unit}</strong>` : show(v)}`;
  const cost = (c) =>
    `<strong>of the evidence</strong> (ledger ${c.ofEvidence.ledgerEntries.length ? c.ofEvidence.ledgerEntries.map((e) => `<code>${esc(e)}</code>`).join(", ") : "none"}):<br>` +
    `${part("money", c.ofEvidence.money, " USD")}<br>${part("provider calls", c.ofEvidence.providerCalls)}<br>${part("founder time", c.ofEvidence.founderSeconds, " s")}<br>` +
    `<strong>to carry it out:</strong> ${show(c.toApply)}`;
  const rows = fields
    .map(
      (f) => `<tr>
      <td><span class="lbl lbl-RECOMMENDED">RECOMMENDED</span><br><code>${esc(f.recommendation_id)}</code><br>${esc(f.title)}</td>
      <td>${priority(f.priority)}</td>
      <td>${f.evidence.linked ? `${esc(f.evidence.resolved)} of ${esc(f.evidence.linked)} linked records found — ${esc(f.evidence.issues)} issues · ${esc(f.evidence.observations)} observations · ${esc(f.evidence.sources)} sources` : '<span class="bad">🔴 no evidence linked</span>'}</td>
      <td>${confidence(f.confidence)}</td>
      <td class="wrap">${cost(f.cost)}</td>
      <td>${esc(f.status ?? "")}</td>
      <td class="wrap">${esc(f.reason ?? "")}</td>
    </tr>`,
    )
    .join("\n");
  return `
<section id="recommendations">
  <h2>Recommendations — ${fields.length}, each with priority, evidence, confidence, cost, status and reason</h2>
  <p class="bound">Priority, confidence and cost are COMPUTED from stored records, never chosen; each says UNKNOWN, and why, when its inputs are missing. Nothing here is approved or applied.</p>
  <table><thead><tr><th>recommendation</th><th>priority</th><th>evidence</th><th>confidence</th><th>cost</th><th>status</th><th>reason</th></tr></thead><tbody>${rows}</tbody></table>
</section>`;
}

export function renderRunCost(s) {
  const run = s.liveRun;
  return `
<section id="cost">
  <h2>Cost, and the work a repeat run does</h2>
  <table class="bounds"><tbody>
    <tr><th>crawl requests issued</th><td>${cell(run?.requestsIssued)} — <strong>billable traffic on our own account</strong></td></tr>
    <tr><th>crawl cost</th><td>${cell(run?.cost?.amount)} <span class="lbl lbl-UNKNOWN">${cell(run?.cost?.amountState)}</span></td></tr>
    <tr><th>cost basis</th><td class="wrap">${cell(run?.cost?.basis)}</td></tr>
    <tr><th>evidence: new measurements</th><td>${cell(s.evidenceObservations)}</td></tr>
    <tr><th>evidence: re-sightings</th><td>${cell(s.evidenceResightings)}</td></tr>
  </tbody></table>
  <p>🔴 A repeat ingest that adds <strong>0 new</strong> and <strong>N re-sightings</strong> did real work: it
  proved the measurement had not changed. It must not read as an empty run.</p>
</section>`;
}

const CSS = `
:root{--bg:#fff;--fg:#111;--muted:#666;--line:#ddd;--warn:#8a1c1c;--ok:#0a5c2a}
*{box-sizing:border-box}
body{margin:0;padding:1rem;font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--fg);background:var(--bg)}
h1{font-size:1.4rem;margin:0 0 .3rem}
h2{font-size:1.1rem;margin:2rem 0 .5rem;border-bottom:2px solid var(--line);padding-bottom:.25rem}
header.banner{border:3px solid var(--warn);padding:1rem;border-radius:6px;background:#fff8f8}
header.banner-COMPLETE{border-color:var(--ok);background:#f6fff9}
.state{font-size:1.15rem;margin:.2rem 0 .6rem}
.state strong{background:var(--warn);color:#fff;padding:.15rem .5rem;border-radius:4px}
.banner-COMPLETE .state strong{background:var(--ok)}
.lede{margin:.35rem 0}
.correction{margin:.6rem 0;padding:.5rem;background:#fff;border-left:4px solid var(--warn)}
.invariant{margin:.8rem 0 0;font-weight:700;color:var(--warn)}
table{border-collapse:collapse;width:100%;margin:.5rem 0;font-size:.86rem}
caption{text-align:left;font-weight:700;padding:.3rem 0;color:var(--muted)}
th,td{border:1px solid var(--line);padding:.35rem .5rem;text-align:left;vertical-align:top}
th{background:#f6f6f6;font-weight:600}
code{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.wrap{max-width:34rem}
.null{color:var(--muted)}
.sum{padding:.5rem;background:#f6f6f6;border-radius:4px}
.sum.bad{background:#fff1f1;border-left:4px solid var(--warn)}
.sum.ok{background:#f1fff6;border-left:4px solid var(--ok)}
.bad{color:var(--warn);font-weight:600}
.bound{color:var(--muted);font-size:.85rem}
.lbl{display:inline-block;padding:.1rem .4rem;border-radius:3px;font-size:.72rem;font-weight:700;letter-spacing:.02em;white-space:nowrap}
.lbl-OBSERVED{background:#0a5c2a;color:#fff}
.lbl-INFERRED{background:#0b4a8a;color:#fff}
.lbl-RECOMMENDED{background:#7a4b00;color:#fff}
.lbl-UNKNOWN{background:#555;color:#fff}
.vs-UNVERIFIED{color:var(--warn)}
.vs-VERIFIED{color:var(--ok)}
.legend span{margin-right:.5rem}
footer{margin-top:2rem;padding-top:1rem;border-top:2px solid var(--line);color:var(--muted);font-size:.85rem}
@media (max-width:430px){
  body{padding:.6rem;font-size:14px}
  table{font-size:.78rem;display:block;overflow-x:auto}
  .wrap{max-width:none}
  h1{font-size:1.2rem}
}
`;

/** The whole page. Pure — takes records, returns a string. */
export function renderPage({ crawlRecords, evidenceRecords, facts, generatedAt, chainWalk, sourceTiers = null, ledger = null, recommendations = null }) {
  const s = summarise({ crawlRecords, evidenceRecords, facts });
  const rec = reconcile(crawlRecords);
  const issues = [...crawlRecords, ...evidenceRecords].filter((r) => r.record_type === "issue");

  const legend = LABELS.map((l) => `<span class="lbl lbl-${l}">${l}</span>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AlmiVisibility — evidence</title>
<style>${CSS}</style>
</head>
<body>
${renderHeader(s)}

<p class="legend">Every record below carries one of: ${legend}</p>
<p class="bound">Label census across all ${
    crawlRecords.length + evidenceRecords.length + facts.length
  } records: ${LABELS.map((l) => `${l}=${s.labelCensus[l]}`).join(" · ")}</p>

${renderReconciliation(rec)}
${renderRunCost(s)}
${ledger ? renderLedger(ledger.lines, ledger.failures) : ""}
${chainWalk === undefined ? "" : renderChainWalk(chainWalk)}
${recommendations ? renderRecommendations(recommendations) : ""}
${renderIssues(issues, [...crawlRecords, ...evidenceRecords])}
${sourceTiers ? renderSourceTiers(sourceTiers.ranked, sourceTiers.census) : ""}
${renderFacts(facts)}
${renderRecords(evidenceRecords, { title: "Search Console evidence store", limit: 50 })}
${renderRecords(crawlRecords.filter((r) => r.record_type !== "page"), { title: "Crawl records", limit: 50 })}

<footer>
  <p>Generated ${esc(generatedAt)} from the evidence store.</p>
  <p><strong>Read-only</strong> — this page has no action, no form and no write path of any kind.</p>
  <p>🔴 This is one report page, not a dashboard (V5.1 §62). It states what it covers and what it does not.</p>
</footer>
</body>
</html>`;
}
