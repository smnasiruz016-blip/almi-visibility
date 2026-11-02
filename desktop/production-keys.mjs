/**
 * 🔴 RR-365b (owner, 2 Nov 2026: 1.15.18 refused every update and every licence answer) · THE PRODUCTION KEYS, by FINGERPRINT ONLY.
 * 1.15.18 went out with a proof's stand-in public key in its REAL Setup, because a proof build was copied into the REAL folder. Nothing stopped it:
 * the build took any folder it was given, and the release tool checked the keys folder but never the package itself.
 * Here is what a Setup for clients must carry: the SHA-256 of each PUBLIC key (its DER form). desktop/build.mjs and site/owner-release.mjs both refuse
 * anything else. No key is held here, and none is ever read here except the two public ones. A planned key change (tools/make-signing-keys.mjs)
 * changes these two lines, on purpose, in a PR.
 */
import { createHash, createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

export const PRODUCTION_KEYS = Object.freeze({
  "licence-public.pem": "91356c0e69348dc85b6be81de4d2844ab31c910f4192de034c5eb2610d4b3b25",
  "update-public.pem": "4e9d0838caf190e8b9fc5bd7ed18e9969d4619abb886898531540fed84ed07ac",
});

export const fingerprintOf = (pem) => createHash("sha256").update(createPublicKey(pem).export({ type: "spki", format: "der" })).digest("hex");

/** The first key that is not the expected one, in words, or null. `read(name)` gives a public key's text or null. Fingerprints only are ever named. */
export function keysFault(read, where, expected = PRODUCTION_KEYS) {
  for (const [name, want] of Object.entries(expected)) {
    const pem = read(name);
    if (pem == null) return `${name} is not in ${where}`;
    let got; try { got = fingerprintOf(pem); } catch { return `${name} in ${where} is not a public key`; }
    if (got !== want) return `${name} in ${where} is not the production key (it is ${got.slice(0, 16)}…, production is ${want.slice(0, 16)}…)`;
  }
  return null;
}

/** A keys folder, read by name: only the -public.pem files named in `expected`. */
export const keysFolderFault = (dir, expected = PRODUCTION_KEYS) => keysFault((n) => (existsSync(join(dir, n)) ? readFileSync(join(dir, n), "utf8") : null), dir, expected);

/** One file out of a zip's bytes (by its central directory), or null. .NET's zip may write backslashes in names. */
export function packedFile(zip, path) {
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) return null;
  let at = zip.readUInt32LE(end + 16);
  for (let n = zip.readUInt16LE(end + 10); n > 0; n--) {
    if (zip.readUInt32LE(at) !== 0x02014b50) return null;
    const method = zip.readUInt16LE(at + 10), size = zip.readUInt32LE(at + 20), nameLen = zip.readUInt16LE(at + 28), extra = zip.readUInt16LE(at + 30), note = zip.readUInt16LE(at + 32), local = zip.readUInt32LE(at + 42);
    if (zip.toString("utf8", at + 46, at + 46 + nameLen).replace(/\\/g, "/") === path) {
      const from = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28), raw = zip.subarray(from, from + size);
      return method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    }
    at += 46 + nameLen + extra + note;
  }
  return null;
}

/** The keys a built package really carries: what the app installed from it verifies with. */
export const packageKeysFault = (zipBytes, where, expected = PRODUCTION_KEYS) => keysFault((n) => packedFile(zipBytes, `desktop/keys/${n}`)?.toString("utf8") ?? null, where, expected);
