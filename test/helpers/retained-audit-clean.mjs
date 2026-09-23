/**
 * 🔴 F08 §7 · THE BOUNDED CLEANUP FOR A FAILED RUN'S RETAINED EVIDENCE — AN OPERATOR'S ACT, NEVER A TEST'S.
 *
 *   node test/helpers/retained-audit-clean.mjs            list the RETAINED run directories; remove nothing
 *   node test/helpers/retained-audit-clean.mjs --confirm  remove exactly those
 *
 * A test run that FAILS keeps its confined audit store and names it with a RETAINED marker (exit code and pid), so the
 * failure can be read. This removes ONLY directories carrying that marker, ONLY beneath .test-scratch/audit, and only
 * when asked: an unmarked directory is never touched, and nothing is matched by pattern alone. Do not run it while a
 * suite is running — a directory a live run is about to mark would still be there after you listed.
 */
import { removeRetainedRunDirs, retainedRunDirs } from "../../src/governance/governed-run.mjs";

const REPO = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const found = retainedRunDirs({ repo: REPO });
console.log(`RETAINED run directories: ${found.length}`);
for (const f of found) console.log(`  ${f.dir}  (${f.marker})`);
if (process.argv.includes("--confirm")) {
  const removed = removeRetainedRunDirs({ repo: REPO });
  console.log(`removed ${removed.length}`);
} else if (found.length) console.log("dry run — add --confirm to remove exactly these");
