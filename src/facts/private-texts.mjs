/**
 * 🔴 RR-274 · THE FULL TEXT OF ANOTHER ORGANISATION'S PAGE IS KEPT PRIVATELY — never in the public data repository.
 *
 * The owner's decision of 16 Oct 2026 (_handoffs AlmiVisibility_OWNER_DECISION_2026-10-16_RR-274_DATA_REPOSITORY_PUBLIC.md) makes the data
 * repository public. A stored source read keeps there only what may be public: its URL, read date, sha256 and the facts' short quotations —
 * its `text` is null and `textAt` names where it is kept: the PRIVATE sources root (config/private-sources.mjs), at the same relative path
 * as the public file. A reader joins the two by the record's measurement key and takes a private text only when its sha256 is the one the
 * public record states; otherwise the text is absent, with the reason.
 *
 * Pure apart from privateSourcesRoot, which only resolves a path and says whether it exists. Generic: it names no client, host or batch.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { PRIVATE_SOURCES, PRIVATE_SOURCES_ENV } from "../../config/private-sources.mjs";

export const TEXT_AT = "PRIVATE_SOURCES";
export const TEXT_MISSING = Object.freeze({ ABSENT: "PRIVATE_TEXT_ABSENT", HASH_DIFFERS: "PRIVATE_TEXT_HASH_DIFFERS", ROOT_ABSENT: "PRIVATE_SOURCES_ROOT_ABSENT" });
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const ENGINE = resolve(new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

/** The private sources root: the env override, else the declared path beside this repository. DECLARED when it exists, else ABSENT. */
export function privateSourcesRoot(env = process.env) {
  const raw = typeof env?.[PRIVATE_SOURCES_ENV] === "string" && env[PRIVATE_SOURCES_ENV].trim() !== "" ? env[PRIVATE_SOURCES_ENV].trim() : PRIVATE_SOURCES.path;
  const dir = isAbsolute(raw) ? raw : resolve(ENGINE, raw);
  return Object.freeze({ state: existsSync(dir) ? "DECLARED" : "ABSENT", dir });
}

/** What may be public of one stored read: a record that holds a text keeps it nowhere but privately. */
export function publicCopy(record) {
  if (typeof record?.text !== "string") return record;
  return Object.freeze({ ...record, text: null, textAt: TEXT_AT });
}

/** Public records with their private texts joined: by measurement key, and only a text whose sha256 the public record states. */
export function withPrivateTexts(publicRows, privateRows, { rootState = "DECLARED" } = {}) {
  const byKey = new Map((privateRows ?? []).filter((r) => typeof r?.text === "string" && typeof r?.measurement_key === "string").map((r) => [r.measurement_key, r]));
  return (publicRows ?? []).map((r) => {
    if (r?.textAt !== TEXT_AT) return r;
    if (rootState !== "DECLARED") return Object.freeze({ ...r, text: null, textMissing: TEXT_MISSING.ROOT_ABSENT });
    const p = byKey.get(r.measurement_key);
    if (!p) return Object.freeze({ ...r, text: null, textMissing: TEXT_MISSING.ABSENT });
    if (sha256(p.text) !== r.sha256) return Object.freeze({ ...r, text: null, textMissing: TEXT_MISSING.HASH_DIFFERS });
    return Object.freeze({ ...r, text: p.text });
  });
}
