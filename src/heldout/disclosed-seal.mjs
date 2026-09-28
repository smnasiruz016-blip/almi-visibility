/**
 * 🔴 A DISCLOSED SEAL'S RESULTS CARRY THEIR CLASS WHEREVER THEY APPEAR (F10 Acceptance Amendment 3, C3).
 *
 * When a sealed set's membership-blind class has been withdrawn (config/fboard/disclosed-seals.mjs), a scoring result on it:
 *   · is STATED with the class name first, before anything is requested or scored;
 *   · is STORED only in a release store whose path names the class — never in the ordinary release store;
 *   · can never make its row VERIFIED-PASS (src/fboard/board.mjs).
 * This module decides only that; it reads no sealed value and changes no scoring rule. Generic: it knows no subject or tenant.
 */
export const DISCLOSED_RELEASE_DIR = "evaluation-releases/disclosed-population-agreement";

/**
 * The disclosure that governs a registered set entry, or null. A set is disclosed only when BOTH its id and its registered
 * commitment equal a listed disclosed set — a re-registered set with another commitment is a different seal.
 */
export function disclosureOf(entry, seals) {
  if (!entry || typeof entry.id !== "string") return null;
  for (const s of seals ?? []) if ((s.sets ?? []).some((x) => x.id === entry.id && x.contentHash === entry.contentHash)) return s;
  return null;
}

/** The release store a run must write to: the ordinary one, or — for a disclosed seal — the class-named one. */
export function releaseStoreFor(defaultStore, disclosure) {
  if (!disclosure) return defaultStore;
  const base = String(defaultStore).split("/").pop();
  return `${DISCLOSED_RELEASE_DIR}/${base}`;
}

/** The statement that must precede and accompany every result on a disclosed seal. */
export function classStatement(disclosure) {
  return disclosure ? `EVIDENCE CLASS ${disclosure.evidenceClass} — ${disclosure.meaning}` : null;
}
