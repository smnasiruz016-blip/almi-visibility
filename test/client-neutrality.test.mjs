/**
 * 🔴 CLIENT NEUTRALITY — SCOPED TO THE CODE THIS FEATURE OWNS.
 *
 * The engine is a standalone, product-neutral, multi-client product. The only material connected to
 * it today belongs to one estate, and that is an accident of what has been connected. The moment a
 * hostname or a product id appears in code the engine RUNS, the accident has become an assumption,
 * and the next client arrives to find the engine already knows who it is supposed to be looking at.
 *
 * ── WHY THIS FILE POLICES ITS OWN MODULES AND NOT THE WHOLE REPOSITORY ─────
 *
 * 🔴 ITS FIRST VERSION SEARCHED EVERY PRODUCTION FILE AND WENT RED, and that was the correct
 * measurement of the wrong thing. It found 80 line-hits across 13 files — an estate census, a replay
 * harness pinned to real URLs, a source-integrity list, third-party bot documentation — none of it
 * introduced here, and all of it in subsystems this work is not permitted to rewrite. A test that
 * holds one feature responsible for the whole repository's history does not get the history fixed;
 * it gets the test deleted.
 *
 * So the assertion is now the one this feature can actually honour and must never breach: the
 * modules it OWNS carry zero client material. Pre-existing debt elsewhere is measured separately, by
 * a tool that lives outside this repository so it cannot be edited by the change it judges, and is
 * recorded where the owner asked for it rather than registered here — a debt list inside the suite
 * would quietly become the place debt goes to be tolerated.
 *
 * 🔴 EVERY SHAPE IS PROVED AGAINST A PLANTED CONTROL BEFORE ANY ZERO IS BELIEVED. A pattern that has
 * rotted reports the same zero as a file that is genuinely clean.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { RESOURCE_KINDS } from "../src/tenancy/resolver.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The production modules this feature owns: everything it added, plus every production file it
 * modified. This is the feature's SCOPE, not an allowlist of tolerated debt — nothing is exempted
 * from it, and a file only leaves the list by ceasing to exist.
 */
const OWNED = Object.freeze([
  /* 🔴 The answer-evidence module joins the list it must honour, 20 Sep 2026. It reads one client's
   * claims to judge another client's axis if anything goes wrong, so it is exactly the module a host,
   * an authority name or a record id would creep into. It carries none, and now it cannot. */
  "src/discovery/answer-evidence.mjs",
  /* 🔴 The pre-contract ruling module joins the list it must honour, 20 Sep 2026. It encodes an
   * OWNER RULING about evidence, which is exactly the kind of module a client name creeps into — a
   * checker name, a registry id, a hostname in an example. It carries none, and now it cannot. */
  "src/evidence/pre-contract-grandfathering.mjs",
  "src/tenancy/resolver.mjs",
  /* 🔴 Added 21 Sep 2026 by E13a, which refuses to let a new src/tenancy module slip past this census. */
  "src/tenancy/row-partition.mjs",
  "src/tenancy/sitemap-residency.mjs",
  "src/adapter/sitemap-subject.mjs",
  "src/adapter/observed-page-subject.mjs",
  "src/adapter/external-subject.mjs",
  "bin/detect.mjs",
]);

/**
 * Names that cannot belong to a client, by standard rather than by our say-so: the loopback host and
 * the domains RFC 2606 and RFC 6761 reserve for documentation and testing. A `.invalid` name is
 * guaranteed never to resolve, so it cannot be anybody's site. This is a definition, not an excuse.
 */
const RESERVED_NON_CLIENT = /localhost|127\.0\.0\.1|\.invalid\b|\bexample\.(?:com|org|net)\b|\.test\b|\.local\b/i;

/**
 * The leak shapes, each with a control it MUST match.
 *
 * 🔴 THE HOSTNAME PATTERN IS NARROW ON PURPOSE. Its first draft matched any quoted dotted string and
 * reported `"facts.json"` and `"evidence.md"` as client hostnames. A census that cries wolf gets its
 * exclusions widened until it catches nothing, so this one requires a scheme, or a final label that
 * is an actual top-level domain rather than a file extension.
 */
const SHAPES = Object.freeze([
  { id: "origin-literal", what: "a URL origin written into code", re: /["'`]https?:\/\/[a-z0-9]/i, control: 'const site = "https://a-client.almiworld.com";' },
  { id: "hostname-literal", what: "a bare hostname written into code", re: /["'`][a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(?:com|org|net|io|dev|co|uk|ai|app)["'`]/i, control: 'const host = "a-client.almiworld.com";' },
  { id: "origin-in-template", what: "an origin assembled in a template literal", re: /`https?:\/\/\$\{[^}]+\}\.[a-z]/i, control: "const o = `https://${sub}.almiworld.com`;" },
  { id: "hostname-collection", what: "an array or map of hostnames — an allowlist by another name", re: /(?:HOSTS|HOSTNAMES|DOMAINS|ORIGINS|SITES)\s*=\s*[[{]/, control: "const SITEMAP_HOSTS = [" },
  { id: "expected-answer-map", what: "a map of expected answers", re: /(?:EXPECTED|ANSWERS|KNOWN_)\w*\s*=\s*\{/, control: "const EXPECTED_RESULTS = {" },
  { id: "tenant-from-name", what: "a tenant derived from a product, host or repository name", re: /tenantId\s*[:=]\s*(?:\w+\.)?(?:productId|hostname|host|origin|repo|repoName|batchId)\b/, control: "const tenantId = product.productId;" },
]);

/** Every declared subject id is its own shape, built from what is declared rather than from a name. */
function subjectIdShape(ids) {
  const real = ids.filter((id) => !id.startsWith("neutral-test-"));
  if (real.length === 0) return null;
  const alt = real.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return { id: "declared-subject-id", what: "the id of a declared subject, written into code", re: new RegExp(`["'\`](?:${alt})["'\`]`), control: `const p = ${JSON.stringify(real[0])};` };
}

function scan(relPath, shapes) {
  const lines = readFileSync(join(REPO, relPath), "utf8").split("\n");
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    /* A comment may DISCUSS a hostname — this file does. Only code may not contain one. The check is
     * deliberately crude, because a clever exception here is how a real leak hides in a doc block. */
    if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) continue;
    if (RESERVED_NON_CLIENT.test(t)) continue;
    for (const s of shapes) if (s.re.test(lines[i])) hits.push(`${relPath}:${i + 1} [${s.id}] ${t.slice(0, 120)}`);
  }
  return hits;
}

test("every leak shape matches its own planted control — before any zero is believed", async () => {
  const { availableSubjects } = await import("../src/subject-roots.mjs");
  const shapes = [...SHAPES, subjectIdShape(availableSubjects())].filter(Boolean);
  for (const s of shapes) {
    assert.ok(s.re.test(s.control), `the ${s.id} pattern no longer matches its own control — its zero would be worthless`);
  }
  assert.ok(shapes.length >= 7, `expected at least seven leak shapes, have ${shapes.length}`);
});

test("E13a/E13b · the modules this feature owns carry no client material", async () => {
  const { availableSubjects } = await import("../src/subject-roots.mjs");
  const shapes = [...SHAPES, subjectIdShape(availableSubjects())].filter(Boolean);

  /* The population is asserted before it is searched: a list that has quietly emptied reports the
   * same zero as a clean one. */
  for (const f of OWNED) {
    assert.ok(statSync(join(REPO, f)).isFile(), `${f} is in the owned list but is not a file`);
  }
  assert.ok(OWNED.length >= 6, `only ${OWNED.length} owned files — the assertion would police almost nothing`);

  const hits = OWNED.flatMap((f) => scan(f, shapes));
  assert.deepEqual(hits, [], `client-specific material in code this feature owns (${OWNED.length} files searched):\n  ${hits.join("\n  ")}`);
});

test("E13a · every module under src/tenancy/ is covered, so a new one cannot slip past the list", () => {
  const dir = join(REPO, "src", "tenancy");
  const present = readdirSync(dir).filter((f) => f.endsWith(".mjs")).map((f) => `src/tenancy/${f}`).sort();
  const covered = OWNED.filter((f) => f.startsWith("src/tenancy/")).sort();
  assert.deepEqual(present, covered, "a module under src/tenancy/ is not in the owned list — add it, or this census stops policing it");
});

test("E13d · the resolver branches on no resourceKind value", async () => {
  const src = readFileSync(join(REPO, "src/tenancy/resolver.mjs"), "utf8");
  const branchOn = (text) => {
    const out = [];
    text.split("\n").forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
      for (const kind of RESOURCE_KINDS) {
        if (new RegExp(`(?:===|!==|case\\s+|\\?\\?|&&|\\|\\|)\\s*["'\`]${kind}["'\`]`).test(t)) out.push(`resolver.mjs:${i + 1} ${t.slice(0, 120)}`);
      }
    });
    return out;
  };
  assert.deepEqual(branchOn(src), [], "the resolver branches on a resourceKind value — a per-kind rule is a client rule in a schema's clothes");
  /* CONTROL: the same detector catches a planted branch, so the zero above means something. */
  assert.equal(branchOn(`  if (resourceKind === "${RESOURCE_KINDS[0]}") return null;`).length, 1, "the per-kind branch detector does not catch a planted branch");
});
