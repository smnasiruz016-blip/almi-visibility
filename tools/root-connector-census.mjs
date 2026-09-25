#!/usr/bin/env node
/**
 * 🔴 F03 · ROOT AND CONNECTOR CENSUS — every place production code locates a root, reads a subject, or reaches outside the
 * machine, each classified, remainder 0. A BYPASS is a finding.
 *
 *   node tools/root-connector-census.mjs            print the census
 *   node tools/root-connector-census.mjs --check    exit 1 on any BYPASS
 *
 * Acceptance: _handoffs/AlmiVisibility_F03_FROZEN_ACCEPTANCE_2026-09-25.md (f9d1888, contract 4a65924a…).
 *
 * THE FIVE SITE KINDS, AND WHAT MAKES EACH LAWFUL:
 *   CONNECTION   a touch of the global fetch or a browser launch — lawful only in the connector module (the one place a
 *                connector is opened on a decision) or behind a LOCAL-ONLY egress guard (a replay or offline render that
 *                throws on any host that is not this machine)
 *   FETCH_IMPL   a fetch handed to a library by an entry point — lawful only when it is an OPENED connector's fetch
 *   CONNECTOR    an entry point opening a connector — lawful only after its scoped run named RESOURCES.connector
 *   SUBJECT_READ a subject module or descriptor read — lawful only with a decision (importSubjectModule's \`decision\`,
 *                productFromArgv's \`scope\`), and, in an entry point, only after its scoped run named the subject
 *   ROOT         a call of subjectRoots() — lawful only where it is the root registry's own bootstrap, or a CONTAINMENT
 *                check that names the declared root holding a path it was given (it creates nothing)
 *
 * The population is every tracked or new production file under src/, bin/, subjects/ and tools/ (git's own listing, with
 * untracked-but-not-ignored files included, so a new file is counted before it is committed). Comment lines are skipped.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const CONNECTOR_MODULE = "src/tenancy/connectors.mjs";
export const CONNECTION_TOKEN = /globalThis\.fetch\b|(?:^|[^.\w$])fetch\(|fetchImpl\s*[:=]\s*fetch\b|chromium\.launch\(/;
export const LOCAL_EGRESS_GUARD = /\b(LOCAL_ADDRESSES|LOCAL_HOSTS)\.includes\(/;
export const FETCH_IMPL_VALUE = /\bfetchImpl:\s*([^,}]+)/;
export const OPENED_CONNECTOR_FETCH = /openConnector\(|\b[A-Za-z_]*(?:CONNECTOR|connector)\.fetch\b/;
export const SUBJECT_READ = /\b(importSubjectModule|productFromArgvOrExit|productFromArgv)\(/;
export const ROOT_CALL = /\bsubjectRoots\(/;
/** The subjectRoots() call sites that are lawful, each with the reason it creates no root. Anything else is a BYPASS. */
export const ROOT_SITES = Object.freeze({
  "src/subject-roots.mjs": "DEFINITION — the declared roots themselves, and the import hook's containment check (an import may not leave its root)",
  "src/tenancy/resolver.mjs": "BOOTSTRAP — the declaration source and the root registries OF the declared roots; nothing is discovered",
  "src/tenancy/scoped-run.mjs": "CONTAINMENT — names a fact registry by the declared root that contains a path it was handed; creates nothing",
  "src/adapter/external-subject.mjs": "CONTAINMENT — the one declared external root containing a path it was handed, or none; creates nothing",
});
const PRODUCTION_DIRS = ["src/", "bin/", "subjects/", "tools/"];
const isComment = (l) => /^\s*(\*|\/\/|\/\*)/.test(l);

/** The population: tracked and new (not ignored) .mjs files under the production directories. */
export function productionFiles(repo = REPO) {
  const out = execFileSync("git", ["-C", repo, "ls-files", "--cached", "--others", "--exclude-standard", "--", ...PRODUCTION_DIRS], { encoding: "utf8", maxBuffer: 1 << 28 });
  return [...new Set(out.split("\n").filter((f) => f.endsWith(".mjs")))].sort();
}

/**
 * Classify every site in the files given ({ file, text }). Pure — the firing control hands it a stand-in.
 * @returns {{ sites: {file: string, line: number, kind: string, cls: string, why: string}[], files: number }}
 */
export function censusOf(files) {
  const sites = [];
  const add = (file, line, kind, cls, why) => sites.push({ file, line, kind, cls, why });
  for (const { file, text } of files) {
    if (file === "tools/root-connector-census.mjs") continue; // this file's own patterns
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const entry = file.startsWith("bin/") || file.startsWith("subjects/");
    const scopeLine = lines.findIndex((l) => !isComment(l) && /\bscopedEntryPoint\(\{/.test(l));
    const scopeText = scopeLine >= 0 ? lines[scopeLine] : "";
    const localGuard = LOCAL_EGRESS_GUARD.test(text);
    lines.forEach((l, i) => {
      if (isComment(l)) return;
      const n = i + 1;
      if (CONNECTION_TOKEN.test(l)) {
        if (file === CONNECTOR_MODULE) add(file, n, "CONNECTION", "CONNECTOR_MODULE", "the one place a connector is opened on a genuine decision");
        else if (localGuard) add(file, n, "CONNECTION", "LOCAL_ONLY", "behind a local-only egress guard that throws on any host not on this machine");
        else add(file, n, "CONNECTION", "BYPASS", "an external connection constructed outside the connector module");
      }
      const fi = l.match(FETCH_IMPL_VALUE);
      if (fi && entry) {
        if (OPENED_CONNECTOR_FETCH.test(fi[1])) add(file, n, "FETCH_IMPL", "OPENED_CONNECTOR", "an opened connector's fetch");
        else add(file, n, "FETCH_IMPL", "BYPASS", "a fetch handed to a library that is not an opened connector's");
      }
      if (/\bopenConnector\(/.test(l) && !/^\s*import\b/.test(l) && file !== CONNECTOR_MODULE) {
        const decidedFirst = scopeLine >= 0 && scopeLine < i && /RESOURCES\.connector\(/.test(scopeText);
        add(file, n, "CONNECTOR", decidedFirst ? "RESOLVES_FIRST" : "BYPASS", decidedFirst ? "its scoped run named RESOURCES.connector before this line" : "no scoped run naming RESOURCES.connector precedes the connector");
      }
      if (SUBJECT_READ.test(l) && !/^\s*(import|export)\b/.test(l) && !/^\s*(async\s+)?function\b/.test(l)) {
        const carries = /\bdecision\b|\bscope\b/.test(l);
        const decidedFirst = !entry || (scopeLine >= 0 && scopeLine < i && /RESOURCES\.subject\(|everySubjectRegistry\(/.test(scopeText));
        add(file, n, "SUBJECT_READ", carries && decidedFirst ? "DECIDED" : "BYPASS", carries ? (decidedFirst ? "carries the run's decision, and the run named the subject first" : "carries a scope, but no scoped run naming the subject precedes it") : "reads a subject without a decision");
      }
      if (ROOT_CALL.test(l) && !/^\s*import\b/.test(l)) {
        const why = ROOT_SITES[file];
        add(file, n, "ROOT", why ? why.split(" — ")[0] : "BYPASS", why ?? "subjectRoots() called where no root registry lookup governs it");
      }
    });
  }
  return { sites, files: files.length };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const files = productionFiles().map((file) => ({ file, text: readFileSync(join(REPO, file), "utf8") }));
  const { sites } = censusOf(files);
  const by = (k) => sites.filter((s) => s.kind === k);
  const count = (arr, cls) => arr.filter((s) => s.cls === cls).length;
  const bypass = sites.filter((s) => s.cls === "BYPASS");
  console.log(`ROOT AND CONNECTOR CENSUS — ${files.length} production file(s) · ${sites.length} site(s)`);
  for (const k of ["CONNECTION", "FETCH_IMPL", "CONNECTOR", "SUBJECT_READ", "ROOT"]) {
    const s = by(k);
    const classes = [...new Set(s.map((x) => x.cls))].sort();
    console.log(`  ${k.padEnd(13)} ${String(s.length).padStart(3)} = ${classes.map((c) => `${c} ${count(s, c)}`).join(" + ") || "0"}`);
  }
  console.log(`  BYPASS        ${bypass.length}`);
  console.log(`  remainder     ${sites.length - ["CONNECTION", "FETCH_IMPL", "CONNECTOR", "SUBJECT_READ", "ROOT"].reduce((n, k) => n + by(k).length, 0)}`);
  for (const s of sites) console.log(`  ${s.cls.padEnd(17)} ${s.kind.padEnd(12)} ${s.file}:${s.line} — ${s.why}`);
  if (process.argv.includes("--check") && bypass.length) process.exit(1);
}
