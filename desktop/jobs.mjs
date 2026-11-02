/**
 * 🔴 RR-362 items 6, 10, 17 (owner's run on 1.15.14: "Working…" for over an hour, no sign of life) · ONE BOARD OF WHAT THE APP IS DOING. Every wait — making pages, checking the site, reading a list,
 * downloading an update, publishing — is a job on this board: how much is done ("45 of 232"), about how long is left, what is happening now ("Reading NMC's page"). A long job says the window may be
 * closed: the work runs in the app itself, not in its window. Recipe R11 (simple for the client). Pure, the clock handed in.
 */
export const LONG_SECONDS = 120;
/** "about 20 minutes left" — never a number before there is something to measure it by */
export function leftWords(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return "working out the time left";
  if (seconds < 60) return "less than a minute left";
  const m = Math.round(seconds / 60); if (m < 90) return `about ${m} minute${m === 1 ? "" : "s"} left`;
  return `about ${Math.round(m / 60)} hours left`;
}
export function jobBoard({ now = () => Date.now(), keepFinishedMs = 15 * 60e3, onFinish = null } = {}) {
  const jobs = new Map();
  const view = (j) => {
    const seconds = Math.round(((j.ended ?? now()) - j.started) / 1000), /* the time left is this step's own pace (a run has several steps, each with its own count) */ inStep = (now() - (j.stepAt ?? j.started)) / 1000, left = j.running && j.done > 0 && j.of > j.done ? Math.round((inStep / j.done) * (j.of - j.done)) : null, long = j.running && (j.long || seconds + (left ?? 0) >= LONG_SECONDS);
    return { key: j.key, product: j.product, kind: j.kind, label: j.label, done: j.done, of: j.of, unit: j.unit, what: j.what, seconds, secondsLeft: left, leftLine: j.running ? (j.of ? leftWords(left) : null) : null, running: j.running, ok: j.ok, line: j.line, canClose: long, percent: j.of ? Math.min(j.running ? 99 : 100, Math.round((j.done / j.of) * 100)) : j.running ? null : 100 };
  };
  return Object.freeze({
    start(key, { product = null, kind = key, label, of = 0, what = "Starting", long = false, unit = "" }) { const j = { key, product, kind, label, done: 0, of, what, long, unit, started: now(), running: true, ok: null, line: null }; jobs.set(key, j); return view(j); },
    step(key, { done = null, add = 0, of = null, what = null, unit = null } = {}) { const j = jobs.get(key); if (!j?.running) return; if (of != null) { j.of = of; j.stepAt = now(); } if (unit != null) j.unit = unit; if (done != null) j.done = done; j.done = Math.min(j.of || Infinity, j.done + add); if (what != null) j.what = what; },
    finish(key, { ok = true, line = null } = {}) { const j = jobs.get(key); if (!j?.running) return; const took = (now() - j.started) / 1000; j.running = false; j.ok = ok; j.line = line; j.ended = now(); if (j.of && ok) j.done = j.of; onFinish?.({ ...view(j), tookSeconds: took }); },
    running(key) { return jobs.get(key)?.running === true; },
    list({ product = undefined } = {}) { for (const [k, j] of jobs) if (!j.running && now() - j.ended > keepFinishedMs) jobs.delete(k); return [...jobs.values()].filter((j) => product === undefined || j.product === product || j.product === null).map(view); },
  });
}
