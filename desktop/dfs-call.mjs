/**
 * 🔴 RR-379 (owner, 6 Nov 2026: "every kind of SEO", wave 1) · ONE WAY TO BUY FROM DATAFORSEO FOR THE NEW JOBS: app stores, local results,
 * rank tracking and Google's AI Overviews. The same switch, the same keys and the same caps as the search-results data (Settings → Search
 * results data: at most $1 a day); one ledger (dataforseo-ledger.json). Each purchase is booked with its job, so the Data screen gives
 * each job its own money line.
 *   · Refused BEFORE it is sent when the most it can cost would pass today's or this month's cap, or the job's own budget for this run.
 *   · What DataForSEO says it charged is what is booked; a refused task costs nothing.
 *   · A result already bought (same path and same task) is kept and reused free for `keepDays`.
 *   · App Data has no live method: a task is posted, then collected (collecting is free). Live methods answer at once.
 * Official API only (docs.dataforseo.com/v3). Nothing here reads a store page, a Google page or a map page itself.
 */
export const DFS_BASE = "https://api.dataforseo.com/v3";
/** the most each kind of task can cost, counted BEFORE it is sent (the price DataForSEO reports afterwards is what is booked) */
export const WORST = Object.freeze({ appTask: 0.01, mapsLive: 0.01, organicLive: 0.01, organicAiLive: 0.012, bingLive: 0.01 });
const dayOf = (iso) => String(iso).slice(0, 10), monthOf = (iso) => String(iso).slice(0, 7);
const sumOf = (ledger, p, job = null) => (ledger?.spent ?? []).filter((s) => String(s.on).startsWith(p) && (!job || s.job === job)).reduce((t, s) => t + (Number(s.cost) || 0), 0);
export const jobSpent = (ledger, job, now = new Date().toISOString()) => ({ today: sumOf(ledger, dayOf(now), job), month: sumOf(ledger, monthOf(now), job) });
const keyOf = (path, task) => `${path}|${JSON.stringify(task)}`;

/** may one more task be bought? → { ok, why } */
export function mayBuyTask(ledger, { worst, capDay, capMonth, runLeft = Infinity, now = new Date().toISOString() }) {
  if (!(capDay > 0 && capMonth > 0)) return { ok: false, why: "No spending cap is set for search data (Settings → Search results data)." };
  const day = sumOf(ledger, dayOf(now)), month = sumOf(ledger, monthOf(now));
  if (worst > runLeft + 1e-9) return { ok: false, why: "This run's budget is used up; the rest goes on next time." };
  if (day + worst > capDay + 1e-9) return { ok: false, why: `Today's search-data cap ($${capDay.toFixed(2)}) is reached; it goes on tomorrow.` };
  if (month + worst > capMonth + 1e-9) return { ok: false, why: `This month's search-data cap ($${capMonth.toFixed(2)}) is reached.` };
  return { ok: true, why: null };
}

/** DataForSEO's documented answer → { ok, cost, result, why, id } for ONE task */
export function taskOf(answer) {
  if (!answer || answer.status_code !== 20000) return { ok: false, cost: 0, result: null, why: `DataForSEO refused (${answer?.status_code ?? "no answer"}${answer?.status_message ? `: ${answer.status_message}` : ""}).` };
  const t = (answer.tasks ?? [])[0];
  if (!t) return { ok: false, cost: 0, result: null, why: "DataForSEO gave no task back." };
  const cost = Number(t.cost ?? answer.cost) || 0;
  if (t.status_code === 20000) return { ok: true, cost, result: t.result ?? [], id: t.id ?? null, why: null };
  if (t.status_code === 20100) return { ok: true, cost, result: null, id: t.id ?? null, queued: true, why: null };
  if (t.status_code === 40601 || t.status_code === 40602) return { ok: false, cost, result: null, id: t.id ?? null, waiting: true, why: "still in DataForSEO's queue" };
  return { ok: false, cost, result: null, id: t.id ?? null, why: `DataForSEO refused this task (${t.status_code}${t.status_message ? `: ${t.status_message}` : ""}).` };
}
/** every item of a result, flat (types kept) */
export const itemsOf = (result) => (result ?? []).flatMap((r) => r?.items ?? []);

/**
 * a buyer for one job. ledger: the shared DataForSEO ledger (the caller saves it); creds: { login, password } read only when sending;
 * settings: { on, capDay, capMonth }; runBudget: the most this run may spend; fetchImpl injected (tests use documented answers only).
 */
export function dfsBuyer({ job, ledger, save = () => {}, creds, settings, runBudget = Infinity, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(60000) }), now = () => new Date().toISOString(), keepDays = 7, base = DFS_BASE, waitMs = 120000, everyMs = 10000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let spentRun = 0;
  const off = () => (settings?.on !== true ? "Search-results data is switched off (Settings → Search results data). Nothing was bought." : !creds?.login?.() || !creds?.password?.() ? "No DataForSEO login is saved (Settings → Search results data). Nothing was bought." : null);
  const auth = () => `Basic ${Buffer.from(`${creds.login()}:${creds.password()}`).toString("base64")}`;
  const call = async (path, body, method = "POST") => { try { const r = await fetchImpl(`${base}${path}`, { method, headers: { authorization: auth(), "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify(body) } : {}) }); return await r.json().catch(() => ({ status_code: r.status })); } catch { return null; } };
  const kept = (path, task) => { const k = ledger.jobCache?.[keyOf(path, task)]; return k && (Date.parse(now()) - Date.parse(k.on)) / 864e5 <= keepDays ? k : null; };
  const keep = (path, task, result) => { (ledger.jobCache ??= {})[keyOf(path, task)] = { on: now(), result }; };
  const book = (cost, what) => { spentRun += cost; (ledger.spent ??= []).push({ on: now(), cost, what, job }); };
  const gate = (worst) => { const o = off(); if (o) return { ok: false, why: o, off: true }; return mayBuyTask(ledger, { worst, capDay: settings.capDay, capMonth: settings.capMonth, runLeft: runBudget - spentRun, now: now() }); };
  return Object.freeze({
    get spent() { return spentRun; },
    off,
    /** a live method: answered at once. → { ok, result, cost, fromKept, why } */
    async live(path, task, { worst, what }) {
      const k = kept(path, task); if (k) return { ok: true, result: k.result, cost: 0, fromKept: true };
      const g = gate(worst); if (!g.ok) return { ok: false, why: g.why, off: g.off === true };
      const t = taskOf(await call(path, [task])); book(t.cost, what); if (t.ok) keep(path, task, t.result); save(ledger);
      return { ok: t.ok, result: t.result, cost: t.cost, why: t.why };
    },
    /** a standard-queue method (App Data): post, then collect (free) for at most waitMs. → { ok, result, cost, fromKept, why, later } */
    async queued(pathBase, task, { worst, what, waitMs: wait = waitMs, getPath = "/task_get/advanced/" /* Business Data reviews: "/task_get/" (docs.dataforseo.com, RR-379 proof: 40400 on /advanced) */, fresh = false /* RR-382: the daily review watch must read today's reviews, never the 7-day copy */ }) {
      const waitMs0 = wait;
      const k = fresh ? null : kept(pathBase, task); if (k) return { ok: true, result: k.result, cost: 0, fromKept: true };
      const pending = ledger.jobPending?.[keyOf(pathBase, task)];
      let id = pending?.id ?? null, cost = 0;
      if (!id) {
        const g = gate(worst); if (!g.ok) return { ok: false, why: g.why, off: g.off === true };
        const t = taskOf(await call(`${pathBase}/task_post`, [task])); cost = t.cost; book(t.cost, what);
        if (!t.ok || !t.id) { save(ledger); return { ok: false, why: t.why ?? "DataForSEO took no task.", cost }; }
        id = t.id; (ledger.jobPending ??= {})[keyOf(pathBase, task)] = { id, on: now() }; save(ledger);
      }
      for (let waited = 0; waited <= waitMs0; waited += everyMs) {
        const g = taskOf(await call(`${pathBase}${getPath}${id}`, null, "GET"));
        if (g.ok && g.result) { delete ledger.jobPending[keyOf(pathBase, task)]; keep(pathBase, task, g.result); save(ledger); return { ok: true, result: g.result, cost }; }
        if (!g.waiting && !g.queued) { delete ledger.jobPending[keyOf(pathBase, task)]; save(ledger); return { ok: false, why: g.why, cost }; }
        if (everyMs <= 0 || waited + everyMs > waitMs0) break; await sleep(everyMs);
      }
      return { ok: false, later: true, cost, why: "DataForSEO is still working on it; it is collected free next time." };
    },
  });
}
