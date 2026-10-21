#!/usr/bin/env node
/**
 * RR-298 C · BUILD THE WINDOWS SETUP. Stages the app (its own Node runtime, the desktop app, the engine's src/ and config/), zips it as the
 * install payload — the same zip is the update package — and compiles installer/Setup.cs with the C# compiler that ships with Windows
 * (.NET Framework 4.x csc.exe), embedding the payload. No paid tool, no download. The Setup.exe is UNSIGNED (a code-signing certificate is
 * a paid owner decision for later), so Windows shows an "unknown publisher" warning.
 *   node desktop/build.mjs --version=1.0.0 --out=<dir> --keys=<dir holding licence-public.pem and update-public.pem>
 * Writes only under --out; an existing output file is never overwritten (the build refuses).
 */
import { cpSync, mkdirSync, existsSync, writeFileSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { compileSetup } from "./installer-compile.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const VERSION = arg("version"), OUT = arg("out"), KEYS = arg("keys");
if (!/^\d+\.\d+\.\d+$/.test(VERSION ?? "") || !OUT || !KEYS) { console.error("usage: node desktop/build.mjs --version=1.0.0 --out=<dir> --keys=<dir>"); process.exit(1); }
const setupExe = join(OUT, `AlmiVisibility-Setup-${VERSION}.exe`), packageZip = join(OUT, `AlmiVisibility-${VERSION}.zip`);
for (const f of [setupExe, packageZip]) if (existsSync(f)) { console.error(`REFUSED — ${f} exists; a build never overwrites a file`); process.exit(2); }
const stage = join(OUT, `stage-${VERSION}`);
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, "runtime"), { recursive: true });
copyFileSync(process.execPath, join(stage, "runtime", "node.exe"));
for (const d of ["src", "config"]) cpSync(join(REPO, d), join(stage, d), { recursive: true });
mkdirSync(join(stage, "desktop", "keys"), { recursive: true });
for (const f of ["main.mjs", "setup.mjs", "licence.mjs", "updater.mjs", "products.mjs", "theme.mjs", "ui.html", "secrets.mjs", "youtube-app.mjs", "youtube-advice.mjs"]) copyFileSync(join(REPO, "desktop", f), join(stage, "desktop", f));
mkdirSync(join(stage, "desktop", "brand"), { recursive: true });
copyFileSync(join(REPO, "desktop", "brand", "almiworld-logo.png"), join(stage, "desktop", "brand", "almiworld-logo.png"));
for (const f of ["licence-public.pem", "update-public.pem"]) copyFileSync(join(KEYS, f), join(stage, "desktop", "keys", f));
writeFileSync(join(stage, "package.json"), JSON.stringify({ name: "almivisibility-app", private: true, type: "module", version: VERSION }, null, 1));
writeFileSync(join(stage, "version.txt"), VERSION);
const ps = (cmd) => execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { stdio: "pipe" });
ps(`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${stage}', '${packageZip}', [IO.Compression.CompressionLevel]::Optimal, $false)`);
writeFileSync(join(OUT, `version-${VERSION}.txt`), VERSION);
compileSetup({ repo: REPO, out: setupExe, payloadZip: packageZip, versionFile: join(OUT, `version-${VERSION}.txt`) }); /* RR-305: the one compile step, shared with the installer test */
rmSync(stage, { recursive: true, force: true });
console.log(`built ${setupExe} (${Math.round(statSync(setupExe).size / 1048576)} MB) · update package ${packageZip} · UNSIGNED`);
