/**
 * 🔴 RR-196 · WHICH STORE A RECORD WAS READ FROM — so one move written into two stores is read as ONE move, and a move written twice
 * into ONE store is still refused.
 *
 * A finding whose copies live in two stores is moved in BOTH (F90 reads a finding's copies identically, or fails closed). Read as one
 * population, the second, identical move would look like a move from a state the issue had already left. The lifecycle therefore
 * needs to know where each record came from — and that is a FACT ABOUT THE OBJECT, recorded by the reader that produced it
 * (src/evidence/store.mjs readAll), never a name inferred from content.
 *
 * A record no store reader produced — a fixture, a clone, a record built in memory — has NO store: `null`. Null never counts as a
 * different store, so such a record is judged exactly as before this module existed (fail closed).
 */
const READ_FROM = new WeakMap();

/** Record that `record` was read from the store at `storePath`. Returns the record. */
export function markReadFrom(record, storePath) {
  if (record && typeof record === "object" && typeof storePath === "string" && storePath !== "") READ_FROM.set(record, storePath);
  return record;
}

/** The store `record` was read from, or null when no store reader produced it. */
export function storeOfRecord(record) {
  return record && typeof record === "object" ? READ_FROM.get(record) ?? null : null;
}
