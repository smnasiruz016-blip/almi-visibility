/**
 * RR-305 · compile installer/Setup.cs into a Setup.exe with its payload — the ONE compile step, used by desktop/build.mjs and by the
 * installer test (test/rr305-installer-takeover.test.mjs), so the tested Setup is compiled exactly as the shipped one. Windows only: the C#
 * compiler that ships with Windows (.NET Framework 4.x csc.exe). No paid tool, no download.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const CSC = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe";
export const REFERENCES = Object.freeze(["System.IO.Compression.dll", "System.IO.Compression.FileSystem.dll", "System.Windows.Forms.dll", "System.Drawing.dll", "Microsoft.CSharp.dll", "System.Core.dll", "System.Management.dll"]);
export const cscAvailable = () => process.platform === "win32" && existsSync(CSC);

export function compileSetup({ repo, out, payloadZip, versionFile }) {
  execFileSync(CSC, ["/nologo", "/target:winexe", `/out:${out}`, ...REFERENCES.map((r) => `/r:${r}`),
    `/resource:${payloadZip},payload.zip`, `/resource:${versionFile},version.txt`, `/resource:${join(repo, "desktop", "brand", "almiworld-logo.png")},almiworld-logo.png`, `/win32icon:${join(repo, "installer", "almiworld.ico")}`, join(repo, "installer", "Setup.cs")], { stdio: "pipe" });
  return out;
}
