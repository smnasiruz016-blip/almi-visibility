/**
 * 🔴 THE PLANTED-BYPASS CONTROL. A zero bypass count proves nothing until the census has been SEEN to refuse.
 *
 * The plant is injected as a FIXED INPUT, in memory. It never writes a byte into bin/ and never touches the git
 * index — the earlier version of this control did both, and a control that has to mutate the repository to run is
 * one bad exit away from leaving a synthetic governed writer behind. Nothing here reaches the production audit
 * trail, because nothing here runs a binary at all.
 *
 * 🔴 PRODUCT-NEUTRAL BY CONSTRUCTION, AND SO IS THIS COMMENT. The first draft of this paragraph ENUMERATED the
 * forbidden vocabulary in order to say it was avoiding it, and the neutrality test failed on this very file — the
 * law becoming its own first offender. The planted source is a generic writer with a generic target; the words
 * themselves are named only in the test, which lives outside the tree this rule polices.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** The synthetic entry point's path. `zz-` keeps it last in any sorted listing, and it exists only in memory. */
export const PLANTED_FILE = "bin/zz-planted-bypass-control.mjs";

/**
 * A governed write that does NOT reach the boundary: it asks the write law, takes a decision, and then mutates
 * durable state directly. That is exactly the shape the bypass census must name.
 */
export const PLANTED_SOURCE = [
  "#!/usr/bin/env node",
  "/** CONTROL ONLY, IN MEMORY — a governed writer that deliberately bypasses the shared boundary. */",
  'import { writeFileSync } from "node:fs";',
  'import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";',
  "",
  "const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));",
  'if (permission.mayWrite) writeFileSync("runs/generated/control-output.json", "{}", "utf8");',
  "",
].join("\n");

/** The real population, read once, with the plant appended. */
export function populationWithPlant() {
  const files = execFileSync("git", ["-C", REPO, "ls-files", "bin"], { encoding: "utf8" })
    .split("\n").filter((p) => p.endsWith(".mjs"));
  const real = files.map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }));
  return { clean: real, planted: [...real, { file: PLANTED_FILE, text: PLANTED_SOURCE }] };
}
