#!/usr/bin/env node
/**
 * RR-304 · FOR THE OWNER: make AlmiWorld's OWNER licence — the unlimited plan, no expiry, no payment, licensee "AlmiWorld (owner)" —
 * signed with the licence signing key in the folder you name, written as the text you paste in the app's "Your plan".
 *   node tools/make-owner-licence.mjs --keys=<the folder holding licence-private.pem and licence-public.pem> --out=<a new .txt file>
 * The licence works only in a Setup built with the SAME folder's licence-public.pem: one made with the test keys never works on a real build.
 * It prints NO licence text and no licence id; an existing file is never overwritten. The file is read back and verified before it says done.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { makeOwnerLicence } from "../services/licence/service.mjs";
import { ownerLicenceText, readOwnerLicenceText, verifyLicence, isOwnerLicence } from "../desktop/licence.mjs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const KEYS = arg("keys"), OUT = arg("out");
if (!KEYS || !OUT) { console.error("usage: node tools/make-owner-licence.mjs --keys=<folder with licence-private.pem and licence-public.pem> --out=<new file>"); process.exit(2); }
if (existsSync(OUT)) { console.error(`REFUSED — ${OUT} exists; a licence file is never overwritten`); process.exit(2); }
const priv = join(KEYS, "licence-private.pem"), pub = join(KEYS, "licence-public.pem");
if (!existsSync(priv) || !existsSync(pub)) { console.error(`REFUSED — ${KEYS} must hold licence-private.pem and licence-public.pem`); process.exit(2); }
const signed = makeOwnerLicence({ privateKeyPem: readFileSync(priv, "utf8"), now: Date.now() });
writeFileSync(OUT, [
  "AlmiVisibility — OWNER LICENCE (AlmiWorld, unlimited, no expiry)",
  "Paste the line below in the app: Your plan — add your licence key → Licence key → Save.",
  "This is a licence, not an API key. Keep it private: whoever has it gets the unlimited plan until it is revoked in the admin.",
  "",
  ownerLicenceText(signed),
  "",
].join("\r\n"), { flag: "wx" });
/* read back: the file holds exactly one owner licence, and the public key beside the private key verifies it */
const line = readFileSync(OUT, "utf8").split(/\r?\n/).find((l) => l.startsWith("avo_"));
const back = readOwnerLicenceText(line);
const ok = Boolean(back && isOwnerLicence(back.licence) && verifyLicence(back, readFileSync(pub, "utf8")));
console.log(ok ? `made the owner licence in ${OUT} — read back and verified with ${pub}. No licence text was printed.` : `FAILED — ${OUT} was written but does not verify`);
process.exit(ok ? 0 : 1);
