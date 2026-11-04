/* RR-372: how the app ended is always on disk; the parent keeps the exit code and starts it again; a verdict paid for is never lost; the shipped Node is pinned; the screen names the button */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scrub, exitWords, writeCrash, writeState, writeLastError, logLine, unseenCrash, crashSeen, crashFiles, supportText, crashLine, KEEP } from "../desktop/crash-record.mjs";
import { mayRestart, withPort, RESTARTS, ENDED_WELL } from "../desktop/supervisor.mjs";
import { runtimeFault, RUNTIME_PIN } from "../desktop/runtime-pin.mjs";
import { judgeBatch, judgeAll, readyLine, REFUSED_KEY, NOT_ALLOWED } from "../desktop/qa-judge.mjs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8"), tmp = () => mkdtempSync(join(tmpdir(), "rr372-"));
const STANDIN_KEY = ["sk", "ant", "api03", "abcdefgh12345678"].join("-");

test("a key, a token or a password never reaches a crash file", () => {
  for (const s of [`key ${STANDIN_KEY} here`, `x-api-key: abcdef123456`, `authorization: Bearer abcdefgh12345678`, `"password":"hunter2hunter2"`, `apiKey=abcdef123456`]) assert.doesNotMatch(scrub(s), /abcdefgh12345678|abcdef123456|hunter2/, s);
  const d = tmp(); writeState(d, { step: "Writing", memoryMB: 12, version: "9.9.9" }); writeLastError(d, "uncaughtException", new Error(`bad ${STANDIN_KEY}`)); logLine(d, `line ${STANDIN_KEY}`);
  const r = writeCrash(d, { code: 70, lines: [`printed ${STANDIN_KEY}`] }), all = readdirSync(join(d, "crash")).map((f) => readFileSync(join(d, "crash", f), "utf8")).join("\n"); assert.doesNotMatch(all, /abcdefgh12345678/); assert.doesNotMatch(supportText(r), /abcdefgh12345678/); rmSync(d, { recursive: true, force: true });
});

test("the crash file holds the exit code, the signal, the last error with its stack, the last step, the memory, what was printed, and the log", () => {
  const d = tmp(); writeState(d, { step: "Your AI is checking (4 of 18)", memoryMB: 640, version: "1.15.28" }); logLine(d, "Writing the pages"); writeLastError(d, "unhandledRejection", new TypeError("no such thing"));
  const r = writeCrash(d, { code: 70, signal: null, lines: ["one", "two"], restarted: true }); assert.equal(r.code, 70); assert.equal(r.hex, "0x46"); assert.equal(r.lastError.kind, "unhandledRejection"); assert.match(r.lastError.stack, /TypeError: no such thing/); assert.equal(r.lastStep, "Your AI is checking (4 of 18)"); assert.equal(r.memoryMB, 640); assert.deepEqual(r.printed, ["one", "two"]); assert.match(r.log[0], /Writing the pages/); assert.equal(r.version, "1.15.28"); assert.equal(crashFiles(d).length, 1);
  assert.match(r.words, /an error in the app itself: no such thing/); assert.match(crashLine(r), /during: Your AI is checking \(4 of 18\)\. The reason: an error in the app itself/); assert.match(crashLine(r), /started again by itself/);
  assert.equal(existsSync(join(d, "crash", "last-error.json")), false, "the next crash is not blamed on this error");
  const n = writeCrash(d, { code: 0xC0000409 }); assert.equal(n.hex, "0xC0000409"); assert.match(n.words, /a fault inside the Node program/); assert.equal(n.lastError, null);
  assert.equal(unseenCrash(d).hex, "0xC0000409"); crashSeen(d); assert.equal(unseenCrash(d), null, "said once"); rmSync(d, { recursive: true, force: true });
});

test("words for each ending; only the newest crash files are kept", () => {
  assert.equal(exitWords(-1073740791).hex, "0xC0000409", "as Windows may report it"); assert.match(exitWords(3221226505).words, /Node program/); assert.match(exitWords(null, "SIGTERM").words, /stopped from outside/); assert.match(exitWords(134).words, /out of memory/);
  const d = tmp(); for (let i = 0; i < KEEP + 3; i++) writeCrash(d, { code: 1, now: new Date(Date.UTC(2026, 10, 4, 1, 0, i)) }); assert.equal(crashFiles(d).length, KEEP); assert.match(crashFiles(d)[0], /01-00-03/); rmSync(d, { recursive: true, force: true });
});

/* the real supervisor, the real crash-record, a stand-in for the app */
const FAKE = `import { readFileSync, writeFileSync, existsSync } from "node:fs"; import { join } from "node:path"; const a = process.argv.slice(2), D = a.find((x) => x.startsWith("--data=")).slice(7), n = existsSync(join(D, "n")) ? Number(readFileSync(join(D, "n"), "utf8")) : 0, port = a.find((x) => x.startsWith("--port="))?.slice(7) ?? String(4100 + n), plan = JSON.parse(readFileSync(join(D, "plan.json"), "utf8")); writeFileSync(join(D, "n"), String(n + 1)); writeFileSync(join(D, "run.json"), JSON.stringify({ port, pid: process.pid })); writeFileSync(join(D, "ports"), (existsSync(join(D, "ports")) ? readFileSync(join(D, "ports"), "utf8") : "") + port + "\\n"); console.log("started", n, process.env.ALMIVISIBILITY_SUPERVISED); const code = plan[n] ?? 0; if (plan.stop?.[n]) writeFileSync(join(D, "app-asked-to-stop"), "x"); setTimeout(() => process.exit(code), 30);`;
const sandbox = (plan) => { const d = tmp(), app = join(d, "app"), data = join(d, "data"); mkdirSync(app); mkdirSync(data); for (const f of ["supervisor.mjs", "crash-record.mjs"]) cpSync(new URL(`../desktop/${f}`, import.meta.url), join(app, f)); writeFileSync(join(app, "package.json"), '{"type":"module"}'); writeFileSync(join(app, "main.mjs"), FAKE); writeFileSync(join(data, "plan.json"), JSON.stringify(plan)); return { d, app, data }; };
const runIt = ({ app, data }) => new Promise((res) => { const c = spawn(process.execPath, [join(app, "supervisor.mjs"), `--data=${data}`], { stdio: "ignore" }); c.on("exit", (code) => res(code)); });

test("THE REAL SUPERVISOR: a crash is written with its exit code and what was printed; the app starts again on the same port, knowing it is supervised; a good end ends it", async () => {
  const s = sandbox({ 0: 7, 1: 0 }), code = await runIt(s); assert.equal(code, 0); const r = JSON.parse(readFileSync(join(s.data, "crash", "latest.json"), "utf8")); assert.equal(r.code, 7); assert.equal(r.restarted, true); assert.deepEqual(r.printed, ["started 0 1"]); assert.equal(readFileSync(join(s.data, "n"), "utf8"), "2"); assert.deepEqual(readFileSync(join(s.data, "ports"), "utf8").trim().split("\n"), ["4100", "4100"]); rmSync(s.d, { recursive: true, force: true });
});
test("THE REAL SUPERVISOR: an app asked to stop is not started again and no crash is said", async () => {
  const s = sandbox({ 0: 1, stop: { 0: true } }); assert.equal(await runIt(s), 0); assert.equal(readFileSync(join(s.data, "n"), "utf8"), "1"); assert.equal(existsSync(join(s.data, "crash", "latest.json")), false); rmSync(s.d, { recursive: true, force: true });
});
test("a crash that repeats is not hidden: the count stops", () => {
  const now = 1e9, t = Array.from({ length: RESTARTS }, (_, i) => now - i * 1000); assert.equal(mayRestart(t, now), false); assert.equal(mayRestart(t.slice(1), now), true); assert.equal(mayRestart(t, now + 16 * 60e3), true, "an old run of crashes no longer counts");
  assert.deepEqual(withPort(["--data=x", "--port=0"], 5000), ["--data=x", "--port=5000"]); assert.deepEqual(withPort(["--data=x"], null), ["--data=x"]); assert.equal(ENDED_WELL(0, null), true); assert.equal(ENDED_WELL(1, null), false); assert.equal(ENDED_WELL(0, "SIGTERM"), false);
});

test("every way the app ends by its own error writes why before it ends; the launcher starts the supervisor; no second watcher", () => {
  const m = read("desktop/main.mjs"), s = read("installer/Setup.cs"); assert.match(m, /process\.on\("uncaughtException", lastWords\("uncaughtException"\)\)/); assert.match(m, /process\.on\("unhandledRejection", lastWords\("unhandledRejection"\)\)/); assert.match(m, /writeLastError\(DATA, kind, e\);[^;]*;[^;]*;\s*process\.exit\(70\)/); assert.match(m, /setInterval\(nowDoing, 2000\)/); assert.match(m, /function startWatchdog\(id\) \{ if \(SUPERVISED\) return;/);
  assert.match(s, /"desktop", "supervisor\.mjs"\)/); assert.match(s, /if \(!File\.Exists\(main\)\) main = Path\.Combine\(dir, "app", "desktop", "main\.mjs"\)/, "an older package still starts");
  const b = read("desktop/build.mjs"); for (const f of ["supervisor.mjs", "crash-record.mjs", "runtime-pin.mjs"]) assert.ok(b.includes(`"${f}"`), `${f} is in the package`);
});

test("THE SCREEN: the crash line, the copy button, once; the judge's real reason on Pages; Home shows only the latest run", () => {
  const u = read("desktop/ui.html"), m = read("desktop/main.mjs"); assert.match(u, /Send this to support \(copy\)/); assert.match(u, /navigator\.clipboard\.writeText\(c\.support\)/); assert.match(u, /crashNotice\(J\.crash\)/); assert.match(u, /fetch\("\/api\/crash\/seen", \{ method: "POST" \}\)/); assert.match(m, /crash: c \? \{ line: crashLine\(c\), support: supportText\(c\) \} : null/);
  assert.match(u, /PS\.judgeWhy \? `<p class="warn" id="judgewhy">/); assert.match(m, /judgeWhy: pread\(id, "qa-run\.json", \{\}\)\.why \?\? null/);
  assert.match(m, /report: latestReport\(id, s\)/); assert.match(m, /Date\.parse\(saved\.on\) >= Date\.parse\(pg\.madeOn\)\) return saved/); assert.doesNotMatch(read("desktop/qa-judge.mjs"), /the next step does that/);
});

test("the ready line names a button, says when this run is doing it, and gives the real reason", () => {
  const wait = { readyAsDraft: false, gates: [{ pass: false, failing: ["An answer is still being checked by your AI"] }] }, ok = { readyAsDraft: true };
  assert.equal(readyLine([ok, wait]), "1 page is ready for you. 1 is waiting for your AI to check their answers. Press Create SEO pages to check them."); assert.match(readyLine([wait], { judging: true }), /This run is doing that now\.$/); assert.ok(readyLine([wait], { why: REFUSED_KEY }).endsWith(REFUSED_KEY)); assert.equal(readyLine([ok]), "1 page is ready for you.", "nothing waiting: nothing said"); assert.match(REFUSED_KEY, /Settings → Your AI assistant, then press Create SEO pages/);
});

const answer = (status, body = {}) => async () => ({ ok: status < 400, status, json: async () => body });
const usage = { input_tokens: 10, output_tokens: 5 }, rows = (n) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, title: "T", q: "Q", a: "A" }));
const good = async (_u, init) => { const b = JSON.parse(JSON.parse(init.body).messages[0].content); return { ok: true, status: 200, json: async () => ({ usage, content: [{ type: "text", text: JSON.stringify({ verdicts: b.map((r) => ({ i: r.i, fits: true, reason: "r", intent: "other", place: true, worth: true })) }) }] }) }; };

test("401 and 403 are saved apart, with different words; both stop the run: no money goes on a key that is refused", async () => {
  const a = await judgeBatch({ key: "k", rows: rows(1), fetchImpl: answer(401) }), b = await judgeBatch({ key: "k", rows: rows(1), fetchImpl: answer(403) }); assert.deepEqual([a.status, a.fail, a.stop], [401, REFUSED_KEY, true]); assert.deepEqual([b.status, b.fail, b.stop], [403, NOT_ALLOWED, true]); assert.notEqual(REFUSED_KEY, NOT_ALLOWED);
  let calls = 0; const r = await judgeAll({ key: "k", rows: rows(90), batch: 30, side: 1, fetchImpl: async () => { calls++; return answer(403)(); } }); assert.equal(calls, 1); assert.equal(r.status, 403); assert.equal(r.why, NOT_ALLOWED);
  const m = read("desktop/main.mjs"); assert.match(m, /why = r\.why; code = r\.status \?\? code;/); assert.match(m, /usd: runUsd, why, code, judged/);
});

test("MONEY: each batch is handed over the moment it returns, and main writes it to disk there; a crash after batch 2 keeps batch 1 and 2", async () => {
  const saved = []; let n = 0; await assert.rejects(judgeAll({ key: "k", rows: rows(90), batch: 30, side: 1, fetchImpl: async (u, i) => { if (++n === 3) throw Object.assign(new Error("gone"), { fatal: true }); return good(u, i); }, onDone: (_n, _o, got) => saved.push(Object.keys(got).length) }).then((r) => { if (r.why) throw new Error(r.why); }), /did not answer/); assert.deepEqual(saved, [30, 30], "the two that came back were handed over before the third failed");
  assert.match(read("desktop/main.mjs"), /onDone: \(n, _o, got\) => \{ Object\.assign\(verdicts, got\); [^}]*pwrite\(id, VERDICTS_FILE, verdicts\); step\(\{ done: n \}\);/);
});

test("THE WATCHER covers the judge pass: the mark stays until the improving line ends", () => {
  const m = read("desktop/main.mjs"); assert.match(m, /if \(!improving\.has\(id\)\) rmSync\(pfile\(id, "run-in-progress\.json"\)/); assert.match(m, /\.finally\(\(\) => \{ improving\.delete\(id\); if \(!making\.has\(id\)\) rmSync\(pfile\(id, "run-in-progress\.json"\)/); assert.match(m, /pwrite\(id, "run-in-progress\.json", \{ on: new Date\(\)\.toISOString\(\) \}\); startWatchdog\(id\);\n  improving\.set\(id, \{ run, state \}\);/); assert.match(m, /existsSync\(pfile\(p\.id, "run-in-progress\.json"\)\) && !making\.has\(p\.id\)\) createPages\(p\.id\)/, "a new start goes on with the run");
});

test("THE NODE PROGRAM: a REAL build ships only the pinned one, refused before anything is written; 24.15.0 cannot come back", () => {
  assert.match(RUNTIME_PIN.sha256, /^[0-9a-f]{64}$/); assert.notEqual(RUNTIME_PIN.version, "24.15.0"); assert.match(RUNTIME_PIN.source, /^https:\/\/nodejs\.org\/dist\//);
  assert.equal(runtimeFault("x", { hash: () => RUNTIME_PIN.sha256 }), null); assert.match(runtimeFault("x", { hash: () => "0".repeat(64) }), /not the pinned Node/); assert.match(runtimeFault("no-such-file"), /cannot be read/);
  const b = read("desktop/build.mjs"); assert.ok(b.indexOf("runtimeFault(RUNTIME)") < b.indexOf("mkdirSync(join(stage")); assert.match(b, /if \(fault && !TEST_KEYS\) \{.{0,200}process\.exit\(5\)/); assert.match(b, /copyFileSync\(RUNTIME, join\(stage, "runtime", "node\.exe"\)\)/); assert.doesNotMatch(b, /copyFileSync\(process\.execPath/);
});
