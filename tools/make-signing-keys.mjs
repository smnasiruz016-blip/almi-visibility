#!/usr/bin/env node
/**
 * RR-303 F · FOR THE OWNER: make the TWO real signing key pairs (Ed25519) — the licence key (the site signs every licence answer) and the
 * update key (every update manifest is signed). Run it once, on your own computer:
 *   node tools/make-signing-keys.mjs <a NEW folder you choose, outside every repository>
 * It writes licence-private.pem, licence-public.pem, update-private.pem, update-public.pem there and prints NO key.
 *   · licence-private.pem → its whole text goes into Vercel as LICENCE_SIGNING_KEY (by you).
 *   · update-private.pem  → stays with you; it signs each update's manifest.
 *   · the two -public.pem files → give the FOLDER to the Setup build (node desktop/build.mjs --keys=<folder>); the build copies only them.
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/make-signing-keys.mjs <a new folder outside every repository>"); process.exit(2); }
if (existsSync(dir) && readdirSync(dir).length) { console.error(`REFUSED — ${dir} is not empty; existing keys are never overwritten`); process.exit(2); }
mkdirSync(dir, { recursive: true });
for (const name of ["licence", "update"]) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, `${name}-private.pem`), privateKey.export({ type: "pkcs8", format: "pem" }), { flag: "wx", mode: 0o600 });
  writeFileSync(join(dir, `${name}-public.pem`), publicKey.export({ type: "spki", format: "pem" }), { flag: "wx" });
}
console.log(`made 2 key pairs in ${dir} (licence, update). No key was printed. Keep the two -private.pem files private.`);
