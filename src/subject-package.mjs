/**
 * 🔴 SUBJECT PACKAGES — WHERE SUBJECT-OWNED TOOLING, CONFIGURATION AND VOCABULARY LIVE (F02 relocation, 24 Sep 2026).
 *
 *   Owner decision: _handoffs/AlmiVisibility_OWNER_DECISION_2026-09-24_F02_RELOCATE_SINGLE_CLIENT_TOOLS.md
 *
 * The shared engine carries NO client name, host, private path, regulator vocabulary, subject answer or client-specific
 * expected result. What belongs to one subject lives in `subjects/<id>/`, declared by `subjects/<id>/package.mjs`, which
 * names every file the package owns and the vocabulary shared code must never contain.
 *
 * 🔴 A PACKAGE'S LOCATION OR NAME GRANTS NO TENANT AUTHORITY. This module only LOCATES a package. Every subject-owned
 * tool still enters through the F02 tenant boundary (src/governance/scoped-entry.mjs): no declared `--tenant`, nothing read.
 * Generic: this file names no subject.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const SUBJECTS_DIR = "subjects";
export const PACKAGE_FILE = "package.mjs";
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENGINE_ROOT = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** Every declared package directory, sorted. A directory without a package.mjs is not a package. */
export function subjectPackageIds({ root = ENGINE_ROOT } = {}) {
  const dir = join(root, SUBJECTS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && ID.test(d.name) && existsSync(join(dir, d.name, PACKAGE_FILE))).map((d) => d.name).sort();
}

/**
 * Load one package. Throws — never defaults — when the id is malformed, the package is absent, or its declaration does
 * not name itself: a package that says it is another subject is not that subject's package.
 */
export async function loadSubjectPackage(id, { root = ENGINE_ROOT } = {}) {
  if (typeof id !== "string" || !ID.test(id)) throw new Error(`SUBJECT_PACKAGE_ID_INVALID: ${JSON.stringify(id)} is not a package id`);
  const file = resolve(root, SUBJECTS_DIR, id, PACKAGE_FILE);
  if (!file.startsWith(resolve(root, SUBJECTS_DIR))) throw new Error("SUBJECT_PACKAGE_OUTSIDE_SUBJECTS");
  if (!existsSync(file)) throw new Error(`SUBJECT_PACKAGE_UNDECLARED: no ${SUBJECTS_DIR}/${id}/${PACKAGE_FILE}`);
  const mod = await import(pathToFileURL(file).href);
  const pkg = mod.SUBJECT_PACKAGE;
  if (!pkg || pkg.subjectId !== id) throw new Error(`SUBJECT_PACKAGE_MISDECLARED: ${SUBJECTS_DIR}/${id} does not declare itself as '${id}'`);
  return { ...pkg, dir: resolve(root, SUBJECTS_DIR, id), module: mod };
}

/** Every package, loaded. */
export async function loadAllSubjectPackages({ root = ENGINE_ROOT } = {}) {
  const out = [];
  for (const id of subjectPackageIds({ root })) out.push(await loadSubjectPackage(id, { root }));
  return out;
}
