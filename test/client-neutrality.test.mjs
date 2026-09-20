/**
 * 🔴 E13 — THE CLIENT-SPECIFIC LEAK CENSUS, AS A TEST THAT FAILS THE BUILD.
 *
 * The engine is a standalone, product-neutral, multi-client product. The only material connected to
 * it today happens to belong to one estate, and that is an accident of what has been connected. The
 * moment a hostname, a product id or a folder name from that estate appears in production code, the
 * accident has become an assumption, and the next client arrives to find the engine already knows
 * who it is supposed to be looking at.
 *
 * ── WHAT THIS SEARCHES, AND WHAT IT DELIBERATELY DOES NOT ──────────────────
 *
 * PRODUCTION only: `src/`, `bin/`, `config/`. Test material and fixtures are listed separately and
 * are NOT failures — a test must be able to name a real string to prove something about it, and a
 * census that forbade that would be a census nobody could write a test for.
 *
 * 🔴 IT SEARCHES BY SHAPE, NOT BY A LIST OF KNOWN CLIENTS. A census keyed to today's client names
 * is a client-specific rule about client-specific rules: it would pass forever for client number
 * two. So it looks for the SHAPES a leak takes — a hostname literal, a bare registrable domain, a
 * declared-subject id — and each pattern is proved against a planted control before any zero from it
 * is believed.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { availableSubjects } from "../src/subject-roots.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_DIRS = ["src/", "bin/", "config/"];

/** Every committed file under a production directory. */
function productionFiles() {
  return execFileSync("git", ["-C", REPO, "ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n").filter(Boolean)
    .filter((f) => PRODUCTION_DIRS.some((d) => f.startsWith(d)))
    .filter((f) => f.endsWith(".mjs") || f.endsWith(".js"));
}

/**
 * The leak shapes. Each is a pattern plus a control line that MUST match it — if a control ever
 * stops matching, the pattern has rotted and its zero means nothing.
 */
const SHAPES = [
  /* 🔴 THE FIRST DRAFT OF THIS PATTERN MATCHED `"facts.json"` AND `"evidence.md"`, and reported 178
   * files' worth of leaks that were filenames. A census that cries wolf gets its exclusions widened
   * until it catches nothing, so it is narrowed here instead — to a scheme, or to a bare name whose
   * last label is an actual top-level domain rather than a file extension. */
  {
    id: "origin-literal",
    what: "a URL origin written into production code",
    re: /["'`]https?:\/\/[a-z0-9]/i,
    control: 'const site = "https://almioet.almiworld.com";',
  },
  {
    id: "hostname-literal",
    what: "a bare hostname written into production code",
    re: /["'`][a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(?:com|org|net|io|dev|co|uk|ai|app|invalid|example|test|local)["'`]/i,
    control: 'const host = "almioet.almiworld.com";',
  },
  {
    id: "origin-in-template",
    what: "an origin assembled in a template literal",
    re: /`https?:\/\/\$\{[^}]+\}\.[a-z]/i,
    control: "const origin = `https://${sub}.almiworld.com`;",
  },
  {
    id: "hostname-collection",
    what: "an array or map of hostnames — an allowlist by another name",
    re: /(?:HOSTS|HOSTNAMES|DOMAINS|ORIGINS|SITES)\s*=\s*[[{]/,
    control: "const SITEMAP_HOSTS = [",
  },
];

/**
 * Names that CANNOT belong to a client, by standard rather than by our say-so: the loopback host,
 * and the domains RFC 2606 and RFC 6761 reserve for documentation and testing. Skipping these is
 * not an exception carved to let something through — a `.invalid` name is guaranteed never to
 * resolve, so it cannot be anybody's site.
 */
const RESERVED_NON_CLIENT = /localhost|127\.0\.0\.1|\.invalid\b|\bexample\.(?:com|org|net)\b|\.test\b|\.local\b/i;

/* A declared-subject id appearing in production code is its own shape, built from what is actually
 * declared rather than from a name this file knows. */
const subjectIdShape = () => {
  const ids = availableSubjects().filter((id) => !id.startsWith("neutral-test-"));
  return ids.length === 0 ? null : {
    id: "declared-subject-id",
    what: "the id of a declared subject, written into production code",
    re: new RegExp(`["'\`](?:${ids.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})["'\`]`),
    control: `const p = ${JSON.stringify(ids[0])};`,
  };
};

test("E13 — every leak shape is proved against a planted control before any zero is believed", () => {
  const shapes = [...SHAPES, subjectIdShape()].filter(Boolean);
  for (const s of shapes) {
    assert.ok(s.re.test(s.control), `the ${s.id} pattern no longer matches its own control — its zero would be worthless`);
  }
  assert.ok(shapes.length >= 4, `expected at least four leak shapes, have ${shapes.length}`);
});

test("E13 — no client hostname, origin, subject id or allowlist in production code", () => {
  const shapes = [...SHAPES, subjectIdShape()].filter(Boolean);
  const files = productionFiles();
  assert.ok(files.length > 100, `the census searched only ${files.length} production files — too few to believe a zero`);

  const hits = [];
  for (const rel of files) {
    const text = readFileSync(join(REPO, rel), "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      /* A comment may discuss a hostname; only CODE may not contain one. The check is deliberately
       * crude — a line whose first non-space characters open a comment — because a clever exception
       * here is how a real leak eventually hides inside a doc block. */
      const t = line.trim();
      if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) continue;
      if (RESERVED_NON_CLIENT.test(t)) continue;
      for (const s of shapes) {
        if (s.re.test(line)) hits.push(`${rel}:${i + 1} [${s.id}] ${t.slice(0, 120)}`);
      }
    }
  }

  assert.deepEqual(hits, [], `client-specific material in production code (${files.length} files searched):\n  ${hits.join("\n  ")}`);
});

test("E13 — no per-resourceKind branch changes an outcome in the resolver", async () => {
  const src = readFileSync(join(REPO, "src/tenancy/resolver.mjs"), "utf8");
  const { RESOURCE_KINDS } = await import("../src/tenancy/resolver.mjs");

  /* A branch on a kind's VALUE is the thing forbidden: `=== "SITE_ORIGIN"`, a switch on it, or a
   * lookup table keyed by it that returns behaviour. The vocabulary list itself is not a branch. */
  const lines = src.split("\n");
  const offenders = [];
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) continue;
    for (const kind of RESOURCE_KINDS) {
      if (new RegExp(`(?:===|!==|case\\s+|\\?\\?|&&|\\|\\|)\\s*["'\`]${kind}["'\`]`).test(t)) offenders.push(`resolver.mjs:${i + 1} ${t.slice(0, 120)}`);
    }
  }
  assert.deepEqual(offenders, [], `the resolver branches on a resourceKind value:\n  ${offenders.join("\n  ")}`);

  /* POSITIVE CONTROL: the same detector catches a planted branch. */
  const planted = `  if (resourceKind === "${RESOURCE_KINDS[0]}") return answer("RESOLVED", null, null, null);`;
  let caught = false;
  for (const kind of RESOURCE_KINDS) {
    if (new RegExp(`(?:===|!==|case\\s+|\\?\\?|&&|\\|\\|)\\s*["'\`]${kind}["'\`]`).test(planted)) caught = true;
  }
  assert.ok(caught, "the per-kind branch detector does not catch a planted branch — its zero would be worthless");
});
