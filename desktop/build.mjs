#!/usr/bin/env node
/**
 * RR-298 C · BUILD THE WINDOWS SETUP. Stages the app (its own Node runtime, the desktop app, the engine's src/ and config/), zips it as the
 * install payload — the same zip is the update package — and compiles installer/Setup.cs with the C# compiler that ships with Windows
 * (.NET Framework 4.x csc.exe), embedding the payload. No paid tool, no download. RR-342: the Setup.exe is SIGNED when the keys folder
 * holds signing.json (desktop/sign.mjs — no secret in it); without it the Setup is UNSIGNED, so Windows shows an "unknown publisher" warning.
 *   node desktop/build.mjs --version=1.0.0 --out=<dir> --keys=<dir holding licence-public.pem and update-public.pem>
 * Writes only under --out; an existing output file is never overwritten (the build refuses).
 */
import { cpSync, mkdirSync, existsSync, writeFileSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { compileSetup } from "./installer-compile.mjs";
import { readSigning, signFile } from "./sign.mjs"; // RR-342

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
for (const f of ["main.mjs", /* RR-344 */ "article-dest.mjs", /* RR-318 */ "world.mjs", "web-text.mjs", "official.mjs", "page-count.mjs", /* RR-319 */ "lists.mjs", "page-plan.mjs", /* RR-320 */ "universities.mjs", "research5.mjs", /* RR-321 */ "recognition.mjs", "plan-list.mjs", "venues.mjs", "rates.mjs", "questions.mjs", "regulator-read.mjs", /* RR-322 */ "pseo.mjs", "browser-list.mjs", "indexing.mjs", /* RR-323 */ "demand.mjs", "subject-facts.mjs", "samples.mjs", /* RR-324 */ "keyword-db.mjs", "google-ads.mjs", "dataforseo.mjs", "search-power.mjs", "web-ai.mjs", "setup.mjs", "licence.mjs", "updater.mjs", "products.mjs", "theme.mjs", "ui.html", "secrets.mjs", "youtube-app.mjs", /* RR-348 b */ "social-app.mjs", "open-browser.mjs", "youtube-advice.mjs", "site-read.mjs", "product-check.mjs", "google-connect.mjs", "seo-pages.mjs", "features.mjs", /* RR-308 */ "youtube-niche.mjs", "youtube-plan.mjs", "describe.mjs", "publish.mjs", /* RR-310 */ "action-plan.mjs", "submit.mjs", "ai-write.mjs", /* RR-311 */ "youtube-signin.mjs", "youtube-insights.mjs", "ai-coach.mjs", /* RR-315 */ "guides.mjs", /* RR-326 */ "ads-wire.mjs", "keyword-service.mjs", /* RR-326 I */ "kp-file.mjs", /* RR-327 */ "local-pages.mjs", /* RR-328 */ "country-facts.mjs", "fee.mjs", "user-agent.mjs", /* RR-351 */ "facts-file.mjs", /* RR-353 */ "bing-webmaster.mjs", "social-links.mjs"]) copyFileSync(join(REPO, "desktop", f), join(stage, "desktop", f));
/* RR-307: the full site reader shares the public free test's own safety code (public addresses only, robots obeyed) — never a copy of it */
mkdirSync(join(stage, "site"), { recursive: true });
for (const f of [/* RR-348 b: the same caption checks as the website */ "title-check.mjs", "meaning.mjs", "cf-ai.mjs", "free-test.mjs", "leads.mjs", /* RR-326: the keyword service's countries */ "kw-seeds.mjs", /* RR-329: the queue and Google's country ids it reads */ "queue.mjs", "google-countries.json"]) copyFileSync(join(REPO, "site", f), join(stage, "site", f));
/* RR-319 B1: AlmiWorld's own lists (AlmiStudy universities, AlmiSalary job roles, AlmiStudy subjects) — read-only copies, offered to AlmiWorld products */
cpSync(join(REPO, "desktop", "lists"), join(stage, "desktop", "lists"), { recursive: true });
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
/* RR-342: signed when the owner's keys folder holds signing.json (desktop/sign.mjs) — no secret in it; without it, unsigned as before */
const signing = readSigning(KEYS), signed = signing?.ok ? signFile({ cfg: signing.cfg, file: setupExe }) : null;
console.log(`built ${setupExe} (${Math.round(statSync(setupExe).size / 1048576)} MB) · update package ${packageZip} · ${signed ? signed.line : signing ? `NOT signed — ${signing.why}` : "UNSIGNED (no signing.json in the keys folder)"}`);
if (signing && !signed?.ok) process.exit(3); // a signer was asked for: an unsigned Setup is not handed on as if it were signed
