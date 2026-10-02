/**
 * 🔴 RR-133 · NO EGRESS — a preload (`node --import <this file>`) that replaces EVERY network primitive the crawl binary can reach, and COUNTS
 * each call into the file named by NO_EGRESS_LOG.
 *
 *   globalThis.fetch          — the only production path to the network (src/tenancy/connectors.mjs)
 *   dns/promises resolve4/6   — the reachability lookups (src/crawl/ipv6.mjs)
 *   net.connect               — the IPv6 egress probe (src/crawl/ipv6.mjs)
 *
 * NO_EGRESS_MODE=refuse   every call throws: a run that must refuse BEFORE its first request is proved by a count of 0
 * NO_EGRESS_MODE=fixture  every call is answered HERE, in this process: robots.txt allows all; a page answers 200 with a small HTML body; DNS
 *                         answers a documentation address (RFC 5737); the IPv6 probe fails as unreachable. Nothing leaves the machine.
 * Named ESM imports of builtins see the replacements through node:module syncBuiltinESMExports. Test use only.
 */
import { writeFileSync } from "node:fs";
import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { syncBuiltinESMExports } from "node:module";

const LOG = process.env.NO_EGRESS_LOG ?? null;
const MODE = process.env.NO_EGRESS_MODE === "fixture" ? "fixture" : "refuse";
const counts = { mode: MODE, fetch: 0, robots: 0, pages: 0, dns: 0, connect: 0, otherEgress: 0, order: [], hosts: {} };
const save = () => { if (LOG) writeFileSync(LOG, JSON.stringify(counts)); };
/* the ORDER of network calls (first 64), so a run can show what happened before its first request */
const seen = (kind) => { if (counts.order.length < 64) counts.order.push(kind); };
save();
const refuse = (what) => { throw Object.assign(new Error(`NO EGRESS: ${what} was attempted`), { code: "NO_EGRESS" }); };
/* every OTHER way out is counted and refused: http(s) requests and TLS connections */
for (const [mod, names] of [[http, ["request", "get"]], [https, ["request", "get"]], [tls, ["connect"]]]) {
  for (const n of names) mod[n] = () => { counts.otherEgress += 1; seen(n); save(); refuse(`${n} on a network module`); };
}
const PAGE = '<!doctype html><html lang="en"><head><title>fixture</title></head><body><main><h1>fixture</h1><a href="/elsewhere">a link, never followed</a></main></body></html>';

globalThis.fetch = async (url) => {
  counts.fetch += 1;
  seen("fetch");
  const u = new URL(String(url));
  const isRobots = u.pathname === "/robots.txt";
  counts[isRobots ? "robots" : "pages"] += 1;
  counts.hosts[u.host] = (counts.hosts[u.host] ?? 0) + 1;
  save();
  if (MODE === "refuse") refuse("fetch");
  /* RR-135: two fixture redirects — one to the same origin, one to an origin nobody declared */
  if (u.pathname === "/redirect-in") return new Response(null, { status: 301, headers: { location: "/a" } });
  if (u.pathname === "/redirect-out") return new Response(null, { status: 301, headers: { location: "https://elsewhere.invalid/x" } });
  return isRobots
    ? new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } })
    : new Response(PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
};
dns.resolve4 = async () => { counts.dns += 1; seen("dns"); save(); if (MODE === "refuse") refuse("dns.resolve4"); return ["192.0.2.10"]; };
dns.resolve6 = async () => { counts.dns += 1; seen("dns"); save(); if (MODE === "refuse") refuse("dns.resolve6"); throw Object.assign(new Error("no AAAA (fixture)"), { code: "ENODATA" }); };
net.connect = () => {
  counts.connect += 1;
  seen("socket");
  save();
  const s = new net.Socket();
  process.nextTick(() => s.emit("error", Object.assign(new Error("fixture: IPv6 unreachable"), { code: "ENETUNREACH" })));
  return s;
};
syncBuiltinESMExports();
