/**
 * 🔴 F23 · INTERNAL AND EXTERNAL LINK AUDIT — ONE SABOTAGE PER FAILURE LIMB (F23 Acceptance Amendment 2, _handoffs eeb7245, C1 to C8;
 * RR-263). The row is standalone and audits only the pages the engine built; no crawl batch is an input.
 *
 *   node test/helpers/f23-sabotage.mjs --deliberate      NOT part of `npm test` (test/*.test.mjs only)
 *
 * PRE-FLIGHT FIRST: every span is checked to exist EXACTLY ONCE in the code live now, and the pre-flight is printed before any sabotage
 * runs — a span that does not is NOT PROVED, never silently skipped. Then each sabotage replaces its span ALONE, proves it LANDED, runs the
 * named proof file, requires the NAMED test to fail, restores by raw-byte sha256. The production trail is hashed before and after.
 * Evidence: runs/audit/f23-sabotage-<timestamp>.txt (a new file each run).
 */
import "./harness-gate.mjs"; // RR-247: first import — exits 2 unless invoked deliberately (node <this file> --deliberate)
import { writeEvidenceOnce } from "./evidence-once.mjs"; // RR-248: evidence to a new timestamped file, never over an earlier run's
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const M = "src/audit/page-links.mjs", BP = "src/audit/built-page-links.mjs", LS = "src/audit/link-status.mjs", CFG = "config/audit/link-rules.mjs", BINA = "bin/link-audit.mjs", BINS = "bin/link-status.mjs", ADP = "src/evidence/evidence-state-adapters.mjs", REG = "src/tenancy/root-registry.mjs";
const T = ["test/f23-link-audit.test.mjs"];
const TRAIL = "audit-trail/events.jsonl";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(join(REPO, p));
const C1 = "C1 · FIRING CONTROL", POP = "C1 · POPULATION · FIRING CONTROL", NOCRAWL = "C1 · NO CRAWL BATCH · CENSUS", C2 = "C2 · FIRING CONTROL", C3 = "C3 · FIRING CONTROL", C4 = "C4 · FIRING CONTROL", C5 = "C5 · FIRING CONTROL",
  P1 = "C6 · P1 · FIRING CONTROL", P2 = "C6 · P2 · FIRING CONTROL", DATA = "C6 · DATA · CENSUS", C7 = "C7 · FIRING CONTROL", C8 = "C8 · FIRING CONTROL", LIM = "C8 · LIMIT · FIRING CONTROL", REC = "C8 · RECORDS · FIRING CONTROL", PP = "PRODUCTION PATH · C1 C8", EP = "THE ENTRY POINTS";
const FETCH = "try { return await fetchImpl(url, { method: limits.method, redirect: \"manual\", headers: { \"User-Agent\": userAgent }, signal: controller.signal }); } finally { clearTimeout(timer); }";
const GENERIC = "  if (names.includes(link.name.accessibleName.trim().toLowerCase())) return { weak: WEAK.GENERIC_NAME, notMeasured: null };";

const SABOTAGES = [
  ["S01", "C1 a link is counted twice for one occurrence", M, "    links += 1;\n    const target = canon(l.to);", "    links += 2;\n    const target = canon(l.to);", C1],
  ["S02", "C1 a page without a stored body is silently skipped", M, "  const absentPages = perPage.filter((p) => !p.hasBody).length;", "  const absentPages = 0;", C1],
  ["S03", "C1 an anchor inside a comment, a script or a template is read as a link", M, "  const body = scannable(html);", "  const body = String(html);", C1],
  ["S04", "C1 another client's stored read of a live page is read", BP, "r?.record_type === LIVE_READ_RECORD && ofTenant(r, tenantId));", "r?.record_type === LIVE_READ_RECORD);", POP],
  ["S05", "C1 another client's stored observation is read", BP, "    if (r?.record_type !== LINK_STATUS_RECORD || !ofTenant(r, tenantId)) continue;", "    if (r?.record_type !== LINK_STATUS_RECORD) continue;", POP],
  ["S06", "C1 a page published on a host the client does not declare is read", BP, "      if (!hosts.includes(hostOf(address))) { publishedElsewhere += 1; continue; }\n", "", POP],
  ["S07", "C1 a live page with no stored read is audited from its build instead of being counted absent", BP, "html: read ? read.html : null,", "html: read ? read.html : p.record.html,", POP],
  ["S08", "C1 a published page is still read as a built page", BP, "      if (p.publication !== PUBLICATION.PUBLISHED) {", "      if (true) {", POP],
  ["S09", "C1 a batch default is back in the entry point", BINA, "/* the research batches the client DECLARES — read from its declaration, never from a default */\n", "/* the research batches the client DECLARES — read from its declaration, never from a default */\nconst BATCH_ID = null;\n", NOCRAWL],
  ["S10", "C2 a destination never observed is counted working", M, "  if (!checked) return Object.freeze({ state: STATE.NOT_MEASURED, hops: null, reason: NOT_MEASURED_REASON.NEVER_CHECKED });", "  if (!checked) return Object.freeze({ state: STATE.WORKING, hops: null, reason: null });", C2],
  ["S11", "C2 a refused request loses its reason", M, "reason: state === STATE.NOT_MEASURED ? checked.reason ?? NOT_MEASURED_REASON.NO_STATUS : null });", "reason: null });", C2],
  ["S12", "C2 a redirect is reported without the length of its chain", M, "s.redirectHops += d.hops; ", "", C2],
  ["S13", "C2 a state the contract does not name is read as a status", M, "const state = Object.values(STATE).includes(checked.state) ? checked.state : STATE.NOT_MEASURED;", "const state = Object.values(STATE).includes(checked.state) ? checked.state : STATE.WORKING;", C2],
  ["S14", "C2 on a built page 'internal' is not the client's declared host", M, "  const hosts = new Set(Array.isArray(page.internalHosts) ? page.internalHosts : [new URL(page.canonical).host]);", "  const hosts = new Set([new URL(page.canonical).host]);", C2],
  ["S15", "C3 an unmeasured class is printed as 0", M, "  const classes = measured === 0\n", "  const classes = false\n", C3],
  ["S16", "C3 a part reads PROVED with a destination NOT MEASURED", M, "n > 0 && unmeasured === 0 && complete ? VERDICT.PROVED", "n > 0 && complete ? VERDICT.PROVED", C3],
  ["S17", "C4 a nameless link is not flagged", M, "    else if (l.name.accessibleName === null) anchor.nameless += 1;", "    else if (false) anchor.nameless += 1;", C4],
  ["S18", "C4 an aria-labelledby name is guessed", M, "    if (l.name === null || l.name.accessibleNameSource === \"NOT_MEASURED_ARIA_LABELLEDBY\") anchor.notMeasured += 1;", "    if (l.name === null) anchor.notMeasured += 1;", C4],
  ["S19", "C5 a page is judged by inbound links", M, "    orphaned: { notMeasured: pages.length,", "    orphaned: { notMeasured: 0,", C5],
  ["S20", "C5 a link is called visible from raw HTML", M, "    hidden: { notMeasured: links,", "    hidden: { notMeasured: 0,", C5],
  ["S21", "C6 a page passes or fails by its link count", M, "    excessive: { links, denominator: withBody, verdict: null },", "    excessive: { links, denominator: withBody, verdict: links > 100 ? VERDICT.DISPROVED : VERDICT.PROVED },", P1],
  ["S22", "C6 a nameless link is not weak", M, "  if (link.name.accessibleName === null) return { weak: WEAK.EMPTY_NAME, notMeasured: null };", "  if (link.name.accessibleName === null) return { weak: null, notMeasured: null };", P2],
  ["S23", "C6 an image link with no alt text is not weak", M, "!link.image.alt) return { weak: WEAK.IMAGE_NO_ALT, notMeasured: null };", "!link.image.alt && false) return { weak: WEAK.IMAGE_NO_ALT, notMeasured: null };", P2],
  ["S24", "C6 a link whose whole name is a declared generic name is not weak", M, GENERIC, "  if (false) return { weak: WEAK.GENERIC_NAME, notMeasured: null };", P2],
  ["S25", "C6 a declared name inside a longer name is weak", M, GENERIC, "  if (names.some((n) => link.name.accessibleName.toLowerCase().includes(n))) return { weak: WEAK.GENERIC_NAME, notMeasured: null };", P2],
  ["S26", "C6 the whole-name match regards case", M, GENERIC, "  if (names.includes(link.name.accessibleName.trim())) return { weak: WEAK.GENERIC_NAME, notMeasured: null };", P2],
  ["S27", "C6 a page whose language declares no names is judged by another language's", M, "  const names = language !== null && Array.isArray(genericNames?.[language]) ? genericNames[language].map(", "  const names = Array.isArray(genericNames?.[language] ?? genericNames?.en) ? (genericNames[language] ?? genericNames.en).map(", P2],
  ["S28", "C6 a link named only by a web address is called weak", M, "    if (nameIsAddress(l.name?.accessibleName)) addressNames += 1;", "    if (nameIsAddress(l.name?.accessibleName)) { addressNames += 1; weak[WEAK.GENERIC_NAME] += 1; }", P2],
  ["S29", "C6 a name the authority page does not give is added to the declared data", CFG, "[\"click here\", \"read more\", \"website\", \"article\"]", "[\"click here\", \"read more\", \"website\", \"article\", \"here\"]", DATA],
  ["S30", "C6 a generic name is held in code", M, "  const internal = side(), external = side();\n  const anchor = { named: 0, nameless: 0, notMeasured: 0 };\n  const weak =", "  const HELD = [\"read more\"];\n  const internal = side(), external = side();\n  const anchor = { named: 0, nameless: 0, notMeasured: 0 };\n  const weak =", DATA],
  ["S31", "C7 a per-page count lacks its denominator", M, "internal ${t(p.internal)} of ${p.links}: ${cls(p.internal)}", "internal ${t(p.internal)}: ${cls(p.internal)}", C7],
  ["S32", "C7 a weakly contextual link does not disprove its part", M, "verdict: partVerdict(weakTotal, weakNotMeasured, links, complete) },", "verdict: partVerdict(0, weakNotMeasured, links, complete) },", C7],
  ["S33", "C7 an incomplete population reads complete", M, "incomplete: pages.length > 0 && absent.length > 0,", "incomplete: false,", C7],
  ["S34", "C7 a part reads PROVED over a population with an absent body", M, "  const complete = absentPages === 0 && truncatedPages === 0;", "  const complete = true;", C7],
  ["S35", "C8 an address is requested twice", LS, "    if (answers.has(url)) return answers.get(url);\n", "", C8],
  ["S36", "C8 two requests reach one host inside the interval", LS, "if (wait <= 0) break; await sleep(wait); }", "break; }", C8],
  ["S37", "C8 a disallowed address is requested", LS, "      else if (!isAllowedByRules(rb.rules, url)) a = { status: null, reason: NOT_MEASURED_REASON.ROBOTS_DISALLOWED };\n", "", C8],
  ["S38", "C8 a robots file that cannot be read is taken as permission", LS, "        else if (!res.ok) entry = { reason: NOT_MEASURED_REASON.ROBOTS_UNKNOWN };", "        else if (!res.ok) entry = { rules: [] };", C8],
  ["S39", "C8 a rate-limited request is recorded BROKEN", LS, "          if (res.status === 429) a = { status: 429, reason: NOT_MEASURED_REASON.RATE_LIMITED };", "          if (false) a = { status: 429, reason: NOT_MEASURED_REASON.RATE_LIMITED };", C8],
  ["S40", "C8 a challenged request is recorded BROKEN", LS, "          else if (challenged(res)) a = { status: res.status, reason: NOT_MEASURED_REASON.CHALLENGED };", "          else if (false) a = { status: res.status, reason: NOT_MEASURED_REASON.CHALLENGED };", C8],
  ["S41", "C8 a timed-out request loses its reason", LS, "reason: e?.name === \"AbortError\" ? NOT_MEASURED_REASON.TIMEOUT : NOT_MEASURED_REASON.NETWORK_ERROR };", "reason: NOT_MEASURED_REASON.NETWORK_ERROR };", C8],
  ["S42", "C8 a redirect chain's length is not recorded", LS, "hops: chain.length, chain:", "hops: 0, chain:", C8],
  ["S43", "C8 a chain that ends in an error is not BROKEN", LS, "      else if (a.status >= 400 && a.status < 600) state = STATE.BROKEN;", "      else if (a.status >= 400 && a.status < 600) state = STATE.WORKING;", C8],
  ["S44", "C8 the platform follows a redirect by itself", LS, "redirect: \"manual\", headers: { \"User-Agent\": userAgent }, signal: controller.signal }); } finally", "redirect: \"follow\", headers: { \"User-Agent\": userAgent }, signal: controller.signal }); } finally", C8],
  ["S45", "C8 an address that is no link target, hop or robots file is requested", LS, "        const res = await send(`${origin}/robots.txt`, \"robots\");", "        await fetchImpl(`${origin}/sitemap.xml`, { method: limits.method, redirect: \"manual\", headers: { \"User-Agent\": userAgent } }).catch(() => {});\n        const res = await send(`${origin}/robots.txt`, \"robots\");", C8],
  ["S46", "C8 the request limit is passed", LS, "      else if (requests >= limits.maxRequests) a = { status: null, reason: NOT_MEASURED_REASON.REQUEST_LIMIT };\n", "", LIM],
  ["S47", "C8 a robots file is requested past the limit", LS, "    if (requests >= limits.maxRequests) entry = { reason: NOT_MEASURED_REASON.REQUEST_LIMIT };", "    if (false) entry = { reason: NOT_MEASURED_REASON.REQUEST_LIMIT };", LIM],
  ["S48", "C8 requests are sent although the distinct addresses outnumber the limit", LS, "  if (distinct.length > limits.maxRequests) return out({ refused: REFUSAL.TOO_MANY });\n", "", LIM],
  ["S49", "C8 a failed request is retried", LS, FETCH, "try { return await fetchImpl(url, { method: limits.method, redirect: \"manual\", headers: { \"User-Agent\": userAgent }, signal: controller.signal }).catch(() => fetchImpl(url, { method: limits.method, redirect: \"manual\", headers: { \"User-Agent\": userAgent }, signal: controller.signal })); } finally { clearTimeout(timer); }", LIM],
  ["S50", "C8 a refused request is stored as an observation", ADP, "  if (r.state === \"NOT MEASURED\") return place(`${rule}.not-measured`, \"UNKNOWN\",", "  if (false) return place(`${rule}.not-measured`, \"UNKNOWN\",", REC],
  ["S51", "C8 an observation that names no run is placed", ADP, "  if (!present(r.run)) return unmapped(\"a link-status observation names the run that made it\", rule);\n", "", REC],
  ["S52", "C8 the connector kind of the check is not a declared kind", REG, "\"LINK_DESTINATIONS\"]);", "\"LINK_DESTINATION\"]);", REC],
  ["S53", "C8 the entry point goes on without --live", BINS, "if (!live) { console.log(\"  NOT RUN — no --live: the plan only; no request was made and nothing was written\"); process.exit(0); }\n", "", PP],
  ["S54", "C8 the entry point does not stop when the distinct addresses outnumber the limit", BINS, " NO REQUEST WAS MADE.`); process.exit(3); }\nif (!live)", " NO REQUEST WAS MADE.`); }\nif (!live)", PP],
  ["S55", "C8 a connector that does not reach the batch is used for it", BINS, "if (declared.state !== \"DECLARED\" || !(declared.connector.reaches ?? []).some((x) => x.resourceKind === \"RESEARCH_BATCH\" && x.resourceRef === BATCH)) {", "if (declared.state !== \"DECLARED\") {", PP],
  ["S56", "C8 the observations are not stored", BINS, "const g = append(observations, \"link-status.jsonl\");", "const g = { outcome: \"COMMITTED\" };", PP],
  ["S57", "C8 the entry point fetches outside the declared connector", BINS, "fetchImpl: CONNECTOR.fetch,", "fetchImpl: globalThis.fetch,", EP],
  ["S58", "C7 the entry point does not give the counts per page", BINA, "a.perPage.forEach((page, i) => console.log(`  ${formatPage(page, i + 1, a.perPage.length)}`));\n", "", PP],
  ["S59", "C1 the entry point audits another client's stored observations", BINA, "const r = auditClientPages({ batches, tenantId: SCOPE.tenantId, hosts, canon });", "const r = auditClientPages({ batches, tenantId: \"tenant:someone-else\", hosts, canon });", PP],
];

const files = [...new Set(SABOTAGES.map((s) => s[2]))];
const originals = new Map(files.map((p) => [p, read(p)]));
const restoreAll = () => { for (const [p, b] of originals) if (!read(p).equals(b)) writeFileSync(join(REPO, p), b); };
process.on("exit", restoreAll);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { restoreAll(); process.exit(130); });

const occurrences = (text, s) => text.split(s).length - 1;
const preflight = SABOTAGES.map(([id, , file, from]) => [id, file, occurrences(originals.get(file).toString("utf8"), from)]);
const trailBefore = sha(read(TRAIL));
const lines = [
  `F23 sabotage run · ${new Date().toISOString()}`,
  `population: ${SABOTAGES.length} sabotages over ${T.join(" + ")} · bound: one span per sabotage, applied ALONE; each run killed after 600 s`,
  `PRE-FLIGHT (span occurrences in the code live now): ${preflight.map(([id, , n]) => `${id}=${n}`).join(" ")} · all exactly once: ${preflight.every(([, , n]) => n === 1)}`,
  `production trail sha256 before: ${trailBefore}`, "",
];
console.log(lines.join("\n"));
let proved = 0;
for (const [id, limb, file, from, to, expect] of SABOTAGES) {
  const orig = originals.get(file);
  const text = orig.toString("utf8");
  if (occurrences(text, from) !== 1) { lines.push(`${id} ${limb} ${file}: SPAN NOT FOUND EXACTLY ONCE — NOT PROVED`); console.log(lines.at(-1)); continue; }
  const at = text.indexOf(from);
  writeFileSync(join(REPO, file), text.slice(0, at) + to + text.slice(at + from.length), "utf8");
  const landed = sha(read(file)) !== sha(orig);
  let failing = [], reasons = "";
  try {
    const r = spawnSync(process.execPath, ["--test", ...T], { cwd: REPO, encoding: "utf8", timeout: 600000 });
    failing = [...`${r.stdout}${r.stderr}`.matchAll(/✖ (.+?) \(\d/g)].map((m) => m[1]);
    reasons = [...new Set([...`${r.stdout}${r.stderr}`.matchAll(/^\s+(AssertionError|TypeError|ReferenceError|SyntaxError|Error)\b/gm)].map((m) => m[1]))].join("/") || "none";
  } finally {
    writeFileSync(join(REPO, file), orig);
  }
  const restored = sha(read(file)) === sha(orig);
  const red = failing.some((n) => n.startsWith(expect));
  const ok = landed && red && restored;
  if (ok) proved += 1;
  const line = `${id} ${limb} ${file}: landed ${landed} · named test "${expect}" red ${red} · failing ${[...new Set(failing)].length} · reason ${reasons} · restored by sha256 ${restored} · ${ok ? "PROVED" : "NOT PROVED"}`;
  lines.push(line);
  console.log(line);
}
const trailAfter = sha(read(TRAIL));
const residue = [...originals].filter(([p, b]) => !read(p).equals(b)).length;
lines.push("", `proved ${proved} of ${SABOTAGES.length} · residue ${residue} · production trail sha256 after: ${trailAfter} · unchanged ${trailAfter === trailBefore}`);
mkdirSync(join(REPO, "runs", "audit"), { recursive: true });
console.log(`evidence written: ${writeEvidenceOnce(REPO, "f23-sabotage", lines.join("\n") + "\n")}`);
