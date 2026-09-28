#!/usr/bin/env node
/**
 * 🔴 F07 AMENDMENT 4 · THE OPERATOR-TOOLING GUARD — refuses a direct read of a governed sealed store outside the governed readers.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F07_ACCEPTANCE_AMENDMENT_4_2026-09-28.md (5afaae5); owner ruling RR-80 §5 (bba3446):
 *   "a limit never licenses the thing it cannot see."
 *
 * Runs as a PreToolUse hook of the operator's assistant tooling: it reads the tool call as JSON on stdin and exits 2 (refuse) or 0
 * (allow). It closes the KNOWN path class of the eight out-of-band reads (_handoffs be583fa): a directory walk, a direct file read
 * and a scratch script, each reaching the store by its located directory, by dereferencing its environment reference, or by
 * calling the sealed-store resolver outside the engine's own reviewed code.
 *
 *   LOCATION                  any string in the tool input contains a located sealed store directory (any slash style, any case)
 *   ENV_REFERENCE_DEREFERENCE any string dereferences a declared store's environment reference ($N ${N} %N% $env:N process.env…)
 *   RESOLVER_OUTSIDE_ENGINE   a command, or a file written outside the engine's reviewed trees, reaches the sealed-store resolver
 *
 * A governed reader (a `node bin/…` entry of the engine) names none of these, so it is allowed. 🔴 A refusal names the RULE and
 * the STORE NAME only — never a location, never a value. Store locations come from the ONE declaration (config/evidence-roles.mjs
 * SEALED_STORE_ROOTS) through the ONE resolver (src/governance/sealed-store-roots.mjs); there is no second copy.
 *
 * LIMIT, stated: a program that finds the store by other means (a copied path typed nowhere in the tool input) is not seen.
 * That limit restricts what this guard observes; it licenses nothing (RR-80 §5).
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";

export const ENGINE_ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
export const GUARD_REFUSAL = "SEALED_STORE_DIRECT_READ_REFUSED";
export const REFUSED_EXIT = 2;
/** The engine trees whose code is reviewed and may name the resolver. Anything written elsewhere may not. */
export const REVIEWED_TREES = Object.freeze(["src", "bin", "tools", "test", "config"]);
const RESOLVER = /sealed-store-roots|resolveSealedStoreRoots|sealedStoreStatus|storeFiles\s*\(/;

/* one form for every spelling of a path: forward slashes, a POSIX-shell drive (/c/…) anywhere in the string written as c:/…,
 * lower case, no trailing slash */
const norm = (s) => String(s).replace(/\\/g, "/").replace(/(^|[\s"'=(:;,])\/([a-zA-Z])\//g, "$1$2:/").toLowerCase().replace(/\/+$/, "");
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every string anywhere in a tool input. */
export function stringsOf(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) stringsOf(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) stringsOf(v, out);
  return out;
}

/** The stores to protect: { name, envName, dir | null }, from the one declaration and the one resolver. */
export function protectedStores({ declared = SEALED_STORE_ROOTS, env = process.env } = {}) {
  const { roots } = resolveSealedStoreRoots({ declared, env });
  return Object.entries(declared ?? {}).map(([name, ref]) => ({ name, envName: ref?.name ?? null, dir: roots[name] ?? null }));
}

const dereferences = (envName) => {
  const n = escape(envName);
  return new RegExp(`\\$${n}\\b|\\$\\{${n}\\}|%${n}%|\\$env:${n}\\b|process\\.env\\.${n}\\b|process\\.env\\[\\s*["'\`]${n}["'\`]\\s*\\]|environ(?:\\.get)?\\(?\\s*\\[?\\s*["']${n}["']|getenv\\(\\s*["']${n}["']`, "i");
};

const insideReviewedTree = (filePath, engineRoot) => {
  if (typeof filePath !== "string" || filePath === "") return false;
  const f = norm(resolvePath(filePath));
  const root = norm(engineRoot);
  return REVIEWED_TREES.some((t) => f.startsWith(`${root}/${t}/`));
};

/**
 * The judgement, pure: { allowed: true } or { allowed: false, rule, store }. `stores` from protectedStores().
 */
export function judgeToolUse({ toolName, toolInput, stores, engineRoot = ENGINE_ROOT }) {
  const strings = stringsOf(toolInput ?? {});
  const normed = strings.map(norm);
  for (const s of stores) {
    if (s.dir) {
      const d = norm(s.dir);
      if (normed.some((x) => x.includes(d))) return { allowed: false, rule: "LOCATION", store: s.name };
    }
    if (s.envName) {
      const re = dereferences(s.envName);
      if (strings.some((x) => re.test(x))) return { allowed: false, rule: "ENV_REFERENCE_DEREFERENCE", store: s.name };
    }
  }
  if (stores.length > 0 && strings.some((x) => RESOLVER.test(x))) {
    const target = toolInput?.file_path ?? toolInput?.notebook_path ?? null;
    const writesReviewedCode = ["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(toolName) && insideReviewedTree(target, engineRoot);
    const readsReviewedCode = ["Read", "Grep", "Glob"].includes(toolName);
    if (!writesReviewedCode && !readsReviewedCode) return { allowed: false, rule: "RESOLVER_OUTSIDE_ENGINE", store: stores[0].name };
  }
  return { allowed: true };
}

/** The refusal message: rule and store name only. */
export const refusalMessage = (j) => `🔴 ${GUARD_REFUSAL} (${j.rule}, store ${j.store}): a governed sealed store is read only through its governed readers (F07 Amendment 4). No location is shown.`;

if (process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input;
  try { input = JSON.parse(readFileSync(0, "utf8")); } catch { process.exit(0); }
  const j = judgeToolUse({ toolName: input?.tool_name, toolInput: input?.tool_input, stores: protectedStores() });
  if (!j.allowed) { process.stderr.write(`${refusalMessage(j)}\n`); process.exit(REFUSED_EXIT); }
  process.exit(0);
}

export const GUARD_ENTRY = join("tools", "sealed-store-read-guard.mjs");
