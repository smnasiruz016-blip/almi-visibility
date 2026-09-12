/**
 * THIS REPOSITORY DEPLOYS NOWHERE — AND THE SETTING THAT SAYS SO HAS A SOURCE.
 *
 * It has no web application: Node CLI scripts and a report file opened from
 * disk. Vercel built a Preview on every PR anyway. `vercel.json` turns Git
 * deployments off — for WASTE, not security: previews were already behind
 * Vercel Authentication (U-DEP-3, re-verified 12 September 2026: 302 to SSO).
 *
 * 🔴 WE DO NOT ACT ON A REMEMBERED API. The key and value are checked against
 * an OFFICIAL source record carrying its URL, read date and the sentence read.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

import { VERCEL_GIT_CONFIGURATION } from "../config/sources/vercel-git-configuration.mjs";
import { SOURCE_TIERS } from "../src/evidence/records.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

test("vercel.json exists and turns off automatic Git deployments for all branches", () => {
  const cfg = JSON.parse(readFileSync(`${REPO}vercel.json`, "utf8"));
  assert.equal(cfg.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.deepEqual(cfg.git, { deploymentEnabled: false });
  // Nothing else is configured: a file that grows a build command has started deploying something.
  assert.deepEqual(Object.keys(cfg).sort(), ["$schema", "git"]);
});

test("🔴 the setting is backed by an OFFICIAL source record with its URL and read date", () => {
  const { record, quote, governs } = VERCEL_GIT_CONFIGURATION;
  assert.equal(record.record_type, "source");
  assert.equal(record.source_tier, "OFFICIAL");
  assert.equal(SOURCE_TIERS.indexOf(record.source_tier), 0, "OFFICIAL must be the highest tier");
  assert.equal(record.source_url, "https://vercel.com/docs/project-configuration/git-configuration");
  assert.equal(record.retrieved_at, "2026-09-12");
  assert.match(record.reviewer, /not re-fetched/, "the record must say it was not re-read by this repository");
  assert.equal(quote, "To turn off automatic deployments for all branches, set the property value to false.");
  // The record governs exactly the setting that is in the file.
  const cfg = JSON.parse(readFileSync(`${REPO}vercel.json`, "utf8"));
  assert.equal(governs.file, "vercel.json");
  assert.equal(cfg.git[governs.path.split(".")[1]], governs.value);
});

test("🔴 there is no web application to deploy — the premise of the setting, checked", () => {
  for (const dir of ["app", "pages", "public", ".next"]) assert.equal(existsSync(`${REPO}${dir}`), false, `${dir}/ exists — the repository may now have something to deploy`);
  const pkg = JSON.parse(readFileSync(`${REPO}package.json`, "utf8"));
  assert.equal(pkg.scripts.build, undefined, "a build script appeared — re-read vercel.json's reason");
  for (const dep of ["next", "react", "vite", "astro", "nuxt", "@sveltejs/kit"]) {
    assert.equal({ ...pkg.dependencies, ...pkg.devDependencies }[dep], undefined, `${dep} is a dependency — something is deployable`);
  }
});

test("the README says in one line that this repository deploys nowhere, and why", () => {
  assert.match(readFileSync(`${REPO}README.md`, "utf8"), /\*\*This repository deploys nowhere:\*\* it has no web application/);
});

test("U-DEP-3 is recorded CLOSED with the dashboard evidence and the measured 302", () => {
  const reg = readFileSync(`${REPO}PHASE_0_FROZEN_GAP_REGISTER.md`, "utf8");
  const row = reg.split("\n").find((l) => l.startsWith("| **U-DEP-3** |"));
  assert.ok(row, "U-DEP-3 is gone from the register");
  assert.match(row, /RE-VERIFIED AND CLOSED WITH EVIDENCE, 12 Sep 2026/);
  assert.match(row, /Standard Protection/);
  assert.match(row, /HTTP 302/);
  assert.match(row, /waste/);
});
