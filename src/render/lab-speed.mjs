/**
 * 🔴 F24 · PAGE SPEED, LAB AND FIELD KEPT APART (acceptance _handoffs AlmiVisibility_F24_ACCEPTANCE_2026-10-19.md, RR-291; owner answer Q2:
 * "a free, local lab check only; field data (needs a key) DEFERRED").
 *
 * The LAB run: the client's own stored page HTML served from 127.0.0.1 (src/render/renderer.mjs startDocumentServer) into the engine's
 * OFFLINE Chromium (launchOfflineChromium — it resolves no outside name); the browser's own Performance API read after load. Every measurement
 * carries its tool, device, date and BOUND (C1): the stored document alone — its images, scripts and styles from other addresses are not
 * served, so the timings are of the document, not of the live page.
 * A FIELD measurement is its own record kind (from a client's own export or key); the two are never averaged or merged (C2). No field data
 * prints NOT MEASURED — never a lab figure and never 0 (C3).
 * Generic: it names no client, product or host.
 */
export const KIND = Object.freeze({ LAB: "LAB", FIELD: "FIELD" });
export const NOT_MEASURED = "NOT MEASURED";
export const LAB_BOUND = "the stored HTML document alone, served from 127.0.0.1 into an offline browser; resources from other addresses not served; one load per page";
export const DEVICE = Object.freeze({ name: "desktop-1366x768", viewport: Object.freeze({ width: 1366, height: 768 }) });

/** The metrics read inside the page after load — the browser's own Performance API, nothing estimated. */
export const READ_METRICS = () => new Promise((resolve) => {
  const out = { lcpMs: null, cls: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) out.lcpMs = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* not supported */ }
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch { /* not supported */ }
  setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    resolve({ ...out, cls: Math.round(out.cls * 1000) / 1000, fcpMs: fcp ? Math.round(fcp.startTime) : null, domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null, loadMs: nav ? Math.round(nav.loadEventEnd) : null, documentBytes: nav ? nav.transferSize || nav.encodedBodySize || null : null, domNodes: document.getElementsByTagName("*").length });
  }, 1500);
});

/** One LAB record: what was measured, with its tool, device, date and bound (C1). Refuses a record missing any of them. */
export function labRecord({ url, metrics, tool, on }) {
  if (!url || !metrics || !tool || !/^\d{4}-\d{2}-\d{2}$/.test(on ?? "")) throw new TypeError("a lab measurement carries its page, metrics, tool and date");
  return Object.freeze({ kind: KIND.LAB, url, tool, device: DEVICE.name, on, bound: LAB_BOUND, metrics: Object.freeze({ ...metrics }) });
}

/** C2 + C3 · the page-speed finding of one page: lab and field side by side, never merged; missing field data NOT MEASURED. */
export function speedFinding(url, records) {
  const lab = records.filter((r) => r.url === url && r.kind === KIND.LAB);
  const field = records.filter((r) => r.url === url && r.kind === KIND.FIELD);
  return Object.freeze({ url, lab: lab.length ? lab.at(-1) : NOT_MEASURED, field: field.length ? field.at(-1) : NOT_MEASURED });
}

/** Run the lab over stored documents: [{ url, html }] → lab records. `pw` is loadPlaywright()'s result; nothing leaves this machine. */
export async function runLab({ documents, pw, on, startDocumentServer, launchOfflineChromium }) {
  if (pw.unavailable) return { unavailable: pw.unavailable, records: [] };
  const docs = new Map(documents.map((d, i) => [String(i), { body: d.html, status: 200, contentType: "text/html; charset=utf-8" }]));
  const server = await startDocumentServer(docs);
  const { browser, environment } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version });
  const tool = `${environment.browser.name} ${environment.browser.version} (offline, Playwright ${environment.playwright.version}) · Performance API`;
  const records = [];
  try {
    for (const [i, d] of documents.entries()) {
      const ctx = await browser.newContext({ viewport: DEVICE.viewport, serviceWorkers: "block", acceptDownloads: false });
      try {
        const page = await ctx.newPage();
        /* only the stored document is served: every other request is aborted here, never resolved */
        await page.route("**/*", (route) => (route.request().url().startsWith(server.origin) ? route.continue() : route.abort()));
        await page.goto(`${server.origin}/doc/${i}`, { waitUntil: "load", timeout: 15_000 });
        records.push(labRecord({ url: d.url, metrics: await page.evaluate(READ_METRICS), tool, on }));
      } finally { await ctx.close(); }
    }
  } finally { await browser.close(); await server.close(); }
  return { tool, records };
}
