#!/usr/bin/env node
/**
 * RR-338 · FOR THE OWNER (the website's own owner script, like owner-router-register.mjs — not engine code): get one built Setup ready
 * for the sales site's download and update channel, a GitHub release.
 *   node site/owner-release.mjs --from=<the folder desktop/build.mjs wrote> --keys=<your keys folder> --out=<a NEW empty folder>
 * It writes three files into --out:
 *   · AlmiVisibility-Setup.exe — the Setup, under the one name the site's Download button points to;
 *   · AlmiVisibility-<version>.zip — the update package;
 *   · manifest.json — the update's version, package and sha256, signed with update-private.pem.
 * The private key is read inside this process only. It is never printed, copied or written anywhere.
 * The tool prints the file names and the next steps; it never uploads anything.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { manifestFor } from "../services/update-channel/channel.mjs";
import { verifyManifest } from "../desktop/updater.mjs";

export const SETUP_NAME = "AlmiVisibility-Setup.exe";
export const RELEASES_REPO = "almivisibility-releases";

/** Make the release folder. Returns { ok, version, files } or { ok: false, why }; never a key. */
export function makeRelease({ from, keys, out }) {
  if (!from || !keys || !out) return { ok: false, why: "give --from, --keys and --out" };
  const exe = existsSync(from) ? readdirSync(from).find((f) => /^AlmiVisibility-Setup-\d+\.\d+\.\d+\.exe$/.test(f)) : null;
  if (!exe) return { ok: false, why: `no AlmiVisibility-Setup-<version>.exe in ${from}` };
  const version = exe.match(/(\d+\.\d+\.\d+)/)[1], zip = `AlmiVisibility-${version}.zip`;
  if (!existsSync(join(from, zip))) return { ok: false, why: `${zip} is not beside the Setup in ${from}` };
  for (const k of ["update-private.pem", "update-public.pem"]) if (!existsSync(join(keys, k))) return { ok: false, why: `${k} is not in the keys folder` };
  if (existsSync(out) && readdirSync(out).length) return { ok: false, why: `${out} is not empty — the tool never overwrites a file` };
  const privateKeyPem = readFileSync(join(keys, "update-private.pem"), "utf8");
  const manifest = manifestFor({ version, packageFile: join(from, zip), privateKeyPem });
  /* the app checks with the PUBLIC key it ships; a manifest that would not verify is never written */
  if (!verifyManifest(manifest, readFileSync(join(keys, "update-public.pem"), "utf8"))) return { ok: false, why: "the signed manifest does not verify with update-public.pem — the two keys are not a pair" };
  mkdirSync(out, { recursive: true });
  copyFileSync(join(from, exe), join(out, SETUP_NAME));
  copyFileSync(join(from, zip), join(out, zip));
  writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { ok: true, version, files: [SETUP_NAME, zip, "manifest.json"] };
}

/** The owner's next steps, after OK: the release, then the two Vercel variables (links only, no key). */
export function nextSteps({ version, out, owner = "<your GitHub name>" }) {
  const base = `https://github.com/${owner}/${RELEASES_REPO}/releases/latest/download/`;
  return [
    `1. Once only: gh repo create ${owner}/${RELEASES_REPO} --public --description "AlmiVisibility for Windows — downloads"`,
    `2. gh release create v${version} --repo ${owner}/${RELEASES_REPO} --title "AlmiVisibility ${version}" --notes "AlmiVisibility ${version} for Windows" "${join(out, SETUP_NAME)}" "${join(out, `AlmiVisibility-${version}.zip`)}" "${join(out, "manifest.json")}"`,
    `3. Vercel → almi-visibility → Production: VISIBILITY_SETUP_URL = ${base}${SETUP_NAME}`,
    `4. Vercel → almi-visibility → Production: VISIBILITY_UPDATE_BASE_URL = ${base}`,
    "5. Deploy again. /download then offers the Setup, and the app finds its updates at /updates/.",
  ];
}

/**
 * RR-341 · --publish: the GitHub part too, with the owner's own `gh` login — the public repo once (if it is not there yet), then the release
 * with the three files. `gh` is run with its arguments as a list (no shell reads them). `run` is handed in (tests answer it locally).
 */
export function publishRelease({ version, out, owner, run = (args) => spawnSync("gh", args, { stdio: "inherit" }).status }) {
  const repo = `${owner}/${RELEASES_REPO}`;
  if (run(["auth", "status"]) !== 0) return { ok: false, why: "gh is not signed in — run: gh auth login" };
  if (run(["repo", "view", repo, "--json", "name"]) !== 0 && run(["repo", "create", repo, "--public", "--description", "AlmiVisibility for Windows — downloads"]) !== 0) return { ok: false, why: `the repository ${repo} could not be made` };
  const files = [SETUP_NAME, `AlmiVisibility-${version}.zip`, "manifest.json"].map((f) => join(out, f));
  if (run(["release", "create", `v${version}`, "--repo", repo, "--title", `AlmiVisibility ${version}`, "--notes", `AlmiVisibility ${version} for Windows`, ...files]) !== 0) return { ok: false, why: `the release v${version} could not be made (if it already exists, nothing was changed)` };
  const base = `https://github.com/${repo}/releases/latest/download/`;
  return { ok: true, setupUrl: `${base}${SETUP_NAME}`, updateBase: base };
}

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = arg("out"), r = makeRelease({ from: arg("from"), keys: arg("keys"), out });
  if (!r.ok) { console.error(`FAILED — ${r.why}. Nothing was written.`); process.exit(1); }
  console.log(`OK — release ${r.version} is ready in ${out}: ${r.files.join(", ")} (manifest signed and verified).`);
  if (process.argv.includes("--publish")) {
    const p = publishRelease({ version: r.version, out, owner: arg("github") ?? "smnasiruz016-blip" });
    if (!p.ok) { console.error(`FAILED — ${p.why}.`); process.exit(1); }
    console.log(`OK — published on GitHub. Now in Vercel → almi-visibility → Production (no secret — plain links):`);
    console.log(`  VISIBILITY_SETUP_URL       = ${p.setupUrl}`);
    console.log(`  VISIBILITY_UPDATE_BASE_URL = ${p.updateBase}`);
  } else for (const line of nextSteps({ version: r.version, out, owner: arg("github") ?? undefined })) console.log(line);
  console.log(`(${basename(out)} holds no key. Only these three files are uploaded.)`);
}
