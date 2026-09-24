/**
 * 🔴 F01 §5.2 · A SUBMITTED PUBLIC ORIGIN — NORMALISED BY STRUCTURE, NEVER RESOLVED, NEVER OWNED (24 September 2026).
 *
 * A URL in a declaration is what the submitter SAYS. This module only decides whether its shape is a public web
 * origin, and writes it in one canonical form. It performs no network request, reads no DNS, and says nothing about
 * who controls the host: a resolvable host is not an owned host, and "the request worked" is not a declaration.
 *
 *   accepted    http: or https:, a host that is a public DNS name or a public IP literal, an optional port
 *   normalised  scheme and host lower-cased; a default port dropped; a fragment removed
 *   refused     a malformed value · another scheme · a user or password in it · a path, query or trailing segment
 *               (an origin is one scheme+host+port — distinct paths are declared as SCOPE, never merged into it) ·
 *               localhost, a single-label host, or a loopback, private, link-local, shared or unspecified address
 */
import { isIP } from "node:net";

export const ORIGIN_SCHEMES = Object.freeze(["http:", "https:"]);
const DEFAULT_PORT = Object.freeze({ "http:": "80", "https:": "443" });

const refuse = (code) => Object.freeze({ ok: false, code });

/** Is an IPv4 literal outside the public address space (RFC 1918, loopback, link-local, CGNAT, unspecified, …)? */
function nonPublicV4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
/** Is an IPv6 literal loopback, unspecified, unique-local, link-local, or an IPv4-mapped non-public address? */
function nonPublicV6(ip) {
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  if (/^f[cd]/.test(x) || /^fe[89ab]/.test(x) || /^ff/.test(x)) return true;
  const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? nonPublicV4(mapped[1]) : false;
}

/**
 * Normalise one submitted origin. Returns `{ ok: true, origin }` or `{ ok: false, code }` — the code is a reason,
 * never the submitted text (which may carry what it should not).
 */
export function normaliseOrigin(raw) {
  if (typeof raw !== "string" || raw.trim() === "" || raw !== raw.trim() || /\s/.test(raw)) return refuse("ORIGIN_MALFORMED");
  let u;
  try { u = new URL(raw); } catch { return refuse("ORIGIN_MALFORMED"); }
  if (!ORIGIN_SCHEMES.includes(u.protocol)) return refuse("ORIGIN_SCHEME_UNSUPPORTED");
  if (u.username !== "" || u.password !== "" || /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*@/i.test(raw)) return refuse("ORIGIN_EMBEDDED_CREDENTIALS");
  if (u.search !== "" || (u.pathname !== "/" && u.pathname !== "")) return refuse("ORIGIN_HAS_PATH_OR_QUERY");
  if (/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*\/[^#]*[^/#]/i.test(raw)) return refuse("ORIGIN_HAS_PATH_OR_QUERY");
  const host = u.hostname.toLowerCase();
  if (host === "") return refuse("ORIGIN_MALFORMED");
  const bare = host.replace(/^\[|\]$/g, "");
  const family = isIP(bare);
  if (family === 4 && nonPublicV4(bare)) return refuse("ORIGIN_NOT_PUBLIC_ADDRESS");
  if (family === 6 && nonPublicV6(bare)) return refuse("ORIGIN_NOT_PUBLIC_ADDRESS");
  if (family === 0) {
    if (host === "localhost" || host.endsWith(".localhost")) return refuse("ORIGIN_NOT_PUBLIC_ADDRESS");
    if (!host.includes(".") || host.endsWith(".")) return refuse("ORIGIN_NOT_PUBLIC_ADDRESS");
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) || host.split(".").some((l) => l === "" || l.startsWith("-") || l.endsWith("-"))) return refuse("ORIGIN_MALFORMED");
  }
  const port = u.port && u.port !== DEFAULT_PORT[u.protocol] ? `:${u.port}` : "";
  return Object.freeze({ ok: true, origin: `${u.protocol}//${host}${port}` });
}
