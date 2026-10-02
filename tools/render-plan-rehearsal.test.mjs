/**
 * 🔴 RR-138 §2 · THE ZERO-EXTERNAL-REQUEST PREFLIGHT FOR THE SHARED RENDER COLLECTION — the exact arguments of the GREEN request, against
 * a byte copy of the REAL data root (real tenant, real subject, real source batch, real evidence batch) and the engine's real stored
 * bodies, with every network primitive answered in-process (test/helpers/no-egress-preload.mjs). Nothing leaves the machine; nothing is
 * written to the real data root or the production trail.
 *
 *   RENDER_SOURCE_BATCH=<id> RENDER_EVIDENCE_BATCH=<id> RENDER_SUBJECT=<id> RENDER_MAX_PAGES=<n> node --test tools/render-plan-rehearsal.test.mjs
 *
 * NOT part of `npm test` (it reads the data root as checked out). Generic: names no site, product or population size.
 * Evidence: runs/audit/render-plan-preflight-<evidence batch>-<day>.txt (count-only; never overwritten).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, cpSync } from "node:fs";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { AUDIT_STORE_OVERRIDE_ENV, AUDIT_RUN_ENV, TEST_SCRATCH_AUDIT_ROOT } from "../src/governance/governed-run.mjs";
import { readDeclarations } from "../src/tenancy/resolver.mjs";
import { SUBJECT_ROOTS_ENV, DATA_ROOT } from "../test/helpers/declared-world.mjs";
import { LIVE_RENDER_BOUNDS } from "../src/render/same-origin-policy.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PRELOAD = pathToFileURL(join(REPO, "test", "helpers", "no-egress-preload.mjs")).href;
const SRC = process.env.RENDER_SOURCE_BATCH ?? null, EV = process.env.RENDER_EVIDENCE_BATCH ?? null, SUBJECT = process.env.RENDER_SUBJECT ?? null;
const MAX_PAGES = Number(process.env.RENDER_MAX_PAGES ?? NaN);
const headOf = (dir) => { const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : "UNKNOWN"; };
const lines = [];
const limb = (name, declared, measured, ok) => { lines.push(`${ok ? "PROVED " : "FAILED "} ${name.padEnd(40)} declared: ${declared} · measured: ${measured}`); return ok; };

function run(root, args, mode, corpus) {
  mkdirSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT), { recursive: true });
  const store = mkdtempSync(join(REPO, TEST_SCRATCH_AUDIT_ROOT, "render-plan-"));
  const log = join(store, "egress.json");
  try {
    const r = spawnSync(process.execPath, ["--import", PRELOAD, "bin/render-collect.mjs", ...args, `--corpus=${corpus}`], { cwd: REPO, encoding: "utf8", timeout: 900000,
      env: { ...process.env, [SUBJECT_ROOTS_ENV]: root, [AUDIT_STORE_OVERRIDE_ENV]: store, [AUDIT_RUN_ENV]: `render-plan-${Date.now()}`, NO_EGRESS_MODE: mode, NO_EGRESS_LOG: log } });
    return { r, c: existsSync(log) ? JSON.parse(readFileSync(log, "utf8")) : null };
  } finally { rmSync(store, { recursive: true, force: true }); }
}
const calls = (c) => (c ? c.fetch + c.dns + c.connect + (c.otherEgress ?? 0) : "NOT MEASURED");

test("RENDER PLAN PREFLIGHT · every prerequisite of the requested collection, proved with zero external requests", () => {
  assert.ok(SRC && EV && SUBJECT && Number.isInteger(MAX_PAGES), "name RENDER_SOURCE_BATCH, RENDER_EVIDENCE_BATCH, RENDER_SUBJECT and RENDER_MAX_PAGES");
  const decl = readDeclarations();
  const tOf = (ref) => decl.attachments.find((a) => a.resourceKind === "RESEARCH_BATCH" && a.resourceRef === ref)?.tenantId ?? null;
  const ok = [];
  ok.push(limb("tenant: both batches, one tenant", "the source and evidence batches attached to the same tenant", `source ${tOf(SRC) ? "attached" : "NOT ATTACHED"} · evidence ${tOf(EV) ? "attached" : "NOT ATTACHED"} · same tenant ${tOf(SRC) !== null && tOf(SRC) === tOf(EV)}`, tOf(SRC) !== null && tOf(SRC) === tOf(EV)));
  const tenant = tOf(SRC);
  const root = mkdtempSync(join(tmpdir(), "render-plan-copy-"));
  cpSync(DATA_ROOT, root, { recursive: true, filter: (s) => !s.split(sep).includes(".git") });
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const corpus = mkdtempSync(join(REPO, ".test-scratch", "render-plan-corpus-"));
  try {
    /* the real stored bodies of the source batch, copied into a confined corpus (the real corpus is never written) */
    const research = JSON.parse(readFileSync(join(root, "roots.json"), "utf8")).stores.find((s) => s.store === "RESEARCH").path;
    const srcRecs = readFileSync(join(root, research, SRC, "crawl.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.record_type === "observation" && r.method === "crawl.fetch");
    let bodies = 0;
    for (const o of srcRecs) { const f = join(REPO, "runs", "crawl", "corpus", `${o.observation_id}.html`); if (existsSync(f)) { cpSync(f, join(corpus, `${o.observation_id}.html`)); bodies += 1; } }
    const evDir = join(root, research, EV);
    ok.push(limb("clean evidence batch", "declared, no render evidence yet", `${existsSync(evDir) ? "present" : "ABSENT"} · render.jsonl ${existsSync(join(evDir, "render.jsonl")) ? "PRESENT" : "absent"}`, existsSync(evDir) && !existsSync(join(evDir, "render.jsonl"))));
    ok.push(limb("population", `${MAX_PAGES} page(s) with a stored body`, `source fetched pages ${srcRecs.length} · stored bodies ${bodies}`, bodies >= MAX_PAGES));
    const ARGS = [`--source-batch=${SRC}`, `--evidence-batch=${EV}`, `--tenant=${tenant}`, `--subject=${SUBJECT}`, "--actor=actor:cc", "--live", "--i-have-the-owners-green", "--confirm", `--max-pages=${MAX_PAGES}`];
    /* refusals before the first request, each in REFUSE mode: any network call would be counted */
    for (const [name, args, code] of [
      ["refuses without the GREEN", ARGS.filter((a) => a !== "--i-have-the-owners-green"), 3],
      ["refuses without storage permission", ARGS.filter((a) => a !== "--confirm"), 3],
      ["refuses a raised ceiling", [...ARGS, `--max-total-requests=${LIVE_RENDER_BOUNDS.maxTotalRequests + 1}`], 2],
      ["refuses a batch outside the declarations", ARGS.map((a) => (a.startsWith("--evidence-batch=") ? "--evidence-batch=undeclared-render-batch" : a)), 3],
    ]) { const x = run(root, args, "refuse", corpus); ok.push(limb(name, `exit ${code}, 0 network calls`, `exit ${x.r.status} · network calls ${calls(x.c)}`, x.r.status === code && calls(x.c) === 0)); }
    /* the exact run, in-process */
    const live = run(root, ARGS, "fixture", corpus);
    const out = live.r.stdout;
    ok.push(limb("preflight (placement, key, F04)", "PASS before any request", (out.match(/PREFLIGHT\s+: [A-Z]+/) ?? ["NOT PRINTED"])[0], /PREFLIGHT\s+: PASS/.test(out)));
    const recs = existsSync(join(evDir, "render.jsonl")) ? readFileSync(join(evDir, "render.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const obs = recs.filter((r) => r.record_type === "observation");
    const runRec = recs.find((r) => r.record_type === "render_run") ?? {};
    ok.push(limb("stored once, readers named", `${MAX_PAGES * 3} render records + 1 run record`, `${obs.length} + ${recs.length - obs.length} · readers ${[...new Set(obs.map((o) => `${o.value.kind}:${o.value.readBy.join("+")}`))].sort().join(" ")}`, obs.length === MAX_PAGES * 3 && recs.length - obs.length === 1));
    const c = live.c ?? {};
    ok.push(limb("ceiling", `≤ ${LIVE_RENDER_BOUNDS.maxTotalRequests} requests in total`, `${runRec.requestsIssued} sent (in-process)`, Number.isInteger(runRec.requestsIssued) && runRec.requestsIssued <= LIVE_RENDER_BOUNDS.maxTotalRequests));
    ok.push(limb("collection verdict", "KEPT", (out.match(/COLLECTION: [A-Z ]+/) ?? ["NOT PRINTED"])[0], /COLLECTION: KEPT/.test(out)));
    ok.push(limb("external requests (left the machine)", "0", `http/https/tls attempts ${c.otherEgress} · every fetch (${c.fetch}), DNS (${c.dns}) and socket (${c.connect}) answered in-process`, c.otherEgress === 0));
  } finally { rmSync(corpus, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true }); }
  lines.push(`production trail unchanged: ${trailSha() === TRAIL_BEFORE}`);
  mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
  let evidence = join(REPO, "runs", "audit", `render-plan-preflight-${EV}-${new Date().toISOString().slice(0, 10)}.txt`);
  if (existsSync(evidence)) evidence = evidence.replace(/\.txt$/, `-${Date.now()}.txt`);
  writeFileSync(evidence, [`render plan preflight · ${new Date().toISOString()} · engine ${headOf(REPO)} · data ${headOf(DATA_ROOT)} · count-only`, ...lines, ""].join("\n"));
  console.log(lines.join("\n"));
  assert.ok(ok.every(Boolean), "a prerequisite failed — the run must not be asked for");
  assert.equal(trailSha(), TRAIL_BEFORE);
});
