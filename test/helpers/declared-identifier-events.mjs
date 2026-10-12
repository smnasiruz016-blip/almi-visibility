/**
 * 🔴 THE AUDIT TRAIL WITHOUT ITS DECLARED IDENTIFIER EVENTS — one rule, shared by every guard that scans the trail for a client or
 * product identifier (RR-251; config/known-identifier-events.mjs).
 *
 * The trail is append-only and is never reset, so an event that broke the "ZERO client or product identifiers" law stays. Each is
 * DECLARED by its id AND by the sha256 of its exact line. This returns the trail with exactly those lines set aside — after proving,
 * every time, that each declared event is there ONCE, unchanged, really carries an identifier (an idle exception is removed, never
 * kept), and names its committed record; and that the exception is that LINE and nothing wider.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { KNOWN_IDENTIFIER_EVENTS } from "../../config/known-identifier-events.mjs";
import { PRODUCT_WORDS } from "../../tools/product-boundary.mjs";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const names = (line) => PRODUCT_WORDS.some((w) => new RegExp(w, "i").test(line));

/** 🔴 every entry is the owner's to allow: the count is pinned here, in one place */
export const DECLARED_IDENTIFIER_EVENTS = 1;

/** @param {string} whole  the committed trail, every byte · @returns {string} the trail with exactly the declared lines set aside */
export function trailWithoutDeclaredIdentifierEvents(whole, known = KNOWN_IDENTIFIER_EVENTS) {
  const lines = whole.split("\n").map((l) => l.replace(/\r$/, ""));
  for (const k of known) {
    const at = lines.filter((l) => l.includes(`"eventId":"${k.eventId}"`));
    assert.equal(at.length, 1, `declared event ${k.eventId} is on ${at.length} trail line(s)`);
    assert.equal(sha256(at[0]), k.lineSha256, `declared event ${k.eventId} no longer hashes to its pin`);
    assert.ok(names(at[0]), `declared event ${k.eventId} carries no identifier — an idle exception is removed, never kept`);
    assert.ok(/^_handoffs [0-9a-f]{40} \S+\.md$/.test(k.evidenceRecord) && /^[0-9a-f]{64}$/.test(k.evidenceSha256) && typeof k.ownerRatification === "string" && k.ownerRatification.length > 0, `declared event ${k.eventId} names no committed record`);
    /* CONTROL: the same event under another id, or its line changed by one character, is NOT the declared line and is still seen */
    for (const moved of [at[0].replace(k.eventId, "f".repeat(32)), `${at[0]} `]) assert.ok(sha256(moved) !== k.lineSha256 && names(moved), "CONTROL: an undeclared copy of a declared line must still be seen");
  }
  assert.equal(known.length, DECLARED_IDENTIFIER_EVENTS, "the register of declared identifier events moved — every entry is the owner's to allow");
  const declared = new Set(known.map((k) => k.lineSha256));
  const kept = lines.filter((l) => !declared.has(sha256(l)));
  assert.equal(lines.length - kept.length, known.length, "more lines were set aside than are declared");
  return kept.join("\n");
}
