/**
 * 🔴 F10 · C3 · THE N=100 SEAT ALLOCATION — ADOPTED AS WRITTEN (owner ruling 1.4, _handoffs f45a33c).
 *
 * The function below is copied BYTE FOR BYTE from the committed proof (_handoffs 4874299,
 * AlmiVisibility_F10_OF2_ALLOCATION_PROOF_2026-09-26.mjs, blob 6d267dd6…): capped equal share, then capacity-bounded
 * proportional redistribution with largest remainders, ties broken by sha256 of the tenant identity. Its text is pinned by
 * ALLOCATE_SOURCE_SHA256 (re-derived from that blob when it was copied); a changed byte turns the pin red. Nothing here selects
 * a row: it turns per-tenant CAPACITIES into per-tenant SEAT COUNTS. Generic: names no tenant.
 */
import { createHash } from "node:crypto";

const key = (id) => createHash("sha256").update(id, "utf8").digest("hex"); // the tenant's committed-identity hash

/** sha256 of the function text below, exactly as committed at 4874299 (LF). */
export const ALLOCATE_SOURCE_SHA256 = "fb9cfa72a60b35b6af593794cc3f95d188d0171e50bdb0e5272125f6ba5d3c32";

export function allocate(tenants, N, { tieBreak = "hash" } = {}) {
  if (!Number.isInteger(N) || N < 0) throw new Error("REFUSED: N must be a non-negative integer");
  const ids = new Set();
  for (const t of tenants) {
    if (typeof t.id !== "string" || ids.has(t.id)) throw new Error("REFUSED: tenant ids must be unique strings");
    if (!Number.isInteger(t.cap) || t.cap < 0) throw new Error("REFUSED: capacity must be a non-negative integer");
    ids.add(t.id);
  }
  const total = tenants.reduce((a, t) => a + t.cap, 0);
  if (total < N) throw new Error(`REFUSED: total capacity ${total} is below N ${N} — fewer than N seats is never returned`);
  // canonical order: by identity hash, so nothing below depends on the order of the input (the variant breaks this)
  const order = tieBreak === "hash" ? [...tenants].sort((a, b) => (key(a.id) < key(b.id) ? -1 : 1)) : [...tenants];
  const pos = tenants.filter((t) => t.cap > 0);
  if (N < pos.length) throw new Error(`REFUSED: N ${N} is below the ${pos.length} tenants with capacity — D5b requires every eligible tenant represented`);
  const seats = new Map(order.map((t) => [t.id, 0]));
  if (pos.length === 0) return seats; // N = 0 here, by the two refusals above
  // 1 · capped equal share
  const q = Math.floor(N / pos.length);
  for (const t of order) seats.set(t.id, Math.min(t.cap, q));
  let R = N - [...seats.values()].reduce((a, b) => a + b, 0);
  const spare = (t) => t.cap - seats.get(t.id);
  let E = order.filter((t) => spare(t) > 0);
  // 2 · redistribution: a tenant whose proportional quota reaches its spare capacity is filled and leaves; repeat
  for (;;) {
    if (R > 0 && E.length === 0) throw new Error("REFUSED: seats remain but no tenant has capacity (unreachable when total ≥ N)");
    const S = E.reduce((a, t) => a + t.cap, 0);
    const full = E.filter((t) => R * t.cap >= S * spare(t)); // quota R·cap/S ≥ spare, compared in integers
    if (full.length === 0) break;
    for (const t of full) { R -= spare(t); seats.set(t.id, t.cap); }
    E = E.filter((t) => !full.includes(t));
  }
  // 3 · integer rounding: floor of each quota, then the L leftover seats by largest integer remainder, ties by identity hash
  const S = E.reduce((a, t) => a + t.cap, 0);
  let given = 0;
  for (const t of E) { const f = Math.floor((R * t.cap) / S); seats.set(t.id, seats.get(t.id) + f); given += f; }
  const L = R - given;
  const ranked = [...E].sort((a, b) => ((R * b.cap) % S) - ((R * a.cap) % S) || (tieBreak === "hash" ? (key(a.id) < key(b.id) ? -1 : 1) : 0));
  for (const t of ranked.slice(0, L)) seats.set(t.id, seats.get(t.id) + 1);
  return seats;
}
