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
export async function checkForUpdate({ channelUrl, current, publicKeyPem }) {
  let m;
  try { const r = await fetch(new URL("manifest.json", channelUrl)); if (!r.ok) throw new Error(String(r.status)); m = await r.json(); }
  catch { return { state: "UNREACHABLE", line: "The update channel could not be reached — Visibility keeps working on this version." }; }
  if (!verifyManifest(m, publicKeyPem)) return { state: "REFUSED", line: "An update was offered, but its signature does not verify — it is refused and not downloaded." };
  if (!newer(m.version, current)) return { state: "UP_TO_DATE", manifest: m, line: `Visibility ${current} is up to date.` };
  return { state: "AVAILABLE", manifest: m, line: `Visibility ${m.version} is available (you have ${current}). It installs only when you agree; your data is kept.` };
}

/** Download and verify the package into the data folder's updates/ (an existing file is verified, never overwritten). */
export async function downloadUpdate({ channelUrl, manifest, dataDir, publicKeyPem }) {
  if (!verifyManifest(manifest, publicKeyPem)) return { ok: false, why: "the manifest's signature does not verify" };
  const dir = join(dataDir, "updates"); mkdirSync(dir, { recursive: true });
  const file = join(dir, `AlmiVisibility-${manifest.version}.zip`);
  const bytes = existsSync(file) ? readFileSync(file) : Buffer.from(await (await fetch(new URL(manifest.package, channelUrl))).arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== manifest.sha256) return { ok: false, why: "the downloaded package does not match its signed sha256 — refused, not installed" };
  if (!existsSync(file)) writeFileSync(file, bytes, { flag: "wx" });
  return { ok: true, file, version: manifest.version };
}

/** Install a downloaded, verified package — only with the client's agreement. The launcher swaps the program folder after this app exits. */
export function installUpdate({ agreed, file, launcher, quiet = false, verified }) {
  if (agreed !== true) return { ok: false, why: "the client has not agreed — nothing is installed" };
  if (verified !== true) return { ok: false, why: "the package was not verified — nothing is installed" };
  const p = spawn(launcher, ["/apply-update", file, ...(quiet ? ["/S"] : [])], { detached: true, stdio: "ignore", windowsHide: true, cwd: dirname(launcher) });
  p.unref();
  return { ok: true, pid: p.pid };
}
