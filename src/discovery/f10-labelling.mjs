/**
 * 🔴 F10 · THE OWNER'S STAGED LABELLING — C6 (four classes) and C7 (likely next question), in storage S only (command ec3bbaf §4–§6).
 *
 * The owner judges alone, in as many sittings as he needs. Every answer is appended to a progress file in S and flushed to disk
 * (fsync) before the next question is shown, so an interruption — closing the window, a power cut — loses at most the answer being
 * typed. The latest answer for an item wins, so "back" can correct one. Nothing here shows a mechanism output: the owner is blind
 * to it.
 *
 * `finishTask` is the PREFLIGHT: it writes the marking key ONLY when every item has an answer; an incomplete key is REFUSED, and
 * nothing is written — the one scoring run can never be spent on it.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync, openSync, fsyncSync, closeSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SEALED_LAYOUT } from "./f10-selection.mjs";
import { keyCommitment } from "../heldout/lifecycle.mjs";

/** The two tasks: where their queue, progress and key live in S, and what each answer letter means. */
export const TASKS = Object.freeze({
  c6: Object.freeze({
    title: "C6 · what is the person asking?",
    queue: SEALED_LAYOUT.c6Queue, progress: SEALED_LAYOUT.c6Progress, key: "key/labels.jsonl",
    letters: Object.freeze({ g: "GOAL", q: "QUESTION", c: "CONCERN", f: "CONFUSION" }),
    none: "0", exclusions: Object.freeze({ p: "EXCLUDED_PERSONAL", t: "CANNOT_TELL" }),
  }),
  c7: Object.freeze({
    title: "C7 · is the SECOND question a likely next question after the FIRST?",
    queue: SEALED_LAYOUT.c7Queue, progress: SEALED_LAYOUT.c7Progress, key: "pairs-key/judgements.jsonl",
    letters: Object.freeze({ y: "LIKELY_NEXT", n: "NOT_LIKELY_NEXT" }),
    none: null, exclusions: Object.freeze({ p: "EXCLUDED_PERSONAL", t: "CANNOT_TELL" }),
  }),
});

export class LabellingRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "LabellingRefused"; this.code = code; }
}

const lines = (path) => (existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
export const readQueue = (store, task) => lines(join(store, TASKS[task].queue));
/** The owner's latest answer per item id. */
export const readProgress = (store, task) => new Map(lines(join(store, TASKS[task].progress)).map((r) => [r.id, r.answer]));

/**
 * Parse one typed answer. C6: any of g q c f (e.g. "gq"), or 0 for none, or p / t. C7: y or n, or p / t. Returns
 * { answer } or { error }. "b" (back) and "s" (stop) are handled by the caller.
 */
export function parseAnswer(task, typed) {
  const T = TASKS[task];
  const s = String(typed ?? "").trim().toLowerCase().replace(/[\s,]+/g, "");
  if (s in T.exclusions) return { answer: { exclusion: T.exclusions[s] } };
  if (T.none && s === T.none) return { answer: { classes: [] } };
  if (task === "c7") return s in T.letters ? { answer: { classes: T.letters[s] === "LIKELY_NEXT" ? ["LIKELY_NEXT"] : [] } } : { error: "type y, n, p or t" };
  if (!s || [...s].some((ch) => !(ch in T.letters)) || new Set(s).size !== s.length) return { error: "type letters from g q c f (e.g. gq), or 0, p or t" };
  const order = Object.keys(T.letters);
  return { answer: { classes: order.filter((ch) => s.includes(ch)).map((ch) => T.letters[ch]) } };
}

/** Append one answer and flush it to disk before returning. */
export function recordAnswer(store, task, id, answer, at) {
  const path = join(store, TASKS[task].progress);
  appendFileSync(path, JSON.stringify({ id, answer, at }) + "\n");
  const fd = openSync(path, "r+"); fsyncSync(fd); closeSync(fd);
}

/** Where the owner stands: answered / total, and the first unanswered queue position (1-based), or null when done. */
export function standing(store, task) {
  const q = readQueue(store, task), p = readProgress(store, task);
  const first = q.find((x) => !p.has(x.item ?? x.pair));
  return { total: q.length, answered: q.filter((x) => p.has(x.item ?? x.pair)).length, next: first ? first.n : null };
}

/**
 * THE PREFLIGHT. Writes the task's marking key into S ONLY when every queued item has an answer, and returns its count and
 * commitment (for its registration). Refuses — writing nothing — when any item is unanswered, or a different key is already there.
 */
export function finishTask(store, task) {
  const T = TASKS[task];
  const q = readQueue(store, task), p = readProgress(store, task);
  if (q.length === 0) throw new LabellingRefused("QUEUE_ABSENT", "there is nothing to label — the packet is not in this store");
  const missing = q.filter((x) => !p.has(x.item ?? x.pair)).length;
  if (missing > 0) throw new LabellingRefused("KEY_INCOMPLETE", `${missing} of ${q.length} still to judge — no key was written, and the one scoring run cannot start`);
  const rows = q.map((x) => ({ item: x.item ?? x.pair, ...p.get(x.item ?? x.pair) }));
  const text = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const path = join(store, T.key);
  if (existsSync(path) && readFileSync(path, "utf8") !== text) throw new LabellingRefused("KEY_ALREADY_DIFFERENT", "a different key is already in the store — nothing was overwritten");
  mkdirSync(join(store, T.key.split("/")[0]), { recursive: true });
  writeFileSync(path, text);
  const fd = openSync(path, "r+"); fsyncSync(fd); closeSync(fd);
  return { rows: rows.length, commitment: keyCommitment({ [T.key]: Buffer.from(text) }) };
}
