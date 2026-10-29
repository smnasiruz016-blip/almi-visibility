#!/usr/bin/env node
/**
 * RR-342 follow-up · FOR THE OWNER: put LICENCE_SIGNING_KEY into Vercel straight from licence-private.pem. There is no copy, no paste and no
 * clipboard, so nothing can change the key's line breaks on the way (the owner pasted it twice and the site still could not read it).
 *   node site/owner-set-signing-key.mjs --keys="<your keys folder>" --site="<the deploy folder>"
 * What it does, on this computer only:
 *   1 · reads <keys>\licence-private.pem and checks it is the Ed25519 licence key AND the pair of <keys>\licence-public.pem;
 *   2 · removes the Production LICENCE_SIGNING_KEY of the project linked in --site (the deploy folder);
 *   3 · adds it again as Sensitive, with the key handed to the Vercel CLI on STDIN as ONE line (BEGIN … END, no line breaks — the site
 *       reads that form; RR-342 pemOf).
 * It prints names, verdicts and exit codes only — never the key, a part of it or its length. Then deploy, and /owner says "set".
 */
import { createPrivateKey, createPublicKey } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const NAME = "LICENCE_SIGNING_KEY";

/** the key file's text → { ok, value (one line) } or { ok: false, why } — the value never leaves this process except on STDIN */
export function prepare({ privText, pubText }) {
  let key; try { key = createPrivateKey(privText); } catch { return { ok: false, why: "licence-private.pem could not be read as a private key — is it the file made by tools/make-signing-keys.mjs?" }; }
  if (key.asymmetricKeyType !== "ed25519") return { ok: false, why: "licence-private.pem is not an Ed25519 key — it is not the licence key" };
  let pub; try { pub = createPublicKey(pubText); } catch { return { ok: false, why: "licence-public.pem could not be read" }; }
  if (!createPublicKey(key).export({ type: "spki", format: "der" }).equals(pub.export({ type: "spki", format: "der" }))) return { ok: false, why: "licence-private.pem is not the pair of licence-public.pem in the same folder — the app would refuse every licence" };
  const pkcs8 = key.export({ type: "pkcs8", format: "pem" });
  return { ok: true, value: pkcs8.replace(/\r?\n/g, "").trim() };
}

/** the Vercel CLI, in the deploy folder (its own link names the project); STDIN carries the value; nothing it prints is shown */
const vercel = (siteDir, args, input = "") => spawnSync("npx", ["--yes", "vercel@latest", ...args], { cwd: siteDir, input, shell: true, stdio: ["pipe", "ignore", "ignore"] }).status;

export function setSigningKey({ keysDir, siteDir, run = vercel, log = console.log }) {
  const priv = join(keysDir, "licence-private.pem"), pub = join(keysDir, "licence-public.pem");
  if (!existsSync(priv) || !existsSync(pub)) { log(`REFUSED — ${keysDir} must hold licence-private.pem and licence-public.pem`); return 2; }
  if (!existsSync(join(siteDir, ".vercel"))) { log(`REFUSED — ${siteDir} is not the linked deploy folder (no .vercel link)`); return 2; }
  const p = prepare({ privText: readFileSync(priv, "utf8"), pubText: readFileSync(pub, "utf8") });
  if (!p.ok) { log(`REFUSED — ${p.why}. Nothing was changed in Vercel.`); return 2; }
  log("OK — licence-private.pem is the Ed25519 licence key and the pair of licence-public.pem.");
  const rm = run(siteDir, ["env", "rm", NAME, "production", "--yes"]);
  log(`remove the old ${NAME} (Production): exit ${rm}${rm === 0 ? "" : " (none there, or already gone — going on)"}`);
  const add = run(siteDir, ["env", "add", NAME, "production", "--sensitive"], `${p.value}\n`);
  log(`add ${NAME} (Production, Sensitive) from the file: exit ${add}`);
  if (add !== 0) { log(`FAILED — Vercel did not take it. Run \`npx vercel@latest login\` in ${siteDir} first, then this line again.`); return 3; }
  log(`OK — now deploy: cd "${siteDir}"; npx vercel@latest --prod  → /owner → Launch settings: ${NAME} set`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
  if (!arg("keys") || !arg("site")) { console.error('usage: node site/owner-set-signing-key.mjs --keys="<keys folder>" --site="<deploy folder>"'); process.exit(1); }
  process.exit(setSigningKey({ keysDir: arg("keys"), siteDir: arg("site") }));
}
