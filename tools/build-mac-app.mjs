/**
 * 🔴 RR-388 PART C · an UNSIGNED Mac app (AlmiVisibility.app) for CI proof only: the same desktop files the Windows package carries, a Mac
 * Node runtime, and Contents/MacOS/AlmiVisibility that runs desktop/mac-launch.mjs. Not signed, not notarised, not for clients: Apple's
 * account is still pending (MAC_STORE_PLAN.md). Windows packaging (desktop/build.mjs, Setup.exe, MSIX) is not touched.
 *   node tools/build-mac-app.mjs --version=1.15.46 --node=<path to the Mac node binary> --out=<empty folder>
 */
import { cpSync, mkdirSync, writeFileSync, copyFileSync, chmodSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), ".."), arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
export function infoPlist(version) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>AlmiVisibility</string>
<key>CFBundleDisplayName</key><string>AlmiVisibility</string>
<key>CFBundleIdentifier</key><string>com.almiworld.almivisibility</string>
<key>CFBundleVersion</key><string>${version}</string>
<key>CFBundleShortVersionString</key><string>${version}</string>
<key>CFBundleExecutable</key><string>AlmiVisibility</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSMinimumSystemVersion</key><string>12.0</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
`;
}
export const LAUNCH_SH = `#!/bin/sh
# AlmiVisibility (unsigned CI build): the bundled Node runs the Mac launcher
HERE="$(cd "$(dirname "$0")" && pwd)"
exec "$HERE/../Resources/runtime/node" "$HERE/../Resources/app/desktop/mac-launch.mjs" "$@"
`;
export function buildMacApp({ version, node, out }) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "") || !node || !out) throw new Error("usage: --version=1.2.3 --node=<mac node> --out=<empty folder>");
  if (existsSync(out) && readdirSync(out).length) throw new Error(`REFUSED: ${out} is not empty`);
  const app = join(out, "AlmiVisibility.app"), C = join(app, "Contents");
  mkdirSync(join(C, "MacOS"), { recursive: true }); mkdirSync(join(C, "Resources", "runtime"), { recursive: true });
  cpSync(join(REPO, "desktop"), join(C, "Resources", "app", "desktop"), { recursive: true });
  for (const d of ["src", "site", "config", "installer"]) if (existsSync(join(REPO, d))) cpSync(join(REPO, d), join(C, "Resources", "app", d), { recursive: true });
  writeFileSync(join(C, "Resources", "app", "version.txt"), version);
  copyFileSync(node, join(C, "Resources", "runtime", "node")); chmodSync(join(C, "Resources", "runtime", "node"), 0o755);
  writeFileSync(join(C, "Info.plist"), infoPlist(version));
  writeFileSync(join(C, "MacOS", "AlmiVisibility"), LAUNCH_SH); chmodSync(join(C, "MacOS", "AlmiVisibility"), 0o755);
  return app;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { console.log(`built ${buildMacApp({ version: arg("version"), node: arg("node"), out: arg("out") })} (UNSIGNED, CI proof only)`); } catch (e) { console.error(e.message); process.exit(2); } }
