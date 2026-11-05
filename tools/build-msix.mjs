#!/usr/bin/env node
/**
 * 🔴 RR-375 item 10 · THE MICROSOFT STORE PACKAGE. From a finished REAL update package (AlmiVisibility-<version>.zip) it lays out the program as installed, adds the Store's manifest and images, and packs an .msix with Microsoft's own MakeAppx. It submits nothing and signs nothing: Partner Center signs a Store package.
 *   node tools/build-msix.mjs --zip=<AlmiVisibility-x.y.z.zip> --out=<new folder> --makeappx=<makeappx.exe> [--config=installer/msix-config.json] [--test-values]
 * The three identity values come from installer/msix-config.json, which the owner fills from Partner Center. While they are placeholders the build is REFUSED; --test-values builds with made-up values, to prove the package, and names its file ...-TEST-VALUES.msix: such a file can never pass Partner Center. An existing output is never overwritten.
 * Pure parts are exported for the tests.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const TEST_VALUES = Object.freeze({ packageIdentityName: "AlmiWorld.AlmiVisibilityTest", publisher: "CN=00000000-0000-0000-0000-000000000000", publisherDisplayName: "AlmiWorld Test" });
const PLACEHOLDER = /^FILL_IN/;
/** why this config cannot build a real package, or null */
export function configFault(c) {
  for (const k of ["packageIdentityName", "publisher", "publisherDisplayName"]) if (!String(c?.[k] ?? "").trim() || PLACEHOLDER.test(c[k])) return `${k} is not filled in yet (installer/msix-config.json, from Partner Center > Product identity)`;
  if (!/^[A-Za-z0-9.-]{3,50}$/.test(c.packageIdentityName)) return "packageIdentityName may hold only letters, digits, dots and hyphens, 3 to 50 of them";
  if (!/^CN=/.test(c.publisher)) return "publisher must start with CN= exactly as Partner Center shows it";
  return null;
}
/** the Store asks for four numbers, the last one 0 */
export const storeVersion = (v) => { if (!/^\d+\.\d+\.\d+$/.test(v)) throw new Error(`not a version: ${v}`); return `${v}.0`; };
export const manifest = ({ c, version }) => `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10" xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10" xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities" IgnorableNamespaces="uap rescap">
  <Identity Name="${esc(c.packageIdentityName)}" Publisher="${esc(c.publisher)}" Version="${storeVersion(version)}" ProcessorArchitecture="x64"/>
  <Properties>
    <DisplayName>${esc(c.displayName ?? "AlmiVisibility")}</DisplayName>
    <PublisherDisplayName>${esc(c.publisherDisplayName)}</PublisherDisplayName>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0"/>
  </Dependencies>
  <Resources><Resource Language="en-us"/></Resources>
  <Applications>
    <Application Id="AlmiVisibility" Executable="AlmiVisibility.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="${esc(c.displayName ?? "AlmiVisibility")}" Description="${esc(c.description ?? "AlmiVisibility")}" BackgroundColor="transparent" Square150x150Logo="Assets\\Square150x150Logo.png" Square44x44Logo="Assets\\Square44x44Logo.png">
        <uap:DefaultTile Wide310x150Logo="Assets\\Wide310x150Logo.png"/>
      </uap:VisualElements>
    </Application>
  </Applications>
  <Capabilities>
    <Capability Name="internetClient"/>
    <rescap:Capability Name="runFullTrust"/>
  </Capabilities>
</Package>
`;
export const IMAGES = Object.freeze({ "StoreLogo.png": [50, 50], "Square44x44Logo.png": [44, 44], "Square150x150Logo.png": [150, 150], "Wide310x150Logo.png": [310, 150] });
const psq = (s) => `'${String(s).replace(/'/g, "''")}'`;
/** the images, drawn from the app's own logo by Windows itself */
const drawImages = (logo, dir) => { const lines = ["Add-Type -AssemblyName System.Drawing", `$src=[Drawing.Image]::FromFile(${psq(logo)})`]; for (const [name, [w, h]] of Object.entries(IMAGES)) lines.push(`$b=New-Object Drawing.Bitmap ${w},${h}; $g=[Drawing.Graphics]::FromImage($b); $g.InterpolationMode='HighQualityBicubic'; $s=[Math]::Min(${w}/$src.Width,${h}/$src.Height); $dw=[int]($src.Width*$s); $dh=[int]($src.Height*$s); $g.DrawImage($src,[int]((${w}-$dw)/2),[int]((${h}-$dh)/2),$dw,$dh); $b.Save(${psq(join(dir, name))},[Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $b.Dispose()`); lines.push("$src.Dispose()"); execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", lines.join("; ")], { stdio: "pipe" }); };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null, REPO = resolve(dirname(fileURLToPath(import.meta.url)), ".."), ZIP = arg("zip"), OUT = arg("out"), MAKEAPPX = arg("makeappx"), TEST = process.argv.includes("--test-values"), config = JSON.parse(readFileSync(arg("config") ?? join(REPO, "installer", "msix-config.json"), "utf8"));
  if (!ZIP || !OUT || !MAKEAPPX) { console.error("usage: node tools/build-msix.mjs --zip=<AlmiVisibility-x.y.z.zip> --out=<new folder> --makeappx=<makeappx.exe> [--test-values]"); process.exit(1); }
  const version = /AlmiVisibility-(\d+\.\d+\.\d+)\.zip$/.exec(ZIP)?.[1]; if (!version) { console.error("REFUSED: the zip's name must be AlmiVisibility-x.y.z.zip"); process.exit(1); }
  const c = TEST ? { ...config, ...TEST_VALUES } : config, fault = configFault(c); if (fault) { console.error(`REFUSED: ${fault}. Nothing was built.`); process.exit(4); }
  const file = join(OUT, `AlmiVisibility-${version}${TEST ? "-TEST-VALUES" : ""}.msix`); if (existsSync(file)) { console.error(`REFUSED: ${file} exists; a build never overwrites a file.`); process.exit(4); }
  const tmp = join(OUT, `layout-${version}`), un = join(OUT, `unpacked-${version}`); rmSync(tmp, { recursive: true, force: true }); rmSync(un, { recursive: true, force: true }); mkdirSync(join(tmp, "Assets"), { recursive: true });
  /* as installed: the launcher beside its app folder */
  execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath ${psq(ZIP)} -DestinationPath ${psq(join(tmp, "app"))}`], { stdio: "pipe" });
  cpSync(join(tmp, "app", "launcher", "AlmiVisibility.exe"), join(tmp, "AlmiVisibility.exe")); rmSync(join(tmp, "app", "launcher"), { recursive: true, force: true });
  writeFileSync(join(tmp, "app", "store-build.txt"), "Updates come from the Microsoft Store.\n"); writeFileSync(join(tmp, "AppxManifest.xml"), manifest({ c, version }));
  drawImages(join(REPO, "desktop", "brand", "almiworld-logo.png"), join(tmp, "Assets"));
  const packed = execFileSync(MAKEAPPX, ["pack", "/d", tmp, "/p", file, "/o"], { encoding: "utf8", stdio: "pipe" });
  /* MakeAppx checks the manifest against Microsoft's schema when it packs; unpacking proves the file reads back */
  execFileSync(MAKEAPPX, ["unpack", "/p", file, "/d", un, "/o"], { encoding: "utf8", stdio: "pipe" });
  for (const f of ["AppxManifest.xml", "AlmiVisibility.exe", "AppxBlockMap.xml", join("app", "version.txt"), join("app", "store-build.txt"), join("app", "desktop", "main.mjs"), join("app", "runtime", "node.exe")]) if (!existsSync(join(un, f))) { console.error(`NOT VALID: ${f} is not in the package.`); process.exit(5); }
  rmSync(un, { recursive: true, force: true }); rmSync(tmp, { recursive: true, force: true });
  console.log(`built ${file}${TEST ? " (TEST VALUES: never for Partner Center)" : ""}. ${String(packed).trim().split(/\r?\n/).pop()}`);
}
