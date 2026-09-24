#!/usr/bin/env node
/**
 * BUILD A GATE A CORPUS FROM A LIVE SITEMAP.
 *
 *   node bin/build-corpus.mjs --site https://almioet.almiworld.com --out <dir> --confirm
 *
 * Writes rendered HTML into a corpus directory. A LOCAL write — `--confirm`, and
 * NOT `ALLOW_PROD_WRITE`, because nothing here leaves this machine. It only ever
 * sends GETs.
 *
 * ── 🔴 WHY IT DOES NOT FETCH EVERYTHING ─────────────────────────────────────
 *
 * AlmiOET publishes 240,328 URLs. Fetching all of them IS A FULL CRAWL — the
 * very cost GAP-055 was opened to remove. So:
 *
 *   the three small groups (12 + 2,292 + 610 = 2,914)  →  EVERY page
 *   /[profession]/from-[origin]/[organization] (237,413) → a STRATIFIED SAMPLE
 *
 * ── AND THE RULE THAT KEEPS THE SAMPLE FROM SPREADING ───────────────────────
 *
 *   uniqueWords is a function of ONE page, so a sample reports an honest
 *   DISTRIBUTION of it.
 *
 *   overlap is a claim about a PARTICULAR PAIR. "Every sibling, never a sample"
 *   was always its rule and a sample does not weaken it — it makes it
 *   INAPPLICABLE. An overlap computed inside a 500-page sample of a 237,413-page
 *   group is not that group's overlap and must never be reported as if it were.
 *
 * Strata are (profession, origin). 500 strata are drawn from the 2,292 that
 * exist, one page from each, so both dimensions are covered rather than one.
 * THE SEED IS RECORDED so the same sample can be drawn again.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { scopedEntryPoint, RESOURCES } from "../src/tenancy/scoped-run.mjs";

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(n);
  return i === -1 || i + 1 >= argv.length ? d : argv[i + 1];
};

const SITE = (flag("--site", "https://almioet.almiworld.com")).replace(/\/$/, "");
// 🔴 Confined before the sitemap is fetched: an outside destination is refused while nothing has happened.
const OUT = confineToRepo(flag("--out"), { label: "--out" });
const LEAF_SAMPLE = Number(flag("--leaf-sample", "500"));
const SEED = Number(flag("--seed", "20260910"));
const CONCURRENCY = Number(flag("--concurrency", "6"));
const MIN_SPACING_MS = Number(flag("--spacing-ms", "120"));
const UA = "AlmiVisibility-GateA-corpus/1.0 (read-only audit of our own site)";

const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const CORPUS_INSTANT = governedInstant(Date.now());
const CORPUS_CORRELATION = `run:build-corpus:${CORPUS_INSTANT}`;
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/build-corpus.mjs", governed: true, repoUrl: import.meta.url, resources: [RESOURCES.siteOrigin(SITE)] });
if (!OUT) {
  console.error("usage: node bin/build-corpus.mjs --site <url> --out <dir> --confirm [--leaf-sample 500] [--seed N]");
  process.exit(2);
}

/** Deterministic PRNG so a run can be repeated exactly. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let requests = 0;
async function get(url) {
  requests++;
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30_000) });
  return { status: res.status, body: res.status === 200 ? await res.text() : "" };
}

// ── 1 · the published URL list, from the sitemap ────────────────────────────
console.log(`\n[corpus] reading ${SITE}/sitemap-index.xml`);
const idx = await get(`${SITE}/sitemap-index.xml`);
const children = [...idx.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
const all = [];
for (const c of children) {
  const r = await get(c);
  const locs = [...r.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  all.push(...locs);
  console.log(`  ${c} -> ${locs.length}`);
}
console.log(`[corpus] ${all.length.toLocaleString("en-US")} URLs published`);

// ── 2 · classify by template shape ──────────────────────────────────────────
const groups = { profession: [], "profession-origin": [], "profession-origin-org": [], register: [], other: [] };
for (const u of all) {
  const path = new URL(u).pathname.replace(/\/$/, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "register") groups.other.push(u);
  else if (parts.length === 2 && parts[0] === "register") groups.register.push(u);
  else if (parts.length === 1) groups.profession.push(u);
  else if (parts.length === 2 && parts[1].startsWith("from-")) groups["profession-origin"].push(u);
  else if (parts.length === 3 && parts[1].startsWith("from-")) groups["profession-origin-org"].push(u);
  else groups.other.push(u);
}
for (const [k, v] of Object.entries(groups)) console.log(`  ${k.padEnd(24)} ${v.length.toLocaleString("en-US")}`);

// ── 3 · the sample, stratified on (profession, origin) ──────────────────────
const rnd = mulberry32(SEED);
const strata = new Map();
for (const u of groups["profession-origin-org"]) {
  const [prof, origin] = new URL(u).pathname.split("/").filter(Boolean);
  const key = `${prof}|${origin}`;
  if (!strata.has(key)) strata.set(key, []);
  strata.get(key).push(u);
}
const keys = [...strata.keys()].sort(); // sorted first, so the seed alone decides
for (let i = keys.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [keys[i], keys[j]] = [keys[j], keys[i]];
}
const chosenStrata = keys.slice(0, Math.min(LEAF_SAMPLE, keys.length));
const leafSample = chosenStrata.map((k) => {
  const bucket = strata.get(k);
  return bucket[Math.floor(rnd() * bucket.length)];
});
console.log(
  `\n[corpus] leaf group: ${strata.size.toLocaleString("en-US")} strata (profession x origin), ` +
    `sampling ${leafSample.length} of them, one page each, SEED=${SEED}`,
);

const plan = [
  ["profession", groups.profession, "ALL"],
  ["profession-origin", groups["profession-origin"], "ALL"],
  ["register", groups.register, "ALL"],
  ["profession-origin-org", leafSample, `SAMPLE ${leafSample.length} of ${groups["profession-origin-org"].length}`],
];

// ── 4 · fetch, rate-limited ─────────────────────────────────────────────────
const started = Date.now();
let fetched = 0;
let failed = 0;

async function fetchGroup(name, urls) {
  const dir = join(OUT, name);
  /* The bare mkdir is gone: each governed write's prepare step creates the directory it writes into. */
  let next = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const i = next++;
      if (i >= urls.length) return;
      const u = urls[i];
      const t0 = Date.now();
      try {
        const r = await get(u);
        if (r.status === 200) {
          const id = new URL(u).pathname.replace(/^\//, "").replace(/\/$/, "").split("/").join("__") || "root";
          /* Routed. One fetched page is one target, so this is per-TARGET and not per-record. */
          const pageGoverned = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
            repo: REPO, permission, target: join(dir, `${id}.html`), targetClass: "OPERATOR_CHOSEN_OUTPUT",
            bytes: r.body, action: "WRITE_CORPUS_PAGE", occurredAt: CORPUS_INSTANT,
            correlationId: CORPUS_CORRELATION,
          }));
          if (pageGoverned.outcome !== "REFUSED" && pageGoverned.outcome !== "COMMITTED" && pageGoverned.outcome !== "ALREADY_COMMITTED") {
            console.error(`🔴 ${pageGoverned.outcome} — ${id}.html was not written; the governed attempt is on the audit trail`);
            process.exitCode = 1;
          }
          fetched++;
        } else {
          failed++;
          console.log(`    ${r.status} ${u}`);
        }
      } catch (e) {
        failed++;
        console.log(`    ERR ${e.message} ${u}`);
      }
      const spent = Date.now() - t0;
      if (spent < MIN_SPACING_MS) await new Promise((r) => setTimeout(r, MIN_SPACING_MS - spent));
      if (fetched % 250 === 0 && fetched > 0) {
        const s = (Date.now() - started) / 1000;
        console.log(`    ${fetched} pages, ${s.toFixed(0)}s, ${(fetched / s).toFixed(1)}/s`);
      }
    }
  });
  await Promise.all(workers);
}

for (const [name, urls, note] of plan) {
  console.log(`\n[corpus] ${name}: ${urls.length.toLocaleString("en-US")} page(s) — ${note}`);
  await fetchGroup(name, urls);
}

const seconds = (Date.now() - started) / 1000;
const manifest = {
  site: SITE, seed: SEED, builtAt: new Date().toISOString(),
  publishedUrls: all.length,
  groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
  leafStrata: strata.size,
  leafSampled: leafSample.length,
  sampledUrls: leafSample,
  fetched, failed, requests,
  wallClockSeconds: Number(seconds.toFixed(1)),
  concurrency: CONCURRENCY, minSpacingMs: MIN_SPACING_MS,
};
{
  const manifestGoverned = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: join(OUT, "corpus-manifest.json"), targetClass: "OPERATOR_CHOSEN_OUTPUT",
    bytes: JSON.stringify(manifest, null, 2), action: "WRITE_CORPUS_MANIFEST",
    occurredAt: CORPUS_INSTANT, correlationId: CORPUS_CORRELATION,
  }));
  if (manifestGoverned.outcome !== "REFUSED" && manifestGoverned.outcome !== "COMMITTED" && manifestGoverned.outcome !== "ALREADY_COMMITTED") {
    console.error(`🔴 ${manifestGoverned.outcome} — the corpus manifest was not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
}

console.log(
  `\n[corpus] done — ${fetched.toLocaleString("en-US")} pages fetched, ${failed} failed, ` +
    `${requests.toLocaleString("en-US")} HTTP requests, ${seconds.toFixed(0)}s ` +
    `(${(fetched / seconds).toFixed(1)} pages/s)`,
);
if (!permission.mayWrite) console.log("[dry-run] nothing was written. Add --confirm.");
