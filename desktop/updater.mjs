/**
 * 🔴 AUTO-UPDATE (RR-298 C; owner decision 5). The app checks AlmiWorld's update channel; a NEWER version is downloaded, verified (its
 * sha256 AND the channel's Ed25519 signature over "version\nsha256"), and installed only AFTER THE CLIENT AGREES — by the launcher
 * (AlmiVisibility.exe /apply-update), which swaps the program folder and never touches the client's data folder.
 * The hosted update channel is DEFERRED until the owner's GREEN: in this round the channel is a LOCAL server (services/update-channel).
 * A package that fails its hash or signature is refused and never installed.
 */
import { createHash, verify, createPublicKey } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";

export const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); return false; };
export const signedBytes = (m) => Buffer.from(`${m.version}\n${m.sha256}`);
export function verifyManifest(m, publicKeyPem) {
  try { return typeof m?.signature === "string" && verify(null, signedBytes(m), createPublicKey(publicKeyPem), Buffer.from(m.signature, "base64")); } catch { return false; }
}

/** Ask the channel: { state: UP_TO_DATE | AVAILABLE | UNREACHABLE | REFUSED, manifest?, line } */
/* RR-353 (owner, 31 Oct 2026: "update to 1.15.5 not picked up"): every answer says what happened — the reason when the channel could not be
 * read (its HTTP status, a timeout, no internet), the version found — and never waits for ever (20 s). `fetchImpl` is handed in by tests */
export async function checkForUpdate({ channelUrl, current, publicKeyPem, fetchImpl = fetch }) {
  let m;
  try {
    const r = await fetchImpl(new URL("manifest.json", channelUrl), { cache: "no-store", headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { state: "UNREACHABLE", why: `the update channel answered ${r.status}`, line: `Could not check for updates — the update channel answered ${r.status}. Visibility keeps working on ${current}; try again later.` };
    m = await r.json();
  } catch (e) {
    const why = e?.name === "TimeoutError" ? "no answer within 20 seconds" : e instanceof SyntaxError ? "the channel's answer could not be read" : "no internet connection, or the channel could not be reached";
    return { state: "UNREACHABLE", why, line: `Could not check for updates — ${why}. Visibility keeps working on ${current}; try again later.` };
  }
  if (!verifyManifest(m, publicKeyPem)) return { state: "REFUSED", line: "An update was offered, but its signature does not verify — it is refused and not downloaded." };
  if (!newer(m.version, current)) return { state: "UP_TO_DATE", version: m.version, line: `Visibility ${current} is up to date.` };
  return { state: "AVAILABLE", manifest: m, version: m.version, line: `Visibility ${m.version} is available (you have ${current}). It installs only when you agree; your data is kept.` };
}

/** Download and verify the package into the data folder's updates/ (an existing file is verified, never overwritten). */
/* RR-362 item 6: the download shows how far it is (`onProgress(doneBytes, ofBytes)`) */
async function fetchBytes(url, onProgress) { const r = await fetch(url); const of = Number(r.headers?.get?.("content-length")) || 0; if (!onProgress || !r.body?.getReader) return Buffer.from(await r.arrayBuffer()); const rd = r.body.getReader(), parts = []; let done = 0; for (;;) { const x = await rd.read(); if (x.done) break; parts.push(Buffer.from(x.value)); done += x.value.length; onProgress(done, of); } return Buffer.concat(parts); }
export async function downloadUpdate({ channelUrl, manifest, dataDir, publicKeyPem, onProgress = null }) {
  if (!verifyManifest(manifest, publicKeyPem)) return { ok: false, why: "the manifest's signature does not verify" };
  const dir = join(dataDir, "updates"); mkdirSync(dir, { recursive: true });
  const file = join(dir, `AlmiVisibility-${manifest.version}.zip`);
  const bytes = existsSync(file) ? readFileSync(file) : await fetchBytes(new URL(manifest.package, channelUrl), onProgress);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== manifest.sha256) return { ok: false, why: "the downloaded package does not match its signed sha256 — refused, not installed" };
  if (!existsSync(file)) writeFileSync(file, bytes, { flag: "wx" });
  return { ok: true, file, version: manifest.version };
}

/** Install a downloaded, verified package — only with the client's agreement. The launcher swaps the program folder after this app exits. */
/* RR-362 item 1: "/same-window": the launcher keeps the app's window open; the app comes back on the same port and the window reloads itself */
export function installUpdate({ agreed, file, launcher, quiet = false, verified, extra = [] }) {
  if (agreed !== true) return { ok: false, why: "the client has not agreed — nothing is installed" };
  if (verified !== true) return { ok: false, why: "the package was not verified — nothing is installed" };
  const p = spawn(launcher, ["/apply-update", file, "/same-window", ...(quiet ? ["/S"] : []), ...extra], { detached: true, stdio: "ignore", windowsHide: true, cwd: dirname(launcher) });
  p.unref();
  return { ok: true, pid: p.pid };
}
