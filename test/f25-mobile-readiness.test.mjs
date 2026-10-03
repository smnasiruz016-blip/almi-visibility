/**
 * 🔴 RR-137 · F25 · MOBILE READINESS (acceptance _handoffs b56655a). Clauses:
 *   C1 one client, any client · C2 viewport from the stored HTML · C3 rendered facts only from COMPLETE renders · C4 overflow at the
 *   declared width · C5 tap targets (WCAG 2.2 SC 2.5.8) · C6 mobile against desktop words · C7 denominators and INCOMPLETE.
 * No live call: browser tests render fixture documents offline (inline styles and scripts only, so they can be COMPLETE).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { viewportOf, responsiveOf, tapTargetsOf, mobileContentOf, summariseMobile, assessPage, NOT_MEASURED } from "../src/audit/mobile-readiness.mjs";
import { loadPlaywright, launchOfflineChromium, startDocumentServer, renderDocument } from "../src/render/renderer.mjs";
import { declaredWorld, FIXTURE_SUBJECT, FIXTURE_SUBJECT_ORIGIN, FIXTURE_TENANT, SECOND_FIXTURE_TENANT } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PW = await loadPlaywright();
const NO_BROWSER = PW.unavailable ? `no browser here: ${PW.unavailable}` : false;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const complete = (layout, visibleText = "a") => ({ renderState: "COMPLETE", reason: "", layout, visibleText });

test("C2 · the viewport from the stored HTML: absent, present, device-width, zoom restriction; comments and scripts are not read; several or unparseable are counted, never resolved", () => {
  assert.deepEqual(viewportOf("<html><head></head></html>"), { state: "ABSENT" });
  const ok = viewportOf(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  assert.deepEqual([ok.state, ok.deviceWidth, ok.zoomRestricted], ["PRESENT", true, false]);
  assert.equal(viewportOf(`<meta name="viewport" content="width=device-width, user-scalable=no">`).zoomRestricted, true);
  assert.equal(viewportOf(`<meta name="viewport" content="width=device-width, user-scalable=0">`).zoomRestricted, true);
  assert.equal(viewportOf(`<meta name="viewport" content="width=device-width, maximum-scale=1">`).zoomRestricted, true);
  assert.equal(viewportOf(`<meta name="viewport" content="width=device-width, maximum-scale=2">`).zoomRestricted, false, "200 percent is allowed (SC 1.4.4)");
  assert.equal(viewportOf(`<meta name="viewport" content="width=980">`).deviceWidth, false);
  assert.deepEqual(viewportOf(`<!-- <meta name="viewport" content="width=device-width"> -->`), { state: "ABSENT" }, "a commented-out declaration was read");
  assert.deepEqual(viewportOf(`<script>x='<meta name="viewport" content="width=device-width">'</script>`), { state: "ABSENT" }, "a declaration inside a script was read");
  assert.deepEqual(viewportOf(`<meta name="viewport" content="width=device-width"><meta name="viewport" content="width=980">`), { state: "MULTIPLE", count: 2 });
  assert.deepEqual(viewportOf(`<meta name="viewport" content="nonsense">`), { state: "UNPARSEABLE" });
});

test("C3 · against a PARTIAL, FAILED or absent render every rendered measure is NOT MEASURED with its reason — never a pass, never 0", () => {
  /* a real PARTIAL render DOES carry a layout and text — the gate, not their absence, must be what makes these NOT MEASURED */
  const layout = { scrollWidth: 999, viewportWidth: 390, targets: [{ x: 0, y: 0, w: 5, h: 5, visible: true }, { x: 6, y: 0, w: 5, h: 5, visible: true }] };
  for (const r of [{ renderState: "PARTIAL", reason: "9 refused", layout, visibleText: "a b" }, { renderState: "FAILED", reason: "x", layout, visibleText: "a" }, null]) {
    const a = assessPage({ html: `<meta name="viewport" content="width=device-width">`, mobile: r, desktop: r });
    for (const k of ["responsive", "tapTargets", "mobileContent"]) { assert.equal(a[k].state, NOT_MEASURED, k); assert.equal(a[k].undersized, undefined); }
    assert.equal(a.viewport.state, "PRESENT", "the stored-HTML measure does not depend on a render");
  }
  /* C6 needs BOTH renders COMPLETE */
  assert.equal(mobileContentOf(complete({ scrollWidth: 1, viewportWidth: 1, targets: [] }, "a b"), { renderState: "PARTIAL", reason: "r", visibleText: "a b c" }).state, NOT_MEASURED);
});

test("C3 · AMENDMENT 1 (24cd44f): a PARTIAL render whose ONLY refusals are outside hosts, nothing of its own site refused, settled in time, is OWN-SITE COMPLETE — measured, its state unchanged, its refusals carried; every other PARTIAL is NOT MEASURED", () => {
  const OWN = new Set(["site.invalid"]);
  const layout = { scrollWidth: 390, viewportWidth: 390, targets: [] };
  const partial = (byHost, { timedOut = false, refusedByReason = { UNDECLARED_HOST: 2 } } = {}) => ({
    renderState: "PARTIAL", reason: "refused", layout, visibleText: "a b", timedOut,
    requests: { attempted: 9, refused: Object.values(byHost).reduce((n, h) => n + h.refused, 0), byHost, refusedByReason },
  });
  const outsideOnly = partial({ "site.invalid": { attempted: 7, refused: 0 }, "fonts.other.invalid": { attempted: 1, refused: 1 }, "stats.other.invalid": { attempted: 1, refused: 1 } });
  /* POSITIVE */
  const r = responsiveOf(outsideOnly, OWN);
  assert.deepEqual(r, { state: "FITS", viewportWidth: 390, basis: "OWN_SITE_COMPLETE", refusedOutside: 2, refusedByReason: { UNDECLARED_HOST: 2 } });
  assert.equal(outsideOnly.renderState, "PARTIAL", "the render state was relabelled");
  const m = mobileContentOf(outsideOnly, { ...outsideOnly, visibleText: "a b c" }, OWN);
  assert.deepEqual([m.state, m.missingOnMobile, m.mobileBasis.basis, m.desktopBasis.refusedOutside], ["DIFFERS", 1, "OWN_SITE_COMPLETE", 2]);
  const s = summariseMobile([assessPage({ html: "", mobile: outsideOnly, desktop: outsideOnly, ownHosts: OWN })]);
  assert.deepEqual(s.ownSite, { renders: 2, refusedOutside: 4, refusedByReason: { UNDECLARED_HOST: 4 } }, "a render called complete must still say what it refused");
  /* NEGATIVE — each one is NOT MEASURED */
  const ownRefused = partial({ "site.invalid": { attempted: 7, refused: 1 }, "fonts.other.invalid": { attempted: 1, refused: 1 } }, { refusedByReason: { REQUEST_CAP: 1, UNDECLARED_HOST: 1 } });
  const timedOut = partial({ "fonts.other.invalid": { attempted: 1, refused: 2 } }, { timedOut: true });
  const noTimedOutRecord = { ...partial({ "fonts.other.invalid": { attempted: 1, refused: 2 } }), timedOut: undefined };
  const mismatched = { ...outsideOnly, requests: { ...outsideOnly.requests, refused: 3 } };
  const failed = { renderState: "FAILED", reason: "never served", layout: null };
  for (const [name, render, hosts] of [["own-site refusal", ownRefused, OWN], ["did not settle", timedOut, OWN], ["no timedOut record", noTimedOutRecord, OWN], ["refusals not accounted by host", mismatched, OWN], ["FAILED", failed, OWN], ["no declared site hosts", outsideOnly, null], ["empty declared site hosts", outsideOnly, new Set()]]) {
    assert.equal(responsiveOf(render, hosts).state, NOT_MEASURED, `${name}: measured`);
    assert.equal(tapTargetsOf(render, hosts).state, NOT_MEASURED, `${name}: tap targets measured`);
    assert.equal(mobileContentOf(render, outsideOnly, hosts).state, NOT_MEASURED, `${name}: words measured`);
  }
  /* MISSING EVIDENCE: a PARTIAL render that carries no request record cannot be told apart by host */
  assert.equal(responsiveOf({ renderState: "PARTIAL", reason: "r", layout, timedOut: false }, OWN).state, NOT_MEASURED);
  /* a COMPLETE render reads exactly as before the amendment */
  assert.deepEqual(responsiveOf(complete(layout)), { state: "FITS", viewportWidth: 390 });
});

test("C4 · overflow at the declared width: a document wider than the viewport overflows by its excess; one that fits FITS", () => {
  assert.deepEqual(responsiveOf(complete({ scrollWidth: 450, viewportWidth: 390, targets: [] })), { state: "HORIZONTAL_OVERFLOW", overflowPx: 60, viewportWidth: 390 });
  assert.deepEqual(responsiveOf(complete({ scrollWidth: 390, viewportWidth: 390, targets: [] })), { state: "FITS", viewportWidth: 390 });
});

test("C5 · WCAG 2.2 SC 2.5.8: a target under 24×24 whose 24-px circle meets another target is UNDERSIZED; a small but well-spaced one is not; invisible ones are not counted", () => {
  const t = (x, y, w, h, visible = true) => ({ x, y, w, h, visible });
  const crowded = tapTargetsOf(complete({ scrollWidth: 390, viewportWidth: 390, targets: [t(0, 0, 10, 10), t(12, 0, 10, 10)] }));
  assert.deepEqual([crowded.state, crowded.targets, crowded.undersized], ["UNDERSIZED_FOUND", 2, 2]);
  const spaced = tapTargetsOf(complete({ scrollWidth: 390, viewportWidth: 390, targets: [t(0, 0, 10, 10), t(100, 0, 10, 10)] }));
  assert.deepEqual([spaced.state, spaced.undersized, spaced.smallButSpaced], ["ALL_SUFFICIENT", 0, 2]);
  const big = tapTargetsOf(complete({ scrollWidth: 390, viewportWidth: 390, targets: [t(0, 0, 44, 44), t(46, 0, 44, 44)] }));
  assert.equal(big.undersized, 0, "two 44-px targets side by side are sufficient");
  const hidden = tapTargetsOf(complete({ scrollWidth: 390, viewportWidth: 390, targets: [t(0, 0, 10, 10), t(12, 0, 10, 10, false)] }));
  assert.deepEqual([hidden.targets, hidden.undersized], [1, 0], "an invisible element was counted as a target");
});

test("C6 · words of the desktop render missing on mobile are counted (and mobile-only words), with no importance judged; C7 · denominators and INCOMPLETE", () => {
  const m = mobileContentOf({ ...complete({}), visibleText: "alpha beta" }, { ...complete({}), visibleText: "alpha beta gamma delta" });
  assert.deepEqual(m, { state: "DIFFERS", missingOnMobile: 2, mobileOnly: 0 });
  const a1 = assessPage({ html: `<meta name="viewport" content="width=device-width">`, mobile: complete({ scrollWidth: 390, viewportWidth: 390, targets: [] }, "x"), desktop: complete({}, "x") });
  const a2 = assessPage({ html: "", mobile: { renderState: "PARTIAL", reason: "r" }, desktop: { renderState: "PARTIAL", reason: "r" } });
  const s = summariseMobile([a1, a2], { pagesWithoutBody: 1 });
  assert.equal(s.pages, 3);
  for (const k of ["viewport", "responsive", "mobileContent"]) assert.equal(Object.values(s[k]).reduce((x, y) => x + y, 0), 3, `${k} does not sum to its denominator`);
  assert.equal(s.incomplete, true);
  assert.equal(summariseMobile([a1]).incomplete, false, "CONTROL: a fully measured page is COMPLETE");
  assert.doesNotMatch(JSON.stringify(s), /https?:/);
});

test("C4 · C5 · C6 · in a real browser at the DECLARED viewports: a wide element overflows on mobile, crowded small links are undersized, desktop-only text is missing on mobile", { skip: NO_BROWSER }, async () => {
  const { browser } = await launchOfflineChromium({ chromium: PW.chromium, playwrightVersion: PW.version });
  const body = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>.wide{width:600px;height:10px} .tiny a{display:inline-block;width:10px;height:10px;margin:0} @media (max-width:600px){.desk{display:none}}</style></head>
    <body><p>always here</p><p class="desk">desktop only words</p><div class="wide"></div><div class="tiny"><a href="/a">a</a><a href="/b">b</a></div><a href="/big" style="display:inline-block;width:48px;height:48px">big</a></body></html>`;
  const server = await startDocumentServer(new Map([["p", { body }]]));
  try {
    const r = (viewport) => renderDocument({ browser, origin: server.origin, id: "p", documentUrl: "https://site.invalid/p", egress: [], viewport, readLayout: true, readVisibleText: true });
    const mobile = await r({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const desktop = await r({ width: 1366, height: 768 });
    assert.equal(mobile.renderState, "COMPLETE", mobile.reason);
    const a = assessPage({ html: body, mobile, desktop });
    assert.equal(a.responsive.state, "HORIZONTAL_OVERFLOW");
    assert.ok(a.responsive.overflowPx >= 200, `overflow ${a.responsive.overflowPx}`);
    assert.equal(a.tapTargets.undersized, 2);
    assert.equal(a.tapTargets.targets, 3);
    assert.deepEqual([a.mobileContent.state, a.mobileContent.missingOnMobile], ["DIFFERS", 3]);
  } finally { await browser.close(); await server.close(); }
});

/* ---- C1 · the binary, two unrelated declared subjects, offline ---- */
const B_SUBJECT = "second-client-site", B_ORIGIN = "https://second-client.invalid";
function world() {
  const WORLD = declaredWorld({ extra: [["RESEARCH_BATCH", "mob-a"], ["RESEARCH_BATCH", "mob-b"], ["RESEARCH_BATCH", "mob-c"], ["SITE_ORIGIN", B_ORIGIN]], secondTenantOrigins: [B_ORIGIN] });
  const roots = JSON.parse(readFileSync(join(WORLD.root, "roots.json"), "utf8"));
  roots.subjects.find((x) => x.subjectId === FIXTURE_SUBJECT).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: "mob-a" }, { resourceKind: "RESEARCH_BATCH", resourceRef: "mob-c" });
  roots.subjects.push({ subjectId: B_SUBJECT, path: B_SUBJECT, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }, { resourceKind: "RESEARCH_BATCH", resourceRef: "mob-b" }], connectors: [{ connectorId: "site", kind: "PUBLIC_SITE", credential: null, reaches: [{ resourceKind: "SITE_ORIGIN", resourceRef: B_ORIGIN }] }] });
  writeFileSync(join(WORLD.root, "roots.json"), JSON.stringify(roots, null, 2) + "\n");
  mkdirSync(join(WORLD.root, B_SUBJECT), { recursive: true });
  const att = JSON.parse(readFileSync(join(WORLD.root, "tenancy", "attachments.json"), "utf8"));
  for (const x of att.attachments) if (x.resourceRef === "mob-b") x.tenantId = SECOND_FIXTURE_TENANT;
  writeFileSync(join(WORLD.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2) + "\n");
  mkdirSync(join(REPO, ".test-scratch"), { recursive: true });
  const corpus = mkdtempSync(join(REPO, ".test-scratch", "f25-corpus-"));
  const research = roots.stores.find((s) => s.store === "RESEARCH").path;
  const batch = (id, origin, bodies) => {
    mkdirSync(join(WORLD.root, research, id), { recursive: true });
    writeFileSync(join(WORLD.root, research, id, "crawl.jsonl"), bodies.map((b, i) => { writeFileSync(join(corpus, `${id}-${i}.html`), b); return JSON.stringify({ record_type: "observation", method: "crawl.fetch", observation_id: `${id}-${i}`, content_sha256: sha(b), value: { status: 200, requested_url: `${origin}/p${i}`, final_url: `${origin}/p${i}` } }); }).join("\n") + "\n");
  };
  batch("mob-a", FIXTURE_SUBJECT_ORIGIN, [`<html><head><meta name="viewport" content="width=device-width"></head><body><p>a</p></body></html>`, `<html><head></head><body><p>b</p></body></html>`]);
  batch("mob-b", B_ORIGIN, [`<html><head><meta name="viewport" content="width=device-width, user-scalable=no"></head><body><p>c</p><script src="/x.js"></script></body></html>`, `<html><head><meta name="viewport" content="width=1024"></head><body>d</body></html>`, `<html><body>e</body></html>`]);
  batch("mob-c", FIXTURE_SUBJECT_ORIGIN, [`<html><body><a href="/z">z</a><script src="/needs.js"></script></body></html>`]);
  return { WORLD, corpus, research };
}
const run = (WORLD, corpus, tenant, subject, batch) => spawnSync(process.execPath, ["bin/mobile-audit.mjs", `--research-batch=${batch}`, `--subject=${subject}`, `--corpus=${corpus}`, `--tenant=${tenant}`, "--actor=actor:cc"], { cwd: REPO, encoding: "utf8", timeout: 180000, env: WORLD.envWith() });

test("C1 · GENERIC — two unrelated declared subjects through the same binary; the viewport set is measured from stored HTML; a PARTIAL page's rendered measures are NOT MEASURED; another tenant's batch is refused", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus } = world();
  try {
    const a = run(WORLD, corpus, FIXTURE_TENANT, FIXTURE_SUBJECT, "mob-a");
    const b = run(WORLD, corpus, SECOND_FIXTURE_TENANT, B_SUBJECT, "mob-b");
    assert.equal(a.status, 0, a.stderr.slice(-300));
    assert.equal(b.status, 0, b.stderr.slice(-300));
    assert.match(a.stdout, /VIEWPORT\s+PRESENT 1 · ABSENT 1 — of 2 page\(s\) · width=device-width 1 · zoom restricted \(WCAG 2.2 SC 1.4.4\) 0/);
    assert.match(a.stdout, /RESPONSIVE\s+FITS 2 — of 2/);
    assert.match(b.stdout, /VIEWPORT\s+PRESENT 2 · ABSENT 1 — of 3 page\(s\) · width=device-width 1 · zoom restricted \(WCAG 2.2 SC 1.4.4\) 1/);
    assert.match(b.stdout, /RESPONSIVE\s+NOT MEASURED 1 · FITS 2 — of 3|RESPONSIVE\s+FITS 2 · NOT MEASURED 1 — of 3/);
    assert.match(b.stdout, /INCOMPLETE/);
    const cross = run(WORLD, corpus, FIXTURE_TENANT, FIXTURE_SUBJECT, "mob-b");
    assert.notEqual(cross.status, 0);
    for (const r of [a, b]) assert.doesNotMatch(r.stdout, /https?:\/\/|\.invalid/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("C1 · a body whose hash does not match is not read, a page off the declared site is not rendered; C7 · with nothing measured, the target count is NOT MEASURED, never 0", { skip: NO_BROWSER }, () => {
  const { WORLD, corpus, research } = world();
  try {
    writeFileSync(join(corpus, "mob-a-0.html"), "<html><body>tampered</body></html>");
    const off = "<html><body>off</body></html>";
    writeFileSync(join(corpus, "mob-a-off.html"), off);
    const crawl = join(WORLD.root, research, "mob-a", "crawl.jsonl");
    writeFileSync(crawl, readFileSync(crawl, "utf8") + JSON.stringify({ record_type: "observation", method: "crawl.fetch", observation_id: "mob-a-off", content_sha256: sha(off), value: { status: 200, requested_url: "https://another-site.invalid/z", final_url: "https://another-site.invalid/z" } }) + "\n");
    const a = run(WORLD, corpus, FIXTURE_TENANT, FIXTURE_SUBJECT, "mob-a");
    assert.match(a.stdout, /fetched pages 3 · with a stored body matching its recorded hash 1 · without 1 · not on the declared site 1/);
    const c = run(WORLD, corpus, FIXTURE_TENANT, FIXTURE_SUBJECT, "mob-c");
    assert.equal(c.status, 0, c.stderr.slice(-300));
    assert.match(c.stdout, /TAP TARGETS\s+NOT MEASURED 1 — of 1 page\(s\) · undersized \(WCAG 2.2 SC 2.5.8\) NOT MEASURED/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
});

test("C1 · the live mode needs the owner's green and refuses with no request; nothing names the sealed directory", () => {
  const { WORLD, corpus } = world();
  try {
    const r = spawnSync(process.execPath, ["bin/mobile-audit.mjs", "--research-batch=mob-a", `--subject=${FIXTURE_SUBJECT}`, `--corpus=${corpus}`, `--tenant=${FIXTURE_TENANT}`, "--actor=actor:cc", "--live-render"], { cwd: REPO, encoding: "utf8", env: WORLD.envWith() });
    assert.equal(r.status, 3);
    assert.match(r.stderr, /NO REQUEST WAS MADE/);
  } finally { rmSync(corpus, { recursive: true, force: true }); WORLD.cleanup(); }
  for (const f of ["src/audit/mobile-readiness.mjs", "bin/mobile-audit.mjs"]) assert.doesNotMatch(readFileSync(join(REPO, f), "utf8"), /case-study/i);
});

test("the production trail is untouched", () => assert.equal(trailSha(), TRAIL_BEFORE));
