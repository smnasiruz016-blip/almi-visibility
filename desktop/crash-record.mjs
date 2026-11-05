/**
 * 🔴 RR-372 (owner, 4 Nov 2026: the app stopped on his machine and left no trace of why). What the app was doing and how it ended, kept in the data folder's "crash" folder. A native crash runs no code of ours, so two sides keep it:
 * the app writes what it is doing while it can (state.json, app.log, last-error.json), and the supervisor, its parent, writes the crash record from the exit code when it has gone.
 * Nothing secret goes in: what is written passes scrub(), and the app logs no key. Pure but for the files.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CRASH_DIR = "crash", KEEP = 20, LOG_LINES = 200;
const dir = (data) => { const d = join(data, CRASH_DIR); mkdirSync(d, { recursive: true }); return d; };
const put = (file, obj) => { writeFileSync(`${file}.tmp`, JSON.stringify(obj, null, 1)); renameSync(`${file}.tmp`, file); };
const get = (file) => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return null; } };
/** a key, a token or a password never reaches a crash file, whatever wrote the line */
export const scrub = (t) => String(t ?? "").replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{8,}/g, "[hidden]").replace(/\bgh[pousr]_[A-Za-z0-9]{10,}/g, "[hidden]").replace(/\bgithub_pat_[A-Za-z0-9_]{10,}/g, "[hidden]").replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [hidden]").replace(/\b(x-api-key|api[_-]?key|authorization|password|secret|token)(["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/gi, "$1$2[hidden]");
/** what an exit code means, in plain words */
export function exitWords(code, signal) {
  const hex = Number.isInteger(code) ? `0x${(code >>> 0).toString(16).toUpperCase()}` : null;
  if (signal) return { hex, words: `it was stopped from outside (${signal})` };
  if (hex === "0xC0000409") return { hex, words: "a fault inside the Node program the app runs on, not in your data" };
  if (hex === "0xC0000005") return { hex, words: "a memory fault inside the program the app runs on" };
  if (hex === "0xC0000374") return { hex, words: "memory damage inside the program the app runs on" };
  if (code === 134) return { hex, words: "the app ran out of memory, or the program it runs on gave up" };
  if (code === 70) return { hex, words: "an error in the app itself" };
  return { hex, words: `it ended with code ${hex ?? code}` };
}
export const logLine = (data, line) => { try { appendFileSync(join(dir(data), "app.log"), `${new Date().toISOString()} ${scrub(line)}\n`); } catch { /* the record never stops the app */ } };
export const logTail = (data, n = LOG_LINES) => { try { return readFileSync(join(data, CRASH_DIR, "app.log"), "utf8").split("\n").filter(Boolean).slice(-n); } catch { return []; } };
/** keeps the log from growing: only what a crash file could use */
export const trimLog = (data) => { try { const f = join(data, CRASH_DIR, "app.log"); if (statSync(f).size > 256e3) writeFileSync(f, `${logTail(data).join("\n")}\n`); } catch { /* no log yet */ } };
export const writeState = (data, state) => { try { put(join(dir(data), "state.json"), { on: new Date().toISOString(), ...state }); } catch { /* the record never stops the app */ } };
/** the app's own last words: sync, before the process ends */
export function writeLastError(data, kind, e) { const x = e instanceof Error ? { name: e.name, message: scrub(e.message), stack: scrub(e.stack) } : { message: scrub(String(e)) }; try { put(join(dir(data), "last-error.json"), { on: new Date().toISOString(), kind, ...x }); } catch { /* nothing more can be done */ } }
export const clearLastError = (data) => { try { rmSync(join(data, CRASH_DIR, "last-error.json"), { force: true }); } catch { /* none */ } };
/** the crash file. → its record. `lines` = what the process printed; the state and the last error are what the app left */
export function writeCrash(data, { code = null, signal = null, lines = [], restarted = null, now = new Date() } = {}) {
  const d = dir(data), { hex, words } = exitWords(code, signal), lastError = get(join(d, "last-error.json")), state = get(join(d, "state.json")), on = now.toISOString();
  const record = { on, code, signal, hex, words: lastError ? `an error in the app itself: ${lastError.message}` : words, lastError, lastStep: state?.step ?? null, memoryMB: state?.memoryMB ?? null, stateOn: state?.on ?? null, version: state?.version ?? null, restarted, printed: lines.slice(-LOG_LINES).map(scrub), log: logTail(data), seen: false };
  put(join(d, `crash-${on.replace(/[:.]/g, "-")}.json`), record); put(join(d, "latest.json"), record);
  for (const f of crashFiles(data).slice(0, -KEEP)) rmSync(join(d, f), { force: true });
  clearLastError(data); return record;
}
export const crashFiles = (data) => { try { return readdirSync(join(data, CRASH_DIR)).filter((f) => /^crash-.+\.json$/.test(f)).sort(); } catch { return []; } };
/** the crash the screen has not shown yet, or null */
export const unseenCrash = (data) => { const r = get(join(data, CRASH_DIR, "latest.json")); return r && r.seen !== true ? r : null; };
export const crashSeen = (data) => { const f = join(data, CRASH_DIR, "latest.json"), r = get(f); if (r) put(f, { ...r, seen: true }); };
export const hasCrashRecord = (data) => existsSync(join(data, CRASH_DIR, "latest.json"));
/** what "Send this to support (copy)" gives: never a key, never a page's text */
export const supportText = (r) => [`AlmiVisibility crash record, ${r.on}`, `Version: ${r.version ?? "not known"}`, `How it ended: ${r.hex ?? r.signal ?? r.code} (${r.words})`, `Last step on screen: ${r.lastStep ?? "not known"}`, `Memory: ${r.memoryMB ?? "not known"} MB`, `Started again by itself: ${r.restarted === null ? "not known" : r.restarted ? "yes" : "no"}`, ...(r.lastError?.stack ? ["Error:", r.lastError.stack] : []), ...(r.printed?.length ? ["Printed:", ...r.printed] : []), ...(r.log?.length ? ["Log:", ...r.log] : [])].map(scrub).join("\n");
/** the one line the screen shows */
export const crashLine = (r) => `Visibility stopped at ${String(r.on).slice(11, 16)} UTC${r.lastStep ? ` during: ${r.lastStep}` : ""}. The reason: ${r.words}. ${r.restarted ? "It started again by itself, and what it had already done is kept." : "Open it again from its desktop icon; what it had already done is kept."}`;
