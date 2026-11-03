/* RR-366 X5: the pages are written here, on their own thread (desktop/pages-off.mjs), so the window never waits for them */
import { parentPort, workerData } from "node:worker_threads";
import { seoPages } from "./seo-pages.mjs";
import { extrasFrom } from "./pages-off.mjs";

try { parentPort.postMessage({ ok: true, pages: seoPages({ ...workerData.args, ...extrasFrom(workerData.data) }) }); } catch (e) { parentPort.postMessage({ ok: false, why: String(e?.message ?? e) }); }
