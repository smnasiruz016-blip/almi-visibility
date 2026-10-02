/**
 * 🔴 THE RENDERER — A CAPABILITY. NOT A DETECTOR.
 *
 * Owner Ruling 7: "A RENDERER IS A CAPABILITY. A SOURCE-VERSUS-RENDER CHECK IS A
 * DETECTOR." This module renders a stored body in headless Chromium and records
 * what it saw. It judges nothing, raises no issue and compares nothing against
 * the served HTML. The detector that would is written later, under the sealed
 * exam rule, without opening the sealed directory.
 *
 * ── 🔴 OFFLINE BY CONSTRUCTION ──────────────────────────────────────────────
 *
 * Its input is a body already held — never the live web. Four layers, each one
 * measured rather than trusted:
 *
 *   1. THE DOCUMENT COMES FROM 127.0.0.1. A local server holds the bodies; the
 *      browser's request for the page is fulfilled with the bytes that server
 *      returns. The browser addresses the document under its RECORDED final URL,
 *      so relative references keep the hosts they really name — and are refused
 *      under those names, which is what the resource record needs to say.
 *   2. EVERY OTHER REQUEST IS REFUSED, NOT DROPPED. Every request the browser
 *      makes — any host, any port, 127.0.0.1 included — is aborted at the
 *      interception with ERR_BLOCKED_BY_CLIENT and written down: host, kind,
 *      outcome. WebSockets are closed the same way. Service workers are blocked.
 *   3. NOTHING CAN RESOLVE. Chromium starts with a host-resolver rule mapping
 *      every name except 127.0.0.1 to NOTFOUND, and with background networking,
 *      component updates, sync, pings and DNS prefetch switched off — so a
 *      request that slipped past layer 2 would still have nowhere to go.
 *   4. THE PROOF IS READ BACK. Every response the browser reports is asked for
 *      its server address; a response from any address other than 127.0.0.1 is
 *      EGRESS and the caller aborts. Every request the browser issued is checked
 *      against the interception's own log; one it never handled makes the render
 *      FAILED. The Node side fetches only through a guard that throws on any host
 *      but 127.0.0.1.
 *
 * ⚠️ WHAT THIS CANNOT SEE: traffic the browser process sends outside the page's
 * network stack (no packet capture is taken). Layer 3 is the defence against it,
 * and it is stated here rather than implied away.
 *
 * ── WHY `playwright-core` IS IMPORTED LAZILY ────────────────────────────────
 *
 * CI installs nothing (see .github/workflows/test.yml). The pure half of this
 * module must load there, so the browser library is imported only when a
 * browser is launched, and a test that needs one skips with its reason.
 *
 * This module names no product.
 */

import { createServer } from "node:http";
import { createRequire } from "node:module";

import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";
import { journeyOf } from "../crawl/crawler.mjs";
import { renderStateOf, summariseRequests } from "./render-state.mjs";

export const RENDER_METHOD = "render.chromium";
export const RENDERER_COLLECTOR = "src/render/renderer.mjs";
export const RENDERER_VERSION = "0.1.0";
export const LOCAL_ADDRESSES = Object.freeze(["127.0.0.1"]);

/** LAW-BOUND-1: printed beside every result, stored on every observation. */
export const RENDER_BOUNDS = Object.freeze({
  perPageTimeoutMs: 15_000,
  maxWallClockMs: 30 * 60 * 1000,
  maxPages: 500,
  concurrency: 1,
});

export const OFFLINE_CHROMIUM_ARGS = Object.freeze([
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-domain-reliability",
  "--disable-sync",
  "--no-pings",
  "--dns-prefetch-disable",
]);

export class EgressError extends Error {}

const firstLine = (s) => String(s ?? "").split("\n")[0].slice(0, 300);

export function hostOf(url) {
  try {
    return new URL(url).host || "(no host)";
  } catch {
    return "(unparseable)";
  }
}

/** The one fetch the Node side may make: to 127.0.0.1, logged. Anything else THROWS. */
export async function guardedLocalFetch(url, egress, fetchImpl = globalThis.fetch) {
  const host = new URL(url).hostname;
  if (!LOCAL_ADDRESSES.includes(host)) throw new EgressError(`🔴 NETWORK EGRESS ATTEMPTED to ${host} by the renderer`);
  egress.push(url);
  return fetchImpl(url);
}

/** Serves stored documents from 127.0.0.1 at /doc/<id>, with their recorded status and content type. */
export async function startDocumentServer(documents) {
  const requests = [];
  const server = createServer((req, res) => {
    requests.push(req.url);
    const id = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname.replace(/^\/doc\//, ""));
    const d = documents.get(id);
    if (!d) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not a stored document");
    }
    res.writeHead(d.status ?? 200, { "content-type": d.contentType ?? "text/html" });
    res.end(d.body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { origin: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((r) => server.close(r)) };
}

/** `{ chromium, version }`, or `{ unavailable }` with the reason — never a throw. */
export async function loadPlaywright() {
  try {
    const mod = await import("playwright-core");
    const version = createRequire(import.meta.url)("playwright-core/package.json").version;
    return { chromium: mod.chromium, version };
  } catch (e) {
    return { unavailable: `playwright-core cannot be loaded here (${e.code ?? firstLine(e.message)})` };
  }
}

export async function launchOfflineChromium({ chromium, playwrightVersion }) {
  const browser = await chromium.launch({ headless: true, args: [...OFFLINE_CHROMIUM_ARGS] });
  return {
    browser,
    environment: Object.freeze({
      browser: Object.freeze({ name: "chromium", build: "chromium-headless-shell (Playwright's headless launch)", version: browser.version() }),
      playwright: Object.freeze({ package: "playwright-core", version: playwrightVersion }),
      args: OFFLINE_CHROMIUM_ARGS,
    }),
  };
}

/**
 * Render ONE stored document. Returns what was seen; decides nothing about the page.
 * Throws EgressError if any response came from an address other than 127.0.0.1.
 *
 * RR-137 (F22): three optional parameters, all off by default so every existing caller renders exactly as before.
 *   subresources       (url, resourceType) => { served, status, contentType, body } | { served: false, refusal } — a request other
 *                      than the document is handed to it instead of being refused outright (src/render/same-origin-policy.mjs). The
 *                      browser still resolves no name: what it receives is fulfilled by the Node side.
 *   javaScriptEnabled  false renders the page as a client without scripts sees it (F22's SOURCE side); default true.
 *   readVisibleText    true also returns the page's visible text (document.body.innerText), read after the page settled.
 */
export async function renderDocument({ browser, origin, id, documentUrl, bounds = RENDER_BOUNDS, egress, subresources = null, javaScriptEnabled = true, readVisibleText = false }) {
  const t0 = Date.now();
  const target = new URL(documentUrl).href;
  /* a FRESH context for every render: cookies, storage and cache are the context's, and are discarded with it (F22 C4 · storage) */
  const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false, javaScriptEnabled });
  const requests = [];
  const routed = new Set();
  const issued = [];
  const addressChecks = [];
  let documentServed = false;
  let navigationError = null;
  let timedOut = false;
  let crashed = false;
  let html = null;
  let visibleText = null;
  let proof;
  try {
    await context.route("**/*", async (route) => {
      const req = route.request();
      routed.add(req);
      const entry = { host: hostOf(req.url()), resourceType: req.resourceType() };
      if (!documentServed && req.isNavigationRequest() && req.url() === target && req.frame().parentFrame() === null) {
        documentServed = true;
        const r = await guardedLocalFetch(`${origin}/doc/${encodeURIComponent(id)}`, egress);
        const body = Buffer.from(await r.arrayBuffer());
        requests.push({ ...entry, outcome: "SERVED_LOCAL" });
        return route.fulfill({ status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "text/html" }, body });
      }
      if (subresources) {
        let got;
        try { got = await subresources(req.url(), req.resourceType()); } catch (e) { got = { served: false, refusal: "NETWORK" }; }
        if (got?.served) {
          requests.push({ ...entry, outcome: "SERVED_SAME_ORIGIN" });
          return route.fulfill({ status: got.status, headers: got.contentType ? { "content-type": got.contentType } : {}, body: got.body });
        }
        requests.push({ ...entry, outcome: "REFUSED", refusal: got?.refusal ?? "NETWORK" });
        return route.abort("blockedbyclient");
      }
      requests.push({ ...entry, outcome: "REFUSED" });
      return route.abort("blockedbyclient");
    });
    await context.routeWebSocket(() => true, (ws) => {
      requests.push({ host: hostOf(ws.url()), resourceType: "websocket", outcome: "REFUSED" });
      ws.close();
    });
    context.on("request", (req) => {
      if (/^(https?|wss?):/i.test(req.url())) issued.push(req);
    });
    context.on("response", (res) => {
      addressChecks.push(
        res.serverAddr().then(
          (a) => (a === null ? "NO_ADDRESS" : LOCAL_ADDRESSES.includes(a.ipAddress) ? "LOCAL" : `NON_LOCAL ${a.ipAddress} ${res.url()}`),
          () => `UNVERIFIED ${res.url()}`,
        ),
      );
    });

    const page = await context.newPage();
    page.on("crash", () => {
      crashed = true;
    });
    try {
      await page.goto(target, { waitUntil: "load", timeout: bounds.perPageTimeoutMs });
    } catch (e) {
      navigationError = firstLine(e.message);
    }
    if (!navigationError && !crashed) {
      try {
        await page.waitForLoadState("networkidle", { timeout: Math.max(1, bounds.perPageTimeoutMs - (Date.now() - t0)) });
      } catch {
        timedOut = true;
      }
      try {
        html = await page.content();
        if (readVisibleText) visibleText = await page.evaluate(() => (document.body ? document.body.innerText : ""));
      } catch (e) {
        navigationError = `the DOM could not be read: ${firstLine(e.message)}`;
      }
    }
    // 🔴 Read the addresses BEFORE the context closes: a check that fails after close must not read as clean.
    const addresses = await Promise.all(addressChecks);
    proof = {
      responses: addresses.length,
      nonLocal: addresses.filter((a) => a.startsWith("NON_LOCAL")),
      unverified: addresses.filter((a) => a.startsWith("UNVERIFIED")),
    };
  } finally {
    await context.close();
  }
  if (proof.nonLocal.length || proof.unverified.length) {
    throw new EgressError(`🔴 render of ${id}: ${proof.nonLocal.length} response(s) from a non-local address, ${proof.unverified.length} unverifiable — ${[...proof.nonLocal, ...proof.unverified].slice(0, 3).join("; ")}`);
  }

  const unaccounted = issued.filter((r) => !routed.has(r)).length;
  const { renderState, reason } = renderStateOf({ documentServed, navigationError, crashed, requests, unaccounted, timedOut });
  return {
    html: renderState === "FAILED" ? null : html,
    visibleText: renderState === "FAILED" ? null : visibleText,
    renderState,
    reason,
    requests: summariseRequests(requests),
    unaccounted,
    timedOut,
    duration_ms: Date.now() - t0,
    egressProof: proof,
  };
}

/**
 * The RENDERED observation for one raw observation. The raw record is read,
 * never modified: this is a second record beside it, pointing back to it.
 *
 * 🔴 THE STATE IS IN THE METHOD. The measurement key is target + method +
 * content (+ journey). A render whose DOM hashed the same but whose state
 * changed — PARTIAL to COMPLETE — is a changed measurement, and a key that could
 * not see it would store the change as a re-sighting (D-KEY-1's lesson).
 */
export function renderedObservation({ raw, result, environment, bounds = RENDER_BOUNDS, observedAt, documentUrl }) {
  if (raw?.record_type !== "observation" || raw.value?.renderMode !== "RAW_HTML") {
    throw new TypeError("renderedObservation: the source must be a RAW_HTML observation");
  }
  const bytes = result.html === null ? null : Buffer.byteLength(result.html, "utf8");
  return makeObservation({
    observed_at: observedAt,
    method: `${RENDER_METHOD}:${result.renderState}`,
    target: raw.target,
    content_sha256: result.html === null ? sha256Hex(`<no-render:${result.reason}>`) : sha256Hex(result.html),
    journey: journeyOf({ requested_url: raw.value.requested_url, final_url: raw.value.final_url, redirect_chain: raw.value.redirect_chain ?? [] }),
    collector: RENDERER_COLLECTOR,
    collector_version: RENDERER_VERSION,
    value: {
      renderMode: "RENDERED",
      renderState: result.renderState,
      reason: result.reason,
      source_observation_id: raw.observation_id,
      raw_content_sha256: raw.content_sha256,
      document_url: documentUrl,
      documentServedFrom: "127.0.0.1",
      bytes,
      duration_ms: result.duration_ms,
      timedOut: result.timedOut,
      requests: result.requests,
      unaccounted: result.unaccounted,
      egressProof: { responses: result.egressProof.responses, nonLocal: result.egressProof.nonLocal.length, unverified: result.egressProof.unverified.length },
      browser: environment.browser,
      playwright: environment.playwright,
      bounds,
    },
  });
}
