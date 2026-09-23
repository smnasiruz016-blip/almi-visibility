#!/usr/bin/env node
/**
 * FREEZE ONE CASE STUDY EXHIBIT — the commit AND the artefact, both hashed.
 *
 *   node bin/freeze-exhibit.mjs --spec case-study-01/exhibits/spec.json --confirm
 *
 * ── WHAT AN EXHIBIT IS, AND WHY IT IS TWO THINGS ────────────────────────────
 *
 *   PROVENANCE — the repository and commit the defect was present at, plus the
 *                commit that fixed it. This says WHERE the exhibit came from and
 *                lets anyone re-derive it.
 *   ARTEFACT   — the bytes themselves, copied out of that commit and hashed. This
 *                is what the engine is handed.
 *
 * A commit alone is not an exhibit: repositories move, and a test that depends on
 * a working clone of somebody else's product is not frozen. Bytes alone are not an
 * exhibit either: without the commit nobody can check that they are what they claim
 * to be. **So both, always, each with a SHA-256.**
 *
 * ⚠️ The write law applies at its LOCAL level: `--confirm`, and NOT
 * ALLOW_PROD_WRITE, because this writes files on this machine and nothing else.
 * It only ever READS from the source repositories — `git show`, never a checkout,
 * never a commit, never a push. Reading another product is AlmiVisibility's own
 * work; changing one would be starting a second product.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(n);
  return i === -1 || i + 1 >= argv.length ? d : argv[i + 1];
};
const specPath = flag("--spec", "case-study-01/exhibits/spec.json");
const outRoot = flag("--out", "case-study-01/exhibits");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const FREEZE_INSTANT = governedInstant(Date.now());
const FREEZE_CORRELATION = `run:freeze-exhibit:${FREEZE_INSTANT}`;
/* One governed write per target. The bare mkdirs are gone: each write's prepare step creates its directory. A
 * Buffer is hashed RAW and a string by the text rule — the rule is chosen by what is handed in, never assumed. */
const freezeWrite = (target, bytes, action) => {
  const governed = executeGovernedWrite(governedFileWrite({
    repo: REPO, permission, target, targetClass: "OPERATOR_CHOSEN_OUTPUT", bytes,
    action, occurredAt: FREEZE_INSTANT, correlationId: FREEZE_CORRELATION,
  }));
  if (governed.outcome !== "REFUSED" && governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
    console.error(`🔴 ${governed.outcome} — ${target} was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
  return governed.outcome;
};

if (!existsSync(specPath)) {
  console.error(`spec not found: ${specPath}`);
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, "utf8"));

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Read one path out of a commit WITHOUT touching the repository's working tree. */
function showFile(repo, commit, path) {
  return execFileSync("git", ["-C", repo, "show", `${commit}:${path}`], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: "buffer",
  });
}
function gitLine(repo, commit, format) {
  return execFileSync("git", ["-C", repo, "log", "-1", `--format=${format}`, commit], { encoding: "utf8" }).trim();
}
function listDir(repo, commit, path) {
  return execFileSync("git", ["-C", repo, "ls-tree", "-r", "--name-only", commit, "--", path], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

const index = { frozenAt: new Date().toISOString(), exhibits: [] };

for (const ex of spec.exhibits) {
  const dir = join(outRoot, ex.id);
  console.log(`\n── ${ex.id} — ${ex.repo} @ ${ex.commit} ──`);

  const provenance = {
    id: ex.id,
    red: ex.red,
    defectClass: ex.defectClass,
    repository: ex.repo,
    // The commit the defect is PRESENT at.
    commit: gitLine(ex.repoPath, ex.commit, "%H"),
    commitShort: gitLine(ex.repoPath, ex.commit, "%h"),
    commitSubject: gitLine(ex.repoPath, ex.commit, "%s"),
    commitDate: gitLine(ex.repoPath, ex.commit, "%cI"),
    // The commit that FIXED it — so the exhibit's own claim is checkable.
    fixCommit: ex.fixCommit ? gitLine(ex.repoPath, ex.fixCommit, "%H") : null,
    fixCommitShort: ex.fixCommit ? gitLine(ex.repoPath, ex.fixCommit, "%h") : null,
    fixCommitSubject: ex.fixCommit ? gitLine(ex.repoPath, ex.fixCommit, "%s") : null,
    whyThisCommit: ex.whyThisCommit,
    provenAt: ex.provenAt,
    toolchain: ex.toolchain ?? null,
    artefactComplete: ex.artefactComplete !== false,
    artefactNote: ex.artefactNote ?? null,
    files: [],
    directoryListings: [],
  };

  for (const path of ex.files) {
    const buf = showFile(ex.repoPath, ex.commit, path);
    const target = join(dir, "files", path);
    /* Routed. 🔴 BINARY — `buf` is the file's bytes as git holds them, so it is hashed RAW and never decoded;
     * applying the text rule to an exhibit would change the hash of bytes that never changed. */
    freezeWrite(target, buf, "WRITE_EXHIBIT_FILE");
    provenance.files.push({ path, bytes: buf.length, sha256: sha256(buf) });
    console.log(`  ${String(buf.length).padStart(9)} B  ${sha256(buf).slice(0, 16)}  ${path}`);
  }

  // A directory LISTING is evidence too: RED 4's whole proof is that a directory
  // held two files where nine were needed. An empty-ish directory cannot be
  // captured as bytes, so its listing is captured instead.
  for (const d of ex.directories ?? []) {
    const entries = listDir(ex.repoPath, ex.commit, d);
    const text = entries.join("\n") + "\n";
    const target = join(dir, "listings", `${d.replace(/[\\/]/g, "_")}.txt`);
    freezeWrite(target, text, "WRITE_EXHIBIT_LISTING");
    provenance.directoryListings.push({ directory: d, entries: entries.length, sha256: sha256(Buffer.from(text, "utf8")) });
    console.log(`  listing: ${d} — ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`);
  }

  // A CAPTURED artefact — bytes produced by a build or a fetch rather than read
  // out of a commit. It is already on disk; this hashes it so it is evidence and
  // not just a file. RED 6 needs one, because its defect exists only after a build.
  if (ex.capturedDir) {
    const root = join(dir, ex.capturedDir);
    provenance.capturedArtefact = { directory: ex.capturedDir, howProduced: ex.capturedHow ?? null, files: [] };
    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    if (existsSync(root)) {
      for (const f of walk(root).sort()) {
        const buf = readFileSync(f);
        const rel = f.slice(dir.length + 1).split("\\").join("/");
        provenance.capturedArtefact.files.push({ path: rel, bytes: buf.length, sha256: sha256(buf) });
        console.log(`  captured  ${String(buf.length).padStart(9)} B  ${sha256(buf).slice(0, 16)}  ${rel}`);
      }
    } else {
      console.log(`  🔴 capturedDir ${ex.capturedDir} does not exist`);
    }
  }

  freezeWrite(join(dir, "provenance.json"), JSON.stringify(provenance, null, 2), "WRITE_EXHIBIT_PROVENANCE");
  index.exhibits.push({
    id: ex.id, red: ex.red, repository: ex.repo, commit: provenance.commitShort,
    files: provenance.files.length, listings: provenance.directoryListings.length,
    artefactComplete: provenance.artefactComplete,
  });
  if (!provenance.artefactComplete) console.log(`  🔴 ARTEFACT INCOMPLETE — ${provenance.artefactNote}`);
}

{
  const indexOutcome = freezeWrite(join(outRoot, "index.json"), JSON.stringify(index, null, 2), "WRITE_EXHIBIT_INDEX");
  if (indexOutcome === "REFUSED") console.log("\n[dry-run] nothing written. Add --confirm.");
  else console.log(`\nwrote ${join(outRoot, "index.json")}`);
}
