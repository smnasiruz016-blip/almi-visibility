/**
 * 🔴 HOW A TEST REACHES A SUBJECT — THROUGH THE SUBJECT ROOTS, NEVER A PATH BAKED INTO THE TEST.
 *
 * Owner ruling, 14 September 2026: a product's own data left this repository. A test that wrote the new path into
 * itself would be the same weld in a new place, so every test resolves a subject exactly as a runner does — by id,
 * through src/product-cli.mjs and src/subject-roots.mjs.
 */
import { productFromArgv } from "../../src/product-cli.mjs";
import { importSubjectModule, resolveSubject } from "../../src/subject-roots.mjs";

/** The registered descriptor of a subject, by id. */
export const subject = (id) => productFromArgv([`--product=${id}`]);

/** One module inside a subject's folder, by its path inside that folder. */
export const subjectModule = (id, relPath) => importSubjectModule(id, relPath);

/** The folder a subject resolved to. */
export const subjectDir = (id) => resolveSubject(id).dir;
