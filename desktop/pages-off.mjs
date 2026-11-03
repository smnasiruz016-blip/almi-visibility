/**
 * 🔴 RR-366 X5 (owner, 3 Nov 2026: "moving from one screen to another takes long while Making your pages runs"). Writing the pages is the one long piece of work that held the app's only thread: measured on the built app, the window waited up to 5.5 seconds.
 * It now runs on a thread of its own and the window stays free. What it needs goes across as plain data; the few small functions it uses are made again on the other side, so both ways give the same pages. If the thread cannot start, the pages are still made, on the app's own thread.
 */
import { Worker } from "node:worker_threads";
import { reviewLinesFor } from "./almiseo.mjs";
import { answerQuestion } from "./answer-ladder.mjs";

/** the extras of seoPages, from plain data */
export const extrasFrom = ({ bodies = [], fitSubject = null, generic = {}, seoFile = null, officialHost = null, ladder = null } = {}) => ({ bodies, fitSubject, coverageFor: (t) => generic[t] ?? null, reviewFor: (m) => reviewLinesFor({ country: m.country ?? null }, seoFile), ...(ladder ? { officialHost, answerFor: (q, p, o = {}) => answerQuestion(q, { ...ladder, country: p.country ?? null, ...o }) } : {}) });

/** `args` and `data` are plain data; `sync` makes the same pages here if the thread cannot */
export function seoPagesOff({ args, data, sync, workerUrl = new URL("./pages-worker.mjs", import.meta.url) }) {
  return new Promise((resolve, reject) => {
    let settled = false, w; const here = () => { if (settled) return; settled = true; try { resolve(sync()); } catch (e) { reject(e); } };
    try { w = new Worker(workerUrl, { workerData: { args, data } }); } catch { return here(); }
    w.once("message", (m) => { if (settled) return; if (m?.ok) { settled = true; resolve(m.pages); w.terminate(); } else here(); });
    w.once("error", here);
    w.once("exit", (code) => { if (!settled && code !== 0) here(); });
  });
}
