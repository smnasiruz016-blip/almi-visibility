#!/usr/bin/env node
/**
 * F88 · THE OWNER'S REPORT FILES ON A PHONE, A DESKTOP AND ASSISTIVE SURFACES (acceptance _handoffs AlmiVisibility_F88_ACCEPTANCE_2026-10-18.md,
 * RR-285) — the engine operator's tool; READ-ONLY, LOCAL ONLY.
 *
 *   node tools/owner-workflows.mjs [--list] [--kind=<KIND>]
 *
 * Every report file under runs/ classed by kind (src/report/owner-workflows.mjs); each listed one rendered by the engine's OFFLINE renderer
 * (src/render/renderer.mjs: the document from 127.0.0.1, every other request refused, no name resolves) at 430 px and at desktop width;
 * then the width, same-text, assistive and bad-findings-first checks. Nothing is fetched, written or recorded.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { classifyReports, phoneFailures, desktopFailures, assistiveFailures, badFirstFailures, PHONE, DESKTOP, UNLISTED, OWNER_WORKFLOWS } from "../src/report/owner-workflows.mjs";
import { RENDER_BOUNDS, loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = process.argv.find((a) => a.startsWith("--kind="))?.slice(7) ?? null;

/** Every file under runs/, as repo-relative paths. */
export function runFiles(repo = REPO) {
  const out = [], walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else out.push(relative(repo, p).split("\\").join("/")); } };
  if (existsSync(join(repo, "runs"))) walk(join(repo, "runs"));
  return out.sort();
}

/** The whole check over `reports` ([{ file, kind, type }]); `render(doc, viewport)` → { visibleText, layout }. */
export async function checkReports(reports, { read, render }) {
  const failures = [];
  for (const r of reports) {
    const text = read(r.file);
    const phone = await render(r, text, PHONE), desk = await render(r, text, DESKTOP);
    failures.push(...phoneFailures(r.file, phone.layout), ...desktopFailures(r.file, phone.visibleText, desk.visibleText), ...assistiveFailures(r.file, text, r.type), ...badFirstFailures(r.file, text, r.type));
  }
  return failures;
}

/** The offline renderer, started once: `render(report, text, viewport)`, and `close()`. Null with the reason when no browser is here. */
export async function offlineRenderer() {
  const pw = await loadPlaywright();
  if (!pw.chromium) return { unavailable: pw.unavailable };
  let browser;
  try { ({ browser } = await launchOfflineChromium({ chromium: pw.chromium, playwrightVersion: pw.version })); } catch (e) { return { unavailable: `chromium cannot start here (${String(e.message).split("\n")[0]})` }; }
  const documents = new Map();
  const server = await startDocumentServer(documents);
  let n = 0;
  const render = async (r, text, viewport) => {
    const id = `r${n++}`;
    documents.set(id, { body: text, contentType: `${r.type}; charset=utf-8` });
    const out = await renderDocument({ browser, origin: server.origin, id, documentUrl: `${server.origin}/doc/${id}`, egress: [], bounds: RENDER_BOUNDS, viewport, readLayout: true, readVisibleText: true });
    documents.delete(id);
    return out;
  };
  return { render, close: async () => { await browser.close(); await server.close(); } };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const reports = classifyReports(runFiles()).filter((r) => !KIND || r.kind === KIND);
  const listed = reports.filter((r) => r.kind !== UNLISTED);
  const r = await offlineRenderer();
  if (r.unavailable) { console.error(`🔴 NOT MEASURED — ${r.unavailable}`); process.exit(3); }
  let failures;
  try { failures = await checkReports(listed, { read: (f) => readFileSync(join(REPO, f), "utf8"), render: r.render }); } finally { await r.close(); }
  console.log("F88 · THE OWNER'S REPORT FILES — rendered offline at 430 px and at desktop width; nothing fetched or written");
  for (const w of [...OWNER_WORKFLOWS.map((x) => x.kind), UNLISTED]) console.log(`  ${w.padEnd(20)} ${reports.filter((x) => x.kind === w).length}`);
  const by = (k) => failures.filter((f) => f.failure === k).length;
  console.log(`  failures         ${failures.length}: ${[...new Set(failures.map((f) => f.failure))].map((k) => `${k} ${by(k)}`).join(" · ") || "none"}`);
  if (process.argv.includes("--list")) { for (const u of reports.filter((x) => x.kind === UNLISTED)) console.log(`    UNLISTED ${u.file}`); for (const f of failures) console.log(`    ${f.failure} · ${f.file}${f.line ? ` · ${f.line}` : ""}${f.detail ? ` · ${f.detail}` : ""}`); }
}
