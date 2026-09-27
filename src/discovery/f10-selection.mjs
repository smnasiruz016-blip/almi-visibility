/**
 * 🔴 F10 · C3 · THE ONE GOVERNED N=100 SELECTION, THE C7 PAIR SET, AND THE OWNER'S LABELLING PACKET — sealed in storage S
 * (F10 Amendment 1, _handoffs 2ee6c2a; owner ruling S, 84abe3d; command ec3bbaf §4).
 *
 * `planSelection` decides, and refuses at the FIRST failed precondition — a refusal writes nothing:
 *   1. every F10 mechanism and scorer version is FROZEN at the current code, and every such freeze was recorded BEFORE this
 *      instant — a frozen version is a CLAIM ABOUT CODE, and an expired claim refuses (standing law, ec3bbaf §3.3);
 *   2. the eligible population reconciles with the committed accounting (256, remainder 0);
 *   3. the adopted allocation, re-derived, equals the frozen 37 · 22 · 16 · 12 · 5 · 2 · 2 · 2 · 2, and the same seats come out of a
 *      reversed tenant order (order independence);
 *   4. within each tenant, its seats go to its eligible rows with the LOWEST sha256 of their committed identity (D5b, 9fdda82:
 *      "deterministic tie-breaking by committed identity hash");
 *   5. the C7 pair set over the selected rows by the frozen pair rule: exactly K matched pairs per need (192 on these seats — a
 *      count that depends on the seats alone), at most one re-pair per matched pair, every pair distinct. How many re-pairs exist
 *      depends on the sealed identities' hashes, so N7 is MEASURED here, at the act: the packet's 374 (= 192 + 182) was a
 *      count-only estimate on constructed identities, and the frozen C7 text defines N7 as the pairs the rule declares.
 * `sealSelection` then writes INTO storage S — and nowhere else — once: the two sealed sets, the owner's two judgement queues (with
 * the wording the owner needs, never a mechanism output), and empty progress files; the door is checked shut first.
 *
 * Returns and prints COUNTS, the two commitments and the one-way-door statement. Never an identity, a wording or a label.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readdirSync, openSync, fsyncSync, closeSync, appendFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { deriveIdempotencyKey } from "../governance/governed-write.mjs";
import { allocate } from "./seat-allocation.mjs";
import { followUpPairs, pairFeasibility } from "./follow-up-pairs.mjs";
import { reconcileWithCommitted } from "./human-question-population.mjs";
import { populationCommitment } from "../heldout/lifecycle.mjs";

const h = (s) => createHash("sha256").update(s, "utf8").digest("hex");
export const SEALED_LAYOUT = Object.freeze({
  set: "set/items.txt", pairs: "pairs/pairs.txt",
  c6Queue: "packet/c6-questions.jsonl", c7Queue: "packet/c7-pairs.jsonl",
  c6Progress: "progress/c6-judgements.jsonl", c7Progress: "progress/c7-judgements.jsonl",
  readme: "README-OWNER.txt",
});

export class SelectionRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "SelectionRefused"; this.code = code; }
}

/**
 * versions: [{ role, id, codeHash }] · freezes: trail FROZEN events [{ metadata: { mechanismId, mechanismHash }, occurredAt }] ·
 * account: accountPopulation(...) · committed: COMMITTED_ACCOUNTING · K: C7_BAR.candidatesPerNeed · now: ISO instant.
 */
export function planSelection({ versions, freezes, account, committed, K, now }) {
  if (!Array.isArray(versions) || versions.length === 0) throw new SelectionRefused("VERSIONS_UNDECLARED", "the versions to be frozen are not declared");
  for (const v of versions) {
    const at = freezes.filter((e) => e.metadata?.mechanismId === v.id && e.metadata?.mechanismHash === v.codeHash).map((e) => e.occurredAt).sort()[0];
    if (!at) throw new SelectionRefused("VERSION_NOT_FROZEN_AT_THIS_CODE", `${v.role} (${v.id}) is not frozen at its current code — re-freeze first`);
    if (!(at < now)) throw new SelectionRefused("FREEZE_NOT_BEFORE_SELECTION", `${v.role} was frozen at or after this selection instant`);
  }
  const diffs = reconcileWithCommitted(account, committed);
  if (diffs.length) throw new SelectionRefused("POPULATION_NOT_RECONCILED", `the eligible population differs from the committed accounting: ${diffs.join(", ")}`);
  const tenants = [...account.eligibleItems].filter(([, it]) => it.length).map(([id, it]) => ({ id, cap: it.length }));
  const seats = allocate(tenants, committed.allocationDescending.reduce((a, b) => a + b, 0));
  const reversed = allocate([...tenants].reverse(), committed.allocationDescending.reduce((a, b) => a + b, 0));
  if ([...seats].some(([t, n]) => reversed.get(t) !== n)) throw new SelectionRefused("ALLOCATION_ORDER_DEPENDENT", "the allocation depends on the tenant order");
  const desc = [...seats.values()].sort((a, b) => b - a);
  if (JSON.stringify(desc) !== JSON.stringify([...committed.allocationDescending])) throw new SelectionRefused("ALLOCATION_NOT_FROZEN", "the re-derived allocation differs from the frozen one");
  const selected = new Map();
  for (const [t, n] of seats) {
    const ranked = [...account.eligibleItems.get(t)].sort((a, b) => { const x = h(a.itemId), y = h(b.itemId); return x < y ? -1 : x > y ? 1 : 0; });
    selected.set(t, ranked.slice(0, n));
  }
  const total = [...selected.values()].reduce((a, it) => a + it.length, 0);
  const expectedN = desc.reduce((a, b) => a + b, 0);
  if (total !== expectedN) throw new SelectionRefused("SELECTION_COUNT", `selected ${total}, expected ${expectedN}`);
  const pairs = followUpPairs(new Map([...selected].map(([t, it]) => [t, it.map((x) => x.itemId)])), K);
  const feas = pairFeasibility(desc, K);
  const matched = pairs.filter((p) => p.kind === "MATCHED").length, repaired = pairs.length - matched;
  if (matched !== feas.matched) throw new SelectionRefused("PAIR_COUNT", `the pair set holds ${matched} matched pairs, the seats require ${feas.matched}`);
  if (repaired > matched || new Set(pairs.map((p) => p.id)).size !== pairs.length) throw new SelectionRefused("PAIR_COUNT", "more re-pairs than matched pairs, or a duplicate pair");
  const consumed = [...seats].filter(([t, n]) => n === account.eligibleItems.get(t).length).length;
  return {
    selected, pairs,
    counts: { eligible: committed.eligible, tenants: seats.size, selected: total, seatsDescending: desc, capacitiesDescending: [...committed.eligibleCapacitiesDescending], remainder: expectedN - total, pairs: pairs.length, matched, repaired, estimatedPairs: feas.declared, tenantsConsumedToCapacity: consumed },
    commitments: { set: populationCommitment([...selected.values()].flat().map((x) => x.itemId)), pairs: populationCommitment(pairs.map((p) => p.id)) },
  };
}

/** Write one file durably: the bytes, then an fsync, so progress survives an interruption. */
function writeDurable(path, text) {
  writeFileSync(path, text);
  const fd = openSync(path, "r+"); fsyncSync(fd); closeSync(fd);
}

/** Seal a plan into storage S. Refuses when anything is already there — the door opens ONCE. Returns the files written (relative). */
export function sealSelection({ store, plan, ownerReadme }) {
  if (typeof store !== "string" || !existsSync(store)) throw new SelectionRefused("SEALED_STORE_UNLOCATED", "storage S is not located");
  if (readdirSync(store).length !== 0) throw new SelectionRefused("ALREADY_SEALED", "storage S is not empty — a selection is sealed once, and never re-drawn");
  const shuffled = (xs, salt) => [...xs].sort((a, b) => { const x = h(`${salt}|${a.key}`), y = h(`${salt}|${b.key}`); return x < y ? -1 : x > y ? 1 : 0; });
  const all = [...plan.selected.values()].flat();
  const wording = new Map(all.map((x) => [x.itemId, x.query]));
  const c6 = shuffled(all.map((x) => ({ key: x.itemId, item: x.itemId, question: x.query })), "c6").map((x, n) => JSON.stringify({ n: n + 1, item: x.item, question: x.question }));
  const c7 = shuffled(plan.pairs.map((p) => ({ key: p.id, pair: p.id, first: wording.get(p.need), next: wording.get(p.cand) })), "c7").map((x, n) => JSON.stringify({ n: n + 1, pair: x.pair, first: x.first, next: x.next }));
  const files = {
    [SEALED_LAYOUT.set]: all.map((x) => x.itemId).join("\n") + "\n",
    [SEALED_LAYOUT.pairs]: plan.pairs.map((p) => p.id).join("\n") + "\n",
    [SEALED_LAYOUT.c6Queue]: c6.join("\n") + "\n",
    [SEALED_LAYOUT.c7Queue]: c7.join("\n") + "\n",
    [SEALED_LAYOUT.c6Progress]: "",
    [SEALED_LAYOUT.c7Progress]: "",
    [SEALED_LAYOUT.readme]: ownerReadme,
  };
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(store, rel.split("/").slice(0, -1).join("/") || "."), { recursive: true });
    writeDurable(join(store, rel), text);
  }
  return Object.keys(files);
}

/** The owner's instructions, written into S beside the packet (command ec3bbaf §5): plain steps, no identity, no location. */
export const OWNER_README = String.raw`ALMIVISIBILITY · F10 · YOUR LABELLING PACKET
============================================

This folder is storage S. It holds the 100 sealed questions and the question pairs.
Only you label. Nobody else sees your answers. Nothing here is ever put in git.

There are two jobs:
  C6 - 100 questions: what is the person asking?
  C7 - question pairs: is the SECOND a likely next question after the FIRST?

You can do them in any order, over as many sittings as you like.


HOW TO START (each sitting)
---------------------------
1. Open PowerShell.
2. Type:   cd C:\Projects\almi-visibility
3. Type:   node bin/f10-label.mjs status
   This shows how many you have done in each job.
4. To work on C6, type:   node bin/f10-label.mjs c6
   To work on C7, type:   node bin/f10-label.mjs c7


HOW TO ANSWER
-------------
C6 - one question at a time. Type every letter that fits, then press Enter:
   g = GOAL       (trying to get or do something)
   q = QUESTION   (asking something)
   c = CONCERN    (worried about cost, risk, difficulty, or whether it is worth it)
   f = CONFUSION  (unsure what something means, or which one applies)
   Example: gq  means GOAL and QUESTION.
   0 = none of these
   p = it contains personal details (leave it out)
   t = I cannot tell

C7 - two questions at a time, FIRST and SECOND. Press one key, then Enter:
   y = yes, someone who asked the FIRST would likely ask the SECOND next
   n = no
   p = personal details (leave it out)
   t = I cannot tell

In both jobs:
   b = go back one (to change an answer)
   s = stop for now


HOW TO STOP
-----------
Type s and press Enter. Or simply close the window.
Every answer is saved the moment you press Enter.
Next time, run the same command: it starts at the first one you have not answered.


WHERE YOUR PROGRESS IS SAVED
----------------------------
In this folder, under  progress\  (one file per job).
Please do not edit or delete those files.
If this folder is lost, your answers are lost too. Keep a copy somewhere private if you wish, never in git.


WHEN A JOB IS FINISHED
----------------------
Type:   node bin/f10-label.mjs finish c6     (or  finish c7)
If anything is still unanswered, it says NOT YET and how many are left. Nothing is spent.
When everything is answered, it writes the key and says KEY WRITTEN.

Then tell Claude Code: "C6 key written" or "C7 key written". The one scoring run happens only after that.
`;

/* ═══ THE SEAL, THROUGH THE GOVERNED-WRITE BOUNDARY (src/governance/governed-write.mjs executeGovernedWrite) ═══════════════
 * The seal is a governed state change, so it is never a direct write: the boundary AUTHORISES the named actor (F04), runs the
 * PREVALIDATION below, records ATTEMPTED, commits (the packet into S, then ONE count-only seal record), verifies by inspection and
 * records COMMITTED. The seal record — counts, commitments and the one-way-door statement, never an identity — is the boundary's
 * target, in its own top-level store. Its idempotency key is derived from the set's commitment: the door opens once.
 */
export const SEAL_RECORD_STORE = "evaluation-releases/selection-seals.jsonl";
const PROFILE = "VALIDATED_APPEND";
const TARGET_CLASS = "RUN_EVIDENCE";

export function governedSealing({ repo, permission, audit, store, plan, planFault = null, ownerReadme, occurredAt, versions = [] }) {
  const fingerprint = plan ? plan.commitments.set : h(`refused:${planFault?.code ?? "NO_PLAN"}:${occurredAt}`);
  const key = deriveIdempotencyKey({ profile: PROFILE, targetClass: TARGET_CLASS, repoRelativeTarget: SEAL_RECORD_STORE, occurrenceFingerprint: fingerprint });
  const recordPath = join(repo, SEAL_RECORD_STORE);
  const records = () => (existsSync(recordPath) ? readFileSync(recordPath, "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)) : []);
  let last = null;
  const adapter = {
    profile: PROFILE,
    describeTarget: () => ({ targetClass: TARGET_CLASS, repoRelativeTarget: SEAL_RECORD_STORE }),
    inspect: (k) => {
      const hit = records().filter((r) => r.governedWriteKey === k);
      return hit.length === 0 ? { state: "ABSENT" } : hit.length === 1 ? { state: "COMMITTED" } : { state: "CONFLICTING", fields: "DUPLICATE_SEAL" };
    },
    prevalidate: () => {
      if (planFault) return [{ code: planFault.code }];
      if (typeof store !== "string" || !existsSync(store)) return [{ code: "SEALED_STORE_UNLOCATED" }];
      if (readdirSync(store).length !== 0) return [{ code: "ALREADY_SEALED" }];
      if (records().length !== 0) return [{ code: "ALREADY_SEALED" }];
      return [];
    },
    commit: () => {
      sealSelection({ store, plan, ownerReadme });
      const c = plan.counts;
      const record = {
        governedWriteKey: key, occurredAt, actor: String(permission?.actorRef ?? "UNNAMED"),
        eligible: c.eligible, tenants: c.tenants, selected: c.selected, remainder: c.remainder,
        seatsDescending: c.seatsDescending, capacitiesDescending: c.capacitiesDescending,
        pairs: c.pairs, matched: c.matched, repaired: c.repaired, estimatedPairs: c.estimatedPairs,
        tenantsConsumedToCapacity: c.tenantsConsumedToCapacity,
        setCommitment: plan.commitments.set, pairsCommitment: plan.commitments.pairs,
        versions: versions.map((v) => ({ id: v.id, codeHash: v.codeHash, frozenAt: v.frozenAt })),
        oneWayDoor: `SEALING IS IRREVERSIBLE: this selection is never re-drawn, and ${c.tenantsConsumedToCapacity} of ${c.tenants} tenants are consumed to their full eligible capacity — they hold ZERO unsealed eligible rows, permanently. Accepted knowingly by the owner (148d48f §5.4).`,
      };
      /* One seal record per key, checked against the records already present — never a second copy of the one seal. */
      if (records().some((r) => r.governedWriteKey === key)) throw Object.assign(new Error("a seal record for this selection already exists"), { code: "SEAL_ALREADY_RECORDED" });
      mkdirSync(dirname(recordPath), { recursive: true });
      appendFileSync(recordPath, `${JSON.stringify(record)}\n`);
      last = record;
    },
    verify: (k) => (adapter.inspect(k).state === "COMMITTED" ? [] : [{ code: "SEAL_RECORD_ABSENT" }]),
  };
  const action = { name: "RECORD_HELDOUT_EVALUATION", scopeType: "GLOBAL_PRODUCT", occurredAt, occurrenceFingerprint: fingerprint, evidenceRefs: [] };
  return Object.freeze({ permission, audit, adapter, action, idempotencyKey: key, record: () => last ?? records().find((r) => r.governedWriteKey === key) ?? null });
}
