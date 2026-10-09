/**
 * 🔴 RR-232 — THE DECLARATIONS THE CLIENT-IDENTITY GUARD READS (tools/client-identity-guard.mjs), and nothing else.
 *
 * Client identifiers are never written here: the guard DERIVES them from the tenant declarations in the data root (subject ids, the site
 * origins attached to tenants, the first path segments of declared seeds, channel handles once declared). This file declares only:
 *
 *   OPERATOR_IDENTITY       the ONE identity of the engine's operator, BY NAME. It is not a client identifier (technical ruling, RR-232
 *                           REV2, Q1): the guard removes the name and the operator's own apex domain — a two-label host whose first
 *                           label is that name — from the derived client set; a sub-domain of it stays a client's. No host is written
 *                           here (the subject packages' neutrality census flags any host in code). Exactly one entry; the guard refuses
 *                           a second, and refuses an operator entry that equals a declared client subject.
 *   GENERIC_PATH_STOPLIST   generic web path words that are no client's identity (Q3). A word here that equals any declared client
 *                           identifier turns the guard RED.
 */
export const OPERATOR_IDENTITY = Object.freeze([
  Object.freeze({ name: "AlmiWorld" }),
]);

export const GENERIC_PATH_STOPLIST = Object.freeze(["/register", "/about-us", "/about", "/contact", "/login", "/blog", "/privacy", "/terms"]);
