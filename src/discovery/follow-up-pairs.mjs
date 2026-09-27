/**
 * 🔴 F10 · C7 · THE FROZEN PAIR RULE (F10 Amendment 1, _handoffs 2ee6c2a; the rule approved in the C7 packet, 90db63f, whose
 * count-only feasibility this function reproduces exactly: 374 = 192 matched + 182 re-paired on the adopted seats).
 *
 * For each sealed initial need i of a tenant holding s sealed items: K = min(candidatesPerNeed, s − 1) candidates c — the other
 * sealed items of the SAME tenant, ranked by sha256(i + "|" + c). The NEGATIVE CONTROL POPULATION: for each matched pair (i, c),
 * one RE-PAIR (j, c) — the same candidate against a DIFFERENT sealed need j of the same tenant, the first by sha256(c + "|" + j)
 * with j ≠ i, j ≠ c and (j, c) not already a pair. DISTINCT PAIRS ONLY: a tenant's matched pairs are all placed first; a
 * duplicate throws. A pure function of the sealed identities and their tenants — it reads NO mechanism output and no wording.
 *
 * Pair ids use the lifecycle's grammar (src/heldout/lifecycle.mjs parsePairStructure): `need>cand` for a matched pair and
 * `need>cand|partnerNeed>cand` for a re-pair. They are computed inside the governed selection act and never printed.
 */
import { createHash } from "node:crypto";

const h = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const byHash = (f) => (a, b) => { const x = f(a), y = f(b); return x < y ? -1 : x > y ? 1 : 0; };

export class PairRuleRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "PairRuleRefused"; this.code = code; }
}

/**
 * itemsByTenant: Map tenantId → [itemId…], the sealed set's members by their tenant. Returns [{ id, tenantId, need, cand, kind,
 * partner? }] — identities only. A pair never spans two tenants: both sides are drawn from one tenant's own members.
 */
export function followUpPairs(itemsByTenant, K) {
  if (!Number.isInteger(K) || K < 1) throw new PairRuleRefused("K_INVALID", "K is a positive integer");
  if (!(itemsByTenant instanceof Map)) throw new PairRuleRefused("ITEMS_ABSENT", "the rule runs over the sealed members by tenant");
  const out = [];
  const key = (need, cand) => `${need}>${cand}`;
  const everyItem = new Set();
  for (const [tenantId, raw] of itemsByTenant) {
    const items = [...raw];
    if (items.some((x) => typeof x !== "string" || x === "" || /[>|]/.test(x))) throw new PairRuleRefused("ITEM_ID_INVALID", "an item id is empty or carries a pair delimiter");
    if (items.some((x) => everyItem.has(x)) || new Set(items).size !== items.length) throw new PairRuleRefused("ITEM_DUPLICATED", "a sealed item occurs twice, or under two tenants");
    items.forEach((x) => everyItem.add(x));
    const seen = new Set();
    const matched = [];
    for (const i of items) {
      for (const c of items.filter((x) => x !== i).sort(byHash((x) => h(`${i}|${x}`))).slice(0, Math.min(K, items.length - 1))) {
        matched.push({ id: key(i, c), tenantId, need: i, cand: c, kind: "MATCHED" });
        seen.add(key(i, c));
      }
    }
    out.push(...matched);
    for (const m of matched) {
      const j = items.filter((x) => x !== m.need && x !== m.cand && !seen.has(key(x, m.cand))).sort(byHash((x) => h(`${m.cand}|${x}`)))[0];
      if (j) { out.push({ id: `${key(j, m.cand)}|${m.id}`, tenantId, need: j, cand: m.cand, kind: "REPAIRED", partner: m.need }); seen.add(key(j, m.cand)); }
    }
  }
  if (new Set(out.map((p) => key(p.need, p.cand))).size !== out.length) throw new PairRuleRefused("PAIR_DUPLICATED", "the pair population holds a duplicate");
  return out;
}

/** Count-only feasibility of the rule on seat counts alone — never an identity. */
export function pairFeasibility(seats, K) {
  const P = followUpPairs(new Map(seats.map((s, n) => [`t${n}`, Array.from({ length: s }, (_, k) => `t${n}#${k}`)])), K);
  const of = (kind) => P.filter((p) => p.kind === kind).length;
  return { declared: P.length, matched: of("MATCHED"), repaired: of("REPAIRED"), perTenant: seats.map((_, n) => [P.filter((p) => p.tenantId === `t${n}` && p.kind === "MATCHED").length, P.filter((p) => p.tenantId === `t${n}` && p.kind === "REPAIRED").length]) };
}
