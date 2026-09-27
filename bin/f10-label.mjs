#!/usr/bin/env node
/**
 * 🔴 F10 · THE OWNER'S LABELLING — run BY THE OWNER, in his own terminal (command ec3bbaf §5).
 *
 *   node bin/f10-label.mjs status          how far each task is (counts only)
 *   node bin/f10-label.mjs c6              judge the 100 questions (what is the person asking?)
 *   node bin/f10-label.mjs c7              judge the question pairs (is the second a likely next question?)
 *   node bin/f10-label.mjs finish c6|c7    when a task is complete: write its key — REFUSED while anything is unanswered
 *
 * Storage S is found ONLY through its declared reference (ALMIVISIBILITY_SEALED_STORE_F10_KEY); its location is never printed.
 * Every answer is saved to S the moment it is typed. Stop at any time with s (or close the window): the next run continues at the
 * first unanswered item. The judging commands need a real terminal — an automated caller cannot label for the owner.
 */
import { createInterface } from "node:readline/promises";
import { SEALED_STORE_ROOTS } from "../config/evidence-roles.mjs";
import { resolveSealedStoreRoots } from "../src/governance/sealed-store-roots.mjs";
import { inVerifiedTestContext } from "../src/governance/governed-run.mjs";
import { TASKS, readQueue, readProgress, parseAnswer, recordAnswer, standing, finishTask, LabellingRefused } from "../src/discovery/f10-labelling.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
const stores = resolveSealedStoreRoots({ declared: SEALED_STORE_ROOTS });
const S = stores.roots["f10-marking-key"];
if (!S) { console.error(`Storage S is not found (${stores.codes["f10-marking-key"]}). Set ALMIVISIBILITY_SEALED_STORE_F10_KEY, then open a NEW terminal.`); process.exit(2); }

if (cmd === "status" || !cmd) {
  for (const t of Object.keys(TASKS)) { const s = standing(S, t); console.log(`${t.toUpperCase()}  ${s.answered} of ${s.total} judged${s.next ? ` · next is number ${s.next}` : s.total ? " · COMPLETE — run: node bin/f10-label.mjs finish " + t : ""}`); }
  process.exit(0);
}
if (cmd === "finish") {
  const t = argv[1];
  if (!TASKS[t]) { console.error("say which: finish c6  or  finish c7"); process.exit(2); }
  try { const r = finishTask(S, t); console.log(`${t.toUpperCase()} KEY WRITTEN — ${r.rows} judgements · commitment ${r.commitment}`); process.exit(0); }
  catch (e) { if (e instanceof LabellingRefused) { console.error(`NOT YET — ${e.message}`); process.exit(3); } throw e; }
}
if (!TASKS[cmd]) { console.error("usage: node bin/f10-label.mjs status | c6 | c7 | finish c6 | finish c7"); process.exit(2); }
if (!process.stdin.isTTY && !inVerifiedTestContext(process.env)) { console.error("Judging needs a real terminal: only the owner labels."); process.exit(4); }

const T = TASKS[cmd];
const queue = readQueue(S, cmd);
const rl = createInterface({ input: process.stdin, terminal: false });
/* Lines are read through ONE iterator, so answers typed (or pasted) ahead are never lost; the end of input is a stop. */
const lineIt = rl[Symbol.asyncIterator]();
const ask = async (q) => { process.stdout.write(q); const r = await lineIt.next(); return r.done ? "s" : String(r.value); };
const help = cmd === "c6"
  ? "  g = GOAL (trying to get or do something)   q = QUESTION (asking something)\n  c = CONCERN (worried: cost, risk, difficulty, worth it)   f = CONFUSION (unsure what it means / which one)\n  type every letter that applies (e.g. gq) · 0 = none of these · p = personal details · t = can't tell\n  b = back one · s = stop (everything so far is saved)"
  : "  y = YES, a likely next question · n = NO\n  p = personal details · t = can't tell · b = back one · s = stop (everything so far is saved)";
console.log(`\n${T.title}\n${help}\n`);
let i = Math.max(0, queue.findIndex((x) => !readProgress(S, cmd).has(x.item ?? x.pair)));
if (queue.every((x) => readProgress(S, cmd).has(x.item ?? x.pair))) { console.log(`All ${queue.length} are judged. Next: node bin/f10-label.mjs finish ${cmd}`); rl.close(); process.exit(0); }
while (i < queue.length) {
  const x = queue[i], id = x.item ?? x.pair;
  const had = readProgress(S, cmd).get(id);
  console.log(`\nNumber ${x.n} of ${queue.length}${had ? "  (already answered — type a new answer to change it)" : ""}`);
  if (cmd === "c6") console.log(`  "${x.question}"`);
  else console.log(`  FIRST:  "${x.first}"\n  SECOND: "${x.next}"`);
  const typed = (await ask("> ")).trim().toLowerCase();
  if (typed === "s") { const s = standing(S, cmd); console.log(`Stopped. ${s.answered} of ${s.total} saved. Run the same command to continue.`); break; }
  if (typed === "b") { i = Math.max(0, i - 1); continue; }
  if (typed === "" && had) { i += 1; continue; }
  const p = parseAnswer(cmd, typed);
  if (p.error) { console.log(`  ${p.error}`); continue; }
  recordAnswer(S, cmd, id, p.answer, new Date().toISOString());
  i += 1;
  while (i < queue.length && readProgress(S, cmd).has(queue[i].item ?? queue[i].pair) && !had) i += 1;
}
if (i >= queue.length) { const s = standing(S, cmd); console.log(s.next ? `\n${s.answered} of ${s.total} judged — run again to finish number ${s.next}.` : `\nAll ${s.total} judged. Next: node bin/f10-label.mjs finish ${cmd}`); }
rl.close();
