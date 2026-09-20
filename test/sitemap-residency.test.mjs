/**
 * 🔴 THE RESIDENCY GUARD — FIVE CASES, EACH DRIVEN BY A REAL INPUT.
 *
 * A guard branch that no input can reach is a comment. Each of the five cases below is therefore
 * driven by an actual artefact rather than asserted about, and the two that must be forbidden are
 * built from the SHAPE of a real capture record so the guard is tested against the thing it exists
 * to catch — including the renamed one, which is the case a path-keyed rule would miss entirely.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { classifySitemapArtifact, isSitemapCaptureRecord, declaresSynthetic, RESIDENCY, SITEMAP_CAPTURE_METHOD } from "../src/tenancy/sitemap-residency.mjs";
import { sitemapResidencyCensus } from "../tools/sitemap-residency-census.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The shape a real capture record has: a collector method and a stored URL population. */
const realRecord = (origin) => JSON.stringify({
  record_type: "observation",
  observation_id: "0b0def1b0c54d6ac",
  method: SITEMAP_CAPTURE_METHOD,
  observed_at: "2026-09-12T02:57:34.781Z",
  target: { kind: "url", ref: `${origin}/sitemap-index.xml` },
  content_sha256: "9510fcd047d5ab8ba33badc91428aa653caeecf52cfe62cdb53879923ee862cf",
  value: { origin, rootUrl: `${origin}/sitemap-index.xml`, urls: [`${origin}/`, `${origin}/pricing`], urlsTotal: 2 },
});

/** The same shape, DECLARING itself test material. */
const syntheticRecord = (origin) => {
  const r = JSON.parse(realRecord(origin));
  r.synthetic = true;
  return JSON.stringify(r);
};

test("a · a generic synthetic sitemap fixture is ALLOWED — because it declares itself", () => {
  const origins = ["https://harbourline-registry.invalid", "https://second-client.invalid"];
  const content = origins.map(syntheticRecord).join("\n");
  assert.equal(classifySitemapArtifact({ content }), "ALLOWED_FIXTURE");

  /* 🔴 AND THE DECLARATION IS WHAT DID IT — the same records without it are forbidden. Built by
   * dropping the field from the parsed record rather than by string surgery on the serialised form:
   * the first version of this control searched for `"synthetic":true,` and matched nothing, because
   * the key serialises last. It passed while proving the opposite of what it claimed. */
  const undeclared = origins.map((o) => {
    const r = JSON.parse(syntheticRecord(o));
    delete r.synthetic;
    return JSON.stringify(r);
  }).join("\n");
  assert.ok(!undeclared.includes("synthetic"), "the control still declares itself — it would prove nothing");
  assert.equal(classifySitemapArtifact({ content: undeclared }), "FORBIDDEN_REAL_OBSERVATIONS");

  /* One undeclared record among declared ones forbids the whole file — the declared ones do not
   * launder it. */
  const mixed = [syntheticRecord(origins[0]), undeclared.split("\n")[1]].join("\n");
  assert.equal(classifySitemapArtifact({ content: mixed }), "FORBIDDEN_REAL_OBSERVATIONS");
});

test("b · real sitemap observations inside the engine are FORBIDDEN", () => {
  const content = realRecord("https://a-client.example.org");
  assert.equal(classifySitemapArtifact({ content }), "FORBIDDEN_REAL_OBSERVATIONS");
  assert.ok(RESIDENCY.FORBIDDEN_REAL_OBSERVATIONS.includes("external data repository"));
});

test("c · an external sitemap reference is ALLOWED — it names the collection, it does not contain it", () => {
  for (const content of [
    'import { batchFile } from "../crawl/observation-batch.mjs";\nconst p = batchFile("sitemaps.jsonl", { batchId: "sitemap-2026-09-12" });',
    "observations/sitemap-2026-09-12/sitemaps.jsonl — 5 records, 20,895 stored URLs",
    JSON.stringify({ batchId: "sitemap-2026-09-12", urlCount: 20895, files: [{ name: "sitemaps.jsonl" }] }),
  ]) {
    assert.equal(classifySitemapArtifact({ content }), "ALLOWED_EXTERNAL_REFERENCE", `a reference was misjudged: ${content.slice(0, 60)}`);
  }
});

test("d · a reference whose external source is missing is UNKNOWN, never satisfied", () => {
  const content = "observations/sitemap-2026-09-12/sitemaps.jsonl";
  assert.equal(classifySitemapArtifact({ content, externalSourceReadable: false }), "UNKNOWN_EXTERNAL_SOURCE_MISSING");
  /* CONTROL: readable, and the same reference is allowed — so UNKNOWN is the missing source talking. */
  assert.equal(classifySitemapArtifact({ content, externalSourceReadable: true }), "ALLOWED_EXTERNAL_REFERENCE");
});

test("e · a RENAMED real sitemap artifact is STILL FORBIDDEN — the guard reads content, not paths", () => {
  const content = realRecord("https://a-client.example.org");
  /* The classifier is never told a filename, which is precisely why renaming cannot defeat it. Four
   * disguises, one verdict. */
  for (const disguise of ["runs/evidence/sitemaps.jsonl", "runs/evidence/harmless-notes.txt", "docs/appendix-b.json", "src/fixtures/example-data.jsonl"]) {
    assert.equal(classifySitemapArtifact({ content }), "FORBIDDEN_REAL_OBSERVATIONS", `renaming to ${disguise} changed the verdict`);
  }
  /* And the record-shape probe is what carries it, independent of any path. */
  assert.ok(isSitemapCaptureRecord(JSON.parse(content)));
  assert.equal(declaresSynthetic(JSON.parse(content)), false);
});

test("🔴 the census finds NO real sitemap population committed in this repository", () => {
  const r = sitemapResidencyCensus({ repo: REPO });
  assert.ok(r.examined > 300, `the census examined only ${r.examined} of ${r.tracked} committed files — too few to believe a zero`);
  assert.deepEqual(r.forbidden, [], `real sitemap observations are committed here:\n  ${r.forbidden.map((f) => f.file).join("\n  ")}`);
});

test("🔴 CONTROL: the census DOES catch a real population when one is present", () => {
  /* Without this, the zero above would be produced equally by a census that reads nothing. The
   * control is run through the same classifier the census uses, on the same record shape. */
  assert.equal(classifySitemapArtifact({ content: realRecord("https://a-client.example.org") }), "FORBIDDEN_REAL_OBSERVATIONS");

  /* And the file the engine used to hold really is gone from the commit. */
  const tracked = execFileSync("git", ["-C", REPO, "ls-files", "runs/evidence"], { encoding: "utf8" }).split("\n").filter(Boolean);
  assert.ok(!tracked.includes("runs/evidence/sitemaps.jsonl"), "the engine's own copy of the real sitemap evidence is still committed");
  assert.ok(tracked.length > 0, "runs/evidence holds nothing at all — the assertion above would pass vacuously");
});
