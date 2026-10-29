/**
 * RR-342 · CODE SIGNING — one step of desktop/build.mjs once the owner has a certificate (his decision: Certum's cloud certificate or
 * Microsoft's Artifact Signing). The build reads a small file the owner keeps beside his public keys, <keys>\signing.json, which holds NO
 * secret — only which signer and where its tools are — and signs the Setup with Windows' signtool, timestamped, then verifies it:
 *   { "method": "certum", "subject": "<the certificate's name, as SimplySign Desktop shows it>" }
 *       SimplySign Desktop signed in first (the certificate then sits in Windows' own certificate store)
 *   { "method": "artifact", "dlib": "<…\\Azure.CodeSigning.Dlib.dll>", "metadata": "<…\\metadata.json>" }
 *       `az login` first (Artifact Signing reads the Azure sign-in)
 *   optional "signtool": "<…\\signtool.exe>" when it is not found by itself
 * No file → the Setup is built UNSIGNED, as before, and the build says so. A password, PIN or key is never read, held or written here.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, win32 } from "node:path";

export const SIGNING_FILE = "signing.json";
export const TIMESTAMP = Object.freeze({ certum: "http://time.certum.pl", artifact: "http://timestamp.acs.microsoft.com" });

/** the owner's signing.json in the keys folder: null (none — unsigned), or { ok, cfg } / { ok: false, why } */
export function readSigning(keysDir) {
  const f = join(keysDir, SIGNING_FILE);
  if (!existsSync(f)) return null;
  let cfg; try { cfg = JSON.parse(readFileSync(f, "utf8").replace(/^\uFEFF/, "")); } catch { return { ok: false, why: `${SIGNING_FILE} is not JSON` }; }
  if (cfg?.method === "certum" && typeof cfg.subject === "string" && cfg.subject.trim()) return { ok: true, cfg };
  if (cfg?.method === "artifact" && typeof cfg.dlib === "string" && typeof cfg.metadata === "string") return { ok: true, cfg };
  return { ok: false, why: `${SIGNING_FILE} needs "method": "certum" with "subject", or "method": "artifact" with "dlib" and "metadata"` };
}

/** signtool's arguments for one file: SHA-256, RFC 3161 timestamp */
export function signArgs(cfg, file) {
  const common = ["sign", "/fd", "SHA256", "/tr", TIMESTAMP[cfg.method], "/td", "SHA256"];
  if (cfg.method === "certum") return [...common, "/n", cfg.subject, file];
  if (cfg.method === "artifact") return [...common, "/dlib", cfg.dlib, "/dmdf", cfg.metadata, file];
  throw new Error(`unknown signing method ${cfg.method}`);
}

/** signtool.exe: the one named in signing.json, else the newest Windows SDK's x64 one */
export function findSigntool(cfg = {}, { exists = existsSync, list = (d) => readdirSync(d) } = {}) {
  if (cfg.signtool) return exists(cfg.signtool) ? cfg.signtool : null;
  const base = "C:\\Program Files (x86)\\Windows Kits\\10\\bin";
  try { for (const v of list(base).filter((d) => /^10\./.test(d)).sort((a, b) => b.localeCompare(a, "en", { numeric: true }))) { const p = win32.join(base, v, "x64", "signtool.exe"); /* a Windows path, also where the tests run (Linux CI) */ if (exists(p)) return p; } } catch { /* no SDK */ }
  return null;
}

/** sign, then verify (Windows' own trust check); words only */
export function signFile({ cfg, file, signtool = findSigntool(cfg), run = (exe, args) => execFileSync(exe, args, { stdio: "pipe" }) }) {
  if (!signtool) return { ok: false, line: "NOT signed — signtool.exe was not found (install the Windows SDK's signing tools, or name it as \"signtool\" in signing.json)" };
  try { run(signtool, signArgs(cfg, file)); } catch { return { ok: false, line: `NOT signed — signtool refused (${cfg.method === "certum" ? "is SimplySign Desktop signed in?" : "did `az login` run?"})` }; }
  try { run(signtool, ["verify", "/pa", file]); } catch { return { ok: false, line: "signed, but Windows does not trust the signature (signtool verify /pa failed)" }; }
  return { ok: true, line: `SIGNED (${cfg.method}), timestamped, verified` };
}
