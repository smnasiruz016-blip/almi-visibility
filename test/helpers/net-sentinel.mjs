/**
 * 🔴 RR-243 · THE NETWORK SENTINEL — preloaded into a spawned entry point (NODE_OPTIONS=--import=<this file>) so a test can COUNT every
 * attempt to reach the network and make none: the global fetch, a TCP or TLS connection, an HTTP(S) request and a DNS lookup are each
 * counted and REFUSED (thrown or rejected) before anything leaves the machine. A connection to this machine (127.0.0.1, ::1, localhost)
 * is let through uncounted: the offline renderer serves its documents on loopback. At exit the count is written to NET_SENTINEL_FILE.
 * Test material only: never imported by production code.
 */
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { writeFileSync } from "node:fs";

const OUT = process.env.NET_SENTINEL_FILE;
const counts = { fetch: 0, connect: 0, request: 0, dns: 0 };
const LOCAL = new Set(["127.0.0.1", "::1", "localhost", "[::1]"]);
const isLocal = (host) => LOCAL.has(String(host ?? "").toLowerCase());
const refused = (what) => Object.assign(new Error(`NET_SENTINEL: ${what} refused — a test run makes no network request`), { code: "NET_SENTINEL_REFUSED" });
const hostOfUrl = (u) => { try { return new URL(String(u?.url ?? u)).hostname; } catch { return null; } };

const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  if (isLocal(hostOfUrl(input))) return realFetch(input, init);
  counts.fetch += 1;
  return Promise.reject(refused("fetch"));
};
const realConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const o = typeof args[0] === "object" && args[0] !== null ? args[0] : { port: args[0], host: typeof args[1] === "string" ? args[1] : "localhost" };
  if (o.path || isLocal(o.host ?? "localhost")) return realConnect.apply(this, args);
  counts.connect += 1;
  throw refused("connection");
};
const realTls = tls.connect;
tls.connect = (...args) => { const o = args[0] ?? {}; if (isLocal(o.host ?? o.servername)) return realTls(...args); counts.connect += 1; throw refused("TLS connection"); };
for (const mod of [http, https]) {
  const real = mod.request;
  mod.request = (...args) => { const h = typeof args[0] === "string" || args[0] instanceof URL ? hostOfUrl(args[0]) : args[0]?.hostname ?? args[0]?.host; if (isLocal(h)) return real(...args); counts.request += 1; throw refused("HTTP request"); };
}
const dnsRefuse = (name) => { if (isLocal(name)) return false; counts.dns += 1; return true; };
for (const fn of ["lookup", "resolve", "resolve4", "resolve6", "resolveAny"]) {
  const real = dns[fn];
  if (typeof real === "function") dns[fn] = (name, ...rest) => { if (!dnsRefuse(name)) return real(name, ...rest); const cb = rest.find((x) => typeof x === "function"); if (cb) process.nextTick(cb, refused("DNS lookup")); else throw refused("DNS lookup"); };
  const realP = dns.promises?.[fn];
  if (typeof realP === "function") dns.promises[fn] = (name, ...rest) => (dnsRefuse(name) ? Promise.reject(refused("DNS lookup")) : realP(name, ...rest));
}
process.on("exit", () => { if (OUT) writeFileSync(OUT, JSON.stringify({ ...counts, total: counts.fetch + counts.connect + counts.request + counts.dns })); });
