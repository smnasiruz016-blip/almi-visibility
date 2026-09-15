/**
 * 🔴 GAP 1 — A PRELOAD THAT REFUSES EVERY NETWORK CALL.
 *
 *   node --import <this file's URL> bin/crawl.mjs --seeds=<file> ...
 *
 * The crawler measures its runner's IPv6 egress and the estate's DNS even on a dry run. A test that exercises the
 * dry run's WRITE behaviour must not also touch the network, so this refuses it: a socket connect is destroyed with an
 * error, DNS resolves and lookups reject, fetch and http(s) requests throw. Each refusal is written to STDERR as one
 * `[no-network] refused …` line, so a test can see that the network was asked for and refused rather than reached.
 *
 * ⚠️ It covers the calls named below. A native addon, a worker thread or a child process would be outside it.
 */
import net from "node:net";
import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";

const refusal = (what) => {
  process.stderr.write(`[no-network] refused ${what}\n`);
  const err = new Error(`network refused by the no-network preload: ${what}`);
  err.code = "ECONNREFUSED";
  return err;
};

net.Socket.prototype.connect = function refusedConnect(...args) {
  const target = typeof args[0] === "object" && args[0] !== null ? `${args[0].host ?? args[0].path ?? "?"}:${args[0].port ?? ""}` : String(args[0]);
  const err = refusal(`socket connect ${target}`);
  process.nextTick(() => this.destroy(err));
  return this;
};

for (const name of ["lookup", "resolve", "resolve4", "resolve6", "resolveAny"]) {
  if (typeof dns[name] === "function") {
    dns[name] = (host, ...rest) => {
      const cb = rest.find((x) => typeof x === "function");
      const err = refusal(`dns.${name} ${host}`);
      if (cb) process.nextTick(() => cb(err));
    };
  }
  if (typeof dnsPromises[name] === "function") dnsPromises[name] = async (host) => { throw refusal(`dns.promises.${name} ${host}`); };
}

for (const [label, mod] of [["http", http], ["https", https]]) {
  for (const name of ["request", "get"]) mod[name] = (target) => { throw refusal(`${label}.${name} ${typeof target === "string" ? target : target?.host ?? "?"}`); };
}

globalThis.fetch = async (target) => { throw refusal(`fetch ${String(target)}`); };

syncBuiltinESMExports();
