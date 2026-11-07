/**
 * 🔴 RR-386 · AUTOPILOT ("the client wants to enter his product and go to sleep"). One switch per product: AUTOPILOT or SHOW ME FIRST
 * (today's behaviour; every new product starts there; one press turns autopilot off). One cycle, on a schedule, nobody pressing anything:
 *   1 answers (Q&A LAW §2 ladder, the noindex pages that need the FEWEST answers first; free steps first, paid inside the caps)
 *   2 truth pass on every new line (LAW §4; unchecked lines stay hidden)
 *   3 rebuild what changed (a page that reaches 6 real Q&A loses its noindex by itself)
 *   4 new pages from "topics others have pages on and we do not" (made the same way; noindex until they have enough answers)
 *   5 publish gate (LAW §5B + the RR-385 link guard): what fails is held, with its reason
 *   6 go live by itself (desktop/go-live.mjs: preview → scan → merge → production)
 *   7 live scan (desktop/site-scan.mjs)
 *   8 tell Google and Bing (the sitemap the site really serves; IndexNow where the site allows it; Search Console where connected)
 *   9 report: every cycle saved; once a week a short report naming no data source
 * MONEY (owner rule, notes item 7): before a paid job the WHOLE job's cost is worked out. Show me first: shown once ("This job: about $X.
 * Your limit leaves $Y."). Autopilot: it never starts a part it cannot finish inside the budget — it runs the part that fits and leaves the
 * rest for next month; a job never stops halfway asking for more. The limit is the client's Monthly AI limit; code never raises it.
 * This module is the cycle's ORDER and its record; main.mjs hands in each step (the app's own functions), so the desktop app and the
 * server's runner run the very same cycle.
 */
export const AP_FILE = "autopilot.json", AP_RUNS = "autopilot-runs.json", AP_WEEKLY = "autopilot-weekly.json";
export const MODES = Object.freeze({ AUTO: "autopilot", REVIEW: "review" });
export const EVERY_MS = 24 * 3600 * 1000; // once a day (what the current hosting allows without an upgrade)
export const STEPS = Object.freeze([
  /* new pages are approved FIRST, so this same cycle makes them (the first real proof approved 40 after the pages were made: made only a day later) */
  ["newPages", "New pages"], ["answers", "Find answers"], ["truth", "Check every new line"], ["rebuild", "Rebuild the pages that changed"],
  ["gate", "Publish gate"], ["goLive", "Go live"], ["liveScan", "Scan the live site"], ["engines", "Tell Google and Bing"], ["report", "Report"],
].map(([key, name]) => Object.freeze({ key, name })));

export const apState = (raw) => ({ mode: raw?.mode === MODES.AUTO ? MODES.AUTO : MODES.REVIEW, since: raw?.since ?? null, last: raw?.last ?? null, next: raw?.next ?? null, lease: raw?.lease ?? null, server: raw?.server ?? null });
export const isDue = (st, now = Date.now()) => st.mode === MODES.AUTO && (!st.last?.on || now - Date.parse(st.last.on) >= EVERY_MS - 5 * 60000) && !(st.lease && Date.parse(st.lease.until) > now);

/** the whole job's cost, before it starts: paid parts in order; the parts that fit the budget left, the rest named for next month */
export function costPlan(parts, leftUsd) {
  let left = Math.max(0, Number(leftUsd) || 0); const run = [], later = [];
  for (const p of parts) { const usd = Math.max(0, Number(p.usd) || 0); if (usd === 0 || usd <= left + 1e-9) { run.push(p); left -= usd; } else if (p.divisible && p.unitUsd > 0 && left >= p.unitUsd) { const n = Math.floor(left / p.unitUsd); run.push({ ...p, usd: n * p.unitUsd, units: n, partial: true }); later.push({ ...p, name: `the rest of ${p.name}`, usd: usd - n * p.unitUsd, units: (p.units ?? 0) - n }); left -= n * p.unitUsd; } else later.push(p); }
  const total = parts.reduce((t, p) => t + (Number(p.usd) || 0), 0), runUsd = run.reduce((t, p) => t + (Number(p.usd) || 0), 0);
  return { total: round(total), runUsd: round(runUsd), left: round(leftUsd), run, later, fits: later.length === 0,
    line: `This job: about $${total.toFixed(2)}. Your limit leaves $${Math.max(0, Number(leftUsd) || 0).toFixed(2)}.${later.length ? ` It runs the part that fits now (about $${runUsd.toFixed(2)}); the rest (${later.map((p) => p.name).join(", ")}, about $${round(total - runUsd).toFixed(2)}) waits for next month.` : ""}` };
}
const round = (x) => Math.round((Number(x) || 0) * 10000) / 10000;

/**
 * One cycle. steps: { [key]: async (ctx) => { ok, line, usd?, held?: [{ url, why }], data? } }; estimate: async () => [{ name, usd, divisible?, unitUsd?, units? }];
 * budget: { left } (the Monthly AI limit minus this month's spend); approved: the client's one yes (Show me first) — Autopilot needs none.
 */
export async function runCycle({ mode, steps, estimate, budget, approved = false, save = () => {}, now = () => Date.now(), where = "app" }) {
  const cycle = { on: new Date(now()).toISOString(), where, mode, steps: [], usd: 0 };
  const cost = costPlan(await estimate().catch(() => []), budget.left); cycle.cost = { total: cost.total, run: cost.runUsd, left: cost.left, line: cost.line, later: cost.later.map((p) => p.name) };
  if (mode !== MODES.AUTO && !approved) return { ...cycle, ok: false, waiting: true, line: `${cost.line} Press Start to run it.` };
  const ctx = { cost, allowUsd: cost.runUsd, results: {}, startedOn: cycle.on };
  for (const s of STEPS) {
    const fn = steps[s.key]; if (!fn) { cycle.steps.push({ key: s.key, name: s.name, ok: true, skipped: true, line: "Not for this site." }); continue; }
    const t0 = now(); let r;
    try { r = await fn(ctx); } catch (e) { r = { ok: false, line: `Stopped by an error: ${String(e?.message ?? e).slice(0, 160)}` }; }
    ctx.results[s.key] = r; cycle.usd = round(cycle.usd + (Number(r?.usd) || 0));
    cycle.steps.push({ key: s.key, name: s.name, ok: r?.ok !== false, line: r?.line ?? "", seconds: Math.round((now() - t0) / 1000), ...(r?.usd ? { usd: round(r.usd) } : {}), ...(r?.held?.length ? { held: r.held.slice(0, 200) } : {}), ...(r?.data ? { data: r.data } : {}) });
    save(cycle);
    if (r?.stopCycle) break; /* a step that must not be followed (the go-live refused): the rest waits for the next cycle */
  }
  cycle.ok = cycle.steps.every((x) => x.ok); cycle.done = new Date(now()).toISOString(); save(cycle);
  return cycle;
}

/** the weekly report: pages added, pages now in Google, pages held and why, money against the budget — NO data source named */
export function weeklyReport(runs, { since, now = Date.now(), budget }) {
  const week = runs.filter((r) => Date.parse(r.on) >= since && Date.parse(r.on) <= now), last = week.at(-1) ?? null, step = (r, k) => r.steps?.find((x) => x.key === k);
  const added = week.reduce((n, r) => n + (Number(step(r, "newPages")?.data?.made) || 0), 0), live = week.reduce((n, r) => n + (Number(step(r, "goLive")?.data?.pages) || 0), 0), indexedNow = last ? step(last, "rebuild")?.data?.forGoogle ?? null : null, inGoogle = last ? step(last, "engines")?.data?.inGoogle ?? null : null;
  const held = new Map(); for (const r of week) for (const s of r.steps ?? []) for (const h of s.held ?? []) held.set(h.url ?? h.why, h.why);
  const usd = round(week.reduce((t, r) => t + (Number(r.usd) || 0), 0));
  const lines = [`Your week (${new Date(since).toISOString().slice(0, 10)} to ${new Date(now).toISOString().slice(0, 10)}): ${week.length} cycle${week.length === 1 ? "" : "s"} ran by themselves.`,
    `Pages added: ${added}. Pages taken live: ${live}.`, indexedNow === null ? null : `Pages for Google now (6 or more checked answers): ${indexedNow}.`, inGoogle === null ? "Pages in Google: connect Search Console to see it." : `Pages in Google: ${inGoogle}.`,
    held.size ? `Pages held (${held.size}): ${[...held].slice(0, 8).map(([u, w]) => `${u} — ${w}`).join("; ")}${held.size > 8 ? "; …" : ""}.` : "No page was held.",
    `Money: $${usd.toFixed(2)} this week; your monthly limit is $${Number(budget?.cap ?? 0).toFixed(2)}, $${Number(budget?.left ?? 0).toFixed(2)} left this month.`].filter(Boolean);
  return { on: new Date(now).toISOString(), cycles: week.length, added, live, indexedNow, inGoogle, held: held.size, usd, text: lines.join("\n") };
}
