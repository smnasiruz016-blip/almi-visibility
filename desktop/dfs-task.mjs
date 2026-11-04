/**
 * 🔴 RR-370b (DataForSEO to the owner, 4 Nov 2026: "multiple occurrences of the Invalid Field error (code 40501) in your recent requests to the serp/task_post endpoint"). The ledger held 39: every one Google autocomplete with location_name "Iran", which is not on DataForSEO's list of locations, posted again on every run because a refused task was not remembered. Each task is now checked against the endpoint's own documented fields before it is sent. Pure.
 * docs.dataforseo.com/v3/serp/google/organic/task_post and /autocomplete/task_post: keyword up to 700 characters ("%" and "+" are decoded, so they are sent as %25 and %2B); location and language required; depth up to 700; priority 1 or 2; tag up to 255. Autocomplete has no depth.
 */
import { readFileSync } from "node:fs";
export const DFS_LOCATIONS = Object.freeze(JSON.parse(readFileSync(new URL("./lists/dfs-google-locations.json", import.meta.url), "utf8")));
const COUNTRIES = new Set(DFS_LOCATIONS.countries), FIELDS = Object.freeze({ serp: new Set(["keyword", "location_name", "language_code", "depth", "priority", "tag"]), auto: new Set(["keyword", "location_name", "language_code", "priority", "tag"]) });
/** the words as the keyword field must carry them */
export const keywordField = (q) => String(q ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().replace(/%/g, "%25").replace(/\+/g, "%2B");
/** a place DataForSEO serves */
export const servedPlace = (place) => COUNTRIES.has(String(place ?? ""));
/** what is wrong with one task, in plain words; null: it may be sent */
export function taskFault(kind, t) {
  const allowed = FIELDS[kind === "auto" ? "auto" : "serp"], unknown = Object.keys(t ?? {}).filter((k) => !allowed.has(k)); if (unknown.length) return `it has a field this service does not take (${unknown.join(", ")})`;
  const k = String(t?.keyword ?? ""); if (!k.trim()) return "it has no words to search"; if (k.length > 700) return "its words are longer than the 700 characters allowed";
  if (!servedPlace(t.location_name)) return `DataForSEO does not serve ${t.location_name ? String(t.location_name) : "an empty place"} as a location`;
  if (!/^[a-z]{2}(?:-[a-z]{2,4})?$/i.test(String(t.language_code ?? ""))) return "it has no valid language";
  if (t.depth !== undefined && !(Number.isInteger(t.depth) && t.depth >= 1 && t.depth <= 700)) return "its depth is outside what is allowed";
  if (t.priority !== undefined && t.priority !== 1 && t.priority !== 2) return "its priority is not 1 or 2"; if (t.tag !== undefined && String(t.tag).length > 255) return "its tag is too long";
  return null;
}
/** the codes that say the request itself is wrong: sending it again can never work */
export const REFUSED_CODES = new Set([40501, 40503, 40505, 40506]);
/** a refused task is remembered, so it is not posted again run after run. The newest words of a task replace the old */
export const noteRefused = (ledger, { key, q, kind }, why, { on, by }) => { (ledger.refused ??= {})[key] = { q, kind: kind ?? "serp", why, on, by }; };
export const refusedLine = (ledger) => { const rows = Object.values(ledger?.refused ?? {}); if (!rows.length) return null; const by = new Map(); for (const r of rows) by.set(r.why, (by.get(r.why) ?? 0) + 1); return `${rows.length} ${rows.length === 1 ? "search was" : "searches were"} not sent and cost nothing: ${[...by].map(([w, n]) => `${n} because ${w}`).join("; ")}.`; };
