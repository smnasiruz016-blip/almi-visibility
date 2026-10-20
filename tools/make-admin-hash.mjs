#!/usr/bin/env node
/**
 * RR-303 F · FOR THE OWNER: make the admin password's HASH for the site (the value of SITE_ADMIN_PASSWORD_HASH).
 *   node tools/make-admin-hash.mjs
 * You type the password twice; nothing you type is shown on the screen, written to a file or sent anywhere. It prints ONLY the hash
 * (scrypt$<salt>$<hash>) — that is what goes into Vercel. The password itself never leaves this window.
 */
import { createInterface } from "node:readline";
import { hashPassword } from "../site/leads.mjs";

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(question); };
    rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}
const a = await askHidden("Admin password (hidden): ");
const b = await askHidden("Type it again (hidden):  ");
if (a !== b) { console.error("The two passwords are not the same. Nothing was made."); process.exit(1); }
if (a.length < 12) { console.error("Use at least 12 characters. Nothing was made."); process.exit(1); }
console.log("\nSITE_ADMIN_PASSWORD_HASH =");
console.log(hashPassword(a));
console.log("\nCopy the line above (it starts with scrypt$) into Vercel. Keep the password itself to yourself.");
