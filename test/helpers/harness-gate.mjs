/**
 * 🔴 RR-247 · THE DELIBERATE-INVOCATION GATE — the FIRST import of every sabotage harness and of every helper that writes or spawns
 * when it is run bare.
 *
 * A bare `node --test` (no file list, or an empty one) falls back to Node's default discovery, and that includes every .mjs under
 * test/ — the harnesses in test/helpers among them. Three times (the RR-230 era, RR-243, RR-246) that put live sabotages into src.
 * Rules did not stop it; this does. ES modules evaluate their imports in order, so when this is the first import nothing else in the
 * harness has run yet: without the flag below the process exits 2 at once, changes nothing and says why.
 * Exit 2, never 0 — a refusal must never read as a run that passed.
 *
 *   node test/helpers/<harness>.mjs --deliberate [its own options]
 *
 * The flag is an argument, not an environment variable: it belongs to one invocation and is never inherited by a child process.
 * test/rr247-harness-gate.test.mjs proves the gate (and that no file a bare run discovers writes or spawns without it);
 * test/helpers/rr247-sabotage.mjs proves those tests can fail.
 */
import { pathToFileURL } from "node:url";

export const DELIBERATE_FLAG = "--deliberate";

/* Run on its own (a bare `node --test` discovers this file too) the gate guards nothing and does nothing. */
const ranAlone = typeof process.argv[1] === "string" && pathToFileURL(process.argv[1]).href === import.meta.url;

if (!ranAlone && !process.argv.includes(DELIBERATE_FLAG)) {
  const self = String(process.argv[1] ?? "this file").replace(/\\/g, "/").split("/").slice(-3).join("/");
  process.stderr.write(
    `REFUSED — ${self} is a sabotage harness or a helper that writes, and it runs only when invoked deliberately:\n` +
    `  node ${self} ${DELIBERATE_FLAG} [options]\n` +
    "Nothing was changed. (A bare `node --test` runs every file under test/; this exit stops it here.)\n",
  );
  process.exit(2);
}
