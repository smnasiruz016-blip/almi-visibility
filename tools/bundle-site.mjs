#!/usr/bin/env node
/**
 * 🔴 RR-303 F · THE VERCEL BUNDLE OF almivisibility.almiworld.com — PREPARED, NEVER DEPLOYED FROM HERE. This repository deploys nowhere
 * (vercel.json, test/no-deployments.test.mjs, U-DEP-3); the site goes live from a SEPARATE folder this tool writes, only after the owner's
 * GREEN: every module site/app.mjs reaches (followed import by import), its data and images, a Vercel function (api/index.mjs) that runs
 * the same handler, and that folder's own vercel.json (every path to the function; no build step).
 *   node tools/bundle-site.mjs <an EMPTY or new output folder>
 * It refuses a folder that holds anything (it never overwrites a file). It writes no key and reads none.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = ["site/family.generated.json", "site/legal.generated.json", "desktop/brand/almiworld-logo.png", "installer/almiworld.ico"];

/** Every repository file site/app.mjs reaches through static and string imports, and the assets the site reads at runtime. */
export function siteFiles() {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(join(REPO, file), "utf8");
    for (const m of text.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["'](\.{1,2}\/[^"']+)["']/g)) walk(relative(REPO, resolve(REPO, dirname(file), m[1])).replace(/\\/g, "/"));
  };
  walk("site/app.mjs");
  return [...seen, ...ASSETS].sort();
}

export const FUNCTION = `/* RR-303 F · the Vercel function: the same handler the local server runs (site/app.mjs). Keys are read by NAME from the project's environment. */
import { createApp } from "../site/app.mjs";
const handle = createApp();
export default function handler(req, res) { return handle(req, res); }
`;
/* RR-325 · PUBLIC-LITE (the owner's GREEN for this site only, until sales open): the mode is FIXED in the function — no setting on Vercel can
 * turn on download, buy, the licence check or admin; with no limit store the free score stays off and the page still goes live */
export const FUNCTION_LITE = `/* RR-325 · the Vercel function, PUBLIC-LITE: the home page with the free score, the owner's Privacy Policy and Terms of Service; everything else is "not found". */
import { createApp } from "../site/app.mjs";
const handle = createApp({ mode: "public-lite" });
export default function handler(req, res) { return handle(req, res); }
`;
export const VERCELIGNORE = ".env\n.env.*\n";
export const VERCEL_JSON = { $schema: "https://openapi.vercel.sh/vercel.json", functions: { "api/index.mjs": { includeFiles: "{site,src,services,desktop,installer,config}/**", maxDuration: 60 } }, rewrites: [{ source: "/(.*)", destination: "/api/index" }] };
/* RR-326 · PUBLIC-LITE also runs the daily keyword collector: eight daily Vercel Cron runs (each continues where the last stopped — a
 * Hobby project may run each cron once a day), a function long enough for one run (300 s), and the database driver Vercel installs
 * (`pg`, pinned; the engine itself installs nothing — site/kw-store.mjs loads it only when the database is used) */
export const CRONS = Object.freeze(Array.from({ length: 8 }, (_, h) => Object.freeze({ path: "/cron/keywords", schedule: `7 ${h} * * *` })));
/* RR-328 B · the country-facts collector: four short runs a day (each once a day — a Hobby project's rule), after the keyword collector */
export const CF_CRONS = Object.freeze(Array.from({ length: 4 }, (_, h) => Object.freeze({ path: "/cron/country-facts", schedule: `37 ${9 + h} * * *` })));
/* RR-331 · the test-dates collector (two runs a day, after the country facts — what is left of the same daily caps) and our own
 * Search Console (checked daily, read at most once a week) */
export const TD_CRONS = Object.freeze([Object.freeze({ path: "/cron/test-dates", schedule: "37 13 * * *" }), Object.freeze({ path: "/cron/test-dates", schedule: "37 14 * * *" })]);
export const GSC_CRONS = Object.freeze([Object.freeze({ path: "/cron/search-console", schedule: "17 15 * * *" })]);
export const VERCEL_JSON_LITE = { ...VERCEL_JSON, functions: { "api/index.mjs": { ...VERCEL_JSON.functions["api/index.mjs"], maxDuration: 300 } }, crons: [...CRONS, ...CF_CRONS, ...TD_CRONS, ...GSC_CRONS] };
export const LITE_DEPENDENCIES = Object.freeze({ pg: "8.23.1" });
export const OWNER_SCRIPT = "site/owner-google-sign-in.mjs"; // the website's own deployment script — not engine code (F03 C2c's census is the engine's)

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const lite = process.argv.includes("--public-lite"), out = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!out) { console.error("usage: node tools/bundle-site.mjs [--public-lite] <an empty or new output folder>"); process.exit(2); }
  if (existsSync(out) && readdirSync(out).length) { console.error(`REFUSED — ${out} is not empty; the bundle never overwrites a file`); process.exit(2); }
  const files = siteFiles();
  for (const f of files) { mkdirSync(dirname(join(out, f)), { recursive: true }); copyFileSync(join(REPO, f), join(out, f)); }
  mkdirSync(join(out, "api"), { recursive: true });
  writeFileSync(join(out, "api", "index.mjs"), lite ? FUNCTION_LITE : FUNCTION);
  if (lite) { const L = JSON.parse(readFileSync(join(REPO, "site", "legal.generated.json"), "utf8")); for (const k of ["privacy", "terms"]) if (L.fills?.[k]?.length) console.log(`WARNING — /${k} is NOT published (it answers "not found") until the owner fills ${L.fills[k].join(", ")} in his Word file and it is read again (tools/legal-from-docx.mjs).`); }
  writeFileSync(join(out, "vercel.json"), JSON.stringify(lite ? VERCEL_JSON_LITE : VERCEL_JSON, null, 2) + "\n");
  writeFileSync(join(out, ".vercelignore"), VERCELIGNORE); // RR-325: the Vercel CLI writes .env.local into this folder — never uploaded
  writeFileSync(join(out, "package.json"), JSON.stringify({ name: "almivisibility-site", private: true, type: "module", engines: { node: "24.x" }, ...(lite ? { dependencies: { ...LITE_DEPENDENCIES } } : {}) }, null, 2) + "\n");
  if (lite) copyFileSync(join(REPO, OWNER_SCRIPT), join(out, "owner-google-sign-in.mjs")); // RR-326 A: the owner runs it from this folder
  console.log(`bundle${lite ? " (PUBLIC-LITE)" : ""}: ${files.length} file(s) + api/index.mjs + vercel.json + package.json → ${out} · NOT deployed`);
}
