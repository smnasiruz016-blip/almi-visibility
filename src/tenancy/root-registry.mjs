/**
 * 🔴 F03 · THE ROOT REGISTRY — WHERE A SUBJECT'S DATA, A STORE AND A CONNECTOR ARE, BECAUSE A DECLARATION SAYS SO.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F03_FROZEN_ACCEPTANCE_2026-09-25.md (f9d1888, contract 4a65924a…).
 *
 * Each declared root (config/subject-roots.mjs) carries ONE registry file, `roots.json`, at its top. It declares:
 *   stores     the observation and declaration stores inside that root, by store kind and relative path
 *   subjects   each subject whose data root lives there: its relative path, the F02 resources (members) that constitute
 *              it, and the connectors the product may construct on its behalf — each naming the F02 resources it reaches
 *              and, where it needs one, its credential BY NAME (an environment reference, never a value)
 *
 * 🔴 WHAT CREATES A ROOT OR A CONNECTOR: the registry entry, and nothing else. A directory that is present, a file that is
 * called `product.mjs`, a host, a conventional path or a file claiming an identity in its own content creates nothing:
 * the engine never lists a directory to find a subject and never probes a path to find a store. A declared path that is
 * absent refuses; a present path that is not declared is invisible.
 *
 * 🔴 WHAT THIS MODULE NEVER DECIDES: tenancy. A registry entry names no tenant. Whether a subject or a connector may be used
 * for a tenant is F02's one decision (src/tenancy/scope.mjs), made over the members and reaches declared here against the
 * F02 attachments — so a registry entry can never disagree with F02, or reach beyond it: it has no tenant to disagree with.
 *
 * 🔴 PORTABLE BY CONSTRUCTION: every path is relative to the root that holds the registry, in "/" form, and is joined to
 * that root at run time. Wherever a root is mounted — a developer machine, a CI checkout, a relocated copy — the same
 * bytes resolve to the same place inside it. There is no absolute path, no environment branch and no default here.
 *
 * Refusal answers carry a reason CODE and, at most, a JSON path inside the registry — never a filesystem path, a host,
 * a payload or a value. Generic: this file names no subject, client, host or credential.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { findSecrets } from "../intake/secrets.mjs";

export const REGISTRY_FILE = "roots.json";
export const REGISTRY_KIND = "ROOT_REGISTRY";
export const REGISTRY_SCHEMA_VERSION = 1;

/** The stores a root may declare. A vocabulary, validated at read time; nothing branches on which one it is. */
export const STORE_KINDS = Object.freeze(["PROJECT_DECLARATIONS", "OBSERVATIONS", "CAPTURES", "RESEARCH"]);
/** What a connector does, generically. An entry point constructs a connector of ONE kind, named in its own code. */
export const CONNECTOR_KINDS = Object.freeze(["PUBLIC_SITE", "CITED_SOURCES", "SEARCH_CONSOLE_API", "QUESTION_SOURCE_API"]);
/** How a credential may be named. The only mechanism is a reference to an environment variable BY ITS NAME. */
export const CREDENTIAL_MECHANISMS = Object.freeze(["ENV_REFERENCE"]);

/**
 * 🔴 F10 (owner ruling S, _handoffs 84abe3d) · THE SEALED-STORE STORAGE DESCRIPTOR. A governed sealed store OUTSIDE every git
 * repository is declared by ONE descriptor: its store name, and its location as an environment reference BY NAME — the same
 * mechanism a connector's credential uses, so no location is ever committed. It is validated HERE, by F03's own vocabulary
 * (store names are LOCAL_ID, reference names ENV_NAME, the secret firewall over both), and located at run time by
 * src/governance/sealed-store-roots.mjs. A descriptor names a place; it never holds a path, a value or a secret.
 * Returns the refusal code, or null when the descriptor is lawful.
 */
export function sealedStoreDescriptorRefusal(name, ref, { reserved = [] } = {}) {
  if (typeof name !== "string" || !LOCAL_ID.test(name) || reserved.includes(name)) return "SEALED_STORE_NAME_INVALID";
  if (!exact(ref, FIELDS.credential) || !CREDENTIAL_MECHANISMS.includes(ref.mechanism) || typeof ref.name !== "string" || !ENV_NAME.test(ref.name)) return "SEALED_STORE_REFERENCE_INVALID";
  if (findSecrets({ name, ref }).length) return "SEALED_STORE_REFERENCE_INVALID";
  return null;
}

/** The answers a lookup can give. Only DECLARED carries a location. */
export const LOOKUP_STATES = Object.freeze(["DECLARED", "UNDECLARED", "AMBIGUOUS", "INVALID", "UNKNOWN"]);

const SUBJECT_ID = /^[a-z0-9][a-z0-9-]*$/;
const LOCAL_ID = /^[a-z][a-z0-9-]{0,63}$/;
const ENV_NAME = /^[A-Z][A-Z0-9_]{2,63}$/;
/* A relative path in "/" form: lowercase segments, none empty, none "." or "..", no drive, no leading slash, no backslash. */
const REL_PATH = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;
const safePath = (p) => typeof p === "string" && REL_PATH.test(p) && !p.split("/").some((s) => s === "." || s === "..") && p.length <= 200;

const FIELDS = Object.freeze({
  registry: ["schemaVersion", "kind", "stores", "subjects"],
  store: ["store", "path"],
  subject: ["subjectId", "path", "members", "connectors"],
  resource: ["resourceKind", "resourceRef"],
  connector: ["connectorId", "kind", "credential", "reaches"],
  credential: ["mechanism", "name"],
});
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const exact = (o, keys) => isObj(o) && Object.keys(o).length === keys.length && keys.every((k) => Object.hasOwn(o, k));

/**
 * Validate one registry document. Returns { ok, refusals: [{ code, path }] } — a JSON path, never a value.
 * @param {unknown} doc
 * @param {{ resourceKinds: string[] }} o the F02 resource-kind vocabulary a member or a reach may use
 */
export function validateRegistry(doc, { resourceKinds }) {
  const refusals = [];
  const no = (code, path) => refusals.push(Object.freeze({ code, path }));
  if (!isObj(doc)) { no("REGISTRY_NOT_AN_OBJECT", "$"); return done(refusals); }
  /* 🔴 THE SECRET FIREWALL FIRST, OVER EVERY KEY AND VALUE: a registry holding anything shaped like a credential is refused
   * whole. A credential is NAMED here, never held. The finding carries its location and its detector only. */
  for (const f of findSecrets(doc)) no(`SECRET_SHAPED_VALUE:${f.detector}`, f.path);
  if (!exact(doc, FIELDS.registry)) no("REGISTRY_SHAPE_INVALID", "$");
  if (doc.schemaVersion !== REGISTRY_SCHEMA_VERSION) no("REGISTRY_SCHEMA_VERSION_UNSUPPORTED", "$.schemaVersion");
  if (doc.kind !== REGISTRY_KIND) no("REGISTRY_KIND_INVALID", "$.kind");
  const stores = Array.isArray(doc.stores) ? doc.stores : (no("NOT_A_LIST", "$.stores"), []);
  const subjects = Array.isArray(doc.subjects) ? doc.subjects : (no("NOT_A_LIST", "$.subjects"), []);
  const resource = (r, p) => {
    if (!exact(r, FIELDS.resource)) return no("RESOURCE_SHAPE_INVALID", p);
    if (!resourceKinds.includes(r.resourceKind)) no("RESOURCE_KIND_UNKNOWN", `${p}.resourceKind`);
    if (typeof r.resourceRef !== "string" || r.resourceRef.trim() === "" || r.resourceRef.length > 300) no("RESOURCE_REF_INVALID", `${p}.resourceRef`);
  };
  const storeKinds = new Set();
  stores.forEach((s, i) => {
    const p = `$.stores[${i}]`;
    if (!exact(s, FIELDS.store)) return no("STORE_SHAPE_INVALID", p);
    if (!STORE_KINDS.includes(s.store)) no("STORE_KIND_UNKNOWN", `${p}.store`);
    else if (storeKinds.has(s.store)) no("DUPLICATE_STORE", `${p}.store`);
    else storeKinds.add(s.store);
    if (!safePath(s.path)) no("PATH_NOT_RELATIVE_AND_SAFE", `${p}.path`);
  });
  const subjectIds = new Set();
  subjects.forEach((s, i) => {
    const p = `$.subjects[${i}]`;
    if (!exact(s, FIELDS.subject)) return no("SUBJECT_SHAPE_INVALID", p);
    if (typeof s.subjectId !== "string" || !SUBJECT_ID.test(s.subjectId)) no("SUBJECT_ID_INVALID", `${p}.subjectId`);
    else if (subjectIds.has(s.subjectId)) no("DUPLICATE_SUBJECT", `${p}.subjectId`);
    else subjectIds.add(s.subjectId);
    if (!safePath(s.path)) no("PATH_NOT_RELATIVE_AND_SAFE", `${p}.path`);
    if (!Array.isArray(s.members)) no("NOT_A_LIST", `${p}.members`);
    else s.members.forEach((m, j) => resource(m, `${p}.members[${j}]`));
    if (!Array.isArray(s.connectors)) return no("NOT_A_LIST", `${p}.connectors`);
    const connectorIds = new Set();
    s.connectors.forEach((c, j) => {
      const q = `${p}.connectors[${j}]`;
      if (!exact(c, FIELDS.connector)) return no("CONNECTOR_SHAPE_INVALID", q);
      if (typeof c.connectorId !== "string" || !LOCAL_ID.test(c.connectorId)) no("CONNECTOR_ID_INVALID", `${q}.connectorId`);
      else if (connectorIds.has(c.connectorId)) no("DUPLICATE_CONNECTOR", `${q}.connectorId`);
      else connectorIds.add(c.connectorId);
      if (!CONNECTOR_KINDS.includes(c.kind)) no("CONNECTOR_KIND_UNKNOWN", `${q}.kind`);
      if (c.credential !== null && !(exact(c.credential, FIELDS.credential) && CREDENTIAL_MECHANISMS.includes(c.credential.mechanism) && typeof c.credential.name === "string" && ENV_NAME.test(c.credential.name))) no("CONNECTOR_CREDENTIAL_INVALID", `${q}.credential`);
      if (!Array.isArray(c.reaches)) no("NOT_A_LIST", `${q}.reaches`);
      else c.reaches.forEach((r, k) => resource(r, `${q}.reaches[${k}]`));
    });
  });
  return done(refusals);
}
const done = (refusals) => Object.freeze({ ok: refusals.length === 0, refusals: Object.freeze(refusals) });

const answer = (state, reason, extra = {}) => Object.freeze({ state, reason, ...extra });

/**
 * Read every declared root's registry and index what they declare. NEVER throws: a root that is missing or a registry
 * that is unreadable or invalid makes the whole index UNKNOWN — "I could not look" never reads as "nothing is declared".
 * A root with no registry file declares nothing (its subjects and stores are UNDECLARED, honestly).
 * @param {{ roots: {id: string, kind: string, path: string}[], resourceKinds: string[] }} o
 */
export function readRootIndex({ roots, resourceKinds }) {
  const unknown = (reason, rootId, detail = null) => Object.freeze({ state: "UNKNOWN", reason, rootId, detail, subjects: new Map(), stores: new Map(), registries: [] });
  if (!Array.isArray(roots)) return unknown("ROOTS_NOT_DECLARED", null);
  const subjects = new Map();
  const stores = new Map();
  const registries = [];
  const place = (map, key, value) => { if (!map.has(key)) map.set(key, []); map.get(key).push(value); };
  for (const root of roots) {
    if (!existsSync(root.path)) return unknown("ROOT_MISSING", root.id);
    const file = join(root.path, REGISTRY_FILE);
    if (!existsSync(file)) { registries.push(Object.freeze({ rootId: root.id, rootKind: root.kind, present: false, bytes: null })); continue; }
    let bytes, doc;
    try { bytes = readFileSync(file); doc = JSON.parse(bytes.toString("utf8")); } catch { return unknown("REGISTRY_UNREADABLE", root.id); }
    const v = validateRegistry(doc, { resourceKinds });
    if (!v.ok) return unknown("REGISTRY_INVALID", root.id, v.refusals);
    registries.push(Object.freeze({ rootId: root.id, rootKind: root.kind, present: true, bytes }));
    for (const s of doc.stores) place(stores, s.store, { root, entry: s });
    for (const s of doc.subjects) place(subjects, s.subjectId, { root, entry: s });
  }
  return Object.freeze({ state: "READ", reason: null, rootId: null, detail: null, subjects, stores, registries: Object.freeze(registries) });
}

/* One declared location → its answer. Two roots declaring the same key → AMBIGUOUS, never resolved by order or precedence.
 * A declared path that is not a directory → INVALID: absence refuses, it is never read as "nothing there". */
function locate(index, map, key) {
  if (!index || index.state !== "READ") return answer("UNKNOWN", index?.reason ?? "ROOT_INDEX_NOT_READ");
  const hits = map.get(key) ?? [];
  if (hits.length === 0) return answer("UNDECLARED", "NOT_DECLARED_IN_ANY_ROOT_REGISTRY");
  if (hits.length > 1) return answer("AMBIGUOUS", "DECLARED_IN_MORE_THAN_ONE_ROOT");
  const { root, entry } = hits[0];
  const dir = join(root.path, ...entry.path.split("/"));
  let isDir = false;
  try { isDir = statSync(dir).isDirectory(); } catch { isDir = false; }
  if (!isDir) return answer("INVALID", "DECLARED_PATH_ABSENT");
  return answer("DECLARED", "DECLARED_IN_ONE_ROOT_REGISTRY", { dir, entry, rootId: root.id, rootKind: root.kind, rootPath: root.path });
}

/** A subject's data root, by id. */
export function lookupSubject(index, subjectId) {
  if (typeof subjectId !== "string" || !SUBJECT_ID.test(subjectId)) return answer("INVALID", "SUBJECT_ID_INVALID");
  return locate(index, index?.subjects, subjectId);
}

/** A store inside a root, by store kind. */
export function lookupStore(index, store) {
  if (!STORE_KINDS.includes(store)) return answer("INVALID", "STORE_KIND_UNKNOWN");
  return locate(index, index?.stores, store);
}

/** The one connector of a kind declared for a subject. Two of one kind → AMBIGUOUS; none → UNDECLARED. */
export function lookupConnector(index, subjectId, kind) {
  const s = lookupSubject(index, subjectId);
  if (s.state !== "DECLARED") return s;
  if (!CONNECTOR_KINDS.includes(kind)) return answer("INVALID", "CONNECTOR_KIND_UNKNOWN");
  const hits = s.entry.connectors.filter((c) => c.kind === kind);
  if (hits.length === 0) return answer("UNDECLARED", "NO_CONNECTOR_OF_THIS_KIND_DECLARED_FOR_THE_SUBJECT");
  if (hits.length > 1) return answer("AMBIGUOUS", "MORE_THAN_ONE_CONNECTOR_OF_THIS_KIND_DECLARED");
  return answer("DECLARED", "DECLARED_FOR_THE_SUBJECT", { subject: s, connector: hits[0] });
}

/** Every declared subject id across the index, sorted (an UNKNOWN index lists nothing — callers must check its state). */
export const declaredSubjectIds = (index) => (index?.state === "READ" ? [...index.subjects.keys()].sort() : []);
