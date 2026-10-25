/**
 * RR-326 E · THE APP'S KEYWORD DATA FROM ALMIWORLD'S OWN KEYWORD SERVICE (almivisibility.almiworld.com/v1/keywords) — keyword ideas and
 * Google's search volumes (Google Ads Keyword Planner data), with NO Google Ads account and NO Google sign-in for the client: the service
 * checks the client's licence (the app's own signed licence, or the owner's), counts the plan's monthly searches, and answers from AlmiWorld's
 * keyword database — asking Google once for a search it does not hold yet. The client's own Google Ads sign-in (google-ads.mjs) stays an
 * OPTIONAL extra, off by default. Nothing secret is sent: a licence is a signed statement of a plan, not a key.
 */
import { LOCATIONS } from "../site/kw-seeds.mjs";
import { isOwnerLicence } from "./licence.mjs";

export const SERVICE_URL = "https://almivisibility.almiworld.com/";
export const LICENCE_HEADER = "x-almivisibility-licence";
export const SERVICE_LOCATIONS = LOCATIONS;
/** the licence as the service reads it: the owner's avo_ text, or avl_ + the signed licence */
export const licenceHeaderOf = (signed) => `${isOwnerLicence(signed?.licence) ? "avo" : "avl"}_${Buffer.from(JSON.stringify(signed)).toString("base64url")}`;

/** the plain line about this month's searches */
export const usageLine = (u) => (u ? (u.limit === null || u.limit === undefined ? `Keyword searches this month: ${u.used.toLocaleString("en-US")} — no limit (owner).` : `Keyword searches this month: ${u.used.toLocaleString("en-US")} of ${u.limit.toLocaleString("en-US")}.`) : null);

/** signed: the licence the app runs under (or null). fetchImpl handed in (tests: the service's own handler on 127.0.0.1) */
export function keywordService({ siteUrl = SERVICE_URL, signed = null, fetchImpl = fetch } = {}) {
  const call = async (path, init = {}) => {
    if (!signed) return { ok: false, why: "Add your plan first (Your plan) — the keyword service checks it." };
    let r, j;
    try { r = await fetchImpl(new URL(path, siteUrl), { ...init, headers: { ...(init.headers ?? {}), [LICENCE_HEADER]: licenceHeaderOf(signed) }, signal: AbortSignal.timeout(30000) }); j = await r.json().catch(() => ({})); }
    catch { return { ok: false, why: "The keyword service did not answer — check the internet connection and try again." }; }
    return r.ok && j.ok ? j : { ok: false, why: j.why ?? `The keyword service answered ${r.status}.`, usage: j.usage ?? null };
  };
  return Object.freeze({
    usage: () => call("v1/keywords/usage"),
    /** → { ok, rows (the keyword database's shape), period, location, usage } */
    async search({ seeds, location = "ALL" }) {
      const j = await call("v1/keywords", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seeds, location }) });
      if (!j.ok) return j;
      return { ok: true, location: j.location, locationName: j.locationName, period: j.period, fromDatabase: j.fromDatabase, usage: j.usage,
        rows: (j.rows ?? []).map((x) => ({ text: x.keyword, said: x.volume, months: x.months ?? null, competition: null, change3m: null, yoy: null })) };
    },
  });
}
