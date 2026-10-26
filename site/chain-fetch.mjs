/**
 * 🔴 RR-330 · A MISSING CERTIFICATE IN AN OFFICIAL SITE'S CHAIN (measured 27 Oct 2026: ahpc.org.pk, mofa.gov.pk, sis.gov.eg, ems.org.eg,
 * hague.mofa.gov.bd — Node answered UNABLE_TO_VERIFY_LEAF_SIGNATURE, so even their robots.txt "could not be read" and every council or
 * rule on them stayed unconfirmed). Their servers send their own certificate without the one between it and the root; a browser fetches
 * that one from the address the certificate itself names (its "CA Issuers" address) and goes on. This does the same:
 *   · only on that error, only for a GET over https;
 *   · it looks at the certificate the site sends (that one connection reads nothing else and is closed at once), fetches the named issuer
 *     certificate (a public address only, small, once per site), and asks again WITH FULL VERIFICATION — the site's chain must then lead to
 *     one of Node's own trusted roots, or the read fails exactly as before;
 *   · a self-signed or otherwise untrusted site is never read (no "accept anyway").
 * The answer is a standard Response, so the official reader (desktop/official.mjs) and its robots cache use it unchanged.
 */
import tls from "node:tls";
import https from "node:https";
import { X509Certificate } from "node:crypto";

export const CHAIN = Object.freeze({ codes: Object.freeze(["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "UNABLE_TO_GET_ISSUER_CERT"]), maxCertBytes: 65536, timeoutMs: 15000, maxBodyBytes: 16_000_000 });
const codeOf = (e) => e?.cause?.code ?? e?.code ?? null;

/** the certificate a site sends — read from the handshake only (nothing is sent or read on this connection) */
export function peerCertOf(host, port = 443, { timeoutMs = CHAIN.timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host, port, servername: host, rejectUnauthorized: false, ALPNProtocols: ["http/1.1"] }, () => { const c = s.getPeerCertificate(false); s.destroy(); resolve(c); });
    s.setTimeout(timeoutMs, () => { s.destroy(); reject(new Error("timed out")); }); s.on("error", reject);
  });
}

/** a GET with this site's completed chain — full verification on; → a standard Response */
export function verifiedGet(url, { headers = {}, ca, timeoutMs = CHAIN.timeoutMs, signal } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers, ca, rejectUnauthorized: true, servername: url.hostname, timeout: timeoutMs, signal }, (res) => {
      const parts = []; let n = 0;
      res.on("data", (d) => { n += d.length; if (n > CHAIN.maxBodyBytes) { res.destroy(); return; } parts.push(d); });
      res.on("end", () => { const h = new Headers(); for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(", ") : String(v));
        const status = res.statusCode ?? 0, empty = [101, 103, 204, 205, 304].includes(status);
        resolve(new Response(empty ? null : Buffer.concat(parts), { status, headers: h })); });
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(Object.assign(new Error("timed out"), { name: "TimeoutError" }))); req.on("error", reject); req.end();
  });
}

/**
 * `base` (the global fetch, or a stand-in) wrapped: on a missing-issuer error it completes the chain as above. `allowed(url)` checks the
 * issuer certificate's address (a public one only — the reader's own check); `peerCert`, `request` are handed in by the tests.
 */
export function chainFetch(base = fetch, { peerCert = peerCertOf, request = verifiedGet, allowed = async () => true, roots = tls.rootCertificates } = {}) {
  const issuers = new Map();
  const issuerOf = async (u) => {
    const cert = await peerCert(u.hostname, Number(u.port) || 443);
    const at = String(cert?.infoAccess?.["CA Issuers - URI"]?.[0] ?? "");
    if (!/^https?:\/\//.test(at) || !(await allowed(at))) return null;
    const r = await base(at, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(CHAIN.timeoutMs) });
    if (!r.ok) return null;
    const bytes = Buffer.from(await r.arrayBuffer()); if (bytes.length > CHAIN.maxCertBytes) return null;
    try { return new X509Certificate(bytes).toString(); } catch { try { return new X509Certificate(bytes.toString("utf8")).toString(); } catch { return null; } }
  };
  return async function fetchWithChain(url, init = {}) {
    try { return await base(url, init); }
    catch (e) {
      let u; try { u = new URL(url); } catch { throw e; }
      if (u.protocol !== "https:" || !CHAIN.codes.includes(codeOf(e)) || String(init.method ?? "GET").toUpperCase() !== "GET") throw e;
      if (!issuers.has(u.host)) issuers.set(u.host, await issuerOf(u).catch(() => null));
      const pem = issuers.get(u.host); if (!pem) throw e;
      return request(u, { headers: Object.fromEntries(new Headers(init.headers ?? {})), ca: [...roots, pem], timeoutMs: CHAIN.timeoutMs, signal: init.signal });
    }
  };
}
